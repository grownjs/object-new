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

    describe 'defn()', ->
      it 'can define immutable properties', ->
        def('MyClass', @)

        @MyClass.defn('dec', 0)

        test = @MyClass.new()
        expect(-> test.dec--).toThrow()

        expect(test.dec).toEqual 0

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
