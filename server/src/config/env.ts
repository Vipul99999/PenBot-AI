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

export const env = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/penbot',
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  aiServiceUrl: resolveAiServiceUrl(),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};
