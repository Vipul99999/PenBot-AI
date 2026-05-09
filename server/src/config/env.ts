import dotenv from 'dotenv';
dotenv.config();

function resolveAiServiceUrl() {
  const configuredUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const isDockerRuntime = process.env.DOCKER_ENV === 'true';

  if (!isDockerRuntime && configuredUrl.includes('://ai-service')) {
    return configuredUrl.replace('://ai-service', '://localhost');
  }

  return configuredUrl;
}

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET || 'change_me';
  if (process.env.NODE_ENV === 'production' && secret === 'change_me') {
    throw new Error('JWT_SECRET must be set to a strong unique value in production.');
  }
  return secret;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/penbot',
  jwtSecret: resolveJwtSecret(),
  aiServiceUrl: resolveAiServiceUrl(),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};
