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

function set(obj, prop, value, getter) {
  if (typeof prop === 'string') {
    Object.defineProperty(obj, prop, {
      get: getter ? value : function () {
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
    Object.keys(props).forEach(function (key) {
      obj[key] = bind && typeof props[key] === 'function'
        ? props[key].bind(obj)
        : props[key];
    });
  });
}

function wrap(name, obj, fn) {
  return set(fn, {
    new: function () {
      var instance = Object.create(fn.prototype || null);
      var mixins = obj && !Array.isArray(obj) ? [obj] : obj || [];

      merge(instance, [fn.prototype], true);
      merge(instance, getPrototypes(mixins), true);

      var args = arguments;

      mixins.concat(fn).forEach(function (mixin) {
        mixin.constructor.apply(instance, args);
      });

      return instance;
    },
    mix: function (defs) {
      merge(fn.prototype, getPrototypes(defs));
      return fn;
    },
    def: function (prop, value) {
      fn.prototype[prop] = value;
      return fn;
    },
    defn: function (prop, value) {
      set(fn.prototype, prop, value, typeof value === 'function');
      return fn;
    }
  });
}

function define(name, ns) {
  return function (props) {
    if (typeof props === 'function') {
      props.call(ns[name]);
      props = null;
    }

    Object.keys(props || {}).forEach(function (prop) {
      ns[name][prop] = props[prop];
    });

    return ns[name];
  };
}

module.exports = function def(name, context) {
  var mixins = [];

  if (Array.isArray(name) || typeof name === 'function') {
    mixins = filterDefinitions(name);
    name = context;
    context = arguments[2];
  }

  context = context || (function () {
    return this;
  })();

  var keys = name.split('.');
  var seen = {};

  while (keys.length) {
    name = keys.shift();

    if (!context[name]) {
      seen[name] = 1;
      context[name] = wrap(name, !keys.length ? mixins : null, define(name, context));
    }

    context = context[name];
  }

  if (!seen[name] && mixins.length) {
    merge(context.prototype, getPrototypes(mixins));
  }

  return context;
};
