import type { z } from 'zod';
import { ApiError } from '../errors';

/** Parse or throw a VALIDATION_ERROR with the first issue as the message. */
export function parse<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new ApiError('VALIDATION_ERROR', `${where}${issue?.message ?? 'Invalid request.'}`);
  }
  return result.data;
}
