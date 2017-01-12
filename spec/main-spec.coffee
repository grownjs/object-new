$new = require('..')

describe 'Object.new()', ->
  it 'is a function', ->
    expect(typeof $new).toEqual 'function'

  it 'returns a factory function', ->
    expect(typeof $new()).toEqual 'function'

  it 'should fail if no name is given', ->
    expect(-> $new('')).toThrow()

  it 'returns an function when is called', ->
    expect(typeof $new('example')).toEqual 'function'

  it 'will nest multiple objects using keypaths', ->
    m = $new('m')
    n = $new('m.n')
    o = $new('m.n.o')

    expect(m.name).toEqual 'm'
    expect(m.n.name).toEqual 'n'
    expect(m.n.o.name).toEqual 'o'

  it 'can create objects with identity', ->
    expect($new('myObject').name).toEqual 'myObject'

  it 'can define static properties', ->
    expect($new('staticProps', { a: 'b' }).a).toEqual 'b'

  it 'can define static methods', ->
    # functions without arguments are called as getters
    expect($new('staticMethods', { a: -> 'b' }).a).toEqual 'b'

    # functions with arguments are called as regular methods
    expect($new('staticMethods_', { x: (y) -> y }).x('z')).toEqual 'z'

  it 'should validate its methods', ->
    expect(-> $new({
      methods:
        foo: 'bar'
    })).toThrow()

    expect(-> $new({
      init: ->
        methods:
          foo: 'bar'
    })).toThrow()

  it 'can define properties', ->
    # properties are always called as getters regardless of its arguments
    expect($new('props', { properties: { x: 'y' } }).new().x).toEqual 'y'
    expect($new('dynamicProps', { properties: { x: -> 'y' } }).new().x).toEqual 'y'
    expect($new('dynamicProps_', { properties: { x: (_) -> 'y' } }).new().x).toEqual 'y'

  it 'can define read-only properties', ->
    O = $new('dynamic', {
      properties:
        value: 'WILL CHANGE'
        readonly: -> @value
    })

    o = O.new()
    o.value = 'CHANGED'

    # all values are kept safe
    expect(o.value).toEqual 'CHANGED'
    expect(O.new().value).toEqual 'WILL CHANGE'

    # cannot override readonly-props
    expect(o.readonly).toEqual 'CHANGED'
    expect(-> o.readonly = 'NO').toThrow()
    expect(o.readonly).toEqual 'CHANGED'

  it 'can define propertis with getters/setters', ->
    o = $new(eval('''({
        properties: {
          get someValue() { return this._value; },
          set someValue(value) { this._value = value; }
        }
      })'''))

    o.someValue = 'OK'

    # you shall not pass!
    delete o.someValue

    expect(o._value).toEqual 'OK'
    expect(o.someValue).toEqual 'OK'

  it 'can define methods', ->
    # fails is given methods is not a function
    expect(-> $new('errMethods', { methods: { x: 'y' } }).new()).toThrow()

    # all methods has the context as first argument
    expect($new('short', { methods: { x: -> 'y' } }).new().x()).toEqual 'y'
    expect($new('args', { methods: { x: (y) -> y } }).new().x('z')).toEqual 'z'

  it 'can define init', ->
    o = $new('mutatedObject', {
      init: (value) ->
        @_value = value or 'OK'

      methods:
        value: (suffix = '!') ->
          @_value + suffix
    })

    expect(o.new().value('!!!')).toEqual 'OK!!!'
    expect(o.new('OSOM').value()).toEqual 'OSOM!'

  it 'can be instantiated with new', ->
    O = $new('ClassExample', { properties: { x: 'y' } })

    expect(typeof O).toEqual 'function'
    expect((new O).x).toEqual 'y'

    # old-style support
    expect(O().x).toEqual 'y'

  it 'inject this as expected', ->
    o = $new('ClassA', { properties: { x: 'y' }, methods: { z: -> @x } })
    expect(o.new().z()).toEqual 'y'

  it 'handles enumerability by default', ->
    o = $new('Test', {
      # hidden
      init: ->
      methods:
        _hiddenMethod: ->
        enumerableMethod: ->
      properties:
        _hiddenProperty: true
        enumerableProperty: true
    })

    expect(Object.keys(o)).toEqual ['name', 'new', 'init', 'methods', 'properties']
    expect(Object.keys(o.new())).toEqual ['enumerableMethod', 'enumerableProperty']
    expect(JSON.stringify(o.new())).toEqual '{"enumerableProperty":true}'
