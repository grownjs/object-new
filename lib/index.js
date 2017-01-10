function readOnlyProperty(obj, prop, value, method) {
  Object.defineProperty(obj, prop, {
    configurable: false,
    enumerable: true,

    // public acccesors
    get() {
      /* istanbul ignore else */
      if (!method && typeof value === 'function' && value.length === 0) {
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
    /* istanbul ignore else */
    if (typeof sourceMethods[prop] !== 'function') {
      throw new Error(`Method must be a function, given '${sourceMethods[prop]}'`);
    }

    readOnlyProperty(target, prop, sourceMethods[prop].bind(null, target), true);
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

function _new(id, obj, props) {
  const target = Object.create(null);

  /* istanbul ignore else */
  if (typeof obj === 'string') {
    /* istanbul ignore else */
    if (props && (typeof props !== 'object' || Array.isArray(props))) {
      throw new Error(`Definition for '${id}' must be an object, given '${props}'`);
    }

    readOnlyProperty(target, 'new', _new.bind(null, null, target));
    readOnlyProperty(target, 'name', obj);

    /* istanbul ignore else */
    if (props) {
      Object.keys(props).forEach((key) => {
        /* istanbul ignore else */
        if (typeof target[key] === 'undefined') {
          readOnlyProperty(target, key, props[key]);
        }
      });
    }

    return target;
  }

  /* istanbul ignore else */
  if (typeof obj.init === 'function') {
    const _obj = obj.init(props);

    /* istanbul ignore else */
    if (_obj) {
      mergeDefinitionsInto(target, _obj);
    }
  }

  mergeDefinitionsInto(target, obj);

  return target;
}

module.exports = function $new(id, props, context) {
  /* istanbul ignore else */
  if (typeof id === 'undefined') {
    return function $module(...args) {
      return $new.apply(null, args.concat($module));
    };
  }

  /* istanbul ignore else */
  if (typeof id === 'object') {
    return _new(null, id, props);
  }

  /* istanbul ignore else */
  if (!id || typeof id !== 'string') {
    throw new Error(`Definition id must be an string, given '${id}'`);
  }

  context = context || (function () {
    return this;
  })();

  const keys = id.split('.');

  while (keys.length) {
    const key = keys.shift();

    /* istanbul ignore else */
    if (typeof context[key] === 'undefined') {
      readOnlyProperty(context, key, _new(id, key, props));
    }

    /* istanbul ignore else */
    if (!context[key]) {
      throw new Error(`Cannot define object '${id}' (failed at ${key})`);
    }

    context = context[key];
  }

  return context;
};
