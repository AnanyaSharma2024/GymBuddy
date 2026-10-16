// A typed application error. Controllers/services throw these; the central
// error middleware knows how to translate them into safe HTTP responses
// without ever leaking stack traces or internal details to the client.
class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.isApiError = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, errors) { return new ApiError(400, msg, errors); }
  static unauthorized(msg = 'Unauthorized') { return new ApiError(401, msg); }
  static forbidden(msg = 'Forbidden') { return new ApiError(403, msg); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg = 'Conflict') { return new ApiError(409, msg); }
  static unprocessable(msg = 'Unprocessable entity', errors) { return new ApiError(422, msg, errors); }
  static tooMany(msg = 'Too many requests') { return new ApiError(429, msg); }
  static internal(msg = 'Internal server error') { return new ApiError(500, msg); }
}

module.exports = ApiError;
