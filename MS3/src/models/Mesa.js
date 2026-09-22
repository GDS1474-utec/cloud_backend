const mongoose = require('mongoose');

const mesaSchema = new mongoose.Schema(
  {
    numero: {
      type: Number,
      required: true,
      unique: true,
      min: 1
    },
    capacidad: {
      type: Number,
      required: true,
      min: 1,
      max: 20
    },
    ubicacion: {
      type: String,
      enum: ['interior', 'terraza', 'barra', 'privado'],
      default: 'interior'
    },
    estado: {
      type: String,
      enum: ['disponible', 'fuera_servicio'],
      default: 'disponible'
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

mesaSchema.index({ capacidad: 1, estado: 1 });

module.exports = mongoose.model('Mesa', mesaSchema);
