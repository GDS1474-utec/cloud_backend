require("dotenv").config();

/**
 * Configuracion centralizada leida de variables de entorno, con defaults
 * razonables para correr todo en localhost (fuera de Docker) durante desarrollo.
 */
const config = {
  port: Number(process.env.PORT) || 8083,
  publicApiUrl: process.env.PUBLIC_API_URL || "http://localhost:8083",
  ms1BaseUrl: process.env.MS1_BASE_URL || "http://localhost:8000",
  ms2BaseUrl: process.env.MS2_BASE_URL || "http://localhost:8082",
  httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_MS) || 5000,
};

module.exports = config;
