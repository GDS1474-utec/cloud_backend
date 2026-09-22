const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema(
  {
    cliente_id: {
      type: Number,
      required: true,
      min: 1,
      index: true
    },
    mesa_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mesa',
      required: true,
      index: true
    },
    fecha: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true
    },
    hora: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/
    },
    duracion_minutos: {
      type: Number,
      min: 30,
      max: 240,
      default: 90
    },
    cantidad_personas: {
      type: Number,
      required: true,
      min: 1,
      max: 20
    },
    estado: {
      type: String,
      enum: ['confirmada', 'cancelada', 'completada'],
      default: 'confirmada',
      index: true
    },
    observaciones: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

reservaSchema.index({ mesa_id: 1, fecha: 1, hora: 1 });
reservaSchema.index({ fecha: 1, estado: 1 });

module.exports = mongoose.model('Reserva', reservaSchema);
