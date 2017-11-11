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

    return {
      props: {},
      methods: {},
      // init, mixins, etc.
    };
  },
});
```

Each time you create a new instance from any definition `object-new` will do:

1. Create an empty instance with `Object.create(null)`
2. If `extensions > 1` build the `super` proxy
3. Merge initial definitions for the instance
4. Reduce initializers and mixins

Only the `init()` method from the main instance will be called upon creation, inside you can invoke `super.init()` for calling code from parent definitions, etc.

During the initialization any `init()` or `mixins()` method from any returned value will be executed again until consume all of them.

Once finished, a last patch is applied to the newly created instance.

## Props

Properties must be defined within a `props` object.

## Mixins

Additional definitions must be referentied within a `mixins` array or function.

## Methods

Instance methods must be defined within a `methods` object.

Functions attached to the main definition are meant to be static methods.

## Extensions

Each module declaration has a `extensions` property with all the given references.
