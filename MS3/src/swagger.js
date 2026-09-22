const swaggerJsdoc = require('swagger-jsdoc');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'MS3 - Reservas y Mesas',
    version: '1.0.0',
    description: 'API REST del microservicio MS3 para gestión de reservas y mesas.'
  },
  servers: [
    { url: 'http://localhost:8003', description: 'Local' }
  ],
  components: {
    schemas: {
      Mesa: {
        type: 'object',
        properties: {
          numero: { type: 'integer', example: 1 },
          capacidad: { type: 'integer', example: 4 },
          ubicacion: { type: 'string', example: 'interior' },
          estado: { type: 'string', example: 'disponible' },
          descripcion: { type: 'string', example: 'Cerca de la ventana' }
        }
      },
      Reserva: {
        type: 'object',
        required: ['cliente_id', 'mesa_id', 'fecha', 'hora', 'cantidad_personas'],
        properties: {
          cliente_id: { type: 'integer', example: 1 },
          mesa_id: { type: 'string', example: '66dff1b3e84b563b95af1111' },
          fecha: { type: 'string', example: '2026-09-18' },
          hora: { type: 'string', example: '20:00' },
          duracion_minutos: { type: 'integer', example: 90 },
          cantidad_personas: { type: 'integer', example: 4 },
          estado: { type: 'string', example: 'confirmada' },
          observaciones: { type: 'string', example: 'Mesa tranquila' }
        }
      }
    }
  },
  paths: {
    '/': {
      get: {
        summary: 'Información del servicio',
        responses: { '200': { description: 'OK' } }
      }
    },
    '/health': {
      get: {
        summary: 'Health check de MS3 y MongoDB',
        responses: { '200': { description: 'OK' } }
      }
    },
    '/mesas': {
      get: {
        summary: 'Listar mesas',
        responses: { '200': { description: 'Lista de mesas' } }
      },
      post: {
        summary: 'Crear mesa',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Mesa' }
            }
          }
        },
        responses: { '201': { description: 'Mesa creada' } }
      }
    },
    '/mesas/disponibles': {
      get: {
        summary: 'Consultar mesas disponibles para fecha, hora y cantidad de personas',
        parameters: [
          { name: 'fecha', in: 'query', required: true, schema: { type: 'string' }, example: '2026-09-18' },
          { name: 'hora', in: 'query', required: true, schema: { type: 'string' }, example: '20:00' },
          { name: 'personas', in: 'query', required: true, schema: { type: 'integer' }, example: 4 },
          { name: 'duracion_minutos', in: 'query', required: false, schema: { type: 'integer', default: 90 } }
        ],
        responses: { '200': { description: 'Mesas disponibles' } }
      }
    },
    '/reservas': {
      get: {
        summary: 'Listar reservas',
        responses: { '200': { description: 'Lista de reservas' } }
      },
      post: {
        summary: 'Crear reserva y validar cliente en MS1',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Reserva' }
            }
          }
        },
        responses: {
          '201': { description: 'Reserva creada' },
          '404': { description: 'Cliente o mesa no encontrados' },
          '409': { description: 'Mesa no disponible' },
          '503': { description: 'MS1 no disponible' }
        }
      }
    },
    '/reservas/{id}': {
      get: {
        summary: 'Obtener reserva por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Reserva' } }
      },
      put: {
        summary: 'Actualizar reserva',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Reserva actualizada' } }
      },
      delete: {
        summary: 'Eliminar reserva',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Reserva eliminada' } }
      }
    },
    '/reservas/{id}/estado': {
      patch: {
        summary: 'Cambiar estado de una reserva',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { estado: { type: 'string', example: 'cancelada' } }
              }
            }
          }
        },
        responses: { '200': { description: 'Estado actualizado' } }
      }
    }
  }
};

module.exports = swaggerJsdoc({ definition, apis: [] });
