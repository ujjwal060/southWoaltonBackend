const dotenv = require('dotenv');
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');

dotenv.config();

const ENV = process.env.NODE_ENV || 'development';
const REGION = process.env.AWS_REGION || 'us-east-1';
const SECRET_NAME = 'swe-secrets';

const secretsManager = new SecretsManagerClient({ region: REGION });

let secretsCache = null;

async function fetchSecretsFromAWS() {
  try {
    const command = new GetSecretValueCommand({
      SecretId: SECRET_NAME,
    });

    const response = await secretsManager.send(command);

    if (response.SecretString) {
      return JSON.parse(response.SecretString);
    } else {
      console.error('SecretString not found in response:', response);
      return {};
    }
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
