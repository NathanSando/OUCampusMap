import type { ApiErrorBody, ApiErrorCode } from '@ou-campus-map/shared-types';
import type { ErrorRequestHandler, RequestHandler } from 'express';

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  RATE_LIMITED: 429,
  AI_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }

  get status(): number {
    return STATUS[this.code];
  }
}

export function errorBody(code: ApiErrorCode, message: string): ApiErrorBody {
  return { error: { code, message } };
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(errorBody('NOT_FOUND', 'No such endpoint.'));
};

/** Every error leaves the API in the same shape (design doc §7.4). */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json(errorBody(err.code, err.message));
    return;
  }
  // Malformed JSON bodies from express.json()
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json(errorBody('VALIDATION_ERROR', 'Request body is not valid JSON.'));
    return;
  }
  console.error(err);
  res.status(500).json(errorBody('INTERNAL_ERROR', 'Something went wrong on our end.'));
};
