const { join } = require('path');

/**
 * Puppeteer config for Render deployment.
 * Render's free tier uses Linux — this tells Puppeteer where to find Chrome.
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
