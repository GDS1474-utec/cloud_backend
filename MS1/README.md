> **Despliegue del monorepo:** en produccion no uses un `docker-compose.yml` dentro de esta carpeta. Los compose individuales fueron retirados; usa el `docker-compose.yml` de la raiz del repositorio.

# MS1 - Clientes y Pedidos

Microservicio de gestión de clientes y pedidos para el proyecto de Cloud Computing (CS2032).

## Tecnologías

- **Lenguaje:** Python 3.11
- **Framework:** FastAPI
- **Base de datos:** MySQL 8.0
- **Contenedores:** Docker + Docker Compose

## Endpoints

Documentación interactiva (Swagger UI): `http://localhost:8000/docs`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Info del servicio |
| GET | `/health` | Health check |
| GET | `/clientes` | Lista clientes (paginado) |
| GET | `/clientes/{id}` | Cliente por ID |
| GET | `/clientes/{id}/pedidos` | Pedidos de un cliente |
| GET | `/clientes/buscar/?email=` | Buscar clientes por email |
| GET | `/clientes/estadisticas/top` | Top clientes por cantidad de pedidos |
| GET | `/pedidos` | Lista pedidos con info del cliente |
| GET | `/pedidos/{id}` | Pedido por ID |
| GET | `/pedidos/{id}/detalle` | Platos de un pedido (sin precios) |
| POST | `/pedidos` | Crear un pedido con platos |
| GET | `/pedidos/estado/{estado}` | Pedidos filtrados por estado |
| GET | `/pedidos/estadisticas/por-estado` | Cantidad de pedidos por estado |

## Cómo ejecutar

### Requisitos
- Docker Desktop
- Docker Compose

### Levantar el proyecto

```bash
docker compose up -d --build
python scripts/generate_fake_data.py

