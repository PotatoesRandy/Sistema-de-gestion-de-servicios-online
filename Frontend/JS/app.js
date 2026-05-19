const API_BASE = localStorage.getItem("apiBase") || "http://localhost:8080/api";

const state = {
  usuarios: [],
  categorias: [],
  servicios: [],
  solicitudes: [],
  pagos: [],
  notificaciones: [],
  resenas: [],
  reportes: [],
  disponibilidad: [],
};

const routes = {
  usuarios: "/usuarios",
  categorias: "/categorias",
  servicios: "/servicios",
  solicitudes: "/solicitudes",
  pagos: "/pagos",
  notificaciones: "/notificaciones",
  resenas: "/resenas",
  reportes: "/reportes",
  disponibilidad: "/disponibilidad-tecnicos",
};

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function money(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(amount);
}

function dateTime(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function todayInput(days = 1) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"));
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function requireUser() {
  const user = getUser();
  if (!user) {
    window.location.href = "Login.html";
    return null;
  }
  return user;
}

function showMessage(target, text, type = "success") {
  const el = typeof target === "string" ? qs(target) : target;
  if (!el) return;
  el.textContent = text;
  el.className = `message show ${type}`;
}

function clearMessage(target) {
  const el = typeof target === "string" ? qs(target) : target;
  if (!el) return;
  el.textContent = "";
  el.className = "message";
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || "No se pudo completar la operacion.");
  }
  return data;
}

async function loadResource(name) {
  try {
    state[name] = await api(routes[name]);
  } catch (error) {
    state[name] = [];
    throw error;
  }
}

async function loadAll(showTarget = "#pageMessage") {
  const names = Object.keys(routes);
  const results = await Promise.allSettled(names.map((name) => loadResource(name)));
  const failed = results.find((result) => result.status === "rejected");
  if (failed && showTarget) {
    showMessage(showTarget, "La API esta activa, pero la base de datos no respondio. Enciende MySQL y carga Database.sql para ver datos reales.", "error");
  }
}

function setupShell(activePage) {
  const user = requireUser();
  if (!user) return null;

  qsa("[data-current-name]").forEach((el) => {
    el.textContent = `${user.nombre || ""} ${user.apellido || ""}`.trim() || user.username;
  });
  qsa("[data-current-role]").forEach((el) => {
    el.textContent = user.tipoUsuario || "cliente";
  });
  qsa("nav a").forEach((link) => {
    if (link.getAttribute("href") === activePage) link.classList.add("active");
    if (link.dataset.logout === "true") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        localStorage.removeItem("currentUser");
        window.location.href = "Login.html";
      });
    }
  });
  return user;
}

function dashboardLayout(activePage, title, subtitle, body) {
  document.body.innerHTML = `
    <div class="dashboard">
      <aside class="sidebar">
        <div>
          <h2>Servicios Online</h2>
          <div class="user-card">
            <p><strong>Usuario:</strong> <span data-current-name></span></p>
            <p><strong>Rol:</strong> <span data-current-role></span></p>
          </div>
        </div>
        <div>
          <p class="section-title">Navegacion</p>
          <nav>
            <a href="Inicio.html">Inicio</a>
            <a href="Servicios.html">Servicios</a>
            <a href="Solicitudes.html">Solicitudes</a>
            <a href="Pagos.html">Pagos</a>
            <a href="Resenas.html">Resenas</a>
            <a href="Reportes.html">Reportes</a>
            <a href="Perfil.html">Perfil</a>
            <a href="Login.html" data-logout="true">Cerrar sesion</a>
          </nav>
        </div>
      </aside>
      <main class="main">
        <header>
          <div>
            <h1>${title}</h1>
            <p>${subtitle}</p>
          </div>
          <a class="button secondary" href="Servicios.html">Nuevo servicio</a>
        </header>
        <div id="pageMessage" class="message"></div>
        ${body}
      </main>
    </div>`;
  return setupShell(activePage);
}

