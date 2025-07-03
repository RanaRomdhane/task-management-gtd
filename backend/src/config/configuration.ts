import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_DATABASE,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '24h',
  },
  ai: {
    openRouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      apiUrl: process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
      model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
      timeout: parseInt(process.env.OPENROUTER_TIMEOUT || '30000', 10),
    }
  }
}));