/* ========== Supabase Inicialización ========== */
console.log("[menu_local] Inicializando Supabase...");
const db = supabase.createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw"
);

/* ========== Estado Global ========== */
let areaActual = "";
let categoriaActual = ""; // se toma del select dentro del modal

/* ========== Utilidades ========== */
const log = {
  info: (m, d) => console.log(`[menu_local][INFO] ${m}`, d ?? ""),
  err: (m, e) => console.error(`[menu_local][ERROR] ${m}`, e),
};
function setModal(id, visible) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = visible ? "flex" : "none";
  el.setAttribute("aria-hidden", visible ? "false" : "true");
}

/* ========== Áreas Cliente ========== */
async function mostrarAreasCliente() {
  log.info("Cargando áreas activas...");
  const { data, error } = await db.from("areas_estado").select("*").eq("activo", true);
  if (error) return log.err("Error al cargar áreas activas", error);

  const cont = document.querySelector(".areas-container");
  cont.innerHTML = (data || [])
    .map(a => `<button class="btn-area" onclick="abrirMenu('${a.nombre}')">🏷️ ${a.nombre}</button>`)
    .join("");

  if (!data || data.length === 0) {
    cont.innerHTML = `<p class="estado-vacio">No hay áreas activas en este momento.</p>`;
  }
}

/* ========== Menú por Área (RPC + filtro categoría en modal) ========== */
async function abrirMenu(area) {
  areaActual = area;
  // Toma la categoría desde el select del modal (si existe)
  categoriaActual = document.getElementById("modal-filtro-categoria")?.value || "";
  log.info("Abrir menú área", { area, categoriaActual });

  const { data: productos, error } = await db.rpc("menu_items_by_area_destino", {
  area: area,
  destino: "local",
  categoria: categoriaActual || null
});

  if (error) return log.err("Error al cargar productos", error);

  console.log("[menu_local][DEBUG] Productos recibidos:", productos);

  const body = document.getElementById("modal-productos");
  document.getElementById("modal-titulo").textContent = `Menú de ${area}`;

  if (!productos || productos.length === 0) {
    body.innerHTML = `<p class="estado-vacio">No hay productos disponibles para esta área y categoría.</p>`;
  } else {
    body.innerHTML = productos.map(p => `
      <div class="producto-lineal">
        <div class="producto-info">
          <strong>${escapeHtml(p.nombre || "Sin nombre")}</strong>
        </div>
        <div class="producto-acciones">
          <button class="btn-info" onclick="mostrarDescripcion('${escapeHtml(p.descripcion || "")}', '${escapeHtml(p.imagen_url || "")}', '${escapeHtml(p.nombre || "Producto")}')">ℹ️</button>
          <span class="precio">${p.precio ? Number(p.precio).toFixed(2) : "N/D"} CUP</span>
          <span class="stock">${parseInt(p.stock) > 0 ? `Stock: ${p.stock}` : "Agotado"}</span>
        </div>
      </div>
    `).join("");
  }

  setModal("modal-menu", true);
}
function cerrarModal() { setModal("modal-menu", false); }

/* ========== Descripción Producto ========== */
function mostrarDescripcion(descripcion, imagenUrl, nombre = "Producto") {
  log.info("Mostrar descripción producto", { nombre });
  const body = document.getElementById("modal-descripcion-body");
  const titulo = document.getElementById("modal-descripcion-titulo");
  titulo.textContent = nombre || "Descripción";

  const img = imagenUrl ? `<img src="${imagenUrl}" alt="Imagen de ${nombre}" class="img-producto" />` : "";
  const txt = descripcion ? `<p class="texto-descripcion">${descripcion}</p>` : `<p class="texto-descripcion estado-vacio">Sin descripción disponible.</p>`;

  body.innerHTML = `${img}${txt}`;
  setModal("modal-descripcion", true);
}
function cerrarModalDescripcion() { setModal("modal-descripcion", false); }

/* ========== Administración: Login y Panel Áreas ========== */
function abrirLogin() { setModal("modal-login", true); }
function cerrarLogin() { setModal("modal-login", false); }
function cerrarAreas() { setModal("modal-areas", false); }

