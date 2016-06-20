var makeDefinitionFactory = (function () {
  function F() {}

  try {
    // this will fail on some environments
    Object.defineProperty(F, 'name', {
      value: 'X'
    });
  } catch (e) {}

  if (F.name === 'X') {
    return function makeDefinitionFactory(name) {
      function Factory(props) {
        if (this instanceof Factory) {
          return Factory.new.apply(null, arguments);
        }

        if (props) {
          extend(Factory, props, true);
          Factory.definitions.push(props);
        }

        return Factory;
      }

      Object.defineProperty(Factory, 'name', {
        get: function () {
          return name;
        }
      });

      return Factory;
    };
  } else {
    return function makeDefinitionFactory(name) {
      var Factory;

      // worst solution ever?
      eval('Factory=function ' + name + '(props){' +
          'if(this instanceof Factory)return Factory.new.apply(null,arguments);' +
          'if(props){extend(Factory,props,true);Factory.definitions.push(props);}' +
          'return Factory}');

      return Factory;
    };
  }
})();

function filterDefinitions(mixins) {
  return (Array.isArray(mixins) ? mixins : [mixins])
    .filter(function (mixin) {
      return mixin;
    });
}

function getPrototypes(mixins) {
  return mixins
    .map(function (mixin) {
      return mixin.prototype || mixin;
    });
}

function set(obj, prop, value) {
  if (typeof prop === 'string') {
    Object.defineProperty(obj, prop, {
      get: function () {
        return value;
      },
      set: function () {
        throw new Error('cannot redefine `' + prop + '`');
      }
    });
  } else {
    Object.keys(prop).forEach(function (key) {
      set(obj, key, prop[key]);
    });
  }

  return obj;
}

function flat(tree) {
  var list = [];

  if (tree.extensions) {
    tree.extensions.concat(tree.definitions).forEach(function (mixin) {
      if (mixin.extensions) {
        Array.prototype.push.apply(list, flat(mixin));
      } else {
        list.push(mixin);
      }
    });
  }

  return list;
}

function merge(obj, src) {
  src.forEach(function (props) {
    Object.getOwnPropertyNames(props).forEach(function (name) {
      Object.defineProperty(obj, name, Object.getOwnPropertyDescriptor(props, name));
    });
  });

  Object.keys(obj).forEach(function (key) {
    if (typeof obj[key] === 'function' && key !== 'constructor') {
      obj[key] = obj[key].bind(obj);
    }
  });

  return obj;
}

function extend(obj, src, replace) {
  Object.keys(src).forEach(function (key) {
    if (key !== 'definitions' && key !== 'extensions' && key !== 'constructor' && key !== 'prototype') {
      if (replace || typeof obj[key] === 'undefined') {
        obj[key] = src[key];
      }
    }
  });
}

function define(name, ns) {
  var Factory = makeDefinitionFactory(name);

  ns[name] = Factory;
  ns[name].extensions = [];
  ns[name].definitions = [];

  set(Factory, {
    new: function () {
      var args = arguments;
      var mixins = flat(Factory);
      var instance = merge(Object.create(null), getPrototypes(mixins));

      // keep its reference
      instance.constructor = Factory;

      mixins.forEach(function (mixin) {
        mixin.constructor.apply(instance, args);
      });

      return instance;
    },
    use: function (defs) {
      if (!Array.isArray(defs)) {
        defs = [defs];
      }

      defs.forEach(function (def) {
        if (def === null || (typeof def !== 'object' && typeof def !== 'function')) {
          throw new Error('cannot inherit `' + def + '`');
        }

        extend(Factory, def);
        Factory.extensions.push(def);
      });

      return Factory;
    },
    on: function (that) {
      var mixins = flat(Factory);

      merge(that, getPrototypes(mixins));

      mixins.forEach(function (mixin) {
        mixin.constructor.apply(that);
      });

      return Factory;
    }
  });

  return Factory;
}

module.exports = function def(name, context) {
  if (!name) {
    return function self() {
      return def.apply(null, Array.prototype.slice.call(arguments).concat(self));
    };
  }

  var mixins = [];

  if (Array.isArray(name) || typeof name === 'function') {
    mixins = filterDefinitions(name);
    name = context;
    context = arguments[2];
  }

  context = context || (function () {
    return this;
  })();

  if (typeof name === 'function') {
    return name.use(mixins);
  }

  var keys = name.split('.');

  while (keys.length) {
    name = keys.shift();

    if (!context[name]) {
      context[name] = define(name, context);
    }

    context = context[name];
  }

  context.use(mixins);

  return context;
};
