import mysql.connector
from faker import Faker
import random
import os

fake = Faker('es_ES')

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "ms1_clientes_db"),
}

CLIENTES_A_GENERAR = 5000
PEDIDOS_A_GENERAR = 20000
PLATOS_POR_PEDIDO_MIN = 1
PLATOS_POR_PEDIDO_MAX = 5
MAX_PLATO_ID = 50
ESTADOS = ['pendiente', 'en preparacion', 'entregado', 'cancelado']
NOTAS_POSIBLES = [
    'Sin cebolla', 'Sin sal', 'Extra picante', 'Para llevar',
    'Sin culantro', 'Termino medio', 'Sin canela', 'Bien cocido',
    None, None, None
]


def generar_clientes(cursor, cantidad):
    print(f" Generando {cantidad} clientes...")
    clientes = []
    for _ in range(cantidad):
        clientes.append((
            fake.name(),
            fake.unique.email(),
            fake.phone_number()[:20],
            fake.address()[:200].replace('\n', ' ').replace('\r', ''),
            fake.date_between(start_date='-2y', end_date='today')
        ))
    cursor.executemany(
        "INSERT INTO clientes (nombre, email, telefono, direccion, fecha_registro) "
        "VALUES (%s, %s, %s, %s, %s)",
        clientes
    )
    print(f" {cantidad} clientes insertados")


def generar_pedidos(cursor, cantidad, max_cliente_id):
    print(f" Generando {cantidad} pedidos...")
    pedidos = []
    for _ in range(cantidad):
        pedidos.append((
            random.randint(1, max_cliente_id),
            fake.date_time_between(start_date='-1y', end_date='now'),
            random.choice(ESTADOS)
        ))
    cursor.executemany(
        "INSERT INTO pedidos (cliente_id, fecha_pedido, estado) VALUES (%s, %s, %s)",
        pedidos
    )
    print(f" {cantidad} pedidos insertados")


def generar_detalles(cursor, pedido_ids, max_plato_id):
    print(f" Generando detalles para {len(pedido_ids)} pedidos...")
    total_detalles = 0
    detalles = []
    for pedido_id in pedido_ids:
        n_platos = random.randint(PLATOS_POR_PEDIDO_MIN, PLATOS_POR_PEDIDO_MAX)
        for _ in range(n_platos):
            detalles.append((
                pedido_id,
                random.randint(1, max_plato_id),
                random.randint(1, 3),
                random.choice(NOTAS_POSIBLES)
            ))
            total_detalles += 1

        if len(detalles) >= 5000:
            cursor.executemany(
                "INSERT INTO pedido_detalle (pedido_id, plato_id, cantidad, notas) "
                "VALUES (%s, %s, %s, %s)",
                detalles
            )
            detalles = []

    if detalles:
        cursor.executemany(
            "INSERT INTO pedido_detalle (pedido_id, plato_id, cantidad, notas) "
            "VALUES (%s, %s, %s, %s)",
            detalles
        )
    print(f" {total_detalles} detalles insertados")


def main():
    print(" Iniciando generación de datos...")
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM clientes")
    clientes_existentes = cursor.fetchone()[0]

    if clientes_existentes < CLIENTES_A_GENERAR:
        generar_clientes(cursor, CLIENTES_A_GENERAR - clientes_existentes)
        conn.commit()

    cursor.execute("SELECT COUNT(*) FROM pedidos")
    pedidos_existentes = cursor.fetchone()[0]

    if pedidos_existentes < PEDIDOS_A_GENERAR:
        generar_pedidos(cursor, PEDIDOS_A_GENERAR - pedidos_existentes, CLIENTES_A_GENERAR)
        conn.commit()

    cursor.execute("SELECT id FROM pedidos")
    pedido_ids = [row[0] for row in cursor.fetchall()]

    cursor.execute("SELECT COUNT(*) FROM pedido_detalle")
    detalles_existentes = cursor.fetchone()[0]

    if detalles_existentes == 0:
        generar_detalles(cursor, pedido_ids, MAX_PLATO_ID)
        conn.commit()

    print("Datos generados correctamente")

    cursor.execute("SELECT COUNT(*) FROM clientes")
    print(f"   Clientes: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM pedidos")
    print(f"   Pedidos: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM pedido_detalle")
    print(f"   Detalles: {cursor.fetchone()[0]}")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    main()
