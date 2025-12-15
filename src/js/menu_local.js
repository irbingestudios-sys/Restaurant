/* ========== Supabase Inicialización ========== */
console.log("[menu_local] Inicializando Supabase...");
const { createClient } = supabase; // del CDN @supabase/supabase-js@2

// Cliente público (anon) para lecturas abiertas
const dbPublic = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw",
  {
    auth: { persistSession: false, autoRefreshToken: false },
    storageKey: "public-session"   // 🔑 clave separada para evitar conflicto
  }
);

// Cliente autenticado (session) para panel admin
const dbAuth = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw",
  {
    auth: { persistSession: true, autoRefreshToken: true },
    storageKey: "auth-session"     // 🔑 clave distinta para sesiones admin
  }
);

/* ========== Estado Global ========== */
let areaActual = "";
let categoriaActual = "";

/* ========== Utilidades ========== */
const log = {
  info: (m, d) => console.log(`[menu_local][INFO] ${m}`, d ?? ""),
  err: (m, e) => console.error(`[menu_local][ERROR] ${m}`, e),
  warn: (m, d) => console.warn(`[menu_local][WARN] ${m}`, d ?? "")
};
function setModal(id, visible) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = visible ? "flex" : "none";
  el.setAttribute("aria-hidden", visible ? "false" : "true");
}
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ========== Áreas Cliente (usa dbPublic) ========== */
async function mostrarAreasCliente() {
  log.info("Cargando áreas activas...");
  const { data, error } = await dbPublic.from("areas_estado").select("*").eq("activo", true);
  if (error) return log.err("Error al cargar áreas activas", error);

  const cont = document.querySelector(".areas-container");
  cont.innerHTML = (data || [])
    .map(a => `<button class="btn-area" onclick="abrirMenu('${a.nombre}')">🏷️ ${a.nombre}</button>`)
    .join("");

  if (!data || data.length === 0) {
    cont.innerHTML = `<p class="estado-vacio">No hay áreas activas en este momento.</p>`;
  }
}

/* ========== Menú por Área (usa dbPublic) ========== */
async function abrirMenu(area) {
  try {
    areaActual = area;
    categoriaActual = document.getElementById("modal-filtro-categoria")?.value || "";
    log.info("[abrirMenu] Iniciando carga del menú", { area, categoriaActual });

    const { data: productos, error } = await dbPublic.rpc("menu_items_by_area_destino", {
      area,
      destino: "local",
      categoria: categoriaActual || null
    });
    if (error) return log.err("[abrirMenu] Error en RPC menu_items_by_area_destino", error);

    const body = document.getElementById("modal-productos");
    document.getElementById("modal-titulo").textContent = `Menú de ${area}`;

    if (!productos || productos.length === 0) {
      body.innerHTML = `<p class="estado-vacio">No hay productos disponibles para esta área y categoría.</p>`;
    } else {
      body.innerHTML = productos.map(p => `
        <div class="producto-lineal">
          <div class="producto-info"><strong>${escapeHtml(p.nombre || "Sin nombre")}</strong></div>
          <div class="producto-acciones">
            <button class="btn-info"
              onclick="mostrarDescripcion(
                '${escapeHtml(p.descripcion || "")}',
                '${escapeHtml(p.imagen_url || "")}',
                '${escapeHtml(p.nombre || "Producto")}'
              )">ℹ️</button>
            <span class="precio">${p.precio ? Number(p.precio).toFixed(2) : "N/D"} CUP</span>
            <span class="stock">${parseInt(p.stock) > 0 ? `Stock: ${p.stock}` : "Agotado"}</span>
          </div>
        </div>`).join("");
    }
    setModal("modal-menu", true);
  } catch (e) { log.err("[abrirMenu] Excepción inesperada", e); }
}
function cerrarModal() { setModal("modal-menu", false); }

