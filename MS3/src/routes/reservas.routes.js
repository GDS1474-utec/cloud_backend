const express = require('express');
const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const Mesa = require('../models/Mesa');
const asyncHandler = require('../utils/asyncHandler');
const { obtenerCliente } = require('../services/ms1.service');
const {
  isValidDateString,
  isValidTimeString,
  timeToMinutes,
  overlaps
} = require('../utils/time');

const router = express.Router();

async function validarCliente(clienteId) {
  if (!Number.isInteger(clienteId) || clienteId < 1) {
    const err = new Error('cliente_id debe ser un entero mayor a 0');
    err.statusCode = 400;
    throw err;
  }

  const cliente = await obtenerCliente(clienteId);
  if (!cliente) {
    const err = new Error('Cliente no encontrado en MS1');
    err.statusCode = 404;
    throw err;
  }

  return cliente;
}

async function validarMesa(mesaId, cantidadPersonas) {
  if (!mongoose.isValidObjectId(mesaId)) {
    const err = new Error('mesa_id inválido');
    err.statusCode = 400;
    throw err;
  }

  const mesa = await Mesa.findById(mesaId);
  if (!mesa) {
    const err = new Error('Mesa no encontrada');
    err.statusCode = 404;
    throw err;
  }

  if (mesa.estado !== 'disponible') {
    const err = new Error('La mesa está fuera de servicio');
    err.statusCode = 409;
    throw err;
  }

  if (cantidadPersonas > mesa.capacidad) {
    const err = new Error(`La mesa solo tiene capacidad para ${mesa.capacidad} personas`);
    err.statusCode = 409;
    throw err;
  }

  return mesa;
}

function validarFechaHoraDuracion(fecha, hora, duracion) {
  if (!isValidDateString(fecha)) {
    const err = new Error('fecha debe tener formato YYYY-MM-DD y ser válida');
    err.statusCode = 400;
    throw err;
  }

  if (!isValidTimeString(hora)) {
    const err = new Error('hora debe tener formato HH:mm');
    err.statusCode = 400;
    throw err;
  }

  if (!Number.isInteger(duracion) || duracion < 30 || duracion > 240) {
    const err = new Error('duracion_minutos debe ser un entero entre 30 y 240');
    err.statusCode = 400;
    throw err;
  }
}

async function existeConflicto({ mesaId, fecha, hora, duracion, excluirReservaId = null }) {
  const filter = {
    mesa_id: mesaId,
    fecha,
    estado: { $ne: 'cancelada' }
  };

  if (excluirReservaId) {
    filter._id = { $ne: excluirReservaId };
  }

  const reservas = await Reserva.find(filter);
  const start = timeToMinutes(hora);

  return reservas.some((reserva) =>
    overlaps(
      start,
      duracion,
      timeToMinutes(reserva.hora),
      reserva.duracion_minutos
    )
  );
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const filter = {};

    if (req.query.cliente_id) {
      const clienteId = Number(req.query.cliente_id);
      if (!Number.isInteger(clienteId) || clienteId < 1) {
        return res.status(400).json({ detail: 'cliente_id debe ser un entero mayor a 0' });
      }
      filter.cliente_id = clienteId;
    }

    if (req.query.estado) filter.estado = req.query.estado;
    if (req.query.fecha) {
      if (!isValidDateString(req.query.fecha)) {
        return res.status(400).json({ detail: 'fecha debe tener formato YYYY-MM-DD y ser válida' });
      }
      filter.fecha = req.query.fecha;
    }

    const [reservas, total] = await Promise.all([
      Reserva.find(filter)
        .populate('mesa_id', 'numero capacidad ubicacion estado')
        .sort({ fecha: 1, hora: 1 })
        .skip(offset)
        .limit(limit),
      Reserva.countDocuments(filter)
    ]);

    res.json({ total, limit, offset, reservas });
  })
);

