const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const config = require("./config/env");
const swaggerSpec = require("./config/swagger");
const comandaRoutes = require("./routes/comandaRoutes");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");

function crearApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan(process.env.NODE_ENV === "test" ? "silent" : "dev"));

  app.get("/", (req, res) => {
    res.json({
      servicio: "MS4 - Comanda/Facturacion",
      estado: "activo",
      dependeDe: { ms1: config.ms1BaseUrl, ms2: config.ms2BaseUrl },
      documentacion: "/docs",
    });
  });

  app.get("/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  app.use("/comandas", comandaRoutes);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = crearApp;
