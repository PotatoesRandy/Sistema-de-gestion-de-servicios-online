const API_BASE = localStorage.getItem("apiBase") || "http://localhost:8080/api";

const state = {
  usuarios: [],
  categorias: [],
  servicios: [],
  solicitudes: [],
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

  qsa("[data-current-welcome]").forEach((el) => {
    el.textContent = `Bienvenido ${user.nombre || user.username}`;
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
          <h2>Ayuntamiento Online</h2>
          <div class="user-card">
            <p class="welcome" data-current-welcome></p>
          </div>
        </div>
        <div>
          <p class="section-title">Navegacion</p>
          <nav>
            <a href="Servicios.html">Solicitud</a>
            <a href="Solicitudes.html">Todas las solicitudes</a>
            <a href="Resenas.html">Opiniones</a>
            <a href="Reportes.html">Reportes</a>
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
          <a class="button secondary" href="Servicios.html">Solicitud</a>
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

function categoryName(category) {
  const names = {
    1: "Espacios p\u00fablicos",
    2: "Movilidad urbana",
    3: "Eventos comunitarios",
    4: "Ambiente y limpieza",
    5: "Atenci\u00f3n ciudadana",
    6: "Obras p\u00fablicas",
  };
  return names[Number(category?.id)] || category?.nombre || "Sin area";
}

function findById(items, id) {
  return items.find((item) => String(item.id) === String(id));
}

function isAdmin(user) {
  return user?.tipoUsuario === "admin";
}

function fullName(user) {
  return `${user?.nombre || ""} ${user?.apellido || ""}`.trim() || user?.username || "Sin nombre";
}

function pointInPolygon(point, polygon) {
  let inside = false;
  const lat = point.lat;
  const lng = point.lng;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const latI = polygon[i][0];
    const lngI = polygon[i][1];
    const latJ = polygon[j][0];
    const lngJ = polygon[j][1];
    const intersects = (lngI > lng) !== (lngJ > lng)
      && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersects) inside = !inside;
  }
  return inside;
}

function initLocationPicker(containerId, latFieldSelector, lngFieldSelector, statusSelector, addressFieldSelector) {
  const mapContainer = qs(`#${containerId}`);
  const latField = qs(latFieldSelector);
  const lngField = qs(lngFieldSelector);
  const status = statusSelector ? qs(statusSelector) : null;
  const addressField = addressFieldSelector ? qs(addressFieldSelector) : null;
  if (!mapContainer || !latField || !lngField || !window.L) return;

  const center = L.latLng(18.4861, -69.9312);
  const districtPolygon = [
    [18.4260, -69.9750],
    [18.4330, -69.9960],
    [18.4520, -70.0050],
    [18.4790, -70.0080],
    [18.5050, -69.9980],
    [18.5240, -69.9760],
    [18.5360, -69.9510],
    [18.5340, -69.9280],
    [18.5240, -69.9100],
    [18.5070, -69.8980],
    [18.4890, -69.8890],
    [18.4680, -69.8830],
    [18.4490, -69.8840],
    [18.4330, -69.8910],
    [18.4260, -69.9150],
    [18.4230, -69.9450],
    [18.4260, -69.9750],
  ];
  const districtBounds = L.latLngBounds(districtPolygon);
  const map = L.map(containerId, {
    center,
    zoom: 13,
    maxBounds: districtBounds,
    maxBoundsViscosity: 0.9,
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "",
  }).addTo(map);
  map.fitBounds(districtBounds, { padding: [16, 16] });

  const marker = L.marker(center, { draggable: true }).addTo(map);
  async function updateAddress(latlng) {
    if (!addressField) return;
    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        lat: latlng.lat.toFixed(6),
        lon: latlng.lng.toFixed(6),
        zoom: "18",
        addressdetails: "1",
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data?.display_name) {
        addressField.value = data.display_name;
      }
    } catch {
      if (status) status.textContent = `Distrito Nacional: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    }
  }

  function updateSelection(latlng) {
    latField.value = latlng.lat.toFixed(6);
    lngField.value = latlng.lng.toFixed(6);
    if (status) {
      status.textContent = `Distrito Nacional: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    }
    updateAddress(latlng);
  }

  map.on("click", (event) => {
    if (!pointInPolygon(event.latlng, districtPolygon)) {
      if (status) status.textContent = "Selecciona una direccion dentro del Distrito Nacional. No se permiten zonas fuera del Distrito Nacional.";
      return;
    }
    marker.setLatLng(event.latlng);
    updateSelection(event.latlng);
  });
  marker.on("dragend", () => {
    const latlng = marker.getLatLng();
    if (!pointInPolygon(latlng, districtPolygon)) {
      marker.setLatLng(center);
      updateSelection(center);
      if (status) status.textContent = "Selecciona una direccion dentro del Distrito Nacional. No se permiten zonas fuera del Distrito Nacional.";
      return;
    }
    updateSelection(latlng);
  });
  updateSelection(center);
}