router.get(
  '/cliente/:clienteId',
  asyncHandler(async (req, res) => {
    const clienteId = Number(req.params.clienteId);
    await validarCliente(clienteId);

    const reservas = await Reserva.find({ cliente_id: clienteId })
      .populate('mesa_id', 'numero capacidad ubicacion estado')
      .sort({ fecha: 1, hora: 1 });

    res.json({ cliente_id: clienteId, total: reservas.length, reservas });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ detail: 'ID de reserva inválido' });
    }

    const reserva = await Reserva.findById(req.params.id).populate(
      'mesa_id',
      'numero capacidad ubicacion estado'
    );

    if (!reserva) return res.status(404).json({ detail: 'Reserva no encontrada' });

    res.json(reserva);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const clienteId = Number(req.body.cliente_id);
    const cantidadPersonas = Number(req.body.cantidad_personas);
    const duracion = Number(req.body.duracion_minutos ?? 90);

    if (!Number.isInteger(cantidadPersonas) || cantidadPersonas < 1 || cantidadPersonas > 20) {
      return res.status(400).json({
        detail: 'cantidad_personas debe ser un entero entre 1 y 20'
      });
    }

    validarFechaHoraDuracion(req.body.fecha, req.body.hora, duracion);

    const [cliente, mesa] = await Promise.all([
      validarCliente(clienteId),
      validarMesa(req.body.mesa_id, cantidadPersonas)
    ]);

    const conflicto = await existeConflicto({
      mesaId: mesa._id,
      fecha: req.body.fecha,
      hora: req.body.hora,
      duracion
    });

    if (conflicto) {
      return res.status(409).json({
        detail: 'La mesa ya tiene una reserva que se cruza con ese horario'
      });
    }

    const reserva = await Reserva.create({
      cliente_id: clienteId,
      mesa_id: mesa._id,
      fecha: req.body.fecha,
      hora: req.body.hora,
      duracion_minutos: duracion,
      cantidad_personas: cantidadPersonas,
      estado: req.body.estado || 'confirmada',
      observaciones: req.body.observaciones || ''
    });

    await reserva.populate('mesa_id', 'numero capacidad ubicacion estado');

    res.status(201).json({
      detail: 'Reserva creada correctamente',
      cliente_validado: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email
      },
      reserva
    });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ detail: 'ID de reserva inválido' });
    }

    const actual = await Reserva.findById(req.params.id);
    if (!actual) return res.status(404).json({ detail: 'Reserva no encontrada' });

    const clienteId = Number(req.body.cliente_id ?? actual.cliente_id);
    const mesaId = req.body.mesa_id ?? String(actual.mesa_id);
    const fecha = req.body.fecha ?? actual.fecha;
    const hora = req.body.hora ?? actual.hora;
    const duracion = Number(req.body.duracion_minutos ?? actual.duracion_minutos);
    const cantidadPersonas = Number(req.body.cantidad_personas ?? actual.cantidad_personas);

    if (!Number.isInteger(cantidadPersonas) || cantidadPersonas < 1 || cantidadPersonas > 20) {
      return res.status(400).json({
        detail: 'cantidad_personas debe ser un entero entre 1 y 20'
      });
    }

    validarFechaHoraDuracion(fecha, hora, duracion);

    await Promise.all([
      validarCliente(clienteId),
      validarMesa(mesaId, cantidadPersonas)
    ]);

    if ((req.body.estado || actual.estado) !== 'cancelada') {
      const conflicto = await existeConflicto({
        mesaId,
        fecha,
        hora,
        duracion,
        excluirReservaId: actual._id
      });

      if (conflicto) {
        return res.status(409).json({
          detail: 'La mesa ya tiene una reserva que se cruza con ese horario'
        });
      }
    }

    actual.cliente_id = clienteId;
    actual.mesa_id = mesaId;
    actual.fecha = fecha;
    actual.hora = hora;
    actual.duracion_minutos = duracion;
    actual.cantidad_personas = cantidadPersonas;
    actual.estado = req.body.estado ?? actual.estado;
    actual.observaciones = req.body.observaciones ?? actual.observaciones;

    await actual.save();
    await actual.populate('mesa_id', 'numero capacidad ubicacion estado');

    res.json({ detail: 'Reserva actualizada correctamente', reserva: actual });
  })
);

router.patch(
  '/:id/estado',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ detail: 'ID de reserva inválido' });
    }

    const estadosPermitidos = ['confirmada', 'cancelada', 'completada'];
    if (!estadosPermitidos.includes(req.body.estado)) {
      return res.status(400).json({
        detail: `estado debe ser uno de: ${estadosPermitidos.join(', ')}`
      });
    }

    const reserva = await Reserva.findByIdAndUpdate(
      req.params.id,
      { estado: req.body.estado },
      { new: true, runValidators: true }
    ).populate('mesa_id', 'numero capacidad ubicacion estado');

    if (!reserva) return res.status(404).json({ detail: 'Reserva no encontrada' });

    res.json({ detail: 'Estado actualizado correctamente', reserva });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ detail: 'ID de reserva inválido' });
    }

    const reserva = await Reserva.findByIdAndDelete(req.params.id);
    if (!reserva) return res.status(404).json({ detail: 'Reserva no encontrada' });

    res.json({ detail: 'Reserva eliminada correctamente', reserva });
  })
);

module.exports = router;
