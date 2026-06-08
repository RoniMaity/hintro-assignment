import { ZodSchema, ZodError } from 'zod';
import { ApiError } from './withApi';
import { NextRequest } from 'next/server';

export async function parseJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError('Invalid JSON body', 400);
  }
}

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const zodErr = error as ZodError<T>;
      const messages = zodErr.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ApiError(`Validation failed: ${messages}`, 422);
    }
    throw new ApiError('Invalid request body', 400);
  }
}

