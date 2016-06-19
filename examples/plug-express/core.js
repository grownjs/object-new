var Plug = module.exports = require('../../lib')();

var express = require('express');
var routeMappings = require('route-mappings');

Plug(Plug('Logger'), 'Conn')({
  constructor() {
    this.log('#init');

    this.port = 3000;
    this.app = express();

    if (this.routes) {
      this.routes.forEach((route) => {
        console.log(route);
      });
    }
  },
  prototype: {
    start() {
      this.app.listen(this.port, this.ok);
    },
    ok() {
      this.log('OK', this.port);
    }
  }
});

Plug('Router')({
  constructor() {
    this.log('#router');

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

    this.router = this.router(routeMappings);
    this.router.routes.forEach((route) => {
      var _handler = route.handler.concat(route.to || []).join('.').split('.');

      var controller = _handler.slice(0, _handler.length - 1).join('.');
      var action = _handler.pop();

      this.app[route.verb](route.path, dispatch(controller, action));
    });
  }
});

Plug('Logger')({
  prototype: {
    log() {
      console.log.apply(console.log, arguments);
    }
  }
});

Plug('Controller').use(Plug('Logger'));
