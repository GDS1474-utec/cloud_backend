const axios = require('axios');

function getBaseUrl() {
  return (process.env.MS1_URL || 'http://localhost:8000').replace(/\/$/, '');
}

function getTimeout() {
  const timeout = Number(process.env.MS1_TIMEOUT_MS || 3000);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : 3000;
}

async function obtenerCliente(clienteId) {
  try {
    const response = await axios.get(`${getBaseUrl()}/clientes/${clienteId}`, {
      timeout: getTimeout()
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    const dependencyError = new Error('No se pudo validar el cliente en MS1');
    dependencyError.statusCode = 503;
    dependencyError.details = error.code || error.message;
    throw dependencyError;
  }
}

module.exports = {
  obtenerCliente,
  getBaseUrl
};