async function initLogin() {
  if (getUser()) window.location.href = "Servicios.html";
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
      window.location.href = "Servicios.html";
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
      window.location.href = "Servicios.html";
    } catch (error) {
      showMessage("#authMessage", error.message, "error");
    }
  });
}

async function initInicio() {
  window.location.href = "Servicios.html";
  const user = dashboardLayout("Inicio.html", "Inicio", "Resumen de reservas y solicitudes municipales.", `
    <section class="stats">
      <div class="card"><span class="muted">Solicitud</span><span class="stat-value" id="statServicios">0</span></div>
      <div class="card"><span class="muted">Solicitudes</span><span class="stat-value" id="statSolicitudes">0</span></div>
    </section>
    <section class="content-grid" style="margin-top:16px">
      <div class="panel">
        <h2>Solicitud disponible</h2>
        <div class="list" id="homeServicios"></div>
      </div>
    </section>`);
  if (!user) return;
  await loadAll();
  qs("#statServicios").textContent = state.servicios.length;
  qs("#statSolicitudes").textContent = state.solicitudes.filter((item) => item.usuario?.id === user.id).length;
  renderServicios("#homeServicios", state.servicios.slice(0, 4), false);
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
      <p><strong>Area:</strong> ${categoryName(servicio.categoria)}</p>
      <p><strong>Duracion:</strong> La indica el cliente al solicitar.</p>
      ${withAction ? `<div class="actions"><button data-service-id="${servicio.id}" class="request-service">Solicitar</button></div>` : ""}
      ${isAdmin(getUser()) ? `<div class="actions"><button class="danger delete-service" data-service-id="${servicio.id}">Quitar servicio</button></div>` : ""}
    </article>`).join("") : `<p class="muted">No hay servicios disponibles.</p>`;
}

async function initServicios() {
  const currentUser = getUser();
  const admin = isAdmin(currentUser);
  const title = admin ? "Gestion municipal" : "Solicitud";
  const subtitle = admin ? "Servicios municipales." : "Consulta servicios municipales y registra tus solicitudes.";
  const sidePanel = admin ? `
      <form class="panel" id="serviceForm">
        <h2>Nuevo servicio</h2>
        <div class="form-row">
          <label>Nombre</label>
          <input name="nombre" required>
        </div>
        <div class="form-row">
          <label>Area municipal</label>
          <select name="categoriaId" id="serviceCategory" required></select>
        </div>
        <div class="form-row">
          <label>Disponibilidad</label>
          <select name="disponibilidad">
            <option value="disponible">Disponible</option>
            <option value="no_disponible">No disponible</option>
            <option value="mantenimiento">Mantenimiento</option>
          </select>
        </div>
        <div class="form-row">
          <label>Descripcion</label>
          <textarea name="descripcion" required></textarea>
        </div>
        <button type="submit">Guardar servicio</button>
      </form>` : `
      <form class="panel" id="requestForm">
        <h2>Crear solicitud</h2>
        <div class="form-row">
          <label>Servicio o reserva</label>
          <select name="servicioId" id="requestService" required></select>
        </div>
        <div class="form-row">
          <label>Fecha y hora solicitada</label>
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
          <label>Numero de contacto</label>
          <input name="contacto" type="tel" placeholder="Telefono para contactar" required>
        </div>
        <div class="form-row">
          <label>Duracion del servicio en horas</label>
          <input name="duracionHoras" type="number" min="1" step="1" placeholder="Ejemplo: 2" required>
        </div>
        <div class="form-row">
          <label>Detalle de la solicitud</label>
          <textarea name="descripcionProblema" required></textarea>
        </div>
        <div class="form-row">
          <label>Ubicacion</label>
          <input name="ubicacionTexto" placeholder="Describe el lugar o sector" required>
        </div>
        <div class="form-row">
          <div class="map-instructions">Haz click en el mapa para seleccionar el lugar dentro del Distrito Nacional.</div>
          <div id="requestMap" class="map"></div>
          <input type="hidden" name="latitud">
          <input type="hidden" name="longitud">
          <p class="map-status" id="requestLocationLabel">Distrito Nacional: 18.486100, -69.931200</p>
        </div>
        <button type="submit">Crear solicitud</button>
      </form>`;
  const user = dashboardLayout("Servicios.html", title, subtitle, `
    <div class="toolbar">
      <select id="categoryFilter"></select>
      <input id="serviceSearch" placeholder="Buscar servicio">
    </div>
    <section class="content-grid">
      <div class="panel">
        <h2>Catalogo municipal</h2>
        <div class="list" id="servicesList"></div>
      </div>
      ${sidePanel}
    </section>`);
  if (!user) return;
  await loadAll();
  qs("#categoryFilter").innerHTML = optionList(state.categorias, categoryName, "Todas las \u00e1reas");
  if (isAdmin(user)) {
    qs("#serviceCategory").innerHTML = optionList(state.categorias, categoryName);
  } else {
    qs("#requestForm [name='fechaProgramada']").value = todayInput();
    qs("#requestService").innerHTML = optionList(state.servicios, (item) => item.nombre);
    initLocationPicker("requestMap", "#requestForm [name='latitud']", "#requestForm [name='longitud']", "#requestLocationLabel", "#requestForm [name='ubicacionTexto']");
  }
  renderServiciosPage();

  qs("#categoryFilter").addEventListener("change", renderServiciosPage);
  qs("#serviceSearch").addEventListener("input", renderServiciosPage);
  qs("#servicesList").addEventListener("click", (event) => {
    const button = event.target.closest(".request-service");
    const deleteButton = event.target.closest(".delete-service");
    if (button && qs("#requestService")) qs("#requestService").value = button.dataset.serviceId;
    if (deleteButton) return deleteServicio(deleteButton.dataset.serviceId, user);
  });
  if (isAdmin(user)) {
    qs("#serviceForm").addEventListener("submit", (event) => createServicio(event, user));
  } else {
    qs("#requestForm").addEventListener("submit", (event) => createSolicitud(event, user));
  }
}

function renderServiciosPage() {
  const category = qs("#categoryFilter").value;
  const search = qs("#serviceSearch").value.toLowerCase();
  const servicios = state.servicios.filter((servicio) => {
    const matchCategory = !category || String(servicio.categoria?.id) === category;
    const matchSearch = !search || `${servicio.nombre} ${servicio.descripcion || ""}`.toLowerCase().includes(search);
    return matchCategory && matchSearch;
  });
  renderServicios("#servicesList", servicios, !isAdmin(getUser()));
}

async function createServicio(event, user) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  if (submitButton) submitButton.disabled = true;
  const data = Object.fromEntries(new FormData(form));
  try {
    await api("/servicios", {
      method: "POST",
      body: JSON.stringify({
        categoria: { id: Number(data.categoriaId) },
        nombre: data.nombre,
        descripcion: data.descripcion,
        precioBase: 0,
        tiempoEstimado: 0,
        disponibilidad: data.disponibilidad,
        crearPor: { id: user.id },
      }),
    });
    showMessage("#pageMessage", "Servicio creado correctamente.", "success");
    form.reset();
    qs("#serviceCategory").innerHTML = optionList(state.categorias, categoryName);
    await loadResource("servicios");
    renderServiciosPage();
  } catch (error) {
    showMessage("#pageMessage", error.message, "error");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function deleteServicio(id, user) {
  const servicio = findById(state.servicios, id);
  if (!window.confirm(`Quitar el servicio "${servicio?.nombre || id}" del catalogo?`)) {
    return;
  }
  try {
    await api(`/servicios/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ usuarioId: user.id }),
    });
    showMessage("#pageMessage", "Servicio quitado del catalogo.", "success");
    await loadResource("servicios");
    renderServiciosPage();
  } catch (error) {
    showMessage("#pageMessage", error.message, "error");
  }
}

