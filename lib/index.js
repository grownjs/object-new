'use strict';

// shared scope
const _self = Object.create(null);

// arguments
const _slice = Array.prototype.slice;

const _protected = ['new', 'name', 'init', 'props', 'methods', 'extensions'];

// fast clone
function _clone(source) {
  /* istanbul ignore else */
  if (!source || typeof source !== 'object') {
    return source;
  }

  /* istanbul ignore else */
  if (Array.isArray(source)) {
    return source.map(_clone);
  }

  /* istanbul ignore else */
  if (source instanceof Date) {
    return new Date().setTime(source.getTime());
  }

  /* istanbul ignore else */
  if (source instanceof RegExp) {
    const _source = source.toString();
    const _slash = _source.lastIndexOf('/');

    return new RegExp(_source.substr(1, _slash), _source.substr(_slash + 1));
  }

  const copy = Object.create(null);

  Object.keys(source).forEach((key) => {
    copy[key] = source[key];
  });

  return copy;
}

// merge objects
function _merge(obj, source, except) {
  Object.keys(source).forEach((key) => {
    /* istanbul ignore else */
    if (except && except.indexOf(key) > -1) {
      return;
    }

    obj[key] = _clone(source[key]);
  });

  return obj;
}

// extend objects
function _extend(obj, source, extensions) {
  /* istanbul ignore else */
  if (extensions !== false) {
    // append definitions
    obj.extensions.push(source);
  }

  // apply static props/methods
  _merge(obj, source, _protected);
}

// invoke values
function _invoke(obj, value) {
  obj.extensions.push({
    init() {
      return value;
    },
  });
}

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
function mergeDefinitionsInto(target, definition, objectName) {
  const init = [];
  const props = Object.create(null);
  const methods = Object.create(null);

  /* istanbul ignore else */
  if (typeof definition.init === 'function') {
    init.push(definition.init);
  }

  /* istanbul ignore else */
  if (definition.props) {
    _merge(props, definition.props);
  }

  /* istanbul ignore else */
  if (definition.methods) {
    _merge(methods, definition.methods);
  }

  /* istanbul ignore else */
  if (definition.extensions) {
    definition.extensions.forEach((mixin) => {
      /* istanbul ignore else */
      if (typeof mixin.init === 'function') {
        init.push(mixin.init);
      }

      /* istanbul ignore else */
      if (mixin.props) {
        _merge(props, mixin.props);
      }

      /* istanbul ignore else */
      if (mixin.methods) {
        _merge(methods, mixin.methods);
      }
    });
  }

  try {
    // apply all
    mergePropertiesInto(target, props);
    mergeMethodsInto(target, methods);
  } catch (e) {
    throw new Error(`Invalid '${objectName}.methods' definition: ${e.message}`);
  }

  return function _init() {
    for (let i = 0, c = init.length; i < c; i += 1) {
      const factory = init[i].apply(target, arguments) || Object.create(null);

      /* istanbul ignore else */
      if (typeof factory === 'function') {
        return factory();
      }

      /* istanbul ignore else */
      if (factory.props) {
        mergePropertiesInto(target, factory.props);
      }

      /* istanbul ignore else */
      if (factory.methods) {
        mergeMethodsInto(target, factory.methods);
      }
    }
  };
}

// proxy new
function _proxy(id, ctor) {
  function $proxy(_id, props) {
    /* istanbul ignore else */
    if (!(this instanceof $proxy)) {
      /* istanbul ignore else */
      if (typeof _id === 'string') {
        return module.exports(_id, props, $proxy);
      }

      /* istanbul ignore else */
      if (!_id) {
        return $proxy;
      }

      const $child = _proxy(id, ctor);

      // merge parent extensions and given definition
      $proxy.extensions.concat(_id).forEach((mixin) => {
        _extend($child, mixin);
      });

      return $child;
    }

    return $proxy.new.apply(null, arguments);
  }

  // static new
  readOnlyProperty($proxy, 'new', ctor.bind(null, $proxy), true);

  // override object identity
  updateProperty($proxy, 'name', {
    configurable: true,
    enumerable: true,
    writable: true,
  });

  // initial ctor
  $proxy.init = null;

  // force name
  $proxy.name = id;
  $proxy.props = Object.create(null);
  $proxy.methods = Object.create(null);
  $proxy.extensions = [];

  return $proxy;
}

// factory
function _new(obj) {
  const target = Object.create(null);
  const ctor = mergeDefinitionsInto(target, obj, obj.name || 'Object');
  const retval = ctor.apply(target, _slice.call(arguments, 1));

  /* istanbul ignore else */
  if (typeof retval !== 'undefined') {
    return retval;
  }

  return target;
}

module.exports = function $new(id, props, context, extensions) {
  /* istanbul ignore else */
  if (typeof id === 'undefined') {
    return function $module(id, props, _extensions) {
      return $new(id, props, $module, _extensions);
    };
  }

  /* istanbul ignore else */
  if (typeof id === 'object') {
    return _new.apply(null, arguments);
  }

  /* istanbul ignore else */
  if (!id || typeof id !== 'string') {
    throw new Error(`Definition id must be an string, given '${id}'`);
  }

  /* istanbul ignore else */
  if (context === false) {
    extensions = context;
    context = null;
  }

  context = context || _self;

  const keys = id.split('.');

  try {
    while (keys.length) {
      const key = keys.shift();

      /* istanbul ignore else */
      if (typeof context[key] === 'undefined') {
        const value = extensions === false
          ? Object.create(null)
          : _proxy(key, _new);

        readOnlyProperty(context, key, value, true);
      }

      context = context[key];
    }
  } catch (e) {
    throw new Error(`Cannot define object '${id}': ${e.message}`);
  }

  /* istanbul ignore else */
  if (props) {
    /* istanbul ignore else */
    if (typeof props === 'function') {
      /* istanbul ignore else */
      if (context.extensions.length) {
        throw new Error(`Cannot redefine object '${id}' factory`);
      }

      _invoke(context, props);

      return context;
    }

    /* istanbul ignore else */
    if (typeof props !== 'object' || Array.isArray(props)) {
      throw new Error(`Definition for '${id}' must be an object, given '${props}'`);
    }

    _extend(context, props, extensions);
  }

  return context;
};

// export all helpers
module.exports.updateProperty = updateProperty;
module.exports.readOnlyProperty = readOnlyProperty;
module.exports.mergePropertiesInto = mergePropertiesInto;
module.exports.mergeMethodsInto = mergeMethodsInto;
module.exports.mergeDefinitionsInto = mergeDefinitionsInto;
