const serverless = require('serverless-http');
const app = require('../../server');

// Wrap the Express app using serverless-http
exports.handler = serverless(app);
