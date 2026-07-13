import dotenv from 'dotenv';

dotenv.config();

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 4000,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4200',
  LESSON_RESOURCES_BUCKET: process.env.LESSON_RESOURCES_BUCKET || 'lesson-resources',
  // Docker lab orchestration
  LAB_HOST: process.env.LAB_HOST || 'localhost',
  DOCKER_SOCKET: process.env.DOCKER_SOCKET || null,
};
