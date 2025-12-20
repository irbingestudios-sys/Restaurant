/* ========== Supabase Inicialización ========== */
console.log("[menu_local] Inicializando Supabase...");

const { createClient } = supabase; // del CDN @supabase/supabase-js@2

// Cliente público (anon) para lecturas abiertas
const dbPublic = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw", // ⚠️ solo anon key
  {
    auth: { persistSession: false, autoRefreshToken: false },
    storageKey: "public-session"
  }
);

// Cliente autenticado para panel admin (usa anon key pero con sesión persistente)
const dbAuth = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw", // ⚠️ también anon key
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    storageKey: "auth-session"
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
function abrirLogin() { 
  log.info("[Acceso Admin] Abriendo modal login"); 
  setModal("modal-login", true); 
}
function cerrarLogin() { 
  log.info("[Acceso Admin] Cerrando modal login"); 
  setModal("modal-login", false); 
}
function cerrarAreas() { 
  log.info("[Acceso Admin] Cerrando panel áreas"); 
  setModal("modal-areas", false); 
}

async function loginAdmin() {
  const email = document.getElementById("admin-user").value.trim();
  const password = document.getElementById("admin-pass").value.trim();
  log.info("[Acceso Admin] Intentando login", { email });

  const { data, error } = await dbAuth.auth.signInWithPassword({ email, password });
  if (error) {
    log.err("[Acceso Admin] Error en signInWithPassword", error);
    alert("Credenciales incorrectas");
    return;
  }
  log.info("[Acceso Admin] Login correcto, obteniendo usuario…");

  const { data: userData, error: userError } = await dbAuth.auth.getUser();
  if (userError) {
    log.err("[Acceso Admin] Error al obtener usuario", userError);
    return;
  }
  log.info("[Acceso Admin] Datos completos de usuario", userData);

  const role = userData?.user?.app_metadata?.role || userData?.user?.user_metadata?.role;
  log.info("[Acceso Admin] Rol detectado", role);

  const rolesPermitidos = ["admin", "gerente", "super_admin"];
  if (!rolesPermitidos.includes(role)) {
    log.warn("[Acceso Admin] Rol no autorizado", role);
    alert("Acceso no autorizado para este rol");
    await dbAuth.auth.signOut();
    return;
  }

  log.info("[Acceso Admin] Rol autorizado, cargando panel áreas…");
  cerrarLogin();
  await cargarPanelAreas();
  setModal("modal-areas", true);
}

async function cargarPanelAreas() {
  log.info("[Acceso Admin] Cargando áreas desde Supabase…");
  const { data: areas, error } = await dbAuth.from("areas_estado").select("*");
  if (error) {
    log.err("[Acceso Admin] Error al cargar áreas", error);
    return;
  }
  log.info("[Acceso Admin] Áreas cargadas", areas);

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

/* ========== Administración: toggleArea con RPC ========== */
async function toggleArea(nombre, estado) {
  const nombreNorm = nombre.trim().toLowerCase();
  log.info("[Acceso Admin] Actualizando área", { nombre: nombreNorm, estado });

  // Usando RPC para bypass RLS
  const { data, error } = await dbAuth.rpc("toggle_area", {
    p_nombre: nombreNorm,
    p_estado: estado
  });

  if (error) {
    log.err("[Acceso Admin] Error en RPC toggle_area", error);
    alert("No se pudo actualizar el área (RPC).");
    return;
  }

  log.info("[Acceso Admin] Resultado RPC toggle_area", data);

  // Verificación directa en base
  const { data: verificacion, error: errorVerificacion } = await dbAuth
    .from("areas_estado")
    .select("*")
    .eq("nombre", nombreNorm);

  if (errorVerificacion) {
    log.err("[Acceso Admin] Error al verificar estado post-update", errorVerificacion);
  } else {
    log.info("[Acceso Admin] Estado actual en base tras RPC", verificacion);
    if (verificacion?.length && verificacion[0].activo !== estado) {
      log.warn("[Acceso Admin] El área no refleja el cambio en la base", verificacion[0]);
      alert(`⚠️ El área "${nombreNorm}" no se actualizó. Estado actual: ${verificacion[0].activo}`);
    }
  }

  await mostrarAreasCliente();
  if (areaActual === nombreNorm && !estado) {
    cerrarModal();
    areaActual = "";
  }
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
