import mysql.connector
from mysql.connector import pooling
import os
import time

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "ms1_clientes_db"),
}

connection_pool = None


def crear_pool(max_intentos=10, espera=3):
    global connection_pool
    for intento in range(1, max_intentos + 1):
        try:
            connection_pool = pooling.MySQLConnectionPool(
                pool_name="ms1_pool",
                pool_size=5,
                pool_reset_session=True,
                **DB_CONFIG
            )
            print(f" Pool de conexiones MySQL creado correctamente (intento {intento})")
            return
        except mysql.connector.Error as e:
            print(f" Intento {intento}/{max_intentos} falló: {e}")
            if intento < max_intentos:
                time.sleep(espera)
    raise Exception(" No se pudo crear el pool de conexiones tras varios intentos")


crear_pool()


def get_connection():
    if connection_pool is None:
        raise Exception("Pool de conexiones no disponible")
    return connection_pool.get_connection()


def test_connection():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clientes")
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return f" Conexión OK :) . Clientes en BD: {count}"
    except Exception as e:
        return f" Error :( : {e}"


if __name__ == "__main__":
    print(test_connection())