function optionList(items, label, empty = "Seleccione") {
  return `<option value="">${empty}</option>${items.map((item) => `<option value="${item.id}">${label(item)}</option>`).join("")}`;
}

function findById(items, id) {
  return items.find((item) => String(item.id) === String(id));
}

async function initLogin() {
  if (getUser()) window.location.href = "Inicio.html";
  qs("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage("#authMessage");
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setUser(result.usuario);
      window.location.href = "Inicio.html";
    } catch (error) {
      showMessage("#authMessage", error.message, "error");
    }
  });
}

async function initRegistro() {
  qs("#registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage("#authMessage");
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setUser(result.usuario);
      window.location.href = "Inicio.html";
    } catch (error) {
      showMessage("#authMessage", error.message, "error");
    }
  });
}

async function initInicio() {
  const user = dashboardLayout("Inicio.html", "Inicio", "Resumen de actividad, solicitudes y pagos.", `
    <section class="stats">
      <div class="card"><span class="muted">Servicios</span><span class="stat-value" id="statServicios">0</span></div>
      <div class="card"><span class="muted">Solicitudes</span><span class="stat-value" id="statSolicitudes">0</span></div>
      <div class="card"><span class="muted">Pagos</span><span class="stat-value" id="statPagos">0</span></div>
      <div class="card"><span class="muted">Notificaciones</span><span class="stat-value" id="statNotificaciones">0</span></div>
    </section>
    <section class="content-grid" style="margin-top:16px">
      <div class="panel">
        <h2>Servicios disponibles</h2>
        <div class="list" id="homeServicios"></div>
      </div>
      <div class="panel">
        <h2>Notificaciones</h2>
        <div class="list" id="homeNotificaciones"></div>
      </div>
    </section>`);
  if (!user) return;
  await loadAll();
  qs("#statServicios").textContent = state.servicios.length;
  qs("#statSolicitudes").textContent = state.solicitudes.filter((item) => item.usuario?.id === user.id).length;
  qs("#statPagos").textContent = state.pagos.filter((item) => item.usuario?.id === user.id).length;
  qs("#statNotificaciones").textContent = state.notificaciones.filter((item) => item.usuario?.id === user.id && !item.leida).length;
  renderServicios("#homeServicios", state.servicios.slice(0, 4), false);
  renderNotificaciones("#homeNotificaciones", state.notificaciones.filter((item) => item.usuario?.id === user.id).slice(0, 5));
}

function renderServicios(target, servicios, withAction = true) {
  qs(target).innerHTML = servicios.length ? servicios.map((servicio) => `
    <article class="item">
      <div class="item-head">
        <div>
          <h3>${servicio.nombre}</h3>
          <p class="muted">${servicio.descripcion || "Sin descripcion"}</p>
        </div>
        <span class="badge">${servicio.disponibilidad || "disponible"}</span>
      </div>
      <p><strong>Categoria:</strong> ${servicio.categoria?.nombre || "Sin categoria"}</p>
      <p><strong>Tiempo:</strong> ${servicio.tiempoEstimado || 0} min</p>
      <p class="price">${money(servicio.precioBase)}</p>
      ${withAction ? `<div class="actions"><button data-service-id="${servicio.id}" class="request-service">Solicitar</button></div>` : ""}
    </article>`).join("") : `<p class="muted">No hay servicios disponibles.</p>`;
}

