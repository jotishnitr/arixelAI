const fs = require('fs');
const path = require('path');
const { App } = require('octokit');
require('dotenv').config();

let privateKey = process.env.GITHUB_PRIVATE_KEY || process.env.PRIVATE_KEY;

if (!privateKey) {
  const privateKeyPath = path.join(process.cwd(), 'github-private-key.pem');
  if (fs.existsSync(privateKeyPath)) {
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  }
}

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

let githubApp = null;
if (process.env.GITHUB_APP_ID && privateKey) {
  githubApp = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey: privateKey,
  });
}

module.exports = githubApp;
module.exports.githubApp = githubApp;

