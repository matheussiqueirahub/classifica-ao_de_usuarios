class AppError extends Error {
  constructor({
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details = null,
    expose = false
  }) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = expose;
  }
}

function isAppError(error) {
  return error instanceof AppError;
}

export { AppError, isAppError };
