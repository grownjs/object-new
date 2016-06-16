def = require('..')

describe 'def()', ->
  it 'should be a function', ->
    expect(typeof def).toEqual 'function'

  describe 'modules', ->
    it 'can define local modules', ->
      def 'local_module', @
      expect(@local_module).not.toBeUndefined()
      expect(typeof local_module).toEqual 'undefined'

    it 'can define global modules', ->
      def 'global_module'
      expect(global_module).not.toBeUndefined()

    it 'can namespace any sub.modules', ->
      def 'my.submodule.is_global'
      expect(typeof my.submodule.is_global).toEqual 'function'

    it 'should return its own definition', ->
      Alias = def('MyClass', @)

      expect(typeof MyClass).toEqual 'undefined'
      expect(@MyClass).toBe Alias

    it 'should allow you to enhance definitions', ->
      def('A', @)({ a: 'b' })
      expect(@A.a).toEqual 'b'
      expect(@A.x).toBeUndefined()

      def('A', @)({ x: 'y' })
      expect(@A.x).toEqual 'y'

      # scoped syntax
      @A({ foo: 'bar' })
      expect(@A.foo).toEqual 'bar'

  describe 'methods', ->
    describe 'new()', ->
      beforeEach ->
        def('MyClass', @)({
          staticProperty: 'foo'
          prototype:
            instanceProperty: 'bar'
        })

      it 'should support static properties', ->
        expect(@MyClass.staticProperty).toEqual 'foo'

      it 'can create classes from defined modules', ->
        expect(typeof @MyClass.new).toEqual 'function'
        expect(@MyClass.new().instanceProperty).toEqual 'bar'

    describe 'def()', ->
      it 'can define mutable properties', ->
        def('MyClass', @)

        @MyClass.def('inc', 0)

        test = @MyClass.new()
        test.inc++

        expect(test.inc).toEqual 1

      it 'can inherit mutable properties', ->
        def('Animal', @)
        @Animal.def 'canWalk', -> true

        def(@Animal, 'Cat', @)
        @Cat.def 'canJump', -> true

        test = @Cat.new()
        expect(test.canWalk()).toBeTruthy()
        expect(test.canJump()).toBeTruthy()
        expect(@Animal.new().canJump).toBeUndefined()

    describe 'defn()', ->
      it 'can define immutable properties', ->
        def('MyClass', @)

        @MyClass.defn('dec', 0)
        @MyClass.defn('str', -> 'OK')

        test = @MyClass.new()
        expect(test.str).toEqual 'OK'
        expect(-> test.dec--).toThrow()

        expect(test.dec).toEqual 0

      it 'cannot inherit immutable properties', ->
        def('Vehicle', @)
        @Vehicle.defn 'hasWindows', true

        def(@Vehicle, 'Car', @)
        @Car.defn 'hasDoors', true

        expect(@Car.new().hasDoors).toBeTruthy()
        expect(@Car.new().hasWindows).toBeUndefined()

  describe 'inheritance', ->
    it 'will use composition for the initial definition', ->
      def('Parent', @)({ prototype: { foo: 'bar' } })
      def('Other', @)({ prototype: { extra: (str) -> '(' + str() + ')' } })
      def([@Parent, @Other], 'Children', @)({ prototype: { baz: 'buzz', test: -> @foo + '!!' } })

      c = @Children.new()
      expect(c.foo).toEqual 'bar'
      expect(c.baz).toEqual 'buzz'
      expect(c.extra(c.test)).toEqual '(bar!!)'

    it 'will extends existing definitions on the next calls', ->
      def('PluginBase', @)({ prototype: { type: 'plugin' } })
      def(@PluginBase, 'MyPlugin', @)

      expect(@MyPlugin.new().type).toEqual 'plugin'
      expect(@MyPlugin.new().fun).toBeUndefined()

      def('PluginMixin', @)({ prototype: { fun: -> 'OSOM' }  })
      def(@PluginMixin, 'PluginBase', @)

      expect(@MyPlugin.new().type).toEqual 'plugin'
      expect(@MyPlugin.new().fun()).toEqual 'OSOM'

    it 'should support multiple constructors through definitions', ->
      count = 0

      def('HooksSupport', @)({
        constructor: ->
          count++
          @prop = Math.random()
        prototype:
          hooks: true
      })

      def(@HooksSupport, 'FancyClass', @)({
        constructor: (@prefix) ->
          @prefix += '2' if @hooks
        prototype:
          test: ->
            @prefix + '3'
      })

      expect(@FancyClass.new().prop).not.toEqual @FancyClass.new().prop
      expect(@FancyClass.new('1').test()).toEqual '123'
      expect(count).toEqual 3

    it 'should support private data access through closure definitions', ->
      def('SomeClass', @)(->
        count = 0

        # public accesor (read-only)
        @defn 'count', -> count

        @def 'inc', (nth = 1) ->
          count++ while nth--
          @
        @def 'get', ->
          count
      )

      c = @SomeClass.new()

      expect(c.get()).toEqual 0
      expect(c.count).toEqual 0
      expect(-> c.count++).toThrow()

      c.inc(2)
      expect(c.get()).toEqual 2
      expect(c.count).toEqual 2

    it 'should be able to create objects from factories or through the new operator', ->
      def('BaseClass', @)({ prototype: { foo: 'bar' } })
      def(@BaseClass, 'ChildClass', @)({ prototype: { baz: 'buzz' } })
      @ChildClass.defn('candy', 'does nothing')

      a = @ChildClass.new()
      b = new @ChildClass()

      expect(a.foo).toEqual 'bar'
      expect(a.baz).toEqual 'buzz'
      expect(a.candy).toEqual 'does nothing'

      expect(b.foo).toEqual 'bar'
      expect(b.baz).toEqual 'buzz'
      expect(b.candy).toEqual 'does nothing'