function loginAdmin() {
  const user = document.getElementById("admin-user").value.trim();
  const pass = document.getElementById("admin-pass").value.trim();
  log.info("Intento login admin", { user });

  if ((user === "admin" && pass === "1234") || (user === "gerente" && pass === "1234")) {
    cerrarLogin();
    cargarPanelAreas();
    setModal("modal-areas", true);
  } else {
    alert("Credenciales incorrectas");
  }
}

async function cargarPanelAreas() {
  log.info("Cargando panel de áreas...");
  const { data: areas, error } = await db.from("areas_estado").select("*");
  if (error) return log.err("Error al cargar panel áreas", error);

  const cont = document.getElementById("lista-areas");
  cont.innerHTML = (areas || []).map(a => `
    <div class="area-control">
      <div class="area-label">${a.nombre}</div>
      <label class="switch">
        <input type="checkbox" ${a.activo ? "checked" : ""} onchange="toggleArea('${a.nombre}', this.checked)" />
        <span class="slider"></span>
      </label>
    </div>
  `).join("");
}

async function toggleArea(nombre, estado) {
  log.info("Toggle área", { nombre, estado });
  const { error } = await db.from("areas_estado").update({ activo: estado }).eq("nombre", nombre);
  if (error) return log.err("Error al actualizar área", error);

  await mostrarAreasCliente();
  if (areaActual === nombre && !estado) { cerrarModal(); areaActual = ""; }
}

/* ========== Captación WhatsApp ========== */
async function unirseWhatsApp() {
  const nombre = document.getElementById("cliente-nombre").value.trim();
  const telefono = document.getElementById("cliente-telefono").value.trim();
  if (!nombre || !telefono) return alert("Completa nombre y teléfono.");
  log.info("Cliente WhatsApp", { nombre, telefono });

  const { error } = await db.from("clientes_whatsapp").insert([{ nombre, telefono }]);
  if (error) return log.err("Error al insertar cliente WhatsApp", error);

  alert("¡Gracias! Te contactaremos por WhatsApp.");
  document.getElementById("cliente-nombre").value = "";
  document.getElementById("cliente-telefono").value = "";
}

/* ========== Criterio de Servicio ========== */
async function guardarCriterio() {
  const nombre = document.getElementById("criterio-nombre").value.trim();
  const contacto = document.getElementById("criterio-contacto").value.trim();
  const criterio = document.getElementById("criterio-texto").value.trim();
  if (!nombre || !contacto || !criterio) return alert("Completa todos los campos.");
  log.info("Guardar criterio servicio", { nombre, contacto, criterio });

  const { error } = await db.from("criterios_servicio").insert([{ nombre, contacto, criterio }]);
  if (error) return log.err("Error al insertar criterio servicio", error);

  alert("¡Gracias por tu opinión!");
  document.getElementById("criterio-nombre").value = "";
  document.getElementById("criterio-contacto").value = "";
  document.getElementById("criterio-texto").value = "";
}

/* ========== Seguridad: Escapar HTML ========== */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ========== Bootstrap ========== */
document.addEventListener("DOMContentLoaded", async () => {
  log.info("DOM cargado, inicializando...");
  mostrarAreasCliente();
  // Se elimina el listener del filtro global (ya no existe fuera del modal)
});

/* ========== Exponer funciones globales ========== */
window.abrirMenu = abrirMenu;
window.cerrarModal = cerrarModal;

window.mostrarDescripcion = mostrarDescripcion;
window.cerrarModalDescripcion = cerrarModalDescripcion;

window.abrirLogin = abrirLogin;
window.cerrarLogin = cerrarLogin;
window.loginAdmin = loginAdmin;

window.cerrarAreas = cerrarAreas;
window.toggleArea = toggleArea;

window.unirseWhatsApp = unirseWhatsApp;
window.guardarCriterio = guardarCriterio;

console.log("[menu_local] Script inicializado y funciones expuestas al window ✔️");
