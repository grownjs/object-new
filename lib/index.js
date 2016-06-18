function filterDefinitions(mixins) {
  return (Array.isArray(mixins) ? mixins : [mixins])
    .filter(function (mixin) {
      return mixin;
    });
}

function getPrototypes(mixins) {
  return filterDefinitions(mixins)
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

function merge(obj, src, bind) {
  src.forEach(function (props) {
    Object.getOwnPropertyNames(props).forEach(function (name) {
      Object.defineProperty(obj, name, Object.getOwnPropertyDescriptor(props, name));
    });
  });

  if (bind) {
    Object.keys(obj).forEach(function (key) {
      if (typeof obj[key] === 'function') {
        obj[key] = obj[key].bind(obj);
      }
    });
  }

  return obj;
}

function wrap(name, fn) {
  return set(fn, {
    new: function () {
      var mixins = fn.extensions || [];
      var instance = merge(Object.create(null), getPrototypes(mixins).concat(fn.prototype), true);

      var args = arguments;

      mixins.concat(fn).forEach(function (mixin) {
        mixin.constructor.apply(instance, args);
      }, this);

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

        Object.keys(def).forEach(function (key) {
          if (typeof fn[key] === 'undefined') {
            fn[key] = def[key];
          }
        });

        fn.extensions = fn.extensions || [];
        fn.extensions.push(def);
      });

      return fn;
    }
  });
}

function define(name, ns) {
  function Factory(props) {
    if (this instanceof Factory) {
      return Factory.new.apply(null, arguments);
    }

    if (props) {
      Object.keys(props).forEach(function (prop) {
        ns[name][prop] = props[prop];
      });
    }

    return ns[name];
  }

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
    merge(name.prototype, getPrototypes(mixins));
    return name;
  }

  var keys = name.split('.');

  while (keys.length) {
    name = keys.shift();

    if (!context[name]) {
      context[name] = wrap(name, define(name, context));
    }

    context = context[name];
  }

  context.use(mixins);

  return context;
};
