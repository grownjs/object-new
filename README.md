# Object.new()

[![travis-ci](https://api.travis-ci.org/pateketrueke/object-new.svg)](https://travis-ci.org/pateketrueke/object-new) [![codecov](https://codecov.io/gh/pateketrueke/object-new/branch/master/graph/badge.svg)](https://codecov.io/gh/pateketrueke/object-new)

Experimental DSL for module definitions.

```bash
$ npm install object-new --save
```

## Containers

E.g., by calling `$new()` we are creating definition containers.

```js
const $new = require('object-new');
const $ = $new();

// runtime hack:
// Object.new = $new;
```

- `$new()`&mdash; self-contained shared context
- `$new('module')`&mdash; named module definition on global context
- `$new('module', props)`&mdash; module is defined into the global context
- `$new('module', props, ctx)`&mdash; module is defined into the given context
- `$('module', ...)` &mdash; same as above but self-contained, cannot override context

## Definitions

Any container, once declared, can be extended through definitions.

```js
$('Polygon', {
  init(width, height) {
    this.width = width;
    this.height = height;
  },
});

const Square = $.Polygon({
  name: 'Square',
  init(size) {
    this.super.init(size, size);
  },
});
```

The declared functionality is later composed when creating new objects.

```js
const poly = Polygon.new(3, 4);
const square = Square.new(2);

console.log(poly);
// { width: 3, height: 4 }

console.log(square);
// { width: 2, height: 2 }
```

## Initialization

The `init()` method is our constructor method, it can return more definitions or completely a new different value.

```js
$('Example', {
  init() {
    // scalar values can be returned, e.g.
    // return 42;

    // extra definitions can be returned as plain objects
    // or as arrays, e.g.
    // return [{ props: { ... } }];

    return {
      init() {}
      props: {},
      mixins: [],
      methods: {},
    };
  },
});
```

Each time you create a new instance from any definition `object-new` will do:

1. Create an empty instance with `Object.create(null)`
2. If `extensions > 1` build the `super` proxy
3. Merge initial definitions for the instance
4. Reduce initializers and mixins

Only the `init()` method from the main instance will be called upon creation.

During the initialization, recursive calls to `init()` are allowed, also any mixins found will be executed and/or merged into additional extensions.

Once finished, all this definitions are merged together into the instance.

## Constructor

All instances have a `this.ctor` prop for accesing its definition.

```js
const Dummy = $('Im.A.Nested.Dummy');

console.log(Dummy.new().ctor === Dummy);
// true
```

Definitions have a `name` and `class` too.

```js
console.log(Dummy.name);
console.log(Dummy.class);
// Dummy
// Im.A.Nested.Dummy
```

## Props

Properties must be defined within a `props` object.

```js
$('Dummy', {
  props: {
    // hidden but accesible
    _hidden: 42,

    // any regular value are kept as-is
    title: 'Untitled',

    // note functions within props are meant to be getters
    getter() {
      return this.value;
    },

    // dynamic properties
    get value() {
      return this._hidden;
    },

    // rare, but you can declare write-only props
    set awesome(value) {
      this._hidden = value;
    },
  },
});

const d = $('Dummy').new();

d.awesome = NaN;

console.log(d.title);
// Untitled

console.log(d.getter);
// NaN
```

> Properties starting with `_` will be set as non enumerable on the created instances.
> However, static properties are always set as enumerable.

## Methods

Instance methods must be defined within a `methods` object.

```js
$('Dummy', {
  methods: {
    sayHi() {
      console.log('Hello world!');
    },
  },
});

$('Dummy').new().sayHi();
// Hello world!
```

Functions attached to the main definition are meant to be static methods.

```js
$('Dummy', {
  // note you can use dynamic properties too
  get message() {
    return 'Hello world!';
  },
  sayHi() {
    console.log(this.message);
  },
});

$('Dummy').sayHi();
// Hello world!
```

> Methods starting with `_` will be set as non enumerable on the created instances.
> However, static methods are always set as enumerable.

## Extensions

Each module declaration has a `extensions` property with all the given references.

```js
$('Dummy', {
  props: {
    value: 42,
  },
});

console.log($('Dummy').extensions);
// [{ props: { value: 42 } }]
```

Giving `extensions` within regular module definitions is disallowed.

```js
$('Dummy', {
  extensions: [],
});

// Error: Dummy does not expect extensions
```

Instances, however, can receive `extensions` directly.

```js
const x = $({
  extensions: [{
    props: {
      value: 42,
    },
  }],
});

console.log(x.value);
// 42
```

## Inheritance

Modules created with `object-new` does not use the prototype-chain, instead they rely on the `extensions` abstraction to _inherit_ existing functionality by copying it.

```js
$('Base', {
  props: {
    value: 42,
    thisValue() {
      return this.value;
    },
  },
});

// note this allow to "extend" any existing definition
$('Base', {
  props: {
    value: 99,
    parentValue() {
      return this.super.value;
    },
  },
});

const b = $('Base').new();

console.log(b.value);
console.log(b.thisValue);
// 99
// 99

// hack: modify from the attached extensions (first one)
$('Base').extensions[0].props.value = -1;

console.log(b.value);
console.log(b.thisValue);
// 99
// 99

// new instances are still using the same extensions
console.log($('Base').new().value);
console.log($('Base').new().thisValue);
// 99
// 99

console.log($('Base').new().value);
console.log($('Base').new().thisValue);
console.log($('Base').new().parentValue);
// 99
// 99
// -1
```

Due this limitation, if you change a value from any parent definition it will not affect any existing instance, also any descendant definition remain unaffected.

```js
function Base() {}
Base.prototype.value = 42;

const b = new Base();

console.log(b.value);
// 42

Base.prototype.value = -1;

console.log(b.value);
// -1
```

However, subclassing is still posible, and any extension from root/child definitions will inherit their changes too.

```js
// any namespace definition return a child
const Root = $('Root', {
  props: {
    value: 42,
  },
});

// namespaced subcalls returns also a new child
const Branch = Root('Branch', {
  props: {
    value: 99,
  },
});

console.log(new Root().value);
console.log(new Branch().value);
// 42
// 99

// extend root definition
$('Root', {
  props: {
    value: -1,
  },
});

// extend child definition
$('Root.Branch', {
  props: {
    value: -2,
  },
});

// Root and Branch are just subclasses, calling them
// will return more subclasses, etc.
Root({
  props: {
    value: 123,
  },
});

// this will not affect root/child definitions since
// their definitions are always namespaced
const Leaf = Branch({
  props: {
    value: 456,
  },
});

console.log(new Root().value);
console.log(new Leaf().value);
console.log(new Branch().value);
// -1
// 456
// -2
```

## Composition

Additional mixins from `include` will be merged into the definition.

```js
// regular definitions store
// its mixins as extensions
$('Dummy', {
  props: {
    value: 42,
  },
});

console.log($('Dummy').props);
console.log($('Dummy').extensions);
// {}
// [ { props: { value: 42 } } ]

// any included mixin will be
// merged with the definition itself
$('FixedDummy', {
  props: {
    value: 99,
  },
  include: {
    props: {
      otherValue: -1,
    },
  },
});

console.log($('FixedDummy').props);
console.log($('FixedDummy').extensions);
// { otherValue: -1, value: 99 }
// [ { props: { value: 99 } } ]

$('TestDummy', {
  // definition will be merged
  include: $('Dummy'),
});

console.log($('Dummy').new().value);
console.log($('TestDummy').new().value);
// 42
// 42

$('TestMixin', {
  props: {
    imFeelingLucky: () => Math.random() > 0.5,
  },
  include: [
    // modules works perfect here,
    // they are detected and unrolled
    $('FixedDummy'),

    // they can receive overrides from mixins
    [
      { props: { otherValue: 0 } },

      // and from other definitions' mixins
      $('AnotherThing', {
        props: {
          otherValue: 2,
        },
      }),

      // functions are used for extend the instance
      // so, they can't redefine props/methods
      // () => ({ props: { otherValue: 3 } }),
    ],

    // while unrolling, definitions have higher relevance
    { props: { value: 1, _hidden: true } },

    // override things on the FixedDummy during instantiation, e.g.
    () => ({
      props: {
        fixedValue: 99,
        get isHidden() { return this._hidden; },
      }
    }),

    // functions can receive the instance context as `this`,
    // also all given arguments from constructor are received
    function(someValue) {
      // falsy values are just ignored from the initialization chain
      return someValue && {
        props: {
          fixedValue: this.imFeelingLucky ? -99 : someValue,
        },
      };
    },
  ],
});

console.log($('FixedDummy').new().value);
console.log($('TestMixin').new().value);
console.log($('TestMixin').new()._hidden);
console.log($('TestMixin').new().isHidden);
console.log($('TestMixin').new().otherValue);
console.log($('TestMixin').new().fixedValue);
console.log($('TestMixin').new(-1).otherValue);
console.log($('TestMixin').new(-1).fixedValue);
// 99
// 1
// true
// true
// 2
// 99
// 2
// -99 or -1 (randomly)
```

Mixins can return other mixins, or more definitions, they will be resolved and merged recursively.

```js
$('Dummy', {
  include: [
    { props: { value: 42, } },
    [
      () => ({ init() { this._value = -1; } }),
      [
        $('InPlace', {
          include: () => ({ props: { otherValue: 99 } }),
        }),
      ],
    ],
  ],
});

const d = $('Dummy').new();

console.log(d.value);
console.log(d._value);
console.log(d.otherValue);
// 42
// -1
// 99
```

Included methods from mixins will be chained together.

```js
$('Dummy', {
  test() {
    return 1;
  },
  methods: {
    test() {
      return -1;
    },
  },
});

console.log($('Dummy').test());
console.log($('Dummy').new().test());
// 1
// 1

$('FixedDummy', {
  include: [$('Dummy')],
  test() {
    return 2;
  },
  methods: {
    test() {
      return -2;
    },
  },
});

// merged methods always return
// an array of non-undefined values
console.log($('FixedDummy').test());
console.log($('FixedDummy').new().test());
// [1, 2]
// [-1, -2]
```

> Props, methods or arrays starting with `_` will not be merged this way.

Another way of compositing is through the `extend` keyword.

```js
const Dummy = $('Dummy', {
  init() {
    throw new Error('Not implemented');
  },
});

Dummy.new();
// Error: Not implemented

const Example = $('Example', {
  // one or more mixins/definitions
  extend: Dummy,
  init() {
    console.log(42);
  },
});

Example.new();
console.log(Dummy.extensions.length);
console.log(Example.extensions.length);
// 42
// 1
// 1

// the same result could be achieved with subclassing
// at the cost of adding the given definition as extension
const ExampleWithoutExtend = $('Example', {
  init() {
    console.log(42);

    // this cost also comes with the `super` support here, e.g.
    // calling `this.super.init()` will throw the error from above
  },
});

ExampleWithoutExtend.new();
console.log(Example.extensions.length);
console.log(ExampleWithoutExtend.extensions.length);
console.log(Example === ExampleWithoutExtend);
// 42
// 2
// 2
// true
```

However, the main advantage from `extend` over subclassing is that you can inherit from any foreign mixin or definition, etc.
