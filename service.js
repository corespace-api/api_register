const express = require("express");
const dotenv = require("dotenv");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path")

const Logger = require("./assets/utils/logger");
const ServiceManager = require("./assets/utils/serviceManager");
const { DBConnector } = require("./assets/database/DBManager");
const getAllRoutes = require('./assets/utils/getAllRoutes');
const allowedHeader = require('./assets/networking/allowedHeader');
const fingerprintMiddleware = require('./assets/middleware/mdFingerprint');

class Service {
  constructor(service) {
    this.server = express();
    this.service = service;
    this.router = express.Router();
    this.logger = new Logger("Register/Service");
    this.dbc = new DBConnector();
    this.timer = 10000;
    this.config = {}
  }

  loadConfig() {
    const serviceConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json")));
    dotenv.config();

    // Load configuration
    this.config.PORT = process.env.PORT || 3000;
    this.config.ROUTES_PATH = path.join(__dirname, `routes`);
    this.config.allowDebug = serviceConfig["DEBUG"] || process.env.ALLOW_DEBUG || false;
    this.config.ALLOWED_AGENDS = serviceConfig["ALLOWED_AGENDS"] || process.env.ALLOWED_AGENDS || [];
  }

  dbConnection() {
    // Starting connection to the database
    this.dbc.createAUrl();
    this.logger.log(`Starting connection to the database...`);
    this.logger.log(`Database URL: ${this.dbc.url}`);
    this.dbc.attemptConnection()
      .then(() => {
        this.logger.success("Database connection succeeded");
      })
      .catch((error) => {
        this.logger.warn("Database connection failed, retrying in 5 seconds...");
        this.logger.error(error);
        setTimeout(() => {
          this.logger.log("Retrying database connection...");
          this.dbConnection();
        }, 5000);
      });
  }

  manage() {
    this.serviceManager = new ServiceManager(this.service, 10000, true);
    this.serviceManager.registerService();
    this.serviceManager.listenForKillSignal();
  }

  checkOrigin() {
    this.logger.info(`The current debug mode is: ${this.config.allowDebug}`)

    this.server.use((req, res, next) => {
      const userAgent = req.headers["user-agent"];
      if (this.config.allowDebug) { next(); return; }
      const userAgentFirstPart = userAgent.split("/")[0];

      if (this.config.ALLOWED_AGENDS.includes(userAgentFirstPart)) {
        next();
      } else {
        this.logger.warn(`User-Agent not allowed: ${userAgent}`);
        res.status(403).json({
          status: "error",
          code: 403,
          message: "Access denied",
        });
      }
    });
  }

  refreshStatus() {
    setInterval(() => {
      this.serviceManager.setServiceStatus("active")
      .catch((error) => {
        this.logger.error(error);
      });
    }, this.timer);
  }

  gracefulShutdown() {
    this.logger.log("Gracefully shutting down the service...");
    this.dbc.closeConnection();
    this.serviceManager.unregisterService().then(() => {
      this.logger.success("Service shutdown complete");
      process.exit(1);
    }).catch((error) => {
      this.logger.error(error);
      process.exit(1);
    });
  }

  loadMiddleware() {
    this.server.use(express.json());
    this.server.use(express.urlencoded({ extended: true }));
    // this.server.use(cors(allowedHeader));
    this.server.use(fingerprintMiddleware);
    this.server.disable('x-powered-by');
  }

  logRequests() {
    this.server.use((req, res, next) => {
      const headers = req.headers;
      const reqMessage = `Request: ${req.method} ${req.originalUrl} + ${JSON.stringify(headers)}`;
      this.logger.request(reqMessage);
      next();
    });
  }

  loadRoutes() {
    const apiRoutes = getAllRoutes(this.config.ROUTES_PATH);
    const apiRouteKeys = Object.keys(apiRoutes)

    this.logger.info(`Found ${apiRouteKeys.length} routes`);
    this.logger.log("Beginnig to load routes...");

    apiRoutes.forEach(route => {
      this.logger.log(`Loading route: ${route}`);
    
      const routePath = path.join(this.config.ROUTES_PATH, route);
      const routeName = route.replace('.js', '');
    
      // load route classes
      const routeHandler = require(routePath);
      const routeInstance = new routeHandler(this.dbc);
    
      // load route methods
      routeInstance.load();
    
      // add route to service
      this.server.use(`/${routeName}`, routeInstance.router);
    });
    
    this.logger.success("Routes loading complete!");
  }

  listen() {
    this.server.listen(this.config.PORT || 3000, () => {
      this.logger.log(`Running on port ${this.config.PORT}`);
    });
  }
}

const service = new Service({
  type: "Register",
  name: "Register",
  uuid: crypto.randomBytes(16).toString("hex"),
  version: "1.0.0",
  description: "Register service for the microservice architecture",
});

service.loadConfig();
service.dbConnection();
service.loadMiddleware();
service.checkOrigin();
service.logRequests();
service.loadRoutes();
service.listen();

service.manage();
service.refreshStatus();

// listen for process termination
process.on("SIGINT", () => {
  service.gracefulShutdown();
});

process.on("SIGTERM", () => {
  service.gracefulShutdown();
});