async function initServicios() {
  const user = dashboardLayout("Servicios.html", "Servicios disponibles", "Consulta categorias y solicita atencion tecnica.", `
    <div class="toolbar">
      <select id="categoryFilter"></select>
      <input id="serviceSearch" placeholder="Buscar servicio">
    </div>
    <section class="content-grid">
      <div class="panel">
        <h2>Catalogo</h2>
        <div class="list" id="servicesList"></div>
      </div>
      <form class="panel" id="requestForm">
        <h2>Solicitar servicio</h2>
        <div class="form-row">
          <label>Servicio</label>
          <select name="servicioId" id="requestService" required></select>
        </div>
        <div class="form-row">
          <label>Fecha programada</label>
          <input name="fechaProgramada" type="datetime-local" required>
        </div>
        <div class="form-row">
          <label>Prioridad</label>
          <select name="prioridad">
            <option value="media">Media</option>
            <option value="baja">Baja</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div class="form-row">
          <label>Descripcion del problema</label>
          <textarea name="descripcionProblema" required></textarea>
        </div>
        <button type="submit">Crear solicitud</button>
      </form>
    </section>`);
  if (!user) return;
  await loadAll();
  qs("[name='fechaProgramada']").value = todayInput();
  qs("#categoryFilter").innerHTML = optionList(state.categorias, (item) => item.nombre, "Todas las categorias");
  qs("#requestService").innerHTML = optionList(state.servicios, (item) => `${item.nombre} - ${money(item.precioBase)}`);
  renderServiciosPage();

  qs("#categoryFilter").addEventListener("change", renderServiciosPage);
  qs("#serviceSearch").addEventListener("input", renderServiciosPage);
  qs("#servicesList").addEventListener("click", (event) => {
    const button = event.target.closest(".request-service");
    if (button) qs("#requestService").value = button.dataset.serviceId;
  });
  qs("#requestForm").addEventListener("submit", (event) => createSolicitud(event, user));
}

function renderServiciosPage() {
  const category = qs("#categoryFilter").value;
  const search = qs("#serviceSearch").value.toLowerCase();
  const servicios = state.servicios.filter((servicio) => {
    const matchCategory = !category || String(servicio.categoria?.id) === category;
    const matchSearch = !search || `${servicio.nombre} ${servicio.descripcion || ""}`.toLowerCase().includes(search);
    return matchCategory && matchSearch;
  });
  renderServicios("#servicesList", servicios);
}

async function createSolicitud(event, user) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const servicio = findById(state.servicios, data.servicioId);
  const tecnico = state.usuarios.find((item) => item.tipoUsuario === "tecnico");
  try {
    const solicitud = await api("/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        usuario: { id: user.id },
        servicio: { id: Number(data.servicioId) },
        tecnico: tecnico ? { id: tecnico.id } : null,
        fechaProgramada: data.fechaProgramada,
        prioridad: data.prioridad,
        descripcionProblema: data.descripcionProblema,
        estado: tecnico ? "confirmada" : "pendiente",
        costoFinal: servicio?.precioBase || 0,
      }),
    });
    await api("/notificaciones", {
      method: "POST",
      body: JSON.stringify({
        usuario: { id: user.id },
        titulo: "Solicitud creada",
        mensaje: `Tu solicitud ${solicitud.numeroSolicitud} fue registrada correctamente.`,
        tipo: "confirmacion",
        relacionadoA: "solicitud",
        relacionadoId: solicitud.id,
      }),
    });
    showMessage("#pageMessage", "Solicitud creada y notificacion registrada.", "success");
    event.currentTarget.reset();
    qs("[name='fechaProgramada']").value = todayInput();
  } catch (error) {
    showMessage("#pageMessage", error.message, "error");
  }
}

async function initSolicitudes() {
  const user = dashboardLayout("Solicitudes.html", "Mis solicitudes", "Consulta estados, tecnicos asignados y disponibilidad.", `
    <section class="content-grid">
      <div class="panel">
        <h2>Solicitudes registradas</h2>
        <div class="list" id="requestsList"></div>
      </div>
      <div class="panel">
        <h2>Disponibilidad de tecnicos</h2>
        <div class="list" id="availabilityList"></div>
      </div>
    </section>`);
  if (!user) return;
  await loadAll();
  renderSolicitudes(user);
  renderDisponibilidad();
}

