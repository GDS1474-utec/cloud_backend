const axios = require("axios");
const config = require("../config/env");
const ApiError = require("../utils/ApiError");

const http = axios.create({
  baseURL: config.ms1BaseUrl,
  timeout: config.httpTimeoutMs,
});

/**
 * Traduce cualquier error de axios contra MS1 a un ApiError consistente:
 * - Si MS1 respondio (con error), propagamos su status (404 tal cual, el
 *   resto de 4xx/5xx de MS1 los mapeamos a 502 porque para quien llama a
 *   MS4, la falla real es "MS4 no pudo completar la orquestacion").
 * - Si no hubo respuesta (timeout, conexion rechazada, DNS, etc.), es que
 *   MS1 no esta disponible -> 503.
 */
function traducirError(err, contexto) {
  if (err.response) {
    const status = err.response.status;
    const detail = err.response.data?.detail || `Error de MS1 (${contexto})`;
    if (status === 404) return ApiError.notFound(detail);
    return ApiError.badGateway(`MS1 respondio con error en ${contexto}: ${detail}`);
  }
  return ApiError.serviceUnavailable(`MS1 no disponible (${contexto}): ${err.message}`);
}

/** GET /pedidos/{id} - valida que el pedido exista y trae datos del cliente */
async function obtenerPedido(pedidoId) {
  try {
    const { data } = await http.get(`/pedidos/${pedidoId}`);
    return data;
  } catch (err) {
    throw traducirError(err, "obtenerPedido");
  }
}

/** GET /pedidos/{id}/detalle - trae los items (plato_id + cantidad) del pedido */
async function obtenerDetallePedido(pedidoId) {
  try {
    const { data } = await http.get(`/pedidos/${pedidoId}/detalle`);
    return data.detalles || [];
  } catch (err) {
    throw traducirError(err, "obtenerDetallePedido");
  }
}

/** GET /clientes/{id} - opcional, por si se necesita mas info del cliente */
async function obtenerCliente(clienteId) {
  try {
    const { data } = await http.get(`/clientes/${clienteId}`);
    return data;
  } catch (err) {
    throw traducirError(err, "obtenerCliente");
  }
}

module.exports = { obtenerPedido, obtenerDetallePedido, obtenerCliente };
