const ms1Client = require("./ms1Client");
const ms2Client = require("./ms2Client");
const ApiError = require("../utils/ApiError");

/**
 * Arma la comanda/cuenta de un pedido combinando:
 *   1) MS1 GET /pedidos/{id}          -> valida pedido + trae cliente
 *   2) MS1 GET /pedidos/{id}/detalle  -> platos pedidos (plato_id + cantidad)
 *   3) MS2 POST /platos/precios       -> precio y disponibilidad real de cada plato
 *
 * Las 3 llamadas de lectura (pedido + detalle) se disparan en paralelo para
 * no esperar una tras otra innecesariamente.
 */
async function generarComanda(pedidoId) {
  const [pedido, detalles] = await Promise.all([
    ms1Client.obtenerPedido(pedidoId),
    ms1Client.obtenerDetallePedido(pedidoId),
  ]);

  if (detalles.length === 0) {
    throw ApiError.badRequest(
      `El pedido ${pedidoId} existe pero no tiene items registrados en pedido_detalle`
    );
  }

  const platoIds = detalles.map((d) => d.plato_id);
  const { encontrados, noEncontrados } = await ms2Client.obtenerPrecios(platoIds);
  const precioPorId = new Map(encontrados.map((p) => [p.id, p]));

  const lineas = [];
  const platosNoDisponibles = [];
  let total = 0;

  for (const item of detalles) {
    const plato = precioPorId.get(item.plato_id);
    if (!plato) continue; // ya viene reportado en noEncontrados

    if (!plato.disponible) {
      platosNoDisponibles.push({ platoId: plato.id, nombre: plato.nombre });
    }

    const subtotal = Number(plato.precio) * item.cantidad;
    total += subtotal;

    lineas.push({
      platoId: plato.id,
      nombre: plato.nombre,
      precioUnitario: Number(plato.precio),
      cantidad: item.cantidad,
      notas: item.notas || null,
      subtotal: Number(subtotal.toFixed(2)),
      disponible: plato.disponible,
    });
  }

  return {
    pedidoId: pedido.id,
    fechaPedido: pedido.fecha_pedido,
    estadoPedido: pedido.estado,
    cliente: {
      id: pedido.cliente_id,
      nombre: pedido.cliente_nombre,
      email: pedido.cliente_email,
    },
    lineas,
    total: Number(total.toFixed(2)),
    advertencias: {
      platosNoEncontradosEnMenu: noEncontrados.length ? noEncontrados : undefined,
      platosNoDisponibles: platosNoDisponibles.length ? platosNoDisponibles : undefined,
    },
  };
}

module.exports = { generarComanda };
