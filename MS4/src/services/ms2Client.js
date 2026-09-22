const axios = require("axios");
const config = require("../config/env");
const ApiError = require("../utils/ApiError");

const http = axios.create({
  baseURL: config.ms2BaseUrl,
  timeout: config.httpTimeoutMs,
});

function traducirError(err, contexto) {
  if (err.response) {
    const detail = err.response.data?.message || `Error de MS2 (${contexto})`;
    return ApiError.badGateway(`MS2 respondio con error en ${contexto}: ${detail}`);
  }
  return ApiError.serviceUnavailable(`MS2 no disponible (${contexto}): ${err.message}`);
}

/**
 * POST /api/v1/platos/precios - trae precio y disponibilidad en lote.
 * Devuelve { encontrados: [{id, nombre, precio, disponible}], noEncontrados: [ids] }
 */
async function obtenerPrecios(platoIds) {
  if (platoIds.length === 0) {
    return { encontrados: [], noEncontrados: [] };
  }
  try {
    const { data } = await http.post("/api/v1/platos/precios", { ids: platoIds });
    return data;
  } catch (err) {
    throw traducirError(err, "obtenerPrecios");
  }
}

module.exports = { obtenerPrecios };
