const dotenv = require('dotenv');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

dotenv.config();

const ENV = process.env.NODE_ENV || 'development';
const SECRET_NAME = 'south-voltana';

const secretsManager = new SecretsManagerClient({
   region: process.env.AWS_REGION || "us-east-1"
});

let secretsCache = null;

async function fetchSecretsFromAWS() {
  try {
    const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
    const response = await secretsManager.send(command);

    const secrets = JSON.parse(response.SecretString);
    console.log(111,secrets);
    return secrets;
  } catch (error) {
    console.error('Error fetching secrets from AWS:', error.message);
    return {};
  }
}

async function getConfig(key) {
  if (ENV === 'development') {
    return process.env[key];
  }

  if (!secretsCache) {
    secretsCache = await fetchSecretsFromAWS();
  }

  return secretsCache[key] || process.env[key];
}

async function getAllConfig() {
  if (ENV === 'development') {
    return process.env;
  }

  if (!secretsCache) {
    secretsCache = await fetchSecretsFromAWS();
  }

  return secretsCache;
}

module.exports = {
  getConfig,
  getAllConfig,
};
