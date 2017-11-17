#require('debug').enable('*');

$new = require('..')
$ = null

describe 'Definitions', ->
  beforeEach ->
    $ = $new()

  it 'is a function', ->
    expect(typeof $).toEqual 'function'

  it 'returns a factory function', ->
    expect(typeof $()).toEqual 'function'

  it 'should fail if no name is given', ->
    expect(-> $('')).toThrow()

  it 'should fail on invalid definitions', ->
    # passing any-falsy is the same as oassing just one argument
    expect($('x', undefined)).toBe $('x')
    expect($('x', null)).toBe $('x')
    expect($('x', NaN)).toBe $('x')

    expect(-> $('x', 'y')).toThrow()
    expect(-> $('x', [])).toThrow()

  it 'should shortcut some arguments', ->
    expect($new('x', { y: 42}, false).y).toEqual 42

  it 'should fail if extensions are given', ->
    expect(-> $('x', { extensions: [] })).toThrow()

  it 'returns an function when is called', ->
    expect(typeof $('example')).toEqual 'function'

  it 'returns itself id no arguments are given', ->
    expect($('self')).toBe $('self')()

  it 'will nest multiple objects using keypaths', ->
    m = $('m')
    n = $('m.n')
    o = $('m.n.o')

    expect(m.name).toEqual 'm'
    expect(m.n.name).toEqual 'n'
    expect(m.n.o.name).toEqual 'o'

  it 'can create objects with identity', ->
    expect($('myObject').name).toEqual 'myObject'

  it 'can create objects with classpaths', ->
    expect($('org.my.object').class).toEqual 'org.my.object'

  it 'can define static props', ->
    expect($('staticProps', { a: 'b' }).a).toEqual 'b'

  it 'can define static methods', ->
    expect($('staticMethods', { a: -> 'b' }).a()).toEqual 'b'

  it 'can define static props with get/set', ->
    $ 'dynamicProps', eval('''({
      get value() { return Math.random(); },
    })''')

    expect($('dynamicProps').value).not.toEqual $('dynamicProps').value

  describe 'Instances', ->
    it 'can be created directly', ->
      o = $({
        props: {
          x: 'y'
          a: {
            b: {
              c: 'd',
            }
          }
        }
        extensions: [
          { props: { m: 'n' } }
          { props: { a: { b: { e: 'f' } } } }
        ]
      })

      expect(o.x).toEqual 'y'
      expect(o.m).toEqual 'n'
      expect(o.a).toEqual { b: { c: 'd', e: 'f' } }

    it 'can be created with new', ->
      O = $('ClassExample', { props: { x: 'y' } })

      expect(typeof O).toEqual 'function'
      expect((new O).x).toEqual 'y'

      # calling the object as function will nest definitions
      o = O('NestedObject', { props: { foo: 'bar' } })

      expect(O.NestedObject.new().foo).toEqual 'bar'

    it 'will return values from factories', ->
      # regular factories are created by new-calls
      expect($('_', () -> 'OSOM').new()).toEqual 'OSOM'

      # factories extensions disabled are returned in-place
      expect($('a', (() -> 'OSOM'), false)()).toEqual 'OSOM'
      expect($('x.y', (() -> 'OSOM'), false)()).toEqual 'OSOM'
      expect(-> $('x.y', (() -> 'OSOM'), false)()).toThrow()

      # but they are treated as getters
      expect($.a).toEqual 'OSOM'
      expect($.x.y).toEqual 'OSOM'

    it 'can receive args on factories', ->
      bar = $('bar', (_, x) -> {props:{x}})

      expect(bar.new(null, 42).x).toEqual 42

    it 'can receive a custom name', ->
      x = $('Foo', { name: 'Bar' })

      expect(x.name).toEqual 'Bar'

      x.name = 42
      expect(x.name).toEqual 'Bar'

      y = $('Baz')

      expect(y.name).toEqual 'Baz'

      y.name = 42
      expect(y.name).toEqual 'Baz'

    it 'inject this as expected', ->
      o = $('ClassA', { props: { x: 'y' }, methods: { z: -> @x } })
      expect(o.new().z()).toEqual 'y'

    it 'hide _underscore props/methods by default', ->
      o = $('Test', {
        # hidden
        init: ->
        props:
          _hiddenProperty: true
          enumerableProperty: true
        methods:
          _hiddenMethod: ->
          enumerableMethod: ->
      })

      expect(Object.keys(o)).toEqual []
      expect(Object.keys(o.new())).toEqual ['enumerableProperty', 'enumerableMethod']
      expect(JSON.stringify(o.new())).toEqual '{"enumerableProperty":true}'

    it 'can define init method as constructor', ->
      o = $('mutatedObject', {
        init: (value) ->
          @_value = value or 'OK'
          null

        methods:
          value: (suffix = '!') ->
            @_value + suffix
      })

      expect(o.new().value('!!!')).toEqual 'OK!!!'
      expect(o.new('OSOM').value()).toEqual 'OSOM!'

    it 'should validate its methods', ->
      expect(-> $({
        methods:
          foo: 'bar'
      })).toThrow()

      expect(-> $({
        init: ->
          methods:
            foo: 'bar'
      })).toThrow()

      m = $({
        methods:
          foo: -> 42
      })

      expect(-> m.foo = null).toThrow()

    it 'can define properties', ->
      # properties are always called as getters regardless of its arguments
      expect($('props', { props: { x: 'y' } }).new().x).toEqual 'y'
      expect($('dynamicProps', { props: { x: -> 'y' } }).new().x).toEqual 'y'
      expect($('dynamicProps_', { props: { x: (_, __, ___) -> 'y' } }).new().x).toEqual 'y'

    it 'can define read-only properties', ->
      O = $('dynamic', {
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

    it 'can define instance props with getters/setters', ->
      o = $(eval('''({
          props: {
            // _value is hidden from enumeration
            _value: undefined,
            get someValue() { return this._value; },
            set someValue(value) { this._value = value; },
            get readOnlyProp() { return this._value; },
            set writeOnlyProp(value) { this._value = value; },
          }
        })'''))

      expect(o.someValue).toBeUndefined()

      o.someValue = 'OK'

      # you shall not pass!
      delete o.someValue

      expect(o.someValue).toEqual 'OK'

      o.writeOnlyProp = 42
      expect(-> o.writeOnlyProp).toThrow()

      expect(o.readOnlyProp).toEqual 42
      expect(-> o.readOnlyProp = 42).toThrow()

      expect(Object.keys(o)).toEqual ['someValue', 'readOnlyProp', 'writeOnlyProp'];

    it 'can define instance methods', ->
      # fails is given methods is not a function
      expect(-> $('errMethods', { methods: { x: 'y' } }).new()).toThrow()

      # all methods has the context as first argument
      expect($('short', { methods: { x: -> 'y' } }).new().x()).toEqual 'y'
      expect($('args', { methods: { x: (y) -> y } }).new().x('z')).toEqual 'z'

  describe 'Extensions', ->
    it 'can avoid extensions', ->
      test = null

      $('foo', { bar: 'baz' })
      $('foo.buzz', { candy: 'does nothing' }, false)
      $('foo.bazzinga', `{ get test() { test = 42; return -1; } }`, false)

      expect($('foo').extensions.length).toEqual 1

      expect($('foo').bar).toEqual 'baz'
      expect($('foo').buzz.candy).toEqual 'does nothing'

      expect(test).toBe null
      expect($('foo').bazzinga.test).toEqual -1
      expect(test).toBe 42

      expect(Object.keys($('foo'))).toEqual ['bar', 'buzz', 'bazzinga']

    it 'can copy complex values, e.g. RegExp/Date', ->
      time = new Date()

      Top = $ 'Top',
        opts:
          str: 'OK'
          regex: /x/gmi
          timestamp: time

      Sub = Top
        opts:
          str: 'OSOM'

      Top.opts.timestamp.setTime(0)
      expect(Top.opts.timestamp.getTime()).toEqual 0

      expect(Sub.opts.str).toEqual 'OSOM'
      # note the regex-flags aren't in order, but it's still valid
      expect(Sub.opts.regex).toEqual /x/gim
      expect(Sub.opts.timestamp.getTime()).toEqual time.getTime()

    it 'will merge multiple definitions', ->
      results = []

      $('Base', {
        init: ->
          results.push 'DEFAULT'
          null

        props:
          value: 'OK'

        methods:
          test: -> 'OVERRIDE ME'
      })

      $('Base', {
        init: ->
          # note the super-call here, basically this definition
          # inherits (or extends) its parent definition
          @super.init()
          results.push 'MIXIN'
          null

        props:
          foo: -> 'bar'

        methods:
          test: -> 'OK'
      })

      o = $('Base').new()

      expect(o.foo).toEqual 'bar'
      expect(o.test()).toEqual 'OK'
      expect(results).toEqual ['DEFAULT', 'MIXIN']
      expect(Object.keys(o)).toEqual ['value', 'foo', 'test']

    it 'can compose multiple inheritance', ->
      # static props
      A = $('A', { v: 1 } )
      B = A({ v: 2 })

      expect(A.v).toEqual 1
      expect(B.v).toEqual 2

      # mixed props/methods
      A2 = A({ methods: get: -> @x })
      A3 = A2({ props: { x: 'y' } })

      expect(A3.new().get()).toEqual 'y'

      # constructors run in order
      C = $('C', { init: -> @r.push(1); null })
      C1 = C({ props: { r: [] } })

      # don't pollute
      C1.new()
      C2 = C1({ init: -> @super.init(); @r.push(2); null })

      expect(C2.new().r).toEqual [1, 2]

    it 'has support for namespaces', ->
      Global = $('TEST', { init: -> @_global = 1; null })
      Local = $()
      Other = $()

      TEST = Local('TEST', { init: -> @_local = 1; null })

      a = Other('TEST').new()
      b = $('TEST').new()
      c = Local('TEST').new()

      expect(JSON.stringify(a)).toEqual '{}'
      expect(JSON.stringify(b)).toEqual '{"_global":1}'
      expect(JSON.stringify(c)).toEqual '{"_local":1}'

  describe 'Inheritance', ->
    it 'attach self-references for root definitions',->
      props = {}

      A = $ 'A', props

      expect(props.self).toBe A

    it "can invoke parents' methods or props", ->
      test = []

      Parent = $ 'Parent',
        methods:
          foo: ->
            test.push 'OK'

      Child = Parent
        methods:
          bar: ->
            @super.foo()

      Toy = Child
        methods:
          baz: ->
            @super.bar()

      y = new Toy()

      expect(-> y.baz()).not.toThrow()
      expect(y.baz()).toEqual 2

      expect(test).toEqual ['OK', 'OK']

      expect(-> y.super).not.toThrow()
      expect(-> y.super.super).not.toThrow()
      expect(-> y.super.super.super).toThrow()

      expect(Object.keys(y)).toEqual ['foo', 'bar', 'baz']
      expect(Object.keys(y.super)).toEqual ['foo', 'bar']
      expect(Object.keys(y.super.super)).toEqual ['foo']

    it 'can do the same as above, but with static things', ->
      tests = []

      $ 'Example',
        prop: 1
        call: ->
          tests.push @prop
          null

      $ 'Example',
        prop: 2
        call: ->
          tests.push @super.call() or @prop
          null

      $ 'Example',
        prop: 3
        call: ->
          tests.push @super.call() or @prop
          tests

      expect($('Example').call()).toEqual [1, 2, 3]

    it 'can pass arguments to init() calls', ->
      Polygon = $ 'Polygon',
        name: 'FunkPolygon'
        init: (w, h) ->
          @width = w
          @height = h
          null

      Square = Polygon
        name: 'SquareX'
        init: (x) ->
          @super.init(x, x)
          null

      p = new Polygon(3, 4)

      expect(p.width).toEqual 3
      expect(p.height).toEqual 4

      s = new Square(2)

      expect(s.width).toEqual 2
      expect(s.height).toEqual 2

      Square.name = 42
      Polygon.name = 42

      expect(Square.name).toEqual 'SquareX'
      expect(Polygon.name).toEqual 'FunkPolygon'

  describe 'Including', ->
    it 'has support for mixins', ->
      # plain-old objects
      A =
        data:
          1: '1st'
        props:
          foo: 'bar'

      B =
        data:
          2: '2nd'
        props:
          baz: 'buzz'

      # apply mixins with include to consolidate
      C = $ 'C', include: [A, B]

      # subclassing inherits consolidated definitions too
      D = C
        data:
          3: '3rd'
        props:
          does: 'nothing'

      expect(C.data).toEqual { 1: '1st', 2: '2nd' }
      expect(C.props).toEqual { foo: 'bar', baz: 'buzz' }

      expect(D.data).toEqual { 1: '1st', 2: '2nd', 3: '3rd' }
      expect(D.props).toEqual { foo: 'bar', baz: 'buzz', does: 'nothing' }

    it 'will merge foreign definitions and mixins', ->
      result = []

      mixin =
        array: ['a']
        test:
          value: 'OK'
        call: ->
          result.push 1
          null
        props:
          bar: [-1]
          test:
            foo: 'bar'

      Definition = $ 'Definition',
        array: ['b']
        test:
          thing: true
        call: ->
          result.push 2
        props:
          bar: [-2]
          test:
            baz: 'buzz'

      Example = $ 'Example',
        array: ['c']
        test:
          value: 'YES'
        include: [
          mixin
          Definition
        ]

      # root definitions
      expect(Definition.props).not.toBeUndefined()
      expect(Definition.methods).not.toBeUndefined()

      # consolidated definitions
      expect(Example.props).not.toBeUndefined()
      expect(Example.methods).not.toBeUndefined()

      # extended methods are called in sequence
      expect(Example.call.name).toEqual '$chain'

      expect(result).toEqual []

      # will return all values
      expect(Example.call()).toEqual [null, 2]

      # will invoke both calls
      expect(result).toEqual [1, 2]

      # included definitions are not modified
      expect(Definition.array).toEqual ['b']
      expect(Definition.test).toEqual { thing: true }
      expect(Definition.new().bar).toEqual [-2]
      expect(Definition.new().test).toEqual { baz: 'buzz' }

      # included definitions are merged together
      expect(Example.array).toEqual ['a', 'b', 'c']
      expect(Example.test).toEqual { value: 'YES', thing: true }
      expect(Example.new().bar).toEqual [-1, -2]
      expect(Example.new().test).toEqual { foo: 'bar', baz: 'buzz' }

    it 'will maintain context while receiving arguments', ->
      results = []

      Example = $ 'Example',
        init: (value) ->
          results.push ['Example.init', @value || value]

          # initializers can return mixins too
          init: (_value) ->
            results.push ['Example.nested.init', @value || _value]
            null

      Example.new(-1)
      expect(results).toEqual [['Example.init', -1], ['Example.nested.init', -1]]

      results = []

      ExampleWidthDefaults = $ 'ExampleWidthDefaults',
        props:
          value: 'FOO'
        include: Example

      expect(ExampleWidthDefaults.new(99).value).toEqual 'FOO'
      expect(results).toEqual [['Example.init', 'FOO'], ['Example.nested.init', 'FOO']]

      results = []

      OverrideDefaultsFromExample = ExampleWidthDefaults
        props:
          value: 'OSOM'

      expect(OverrideDefaultsFromExample.new(2).value).toEqual 'OSOM'
      expect(results).toEqual [['Example.init', 'OSOM'], ['Example.nested.init', 'OSOM']]
