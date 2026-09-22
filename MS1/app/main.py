from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_connection
import os
import httpx

app = FastAPI(
    title="MS1 - Clientes y Pedidos",
    description="Microservicio de gestión de clientes y pedidos del restaurante",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MS2_URL = os.getenv("MS2_URL", "http://ms2-api:8082")


class DetalleItem(BaseModel):
    plato_id: int
    cantidad: int
    notas: Optional[str] = None


class PedidoCreate(BaseModel):
    cliente_id: int
    items: List[DetalleItem]


async def validar_plato_en_ms2(plato_id: int) -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{MS2_URL}/api/v1/platos/{plato_id}")
            return response.status_code == 200
    except Exception:
        return True


@app.get("/", tags=["Root"])
def root():
    return {
        "servicio": "MS1 - Clientes y Pedidos",
        "estado": "activo",
        "version": "1.0.0",
        "documentacion": "/docs",
    }


@app.get("/health", tags=["Root"])
def health():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB error: {e}")


@app.get("/clientes", tags=["Clientes"])
def listar_clientes(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM clientes ORDER BY id LIMIT %s OFFSET %s",
        (limit, offset),
    )
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"total": len(result), "clientes": result}


@app.get("/clientes/{cliente_id}", tags=["Clientes"])
def obtener_cliente(cliente_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM clientes WHERE id = %s", (cliente_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return result


@app.get("/clientes/{cliente_id}/pedidos", tags=["Clientes"])
def pedidos_de_cliente(cliente_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM pedidos WHERE cliente_id = %s ORDER BY fecha_pedido DESC",
        (cliente_id,),
    )
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"cliente_id": cliente_id, "total_pedidos": len(result), "pedidos": result}


@app.get("/clientes/buscar/", tags=["Clientes"])
def buscar_clientes_por_email(email: str = Query(..., min_length=3)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM clientes WHERE email LIKE %s",
        (f"%{email}%",),
    )
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"total": len(result), "clientes": result}


@app.get("/pedidos", tags=["Pedidos"])
def listar_pedidos(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT p.id, p.fecha_pedido, p.estado,
               c.id AS cliente_id, c.nombre AS cliente_nombre, c.email AS cliente_email
        FROM pedidos p
        JOIN clientes c ON p.cliente_id = c.id
        ORDER BY p.fecha_pedido DESC
        LIMIT %s OFFSET %s
        """,
        (limit, offset),
    )
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"total": len(result), "pedidos": result}


@app.get("/pedidos/{pedido_id}", tags=["Pedidos"])
def obtener_pedido(pedido_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT p.id, p.fecha_pedido, p.estado,
               c.id AS cliente_id, c.nombre AS cliente_nombre, c.email AS cliente_email
        FROM pedidos p
        JOIN clientes c ON p.cliente_id = c.id
        WHERE p.id = %s
        """,
        (pedido_id,),
    )
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return result


@app.get("/pedidos/{pedido_id}/detalle", tags=["Pedidos"])
def detalle_pedido(pedido_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT d.id, d.plato_id, d.cantidad, d.notas
        FROM pedido_detalle d
        WHERE d.pedido_id = %s
        ORDER BY d.id
        """,
        (pedido_id,),
    )
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"pedido_id": pedido_id, "detalles": result}


@app.post("/pedidos", tags=["Pedidos"], status_code=201)
async def crear_pedido(pedido: PedidoCreate):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM clientes WHERE id = %s", (pedido.cliente_id,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    for item in pedido.items:
        existe = await validar_plato_en_ms2(item.plato_id)
        if not existe:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=404,
                detail=f"Plato {item.plato_id} no existe en el menú (MS2)"
            )

    cursor.execute(
        "INSERT INTO pedidos (cliente_id, fecha_pedido, estado) VALUES (%s, NOW(), 'pendiente')",
        (pedido.cliente_id,),
    )
    pedido_id = cursor.lastrowid

    for item in pedido.items:
        cursor.execute(
            "INSERT INTO pedido_detalle (pedido_id, plato_id, cantidad, notas) VALUES (%s, %s, %s, %s)",
            (pedido_id, item.plato_id, item.cantidad, item.notas),
        )

    conn.commit()
    cursor.close()
    conn.close()
    return {"id": pedido_id, "mensaje": "Pedido creado", "items": len(pedido.items)}


@app.get("/pedidos/estado/{estado}", tags=["Pedidos"])
def pedidos_por_estado(estado: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT p.id, p.fecha_pedido, p.estado,
               c.nombre AS cliente_nombre
        FROM pedidos p
        JOIN clientes c ON p.cliente_id = c.id
        WHERE p.estado = %s
        ORDER BY p.fecha_pedido DESC
        """,
        (estado,),
    )
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"estado": estado, "total": len(result), "pedidos": result}


@app.get("/pedidos/estadisticas/por-estado", tags=["Analítica"])
def estadisticas_por_estado():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT estado,
               COUNT(*) AS cantidad
        FROM pedidos
        GROUP BY estado
        ORDER BY cantidad DESC
        """
    )
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"estadisticas": result}


@app.get("/clientes/estadisticas/top", tags=["Analítica"])
def top_clientes(limit: int = Query(5, ge=1, le=20)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT c.id, c.nombre, c.email,
               COUNT(p.id) AS total_pedidos
        FROM clientes c
        LEFT JOIN pedidos p ON c.id = p.cliente_id
        GROUP BY c.id, c.nombre, c.email
        ORDER BY total_pedidos DESC
        LIMIT %s
        """,
        (limit,),
    )
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"top_clientes": result}
