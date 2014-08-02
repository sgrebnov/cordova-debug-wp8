var config = require('./Aardwolf/config/config.defaults.js');

/* Hostname or IP of the local machine */
config.serverHost = '10.0.8.254';

/* port on which the server listens for requests */
config.serverPort = '8000';
/* Port on which files will be served */
config.fileServerPort = 8500;

module.exports = config;