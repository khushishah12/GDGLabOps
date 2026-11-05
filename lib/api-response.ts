import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';

export interface ApiResponsePayload<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  message?: string;
  statusCode: number;
}

export function apiSuccess<T>(data: T, message?: string, statusCode = 200) {
  const payload: ApiResponsePayload<T> = {
    success: true,
    data,
    message,
    statusCode,
  };
  return NextResponse.json(payload, { status: statusCode });
}

export function apiError(err: unknown) {
  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formatted = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));

    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: formatted,
        statusCode: 400,
      },
      { status: 400 }
    );
  }

  // Handle Domain App Errors
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        details: err.details,
        statusCode: err.statusCode,
      },
      { status: err.statusCode }
    );
  }

  // Handle Prisma / Database Constraint Errors
  const errorObj = err as any;
  if (errorObj?.code === 'P2002') {
    const target = errorObj?.meta?.target ? `Duplicate value for ${errorObj.meta.target}` : 'Unique constraint violation';
    return NextResponse.json(
      {
        success: false,
        error: 'Resource already exists',
        details: target,
        statusCode: 409,
      },
      { status: 409 }
    );
  }

  if (errorObj?.code === 'P2025') {
    return NextResponse.json(
      {
        success: false,
        error: 'Requested record does not exist or was deleted',
        statusCode: 404,
      },
      { status: 404 }
    );
  }

  // Sanitize internal server errors (No raw stack traces or DB credentials in response)
  const isDev = process.env.NODE_ENV === 'development';
  console.error('[GDG LabOps API Error]:', err);

  return NextResponse.json(
    {
      success: false,
      error: 'An internal server error occurred',
      details: isDev && err instanceof Error ? err.message : undefined,
      statusCode: 500,
    },
    { status: 500 }
  );
}
