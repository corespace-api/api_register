const express = require('express');
const path = require('path');
const fs = require('fs');

// Loading custom modules
const Logger = require('../assets/utils/logger');

class Health {
  constructor() {
    this.logger = new Logger("register/health");
    this.router = express.Router();
  }

  rootRoute() {
    this.router.get("/", (req, res) => {
      res.status(200).json({
        service: "register",
        healthy: true,
        uptime: process.uptime()
      });
    });
  }

  load() {
    this.rootRoute();
  }
}

module.exports = Health;