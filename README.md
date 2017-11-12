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

## Mixins

Additional definitions must be referentied within a `mixins` object.

```js
$('Dummy', {
  props: {
    value: 42,
  },
});

$('Mixin', {
  mixins: {
    props: {
      value: 42,
      otherValue: -1,
    },
  },
});

$('TestDummy', {
  mixins: $('Dummy'),
});

$('TestMixin', {
  mixins: [
    $('Mixin'),

    // note this mixin will not override anything from Mixin
    { props: { value: 1 } },

    // to do so, you must place it within a factory, e.g.
    () => ({ props: { otherValue: 99 } }),
  ],
});

console.log($('Dummy').new().value);
console.log($('TestDummy').new().value);
// 42
// undefined

console.log($('Mixin').new().value);
console.log($('TestMixin').new().value);
console.log($('TestMixin').new().otherValue);
// 42
// 42
// 99
```

Mixins can return other mixins, or more definitions, they will be resolved and merged recursively.

```js
$('Dummy', {
  mixins: [
    { props: { value: 42, } },
    [
      () => ({ init() { this._value = -1; } }),
      [
        $('InPlace', {
          mixins: () => ({ props: { otherValue: 99 } }),
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

Perhaps the `mixins()` method works exactly like `init()` but there's a key difference: mixins can be referenced and executed from host instances.

This way you avoid to call directly `init()` on each added extension from your module.

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

const b1 = $('Base').new();

console.log(b1.value);
console.log(b1.thisValue);
// 99
// 99

// modify from the attached extensions (first one)
$('Base').extensions[0].props.value = -1;

console.log(b1.value);
console.log(b1.thisValue);
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
