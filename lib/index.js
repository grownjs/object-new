function hasPrototype(obj) {
  return obj && obj.prototype || obj || null;
}

function getPrototypes(parents) {
  return (Array.isArray(parents) ? parents : [parents])
    .filter(hasPrototype)
    .map(hasPrototype);
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
      var parents = obj && !Array.isArray(obj) ? [obj] : obj || [];

      merge(instance, [fn.prototype], true);
      merge(instance, parents, true);

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
      return set(fn.prototype, prop, value);
    }
  });
}

function define(name, ns) {
  return function (props) {
    Object.keys(props || {}).forEach(function (prop) {
      ns[name][prop] = props[prop];
    });

    return ns[name];
  };
}

module.exports = function def(name, context) {
  var parents = [];

  if (Array.isArray(name) || typeof name === 'function') {
    parents = getPrototypes(name);
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
      context[name] = wrap(name, !keys.length ? parents : null, define(name, context));
    }

    context = context[name];
  }

  if (!seen[name] && parents.length) {
    merge(context.prototype, parents);
  }

  return context;
};
