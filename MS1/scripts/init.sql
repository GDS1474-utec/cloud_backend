CREATE DATABASE IF NOT EXISTS ms1_clientes_db;
USE ms1_clientes_db;

CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    direccion VARCHAR(200),
    fecha_registro DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    fecha_pedido DATETIME NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedidos_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedido_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    plato_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    notas VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_detalle_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha_pedido);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_detalle_pedido ON pedido_detalle(pedido_id);
CREATE INDEX idx_detalle_plato ON pedido_detalle(plato_id);

INSERT INTO clientes (nombre, email, telefono, direccion, fecha_registro) VALUES
('Ana Torres',     'ana.torres@example.com',    '987654321', 'Av. Larco 456, Miraflores',      '2024-01-10'),
('Luis Ramirez',   'luis.ramirez@example.com',  '912345678', 'Jr. Puno 789, Cercado',          '2024-02-15'),
('Sofia Mendoza',  'sofia.mendoza@example.com', '998877665', 'Calle Bolivar 321, San Isidro',  '2024-03-22'),
('Diego Herrera',  'diego.herrera@example.com', '955443322', 'Av. Arequipa 1500, Lince',       '2024-04-05'),
('Valeria Rios',   'valeria.rios@example.com',  '944332211', 'Jr. Amazonas 250, Breña',        '2024-05-12');

INSERT INTO pedidos (cliente_id, fecha_pedido, estado) VALUES
(1, '2024-06-01 13:30:00', 'entregado'),
(1, '2024-06-15 20:00:00', 'entregado'),
(2, '2024-06-20 19:45:00', 'en preparacion'),
(3, '2024-07-02 12:15:00', 'pendiente'),
(4, '2024-07-10 21:30:00', 'entregado'),
(5, '2024-07-18 14:00:00', 'cancelado');

INSERT INTO pedido_detalle (pedido_id, plato_id, cantidad, notas) VALUES
(1, 1, 2, 'Sin cebolla'),
(1, 46, 1, NULL),
(2, 8, 1, 'Extra picante'),
(2, 18, 2, NULL),
(3, 46, 3, NULL),
(3, 11, 1, 'Termino medio'),
(4, 11, 1, 'Para llevar'),
(4, 18, 2, 'Sin canela'),
(5, 46, 2, 'Sin sal'),
(5, 18, 1, NULL),
(6, 1, 1, NULL),
(6, 46, 1, 'Sin culantro'),
(6, 18, 1, NULL);
