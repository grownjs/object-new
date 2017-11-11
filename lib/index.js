'use strict';

const debug = require('debug')('object-new');

// shared scope
const _self = Object.create(null);

// arguments

const _protected = ['new', 'name', 'init', 'props', 'mixins', 'methods', 'extensions'];

function _flatten(value) {
  const out = [];

  while (value.length) {
    const item = value.shift();

    if (item instanceof Array) {
      value = item.concat(value);
    } else {
      out.push(item);
    }
  }

  return out;
}

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
    return new Date(source.getTime());
  }

  /* istanbul ignore else */
  if (source instanceof RegExp) {
    const flags = [];

    /* istanbul ignore else */
    if (source.global) {
      flags.push('g');
    }

    /* istanbul ignore else */
    if (source.multiline) {
      flags.push('m');
    }

    /* istanbul ignore else */
    if (source.ignoreCase) {
      flags.push('i');
    }

    return new RegExp(source.source, flags.join(''));
  }

  const copy = Object.create(null);

  Object.keys(source).forEach(key => {
    copy[key] = _clone(source[key]);
  });

  return copy;
}

// merge objects
function _merge(obj, source, except) {
  Object.keys(source).forEach(key => {
    /* istanbul ignore else */
    if (except && except.indexOf(key) > -1) {
      return;
    }

    if (Object.prototype.toString.call(source[key]) === '[object Object]') {
      obj[key] = _merge(obj[key] || {}, source[key]);
    } else {
      obj[key] = _clone(source[key]);
    }
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
      return value.apply(this, arguments);
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

  Object.keys(definition).forEach(key => {
    set[key] = definition[key];
  });

  Object.defineProperty(obj, prop, set);
}

// skip from enumerations
function hiddenProperty(obj, prop, value, writable) {
  updateProperty(obj, prop, {
    configurable: false,
    enumerable: false,
    writable: writable || false,
    value,
  });
}

// assign properties or methods
function readOnlyProperty(obj, prop, value, options) {
  options = options || {};

  updateProperty(obj, prop, {
    configurable: false,
    enumerable: options.hiddenProperty !== true
      ? prop.charAt() !== '_'
      : false,
    get() {
      /* istanbul ignore else */
      if (!options.isMethod && typeof value === 'function' && value.length === 0) {
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
  Object.keys(sourceProperties).forEach(prop => {
    const d = descriptor(sourceProperties, prop);

    /* istanbul ignore else */
    if (d.get && typeof d.set === 'undefined') {
      d.set = value => {
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
      let _value = d.value;

      d.get = () => {
        /* istanbul ignore else */
        if (_getter) {
          return _value.call(target);
        }

        return _value;
      };

      /* istanbul ignore else */
      if (typeof d.set === 'undefined') {
        d.set = value => {
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
  Object.keys(sourceMethods).forEach(prop => {
    /* istanbul ignore else */
    if (typeof sourceMethods[prop] !== 'function') {
      throw new Error(`Method '${prop}' must be a function, given '${sourceMethods[prop]}'`);
    }

    readOnlyProperty(target, prop, sourceMethods[prop].bind(this), {
      isMethod: true,
    });
  });
}

// merge strategy
function mergeDefinitionsInto(target, definition, objectName) {
  const props = Object.create(null);
  const methods = Object.create(null);

  /* istanbul ignore else */
  if (definition.extensions) {
    definition.extensions.forEach(mixin => {
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

  /* istanbul ignore else */
  if (definition.props) {
    _merge(props, definition.props);
  }

  /* istanbul ignore else */
  if (definition.methods) {
    _merge(methods, definition.methods);
  }

  try {
    // apply all
    mergePropertiesInto(target, props);
    mergeMethodsInto.call(this, target, methods);
  } catch (e) {
    throw new Error(`Invalid '${objectName}' props/methods: ${e.message}`);
  }
}

// proxy new
function _proxy(id, ctor, parent) {
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

      const $child = _proxy(id, ctor, parent);

      /* istanbul ignore else */
      if (_id.mixins) {
        $child.mixins = _id.mixins;
      }

      /* istanbul ignore else */
      if (_id.name) {
        $child.name = _id.name;
      }

      // merge parent extensions and given definition
      $proxy.extensions.concat(_id).forEach(mixin => {
        _extend($child, mixin);
      });

      return $child;
    }

    return $proxy.new.apply(null, arguments);
  }

  // static new
  hiddenProperty($proxy, 'new', ctor.bind(null, $proxy));

  // override object identity
  updateProperty($proxy, 'name', {
    configurable: false,
    writable: true,
  });

  // initial ctor
  hiddenProperty($proxy, 'name', id, true);
  hiddenProperty($proxy, 'init', null);
  hiddenProperty($proxy, 'class', parent);

  // force name
  hiddenProperty($proxy, 'props', Object.create(null));
  hiddenProperty($proxy, 'methods', Object.create(null));
  hiddenProperty($proxy, 'extensions', []);

  return $proxy;
}

// ancestors
function _super(chain, className) {
  const source = chain[chain.length - 1];

  /* istanbul ignore else */
  if (!(source.init || source.props || source.methods)) {
    return;
  }

  const target = Object.create(null);

  debug('CHAIN %s <{ %s }>', className, Object.keys(source).join(', '));

  let $proxy;

  /* istanbul ignore else */
  if (chain.length > 1) {
    $proxy = _super.call(this, chain.slice(0, chain.length - 1), className);
  }

  readOnlyProperty(target, 'super', () => {
    /* istanbul ignore else */
    if (!$proxy) {
      throw new Error(`${className} does not have ancestors`);
    }

    return $proxy;
  }, {
    hiddenProperty: true,
  });

  if (source.init) {
    hiddenProperty(target, 'init', source.init.bind(this));
  } else {
    readOnlyProperty(target, 'init', () => $proxy.init, {
      hiddenProperty: true,
    });
  }

  mergeDefinitionsInto.call(this, target, {
    extensions: chain,
  }, className);

  return target;
}

// factory
function _new(obj) {
  debug('INSTANCE <%s>', obj.name || 'Object');

  const target = Object.create(null);

  /* istanbul ignore else */
  if (!obj.extensions) {
    obj.extensions = [];
  }

  /* istanbul ignore else */
  if (obj.extensions.length > 1) {
    hiddenProperty(target, 'super',
      _super.call(target, obj.extensions.slice(0, obj.extensions.length - 1), obj.name || 'Object'));
  } else {
    readOnlyProperty(target, 'super', () => {
      throw new Error(`${obj.name || 'Object'} does not have ancestors`);
    }, {
      hiddenProperty: true,
    });
  }

  mergeDefinitionsInto.call(target, target, obj, obj.name || 'Object');

  const args = Array.prototype.slice.call(arguments, 1);

  const _initializers = [];
  const _extensions = [];

  _initializers.push(obj.init);
  _initializers.push((obj.extensions[obj.extensions.length - 1] || {}).init);

  obj.extensions.forEach(ext => {
    /* istanbul ignore else */
    if (typeof ext.mixins === 'function') {
      _initializers.push(ext.mixins);
    }

    /* istanbul ignore else */
    if (Array.isArray(ext.mixins)) {
      Array.prototype.push.apply(_initializers, _flatten(ext.mixins));
    }
  });

  for (let i = 0; i < _initializers.length; i += 1) {
    let _factory = _initializers[i];

    while (_factory) {
      const _retval = _factory && _factory.apply(target, args);

      if (Array.isArray(_retval)) {
        _factory = null;
        _retval.forEach(x => {
          if (Array.isArray(x.mixins)) {
            Array.prototype.push.apply(_initializers, _flatten(x.mixins));
          } else if (typeof x.mixins === 'function') {
            _initializers.push(x.mixins);
          }

          /* istanbul ignore else */
          if (typeof x.init === 'function') {
            _initializers.push(x.init);
          }

          _extensions.push(x);
        });
      } else if (Object.prototype.toString.call(_retval) === '[object Object]') {
        _factory = _retval.init;
        _extensions.push(_retval);
      } else {
        /* istanbul ignore else */
        if (_retval && typeof _retval !== 'undefined') {
          return _retval;
        }

        break;
      }
    }
  }

  const mix = _extensions
    .reduce((prev, cur) => _merge(prev, cur, ['mixins', 'extensions']), {});

  mergeDefinitionsInto.call(target, target, mix, mix.name || obj.name || 'Object');

  return target;
}

module.exports = function $new(id, props, context, extensions) {
  /* istanbul ignore else */
  if (typeof id === 'undefined') {
    return function $module(_id, _props, _extensions) {
      return $new(_id, _props, $module, _extensions);
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
  const _keys = [];

  try {
    while (keys.length) {
      const key = keys.shift();

      _keys.push(key);

      /* istanbul ignore else */
      if (typeof context[key] === 'undefined') {
        /* istanbul ignore else */
        if (typeof props === 'function' && extensions === false) {
          debug('FACTORY <%s>', _keys.join('.'));

          readOnlyProperty(context, key, props);

          return context;
        }

        debug('PROPERTY <%s>', _keys.join('.'));

        const value = extensions === false
          ? Object.create(null)
          : _proxy(key, _new, _keys.join('.'));

        readOnlyProperty(context, key, value);
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
      if (typeof context.extensions === 'undefined' || context.extensions.length) {
        throw new Error(`Cannot redefine object '${id}' factory`);
      }

      debug('CONSTRUCTOR <%s>', id);

      _invoke(context, props);

      return context;
    }

    /* istanbul ignore else */
    if (typeof props !== 'object' || Array.isArray(props)) {
      throw new Error(`Definition for '${id}' must be an object, given '${props}'`);
    }

    /* istanbul ignore else */
    if (extensions !== false) {
      _extend(context, props, extensions);

      /* istanbul ignore else */
      if (props.mixins) {
        context.mixins = props.mixins;
      }

      /* istanbul ignore else */
      if (props.name) {
        context.name = props.name;
      }
    }
  }

  return context;
};

// export all helpers
module.exports.getDescriptor = descriptor;
module.exports.updateProperty = updateProperty;
module.exports.readOnlyProperty = readOnlyProperty;
module.exports.mergePropertiesInto = mergePropertiesInto;
module.exports.mergeMethodsInto = mergeMethodsInto;
module.exports.mergeDefinitionsInto = mergeDefinitionsInto;
