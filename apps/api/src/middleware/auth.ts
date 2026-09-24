import type { RequestHandler } from 'express';
import { ApiError } from '../errors';
import type { AuthUser, AuthVerifier } from '../services/types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? '');
  return match?.[1]?.trim() || null;
}

/** Requires a valid Supabase access token; sets req.user. */
export function requireAuth(auth: AuthVerifier): RequestHandler {
  return async (req, _res, next) => {
    const token = bearerToken(req.headers.authorization);
    if (!token) throw new ApiError('UNAUTHORIZED', 'Sign in to do that.');
    const user = await auth.verifyToken(token);
    if (!user) throw new ApiError('UNAUTHORIZED', 'Your session has expired. Sign in again.');
    req.user = user;
    next();
  };
}

/** Sets req.user when a valid token is present; never rejects. */
export function optionalAuth(auth: AuthVerifier): RequestHandler {
  return async (req, _res, next) => {
    const token = bearerToken(req.headers.authorization);
    if (token) req.user = (await auth.verifyToken(token)) ?? undefined;
    next();
  };
}
