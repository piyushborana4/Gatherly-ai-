import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export interface AuthenticatedRequest extends Request {
  authenticatedUid?: string;
  authenticatedEmail?: string;
  requestId?: string;
}

export type TokenVerifier = (token: string) => Promise<{ uid: string; email?: string }>;

export function getDefaultTokenVerifier(): TokenVerifier {
  if (getApps().length === 0) {
    initializeAdminApp({
      projectId: firebaseConfig.projectId,
    });
  }
  const adminAuth = getAdminAuth();
  return async (token: string) => {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
    };
  };
}

export interface RateLimitRecord {
  count: number;
  windowStart: number;
}

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 20;

export function createRateLimiter(
  store: Map<string, RateLimitRecord> = new Map(),
  maxRequests = RATE_LIMIT_MAX_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS
) {
  return function aiRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const now = Date.now();

    if (store.size > 200) {
      for (const [key, entry] of store.entries()) {
        if (now - entry.windowStart > windowMs) {
          store.delete(key);
        }
      }
    }

    const rateKey = req.authenticatedUid
      ? `uid:${req.authenticatedUid}`
      : `ip:${req.ip || req.socket.remoteAddress || 'local'}`;
    const record = store.get(rateKey);

    if (!record || now - record.windowStart > windowMs) {
      store.set(rateKey, { count: 1, windowStart: now });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((record.windowStart + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error:
          'Rate limit reached for AI planning operations. Please wait a moment before sending another request.',
        retryAfterSeconds: retryAfterSec,
        requestId: req.requestId,
      });
      return;
    }

    record.count += 1;
    next();
  };
}

export function createAuthMiddleware(verifyToken: TokenVerifier) {
  return async function requireFirebaseAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required. Please sign in with Google to use AI features.',
        requestId: req.requestId,
      });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({
        error: 'Missing Bearer token.',
        requestId: req.requestId,
      });
      return;
    }

    try {
      const decoded = await verifyToken(token);
      req.authenticatedUid = decoded.uid;
      req.authenticatedEmail = decoded.email;
      next();
    } catch {
      res.status(401).json({
        error: 'Invalid or expired authentication token. Please sign in again.',
        requestId: req.requestId,
      });
    }
  };
}

/**
 * Emits Google Cloud Logging structured JSON with severity, trace, and requestId.
 */
export function logStructuredError(
  req: AuthenticatedRequest,
  endpoint: string,
  error: unknown
): string {
  const requestId = req.requestId || crypto.randomUUID();
  const traceHeader = req.header('x-cloud-trace-context');
  const traceId = traceHeader ? traceHeader.split('/')[0] : requestId;
  const projectId = firebaseConfig.projectId || 'gatherly-ai';

  console.error(
    JSON.stringify({
      severity: 'ERROR',
      'logging.googleapis.com/trace': `projects/${projectId}/traces/${traceId}`,
      requestId,
      endpoint,
      uid: req.authenticatedUid ?? 'anonymous',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
  );
  return requestId;
}