/* ========== Descripción Producto ========== */
function mostrarDescripcion(descripcion, imagenUrl, nombre = "Producto") {
  const body = document.getElementById("modal-descripcion-body");
  const titulo = document.getElementById("modal-descripcion-titulo");
  titulo.textContent = nombre || "Descripción";
  const img = imagenUrl ? `<img src="${imagenUrl}" alt="Imagen de ${escapeHtml(nombre)}" class="img-producto" />` : "";
  const txt = descripcion ? `<p class="texto-descripcion">${escapeHtml(descripcion)}</p>` : `<p class="texto-descripcion estado-vacio">Sin descripción disponible.</p>`;
  body.innerHTML = `${img}${txt}`;
  setModal("modal-descripcion", true);
}
function cerrarModalDescripcion() { setModal("modal-descripcion", false); }

/* ========== Administración: Login y Panel Áreas (usa dbAuth) ========== */
function abrirLogin() { setModal("modal-login", true); }
function cerrarLogin() { setModal("modal-login", false); }
function cerrarAreas() { setModal("modal-areas", false); }

async function loginAdmin() {
  const email = document.getElementById("admin-user").value.trim();
  const password = document.getElementById("admin-pass").value.trim();

  const { data, error } = await dbAuth.auth.signInWithPassword({ email, password });
  if (error) { alert("Credenciales incorrectas"); return; }

  const { data: userData } = await dbAuth.auth.getUser();
  const role = userData?.user?.app_metadata?.role || userData?.user?.user_metadata?.role;
  const rolesPermitidos = ["admin", "gerente", "super_admin"];

  if (!rolesPermitidos.includes(role)) {
    alert("Acceso no autorizado para este rol");
    await dbAuth.auth.signOut();
    return;
  }

  cerrarLogin();
  await cargarPanelAreas();
  setModal("modal-areas", true);
}

async function cargarPanelAreas() {
  const { data: areas, error } = await dbAuth.from("areas_estado").select("*");
  if (error) return log.err("Error al cargar panel áreas", error);
  const cont = document.getElementById("lista-areas");
  cont.innerHTML = (areas || []).map(a => `
    <div class="area-control">
      <div class="area-label">${escapeHtml(a.nombre)}</div>
      <label class="switch">
        <input type="checkbox" ${a.activo ? "checked" : ""} onchange="toggleArea('${escapeHtml(a.nombre)}', this.checked)" />
        <span class="slider"></span>
      </label>
    </div>`).join("");
}

async function toggleArea(nombre, estado) {
  const { error } = await dbAuth.from("areas_estado").update({ activo: estado }).eq("nombre", nombre);
  if (error) return log.err("Error al actualizar área", error);
  await mostrarAreasCliente(); // usa dbPublic
  if (areaActual === nombre && !estado) { cerrarModal(); areaActual = ""; }
}

/* ========== Captación WhatsApp (usa dbPublic) ========== */
async function unirseWhatsApp() {
  const nombre = document.getElementById("cliente-nombre").value.trim();
  const telefono = document.getElementById("cliente-telefono").value.trim();
  if (!nombre || !telefono) return alert("Completa nombre y teléfono.");
  const { error } = await dbPublic.from("clientes_whatsapp").insert([{ nombre, telefono }]);
  if (error) return log.err("Error al insertar cliente WhatsApp", error);
  alert("¡Gracias! Te contactaremos por WhatsApp.");
  document.getElementById("cliente-nombre").value = "";
  document.getElementById("cliente-telefono").value = "";
}

/* ========== Criterio de Servicio (usa dbPublic) ========== */
async function guardarCriterio() {
  const nombre = document.getElementById("criterio-nombre").value.trim();
  const contacto = document.getElementById("criterio-contacto").value.trim();
  const criterio = document.getElementById("criterio-texto").value.trim();
  if (!nombre || !contacto || !criterio) return alert("Completa todos los campos.");
  const { error } = await dbPublic.from("criterios_servicio").insert([{ nombre, contacto, criterio }]);
  if (error) return log.err("Error al insertar criterio servicio", error);
  alert("¡Gracias por tu opinión!");
  document.getElementById("criterio-nombre").value = "";
  document.getElementById("criterio-contacto").value = "";
  document.getElementById("criterio-texto").value = "";
}

/* ========== Bootstrap ========== */
document.addEventListener("DOMContentLoaded", async () => {
  log.info("DOM cargado, inicializando...");
  await mostrarAreasCliente(); // usa dbPublic
  // El filtro de categoría se maneja dentro del modal con onchange="abrirMenu(areaActual)"
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