function renderSolicitudes(user) {
  const solicitudes = state.solicitudes.filter((item) => item.usuario?.id === user.id || user.tipoUsuario === "admin");
  qs("#requestsList").innerHTML = solicitudes.length ? solicitudes.map((item) => `
    <article class="item">
      <div class="item-head">
        <h3>${item.numeroSolicitud}</h3>
        <span class="badge">${item.estado}</span>
      </div>
      <p><strong>Servicio:</strong> ${item.servicio?.nombre || "Sin servicio"}</p>
      <p><strong>Tecnico:</strong> ${item.tecnico ? `${item.tecnico.nombre} ${item.tecnico.apellido}` : "Pendiente"}</p>
      <p><strong>Programada:</strong> ${dateTime(item.fechaProgramada)}</p>
      <p><strong>Prioridad:</strong> ${item.prioridad}</p>
      <p class="price">${money(item.costoFinal)}</p>
    </article>`).join("") : `<p class="muted">Todavia no tienes solicitudes.</p>`;
}

function renderDisponibilidad() {
  qs("#availabilityList").innerHTML = state.disponibilidad.length ? state.disponibilidad.map((item) => `
    <article class="item">
      <h3>${item.tecnico?.nombre || "Tecnico"} ${item.tecnico?.apellido || ""}</h3>
      <p>${item.diaSemana}: ${item.horaInicio} - ${item.horaFin}</p>
      <span class="badge">${item.numeroSlots || 0} cupos</span>
    </article>`).join("") : `<p class="muted">No hay disponibilidad registrada.</p>`;
}

async function initPagos() {
  const user = dashboardLayout("Pagos.html", "Pagos", "Registra pagos y revisa el estado de tus transacciones.", `
    <section class="content-grid">
      <div class="panel">
        <h2>Historial de pagos</h2>
        <div class="table-wrap"><table><thead><tr><th>Solicitud</th><th>Monto</th><th>Metodo</th><th>Estado</th></tr></thead><tbody id="paymentsBody"></tbody></table></div>
      </div>
      <form class="panel" id="paymentForm">
        <h2>Registrar pago</h2>
        <div class="form-row"><label>Solicitud</label><select name="solicitudId" required></select></div>
        <div class="form-row"><label>Monto</label><input name="monto" type="number" step="0.01" min="0" required></div>
        <div class="form-row"><label>Metodo</label><select name="metodoPago"><option value="tarjeta_credito">Tarjeta credito</option><option value="tarjeta_debito">Tarjeta debito</option><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="billetera_digital">Billetera digital</option></select></div>
        <button type="submit">Registrar pago</button>
      </form>
    </section>`);
  if (!user) return;
  await loadAll();
  const solicitudes = state.solicitudes.filter((item) => item.usuario?.id === user.id);
  qs("[name='solicitudId']").innerHTML = optionList(solicitudes, (item) => `${item.numeroSolicitud} - ${item.servicio?.nombre || "Servicio"}`);
  renderPagos(user);
  qs("#paymentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/pagos", {
        method: "POST",
        body: JSON.stringify({
          solicitud: { id: Number(data.solicitudId) },
          usuario: { id: user.id },
          monto: Number(data.monto),
          metodoPago: data.metodoPago,
          estadoPago: "completado",
          numeroTransaccion: `TX-${Date.now()}`,
        }),
      });
      showMessage("#pageMessage", "Pago registrado correctamente.", "success");
      await loadResource("pagos");
      renderPagos(user);
    } catch (error) {
      showMessage("#pageMessage", error.message, "error");
    }
  });
}

function renderPagos(user) {
  const pagos = state.pagos.filter((item) => item.usuario?.id === user.id);
  qs("#paymentsBody").innerHTML = pagos.length ? pagos.map((item) => `
    <tr><td>${item.solicitud?.numeroSolicitud || item.solicitud?.id}</td><td>${money(item.monto)}</td><td>${item.metodoPago}</td><td><span class="badge">${item.estadoPago}</span></td></tr>`).join("") : `<tr><td colspan="4">No hay pagos registrados.</td></tr>`;
}

