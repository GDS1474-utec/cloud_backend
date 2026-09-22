const Joi = require("joi");
const ApiError = require("../utils/ApiError");

const pedidoIdParamSchema = Joi.object({
  pedidoId: Joi.number().integer().positive().required(),
});

/**
 * Middleware factory: valida req.params contra un schema de Joi.
 * Si falla, arma un ApiError 400 con el detalle legible del primer error.
 */
function validarParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, { abortEarly: true });
    if (error) {
      return next(ApiError.badRequest(error.details[0].message));
    }
    req.params = value;
    next();
  };
}

module.exports = { pedidoIdParamSchema, validarParams };
