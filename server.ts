import 'dotenv/config';
import { createApp, PORT, CreateAppOptions } from './src/server/app';
import {
  GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
  extractSearchGroundingSources,
  ResearchLruCache,
  withRetry,
} from './src/server/gemini';
import {
  AuthenticatedRequest,
  createRateLimiter,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  TokenVerifier,
} from './src/server/middleware';

export {
  createApp,
  PORT,
  GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
  extractSearchGroundingSources,
  ResearchLruCache,
  withRetry,
  createRateLimiter,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
};
export type { CreateAppOptions, AuthenticatedRequest, TokenVerifier };

async function startServer(): Promise<void> {
  const app = await createApp();

  if (process.env.NODE_ENV !== 'production') {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = (await import(vitePkg)) as typeof import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gatherly AI server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  startServer().catch((err) => {
    console.error('Failed to start Gatherly AI server:', err);
    process.exit(1);
  });
}
