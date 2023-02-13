const dotenv = require("dotenv");
const crypto = require("crypto");
const express = require("express");
const path = require("path")

const Logger = require("./assets/utils/logger");
const { DBConnector } = require("./assets/database/DBManager");
const ServiceManager = require("./assets/utils/serviceManager");

class Service {
  constructor(service) {
    this.router = express.Router();
    this.logger = new Logger("Register/Service");
    this.service = service;
    this.dbc = new DBConnector();
    this.timer = 10000;
  }

  loadConfig() {
    dotenv.config();

    // Load configuration
    const PORT = process.env.PORT || 3000;
    const ROUTES_PATH = path.join(__dirname, `routes`);
    const allowDebug = process.env.ALLOW_DEBUG || false;
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
        this.logger.log("Database connection failed");
        this.logger.error(error);
      });
  }

  manage() {
    this.serviceManager = new ServiceManager(this.service, 10000, true);
    this.serviceManager.registerService();
    this.serviceManager.listenForKillSignal();
    this.serviceManager.checkForServiceRemoval();
  }

  async refreshStatus() {
    setInterval(() => {
      this.serviceManager.setServiceStatus("active")
      .catch((error) => {
        this.logger.error(error);
      });
    }, this.timer);
  }

  async gracefulShutdown() {
    this.logger.log("Gracefully shutting down the service...");
    this.dbc.closeConnection();
    this.serviceManager.unregisterService().then(() => {
      this.logger.log("Service unregistered");
      process.exit(0);
    }).catch((error) => {
      this.logger.error(error);
      process.exit(1);
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
service.manage();
service.refreshStatus();


// listen for process termination
process.on("SIGINT", async () => {
  service.gracefulShutdown();
});