const express = require("express");
const { obtenerComanda } = require("../controllers/comandaController");
const { pedidoIdParamSchema, validarParams } = require("../middlewares/validate");

const router = express.Router();

/**
 * @openapi
 * /comandas/{pedidoId}:
 *   get:
 *     summary: Generar la comanda/cuenta de un pedido
 *     description: >
 *       Combina MS1 (Clientes y Pedidos) y MS2 (Menu y Platos): valida el
 *       pedido y su cliente, trae el detalle de platos pedidos, consulta
 *       precios y disponibilidad en MS2, y devuelve la cuenta armada con
 *       el total calculado.
 *     tags: [Comandas]
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Id del pedido en MS1
 *     responses:
 *       200:
 *         description: Comanda generada correctamente
 *       400:
 *         description: pedidoId invalido, o el pedido no tiene items
 *       404:
 *         description: Pedido no encontrado en MS1
 *       502:
 *         description: MS1 o MS2 respondieron con error inesperado
 *       503:
 *         description: MS1 o MS2 no estan disponibles
 */
router.get("/:pedidoId", validarParams(pedidoIdParamSchema), obtenerComanda);

module.exports = router;
