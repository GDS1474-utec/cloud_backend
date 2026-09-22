# Checklist AWS - MVs de produccion

1. Crear 2 EC2 en la misma VPC que la MV de BD.
2. Asociar el Security Group `mvs-produccion` a ambas EC2.
3. Instalar Docker, Docker Compose y Git.
4. Clonar este repositorio en cada EC2.
5. Crear `.env` desde `.env.example` y completar las contrasenas.
6. Ejecutar `docker compose up -d --build`.
7. Verificar los 4 endpoints de health.
8. Registrar las 2 EC2 en los Target Groups del balanceador privado.
9. No exponer 3306, 5432 ni 27017 a Internet.
