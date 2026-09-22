const ApiError = require("../utils/ApiError");

/**
 * Middleware de errores centralizado. Cualquier error pasado a next(err)
 * en controllers/services termina aca. Si es un ApiError conocido, usamos
 * su status; si es un error inesperado, devolvemos 500 sin filtrar detalles
 * internos al cliente.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ApiError) {
    console.error(`[${err.status}] ${req.method} ${req.originalUrl} -> ${err.message}`);
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  console.error(`[500] ${req.method} ${req.originalUrl} ->`, err);
  return res.status(500).json({ error: "Error interno en MS4" });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
