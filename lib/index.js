'use strict';

// TODO: cleanup messy copy-loops

const debug = require('debug')('object-new');

const util = require('util');

const RE_CLASS = /^[A-Z][a-z]/;

// shared scope
const _self = Object.create(null);

// arguments

const _protected = ['new', 'name', 'init', 'self', 'super', 'props', 'extend', 'methods', 'include', 'extensions'];

// retrieve or set
function _prop(obj, prop) {
  return Object.getOwnPropertyDescriptor(obj, prop) || Object.create(null);
}

// used for overloading
function _update(obj, prop, definition) {
  const set = _prop(obj, prop);

  Object.keys(definition).forEach(key => {
    set[key] = definition[key];
  });

  try {
    Object.defineProperty(obj, prop, set);
  } catch (e) {
    throw new Error(`${e.message}\nGiven '${util.inspect(definition)}'`);
  }
}

// skip from enumerations
function _hidden(obj, prop, value, writable) {
  _update(obj, prop, {
    configurable: false,
    enumerable: false,
    writable: writable || false,
    value,
  });
}

// merge default values
function _defaults(target, source) {
  Object.keys(source || {}).forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(target, key)) {
      _update(target, key, _prop(source, key));
    }
  });

  return target;
}

// assign properties or methods
function _readOnly(obj, prop, value, options) {
  options = options || {};

  _update(obj, prop, {
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

// fast clone
function _clone(source) {
  /* istanbul ignore else */
  if (!source || typeof source !== 'object') {
    return source;
  }

  /* istanbul ignore else */
  if (Array.isArray(source)) {
    return source.map(x => _clone(x));
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

  const target = Object.create(null);

  Object.keys(source).forEach(key => {
    target[key] = source[key];
  });

  return target;
}

// callbacks
function _chain(target) {
  if (Array.isArray(target)) {
    return function $chain() {
      const _values = [];

      for (let i = 0; i < target.length; i += 1) {
        const retval = target[i].apply(this, arguments);

        /* istanbul ignore else */
        if (retval !== 'undefined') {
          _values.push(retval);
        }
      }

      return _values;
    };
  }

  Object.keys(target).forEach(key => {
    const _source = _prop(target, key);

    /* istanbul ignore else */
    if (_source.configurable) {
      /* istanbul ignore else */
      if (Array.isArray(_source.value) && _source.value._chain) {
        _source.value = _chain(_source.value);
      }

      if (!Object.prototype.hasOwnProperty.call(target, key)) {
        _update(target, key, _source);
      } else {
        target[key] = _source.value;
      }
    }
  });

  return target;
}

// merge objects
function _merge(obj, source, except, deepMerge) {
  Object.keys(source).forEach(key => {
    /* istanbul ignore else */
    if (deepMerge && RE_CLASS.test(key)) {
      return;
    }

    /* istanbul ignore else */
    if (except && except.indexOf(key) > -1) {
      return;
    }

    const d = _prop(source, key);

    /* istanbul ignore else */
    if (deepMerge && key.charAt() !== '_') {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        _update(obj, key, d);
      } else if (Array.isArray(obj[key]) && Array.isArray(d.value)) {
        obj[key] = obj[key].concat(d.value);
      } else if (typeof d.value === 'function') {
        if (Array.isArray(obj[key])) {
          obj[key].push(d.value);
        } else {
          d.value = obj[key] = [obj[key], d.value];
          d.value._chain = true;

          _update(obj, key, d);
        }
      } else if (Object.prototype.toString.call(d.value) === '[object Object]') {
        obj[key] = _merge(obj[key], d.value);
      } else {
        _update(obj, key, d);
      }
      return;
    }

    if (d.get || d.set) {
      _update(obj, key, d);
    } else {
      if (Object.prototype.toString.call(d.value) === '[object Object]') {
        d.value = _merge(obj[key] || {}, d.value);
      } else if (!(d.get || d.set)) {
        d.value = _clone(d.value);
      }

      _update(obj, key, d);
    }
  });

  return obj;
}

function _include(obj, extensions) {
  const props = {};
  const methods = {};

  const _extensions = [];
  const _initializers = [];

  (function walk(value) {
    /* istanbul ignore else */
    if (typeof value === 'function' && !(value.class && value.new)) {
      _initializers.push(value);
      return;
    }

    /* istanbul ignore else */
    if (typeof value === 'function') {
      /* istanbul ignore else */
      if (_extensions.indexOf(value.class) > -1) {
        return;
      }

      /* istanbul ignore else */
      if (!value.extensions.length) {
        _merge(obj, value, _protected, true);
      }

      value.extensions.forEach(mixin => {
        walk(mixin);
      });

      _extensions.push(value.class);
      return;
    }

    /* istanbul ignore else */
    if (!value) {
      return;
    }

    /* istanbul ignore else */
    if (Array.isArray(value)) {
      return value.forEach(x => walk(x));
    }

    /* istanbul ignore else */
    if (Object.prototype.toString.call(value) === '[object Object]') {
      /* istanbul ignore else */
      if (value.extensions) {
        throw new Error(`${obj.class || obj.name || 'Object'} mixins does not expect extensions, given '${util.inspect(value.extensions)}'`);
      }

      /* istanbul ignore else */
      if (value.include) {
        walk(value.include);
      }

      /* istanbul ignore else */
      if (value.init) {
        _initializers.push(value.init);
      }

      /* istanbul ignore else */
      if (value.props) {
        _merge(props, value.props, [], true);
      }

      /* istanbul ignore else */
      if (value.methods) {
        _merge(methods, value.methods, [], true);
      }

      _merge(obj, value, _protected, true);
    } else {
      throw new Error(`Unexpected value to include, given '${util.inspect(value)}'`);
    }
  }(extensions));

  _chain(obj);
  _rename(obj, `${obj.name}*`);

  _hidden(obj, 'props', _chain(props), true);
  _hidden(obj, 'methods', _chain(methods), true);
  _hidden(obj, 'init', _chain(_initializers), true);
}

// extend objects
function _extend(obj, source, extensions) {
  if (source.extend) {
    (function walk(value) {
      /* istanbul ignore else */
      if (Array.isArray(value)) {
        return value.forEach(x => walk(x));
      }

      /* istanbul ignore else */
      if (!value) {
        return;
      }

      /* istanbul ignore else */
      if (typeof value === 'function' && !(value.class && value.new)) {
        return walk(value(source, value));
      }

      /* istanbul ignore else */
      if (typeof value === 'function' || Object.prototype.toString.call(value) === '[object Object]') {
        [value].concat(value.extensions).forEach(mix => {
          _defaults(source, mix);
          _defaults(source.props, mix.props);
          _defaults(source.methods, mix.methods);
        });
      }
    })(source.extend);

    delete source.extend;
  }

  /* istanbul ignore else */
  if (!source.include) {
    // apply static props/methods
    _merge(obj, source, _protected);
  }

  /* istanbul ignore else */
  if (extensions !== false) {
    if (source.include) {
      _include(obj, source, source.include);

      // remove extensions since they're merged now
      obj.extensions.splice(0, obj.extensions.length);
    } else {
      obj.extensions.push(source);
    }
  }
}

// invoke values
function _invoke(obj, value) {
  obj.extensions.push({
    init() {
      return value.apply(this, arguments);
    },
  });
}

// assign properties only
function mergePropertiesInto(target, sourceProperties) {
  Object.keys(sourceProperties).forEach(prop => {
    const d = _prop(sourceProperties, prop);

    /* istanbul ignore else */
    if (d.get || d.set) {
      d.get = d.get || (() => {
        throw new Error(`Property '${prop}' is write-only'`);
      });

      d.set = d.set || (value => {
        throw new Error(`Property '${prop}' is read-only, given '${util.inspect(value)}'`);
      });
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

    _update(target, prop, d);
  });
}

// assign methods only
function mergeMethodsInto(target, sourceMethods) {
  Object.keys(sourceMethods).forEach(prop => {
    /* istanbul ignore else */
    if (typeof sourceMethods[prop] !== 'function') {
      throw new Error(`Method '${prop}' must be a function, given '${util.inspect(sourceMethods[prop])}'`);
    }

    _readOnly(target, prop, sourceMethods[prop].bind(this), {
      isMethod: true,
    });
  });
}

// merge strategy
function mergeDefinitionsInto(target, definition) {
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
    throw new Error(`Invalid props/methods.\n${e.message}`);
  }
}

// override function identity
function _rename(obj, name) {
  const d = _prop(obj, 'name');

  d.value = name;
  d.writable = false;

  _update(obj, 'name', d);
}

function _reduce() {
  return Array.prototype.slice.call(arguments).reduce((prev, cur) => _merge(prev, cur || {}), {});
}

function _combine(ctx, data, parent) {
  /* istanbul ignore else */
  if (data.extensions) {
    throw new Error(`${ctx.class || ctx.name || 'Object'} does not expect extensions, given '${util.inspect(data.extensions)}'`);
  }

  /* istanbul ignore else */
  if (parent) {
    // merge parent extensions and given definition
    parent.extensions.concat(data).forEach(mixin => {
      _extend(ctx, mixin);
    });

    // merge given props and methods
    _hidden(ctx, 'init', parent.init, true);
    _hidden(ctx, 'props', _reduce(parent.props, data.props), true);
    _hidden(ctx, 'methods', _reduce(parent.methods, data.methods), true);
  }

  /* istanbul ignore else */
  if (data.name) {
    _rename(ctx, data.name);
  }
}

// ancestors
function _super(chain, className, staticProps) {
  const source = chain[chain.length - 1];

  /* istanbul ignore else */
  if (!source) {
    throw new Error(`${className} does not have ancestors`);
  }

  /* istanbul ignore else */
  if (!staticProps && !(source.init || source.props || source.methods)) {
    return;
  }

  const target = Object.create(null);

  debug('SUBCLASS <%s{ %s }>', className, Object.keys(source).join(', '));

  let $proxy;

  /* istanbul ignore else */
  if (chain.length > 1) {
    $proxy = _super.call(this, chain.slice(0, chain.length - 1), className, staticProps);
  }

  _readOnly(target, 'super', () => {
    /* istanbul ignore else */
    if (!$proxy) {
      throw new Error(`${className} does not have ancestors`);
    }

    return $proxy;
  }, {
    hiddenProperty: true,
  });

  if (staticProps) {
    _merge(target, chain.reduce((prev, cur) => _merge(prev, cur, _protected)));
  } else {
    if (source.init) {
      _hidden(target, 'init', source.init.bind(this));
    } else {
      _readOnly(target, 'init', () => $proxy.init, {
        hiddenProperty: true,
      });
    }

    mergeDefinitionsInto.call(this, target, {
      extensions: chain,
    });
  }

  return target;
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

      const $child = _proxy(`${id}+`, ctor, parent);

      _merge($child, $proxy, _protected);
      _combine($child, _id, $proxy);

      return $child;
    }

    return $proxy.new.apply(null, arguments);
  }

  // static new
  _hidden($proxy, 'new', ctor.bind(null, $proxy));
  _hidden($proxy, 'class', parent);

  // force name
  _rename($proxy, id);

  // bound-calls
  _hidden($proxy, 'init', null, true);
  _hidden($proxy, 'props', Object.create(null), true);
  _hidden($proxy, 'methods', Object.create(null), true);

  // mixin container
  _hidden($proxy, 'extensions', []);

  return $proxy;
}

// factory
function _new(obj) {
  debug('INSTANCE <%s>', (obj.class && obj.class !== obj.name)
    ? `${obj.name || 'Object'}[${obj.class}]`
    : obj.name || 'Object');

  /* istanbul ignore else */
  if (obj.include) {
    throw new Error(`${obj.class || obj.name || 'Object'} does not expect includes, given '${util.inspect(obj.include)}'`);
  }

  const target = Object.create(null);

  /* istanbul ignore else */
  if (!obj.extensions) {
    obj.extensions = [];
  }

  /* istanbul ignore else */
  if (obj.extensions.length > 1) {
    _hidden(target, 'super',
      _super.call(target, obj.extensions.slice(0, obj.extensions.length - 1), obj.class || obj.name || 'Object'));
  } else {
    _readOnly(target, 'super', () => {
      throw new Error(`${obj.class || obj.name || 'Object'} does not have ancestors`);
    }, {
      hiddenProperty: true,
    });
  }

  // constructor reference
  _hidden(target, 'ctor', obj);

  mergeDefinitionsInto.call(target, target, obj);

  const args = Array.prototype.slice.call(arguments, 1);

  const _initializers = [];
  const _extensions = [];

  function push(x) {
    if (typeof x === 'function') {
      if (x.class && typeof x.new === 'function') {
        Array.prototype.push.apply(_extensions, x.extensions);

        /* istanbul ignore else */
        if (x.init) {
          _initializers.push(x.init);
        }
      } else {
        _initializers.push(x);
      }
    } else if (Array.isArray(x)) {
      x.forEach(i => push(i));
    } else if (x) {
      if (x.init) {
        _initializers.push(x.init);
      } else {
        _extensions.push(x);
      }
    }
  }

  push(obj.init);
  push((obj.extensions[obj.extensions.length - 1] || {}).init);

  for (let i = 0; i < _initializers.length; i += 1) {
    const init = _initializers[i];

    const _retval = typeof init === 'function'
      ? init.apply(target, args)
      : init;

    if (Array.isArray(_retval)) {
      _retval.forEach(x => {
        push(x);
      });
    } else if (_retval && typeof _retval === 'object') {
      _extensions.push(_retval);

      /* istanbul ignore else */
      if (_retval.init) {
        push(_retval.init);
      }
    } else {
      /* istanbul ignore else */
      if (_retval && typeof _retval !== 'undefined') {
        return _retval;
      }
    }
  }

  /* istanbul ignore else */
  if (_extensions.length) {
    const mix = _extensions.reduce((prev, cur) => _merge(prev, cur), {});

    mergeDefinitionsInto.call(target, target, mix);
  }

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
    return _new(id);
  }

  /* istanbul ignore else */
  if (!id || typeof id !== 'string') {
    throw new Error(`Definition id must be an string, given '${util.inspect(id)}'`);
  }

  /* istanbul ignore else */
  if (context === false) {
    extensions = context;
    context = null;
  }

  context = context || _self;

  const keys = id.split('.');
  const _keys = [];

  while (keys.length) {
    const key = keys.shift();

    _keys.push(key);

    /* istanbul ignore else */
    if (typeof context[key] === 'undefined') {
      /* istanbul ignore else */
      if (!keys.length && typeof props === 'function' && extensions === false) {
        debug('FACTORY <%s>', _keys.join('.'));

        // FIXME: or they should be defined as-is?
        _readOnly(context, key, props);

        return props;
      }

      debug('DEFINITION <%s>', _keys.join('.'));

      const value = extensions === false
        ? Object.create(null)
        : _proxy(key, _new, _keys.join('.'));

      _readOnly(context, key, value);
    }

    context = context[key];
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
    if (Array.isArray(props) || typeof props !== 'object') {
      throw new Error(`Definition for '${id}' must be an object, given '${util.inspect(props)}'`);
    }

    if (extensions !== false) {
      /* istanbul ignore else */
      if (!('super' in context)) {
        _readOnly(context, 'super', () => {
          return _super.call(context, context.extensions.slice(0, context.extensions.length - 1), id, true);
        }, {
          hiddenProperty: true,
        });
      }

      // previous context reference
      _hidden(props, 'self', context);

      _extend(context, props);
      _combine(context, props);
    } else {
      _merge(context, props, _protected);
    }
  }

  return context;
};

// export all helpers
module.exports.getDescriptor = _prop;
module.exports.hiddenProperty = _hidden;
module.exports.updateProperty = _update;
module.exports.readOnlyProperty = _readOnly;
module.exports.mergePropertiesInto = mergePropertiesInto;
module.exports.mergeMethodsInto = mergeMethodsInto;
module.exports.mergeDefinitionsInto = mergeDefinitionsInto;
