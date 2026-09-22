const comandaService = require("../services/comandaService");

async function obtenerComanda(req, res, next) {
  try {
    const { pedidoId } = req.params;
    const comanda = await comandaService.generarComanda(pedidoId);
    res.json(comanda);
  } catch (err) {
    next(err);
  }
}

module.exports = { obtenerComanda };
