function readOnlyProperty(obj, prop, value) {
  Object.defineProperty(obj, prop, {
    configurable: false,
    enumerable: true,

    // public acccesors
    get() {
      /* istanbul ignore else */
      if (typeof value === 'function' && value.length === 0) {
        return value();
      }

      return value;
    },
    set() {
      throw new Error(`Property '${prop}' is read-only`);
    },
  });

  return obj;
}

function mergePropertiesInto(target, sourceProperties) {
  Object.keys(sourceProperties).forEach((prop) => {
    Object.defineProperty(target, prop, {
      configurable: false,
      enumerable: true,
      get() {
        /* istanbul ignore else */
        if (typeof sourceProperties[prop] === 'function') {
          return sourceProperties[prop].call(null, target);
        }

        return sourceProperties[prop];
      },
      set(value) {
        sourceProperties[prop] = value;
      },
    });
  });
}

function mergeMethodsInto(target, sourceMethods) {
  Object.keys(sourceMethods).forEach((prop) => {
    readOnlyProperty(target, prop, sourceMethods[prop].bind(null, target));
  });
}

function mergeDefinitionsInto(target, definitions) {
  /* istanbul ignore else */
  if (definitions.methods) {
    mergeMethodsInto(target, definitions.methods);
  }

  /* istanbul ignore else */
  if (definitions.properties) {
    mergePropertiesInto(target, definitions.properties);
  }
}

function _new(source, definition) {
  const target = Object.create(null);

  /* istanbul ignore else */
  if (typeof source === 'string') {
    readOnlyProperty(target, 'new', (opts) => _new(target, opts));
    readOnlyProperty(target, 'name', source);

    /* istanbul ignore else */
    if (definition) {
      Object.keys(definition).forEach((key) => {
        /* istanbul ignore else */
        if (typeof target[key] === 'undefined') {
          readOnlyProperty(target, key, definition[key]);
        }
      });
    }

    return target;
  }

  /* istanbul ignore else */
  if (typeof source.init === 'function') {
    const _source = source.init(definition);

    /* istanbul ignore else */
    if (_source) {
      mergeDefinitionsInto(target, _source);
    }
  }

  mergeDefinitionsInto(target, source);

  return target;
}

module.exports = function $new(name, props, context) {
  /* istanbul ignore else */
  if (!name) {
    return function $module(...args) {
      return $new.apply(null, args.concat($module));
    };
  }

  /* istanbul ignore else */
  if (typeof name !== 'string') {
    throw new Error(`Object name must be string, given '${name}'`);
  }

  context = context || (function () {
    return this;
  })();

  const keys = name.split('.');

  while (keys.length) {
    name = keys.shift();

    /* istanbul ignore else */
    if (!context[name]) {
      context[name] = _new(name, props);
    }

    context = context[name];
  }

  return context;
};
