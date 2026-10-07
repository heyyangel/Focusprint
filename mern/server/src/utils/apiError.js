class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  static badRequest(msg) { return new ApiError(400, msg); }
  static unauthorized(msg = 'Not authenticated.') { return new ApiError(401, msg); }
  static forbidden(msg = 'You do not have permission to perform this action.') { return new ApiError(403, msg); }
  static notFound(msg = 'Not found.') { return new ApiError(404, msg); }
}

/** Wraps an async route handler so rejected promises reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ApiError, asyncHandler };
