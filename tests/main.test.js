/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const $new = require('..');

let $ = null;

/* global beforeEach, describe, it */

describe('Definitions', () => {
  beforeEach(() => {
    $ = $new();
  });

  it('is a function', () => {
    expect(typeof $).to.eql('function');
  });

  it('returns a factory function', () => {
    expect(typeof $()).to.eql('function');
  });

  it('should fail if no name is given', () => {
    expect(() => $('')).to.throw();
  });

  it('should fail on invalid definitions', () => {
    expect($('x', undefined)).to.eql($('x'));
    expect($('x', null)).to.eql($('x'));
    expect($('x', NaN)).to.eql($('x'));
    expect(() => $('x', 'y')).to.throw();
    expect(() => $('x', [])).to.throw();
  });

  it('should shortcut some arguments', () => {
    expect($new('x', { y: 42 }, false).y).to.eql(42);
  });

  it('should fail if extensions are given', () => {
    expect(() => $('x', { extensions: [] })).to.throw();
  });

  it('returns an function when is called', () => {
    expect(typeof $('example')).to.eql('function');
  });

  it('returns itself id no arguments are given', () => {
    expect($('self')).to.eql($('self')());
  });

  it('will nest multiple objects using keypaths', () => {
    const m = $('m');

    $('m.n');
    $('m.n.o');

    expect(m.name).to.eql('m');
    expect(m.n.name).to.eql('n');
    expect(m.n.o.name).to.eql('o');
  });

  it('can create objects with identity', () => {
    expect($('myObject').name).to.eql('myObject');
  });

  it('can create objects with classpaths', () => {
    expect($('org.my.object').class).to.eql('org.my.object');
  });

  it('can define static props', () => {
    expect($('staticProps', { a: 'b' }).a).to.eql('b');
  });

  it('can define static methods', () => {
    expect($('staticMethods', { a: () => 'b' }).a()).to.eql('b');
  });

  it('can define static props with get/set', () => {
    $('dynamicProps', eval('({\n  get value() { return Math.random(); },\n})')); // eslint-disable-line
    expect($('dynamicProps').value).not.to.eql($('dynamicProps').value);
  });

  describe('Instances', () => {
    it('can be created directly', () => {
      const o = $({
        props: {
          x: 'y',
          a: {
            b: {
              c: 'd',
            },
          },
        },
        extensions: [
          {
            props: {
              m: 'n',
            },
          }, {
            props: {
              a: {
                b: {
                  e: 'f',
                },
              },
            },
          },
        ],
      });

      expect(o.x).to.eql('y');
      expect(o.m).to.eql('n');
      expect(o.a).to.eql({
        b: {
          c: 'd',
          e: 'f',
        },
      });
    });

    it('can be created with new', () => {
      const O = $('ClassExample', {
        props: {
          x: 'y',
        },
      });

      expect(typeof O).to.eql('function');
      expect((new O()).x).to.eql('y');

      O('NestedObject', {
        props: {
          foo: 'bar',
        },
      });

      expect(O.NestedObject.new().foo).to.eql('bar');
    });

    it('will return values from factories', () => {
      expect($('_', () => 'OSOM').new()).to.eql('OSOM');
      expect($('a', (() => 'OSOM'), false)()).to.eql('OSOM');
      expect($('x.y', (() => 'OSOM'), false)()).to.eql('OSOM');
      expect(() => $('x.y', (() => 'OSOM'), false)()).to.throw();
      expect($.a).to.eql('OSOM');
      expect($.x.y).to.eql('OSOM');
    });

    it('can receive args on factories', () => {
      const bar = $('bar', (_, x) => {
        return {
          props: {
            x,
          },
        };
      });

      expect(bar.new(null, 42).x).to.eql(42);
    });

    it('can receive a custom name', () => {
      const x = $('Foo', {
        name: 'Bar',
      });

      expect(x.name).to.eql('Bar');
      x.name = 42;

      expect(x.name).to.eql('Bar');

      const y = $('Baz');

      expect(y.name).to.eql('Baz');
      y.name = 42;

      expect(y.name).to.eql('Baz');
    });

    it('inject this as expected', () => {
      const o = $('ClassA', {
        props: {
          x: 'y',
        },
        methods: {
          z() {
            return this.x;
          },
        },
      });
      expect(o.new().z()).to.eql('y');
    });

    it('hide _underscore props/methods by default', () => {
      const o = $('Test', {
        init() {},
        props: {
          _hiddenProperty: true,
          enumerableProperty: true,
        },
        methods: {
          _hiddenMethod: () => {},
          enumerableMethod: () => {},
        },
      });

      expect(Object.keys(o)).to.eql([]);
      expect(Object.keys(o.new())).to.eql(['enumerableProperty', 'enumerableMethod']);
      expect(JSON.stringify(o.new())).to.eql('{"enumerableProperty":true}');
    });

    it('can define init method as constructor', () => {
      const o = $('mutatedObject', {
        init(value) {
          this._value = value || 'OK';
          return null;
        },
        methods: {
          value(suffix) {
            if (suffix == null) {
              suffix = '!';
            }
            return this._value + suffix;
          },
        },
      });

      expect(o.new().value('!!!')).to.eql('OK!!!');
      expect(o.new('OSOM').value()).to.eql('OSOM!');
    });

    it('should validate its methods', () => {
      expect(() => {
        return $({
          methods: {
            foo: 'bar',
          },
        });
      }).to.throw();
      expect(() => {
        return $({
          init() {
            return {
              methods: {
                foo: 'bar',
              },
            };
          },
        });
      }).to.throw();

      const m = $({
        methods: {
          foo: () => {
            return 42;
          },
        },
      });

      expect(() => {
        m.foo = null;
      }).not.to.throw();
    });

    it('can define properties', () => {
      expect($('props', {
        props: {
          x: 'y',
        },
      }).new().x).to.eql('y');
      expect($('dynamicProps', {
        props: {
          x: () => 'y',
        },
      }).new().x).to.eql('y');
      expect($('dynamicProps_', {
        props: {
          x: (_, __, ___) => 'y', // eslint-disable-line
        },
      }).new().x).to.eql('y');
    });

    it('can define read-only properties', () => {
      const O = $('dynamic', {
        props: {
          value: 'WILL CHANGE',
          readonly() {
            return this.value;
          },
        },
      });

      const o = O.new();

      o.value = 'CHANGED';

      expect(o.value).to.eql('CHANGED');
      expect(O.new().value).to.eql('WILL CHANGE');
      expect(o.readonly).to.eql('CHANGED');
      expect(() => {
        o.readonly = 'NO';
      }).to.throw();

      expect(o.readonly).to.eql('CHANGED');
      delete o.readonly;

      expect(o.readonly).to.eql('CHANGED');
    });

    it('can define instance props with getters/setters', () => {
      const o = $(eval('({\n  props: {\n    // _value is hidden from enumeration\n    _value: undefined,\n    get someValue() { return this._value; },\n    set someValue(value) { this._value = value; },\n    get readOnlyProp() { return this._value; },\n    set writeOnlyProp(value) { this._value = value; },\n  }\n})')); // eslint-disable-line

      expect(o.someValue).to.be.undefined;

      o.someValue = 'OK';
      delete o.someValue;

      expect(o.someValue).to.eql('OK');
      o.writeOnlyProp = 42;

      expect(() => {
        return o.writeOnlyProp;
      }).to.throw();
      expect(o.readOnlyProp).to.eql(42);
      expect(() => {
        o.readOnlyProp = 42;
      }).to.throw();
      expect(Object.keys(o)).to.eql(['someValue', 'readOnlyProp', 'writeOnlyProp']);
    });

    it('can define instance methods', () => {
      expect(() => {
        return $('errMethods', {
          methods: {
            x: 'y',
          },
        }).new();
      }).to.throw();
      expect($('short', {
        methods: {
          x: () => {
            return 'y';
          },
        },
      }).new().x()).to.eql('y');
      expect($('args', {
        methods: {
          x(y) {
            return y;
          },
        },
      }).new().x('z')).to.eql('z');
    });
  });

  describe('Extensions', () => {
    it('can avoid extensions', () => {
      let test = null;

      $('foo', { bar: 'baz' });
      $('foo.buzz', { candy: 'does nothing' }, false);
      $('foo.bazzinga', { get test() { test = 42; return -1; } }, false);

      expect($('foo').extensions.length).to.eql(1);
      expect($('foo').bar).to.eql('baz');
      expect($('foo').buzz.candy).to.eql('does nothing');
      expect(test).to.eql(null);
      expect($('foo').bazzinga.test).to.eql(-1);
      expect(test).to.eql(42);
      expect(Object.keys($('foo'))).to.eql(['bar', 'buzz', 'bazzinga']);
    });

    it('can copy complex values, e.g. RegExp/Date', () => {
      const someObject = {
        foo: 'bar',
      };

      const time = new Date();

      const Top = $('Top', {
        opts: {
          str: 'OK',
          regex: /x/gmi,
          timestamp: time,
          someArray: [
            {
              nested: someObject,
            },
          ],
        },
      });

      const Sub = Top({
        opts: {
          str: 'OSOM',
        },
      });

      Top.opts.timestamp.setTime(0);

      expect(Top.opts.timestamp.getTime()).to.eql(0);
      someObject.foo = 42;

      expect(Top.opts.someArray[0].nested.foo).to.eql('bar');
      expect(Sub.opts.str).to.eql('OSOM');
      expect(Sub.opts.regex).to.eql(/x/gim);
      expect(Sub.opts.timestamp.getTime()).to.eql(time.getTime());
    });

    it('will merge multiple definitions', () => {
      const results = [];

      $('Base', {
        init() {
          results.push('DEFAULT');
          return null;
        },
        props: {
          value: 'OK',
        },
        methods: {
          test: () => 'OVERRIDE ME',
        },
      });

      $('Base', {
        init() {
          this.super.init();
          results.push('MIXIN');
          return null;
        },
        props: {
          foo: () => 'bar',
        },
        methods: {
          test: () => 'OK',
        },
      });

      const o = $('Base').new();

      expect(o.foo).to.eql('bar');
      expect(o.test()).to.eql('OK');
      expect(results).to.eql(['DEFAULT', 'MIXIN']);
      expect(Object.keys(o)).to.eql(['value', 'foo', 'test']);
    });

    it('can compose multiple inheritance', () => {
      const A = $('A', {
        v: 1,
      });

      const B = A({
        v: 2,
      });

      expect(A.v).to.eql(1);
      expect(B.v).to.eql(2);

      const A2 = A({
        methods: {
          get() {
            return this.x;
          },
        },
      });

      const A3 = A2({
        props: {
          x: 'y',
        },
      });

      expect(A3.new().get()).to.eql('y');

      const C = $('C', {
        init() {
          this.r.push(1);
          return null;
        },
      });

      const C1 = C({
        props: {
          r: [],
        },
      });

      C1.new();

      const C2 = C1({
        init() {
          this.super.init();
          this.r.push(2);
          return null;
        },
      });

      expect(C2.new().r).to.eql([1, 2]);
    });

    it('has support for namespaces', () => {
      $('TEST', {
        init() {
          this._global = 1;
          return null;
        },
      });

      const Local = $();
      const Other = $();

      Local('TEST', {
        init() {
          this._local = 1;
          return null;
        },
      });

      const a = Other('TEST').new();
      const b = $('TEST').new();
      const c = Local('TEST').new();

      expect(JSON.stringify(a)).to.eql('{}');
      expect(JSON.stringify(b)).to.eql('{"_global":1}');
      expect(JSON.stringify(c)).to.eql('{"_local":1}');
    });

    it('support extend keyword', () => {
      const Base = $('Base', {
        value: -1,
        example: 'OK',
        methods: {
          test: () => {
            return 42;
          },
        },
      });

      const Extended = $('Extended', {
        extend: Base,
        value: -2,
        methods: {
          foo: () => {
            return 'bar';
          },
        },
      });

      expect(Extended.value).to.eql(-2);
      expect(Extended.example).to.eql('OK');
      expect(Extended.new().foo()).to.eql('bar');
      expect(Extended.new().test()).to.eql(42);
    });
  });

  describe('Inheritance', () => {
    it('attach self-references for root definitions', () => {
      const props = {};

      const A = $('A', props);

      expect(props.self).to.eql(A);
    });

    it("can invoke parents' methods or props", () => {
      const test = [];

      const Parent = $('Parent', {
        methods: {
          foo: () => {
            return test.push('OK');
          },
        },
      });

      const Child = Parent({
        methods: {
          bar() {
            return this.super.foo();
          },
        },
      });

      const Toy = Child({
        methods: {
          baz() {
            return this.super.bar();
          },
        },
      });

      const y = new Toy();

      expect(() => y.baz()).not.to.throw();
      expect(y.baz()).to.eql(2);
      expect(test).to.eql(['OK', 'OK']);
      expect(() => y.super).not.to.throw();
      expect(() => y.super.super).not.to.throw();
      expect(() => y.super.super.super).to.throw();
      expect(Object.keys(y)).to.eql(['foo', 'bar', 'baz']);
      expect(Object.keys(y.super)).to.eql(['foo', 'bar']);
      expect(Object.keys(y.super.super)).to.eql(['foo']);
    });

    it('can do the same as above, but with static things', () => {
      const tests = [];

      $('Example', {
        prop: 1,
        call() {
          tests.push(this.prop);
          return null;
        },
      });
      $('Example', {
        prop: 2,
        call() {
          tests.push(this.super.call() || this.prop);
          return null;
        },
      });
      $('Example', {
        prop: 3,
        call() {
          tests.push(this.super.call() || this.prop);
          return tests;
        },
      });

      expect($('Example').call()).to.eql([1, 2, 3]);
    });

    it('can pass arguments to init() calls', () => {
      const Polygon = $('Polygon', {
        name: 'FunkPolygon',
        init(w, h) {
          this.width = w;
          this.height = h;
          return null;
        },
      });

      const Square = Polygon({
        name: 'SquareX',
        init(x) {
          this.super.init(x, x);
          return null;
        },
      });

      const p = new Polygon(3, 4);

      expect(p.width).to.eql(3);
      expect(p.height).to.eql(4);

      const s = new Square(2);

      expect(s.width).to.eql(2);
      expect(s.height).to.eql(2);

      Square.name = 42;
      Polygon.name = 42;

      expect(Square.name).to.eql('SquareX');
      expect(Polygon.name).to.eql('FunkPolygon');
    });
  });

  describe('Including', () => {
    it('has support for mixins', () => {
      const A = {
        data: {
          1: '1st',
        },
        props: {
          foo: 'bar',
        },
      };

      const B = {
        data: {
          2: '2nd',
        },
        props: {
          baz: 'buzz',
        },
        Nested: {
          Object: {
            is: 'here',
          },
        },
      };

      const C = $('C', {
        include: [
          A, B, () => {
            return {
              props: {
                truth: 42,
              },
            };
          },
        ],
      });

      const D = C({
        data: {
          3: '3rd',
        },
        props: {
          does: 'nothing',
        },
        extend: [null, () => {}],
        include: [
          null, {
            props: {
              fooBar: () => {
                return 'baz';
              },
            },
          }, () => {
            return {
              methods: {
                isTruth: () => {
                  return -42;
                },
              },
            };
          }, () => {
            return () => {
              return {
                props: {
                  somethingElse: 'TEST',
                },
              };
            };
          },
        ],
      });

      expect(D.new().truth).to.eql(42);
      expect(D.new().fooBar).to.eql('baz');
      expect(D.new().isTruth()).to.eql(-42);
      expect(D.new().somethingElse).to.eql('TEST');
      expect(() => {
        return D({
          include: {
            extensions: {},
          },
        });
      }).to.throw();
      expect(D.new().truth).to.eql(42);
      expect(D.Nested.Object.is).to.eql('here');
      expect(C.data).to.eql({
        1: '1st',
        2: '2nd',
      });
      expect(C.props.foo).to.eql('bar');
      expect(C.props.baz).to.eql('buzz');
      expect(C.props.truth).to.eql(42);
      expect(D.data).to.eql({
        1: '1st',
        2: '2nd',
        3: '3rd',
      });
      expect(D.props.foo).to.eql('bar');
      expect(D.props.baz).to.eql('buzz');
      expect(D.props.does).to.eql('nothing');
      expect(D.props.truth).to.eql(42);
      expect(D.props.fooBar).to.eql(D.props.fooBar);
    });

    it('will merge foreign definitions and mixins', () => {
      const result = [];

      const mixin = {
        array: ['a'],
        test: {
          value: 'OK',
        },
        _call: () => {
          return 'foo';
        },
        $call: () => {
          result.push(1);
          return null;
        },
        props: {
          bar: [-1],
          test: {
            foo: 'bar',
          },
        },
      };

      const Definition = $('Definition', {
        array: ['b'],
        test: {
          thing: true,
        },
        _call: () => {
          return 'bar';
        },
        $call: () => {
          return result.push(2);
        },
        props: {
          bar: [-2],
          test: {
            baz: 'buzz',
          },
        },
      });

      const Example = $('Example', {
        array: ['c'],
        test: {
          value: 'YES',
        },
        _call: () => {
          return 'baz';
        },
        $call: () => {
          return result.push(3);
        },
        include: [mixin, Definition],
      });

      expect(Definition.props).not.to.be.undefined;
      expect(Definition.methods).not.to.be.undefined;
      expect(Example.props).not.to.be.undefined;
      expect(Example.methods).not.to.be.undefined;
      expect(Example.$call.name).to.eql('$chain');
      expect(result).to.eql([]);
      expect(Example.$call()).to.eql([null, 2, 3]);
      expect(result).to.eql([1, 2, 3]);
      expect(Example._call()).to.eql('baz');
      expect(Definition.array).to.eql(['b']);
      expect(Definition.test).to.eql({
        thing: true,
      });
      expect(Definition.new().bar).to.eql([-2]);
      expect(Definition.new().test).to.eql({
        baz: 'buzz',
      });
      expect(Example.array).to.eql(['a', 'b', 'c']);
      expect(Example.test).to.eql({
        value: 'YES',
        thing: true,
      });
      expect(Example.new().bar).to.eql([-1, -2]);
      expect(Example.new().test).to.eql({
        foo: 'bar',
        baz: 'buzz',
      });
    });

    it('will maintain context while receiving arguments', () => {
      let results = [];

      const Example = $('Example', {
        init(value) {
          results.push(['Example.init', this.value || value]);
          return {
            init(_value) {
              results.push(['Example.nested.init', this.value || _value]);
              return null;
            },
          };
        },
      });

      Example.new(-1);
      expect(results).to.eql([['Example.init', -1], ['Example.nested.init', -1]]);

      results = [];

      const ExampleWidthDefaults = $('ExampleWidthDefaults', {
        props: {
          value: 'FOO',
        },
        include: Example,
      });

      expect(ExampleWidthDefaults.new(99).value).to.eql('FOO');
      expect(results).to.eql([['Example.init', 'FOO'], ['Example.nested.init', 'FOO']]);

      results = [];

      const OverrideDefaultsFromExample = ExampleWidthDefaults({
        props: {
          value: 'OSOM',
        },
      });

      expect(OverrideDefaultsFromExample.new(2).value).to.eql('OSOM');
      expect(results).to.eql([['Example.init', 'OSOM'], ['Example.nested.init', 'OSOM']]);
    });
  });
});
