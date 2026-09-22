const swaggerJsdoc = require("swagger-jsdoc");
const config = require("./env");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MS4 - Comanda/Facturacion",
      version: "2.0.0",
      description:
        "Microservicio sin base de datos propia. Orquesta MS1 (Clientes y Pedidos) " +
        "y MS2 (Menu y Platos) para armar la cuenta de un pedido.",
    },
    servers: [{ url: config.publicApiUrl }],
  },
  apis: [`${__dirname}/../routes/*.js`],
};

module.exports = swaggerJsdoc(options);
