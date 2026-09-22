function notFoundHandler(req, res) {
  res.status(404).json({
    detail: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      detail: 'Datos inválidos',
      errores: Object.values(err.errors).map((item) => item.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ detail: 'Identificador inválido' });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      detail: 'Registro duplicado',
      campo: Object.keys(err.keyPattern || {})[0] || 'desconocido'
    });
  }

  const statusCode = err.statusCode || 500;
  const response = {
    detail: err.message || 'Error interno del servidor'
  };

  if (err.details) response.details = err.details;

  if (statusCode >= 500) {
    console.error(err);
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
