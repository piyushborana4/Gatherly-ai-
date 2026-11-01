import crypto from 'crypto';
import express, { Express, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { getDefaultGeminiClient, ResearchLruCache } from './gemini';
import {
  AuthenticatedRequest,
  createAuthMiddleware,
  createRateLimiter,
  getDefaultTokenVerifier,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  TokenVerifier,
} from './middleware';
import { registerApiRoutes } from './routes';

export const PORT =
  process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 8080 : 3000;

export interface CreateAppOptions {
  verifyToken?: TokenVerifier;
  getGemini?: () => GoogleGenAI;
  enableViteMiddleware?: boolean;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
}

export async function createApp(options: CreateAppOptions = {}): Promise<Express> {
  const app = express();
  app.set('trust proxy', 1);

  const verifyToken = options.verifyToken ?? getDefaultTokenVerifier();
  const getGemini = options.getGemini ?? getDefaultGeminiClient;

  app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/.netlify/functions/api')) {
      req.url = req.url.replace('/.netlify/functions/api', '/api') || '/api';
    }
    const requestId = crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  app.use(
    helmet({
      frameguard: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://apis.google.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: [
            "'self'",
            'ws:',
            'wss:',
            'https://*.googleapis.com',
            'https://*.firebaseio.com',
            'https://identitytoolkit.googleapis.com',
            'https://securetoken.googleapis.com',
            'https://*.run.app',
            'https://*.netlify.app',
          ],
          frameSrc: ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com'],
          frameAncestors: [
            "'self'",
            'https://*.google.com',
            'https://*.googleusercontent.com',
            'https://*.run.app',
            'https://*.netlify.app',
            '*',
          ],
          objectSrc: ["'none'"],
        },
      },
    })
  );

  const allowedOrigins = [
    process.env.APP_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
  ].filter((u): u is string => Boolean(u && u !== 'MY_APP_URL'));

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    })
  );

  app.use(express.json({ limit: '256kb' }));

  const requireFirebaseAuth = createAuthMiddleware(verifyToken);
  const aiRateLimiter = createRateLimiter(
    new Map(),
    options.rateLimitMax ?? RATE_LIMIT_MAX_REQUESTS,
    options.rateLimitWindowMs ?? RATE_LIMIT_WINDOW_MS
  );
  const researchCache = new ResearchLruCache(50, 10 * 60 * 1000);

  registerApiRoutes(app, {
    requireFirebaseAuth,
    aiRateLimiter,
    getGemini,
    researchCache,
  });

  const isTestOrServerless =
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.VITEST) ||
    Boolean(process.env.NETLIFY) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  const shouldMountStatic = options.enableViteMiddleware ?? !isTestOrServerless;
  if (shouldMountStatic && process.env.NODE_ENV === 'production') {
    const rootDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(rootDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(rootDir, 'index.html'));
    });
  }

  return app;
}
