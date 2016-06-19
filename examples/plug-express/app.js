var Plug = require('./core');

Plug('MyConn')({
  constructor() {
    this.log('#my');
  },
  prototype: {
    router(routeMappings) {
      return routeMappings()
        .get('/', 'Home.index');
    }
  }
}).use([
  Plug.Conn,
  Plug.Router
]);

Plug('Home')({
  constructor() {
    this.log('HOME');
  },
  prototype: {
    index(req, res) {
      res.end('OK');
    }
  }
}).use(Plug.Controller);

Plug('Main')({
  constructor() {
    this.log('OSOM');
  }
}).use(Plug.MyConn);

Plug.Main.new().start();