async function createSolicitud(event, user) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  if (submitButton) submitButton.disabled = true;
  const data = Object.fromEntries(new FormData(form));
  try {
    const solicitud = await api("/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        usuario: { id: user.id },
        servicio: { id: Number(data.servicioId) },
        tecnico: null,
        fechaProgramada: data.fechaProgramada,
        prioridad: data.prioridad,
        descripcionProblema: solicitudDescription(data.descripcionProblema, data.contacto, data.duracionHoras),
        ubicacionTexto: data.ubicacionTexto,
        latitud: data.latitud || null,
        longitud: data.longitud || null,
        estado: "pendiente",
        costoFinal: 0,
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
    }).catch(() => null);
    showMessage("#pageMessage", "Solicitud creada correctamente. Revisa todas tus solicitudes para ver el registro.", "success");
    form.reset();
    qs("[name='fechaProgramada']").value = todayInput();
    await loadResource("solicitudes");
  } catch (error) {
    showMessage("#pageMessage", error.message, "error");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function createAdminSolicitud(event, user) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  if (submitButton) submitButton.disabled = true;
  const data = Object.fromEntries(new FormData(form));
  try {
    await api("/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        usuario: { id: Number(data.usuarioId) },
        servicio: { id: Number(data.servicioId) },
        tecnico: null,
        fechaProgramada: data.fechaProgramada,
        prioridad: data.prioridad,
        descripcionProblema: data.descripcionProblema,
        ubicacionTexto: data.ubicacionTexto,
        latitud: data.latitud || null,
        longitud: data.longitud || null,
        estado: "pendiente",
        costoFinal: 0,
      }),
    });
    showMessage("#pageMessage", "Solicitud creada correctamente.", "success");
    form.reset();
    qs("#adminRequestForm [name='fechaProgramada']").value = todayInput();
    await loadResource("solicitudes");
    renderServiciosPage();
  } catch (error) {
    showMessage("#pageMessage", error.message, "error");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function initSolicitudes() {
  const currentUser = getUser();
  const admin = isAdmin(currentUser);
  const user = dashboardLayout("Solicitudes.html", "Todas las solicitudes", "", admin ? `
    <section class="content-grid">
      <div class="panel">
        <h2>Registro de solicitudes</h2>
        <div class="list" id="requestsList"></div>
      </div>
      <div class="panel request-detail-panel">
        <h2>Detalles</h2>
        <div id="requestDetails" class="muted">Selecciona una solicitud para ver sus detalles.</div>
      </div>
    </section>` : `
    <section>
      <div class="panel">
        <h2>Solicitudes registradas</h2>
        <div class="list" id="requestsList"></div>
      </div>
    </section>`);
  if (!user) return;
  await loadAll();
  renderSolicitudes(user);
  qs("#requestsList").addEventListener("click", (event) => handleSolicitudClick(event, user));
  if (qs("#requestDetails")) {
    qs("#requestDetails").addEventListener("click", (event) => handleSolicitudClick(event, user));
  }
}

function handleSolicitudClick(event, user) {
  const detailsButton = event.target.closest(".view-request");
  const acceptButton = event.target.closest(".accept-request");
  const cancelButton = event.target.closest(".cancel-request");
  const deleteButton = event.target.closest(".delete-request");
  if (detailsButton) return showSolicitudDetails(detailsButton.dataset.requestId, user);
  if (acceptButton) return acceptSolicitud(acceptButton.dataset.requestId, user);
  if (cancelButton) return cancelSolicitud(cancelButton.dataset.requestId, user);
  if (deleteButton) return deleteSolicitud(deleteButton.dataset.requestId, user);
}

function getHiddenSolicitudes() {
  try {
    return JSON.parse(localStorage.getItem("hiddenSolicitudes") || "[]");
  } catch {
    return [];
  }
}

function setHiddenSolicitudes(ids) {
  localStorage.setItem("hiddenSolicitudes", JSON.stringify(ids));
}

function hideSolicitudLocal(id) {
  const hidden = getHiddenSolicitudes();
  const stringId = String(id);
  if (!hidden.includes(stringId)) {
    hidden.push(stringId);
    setHiddenSolicitudes(hidden);
  }
}

function solicitudDescription(description, contact, durationHours) {
  return `Contacto: ${String(contact || "").trim()}\nDuracion: ${String(durationHours || "").trim()} horas\n\nDetalle: ${String(description || "").trim()}`;
}

function solicitudDetails(item) {
  const text = item.descripcionProblema || "";
  const contact = text.match(/^Contacto:\s*(.+)$/m)?.[1]?.trim();
  const duration = text.match(/^Duracion:\s*(.+)$/m)?.[1]?.trim();
  const detail = text.match(/^Detalle:\s*([\s\S]*)$/m)?.[1]?.trim() || text;
  return {
    contact,
    duration,
    detail,
  };
}

function renderSolicitudes(user) {
  const hidden = getHiddenSolicitudes();
  const solicitudes = state.solicitudes
    .filter((item) => (item.usuario?.id === user.id || user.tipoUsuario === "admin") && !hidden.includes(String(item.id)));
  if (isAdmin(user)) {
    renderAdminSolicitudes(solicitudes);
    return;
  }
  qs("#requestsList").innerHTML = solicitudes.length ? solicitudes.map(renderSolicitudCard).join("") : `<p class="muted">Todavia no tienes solicitudes.</p>`;
}

function renderSolicitudCard(item) {
  const details = solicitudDetails(item);
  return `
    <article class="item">
      <div class="item-head">
        <h3>${item.numeroSolicitud}</h3>
        <span class="badge">${displaySolicitudEstado(item)}</span>
      </div>
      ${isAdmin(getUser()) ? `<p><strong>Cliente:</strong> ${fullName(item.usuario)}</p>` : ""}
      <p><strong>Servicio:</strong> ${item.servicio?.nombre || "Sin servicio"}</p>
      <p><strong>Fecha solicitada:</strong> ${dateTime(item.fechaProgramada)}</p>
      <p><strong>Prioridad:</strong> ${item.prioridad}</p>
      ${details.contact ? `<p><strong>Contacto:</strong> ${details.contact}</p>` : ""}
      ${details.duration ? `<p><strong>Duracion:</strong> ${details.duration}</p>` : ""}
      <p><strong>Detalle:</strong> ${details.detail || "Sin detalle"}</p>
      ${item.estado === "cancelada" && item.motivoCancelacion ? `<p><strong>${isAdminRejected(item) ? "Motivo de rechazo" : "Motivo de cancelacion"}:</strong> ${item.motivoCancelacion}</p>` : ""}
      ${renderSolicitudActions(item, getUser())}
    </article>`;
}

function renderAdminSolicitudes(solicitudes) {
  const groups = [
    { title: "Pendientes", items: solicitudes.filter((item) => item.estado === "pendiente") },
    { title: "Aceptadas", items: solicitudes.filter((item) => item.estado === "confirmada") },
    { title: "Rechazadas", items: solicitudes.filter(isAdminRejected) },
    { title: "Canceladas", items: solicitudes.filter((item) => item.estado === "cancelada" && !isAdminRejected(item)) },
  ];
  qs("#requestsList").innerHTML = groups.map((group) => `
    <section class="request-group">
      <div class="request-group-head">
        <h3>${group.title}</h3>
        <span class="badge">${group.items.length}</span>
      </div>
      <div class="list">
        ${group.items.length ? group.items.map(renderSolicitudCard).join("") : `<p class="muted">No hay solicitudes ${group.title.toLowerCase()}.</p>`}
      </div>
    </section>`).join("");
}

function showSolicitudDetails(id, user) {
  const target = qs("#requestDetails");
  const item = findById(state.solicitudes, id);
  if (!target || !item) return;
  const details = solicitudDetails(item);
  target.className = "";
  target.innerHTML = `
    <article class="item request-detail-card">
      <div class="item-head">
        <h3>${item.numeroSolicitud}</h3>
        <span class="badge">${displaySolicitudEstado(item)}</span>
      </div>
      <p><strong>Cliente:</strong> ${fullName(item.usuario)}</p>
      <p><strong>Servicio:</strong> ${item.servicio?.nombre || "Sin servicio"}</p>
      <p><strong>Fecha solicitada:</strong> ${dateTime(item.fechaProgramada)}</p>
      <p><strong>Prioridad:</strong> ${item.prioridad}</p>
      <p><strong>Contacto:</strong> ${details.contact || "Sin contacto"}</p>
      <p><strong>Duracion:</strong> ${details.duration || "Sin duracion"}</p>
      <p><strong>Ubicacion:</strong> ${item.ubicacionTexto || "Sin ubicacion"}</p>
      <p><strong>Coordenadas:</strong> ${item.latitud && item.longitud ? `${item.latitud}, ${item.longitud}` : "Sin coordenadas"}</p>
      <p><strong>Detalle:</strong> ${details.detail || "Sin detalle"}</p>
      ${item.estado === "cancelada" && item.motivoCancelacion ? `<p><strong>${isAdminRejected(item) ? "Motivo de rechazo" : "Motivo de cancelacion"}:</strong> ${item.motivoCancelacion}</p>` : ""}
      ${renderSolicitudActions(item, user)}
    </article>`;
}

function isAdminRejected(item) {
  return item.estado === "cancelada" && String(item.motivoCancelacion || "").startsWith("Administrador ");
}

function displaySolicitudEstado(item) {
  if (isAdminRejected(item)) return "Rechazado";
  if (item.estado === "confirmada") return "Aceptado";
  if (item.estado === "cancelada") return "Cancelada";
  return item.estado;
}

function renderSolicitudActions(item, user) {
  const details = isAdmin(user) ? `<button class="secondary view-request" data-request-id="${item.id}">Ver detalles</button>` : "";
  if (item.estado === "cancelada") {
    if (isAdmin(user)) return `<div class="actions">${details}</div>`;
    return `<div class="actions">${details}<button class="delete-request danger" data-request-id="${item.id}">Eliminar solicitud</button></div>`;
  }
  if (item.estado === "completada") return details ? `<div class="actions">${details}</div>` : "";
  if (isAdmin(user)) {
    const accept = item.estado === "pendiente" ? `<button class="accept-request" data-request-id="${item.id}">Aceptar</button>` : "";
    return `<div class="actions">${details}${accept}<button class="cancel-request danger" data-request-id="${item.id}">Rechazar</button></div>`;
  }
  return `<div class="actions"><button class="cancel-request secondary" data-request-id="${item.id}">Cancelar solicitud</button></div>`;
}

async function acceptSolicitud(id, user) {
  try {
    await api(`/solicitudes/${id}/aceptar`, {
      method: "PUT",
      body: JSON.stringify({ usuarioId: user.id }),
    });
    showMessage("#pageMessage", "Solicitud aceptada correctamente.", "success");
    await loadResource("solicitudes");
    renderSolicitudes(user);
  } catch (error) {
    showMessage("#pageMessage", error.message, "error");
  }
}

async function cancelSolicitud(id, user) {
  const motivo = window.prompt(isAdmin(user) ? "Indica el motivo del rechazo:" : "Indica el motivo de la cancelacion:");
  if (!motivo || !motivo.trim()) {
    showMessage("#pageMessage", "La accion necesita una justificacion.", "error");
    return;
  }
  try {
    await api(`/solicitudes/${id}/cancelar`, {
      method: "PUT",
      body: JSON.stringify({
        usuarioId: user.id,
        motivo: motivo.trim(),
      }),
    });
    showMessage("#pageMessage", isAdmin(user) ? "Solicitud rechazada correctamente." : "Solicitud cancelada correctamente.", "success");
    await loadResource("solicitudes");
    renderSolicitudes(user);
  } catch (error) {
    showMessage("#pageMessage", error.message, "error");
  }
}

function deleteSolicitud(id, user) {
  if (!window.confirm("Eliminar esta solicitud cancelada de la lista? Esta accion es irreversible y solo afecta la vista actual.")) {
    return;
  }
  hideSolicitudLocal(id);
  showMessage("#pageMessage", "Solicitud oculta de la lista.", "success");
  renderSolicitudes(user);
}

function renderDisponibilidad() {
  qs("#availabilityList").innerHTML = state.disponibilidad.length ? state.disponibilidad.map((item) => `
    <article class="item">
      <h3>${item.tecnico?.nombre || "Funcionario"} ${item.tecnico?.apellido || ""}</h3>
      <p>${item.diaSemana}: ${item.horaInicio} - ${item.horaFin}</p>
      <span class="badge">${item.numeroSlots || 0} cupos</span>
    </article>`).join("") : `<p class="muted">No hay disponibilidad registrada.</p>`;
}

async function initPagos() {
  const user = dashboardLayout("Pagos.html", "Pagos retirados", "Esta funcionalidad ya no esta disponible.", `
    <section class="content-grid">
      <div class="panel">
        <h2>Sistema de pagos eliminado</h2>
        <p>El sistema de pagos fue desactivado. Gestiona tus solicitudes y cancelaciones desde la seccion de Solicitudes.</p>
      </div>
    </section>`);
  if (!user) return;
}

function renderPagos(user) {
  const pagos = (state.pagos || []).filter((item) => item.usuario?.id === user.id);
  qs("#paymentsBody").innerHTML = pagos.length ? pagos.map((item) => `
    <tr><td>${item.solicitud?.numeroSolicitud || item.solicitud?.id}</td><td>Gratis</td><td>${item.metodoPago}</td><td><span class="badge">${item.estadoPago}</span></td></tr>`).join("") : `<tr><td colspan="4">No hay pagos registrados.</td></tr>`;
}

async function initResenas() {
  const currentUser = getUser();
  const admin = isAdmin(currentUser);
  const user = dashboardLayout("Resenas.html", "Opiniones", admin ? "Opiniones registradas." : "Consulta opiniones y registra valoraciones de servicios municipales.", `
    <section class="content-grid">
      <div class="panel"><h2>Opiniones registradas</h2><div class="list" id="reviewsList"></div></div>
      ${admin ? `<div class="panel"><h2>Resumen</h2><p class="muted">Opiniones registradas.</p></div>` : `<form class="panel" id="reviewForm">
        <h2>Nueva opinion</h2>
        <div class="form-row"><label>Servicio</label><select name="servicioId" required></select></div>
        <div class="form-row"><label>Solicitud</label><select name="solicitudId"></select></div>
        <div class="form-row"><label>Calificacion</label><select name="calificacion"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></div>
        <div class="form-row"><label>Titulo</label><input name="titulo"></div>
        <div class="form-row"><label>Comentario</label><textarea name="comentario"></textarea></div>
        <button type="submit">Publicar resena</button>
      </form>`}
    </section>`);
  if (!user) return;
  await loadAll();
  if (isAdmin(user)) {
    renderResenas();
    qs("#reviewsList").addEventListener("click", (event) => {
      const deleteButton = event.target.closest(".delete-review");
      if (deleteButton) return deleteResena(deleteButton.dataset.reviewId, user);
    });
    return;
  }
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
      showMessage("#pageMessage", "Opinion enviada para revision.", "success");
      await loadResource("resenas");
      renderResenas();
    } catch (error) {
      showMessage("#pageMessage", error.message, "error");
    }
  });
  qs("#reviewsList").addEventListener("click", (event) => {
    const deleteButton = event.target.closest(".delete-review");
    if (deleteButton) return deleteResena(deleteButton.dataset.reviewId, user);
  });
}

