const crearApp = require("./app");
const config = require("./config/env");

const app = crearApp();

app.listen(config.port, () => {
  console.log(`MS4 escuchando en el puerto ${config.port}`);
  console.log(`MS1_BASE_URL=${config.ms1BaseUrl}`);
  console.log(`MS2_BASE_URL=${config.ms2BaseUrl}`);
});
