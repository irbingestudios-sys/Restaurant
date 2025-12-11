import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* ==========
   Supabase (igual que FOCSA, anon, sin auth de navegador)
   ========== */
const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw"
);

/* ==========
   Estado UI
   ========== */
let areaActual = "";
let categoriaActual = "";

/* ==========
   Utilidades de log y UI
   ========== */
function logInfo(etiqueta, dato) {
  console.log(`[menu_local] ${etiqueta}:`, dato);
}
function logError(etiqueta, error) {
  console.error(`[menu_local][ERROR] ${etiqueta}:`, error);
}
function setModalVisible(id, visible) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = visible ? "flex" : "none";
  el.setAttribute("aria-hidden", visible ? "false" : "true");
}

/* ==========
   Render de áreas para cliente (solo activas)
   ========== */
async function mostrarAreasCliente() {
  const { data: areas, error } = await supabase
    .from("areas_estado")
    .select("*")
    .eq("activo", true);
  if (error) return logError("Cargar áreas activas", error);
  logInfo("Áreas activas", areas);

  const contenedor = document.querySelector(".areas-container");
  contenedor.innerHTML = (areas || [])
    .map(
      (a) =>
        `<button class="btn-area" onclick="abrirMenu('${a.nombre}')">🏷️ ${a.nombre}</button>`
    )
    .join("");
}

/* ==========
   Abrir menú de un área (solo disponibles y con stock)
   ========== */
async function abrirMenu(area) {
  areaActual = area;
  categoriaActual = document.getElementById("filtro-categoria")?.value || "";

  logInfo("Abrir menú área", { area, categoriaActual });

  let query = supabase
    .from("menu_item")
    .select("*")
    .contains("areas", [area])
    .contains("destinos", ["local"])
    .eq("disponible", true)
    .gt("stock", 0);

  if (categoriaActual) {
    query = query.eq("categoria", categoriaActual);
  }

  const { data: productos, error } = await query;
  if (error) return logError(`Cargar productos área ${area}`, error);

  logInfo(`Productos área ${area}`, productos);

  const cuerpo = document.getElementById("modal-productos");
  document.getElementById("modal-titulo").textContent = `Menú de ${area}`;

  if (!productos || productos.length === 0) {
    cuerpo.innerHTML = `<p class="estado-vacio">No hay productos disponibles en esta área y categoría.</p>`;
  } else {
    cuerpo.innerHTML = productos
      .map(
        (p) => `
      <div class="producto-lineal">
        <div class="producto-info">
          <strong>${p.nombre}</strong>
          ${p.etiquetas?.length ? `<span class="chip">${p.etiquetas.join(", ")}</span>` : ""}
        </div>
        <div class="producto-acciones">
          <button class="btn-info" onclick="mostrarDescripcion('${escapeHtml(p.descripcion || "")}', '${escapeHtml(p.imagen_url || "")}', '${escapeHtml(p.nombre)}')">ℹ️</button>
          <span class="precio">${Number(p.precio).toFixed(2)} CUP</span>
        </div>
      </div>`
      )
      .join("");
  }

  setModalVisible("modal-menu", true);
}

/* ==========
   Descripción de producto (segundo modal)
   ========== */
function mostrarDescripcion(descripcion, imagenUrl, nombre = "Producto") {
  const body = document.getElementById("modal-descripcion-body");
  const titulo = document.getElementById("modal-descripcion-titulo");
  titulo.textContent = nombre || "Descripción";

  const imagen = imagenUrl
    ? `<img src="${imagenUrl}" alt="Imagen de ${nombre}" class="img-producto" />`
    : "";

  const texto = descripcion
    ? `<p class="texto-descripcion">${descripcion}</p>`
    : `<p class="texto-descripcion estado-vacio">Sin descripción disponible.</p>`;

  body.innerHTML = `${imagen}${texto}`;
  setModalVisible("modal-descripcion", true);
}

function cerrarModal() {
  setModalVisible("modal-menu", false);
}
function cerrarModalDescripcion() {
  setModalVisible("modal-descripcion", false);
}

/* ==========
   Panel de administración (roles autorizados)
   ========== */
