-- =====================================================
-- BASE DE DATOS: Centro de Gestión de Servicios Online
-- GESTOR: MySQL
-- =====================================================

CREATE DATABASE IF NOT EXISTS ServiciosOnline;
USE ServiciosOnline;

-- =====================================================
-- TABLA: usuarios
-- Descripción: Almacena información de usuarios registrados
-- =====================================================
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(15),
    direccion TEXT,
    ciudad VARCHAR(50),
    codigo_postal VARCHAR(10),
    pais VARCHAR(50),
    documento_identidad VARCHAR(20) UNIQUE,
    tipo_usuario ENUM('cliente', 'tecnico', 'admin') DEFAULT 'cliente',
    estado ENUM('activo', 'inactivo', 'suspendido') DEFAULT 'activo',
    foto_perfil VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_tipo_usuario (tipo_usuario)
);

-- =====================================================
-- TABLA: categorias_servicios
-- Descripción: Categorías de servicios disponibles
-- =====================================================
CREATE TABLE categorias_servicios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    icono VARCHAR(255),
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

-- =====================================================
-- TABLA: servicios
-- Descripción: Catálogo de servicios disponibles
-- =====================================================
CREATE TABLE servicios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    categoria_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_base DECIMAL(10, 2) NOT NULL,
    tiempo_estimado INT COMMENT 'en minutos',
    disponibilidad ENUM('disponible', 'no_disponible', 'mantenimiento') DEFAULT 'disponible',
    imagen VARCHAR(255),
    puntuacion_promedio DECIMAL(3, 2) DEFAULT 0,
    total_resenas INT DEFAULT 0,
    crear_por INT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias_servicios(id),
    FOREIGN KEY (crear_por) REFERENCES usuarios(id),
    INDEX idx_categoria (categoria_id),
    INDEX idx_precio (precio_base),
    INDEX idx_disponibilidad (disponibilidad)
);

-- =====================================================
-- TABLA: solicitudes
-- Descripción: Solicitudes/Reservas de servicios
-- =====================================================
CREATE TABLE solicitudes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    servicio_id INT NOT NULL,
    tecnico_id INT,
    numero_solicitud VARCHAR(20) UNIQUE NOT NULL,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_programada DATETIME NOT NULL,
    fecha_completacion DATETIME,
    estado ENUM('pendiente', 'confirmada', 'en_progreso', 'completada', 'cancelada') DEFAULT 'pendiente',
    prioridad ENUM('baja', 'media', 'alta', 'urgente') DEFAULT 'media',
    descripcion_problema TEXT,
    notas_internas TEXT,
    calificacion_usuario INT COMMENT 'Del 1 al 5',
    resena_usuario TEXT,
    costo_final DECIMAL(10, 2),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (servicio_id) REFERENCES servicios(id),
    FOREIGN KEY (tecnico_id) REFERENCES usuarios(id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha_programada (fecha_programada),
    INDEX idx_tecnico (tecnico_id),
    INDEX idx_numero_solicitud (numero_solicitud)
);

-- =====================================================
-- TABLA: pagos
-- Descripción: Registro de pagos y transacciones
-- =====================================================
CREATE TABLE pagos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    solicitud_id INT NOT NULL UNIQUE,
    usuario_id INT NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    metodo_pago ENUM('tarjeta_credito', 'tarjeta_debito', 'transferencia', 'efectivo', 'billetera_digital') NOT NULL,
    numero_transaccion VARCHAR(50) UNIQUE,
    estado_pago ENUM('pendiente', 'procesando', 'completado', 'rechazado', 'reembolsado') DEFAULT 'pendiente',
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATETIME,
    comprobante_url VARCHAR(255),
    comentarios TEXT,
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_estado_pago (estado_pago),
    INDEX idx_fecha_pago (fecha_pago)
);

-- =====================================================
-- TABLA: notificaciones
-- Descripción: Sistema de notificaciones para usuarios
-- =====================================================
CREATE TABLE notificaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo ENUM('info', 'alerta', 'confirmacion', 'error', 'recordatorio') DEFAULT 'info',
    relacionado_a VARCHAR(50) COMMENT 'solicitud, pago, servicio, etc',
    relacionado_id INT,
    leida BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura DATETIME,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_leida (leida),
    INDEX idx_fecha (fecha_creacion)
);

