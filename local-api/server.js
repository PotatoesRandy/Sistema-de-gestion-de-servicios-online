const http = require("http");
const { execFile } = require("child_process");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 8080);
const MYSQL = process.env.MYSQL_BIN || "C:\\xampp\\mysql\\bin\\mysql.exe";
const DB = process.env.DB_NAME || "ServiciosOnline";

function send(res, status, data) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(data === null ? "" : JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("JSON invalido."));
      }
    });
    req.on("error", reject);
  });
}

function sqlValue(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function runSql(query) {
  return new Promise((resolve, reject) => {
    execFile(
      MYSQL,
      ["--protocol", "TCP", "--host", "127.0.0.1", "--port", "3306", "--user", "root", "--default-character-set=utf8mb4", "--batch", "--raw", "--skip-column-names", DB, "--execute", query],
      { windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error((stderr || error.message).trim()));
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

function parseRows(output, columns) {
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(columns.map((column, index) => [column, values[index] === "NULL" ? null : values[index]]));
  });
}

function numberOrNull(value) {
  return value === null || value === undefined || value === "" ? null : Number(value);
}

function userDto(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    password: row.password,
    nombre: row.nombre,
    apellido: row.apellido,
    telefono: row.telefono || "",
    direccion: row.direccion,
    ciudad: row.ciudad,
    codigoPostal: row.codigo_postal,
    pais: row.pais,
    documentoIdentidad: row.documento_identidad,
    tipoUsuario: row.tipo_usuario,
    estado: row.estado,
    fechaRegistro: row.fecha_registro,
  };
}

function sanitizeUser(row) {
  const user = userDto(row);
  if (user) delete user.password;
  return user;
}

async function getUsers() {
  const columns = ["id", "username", "email", "password", "nombre", "apellido", "telefono", "direccion", "ciudad", "codigo_postal", "pais", "documento_identidad", "tipo_usuario", "estado", "fecha_registro"];
  const rows = parseRows(await runSql(`SELECT ${columns.join(", ")} FROM usuarios ORDER BY id`), columns);
  return rows.map(userDto);
}

async function getCategories() {
  const columns = ["id", "nombre", "descripcion", "icono", "estado", "fecha_creacion"];
  const rows = parseRows(await runSql(`SELECT ${columns.join(", ")} FROM categorias_servicios ORDER BY id`), columns);
  return rows.map((row) => ({
    id: Number(row.id),
    nombre: row.nombre,
    descripcion: row.descripcion,
    icono: row.icono,
    estado: row.estado,
    fechaCreacion: row.fecha_creacion,
  }));
}

async function getServices() {
  const columns = ["id", "categoria_id", "categoria_nombre", "nombre", "descripcion", "precio_base", "tiempo_estimado", "disponibilidad", "imagen", "puntuacion_promedio", "total_resenas"];
  const rows = parseRows(await runSql(`
    SELECT s.id, s.categoria_id, c.nombre, s.nombre, s.descripcion, s.precio_base, s.tiempo_estimado,
           s.disponibilidad, s.imagen, s.puntuacion_promedio, s.total_resenas
    FROM servicios s
    LEFT JOIN categorias_servicios c ON c.id = s.categoria_id
    WHERE s.disponibilidad <> 'no_disponible'
    ORDER BY s.id
  `), columns);
  return rows.map((row) => ({
    id: Number(row.id),
    categoria: row.categoria_id ? { id: Number(row.categoria_id), nombre: row.categoria_nombre } : null,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precioBase: Number(row.precio_base || 0),
    tiempoEstimado: numberOrNull(row.tiempo_estimado),
    disponibilidad: row.disponibilidad,
    imagen: row.imagen,
    puntuacionPromedio: Number(row.puntuacion_promedio || 0),
    totalResenas: Number(row.total_resenas || 0),
  }));
}

async function getSolicitudes() {
  const columns = ["id", "usuario_id", "usuario_nombre", "usuario_apellido", "servicio_id", "servicio_nombre", "tecnico_id", "tecnico_nombre", "tecnico_apellido", "numero_solicitud", "fecha_programada", "estado", "prioridad", "descripcion_problema", "ubicacion_texto", "latitud", "longitud", "notas_internas", "costo_final"];
  const rows = parseRows(await runSql(`
    SELECT so.id, so.usuario_id, u.nombre, u.apellido, so.servicio_id, se.nombre,
           so.tecnico_id, t.nombre, t.apellido, so.numero_solicitud, so.fecha_programada,
           so.estado, so.prioridad, so.descripcion_problema, so.ubicacion_texto, so.latitud, so.longitud, so.notas_internas, so.costo_final
    FROM solicitudes so
    LEFT JOIN usuarios u ON u.id = so.usuario_id
    LEFT JOIN usuarios t ON t.id = so.tecnico_id
    LEFT JOIN servicios se ON se.id = so.servicio_id
    ORDER BY so.id DESC
  `), columns);
  return rows.map((row) => ({
    id: Number(row.id),
    usuario: { id: Number(row.usuario_id), nombre: row.usuario_nombre, apellido: row.usuario_apellido },
    servicio: { id: Number(row.servicio_id), nombre: row.servicio_nombre },
    tecnico: row.tecnico_id ? { id: Number(row.tecnico_id), nombre: row.tecnico_nombre, apellido: row.tecnico_apellido } : null,
    numeroSolicitud: row.numero_solicitud,
    fechaProgramada: row.fecha_programada,
    estado: row.estado,
    prioridad: row.prioridad,
    descripcionProblema: row.descripcion_problema,
    ubicacionTexto: row.ubicacion_texto,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
    motivoCancelacion: row.notas_internas,
    costoFinal: Number(row.costo_final || 0),
  }));
}

async function getPagos() {
  const columns = ["id", "solicitud_id", "numero_solicitud", "usuario_id", "monto", "metodo_pago", "numero_transaccion", "estado_pago", "fecha_pago"];
  const rows = parseRows(await runSql(`
    SELECT p.id, p.solicitud_id, s.numero_solicitud, p.usuario_id, p.monto, p.metodo_pago,
           p.numero_transaccion, p.estado_pago, p.fecha_pago
    FROM pagos p
    LEFT JOIN solicitudes s ON s.id = p.solicitud_id
    ORDER BY p.id DESC
  `), columns);
  return rows.map((row) => ({
    id: Number(row.id),
    solicitud: { id: Number(row.solicitud_id), numeroSolicitud: row.numero_solicitud },
    usuario: { id: Number(row.usuario_id) },
    monto: Number(row.monto || 0),
    metodoPago: row.metodo_pago,
    numeroTransaccion: row.numero_transaccion,
    estadoPago: row.estado_pago,
    fechaPago: row.fecha_pago,
  }));
}

async function getNotificaciones() {
  const columns = ["id", "usuario_id", "titulo", "mensaje", "tipo", "relacionado_a", "relacionado_id", "leida", "fecha_creacion"];
  const rows = parseRows(await runSql(`SELECT ${columns.join(", ")} FROM notificaciones ORDER BY id DESC`), columns);
  return rows.map((row) => ({
    id: Number(row.id),
    usuario: { id: Number(row.usuario_id) },
    titulo: row.titulo,
    mensaje: row.mensaje,
    tipo: row.tipo,
    relacionadoA: row.relacionado_a,
    relacionadoId: numberOrNull(row.relacionado_id),
    leida: row.leida === "1",
    fechaCreacion: row.fecha_creacion,
  }));
}

async function getResenas() {
  const columns = ["id", "servicio_id", "servicio_nombre", "usuario_id", "solicitud_id", "calificacion", "titulo", "comentario", "estado", "fecha_resena"];
  const rows = parseRows(await runSql(`
    SELECT r.id, r.servicio_id, s.nombre, r.usuario_id, r.solicitud_id, r.calificacion,
           r.titulo, r.comentario, r.estado, r.fecha_resena
    FROM resenas_servicios r
    LEFT JOIN servicios s ON s.id = r.servicio_id
    ORDER BY r.id DESC
  `), columns);
  return rows.map((row) => ({
    id: Number(row.id),
    servicio: { id: Number(row.servicio_id), nombre: row.servicio_nombre },
    usuario: { id: Number(row.usuario_id) },
    solicitud: row.solicitud_id ? { id: Number(row.solicitud_id) } : null,
    calificacion: Number(row.calificacion),
    titulo: row.titulo,
    comentario: row.comentario,
    estado: row.estado,
    fechaResena: row.fecha_resena,
  }));
}

async function getDisponibilidad() {
  const columns = ["id", "tecnico_id", "nombre", "apellido", "dia_semana", "hora_inicio", "hora_fin", "numero_slots"];
  const rows = parseRows(await runSql(`
    SELECT d.id, d.tecnico_id, u.nombre, u.apellido, d.dia_semana, d.hora_inicio, d.hora_fin, d.numero_slots
    FROM disponibilidad_tecnicos d
    LEFT JOIN usuarios u ON u.id = d.tecnico_id
    ORDER BY d.id
  `), columns);
  return rows.map((row) => ({
    id: Number(row.id),
    tecnico: { id: Number(row.tecnico_id), nombre: row.nombre, apellido: row.apellido },
    diaSemana: row.dia_semana,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
    numeroSlots: Number(row.numero_slots || 0),
  }));
}

async function getReportes() {
  const columns = ["id", "usuario_id", "tipo_reporte", "fecha_desde", "fecha_hasta", "formato", "url_descarga", "fecha_generacion"];
  const rows = parseRows(await runSql(`SELECT ${columns.join(", ")} FROM reportes_sistema ORDER BY id DESC`), columns);
  return rows.map((row) => ({
    id: Number(row.id),
    usuario: { id: Number(row.usuario_id) },
    tipoReporte: row.tipo_reporte,
    fechaDesde: row.fecha_desde,
    fechaHasta: row.fecha_hasta,
    formato: row.formato,
    urlDescarga: row.url_descarga,
    fechaGeneracion: row.fecha_generacion,
  }));
}

async function handleGet(path, res) {
  const routes = {
    "/api/health": async () => ({ status: "ok", service: "ayuntamiento-online-local-api" }),
    "/api/usuarios": async () => (await getUsers()).map((user) => ({ ...user, password: undefined })),
    "/api/categorias": getCategories,
    "/api/servicios": getServices,
    "/api/solicitudes": getSolicitudes,
    "/api/pagos": getPagos,
    "/api/notificaciones": getNotificaciones,
    "/api/resenas": getResenas,
    "/api/disponibilidad-tecnicos": getDisponibilidad,
    "/api/reportes": getReportes,
    "/api/historial-cambios": async () => [],
    "/api/tickets-soporte": async () => [],
  };
  if (!routes[path]) return send(res, 404, { message: "Ruta no encontrada." });
  send(res, 200, await routes[path]());
}

async function handlePost(path, req, res) {
  const body = await readBody(req);
  if (path === "/api/auth/login") {
    const columns = ["id", "username", "email", "password", "nombre", "apellido", "telefono", "direccion", "ciudad", "codigo_postal", "pais", "documento_identidad", "tipo_usuario", "estado", "fecha_registro"];
    const rows = parseRows(await runSql(`SELECT ${columns.join(", ")} FROM usuarios WHERE username = ${sqlValue(body.username)} LIMIT 1`), columns);
    const user = rows[0];
    if (!user || (user.password !== body.password && user.password.toLowerCase() !== sha256(body.password))) {
      return send(res, 404, { message: "Usuario o contrasena incorrectos." });
    }
    return send(res, 200, { message: "Inicio de sesion correcto", usuario: sanitizeUser(user) });
  }

  if (path === "/api/auth/register") {
    await runSql(`
      INSERT INTO usuarios (username, email, password, nombre, apellido, telefono, tipo_usuario, estado)
      VALUES (${sqlValue(body.username)}, ${sqlValue(body.email)}, ${sqlValue(sha256(body.password))},
              ${sqlValue(body.nombre)}, ${sqlValue(body.apellido)}, ${sqlValue(body.telefono)}, 'cliente', 'activo')
    `);
    const users = await getUsers();
    return send(res, 201, { message: "Registro correcto", usuario: sanitizeUser(users.at(-1)) });
  }

  if (path === "/api/servicios") {
    const creator = (await getUsers()).find((user) => user.id === Number(body.crearPor?.id));
    if (!creator || creator.tipoUsuario !== "admin") {
      return send(res, 403, { message: "Solo el administrador puede crear servicios." });
    }
    const duplicatedService = parseRows(await runSql(`
      SELECT COUNT(*) AS total
      FROM servicios
      WHERE LOWER(nombre) = LOWER(${sqlValue(body.nombre)})
    `), ["total"])[0];
    if (Number(duplicatedService?.total || 0) > 0) {
      return send(res, 409, { message: "Ya existe un servicio con ese nombre." });
    }
    await runSql(`
      INSERT INTO servicios (categoria_id, nombre, descripcion, precio_base, tiempo_estimado, disponibilidad, crear_por)
      VALUES (${sqlValue(body.categoria?.id)}, ${sqlValue(body.nombre)}, ${sqlValue(body.descripcion)},
              0, ${sqlValue(body.tiempoEstimado)},
              ${sqlValue(body.disponibilidad || "disponible")}, ${sqlValue(creator.id)})
    `);
    const services = await getServices();
    return send(res, 201, services.at(-1));
  }

  if (path === "/api/solicitudes") {
    const numero = `SOL-${Date.now()}`;
    const fechaProgramada = String(body.fechaProgramada).replace("T", " ");
    const columns = ["total"];
    const duplicated = parseRows(await runSql(`
      SELECT COUNT(*) AS total
      FROM solicitudes
      WHERE servicio_id = ${sqlValue(body.servicio?.id)}
        AND fecha_programada = ${sqlValue(fechaProgramada)}
        AND estado <> 'cancelada'
    `), columns)[0];
    if (Number(duplicated?.total || 0) > 0) {
      return send(res, 409, { message: "Ya existe una solicitud para ese servicio en la misma fecha y hora." });
    }
    await runSql(`
      INSERT INTO solicitudes (usuario_id, servicio_id, tecnico_id, numero_solicitud, fecha_programada, estado, prioridad, descripcion_problema, ubicacion_texto, latitud, longitud, costo_final)
      VALUES (${sqlValue(body.usuario?.id)}, ${sqlValue(body.servicio?.id)}, ${sqlValue(body.tecnico?.id)}, ${sqlValue(numero)},
              ${sqlValue(fechaProgramada)}, ${sqlValue(body.estado || "pendiente")},
              ${sqlValue(body.prioridad || "media")}, ${sqlValue(body.descripcionProblema)}, ${sqlValue(body.ubicacionTexto)}, ${sqlValue(body.latitud)}, ${sqlValue(body.longitud)}, 0)
    `);
    return send(res, 201, (await getSolicitudes())[0]);
  }

  if (path === "/api/notificaciones") {
    await runSql(`
      INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, relacionado_a, relacionado_id, leida)
      VALUES (${sqlValue(body.usuario?.id)}, ${sqlValue(body.titulo)}, ${sqlValue(body.mensaje)},
              ${sqlValue(body.tipo || "info")}, ${sqlValue(body.relacionadoA)}, ${sqlValue(body.relacionadoId)}, 0)
    `);
    return send(res, 201, (await getNotificaciones())[0]);
  }

  if (path === "/api/pagos") {
    await runSql(`
      INSERT INTO pagos (solicitud_id, usuario_id, monto, metodo_pago, numero_transaccion, estado_pago)
      VALUES (${sqlValue(body.solicitud?.id)}, ${sqlValue(body.usuario?.id)}, ${sqlValue(body.monto)},
              ${sqlValue(body.metodoPago)}, ${sqlValue(body.numeroTransaccion)}, ${sqlValue(body.estadoPago || "pendiente")})
    `);
    return send(res, 201, (await getPagos())[0]);
  }

  if (path === "/api/resenas") {
    await runSql(`
      INSERT INTO resenas_servicios (servicio_id, usuario_id, solicitud_id, calificacion, titulo, comentario, estado)
      VALUES (${sqlValue(body.servicio?.id)}, ${sqlValue(body.usuario?.id)}, ${sqlValue(body.solicitud?.id)},
              ${sqlValue(body.calificacion)}, ${sqlValue(body.titulo)}, ${sqlValue(body.comentario)}, ${sqlValue(body.estado || "pendiente")})
    `);
    return send(res, 201, (await getResenas())[0]);
  }

  if (path === "/api/reportes") {
    await runSql(`
      INSERT INTO reportes_sistema (usuario_id, tipo_reporte, fecha_desde, fecha_hasta, formato)
      VALUES (${sqlValue(body.usuario?.id)}, ${sqlValue(body.tipoReporte)}, ${sqlValue(body.fechaDesde)},
              ${sqlValue(body.fechaHasta)}, ${sqlValue(body.formato || "pantalla")})
    `);
    return send(res, 201, (await getReportes())[0]);
  }

  send(res, 404, { message: "Ruta no encontrada." });
}

async function handlePut(path, req, res) {
  const acceptMatch = path.match(/^\/api\/solicitudes\/(\d+)\/aceptar$/);
  if (acceptMatch) {
    const id = Number(acceptMatch[1]);
    const body = await readBody(req);
    const user = (await getUsers()).find((item) => item.id === Number(body.usuarioId));
    if (!user) return send(res, 404, { message: "Usuario no encontrado." });
    if (user.tipoUsuario !== "admin") {
      return send(res, 403, { message: "No tienes permiso para aceptar esta solicitud." });
    }

    const columns = ["id", "estado"];
    const solicitud = parseRows(await runSql(`
      SELECT id, estado
      FROM solicitudes
      WHERE id = ${sqlValue(id)}
      LIMIT 1
    `), columns)[0];
    if (!solicitud) return send(res, 404, { message: "Solicitud no encontrada." });
    if (solicitud.estado === "cancelada") {
      return send(res, 409, { message: "La solicitud esta cancelada." });
    }
    if (solicitud.estado === "completada") {
      return send(res, 409, { message: "La solicitud esta completada." });
    }

    await runSql(`
      UPDATE solicitudes
      SET estado = 'confirmada',
          notas_internas = NULL
      WHERE id = ${sqlValue(id)}
    `);
    const updated = (await getSolicitudes()).find((item) => item.id === id);
    return send(res, 200, updated);
  }

  const cancelMatch = path.match(/^\/api\/solicitudes\/(\d+)\/cancelar$/);
  if (cancelMatch) {
    const id = Number(cancelMatch[1]);
    const body = await readBody(req);
    const user = (await getUsers()).find((item) => item.id === Number(body.usuarioId));
    if (!user) return send(res, 404, { message: "Usuario no encontrado." });
    if (!body.motivo || !String(body.motivo).trim()) {
      return send(res, 400, { message: "Debes justificar la cancelacion." });
    }

    const columns = ["id", "usuario_id", "estado"];
    const solicitud = parseRows(await runSql(`
      SELECT id, usuario_id, estado
      FROM solicitudes
      WHERE id = ${sqlValue(id)}
      LIMIT 1
    `), columns)[0];
    if (!solicitud) return send(res, 404, { message: "Solicitud no encontrada." });
    if (solicitud.estado === "cancelada") {
      return send(res, 409, { message: "La solicitud ya esta cancelada." });
    }
    if (solicitud.estado === "completada") {
      return send(res, 409, { message: "No se puede cancelar una solicitud completada." });
    }
    if (user.tipoUsuario !== "admin" && Number(solicitud.usuario_id) !== user.id) {
      return send(res, 403, { message: "No tienes permiso para cancelar esta solicitud." });
    }

    const actor = user.tipoUsuario === "admin" ? "Administrador" : "Cliente";
    await runSql(`
      UPDATE solicitudes
      SET estado = 'cancelada',
          notas_internas = ${sqlValue(`${actor} ${user.nombre} ${user.apellido}: ${String(body.motivo).trim()}`)}
      WHERE id = ${sqlValue(id)}
    `);
    const updated = (await getSolicitudes()).find((item) => item.id === id);
    return send(res, 200, updated);
  }

  const match = path.match(/^\/api\/usuarios\/(\d+)$/);
  if (!match) return send(res, 404, { message: "Ruta no encontrada." });
  const id = Number(match[1]);
  const body = await readBody(req);
  await runSql(`
    UPDATE usuarios SET
      username = ${sqlValue(body.username)},
      email = ${sqlValue(body.email)},
      nombre = ${sqlValue(body.nombre)},
      apellido = ${sqlValue(body.apellido)},
      telefono = ${sqlValue(body.telefono)},
      direccion = ${sqlValue(body.direccion)},
      ciudad = ${sqlValue(body.ciudad)}
    WHERE id = ${sqlValue(id)}
  `);
  const user = (await getUsers()).find((item) => item.id === id);
  send(res, 200, sanitizeUser(user));
}

async function handleDelete(path, req, res) {
  const reviewMatch = path.match(/^\/api\/resenas\/(\d+)$/);
  if (reviewMatch) {
    const id = Number(reviewMatch[1]);
    const body = await readBody(req);
    const user = (await getUsers()).find((item) => item.id === Number(body.usuarioId));
    if (!user) return send(res, 404, { message: "Usuario no encontrado." });

    const review = parseRows(await runSql(`
      SELECT id, usuario_id
      FROM resenas_servicios
      WHERE id = ${sqlValue(id)}
      LIMIT 1
    `), ["id", "usuario_id"])[0];
    if (!review) return send(res, 404, { message: "Opinion no encontrada." });
    if (user.tipoUsuario !== "admin" && Number(review.usuario_id) !== user.id) {
      return send(res, 403, { message: "No tienes permiso para eliminar esta opinion." });
    }

    await runSql(`DELETE FROM resenas_servicios WHERE id = ${sqlValue(id)}`);
    return send(res, 200, { message: "Opinion eliminada correctamente." });
  }

  const reportMatch = path.match(/^\/api\/reportes\/(\d+)$/);
  if (reportMatch) {
    const id = Number(reportMatch[1]);
    const body = await readBody(req);
    const user = (await getUsers()).find((item) => item.id === Number(body.usuarioId));
    if (!user) return send(res, 404, { message: "Usuario no encontrado." });

    const report = parseRows(await runSql(`
      SELECT id, usuario_id
      FROM reportes_sistema
      WHERE id = ${sqlValue(id)}
      LIMIT 1
    `), ["id", "usuario_id"])[0];
    if (!report) return send(res, 404, { message: "Reporte no encontrado." });
    if (user.tipoUsuario !== "admin" && Number(report.usuario_id) !== user.id) {
      return send(res, 403, { message: "No tienes permiso para eliminar este reporte." });
    }

    await runSql(`DELETE FROM reportes_sistema WHERE id = ${sqlValue(id)}`);
    return send(res, 200, { message: "Reporte eliminado correctamente." });
  }

  const serviceMatch = path.match(/^\/api\/servicios\/(\d+)$/);
  if (serviceMatch) {
    const id = Number(serviceMatch[1]);
    const body = await readBody(req);
    const user = (await getUsers()).find((item) => item.id === Number(body.usuarioId));
    if (!user) return send(res, 404, { message: "Usuario no encontrado." });
    if (user.tipoUsuario !== "admin") {
      return send(res, 403, { message: "Solo el administrador puede quitar servicios." });
    }

    const service = parseRows(await runSql(`
      SELECT id
      FROM servicios
      WHERE id = ${sqlValue(id)}
      LIMIT 1
    `), ["id"])[0];
    if (!service) return send(res, 404, { message: "Servicio no encontrado." });

    await runSql(`
      UPDATE servicios
      SET disponibilidad = 'no_disponible'
      WHERE id = ${sqlValue(id)}
    `);
    return send(res, 200, { message: "Servicio quitado correctamente." });
  }

  const match = path.match(/^\/api\/solicitudes\/(\d+)$/);
  if (!match) return send(res, 404, { message: "Ruta no encontrada." });
  const id = Number(match[1]);
  const body = await readBody(req);
  const user = (await getUsers()).find((item) => item.id === Number(body.usuarioId));
  if (!user) return send(res, 404, { message: "Usuario no encontrado." });

  const columns = ["id", "usuario_id", "estado"];
  const solicitud = parseRows(await runSql(`
    SELECT id, usuario_id, estado
    FROM solicitudes
    WHERE id = ${sqlValue(id)}
    LIMIT 1
  `), columns)[0];
  if (!solicitud) return send(res, 404, { message: "Solicitud no encontrada." });
  if (solicitud.estado !== "cancelada") {
    return send(res, 409, { message: "Solo se pueden eliminar solicitudes canceladas." });
  }
  if (user.tipoUsuario !== "admin" && Number(solicitud.usuario_id) !== user.id) {
    return send(res, 403, { message: "No tienes permiso para eliminar esta solicitud." });
  }

  await runSql(`DELETE FROM solicitudes WHERE id = ${sqlValue(id)}`);
  send(res, 200, { message: "Solicitud eliminada correctamente." });
}

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;
  try {
    if (req.method === "OPTIONS") return send(res, 204, null);
    if (req.method === "GET") return await handleGet(path, res);
    if (req.method === "POST") return await handlePost(path, req, res);
    if (req.method === "PUT") return await handlePut(path, req, res);
    if (req.method === "DELETE") return await handleDelete(path, req, res);
    send(res, 405, { message: "Metodo no permitido." });
  } catch (error) {
    send(res, 500, { message: error.message || "Error interno." });
  }
});

server.listen(PORT, () => {
  console.log(`API local lista en http://localhost:${PORT}/api`);
});
