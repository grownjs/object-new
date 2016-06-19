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
    if (typeof obj[key] === 'function') {
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
  function Factory(props) {
    if (this instanceof Factory) {
      return Factory.new.apply(null, arguments);
    }

    if (props) {
      extend(Factory, props, true);
      Factory.definitions.push(props);
    }

    return ns[name];
  }

  ns[name] = Factory;
  ns[name].extensions = [];
  ns[name].definitions = [];

  set(Factory, {
    new: function () {
      var args = arguments;
      var mixins = flat(Factory);
      var instance = merge(Object.create(null), getPrototypes(mixins));

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

  try {
    Object.defineProperty(Factory, 'name', {
      get: function () {
        return name;
      }
    });
  } catch (e) {
    // do nothing
    // node v0.10 v0.12
  }

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
