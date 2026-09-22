# Proyecto Cloud - Backend de Microservicios

Monorepo de los 4 microservicios actuales del proyecto CS2032. Esta version esta preparada para desplegarse igual en las **2 MVs de produccion** usando un unico `docker-compose.yml`.

## Arquitectura

- **MS1**: Clientes y Pedidos - Python/FastAPI - MySQL remoto.
- **MS2**: Menu y Platos - Java/Spring Boot - PostgreSQL remoto.
- **MS3**: Reservas y Mesas - Node.js - MongoDB remoto - consume MS1.
- **MS4**: Comanda/Facturacion - Node.js - sin base de datos - consume MS1 y MS2.
- Las bases de datos **NO se levantan con este compose**. Estan en la MV privada de BD.
- Las 2 MVs de produccion deben ejecutar este mismo repositorio/compose.

## Estructura

```text
Proyecto-Cloud-Backend/
├── MS1/
│   └── Dockerfile
├── MS2/
│   └── Dockerfile
├── MS3/
│   └── Dockerfile
├── MS4/
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

Los `docker-compose.yml` individuales y los contenedores locales de MySQL, PostgreSQL y MongoDB fueron retirados. Los `Dockerfile` de cada microservicio se mantienen.

## 1. Configurar variables de entorno en cada MV de produccion

Despues de clonar el repositorio:

```bash
cp .env.example .env
nano .env
```

Completar las tres contrasenas reales en `.env`:

```env
MS1_DB_PASSWORD=...
MS2_DB_PASSWORD=...
MS3_DB_PASSWORD=...
```

**No subir `.env` a GitHub.** Ya esta ignorado por `.gitignore`.

La MV de base de datos configurada actualmente usa la IP privada:

```text
172.31.68.252
```

## 2. Levantar los microservicios

Desde la raiz del repositorio:

```bash
docker compose up -d --build
```

Verificar:

```bash
docker compose ps
```

Ver logs:

```bash
docker compose logs -f
```

## 3. Puertos

| Servicio | Puerto | Documentacion / Health |
|---|---:|---|
| MS1 | 8000 | `/docs`, `/health` |
| MS2 | 8082 | `/swagger-ui.html`, `/actuator/health` |
| MS3 | 8003 | `/docs`, `/health` |
| MS4 | 8083 | `/docs`, `/health` |

Pruebas desde la propia MV:

```bash
curl http://localhost:8000/health
curl http://localhost:8082/actuator/health
curl http://localhost:8003/health
curl http://localhost:8083/health
```

## 4. Comunicacion interna entre contenedores

Todos los servicios comparten la red Docker `backend-network`:

- MS1 -> MS2: `http://ms2-api:8082`
- MS3 -> MS1: `http://ms1-api:8000`
- MS4 -> MS1: `http://ms1-api:8000`
- MS4 -> MS2: `http://ms2-api:8082`

Las conexiones a BD se realizan directamente por la red privada de AWS hacia `DB_HOST`.

## 5. Despliegue en las dos MVs

Realizar exactamente los mismos pasos en **MV-PRODUCCION-1** y **MV-PRODUCCION-2**:

```bash
git clone <URL_DEL_REPOSITORIO>
cd Proyecto-Cloud-Backend
cp .env.example .env
nano .env
docker compose up -d --build
```

Ambas MVs deben tener el Security Group de produccion autorizado por el Security Group de la MV de BD para:

- MySQL: TCP 3306
- PostgreSQL: TCP 5432
- MongoDB: TCP 27017

Luego ambas MVs pueden registrarse como targets del Load Balancer privado.

## 6. Actualizar una MV

```bash
git pull
docker compose up -d --build
```
