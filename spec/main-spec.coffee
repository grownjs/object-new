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
    expect($new('staticMethods', { a: -> 'b' }).a()).toEqual 'b'

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
    expect($new('props', { props: { x: 'y' } }).new().x).toEqual 'y'
    expect($new('dynamicProps', { props: { x: -> 'y' } }).new().x).toEqual 'y'
    expect($new('dynamicProps_', { props: { x: (_) -> 'y' } }).new().x).toEqual 'y'

  it 'can define read-only properties', ->
    O = $new('dynamic', {
      props:
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
        props: {
          get someValue() { return this._value; },
          set someValue(value) { this._value = value; }
        }
      })'''))

    expect(o.someValue).toBeUndefined()

    o.someValue = 'OK'

    # you shall not pass!
    delete o.someValue

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
    O = $new('ClassExample', { props: { x: 'y' } })

    expect(typeof O).toEqual 'function'
    expect((new O).x).toEqual 'y'

    # old-style support
    expect(O().x).toEqual 'y'

  it 'inject this as expected', ->
    o = $new('ClassA', { props: { x: 'y' }, methods: { z: -> @x } })
    expect(o.new().z()).toEqual 'y'

  it 'handles enumerability by default', ->
    o = $new('Test', {
      # hidden
      init: ->
      props:
        _hiddenProperty: true
        enumerableProperty: true
      methods:
        _hiddenMethod: ->
        enumerableMethod: ->
    })

    expect(Object.keys(o)).toEqual ['name', 'new', 'init', 'props', 'methods', 'extensions']
    expect(Object.keys(o.new())).toEqual ['enumerableProperty', 'enumerableMethod']
    expect(JSON.stringify(o.new())).toEqual '{"enumerableProperty":true}'

  it 'will merge multiple definitions', ->
    results = []

    $new('Base', {
      init: ->
        results.push 'DEFAULT'

      props:
        value: 'OK'

      methods:
        test: -> 'OVERRIDE ME'
    })

    $new('Base', {
      init: ->
        results.push 'MIXIN'

      props:
        foo: -> 'bar'

      methods:
        test: -> 'OK'
    })

    o = $new('Base').new()

    expect(o.foo).toEqual 'bar'
    expect(o.test()).toEqual 'OK'
    expect(results).toEqual ['DEFAULT', 'MIXIN']
    expect(Object.keys(o)).toEqual ['value', 'foo', 'test']

  it 'has support for namespaces', ->
    Global = $new('TEST', { init: -> @_global = 1 })
    Local = $new()
    Other = $new()

    TEST = Local('TEST', { init: -> @_local = 1 })

    a = Other('TEST').new()
    b = $new('TEST').new()
    c = Local('TEST').new()

    expect(JSON.stringify(a)).toEqual '{}'
    expect(JSON.stringify(b)).toEqual '{"_global":1}'
    expect(JSON.stringify(c)).toEqual '{"_local":1}'
