/**
 * Custom Error Classes
 * 
 * Provides structured error handling with custom error types.
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, message, statusCode = 502) {
    super(`External service error (${service}): ${message}`, statusCode, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

export class PhantomBusterError extends ExternalServiceError {
  constructor(message, statusCode = 502, code = 'PB_API_ERROR') {
    super('PhantomBuster', message, statusCode);
    this.code = code;
  }
}

export class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(`Database error: ${message}`, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Error handler middleware helper
 */
export function handleError(error, req, res, next) {
  // Log error
  console.error('Error:', error);

  // If it's one of our custom errors, use its properties
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      ...(error.field && { field: error.field }),
      ...(error.service && { service: error.service })
    });
  }

  // Default error response
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
}
