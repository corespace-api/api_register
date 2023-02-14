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
      // get id from url
      const id = req.query.id;

      // TODO: check if id is valid
    });
  }

  load() {
    this.rootRoute();
  }
}

module.exports = Health;