const express = require('express');
const mongoose = require('mongoose');

// Loading custom modules
const Logger = require('../assets/utils/logger');

// Loading models
const userSchema = require('../assets/models/user');

async function nameInUse(username) {
    const user = await userSchema.findOne({ username: username });
    if (!user) { return false; }
    return true;
}

async function checkEmail(email) {
    const user = await userSchema.findOne({ email: email });
    if (!user) { return false; }
    return true;
}

class Health {
  constructor(dbc) {
    this.logger = new Logger("register/register");
    this.router = express.Router();
    this.dbc = dbc;
  }

  rootRoute() {
    this.logger.log("Loading root route...");
    this.router.post("/", async (req, res) => {
        const {username, email, password} = req.body;

        if (!username || !email || !password) {
            res.status(400).json({
                error: "Missing fields",
                message: "Please fill in all the fields",
                fields: ["username", "email", "password"]
            });
            return;
        }

        if (await nameInUse(username)) {
            res.status(400).json({
                error: "Username in use",
                message: "Please choose another Username"
            });
            return;
        }

        if (await checkEmail(email)) {
            res.status(400).json({
                error: "Email in use",
                message: "Please choose another email"
            });
            return;
        }

        const newUser = new userSchema({
            _id: new mongoose.Types.ObjectId(),
            username: username,
            email: email,
            passwordHash: password
        });

        newUser.save()
            .then(() => {
                res.status(200).json({
                    message: "User created successfully",
                    username: username,
                    uuid: newUser._id
                });
            }
        ).catch((error) => {
            res.status(500).json({
                error: "Internal server error",
                message: "Something went wrong"
            });
            this.logger.error(error);
        });
    });
  }

  load() {
    // this.dbConnection();
    this.rootRoute();
  }
}

module.exports = Health;