function initializeDefinitionFactory(def, props, constructor) {
  if (constructor instanceof def) {
    return def.new.apply(null, arguments);
  }

  if (props) {
    extend(def, props, true);
    def.definitions.push(props);
  }

  return def;
}

function makeDefinitionFactory(name) {
  return function Factory(props) {
    return initializeDefinitionFactory(Factory, props, this);
  };
}

function filterDefinitions(mixins) {
  return (Array.isArray(mixins) ? mixins : [mixins])
    .filter((mixin) => mixin);
}

function getPrototypes(mixins) {
  return mixins
    .map((mixin) => mixin.prototype || Object.create(null));
}

function set(obj, prop, value) {
  if (typeof prop === 'string') {
    Object.defineProperty(obj, prop, {
      configurable: false,
      enumerable: false,

      // public acccesors
      get() {
        return value;
      },
      set() {
        throw new Error(`cannot redefine '${prop}'`);
      },
    });
  } else {
    Object.keys(prop).forEach((key) => {
      set(obj, key, prop[key]);
    });
  }

  return obj;
}

function flat(tree) {
  const list = [];

  if (tree.extensions) {
    tree.extensions.concat(tree.definitions).forEach((mixin) => {
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
  src.forEach((props) => {
    Object.getOwnPropertyNames(props).forEach((name) => {
      Object.defineProperty(obj, name, Object.getOwnPropertyDescriptor(props, name));
    });
  });

  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'function' && key !== 'constructor') {
      obj[key] = obj[key].bind(obj);
    }
  });

  return obj;
}

function extend(obj, src, replace) {
  Object.keys(src).forEach((key) => {
    if (key !== 'definitions' && key !== 'extensions' && key !== 'constructor' && key !== 'prototype') {
      if (replace || typeof obj[key] === 'undefined') {
        obj[key] = src[key];
      }
    }
  });
}

function define(name, ns) {
  var Factory = ns[name] = makeDefinitionFactory(name);

  set(Factory, {
    // identity
    name,

    // containers
    extensions: [],
    definitions: [],

    // DSL
    new() {
      const args = arguments;
      const mixins = flat(Factory);
      const instance = merge(Object.create(null), getPrototypes(mixins));

      // keep its reference
      instance.constructor = Factory;

      mixins.forEach((mixin) => {
        mixin.constructor.apply(instance, args);
      });

      return instance;
    },
    use(defs) {
      if (!Array.isArray(defs)) {
        defs = [defs];
      }

      defs.forEach((def) => {
        if (def === null || (typeof def !== 'object' && typeof def !== 'function')) {
          throw new Error(`cannot inherit '${def}'`);
        }

        extend(Factory, def);
        Factory.extensions.push(def);
      });

      return Factory;
    },
    on(that) {
      const mixins = flat(Factory);

      merge(that, getPrototypes(mixins));

      mixins.forEach(function (mixin) {
        mixin.constructor.apply(that);
      });

      return Factory;
    }
  });

  return Factory;
}

module.exports = function defModule(name, context) {
  if (!name) {
    return function self() {
      return defModule.apply(null, Array.prototype.slice.call(arguments).concat(self));
    };
  }

  const mixins = [];

  if (Array.isArray(name) || typeof name === 'function') {
    Array.prototype.push.apply(mixins, filterDefinitions(name));

    name = context;
    context = arguments[2];
  }

  context = context || (function () {
    return this;
  })();

  if (typeof name === 'function') {
    return name.use(mixins);
  }

  const keys = name.split('.');

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