async function initResenas() {
  const user = dashboardLayout("Resenas.html", "Resenas", "Consulta opiniones y registra valoraciones de servicios.", `
    <section class="content-grid">
      <div class="panel"><h2>Resenas registradas</h2><div class="list" id="reviewsList"></div></div>
      <form class="panel" id="reviewForm">
        <h2>Nueva resena</h2>
        <div class="form-row"><label>Servicio</label><select name="servicioId" required></select></div>
        <div class="form-row"><label>Solicitud</label><select name="solicitudId"></select></div>
        <div class="form-row"><label>Calificacion</label><select name="calificacion"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></div>
        <div class="form-row"><label>Titulo</label><input name="titulo"></div>
        <div class="form-row"><label>Comentario</label><textarea name="comentario"></textarea></div>
        <button type="submit">Publicar resena</button>
      </form>
    </section>`);
  if (!user) return;
  await loadAll();
  qs("[name='servicioId']").innerHTML = optionList(state.servicios, (item) => item.nombre);
  qs("[name='solicitudId']").innerHTML = optionList(state.solicitudes.filter((item) => item.usuario?.id === user.id), (item) => item.numeroSolicitud, "Sin solicitud");
  renderResenas();
  qs("#reviewForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/resenas", {
        method: "POST",
        body: JSON.stringify({
          servicio: { id: Number(data.servicioId) },
          usuario: { id: user.id },
          solicitud: data.solicitudId ? { id: Number(data.solicitudId) } : null,
          calificacion: Number(data.calificacion),
          titulo: data.titulo,
          comentario: data.comentario,
          estado: "pendiente",
        }),
      });
      showMessage("#pageMessage", "Resena enviada para revision.", "success");
      await loadResource("resenas");
      renderResenas();
    } catch (error) {
      showMessage("#pageMessage", error.message, "error");
    }
  });
}

function renderResenas() {
  qs("#reviewsList").innerHTML = state.resenas.length ? state.resenas.map((item) => `
    <article class="item">
      <div class="item-head"><h3>${item.titulo || item.servicio?.nombre || "Resena"}</h3><span class="badge">${item.calificacion}/5</span></div>
      <p><strong>Servicio:</strong> ${item.servicio?.nombre || "Sin servicio"}</p>
      <p class="muted">${item.comentario || "Sin comentario"}</p>
    </article>`).join("") : `<p class="muted">No hay resenas registradas.</p>`;
}

async function initReportes() {
  const user = dashboardLayout("Reportes.html", "Reportes", "Genera informes de solicitudes, pagos y servicios utilizados.", `
    <section class="content-grid">
      <div class="panel"><h2>Reportes generados</h2><div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Rango</th><th>Formato</th><th>Fecha</th></tr></thead><tbody id="reportsBody"></tbody></table></div></div>
      <form class="panel" id="reportForm">
        <h2>Generar reporte</h2>
        <div class="form-row"><label>Tipo</label><select name="tipoReporte"><option value="resumen_solicitudes">Resumen solicitudes</option><option value="estado_pagos">Estado pagos</option><option value="servicios_utilizados">Servicios utilizados</option><option value="gastos_mensuales">Gastos mensuales</option></select></div>
        <div class="form-row"><label>Desde</label><input name="fechaDesde" type="date"></div>
        <div class="form-row"><label>Hasta</label><input name="fechaHasta" type="date"></div>
        <div class="form-row"><label>Formato</label><select name="formato"><option value="pdf">PDF</option><option value="excel">Excel</option><option value="csv">CSV</option></select></div>
        <button type="submit">Crear reporte</button>
      </form>
    </section>`);
  if (!user) return;
  await loadAll();
  renderReportes(user);
  qs("#reportForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/reportes", {
        method: "POST",
        body: JSON.stringify({ usuario: { id: user.id }, ...data }),
      });
      showMessage("#pageMessage", "Reporte generado correctamente.", "success");
      await loadResource("reportes");
      renderReportes(user);
    } catch (error) {
      showMessage("#pageMessage", error.message, "error");
    }
  });
}

