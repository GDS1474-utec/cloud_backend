require('dotenv').config();
const app = require('./app');
const { connectDatabase } = require('./config/database');

const PORT = Number(process.env.PORT || 8003);

async function start() {
  try {
    await connectDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`MS3 escuchando en http://0.0.0.0:${PORT}`);
      console.log(`Swagger UI: http://localhost:${PORT}/docs`);
    });
  } catch (error) {
    console.error('No se pudo iniciar MS3:', error);
    process.exit(1);
  }
}

start();
