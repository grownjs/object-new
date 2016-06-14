function set(obj, prop, value) {
  if (typeof prop === 'string') {
    Object.defineProperty(obj, prop, {
      get: function () {
        return value;
      }
    });
  } else {
    Object.keys(prop).forEach(function (key) {
      set(obj, key, prop[key]);
    });
  }

  return obj;
}

function wrap(fn) {
  return set(fn, {
    new: function () {
      return Object.create(fn.prototype || null);
    },
    def: function (prop, value) {
      fn.prototype[prop] = value;
      return fn;
    },
    defn: function (prop, value) {
      return set(fn, prop, value);
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
  context = context || (function () {
    return this;
  })();

  var keys = name.split('.');

  while (keys.length) {
    name = keys.shift();

    if (!context[name]) {
      context[name] = wrap(define(name, context));
    }

    context = context[name];
  }

  return context;
};
