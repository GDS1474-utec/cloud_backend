const express = require('express');
const mongoose = require('mongoose');
const Mesa = require('../models/Mesa');
const Reserva = require('../models/Reserva');
const asyncHandler = require('../utils/asyncHandler');
const {
  isValidDateString,
  isValidTimeString,
  timeToMinutes,
  overlaps
} = require('../utils/time');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const filter = {};
    if (req.query.estado) filter.estado = req.query.estado;
    if (req.query.ubicacion) filter.ubicacion = req.query.ubicacion;
    if (req.query.capacidad_min) {
      const capacidadMin = Number(req.query.capacidad_min);
      if (!Number.isInteger(capacidadMin) || capacidadMin < 1) {
        return res.status(400).json({ detail: 'capacidad_min debe ser un entero mayor a 0' });
      }
      filter.capacidad = { $gte: capacidadMin };
    }

    const [mesas, total] = await Promise.all([
      Mesa.find(filter).sort({ numero: 1 }).skip(offset).limit(limit),
      Mesa.countDocuments(filter)
    ]);

    res.json({ total, limit, offset, mesas });
  })
);

router.get(
  '/disponibles',
  asyncHandler(async (req, res) => {
    const { fecha, hora } = req.query;
    const personas = Number(req.query.personas);
    const duracion = Number(req.query.duracion_minutos || 90);

    if (!isValidDateString(fecha)) {
      return res.status(400).json({ detail: 'fecha debe tener formato YYYY-MM-DD y ser válida' });
    }
    if (!isValidTimeString(hora)) {
      return res.status(400).json({ detail: 'hora debe tener formato HH:mm' });
    }
    if (!Number.isInteger(personas) || personas < 1 || personas > 20) {
      return res.status(400).json({ detail: 'personas debe ser un entero entre 1 y 20' });
    }
    if (!Number.isInteger(duracion) || duracion < 30 || duracion > 240) {
      return res.status(400).json({ detail: 'duracion_minutos debe estar entre 30 y 240' });
    }

    const mesas = await Mesa.find({
      estado: 'disponible',
      capacidad: { $gte: personas }
    }).sort({ capacidad: 1, numero: 1 });

    const mesaIds = mesas.map((mesa) => mesa._id);
    const reservas = await Reserva.find({
      mesa_id: { $in: mesaIds },
      fecha,
      estado: { $ne: 'cancelada' }
    });

    const requestedStart = timeToMinutes(hora);
    const ocupadas = new Set();

    for (const reserva of reservas) {
      const existingStart = timeToMinutes(reserva.hora);
      if (
        overlaps(
          requestedStart,
          duracion,
          existingStart,
          reserva.duracion_minutos
        )
      ) {
        ocupadas.add(String(reserva.mesa_id));
      }
    }

    const disponibles = mesas.filter((mesa) => !ocupadas.has(String(mesa._id)));

    res.json({
      fecha,
      hora,
      personas,
      duracion_minutos: duracion,
      total: disponibles.length,
      mesas: disponibles
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ detail: 'ID de mesa inválido' });
    }

    const mesa = await Mesa.findById(req.params.id);
    if (!mesa) return res.status(404).json({ detail: 'Mesa no encontrada' });

    res.json(mesa);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const mesa = await Mesa.create({
      numero: req.body.numero,
      capacidad: req.body.capacidad,
      ubicacion: req.body.ubicacion,
      estado: req.body.estado,
      descripcion: req.body.descripcion
    });

    res.status(201).json(mesa);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ detail: 'ID de mesa inválido' });
    }

    const mesa = await Mesa.findByIdAndUpdate(
      req.params.id,
      {
        numero: req.body.numero,
        capacidad: req.body.capacidad,
        ubicacion: req.body.ubicacion,
        estado: req.body.estado,
        descripcion: req.body.descripcion
      },
      { new: true, runValidators: true }
    );

    if (!mesa) return res.status(404).json({ detail: 'Mesa no encontrada' });

    res.json(mesa);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ detail: 'ID de mesa inválido' });
    }

    const reservasActivas = await Reserva.countDocuments({
      mesa_id: req.params.id,
      estado: 'confirmada'
    });

    if (reservasActivas > 0) {
      return res.status(409).json({
        detail: 'No se puede eliminar una mesa con reservas confirmadas'
      });
    }

    const mesa = await Mesa.findByIdAndDelete(req.params.id);
    if (!mesa) return res.status(404).json({ detail: 'Mesa no encontrada' });

    res.json({ detail: 'Mesa eliminada correctamente', mesa });
  })
);

module.exports = router;
