var Plug = module.exports = require('../../lib')();

var express = require('express');
var routeMappings = require('route-mappings');

Plug([
  Plug('App.Logger')
], 'App')({
  constructor() {
    this.log('init');

    this.port = 3000;
    this.app = express();
  },
  prototype: {
    start() {
      this.mount();
      this.app.listen(this.port, this.ok);
    },
    ok() {
      this.log('OK', this.port);
    }
  }
});

Plug('App.Router')({
  constructor() {
    this.log('router');
    this.router = this.router(routeMappings);
  },
  prototype: {
    mount() {
      var controllers = {};

      function dispatch(controller, action) {
        return function (req, res, next) {
          var Controller = Plug(controller);

          if (!controllers[controller]) {
            controllers[controller] = Controller.new();
          }

          controllers[controller][action](req, res, next);
        };
      }

      this.router.map((route) => {
        this.log((route.verb.toUpperCase() + '       ').substr(0, 7) + ' ' + route.path + ' ' + route.as);

        var _handler = route.handler.concat(route.to || []).join('.').split('.');

        var controller = _handler.slice(0, _handler.length - 1).join('.');
        var action = _handler.pop();

        this.app[route.verb](route.path, dispatch(controller, action));
      });
    }
  }
});

Plug('App.Logger')({
  prototype: {
    log() {
      console.log.apply(console.log, arguments);
    }
  }
});

Plug('App.Controller').use(Plug('App.Logger'));
