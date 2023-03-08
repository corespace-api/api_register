const ServiceManager = require('./assets/utils/serviceManager');

class Register extends ServiceManager {
  constructor(name) {
    super(name);
    this.fingerprintMiddleware = null;
    this.cors = null;
  }

  gracefulShutdown() {
    this.logger.log("Gracefully shutting down the service...");
    this.serviceSchema.findOne({ uuid: this.config.getConfig("uuid") }).then((service) => {
      if (!service) {
        this.logger.warn("Service not found in database");
        process.exit(1);
      }

      service.status = "await_removal";
      service.command = "user_init_shutdown"
      service.save().then(() => {
        this.logger.success("Service status updated to 'await_removal'");
        process.exit(0);
      }).catch((error) => {
        this.logger.error(error);
        process.exit(1);
      });
    }).catch((error) => {
      this.logger.error(error);
      process.exit(1);
    });
  }

  loadDependencies() {
    super.loadDependencies();
    this.cors = require('cors');
  }

  loadCustomDependencies() {
    super.loadCustomDependencies();
    this.fingerprintMiddleware = require('./assets/middleware/mdFingerprint');
  }

  logRequests() {
    this.server.use((req, res, next) => {
      const headers = req.headers;
      const reqMessage = `Request: ${req.method} ${req.originalUrl} + ${JSON.stringify(headers)}`;
      this.logger.request(reqMessage);
      next();
    });
  }

  loadMiddleware() {
    this.server.use(this.express.json());
    this.server.use(this.express.urlencoded({ extended: true }));
    this.server.use(this.cors());
    this.server.use(this.fingerprintMiddleware);
    this.server.disable('x-powered-by');
  }

  loadRoutes() {
    if (!this.config.getConfig("route_path")) {
      this.logger.error("Routes path not set")
      process.exit(1);
    }

    const apiRoutes = this.getAllRoutes(this.config.getConfig("route_path"));
    const apiRouteKeys = Object.keys(apiRoutes);

    this.logger.info(`Found ${apiRouteKeys.length} routes`);
    this.logger.log("Beginnig to load routes...");

    apiRoutes.forEach(route => {
      this.logger.log(`Loading route: ${route}`);

      const routePath = this.path.join(this.config.getConfig("route_path"), route);
      const routeName = route.replace('.js', '');

      const routeHandler = require(routePath);
      const routeInstance = new routeHandler(this.config, this.logger, this.express, this.dbc);

      routeInstance.load();

      this.server.use(`/${routeName}`, routeInstance.router);
    });
  }

  init() {
    // default behaviour
    this.createLogger();
    this.loadDependencies();
    this.loadCustomDependencies();
    this.loadConfig();

    // Create database connection
    this.dbConnection();
    this.registerService();

    this.config.setConfig("heartbeat", 10000)
    this.config.setConfig("listenInterval", 20000)
    this.heardBeat();
    this.listenCommands();

    this.logRequests();
    this.loadMiddleware();
    this.loadRoutes();
  }

  start() {
    this.logger.log("Starting server...");
    setTimeout(() => {
      this.server.listen(this.config.getConfig("port"), () => {
        this.logger.success(`Server started on port ${this.config.getConfig("port")}`);
      });
    }, 10000);
  }
}

const register = new Register("Register API");
register.init();
register.start();


// listen for process termination
process.on("SIGINT", () => {
  register.gracefulShutdown();
});

process.on("SIGTERM", () => {
  register.gracefulShutdown();
});