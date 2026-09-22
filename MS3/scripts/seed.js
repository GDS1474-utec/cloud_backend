require('dotenv').config();
const mongoose = require('mongoose');
const Mesa = require('../src/models/Mesa');
const Reserva = require('../src/models/Reserva');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27018/ms3_reservas_db';

const mesas = [
  { numero: 1, capacidad: 2, ubicacion: 'interior', descripcion: 'Mesa pequeña junto a la ventana' },
  { numero: 2, capacidad: 2, ubicacion: 'interior' },
  { numero: 3, capacidad: 4, ubicacion: 'interior' },
  { numero: 4, capacidad: 4, ubicacion: 'interior' },
  { numero: 5, capacidad: 4, ubicacion: 'terraza' },
  { numero: 6, capacidad: 4, ubicacion: 'terraza' },
  { numero: 7, capacidad: 6, ubicacion: 'interior' },
  { numero: 8, capacidad: 6, ubicacion: 'terraza' },
  { numero: 9, capacidad: 8, ubicacion: 'privado' },
  { numero: 10, capacidad: 8, ubicacion: 'privado' },
  { numero: 11, capacidad: 2, ubicacion: 'barra' },
  { numero: 12, capacidad: 2, ubicacion: 'barra', estado: 'fuera_servicio' }
];

const fechas = [
  '2026-09-11',
  '2026-09-12',
  '2026-09-13',
  '2026-09-14',
  '2026-09-15',
  '2026-09-16',
  '2026-09-17',
  '2026-09-18',
  '2026-09-19',
  '2026-09-20'
];
const horas = ['12:30', '14:00', '19:00', '20:30', '22:00'];

async function seed() {
  await mongoose.connect(mongoUri);

  await Reserva.deleteMany({});
  await Mesa.deleteMany({});

  const mesasCreadas = await Mesa.insertMany(mesas);
  const disponibles = mesasCreadas.filter((mesa) => mesa.estado !== 'fuera_servicio');

  const reservas = [];
  let counter = 0;

  for (const fecha of fechas) {
    for (let i = 0; i < 3; i += 1) {
      const mesa = disponibles[(counter * 2 + i) % disponibles.length];
      const clienteId = (counter % 3) + 1;
      const cantidad = Math.min(mesa.capacidad, 2 + (counter % Math.max(mesa.capacidad - 1, 1)));

      reservas.push({
        cliente_id: clienteId,
        mesa_id: mesa._id,
        fecha,
        hora: horas[(counter + i) % horas.length],
        duracion_minutos: 90,
        cantidad_personas: cantidad,
        estado: counter % 11 === 0 ? 'cancelada' : 'confirmada',
        observaciones: counter % 4 === 0 ? 'Reserva de prueba' : ''
      });

      counter += 1;
    }
  }

  await Reserva.insertMany(reservas);

  console.log(`Seed completo: ${mesasCreadas.length} mesas y ${reservas.length} reservas.`);
  console.log('Los cliente_id usados son 1, 2 y 3, presentes en el init.sql de MS1.');

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
