var Plug = require('./core');

Plug('My.CustomRouter')({
  constructor() {
    this.router.get('/:x', 'Home.yay');
  }
});

Plug('My.App')({
  constructor() {
    this.log('my');
  },
  prototype: {
    router(routeMappings) {
      return routeMappings()
        .get('/', 'App.Home.index');
    }
  }
}).use([
  Plug.App,
  Plug.App.Router,
  Plug.My.CustomRouter
]);

Plug('App.Home')({
  constructor() {
    this.log('HOME');
  },
  prototype: {
    index(req, res) {
      res.end('OK');
    }
  }
}).use(Plug.App.Controller);

Plug('Main')({
  constructor() {
    this.log('OSOM');
  }
}).use(Plug.My.App);

Plug.Main.new().start();