async function cargarPanelAreas() {
  const { data: areas, error } = await supabase.from("areas_estado").select("*");
  if (error) return logError("Cargar panel áreas", error);
  logInfo("Panel áreas", areas);

  const contenedor = document.getElementById("lista-areas");
  contenedor.innerHTML = (areas || [])
    .map(
      (a) => `
    <div class="area-control">
      <label>${a.nombre}</label>
      <label class="switch">
        <input type="checkbox" ${a.activo ? "checked" : ""} onchange="toggleArea('${a.nombre}', this.checked)" />
        <span class="slider"></span>
      </label>
    </div>`
    )
    .join("");
}

async function toggleArea(nombre, estado) {
  logInfo("Toggle área", { nombre, estado });
  const { error } = await supabase
    .from("areas_estado")
    .update({ activo: estado })
    .eq("nombre", nombre);
  if (error) return logError("Actualizar estado área", error);
  logInfo("Área actualizada", nombre);
}

/* ==========
   Captación de cliente (WhatsApp)
   ========== */
async function unirseWhatsApp() {
  const nombre = document.getElementById("cliente-nombre").value?.trim();
  const telefono = document.getElementById("cliente-telefono").value?.trim();

  if (!nombre || !telefono) {
    alert("Por favor, completa nombre y teléfono.");
    return;
  }

  logInfo("Insertar cliente WhatsApp", { nombre, telefono });
  const { error } = await supabase
    .from("clientes_whatsapp")
    .insert([{ nombre, telefono }]);

  if (error) return logError("Insertar cliente WhatsApp", error);
  alert("¡Gracias! Te contactaremos para unirte al grupo de WhatsApp.");
  document.getElementById("cliente-nombre").value = "";
  document.getElementById("cliente-telefono").value = "";
}

/* ==========
   Criterio de servicio
   ========== */
async function guardarCriterio() {
  const nombre = document.getElementById("criterio-nombre").value?.trim();
  const contacto = document.getElementById("criterio-contacto").value?.trim();
  const criterio = document.getElementById("criterio-texto").value?.trim();

  if (!nombre || !contacto || !criterio) {
    alert("Por favor, completa todos los campos.");
    return;
  }

  logInfo("Insertar criterio servicio", { nombre, contacto, criterio });
  const { error } = await supabase
    .from("criterios_servicio")
    .insert([{ nombre, contacto, criterio }]);

  if (error) return logError("Insertar criterio servicio", error);
  alert("¡Gracias por tu opinión! Nos ayuda a mejorar.");
  document.getElementById("criterio-nombre").value = "";
  document.getElementById("criterio-contacto").value = "";
  document.getElementById("criterio-texto").value = "";
}

/* ==========
   Filtro por categoría reactivo dentro del modal del área actual
   ========== */
function onCategoriaChange() {
  const select = document.getElementById("filtro-categoria");
  categoriaActual = select?.value || "";
  if (areaActual) {
    abrirMenu(areaActual);
  }
}

/* ==========
   Seguridad: escapar HTML en strings
   ========== */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========
   Bootstrap del módulo (control por rol)
   ========== */
document.addEventListener("DOMContentLoaded", async () => {
  // Vincular cambio de categoría
  const selectCat = document.getElementById("filtro-categoria");
  if (selectCat) selectCat.addEventListener("change", onCategoriaChange);

  // Intentar obtener rol (si RPC existe). Si no, degradar a cliente.
  let rol = "cliente";
  try {
    const { data: perfil, error } = await supabase.rpc("obtener_perfil_seguro");
    if (error) logError("RPC obtener_perfil_seguro", error);
    rol = perfil?.[0]?.rol || "cliente";
  } catch (e) {
    logError("RPC perfil (catch)", e);
  }
  logInfo("Rol detectado", rol);

  if (["super_admin", "admin", "gerente"].includes(rol)) {
    document.getElementById("panel-areas").style.display = "block";
    cargarPanelAreas();
    mostrarAreasCliente(); // También mostrar al pie las áreas vistas por cliente para validar
  } else {
    mostrarAreasCliente();
  }
});

/* ==========
   Exponer funciones al ámbito global para uso en HTML inline
   ========== */
window.abrirMenu = abrirMenu;
window.cerrarModal = cerrarModal;
window.mostrarDescripcion = mostrarDescripcion;
window.cerrarModalDescripcion = cerrarModalDescripcion;
window.unirseWhatsApp = unirseWhatsApp;
window.guardarCriterio = guardarCriterio;
window.toggleArea = toggleArea;
