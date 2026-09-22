> **Despliegue del monorepo:** en produccion no uses un `docker-compose.yml` dentro de esta carpeta. Los compose individuales fueron retirados; usa el `docker-compose.yml` de la raiz del repositorio.

# MS4 — Comanda/Facturación

Microservicio orquestador para el proyecto de Cloud Computing (Restaurante).
**No tiene base de datos propia.** Combina datos de MS1 y MS2 para armar la
cuenta final de un pedido.

## Stack

- Node.js 20 + Express
- Sin BD
- Validación de entrada con Joi
- Swagger UI (`swagger-jsdoc` + `swagger-ui-express`)
- Seguridad básica con Helmet, logging con Morgan
- Tests con el test runner nativo de Node (`node --test`)
- Puerto: **8083**

## Estructura

```
src/
  config/        env.js (variables de entorno), swagger.js
  services/      ms1Client.js, ms2Client.js (llamadas HTTP), comandaService.js (logica de negocio)
  controllers/   comandaController.js
  routes/        comandaRoutes.js
  middlewares/   validate.js (Joi), errorHandler.js
  utils/         ApiError.js
  app.js         configuracion de Express (sin levantar el puerto, testeable)
  server.js      arranque real (usa app.js + listen)
test/
  comandaService.test.js   pruebas automatizadas con servidores fake de MS1/MS2
```

## Cómo funciona (flujo)

`GET /comandas/{pedidoId}` — ya no hace falta mandar nada en el body:

1. MS4 llama en paralelo a **MS1**:
   - `GET /pedidos/{id}` → valida que el pedido exista y trae datos del cliente.
   - `GET /pedidos/{id}/detalle` → trae los platos pedidos (`plato_id` + `cantidad`).
2. Con esos `plato_id`, MS4 llama a **MS2**: `POST /api/v1/platos/precios` para
   traer precio real y disponibilidad de cada uno.
3. MS4 combina todo: calcula subtotal por línea y el total, marca advertencias
   si algún plato no existe en MS2 o está marcado como no disponible.

## Cómo levantarlo

Antes de levantar MS4, asegúrate de tener:
- **MS1 corriendo en el puerto 8000** (ya con `pedido_detalle` y el endpoint
  `/pedidos/{id}/detalle`).
- **MS2 corriendo en el puerto 8082**.

```bash
docker compose up --build
```

Esto expone MS4 en `http://localhost:8083`.

> El `docker-compose.yml` usa `host.docker.internal` para que el contenedor
> de MS4 llegue a MS1 y MS2 (que corren en redes Docker separadas). Funciona
> directo en Windows/Mac. En Linux, si no conecta, corre MS4 sin Docker (ver
> abajo) o revisa la sección Troubleshooting.

### Correrlo sin Docker (más rápido para desarrollar)

```bash
npm install
cp .env.example .env
npm start
```

`.env.example` ya trae los defaults correctos para desarrollo local
(`MS1_BASE_URL=http://localhost:8000`, `MS2_BASE_URL=http://localhost:8082`).

### Correr los tests automatizados

```bash
npm test
```

Estos tests **no** necesitan que MS1/MS2 estén corriendo: levantan servidores
falsos en memoria que simulan sus respuestas, para probar la lógica de
`comandaService` de forma aislada y rápida.

## Swagger

- UI: http://localhost:8083/docs

## Ejemplos con curl

```bash
# Health check
curl http://localhost:8083/health

# Generar comanda del pedido 1 (usa el detalle real que ya tiene MS1)
curl http://localhost:8083/comandas/1
```

Respuesta esperada (con los datos de ejemplo de MS1 actuales):

```json
{
  "pedidoId": 1,
  "fechaPedido": "2024-06-01T13:30:00",
  "estadoPedido": "entregado",
  "cliente": { "id": 1, "nombre": "Ana Torres", "email": "ana.torres@example.com" },
  "lineas": [
    { "platoId": 1, "nombre": "...", "precioUnitario": 18.5, "cantidad": 2, "notas": "Sin cebolla", "subtotal": 37.0, "disponible": true },
    { "platoId": 4601, "nombre": "...", "precioUnitario": 25.0, "cantidad": 1, "notas": null, "subtotal": 25.0, "disponible": true }
  ],
  "total": 62.0,
  "advertencias": {}
}
```

### Casos de error a probar

```bash
# Pedido que no existe en MS1 -> 404
curl http://localhost:8083/comandas/9999

# pedidoId no numerico -> 400 (validado con Joi)
curl http://localhost:8083/comandas/abc

# Pedido sin items en pedido_detalle -> 400
```

## Troubleshooting

- **`ECONNREFUSED` o `503` al llamar a MS1/MS2**: revisa que ambos estén
  corriendo (`docker ps` debe mostrar `ms1-api` y la app de MS2) y que los
  puertos 8000/8082 estén expuestos al host.
- **`host.docker.internal` no resuelve en Linux**: corre MS4 con `npm start`
  directo en tu máquina (sin Docker) apuntando a `localhost`, o reemplaza las
  URLs en `docker-compose.yml` por la IP de tu máquina en la red docker.
- **404 en `/comandas/{id}`**: MS1 no tiene ese pedido — revisa ids válidos
  con `curl http://localhost:8000/pedidos`.
- **400 "no tiene items registrados"**: el pedido existe en `pedidos` pero no
  tiene filas en `pedido_detalle` — revisa con
  `curl http://localhost:8000/pedidos/{id}/detalle`.
