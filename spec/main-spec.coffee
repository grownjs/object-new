$new = require('..')

describe 'Object.new()', ->
  it 'is a function', ->
    expect(typeof $new).toEqual 'function'

  it 'returns a factory function', ->
    expect(typeof $new()).toEqual 'function'

  it 'should fail if no name is given', ->
    expect(-> $new('')).toThrow()

  it 'returns an object when is called', ->
    expect(typeof $new('example')).toEqual 'object'

  it 'will nest multiple objects using keypaths', ->
    m = $new('m')
    n = $new('m.n')
    o = $new('m.n.o')

    expect(m.n.o.name).toEqual 'o'
    expect(m.n.name).toEqual 'n'
    expect(m.name).toEqual 'm'

  it 'can create objects with identity', ->
    expect($new('myObject').name).toEqual 'myObject'

  it 'can define static properties', ->
    expect($new('staticProps', { a: 'b' }).a).toEqual 'b'

  it 'can define static methods', ->
    # functions without arguments are called as getters
    expect($new('staticMethods', { a: -> 'b' }).a).toEqual 'b'

    # functions with arguments are called as regular methods
    expect($new('staticMethods_', { x: (y) -> y }).x('z')).toEqual 'z'

  it 'can define properties', ->
    # properties are always called as getters regardless of its arguments
    expect($new('props', { properties: { x: 'y' } }).new().x).toEqual 'y'
    expect($new('dynamicProps', { properties: { x: -> 'y' } }).new().x).toEqual 'y'
    expect($new('dynamicProps_', { properties: { x: (_) -> 'y' } }).new().x).toEqual 'y'

  it 'can define methods', ->
    # fails is given methods is not a function
    expect(-> $new('errMethods', { methods: { x: 'y' } }).new()).toThrow()

    # all methods has the context as first argument
    expect($new('short', { methods: { x: -> 'y' } }).new().x()).toEqual 'y'
    expect($new('args', { methods: { x: (_, y) -> y } }).new().x('z')).toEqual 'z'

  it 'can define init', ->
    # all methods are called with the scope as first argument (no this)
    o = $new('mutatedObject', {
      init: (self, value) ->
        self._value = value or 'OK'

      methods:
        value: (self, suffix = '!') ->
          self._value + suffix
    })

    expect(o.new().value('!!!')).toEqual 'OK!!!'
    expect(o.new('OSOM').value()).toEqual 'OSOM!'