function renderResenas() {
  const user = getUser();
  qs("#reviewsList").innerHTML = state.resenas.length ? state.resenas.map((item) => `
    <article class="item">
      <div class="item-head"><h3>${item.titulo || item.servicio?.nombre || "Resena"}</h3><span class="badge">${item.calificacion}/5</span></div>
      <p><strong>Servicio:</strong> ${item.servicio?.nombre || "Sin servicio"}</p>
      <p class="muted">${item.comentario || "Sin comentario"}</p>
      ${(isAdmin(user) || item.usuario?.id === user?.id) ? `<div class="actions"><button class="danger delete-review" data-review-id="${item.id}">Eliminar</button></div>` : ""}
    </article>`).join("") : `<p class="muted">No hay opiniones registradas.</p>`;
}

async function deleteResena(id, user) {
  if (!window.confirm("Eliminar esta opinion?")) return;
  try {
    await api(`/resenas/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ usuarioId: user.id }),
    });
    showMessage("#pageMessage", "Opinion eliminada correctamente.", "success");
    await loadResource("resenas");
    renderResenas();
  } catch (error) {
    showMessage("#pageMessage", error.message, "error");
  }
}

async function initReportes() {
  const currentUser = getUser();
  const admin = isAdmin(currentUser);
  const reportForm = `
      <form class="panel" id="reportForm">
        <h2>${admin ? "Generar reporte detallado" : "Generar reporte"}</h2>
        <div class="form-row"><label>Tipo</label><select name="tipoReporte"><option value="resumen_solicitudes">${admin ? "Todas las solicitudes" : "Resumen solicitudes"}</option><option value="servicios_utilizados">${admin ? "Servicios y solicitudes utilizadas" : "Servicios utilizados"}</option></select></div>
        <div class="form-row"><label>Desde</label><input name="fechaDesde" type="date"></div>
        <div class="form-row"><label>Hasta</label><input name="fechaHasta" type="date"></div>
        <button type="submit">Crear reporte</button>
      </form>`;
  const user = dashboardLayout("Reportes.html", "Reportes", admin ? "Genera reportes detallados de todos los servicios y solicitudes." : "Genera informes de solicitudes y servicios utilizados.", `
    <section class="content-grid">
      <div class="panel">
        <h2>Reportes generados</h2>
        <div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Rango</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody id="reportsBody"></tbody></table></div>
        <div id="reportDetails" class="report-details"></div>
      </div>
      ${reportForm}
    </section>`);
  if (!user) return;
  await loadAll();
  renderReportes(user);
  qs("#reportsBody").addEventListener("click", (event) => {
    const detailsButton = event.target.closest(".view-report");
    const deleteButton = event.target.closest(".delete-report");
    if (detailsButton) return showReportDetails(detailsButton.dataset.reportId, user);
    if (deleteButton) return deleteReporte(deleteButton.dataset.reportId, user);
  });
  qs("#reportForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/reportes", {
        method: "POST",
        body: JSON.stringify({ usuario: { id: user.id }, ...data, formato: "pantalla" }),
      });
      showMessage("#pageMessage", "Reporte generado correctamente.", "success");
      await loadResource("reportes");
      renderReportes(user);
      qs("#reportDetails").innerHTML = "";
    } catch (error) {
      showMessage("#pageMessage", error.message, "error");
    }
  });
}

function renderReportes(user) {
  const reportes = isAdmin(user) ? state.reportes : state.reportes.filter((item) => item.usuario?.id === user.id);
  qs("#reportsBody").innerHTML = reportes.length ? reportes.map((item) => `
    <tr>
      <td>${reportTitle(item.tipoReporte)}</td>
      <td>${item.fechaDesde || "-"} / ${item.fechaHasta || "-"}</td>
      <td>${item.fechaGeneracion ? dateTime(item.fechaGeneracion) : "-"}</td>
      <td><div class="actions compact"><button class="secondary view-report" data-report-id="${item.id}">Ver detalles</button><button class="danger delete-report" data-report-id="${item.id}">Eliminar</button></div></td>
    </tr>`).join("") : `<tr><td colspan="4">No hay reportes generados.</td></tr>`;
}

function reportTitle(type) {
  const labels = {
    resumen_solicitudes: "Resumen solicitudes",
    servicios_utilizados: "Servicios utilizados",
  };
  return labels[type] || type;
}

function reportSolicitudes(report, user) {
  const ownerId = report.usuario?.id;
  return state.solicitudes.filter((item) => {
    const isAdminGlobalReport = isAdmin(user) && Number(ownerId) === Number(user.id);
    const belongsToReport = isAdminGlobalReport || (isAdmin(user) ? item.usuario?.id === ownerId : item.usuario?.id === user.id);
    if (!belongsToReport) return false;
    const date = item.fechaProgramada ? String(item.fechaProgramada).slice(0, 10) : "";
    if (report.fechaDesde && date && date < report.fechaDesde) return false;
    if (report.fechaHasta && date && date > report.fechaHasta) return false;
    if (report.tipoReporte === "servicios_utilizados") {
      if (!isPastSolicitud(item)) return false;
      if (item.estado === "pendiente") return false;
      if (item.estado === "cancelada" || isAdminRejected(item)) return false;
    }
    return true;
  });
}

function isPastSolicitud(item) {
  if (!item.fechaProgramada) return false;
  return new Date(String(item.fechaProgramada).replace(" ", "T")).getTime() < Date.now();
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item) || "Sin dato";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function renderCountList(counts) {
  const entries = Object.entries(counts);
  return entries.length ? entries.map(([label, total]) => `<li><strong>${label}:</strong> ${total}</li>`).join("") : "<li>Sin datos</li>";
}

function showReportDetails(id, user) {
  const report = findById(state.reportes, id);
  if (!report) return;
  const solicitudes = reportSolicitudes(report, user);
  const byStatus = countBy(solicitudes, (item) => displaySolicitudEstado(item));
  const byPriority = countBy(solicitudes, (item) => item.prioridad);
  const byService = countBy(solicitudes, (item) => item.servicio?.nombre);
  const servicesWithRequests = new Set(solicitudes.map((item) => String(item.servicio?.id)).filter(Boolean));
  const serviceRows = state.servicios.length ? state.servicios.map((servicio) => `
    <tr>
      <td>${servicio.nombre}</td>
      <td>${categoryName(servicio.categoria)}</td>
      <td>${servicio.disponibilidad || "disponible"}</td>
      <td>${solicitudes.filter((item) => item.servicio?.id === servicio.id).length}</td>
      <td>${servicesWithRequests.has(String(servicio.id)) ? "Con solicitudes" : "Sin solicitudes"}</td>
    </tr>`).join("") : `<tr><td colspan="5">Sin servicios registrados.</td></tr>`;
  const rows = solicitudes.length ? solicitudes.map((item) => `
    ${(() => {
      const details = solicitudDetails(item);
      return `
    <tr>
      <td>${item.numeroSolicitud}</td>
      ${isAdmin(user) ? `<td>${fullName(item.usuario)}</td>` : ""}
      <td>${item.servicio?.nombre || "Sin servicio"}</td>
      <td>${displaySolicitudEstado(item)}</td>
      <td>${item.prioridad}</td>
      <td>${details.duration || "Sin duracion"}</td>
      <td>${details.contact || "Sin contacto"}</td>
      <td>${item.fechaProgramada ? dateTime(item.fechaProgramada) : "-"}</td>
      <td>${item.ubicacionTexto || "Sin ubicacion"}</td>
    </tr>`;
    })()}`).join("") : `<tr><td colspan="${isAdmin(user) ? 9 : 8}">Sin solicitudes.</td></tr>`;

  qs("#reportDetails").innerHTML = `
    <article class="item report-detail-card">
      <div class="item-head">
        <h3>${reportTitle(report.tipoReporte)}</h3>
        <span class="badge">${solicitudes.length} solicitudes</span>
      </div>
      ${isAdmin(user) && Number(report.usuario?.id) === Number(user.id) ? `<p><strong>Alcance:</strong> Todos los servicios y solicitudes registradas.</p>` : ""}
      <p><strong>Rango:</strong> ${report.fechaDesde || "-"} / ${report.fechaHasta || "-"}</p>
      <p><strong>Fecha:</strong> ${report.fechaGeneracion ? dateTime(report.fechaGeneracion) : "-"}</p>
      <div class="report-summary">
        <div><h4>Estados</h4><ul>${renderCountList(byStatus)}</ul></div>
        <div><h4>Prioridades</h4><ul>${renderCountList(byPriority)}</ul></div>
        <div><h4>Servicios</h4><ul>${renderCountList(byService)}</ul></div>
      </div>
      ${isAdmin(user) ? `<h4>Servicios</h4><div class="table-wrap"><table><thead><tr><th>Servicio</th><th>Area</th><th>Disponibilidad</th><th>Solicitudes</th><th>Estado de uso</th></tr></thead><tbody>${serviceRows}</tbody></table></div>` : ""}
      <h4>Solicitudes</h4>
      <div class="table-wrap"><table><thead><tr><th>Solicitud</th>${isAdmin(user) ? "<th>Cliente</th>" : ""}<th>Servicio</th><th>Estado</th><th>Prioridad</th><th>Duracion</th><th>Contacto</th><th>Fecha</th><th>Ubicacion</th></tr></thead><tbody>${rows}</tbody></table></div>
    </article>`;
}

async function deleteReporte(id, user) {
  if (!window.confirm("Eliminar este reporte?")) return;
  try {
    await api(`/reportes/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ usuarioId: user.id }),
    });
    showMessage("#pageMessage", "Reporte eliminado correctamente.", "success");
    await loadResource("reportes");
    renderReportes(user);
    qs("#reportDetails").innerHTML = "";
  } catch (error) {
    showMessage("#pageMessage", error.message, "error");
  }
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
