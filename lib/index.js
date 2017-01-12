'use strict';

// shared scope
const _self = Object.create(null);

// arguments
const _slice = Array.prototype.slice;

// retrieve or set
function descriptor(obj, prop) {
  return Object.getOwnPropertyDescriptor(obj, prop) || Object.create(null);
}

// used for overloading
function updateProperty(obj, prop, definition) {
  const set = descriptor(obj, prop);

  Object.keys(definition).forEach((key) => {
    set[key] = definition[key];
  });

  Object.defineProperty(obj, prop, set);
}

// assign properties or methods
function readOnlyProperty(obj, prop, value, method) {
  updateProperty(obj, prop, {
    configurable: false,
    enumerable: prop.charAt() !== '_',
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
}

// assign properties only
function mergePropertiesInto(target, sourceProperties) {
  Object.keys(sourceProperties).forEach((prop) => {
    const d = descriptor(sourceProperties, prop);

    /* istanbul ignore else */
    if (d.get && typeof d.set === 'undefined') {
      d.set = (value) => {
        /* istanbul ignore else */
        if (typeof value === 'undefined') {
          throw new Error(`Property '${prop}' expects a value, given undefined`);
        }

        throw new Error(`Property '${prop}' is read-only`);
      };
    }

    /* istanbul ignore else */
    if (typeof d.value !== 'undefined') {
      const _getter = typeof d.value === 'function';

      // initial value
      let  _value = d.value;

      d.get = () => {
        /* istanbul ignore else */
        if (_getter) {
          return _value.call(target);
        }

        return _value;
      };

      /* istanbul ignore else */
      if (typeof d.set === 'undefined') {
        d.set = (value) => {
          if (_getter) {
            throw new Error(`Property '${prop}' is read-only`);
          }

          _value = value;
        };
      }

      delete d.value;
      delete d.writable;
    }

    d.configurable = false;
    d.enumerable = prop.charAt() !== '_';

    updateProperty(target, prop, d);
  });
}

// assign methods only
function mergeMethodsInto(target, sourceMethods) {
  Object.keys(sourceMethods).forEach((prop) => {
    /* istanbul ignore else */
    if (typeof sourceMethods[prop] !== 'function') {
      throw new Error(`Method '${prop}' must be a function, given '${sourceMethods[prop]}'`);
    }

    readOnlyProperty(target, prop, sourceMethods[prop].bind(target), true);
  });
}

// merge strategy
function mergeDefinitionsInto(target, definitions, objectName) {
  try {
    /* istanbul ignore else */
    if (definitions.methods) {
      mergeMethodsInto(target, definitions.methods);
    }
  } catch (e) {
    throw new Error(`Invalid '${objectName}.methods' definition: ${e.message}`);
  }

  /* istanbul ignore else */
  if (definitions.properties) {
    mergePropertiesInto(target, definitions.properties);
  }
}

// factory
function _new(id, obj, props) {
  /* istanbul ignore else */
  if (typeof obj === 'string') {
    /* istanbul ignore else */
    if (props && (typeof props !== 'object' || Array.isArray(props))) {
      throw new Error(`Definition for '${id}' must be an object, given '${props}'`);
    }

    // proxy new
    function $proxy() {
      return $proxy.new.apply(null, arguments);
    }

    // static new
    readOnlyProperty($proxy, 'new', _new.bind(null, null, $proxy), true);

    // override object identity
    updateProperty($proxy, 'name', {
      configurable: true,
      enumerable: true,
      writable: true,
    });

    // force name
    $proxy.name = obj;

    /* istanbul ignore else */
    if (props) {
      Object.keys(props).forEach((key) => {
        /* istanbul ignore else */
        if (typeof $proxy[key] === 'undefined') {
          readOnlyProperty($proxy, key, props[key], key === 'init');
        }
      });
    }

    return $proxy;
  }

  const target = Object.create(null);

  /* istanbul ignore else */
  if (typeof obj.init === 'function') {
    const _obj = obj.init.apply(target, _slice.call(arguments, 2));

    /* istanbul ignore else */
    if (_obj) {
      mergeDefinitionsInto(target, _obj, `${obj.name || 'Object'}.init`);
    }
  }

  mergeDefinitionsInto(target, obj, obj.name || 'Object');

  return target;
}

module.exports = function $new(id, props, context) {
  /* istanbul ignore else */
  if (typeof id === 'undefined') {
    return function $module(id, props) {
      return $new(id, props, $module);
    };
  }

  /* istanbul ignore else */
  if (typeof id === 'object') {
    return _new.apply(null, [null].concat(_slice.call(arguments)));
  }

  /* istanbul ignore else */
  if (!id || typeof id !== 'string') {
    throw new Error(`Definition id must be an string, given '${id}'`);
  }

  context = context || _self;

  const keys = id.split('.');

  while (keys.length) {
    const key = keys.shift();

    /* istanbul ignore else */
    if (typeof context[key] === 'undefined') {
      readOnlyProperty(context, key, _new(id, key, props), true);
    }

    /* istanbul ignore else */
    if (!context[key]) {
      throw new Error(`Cannot define object '${id}' (failed at ${key})`);
    }

    context = context[key];
  }

  return context;
};

// export all helpers
module.exports.updateProperty = updateProperty;
module.exports.readOnlyProperty = readOnlyProperty;
module.exports.mergePropertiesInto = mergePropertiesInto;
module.exports.mergeMethodsInto = mergeMethodsInto;
module.exports.mergeDefinitionsInto = mergeDefinitionsInto;
