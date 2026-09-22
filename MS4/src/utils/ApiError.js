/**
 * Error de aplicacion con un status HTTP asociado, para que el middleware
 * de errores sepa que codigo devolver sin tener que adivinar.
 */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static notFound(message) {
    return new ApiError(404, message);
  }

  static badGateway(message) {
    return new ApiError(502, message);
  }

  static serviceUnavailable(message) {
    return new ApiError(503, message);
  }
}

module.exports = ApiError;
