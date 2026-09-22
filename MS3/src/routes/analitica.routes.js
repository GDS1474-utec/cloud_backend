const express = require('express');
const Reserva = require('../models/Reserva');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get(
  '/reservas/por-estado',
  asyncHandler(async (req, res) => {
    const data = await Reserva.aggregate([
      {
        $group: {
          _id: '$estado',
          cantidad: { $sum: 1 },
          personas: { $sum: '$cantidad_personas' }
        }
      },
      { $sort: { cantidad: -1 } }
    ]);

    res.json({
      estadisticas: data.map((item) => ({
        estado: item._id,
        cantidad: item.cantidad,
        personas: item.personas
      }))
    });
  })
);

router.get(
  '/reservas/por-fecha',
  asyncHandler(async (req, res) => {
    const data = await Reserva.aggregate([
      { $match: { estado: { $ne: 'cancelada' } } },
      {
        $group: {
          _id: '$fecha',
          cantidad: { $sum: 1 },
          personas: { $sum: '$cantidad_personas' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      estadisticas: data.map((item) => ({
        fecha: item._id,
        cantidad_reservas: item.cantidad,
        total_personas: item.personas
      }))
    });
  })
);

router.get(
  '/mesas/mas-reservadas',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);

    const data = await Reserva.aggregate([
      { $match: { estado: { $ne: 'cancelada' } } },
      {
        $group: {
          _id: '$mesa_id',
          total_reservas: { $sum: 1 },
          total_personas: { $sum: '$cantidad_personas' }
        }
      },
      { $sort: { total_reservas: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'mesas',
          localField: '_id',
          foreignField: '_id',
          as: 'mesa'
        }
      },
      { $unwind: '$mesa' },
      {
        $project: {
          _id: 0,
          mesa_id: '$_id',
          numero: '$mesa.numero',
          capacidad: '$mesa.capacidad',
          ubicacion: '$mesa.ubicacion',
          total_reservas: 1,
          total_personas: 1
        }
      }
    ]);

    res.json({ top_mesas: data });
  })
);

module.exports = router;
