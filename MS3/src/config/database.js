const mongoose = require('mongoose');

async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27018/ms3_reservas_db';
  await mongoose.connect(mongoUri);
  console.log('MongoDB conectado correctamente');
}

function databaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = {
  connectDatabase,
  databaseStatus
};
