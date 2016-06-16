var _merge = require('merge-descriptors');

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

function merge(obj, src) {
  if (obj.prototype) {
    obj = obj.prototype;
    src = getPrototypes(src);
  }

  var data = Object.create(null),
      _data = Object.create(null);

  src.forEach(function push(props) {
    Object.keys(props).forEach(function (prop) {
      if (typeof props[prop] === 'function') {
        var descriptor = Object.getOwnPropertyDescriptor(props, prop);
        descriptor.value = descriptor.value.bind(_data);
        Object.defineProperty(props, prop, descriptor);
      }

      if (prop.charAt() !== '_') {
        data[prop] = props[prop];
      }

      _data[prop] = props[prop];
    });

    // public properties
    Object.getOwnPropertyNames(data).forEach(function (key) {
      Object.defineProperty(obj, key, Object.getOwnPropertyDescriptor(data, key));
    });

    // // _private properties
    // Object.getOwnPropertyNames(_data).forEach(function (_key) {
    //   var descriptor = Object.getOwnPropertyDescriptor(_data, _key);

    //   if (typeof descriptor.value === 'function') {
    //     descriptor.value = descriptor.value.bind(_data);
    //     Object.defineProperty(obj, _key, descriptor);
    //   }
    // });
  });
}

function wrap(name, fn) {
  var mixins = [];

  return set(fn, {
    new: function () {
      var instance = Object.create(fn.prototype || null);

      merge(instance, getPrototypes(mixins).concat(fn.prototype));

      var args = arguments;

      mixins.concat(fn).forEach(function (mixin) {
        mixin.constructor.apply(instance, args);
      }, this);

      return instance;
    },
    mix: function (defs) {
      defs.forEach(function (def) {
        Object.keys(def).forEach(function (key) {
          if (typeof fn[key] === 'undefined') {
            fn[key] = def[key];
          }
        });
      });

      Array.prototype.push.apply(mixins, defs);

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
  function Factory(props) {
    if (this instanceof Factory) {
      return Factory.new.apply(null, arguments);
    }

    if (typeof props === 'function') {
      props.call(ns[name], ns[name]);
      props = null;
    }

    Object.keys(props || {}).forEach(function (prop) {
      ns[name][prop] = props[prop];
    });

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

module.exports = function (name, context) {
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
    merge(name, mixins);
    return name;
  }

  var keys = name.split('.');
  var seen = {};

  while (keys.length) {
    name = keys.shift();

    if (!context[name]) {
      seen[name] = 1;
      context[name] = wrap(name, define(name, context));
    }

    context = context[name];
  }

  if (!seen[name] && mixins.length) {
    merge(context, mixins);
  } else {
    context.mix(mixins);
  }

  return context;
};
