# def-module

[![travis-ci](https://api.travis-ci.org/pateketrueke/def-module.svg)](https://travis-ci.org/pateketrueke/def-module) [![codecov](https://codecov.io/gh/pateketrueke/def-module/branch/master/graph/badge.svg)](https://codecov.io/gh/pateketrueke/def-module)

Experimental DSL for module definitions.

```bash
$ npm i def-module -S
```

## Containers

By calling `def()` we are creating definition containers.

```js
const def = require('def-module');
const $ = def();
```

- `def()`&mdash; self-contained context
- `def('module')`&mdash; named module definition on global context
- `def('module', context)`&mdash; module is defined into the given context
- `def(parent, 'module')`&mdash; module inherits all definitions from given parent

Shared containers can be achieved by passing the same context.

```js
function container(...args) {
  return def(...args, container);
}
```

## Definitions

Any container, once declared, can be extended through definitions.

```js
$('Base')({
  constructor() {
    console.log('beep', this.value);
  },
  prototype: {
    get value() {
      return 42;
    },
  },
});
```

The declared functionality is later composed when creating new objects.

```js
const base = $.Base.new();

// beep 42
```

This `new()` method is very powerful, e.g. `$.Base.new(...args, extra)`

## Inheritance

We can define modules with inherited functionality also.

```js
$($.Base, 'Child')({
  constructor() {
    console.log('boop', this.value);
  },
  prototype: {
    value: -42,
  },
});
```

Instances are composed from multiple definitions at once, prototypes are always merged and constructors are called in order.

```js
// note that `new` is supported
const o = new $.Child();

// beep -42
// boop -42
```

We don't need to call `super()` since there is no parent instances.

## Nesting

Module definitions can be nested through using key paths.

```js
const home = $('App.controllers.HomeController').new();
```
