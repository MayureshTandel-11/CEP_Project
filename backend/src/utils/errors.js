class AppError extends Error {
  constructor(message, {
    errorCode = 'BAD_REQUEST',
    statusCode = 400,
    details = {},
  } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, { errorCode: 'VALIDATION_ERROR', statusCode: 422, details });
  }
}

class AuthError extends AppError {
  constructor(message, errorCode = 'UNAUTHORIZED') {
    super(message, { errorCode, statusCode: 401 });
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource.') {
    super(message, { errorCode: 'FORBIDDEN', statusCode: 403 });
  }
}

class NotFoundError extends AppError {
  constructor(message, errorCode = 'NOT_FOUND') {
    super(message, { errorCode, statusCode: 404 });
  }
}

class ConflictError extends AppError {
  constructor(message, errorCode = 'CONFLICT') {
    super(message, { errorCode, statusCode: 409 });
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