-- =====================================================
-- TABLA: resenas_servicios
-- Descripción: Reseñas y comentarios de servicios
-- =====================================================
CREATE TABLE resenas_servicios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    servicio_id INT NOT NULL,
    usuario_id INT NOT NULL,
    solicitud_id INT,
    calificacion INT NOT NULL COMMENT 'Del 1 al 5',
    titulo VARCHAR(150),
    comentario TEXT,
    fecha_resena TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    util INT DEFAULT 0 COMMENT 'Contador de reseñas útiles',
    estado ENUM('pendiente', 'aprobada', 'rechazada') DEFAULT 'pendiente',
    FOREIGN KEY (servicio_id) REFERENCES servicios(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
    INDEX idx_servicio (servicio_id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_calificacion (calificacion)
);

-- =====================================================
-- TABLA: disponibilidad_tecnicos
-- Descripción: Horarios y disponibilidad de técnicos
-- =====================================================
CREATE TABLE disponibilidad_tecnicos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tecnico_id INT NOT NULL,
    dia_semana ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    numero_slots INT DEFAULT 10 COMMENT 'Solicitudes simultáneas permitidas',
    FOREIGN KEY (tecnico_id) REFERENCES usuarios(id),
    INDEX idx_tecnico (tecnico_id),
    INDEX idx_dia_semana (dia_semana)
);

-- =====================================================
-- TABLA: reportes_sistema
-- Descripción: Reportes generados por usuarios y admin
-- =====================================================
CREATE TABLE reportes_sistema (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    tipo_reporte ENUM('resumen_solicitudes', 'estado_pagos', 'servicios_utilizados', 'gastos_mensuales', 'rendimiento_tecnicos') NOT NULL,
    fecha_desde DATE,
    fecha_hasta DATE,
    formato ENUM('pdf', 'excel', 'csv') DEFAULT 'pdf',
    url_descarga VARCHAR(255),
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_fecha (fecha_generacion)
);

-- =====================================================
-- TABLA: historial_cambios
-- Descripción: Auditoría de cambios en solicitudes
-- =====================================================
CREATE TABLE historial_cambios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    solicitud_id INT NOT NULL,
    usuario_id INT NOT NULL,
    campo_modificado VARCHAR(100),
    valor_anterior VARCHAR(255),
    valor_nuevo VARCHAR(255),
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_solicitud (solicitud_id),
    INDEX idx_fecha (fecha_cambio)
);

-- =====================================================
-- TABLA: tickets_soporte
-- Descripción: Sistema de soporte y ayuda
-- =====================================================
CREATE TABLE tickets_soporte (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria ENUM('tecnico', 'pago', 'cuenta', 'general', 'queja', 'sugerencia') DEFAULT 'general',
    prioridad ENUM('baja', 'media', 'alta', 'urgente') DEFAULT 'media',
    estado ENUM('abierto', 'en_revision', 'en_progreso', 'resuelto', 'cerrado') DEFAULT 'abierto',
    asignado_a INT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion DATETIME,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (asignado_a) REFERENCES usuarios(id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_estado (estado),
    INDEX idx_prioridad (prioridad)
);

-- =====================================================
-- Crear índices adicionales para optimización
-- =====================================================
ALTER TABLE usuarios ADD INDEX idx_documento (documento_identidad);
ALTER TABLE servicios ADD INDEX idx_nombre (nombre);
ALTER TABLE solicitudes ADD INDEX idx_usuario_estado (usuario_id, estado);
ALTER TABLE pagos ADD INDEX idx_metodo_pago (metodo_pago);
ALTER TABLE notificaciones ADD INDEX idx_usuario_tipo (usuario_id, tipo);

-- =====================================================
-- INSERCIONES DE DATOS DE EJEMPLO
-- =====================================================

-- Insertar categorías de servicios
INSERT INTO categorias_servicios (nombre, descripcion) VALUES
('Reparación Electrónica', 'Reparación de equipos electrónicos'),
('Plomería', 'Servicios de plomería e instalación'),
('Electricidad', 'Servicios eléctricos y mantenimiento'),
('Limpieza', 'Servicios de limpieza profesional'),
('Jardinería', 'Mantenimiento y diseño de jardines'),
('Carpintería', 'Trabajos de carpintería y mueblería');

-- Insertar usuarios de ejemplo
INSERT INTO usuarios (username, email, password, nombre, apellido, telefono, tipo_usuario, documento_identidad) VALUES
('admin', 'admin@servicios.com', SHA2('admin123', 256), 'Administrador', 'Sistema', '1234567890', 'admin', '0000000000'),
('juan_cliente', 'juan@email.com', SHA2('cliente123', 256), 'Juan', 'Pérez', '3001234567', 'cliente', '12345678'),
('maria_tecnico', 'maria@email.com', SHA2('tecnico123', 256), 'María', 'García', '3009876543', 'tecnico', '87654321');

-- Insertar servicios de ejemplo
INSERT INTO servicios (categoria_id, nombre, descripcion, precio_base, tiempo_estimado, disponibilidad, crear_por) VALUES
(1, 'Reparación TV LCD', 'Reparación de televisores LCD de cualquier tamaño', 150.00, 60, 'disponible', 1),
(2, 'Destapación de Tuberías', 'Destapación profesional de tuberías obstruidas', 80.00, 45, 'disponible', 1),
(3, 'Instalación Eléctrica', 'Instalación de circuitos y enchufes', 120.00, 120, 'disponible', 1),
(4, 'Limpieza Profunda', 'Limpieza completa del hogar', 200.00, 180, 'disponible', 1);