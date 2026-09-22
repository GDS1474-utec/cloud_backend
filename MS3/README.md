> **Despliegue del monorepo:** en produccion no uses un `docker-compose.yml` dentro de esta carpeta. Los compose individuales fueron retirados; usa el `docker-compose.yml` de la raiz del repositorio.

# MS3 - Reservas y Mesas

Microservicio de **Reservas y Mesas** para el proyecto parcial de **CS2032 - Cloud Computing**.

La responsabilidad de MS3 es mantener su propia base de datos MongoDB para mesas y reservas y, al crear o modificar una reserva, **consumir MS1** para verificar que el cliente exista.

## Tecnologías

- Node.js 22
- Express 5
- MongoDB 7
- Mongoose
- Axios para consumir MS1
- Docker + Docker Compose
- Swagger UI

## Estructura

```text
MS3-Reservas-Mesas/
├── src/
│   ├── config/database.js
│   ├── middleware/errorHandler.js
│   ├── models/
│   │   ├── Mesa.js
│   │   └── Reserva.js
│   ├── routes/
│   │   ├── mesas.routes.js
│   │   ├── reservas.routes.js
│   │   └── analitica.routes.js
│   ├── services/ms1.service.js
│   ├── utils/
│   ├── app.js
│   ├── server.js
│   └── swagger.js
├── scripts/seed.js
├── tests/time.test.js
├── Dockerfile
├── docker-compose.yml
├── package.json
└── .env.example
```

## Endpoint de MS1 utilizado

MS1 expone:

```http
GET /clientes/{cliente_id}
```

- `200`: el cliente existe.
- `404`: el cliente no existe.
- Si MS1 no responde, MS3 devuelve `503` al intentar crear/modificar una reserva.

## Ejecutar con Docker

### 1. Levantar primero MS1

En la carpeta de MS1:

```bash
docker compose up -d --build
```

MS1 debe estar disponible en:

```text
http://localhost:8000
```

### 2. Levantar MS3

En esta carpeta:

```bash
docker compose up -d --build
```

Servicios:

- API MS3: `http://localhost:8003`
- Swagger: `http://localhost:8003/docs`
- MongoDB: `localhost:27018`

El `docker-compose.yml` usa `host.docker.internal:8000` para que el contenedor MS3 pueda llamar al MS1 que está publicado en el host.

### Si luego integran MS1 y MS3 en una misma red Docker

Cambien la variable:

```text
MS1_URL=http://ms1-api:8000
```

Siempre que ambos contenedores estén conectados a una red Docker común.

## Ejecutar sin Docker para Node.js

Necesitas MongoDB disponible y MS1 corriendo en `localhost:8000`.

```bash
cp .env.example .env
npm install
npm start
```

## Cargar datos de prueba

La forma más fácil si levantaste MS3 con Docker es:

```bash
docker compose exec ms3-api npm run seed
```

Si ejecutas Node.js directamente en tu máquina, también puedes usar:

```bash
npm run seed
```

El seed crea:

- 12 mesas.
- 30 reservas.
- Usa `cliente_id` 1, 2 y 3, que son los clientes de ejemplo del `init.sql` de MS1.

El seed solo carga datos locales en MongoDB y no llama a MS1.

## Endpoints principales

### Root y salud

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Información del servicio |
| GET | `/health` | Estado de MongoDB |
| GET | `/docs` | Swagger UI |

### Mesas

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/mesas` | Listar mesas |
| GET | `/mesas/{id}` | Obtener una mesa |
| POST | `/mesas` | Crear mesa |
| PUT | `/mesas/{id}` | Actualizar mesa |
| DELETE | `/mesas/{id}` | Eliminar mesa |
| GET | `/mesas/disponibles` | Buscar mesas disponibles por fecha/hora/personas |

Ejemplo:

```text
GET /mesas/disponibles?fecha=2026-09-18&hora=20:00&personas=4&duracion_minutos=90
```

### Reservas

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/reservas` | Listar reservas |
| GET | `/reservas/{id}` | Obtener una reserva |
| GET | `/reservas/cliente/{clienteId}` | Reservas de un cliente, validándolo en MS1 |
| POST | `/reservas` | Crear reserva y validar cliente en MS1 |
| PUT | `/reservas/{id}` | Actualizar reserva |
| PATCH | `/reservas/{id}/estado` | Cambiar estado |
| DELETE | `/reservas/{id}` | Eliminar reserva |

Filtros de listado:

```text
GET /reservas?cliente_id=1
GET /reservas?estado=confirmada
GET /reservas?fecha=2026-09-18
GET /reservas?limit=20&offset=0
```

### Analítica básica

Estos endpoints facilitan pruebas y pueden servir como fuentes para demostrar los datos de MS3. MS5 sigue siendo el encargado de la analítica en S3/Glue/Athena.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/analitica/reservas/por-estado` | Conteo por estado |
| GET | `/analitica/reservas/por-fecha` | Reservas y personas por fecha |
| GET | `/analitica/mesas/mas-reservadas` | Mesas con más reservas |

## Ejemplo: crear una mesa

```http
POST /mesas
Content-Type: application/json
```

```json
{
  "numero": 20,
  "capacidad": 4,
  "ubicacion": "interior",
  "estado": "disponible",
  "descripcion": "Cerca de la ventana"
}
```

## Ejemplo: crear una reserva

Primero obtén el `_id` de una mesa con `GET /mesas`.

```http
POST /reservas
Content-Type: application/json
```

```json
{
  "cliente_id": 1,
  "mesa_id": "REEMPLAZAR_POR_ID_DE_MESA",
  "fecha": "2026-09-18",
  "hora": "20:00",
  "duracion_minutos": 90,
  "cantidad_personas": 4,
  "observaciones": "Mesa tranquila"
}
```

Flujo interno:

1. MS3 valida formato y cantidad de personas.
2. MS3 llama a `GET MS1/clientes/1`.
3. Verifica que la mesa exista y esté habilitada.
4. Verifica la capacidad.
5. Busca reservas de esa mesa para evitar cruces de horario.
6. Guarda la reserva en MongoDB.

## Reglas implementadas

- Una reserva solo puede usar un cliente existente en MS1.
- Una mesa `fuera_servicio` no puede reservarse.
- La cantidad de personas no puede superar la capacidad de la mesa.
- No se permiten reservas que se crucen en la misma mesa y fecha.
- Duración permitida: 30 a 240 minutos.
- Estados de reserva: `confirmada`, `cancelada`, `completada`.
- Estados de mesa: `disponible`, `fuera_servicio`.
- No se puede eliminar una mesa mientras tenga reservas confirmadas.

## Pruebas

```bash
npm test
```

Se incluyen pruebas unitarias de validación de fechas, horas y detección de cruces.