function renderReportes(user) {
  const reportes = state.reportes.filter((item) => item.usuario?.id === user.id);
  qs("#reportsBody").innerHTML = reportes.length ? reportes.map((item) => `
    <tr><td>${item.tipoReporte}</td><td>${item.fechaDesde || "-"} / ${item.fechaHasta || "-"}</td><td>${item.formato}</td><td>${item.fechaGeneracion ? dateTime(item.fechaGeneracion) : "-"}</td></tr>`).join("") : `<tr><td colspan="4">No hay reportes generados.</td></tr>`;
}

async function initPerfil() {
  const user = dashboardLayout("Perfil.html", "Perfil", "Actualiza tus datos personales y de contacto.", `
    <section class="content-grid">
      <form class="panel" id="profileForm">
        <h2>Informacion personal</h2>
        <div class="form-grid">
          <div class="field"><label>Usuario</label><input name="username" required></div>
          <div class="field"><label>Correo</label><input name="email" type="email" required></div>
          <div class="field"><label>Nombre</label><input name="nombre" required></div>
          <div class="field"><label>Apellido</label><input name="apellido" required></div>
          <div class="field"><label>Telefono</label><input name="telefono"></div>
          <div class="field"><label>Ciudad</label><input name="ciudad"></div>
          <div class="field full"><label>Direccion</label><textarea name="direccion"></textarea></div>
        </div>
        <div class="actions"><button type="submit">Guardar cambios</button></div>
      </form>
      <div class="panel">
        <h2>Cuenta</h2>
        <p><strong>Rol:</strong> ${user?.tipoUsuario || "cliente"}</p>
        <p><strong>Estado:</strong> ${user?.estado || "activo"}</p>
        <p class="muted">Los cambios se guardan en la tabla usuarios.</p>
      </div>
    </section>`);
  if (!user) return;
  await loadAll(null);
  const fullUser = findById(state.usuarios, user.id) || user;
  const form = qs("#profileForm");
  ["username", "email", "nombre", "apellido", "telefono", "ciudad", "direccion"].forEach((field) => {
    form.elements[field].value = fullUser[field] || "";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      const updated = await api(`/usuarios/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...fullUser,
          ...data,
          password: fullUser.password || "sin-cambio",
          tipoUsuario: fullUser.tipoUsuario || user.tipoUsuario || "cliente",
          estado: fullUser.estado || "activo",
        }),
      });
      setUser(AuthUserFromUsuario(updated));
      await api("/notificaciones", {
        method: "POST",
        body: JSON.stringify({
          usuario: { id: user.id },
          titulo: "Perfil actualizado",
          mensaje: "Tus datos personales fueron actualizados.",
          tipo: "info",
          relacionadoA: "usuario",
          relacionadoId: user.id,
        }),
      }).catch(() => null);
      showMessage("#pageMessage", "Perfil actualizado correctamente.", "success");
      setupShell("Perfil.html");
    } catch (error) {
      showMessage("#pageMessage", error.message, "error");
    }
  });
}

function AuthUserFromUsuario(usuario) {
  return {
    id: usuario.id,
    username: usuario.username,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    telefono: usuario.telefono || "",
    tipoUsuario: usuario.tipoUsuario,
    estado: usuario.estado,
  };
}

function renderNotificaciones(target, items) {
  qs(target).innerHTML = items.length ? items.map((item) => `
    <article class="item">
      <div class="item-head"><h3>${item.titulo}</h3><span class="badge">${item.tipo}</span></div>
      <p class="muted">${item.mensaje}</p>
    </article>`).join("") : `<p class="muted">No tienes notificaciones.</p>`;
}

window.ServiciosApp = {
  initLogin,
  initRegistro,
  initInicio,
  initServicios,
  initSolicitudes,
  initPagos,
  initResenas,
  initReportes,
  initPerfil,
};
