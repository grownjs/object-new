# defModule

[![travis-ci](https://api.travis-ci.org/pateketrueke/def-module.svg)](https://travis-ci.org/pateketrueke/def-module)
[![codecov](https://codecov.io/gh/pateketrueke/def-module/branch/master/graph/badge.svg)](https://codecov.io/gh/pateketrueke/def-module)

Experimental DSL for module definitions.


```javascript
var def = require('def-module');

// self-container
var Container = function (moduleName) {
  return def(moduleName, Container);
};

Container('Application')(function () {
});

var app = Container.Application.new();
```
