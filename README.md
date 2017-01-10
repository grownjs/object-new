# Object.new()

[![travis-ci](https://api.travis-ci.org/pateketrueke/object-new.svg)](https://travis-ci.org/pateketrueke/object-new) [![codecov](https://codecov.io/gh/pateketrueke/object-new/branch/master/graph/badge.svg)](https://codecov.io/gh/pateketrueke/object-new)

Experimental DSL for module definitions.

```bash
$ yarn add object-new
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
$('Base', {
  init(scope, opts) {
    scope.start();
  },
  methods: {
    start(scope) {
      console.log('beep', scope.value);
    }
  },
  properties: {
    get value() {
      return 42;
    },
  },
});
```

The declared functionality is later composed when creating new objects.

```js
const base = $('Base').new();

// beep 42
```

This `new()` method is very powerful, e.g. `$.Base.new(...args, extra)`
