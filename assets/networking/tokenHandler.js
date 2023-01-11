const axios = require('axios');

// Loading custom modules
const Logger = require('../utils/logger');

const logger = new Logger("register/module/tokenHandler");

const tokenHandler = (req, res, next) => {
  const app_id = req.headers['application-id'];
  const app_token = req.headers['application-token'];

  logger.info(`Received request from ${app_id}`);

  if (!app_id) { res.status(401).json({ message: 'No application id provided' }); return;}
  if (!app_token) { res.status(401).json({ message: 'No application token provided' }); return;}


  // axios post
  axios.post('http://localhost:3000/token/validate', {
    indentifier: app_id,
    token: app_token
  }).then(response => {
    logger.log(`Validation for ${app_id} was ${response.data.valid}`);
    next();
  }).catch(error => {
    logger.error(JSON.stringify(error));
    res.status(401).json({ message: 'Invalid token' });
  });
};

module.exports = tokenHandler;