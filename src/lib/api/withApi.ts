import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export interface ApiResponse<T = unknown> {
  success: boolean;
  traceId: string;
  data: T | null;
  error: { code: string; message: string } | null;
}

type RouteHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  traceId: string
) => Promise<NextResponse | { data: unknown; status?: number }>;

function formatLog(traceId: string, method: string, path: string, status: number): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${traceId}] [${method}] [${path}] [${status}]`;
}

export function withApi(handler: RouteHandler) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const traceId = uuidv4();
    const method = req.method;
    const path = new URL(req.url).pathname;

    try {
      const result = await handler(req, context, traceId);

      if (result instanceof NextResponse) {
        console.log(formatLog(traceId, method, path, result.status));
        return result;
      }

      const status = result.status || 200;
      const response: ApiResponse = {
        success: true,
        traceId,
        data: result.data,
        error: null,
      };

      console.log(formatLog(traceId, method, path, status));
      return NextResponse.json(response, { status });
    } catch (error) {
      const statusCode = error instanceof ApiError ? error.statusCode : 500;
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      const code = error instanceof ApiError && error.code ? error.code : statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'VALIDATION_ERROR';

      const response: ApiResponse = {
        success: false,
        traceId,
        data: null,
        error: {
          code,
          message
        },
      };

      console.error(formatLog(traceId, method, path, statusCode));
      console.error(`[${traceId}] Error:`, error);
      return NextResponse.json(response, { status: statusCode });
    }
  };
}

export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}
