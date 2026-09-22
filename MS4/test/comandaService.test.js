const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

/**
 * Estos tests levantan servidores HTTP falsos (en memoria, puertos locales)
 * que imitan las respuestas de MS1 y MS2, apuntan las variables de entorno
 * de MS4 hacia ellos, y prueban comandaService.generarComanda() de punta a
 * punta sin depender de que los microservicios reales esten corriendo.
 */

function crearFakeMs1({ pedido, detalles }) {
  return http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url.match(/^\/pedidos\/\d+\/detalle$/)) {
      if (!detalles) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ detail: "Pedido no encontrado" }));
      }
      return res.end(JSON.stringify({ pedido_id: pedido?.id, detalles }));
    }
    if (req.url.match(/^\/pedidos\/\d+$/)) {
      if (!pedido) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ detail: "Pedido no encontrado" }));
      }
      return res.end(JSON.stringify(pedido));
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ detail: "not found" }));
  });
}

function crearFakeMs2({ encontrados, noEncontrados }) {
  return http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ encontrados, noEncontrados }));
  });
}

async function levantar(server) {
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

test("generarComanda combina MS1 + MS2 y calcula el total correctamente", async () => {
  const ms1 = crearFakeMs1({
    pedido: { id: 1, cliente_id: 1, cliente_nombre: "Ana Torres", cliente_email: "ana@x.com", estado: "entregado", fecha_pedido: "2024-06-01" },
    detalles: [
      { plato_id: 1, cantidad: 2, notas: "Sin cebolla" },
      { plato_id: 5, cantidad: 1, notas: null },
    ],
  });
  const ms2 = crearFakeMs2({
    encontrados: [
      { id: 1, nombre: "Causa limeña", precio: "18.50", disponible: true },
      { id: 5, nombre: "Lomo saltado", precio: "35.00", disponible: true },
    ],
    noEncontrados: [],
  });

  process.env.MS1_BASE_URL = await levantar(ms1);
  process.env.MS2_BASE_URL = await levantar(ms2);
  delete require.cache[require.resolve("../src/config/env")];
  delete require.cache[require.resolve("../src/services/ms1Client")];
  delete require.cache[require.resolve("../src/services/ms2Client")];
  delete require.cache[require.resolve("../src/services/comandaService")];
  const { generarComanda } = require("../src/services/comandaService");

  const comanda = await generarComanda(1);

  assert.strictEqual(comanda.pedidoId, 1);
  assert.strictEqual(comanda.cliente.nombre, "Ana Torres");
  assert.strictEqual(comanda.lineas.length, 2);
  // 18.50*2 + 35.00*1 = 72.00
  assert.strictEqual(comanda.total, 72.0);
  assert.strictEqual(comanda.advertencias.platosNoEncontradosEnMenu, undefined);

  ms1.close();
  ms2.close();
});

test("generarComanda lanza 404 si el pedido no existe en MS1", async () => {
  const ms1 = crearFakeMs1({ pedido: null, detalles: null });
  const ms2 = crearFakeMs2({ encontrados: [], noEncontrados: [] });

  process.env.MS1_BASE_URL = await levantar(ms1);
  process.env.MS2_BASE_URL = await levantar(ms2);
  delete require.cache[require.resolve("../src/config/env")];
  delete require.cache[require.resolve("../src/services/ms1Client")];
  delete require.cache[require.resolve("../src/services/ms2Client")];
  delete require.cache[require.resolve("../src/services/comandaService")];
  const { generarComanda } = require("../src/services/comandaService");

  await assert.rejects(() => generarComanda(999), (err) => {
    assert.strictEqual(err.status, 404);
    return true;
  });

  ms1.close();
  ms2.close();
});

test("generarComanda reporta platos no encontrados en MS2 como advertencia", async () => {
  const ms1 = crearFakeMs1({
    pedido: { id: 2, cliente_id: 2, cliente_nombre: "Luis Ramirez", cliente_email: "luis@x.com", estado: "pendiente", fecha_pedido: "2024-06-02" },
    detalles: [
      { plato_id: 1, cantidad: 1, notas: null },
      { plato_id: 9999, cantidad: 1, notas: null },
    ],
  });
  const ms2 = crearFakeMs2({
    encontrados: [{ id: 1, nombre: "Causa limeña", precio: "18.50", disponible: true }],
    noEncontrados: [9999],
  });

  process.env.MS1_BASE_URL = await levantar(ms1);
  process.env.MS2_BASE_URL = await levantar(ms2);
  delete require.cache[require.resolve("../src/config/env")];
  delete require.cache[require.resolve("../src/services/ms1Client")];
  delete require.cache[require.resolve("../src/services/ms2Client")];
  delete require.cache[require.resolve("../src/services/comandaService")];
  const { generarComanda } = require("../src/services/comandaService");

  const comanda = await generarComanda(2);

  assert.strictEqual(comanda.total, 18.5);
  assert.deepStrictEqual(comanda.advertencias.platosNoEncontradosEnMenu, [9999]);

  ms1.close();
  ms2.close();
});
