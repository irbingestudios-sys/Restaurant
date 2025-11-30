// ┌───────────────────────────────────────────────┐
// │ Módulo: FOCSA                                 │
// │ Script: script-focsa2.js (versión completa)    │
// │ Ajustado según cambios solicitados            │
// └───────────────────────────────────────────────┘

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* Configuración Supabase: usa tus credenciales reales del proyecto */
const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw"
);
window.supabase = supabase;

/* Estado */
let menu = [];
let envases = [];
let cantidades = {};
let cantidadesEnvases = {};

/* Inicialización */
document.addEventListener("DOMContentLoaded", async () => {
  console.group("🟢 FOCSA — Inicialización");
  console.log("🚀 Script FOCSA inicializado");

  await cargarMenuEspecial();
  await cargarEnvases();
  inicializarFiltros();

  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (pedidoId) {
    const seg = document.getElementById("seguimiento-pedido");
    if (seg) seg.style.display = "block";
  }

  renderizarSeguimientoPedidos();
  calcularTotales();

  console.groupEnd();
});

/* =========================
   Carga de menú y envases
   ========================= */
async function cargarMenuEspecial() {
  console.group("📥 Carga de menú");
  const { data, error } = await supabase.rpc("obtener_menu_focsa");
  if (error) {
    console.error("❌ Error al cargar menú:", error);
    console.groupEnd();
    return;
  }
  menu = data || [];
  console.log("✅ Menú cargado:", menu.length, "items");
  renderMenuEspecial(menu);
  console.groupEnd();
}

async function cargarEnvases() {
  console.group("📥 Carga de envases");
  const { data, error } = await supabase
    .from("menu_item")
    .select("*")
    .eq("categoria", "Envases")
    .eq("disponible", true)
    .gt("stock", 0)
    .order("precio", { ascending: true });

  if (error) {
    console.error("❌ Error al cargar envases:", error);
    console.groupEnd();
    return;
  }
  envases = data || [];
  console.log("🧴 Envases cargados:", envases.length);
  renderEnvases(envases);
  console.groupEnd();
}

/* =========================
   Filtros horizontales
   ========================= */
function inicializarFiltros() {
  console.group("🔧 Inicialización de filtros horizontales");
  const barraFiltros = document.getElementById("barra-filtros");
  if (!barraFiltros) {
    console.warn("⚠️ No se encontró el contenedor de filtros");
    console.groupEnd();
    return;
  }
  barraFiltros.innerHTML = "";

  const categoriasUnicas = [...new Set(menu.map(item => item.categoria))];
  if (!categoriasUnicas.includes("Envases")) categoriasUnicas.push("Envases");

  ["todos", ...categoriasUnicas].forEach(cat => {
    const chip = document.createElement("button");
    chip.className = "filtro-chip";
    chip.textContent = cat;
    chip.dataset.cat = cat;
    chip.onclick = () => {
      document.querySelectorAll(".filtro-chip").forEach(c => c.classList.remove("activo"));
      chip.classList.add("activo");
      filtrarMenu(cat);
    };
    barraFiltros.appendChild(chip);
  });

  // activar por defecto "todos"
  const first = barraFiltros.querySelector(".filtro-chip");
  if (first) {
    first.classList.add("activo");
    filtrarMenu("todos");
  }

  console.log("✅ Filtros generados:", categoriasUnicas);
  console.groupEnd();
}

/* =========================
   Renderizado en tarjetas
   ========================= */
function renderGrupoTarjetas(lista, contenedorId, destinoCantidades) {
  console.group(`🖼️ Renderizado tarjetas en ${contenedorId}`);
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) {
    console.warn(`⚠️ No se encontró contenedor: ${contenedorId}`);
    console.groupEnd();
    return;
  }
  contenedor.innerHTML = "";

  lista.forEach(item => {
    const card = document.createElement("div");
    card.className = "producto-card";
    card.innerHTML = `
      <h3>${item.nombre}</h3>
      <p>${item.descripcion || ""}</p>
      <div class="precio-agregar">
        <span>${item.precio} CUP</span>
        <input type="number" min="0" value="${destinoCantidades[item.nombre] || 0}"
          data-name="${item.nombre}" data-price="${item.precio}" />
      </div>
    `;
    contenedor.appendChild(card);
  });

  contenedor.querySelectorAll("input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      destinoCantidades[input.dataset.name] = parseInt(input.value) || 0;
      calcularTotales();
    });
  });

  console.log("✅ Tarjetas renderizadas:", lista.length);
  console.groupEnd();
}

function renderMenuEspecial(lista) {
  renderGrupoTarjetas(lista, "menu-especial", cantidades);
}
function renderEnvases(lista) {
  renderGrupoTarjetas(lista, "envases-contenedor", cantidadesEnvases);
}

/* =========================
   Filtro
   ========================= */
function filtrarMenu(categoriaSeleccionada = "todos") {
  console.group("🔍 Filtro de categoría");
  console.log("📌 Categoría seleccionada:", categoriaSeleccionada);

  if (categoriaSeleccionada === "todos") {
    renderMenuEspecial(menu);
    renderEnvases(envases);
  } else if (categoriaSeleccionada === "Envases") {
    renderGrupoTarjetas(envases.filter(i => i.categoria === "Envases"), "envases-contenedor", cantidadesEnvases);
    const ms = document.getElementById("menu-especial");
    if (ms) ms.innerHTML = "";
  } else {
    renderGrupoTarjetas(menu.filter(i => i.categoria === categoriaSeleccionada), "menu-especial", cantidades);
    const ec = document.getElementById("envases-contenedor");
    if (ec) ec.innerHTML = "";
  }

  console.groupEnd();
}
window.filtrarMenu = filtrarMenu;

/* =========================
   Totales
   ========================= */
function calcularTotales() {
  console.group("🧮 Cálculo de totales");
  let total = 0, cantidadTotal = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      total += cant * item.precio;
      cantidadTotal += cant;
    }
  }

  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      total += cant * item.precio;
      cantidadTotal += cant;
    }
  }

  const totalEl = document.getElementById("total-cup");
  const itemsEl = document.getElementById("total-items");
  if (totalEl) totalEl.textContent = total.toFixed(2);
  if (itemsEl) itemsEl.textContent = cantidadTotal;

  console.log("🧮 Totales actualizados:", { total, cantidadTotal });
  console.groupEnd();
}

/* =========================
   Resumen y validaciones
   ========================= */
function revisarPedido() {
  console.group("🧾 Vista previa del pedido");
  const cliente = document.getElementById("cliente")?.value.trim();
  const piso = document.getElementById("piso")?.value.trim();
  const apartamento = document.getElementById("apartamento")?.value.trim();
  const telefono = document.getElementById("telefono")?.value.trim();
  const unirse = document.getElementById("unirseGrupo")?.checked;

  // Validación de datos obligatorios
  if (!cliente || !piso || !apartamento) {
    alert("Por favor, complete los datos del cliente (Nombre, Piso, Apartamento).");
    console.warn("❌ Datos incompletos para revisión.");
    console.groupEnd();
    return;
  }

  // Validación de envases
  const tieneEnvase = Object.values(cantidadesEnvases).some(c => c > 0);
  if (!tieneEnvase) {
    alert("Debe seleccionar al menos un envase para realizar la entrega.");
    console.warn("❌ Pedido sin envases.");
    console.groupEnd();
    return;
  }

  const resumen = document.getElementById("contenido-resumen");
  if (!resumen) {
    console.warn("⚠️ No se encontró contenedor de resumen.");
    console.groupEnd();
    return;
  }
  resumen.innerHTML = `
    <div class="cliente-datos">
      <p><strong>Cliente:</strong> ${cliente}</p>
      <p><strong>Piso:</strong> ${piso}</p>
      <p><strong>Apartamento:</strong> ${apartamento}</p>
      <p><strong>Teléfono:</strong> ${telefono || "—"}</p>
      <p><strong>Grupo La Casona:</strong> ${unirse ? "✅ Sí desea unirse" : "❌ No desea unirse"}</p>
    </div>
    <hr />
  `;

  const items = [];
  let total = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre: item.nombre, cantidad: cant, precio: item.precio, subtotal });
      total += subtotal;
    }
  }

  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre: item.nombre, cantidad: cant, precio: item.precio, subtotal });
      total += subtotal;
    }
  }

  if (items.length === 0) {
    resumen.innerHTML += "<p>No ha seleccionado ningún producto.</p>";
  } else {
    items.forEach(item => {
      resumen.innerHTML += `
        <div class="producto-lineal">
          <div class="producto-izquierda"><strong>${item.nombre}</strong></div>
          <div class="producto-derecha">
            <span>x${item.cantidad}</span>
            <span>= ${item.subtotal} CUP</span>
          </div>
        </div>`;
    });
    resumen.innerHTML += `<p><strong>Total:</strong> ${total.toFixed(2)} CUP</p>`;
  }

  const modal = document.getElementById("modal-resumen");
  if (modal) modal.style.display = "block";

  console.groupEnd();
}
window.revisarPedido = revisarPedido;

/* =========================
   Enviar por WhatsApp
   ========================= */
async function enviarWhatsApp() {
  console.group("📲 Enviar pedido por WhatsApp");

  const cliente = document.getElementById("cliente")?.value.trim();
  const piso = document.getElementById("piso")?.value.trim();
  const apartamento = document.getElementById("apartamento")?.value.trim();
  const telefono = document.getElementById("telefono")?.value.trim();
  const unirse = document.getElementById("unirseGrupo")?.checked;

  // Validaciones
  if (!cliente || !piso || !apartamento) {
    alert("Por favor, complete los datos del cliente (Nombre, Piso, Apartamento).");
    console.warn("❌ Datos incompletos para WhatsApp.");
    console.groupEnd();
    return;
  }
  const tieneEnvase = Object.values(cantidadesEnvases).some(c => c > 0);
  if (!tieneEnvase) {
    alert("Debe seleccionar al menos un envase para realizar la entrega.");
    console.warn("❌ Pedido sin envases.");
    console.groupEnd();
    return;
  }

  const items = [];
  let total = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre: item.nombre, cantidad: cant, precio: item.precio, subtotal });
      total += subtotal;
    }
  }
  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre: item.nombre, cantidad: cant, precio: item.precio, subtotal });
      total += subtotal;
    }
  }

  // Registrar pedido vía RPC con canal whatsapp
  const { data, error } = await supabase.rpc("registrar_pedido_focsa", {
    p_cliente: cliente,
    p_piso: piso,
    p_apartamento: apartamento,
    p_telefono: telefono || null,
    p_direccion: null,
    p_unirse_grupo: unirse,
    p_items: items,
    p_canal: "whatsapp",
  });

  if (error) {
    console.error("❌ Error RPC:", error);
    console.groupEnd();
    return;
  }

  const pedidoId = data?.[0]?.pedido_id;
  if (!pedidoId) {
    console.warn("⚠️ No se devolvió pedido_id");
    console.groupEnd();
    return;
  }

  localStorage.setItem("pedido_id_actual", pedidoId);
  const historial = JSON.parse(localStorage.getItem("historial_pedidos") || "[]");
  historial.push(pedidoId);
  localStorage.setItem("historial_pedidos", JSON.stringify(historial));
  renderizarSeguimientoPedidos();

  console.log("📥 Pedido registrado con ID:", pedidoId);

  const grupoTexto = unirse ? "✅ Desea unirse al grupo" : "❌ No desea unirse al grupo";
  const mensaje = `🧾 Pedido FOCSA
Cliente: ${cliente}
Piso: ${piso}
Apartamento: ${apartamento}
Teléfono: ${telefono || "—"}
${grupoTexto}

${items.map(i => `• ${i.nombre} x${i.cantidad} = ${i.subtotal} CUP`).join("\n")}
Total: ${total.toFixed(2)} CUP`;

  const url = `https://wa.me/+5350977340?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
  console.log("📤 WhatsApp abierto con mensaje");

  // Limpiar flujo y cerrar modal
  const modal = document.getElementById("modal-resumen");
  if (modal) modal.style.display = "none";

  cantidades = {};
  cantidadesEnvases = {};
  filtrarMenu("todos");
  calcularTotales();
  mostrarSeguimientoPedido();

  console.groupEnd();
}
window.enviarWhatsApp = enviarWhatsApp;

/* =========================
   Cancelar resumen
   ========================= */
function cancelarResumen() {
  console.group("❌ Cancelar pedido");
  cantidades = {};
  cantidadesEnvases = {};
  filtrarMenu("todos");
  calcularTotales();
  const modal = document.getElementById("modal-resumen");
  if (modal) modal.style.display = "none";
  console.log("🧹 Pedido cancelado y reiniciado");
  console.groupEnd();
}
window.cancelarResumen = cancelarResumen;

document.getElementById("modal-close-resumen")?.addEventListener("click", cancelarResumen);

/* =========================
   Seguimiento de pedidos
   ========================= */
function mostrarSeguimientoPedido() {
  const seg = document.getElementById("seguimiento-pedido");
  if (seg) seg.style.display = "block";
  iniciarSeguimiento();
}
window.mostrarSeguimientoPedido = mostrarSeguimientoPedido;

function iniciarSeguimiento() {
  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (!pedidoId) return;
  // cada 10s
  setInterval(() => verificarIntegridadPedido(pedidoId), 10000);
}

async function verificarIntegridadPedido(pedidoId) {
  console.group("🔎 Seguimiento del pedido");
  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("*")
    .eq("pedido_id", pedidoId)
    .maybeSingle();

  if (error || !data) {
    console.warn("⚠️ Error o pedido no encontrado");
    console.groupEnd();
    return;
  }

  const estado = data.estado_actual || "⏳ En espera";
  const estadoEl = document.getElementById("estado-actual");
  if (estadoEl) estadoEl.textContent = `🧾 ${estado}`;

  const btnEntregar = document.getElementById("btn-entregado");
  if (btnEntregar) {
    btnEntregar.disabled = estado !== "entregado";
    btnEntregar.onclick = () => {
      if (estado === "entregado") {
        const bloque = document.getElementById("bloque-criterio");
        if (bloque) bloque.style.display = "block";
      }
    };
  }

  console.groupEnd();
}

async function renderizarSeguimientoPedidos() {
  console.group("📦 Seguimiento múltiple de pedidos");
  const historial = JSON.parse(localStorage.getItem("historial_pedidos") || "[]");
  const contenedor = document.getElementById("seguimiento-multiple");
  if (!contenedor) {
    console.groupEnd();
    return;
  }
  contenedor.innerHTML = "";

  for (const pedidoId of historial.slice(-5).reverse()) {
    const { data, error } = await supabase
      .from("vw_integridad_pedido")
      .select("*")
      .eq("pedido_id", pedidoId)
      .maybeSingle();

    if (error || !data) continue;

    const estado = data.estado_actual || "⏳ En espera";
    let html = `
      <div class="seguimiento-bloque">
        <h4>📦 Pedido: ${String(pedidoId).slice(0, 8)}...</h4>
        <p><strong>Estado:</strong> ${estado}</p>
        <ul>`;
    let totalPedido = 0;

    for (const item of data.items || []) {
      html += `<li>${item.nombre} x${item.cantidad} = ${item.subtotal} CUP</li>`;
      totalPedido += item.subtotal;
    }

    html += `</ul>
      <p><strong>Total del pedido:</strong> ${totalPedido.toFixed(2)} CUP</p>
      </div>`;

    contenedor.innerHTML += html;
  }

  console.groupEnd();
}
window.renderizarSeguimientoPedidos = renderizarSeguimientoPedidos;

/* =========================
   Guardar criterio del cliente
   ========================= */
document.getElementById("btn-guardar-criterio")?.addEventListener("click", async () => {
  console.group("📝 Guardar criterio del cliente");
  const criterio = document.getElementById("criterio")?.value.trim();
  const pedidoId = localStorage.getItem("pedido_id_actual");

  if (!criterio || !pedidoId) {
    console.warn("⚠️ No hay criterio o pedido activo.");
    console.groupEnd();
    return;
  }

  const { error } = await supabase.rpc("guardar_criterio_focsa", {
    p_pedido_id: pedidoId,
    p_criterio: criterio,
  });

  if (error) {
    console.error("❌ Error al guardar criterio:", error);
    alert("Ocurrió un error al guardar su opinión. Intente nuevamente.");
  } else {
    console.log("✅ Criterio guardado:", criterio);
    alert("¡Gracias por su opinión!");

    // Limpieza total para nuevo pedido
    const bloque = document.getElementById("bloque-criterio");
    if (bloque) bloque.style.display = "none";
    const crit = document.getElementById("criterio");
    if (crit) crit.value = "";

    localStorage.clear();
    sessionStorage.clear();

    cantidades = {};
    cantidadesEnvases = {};

    filtrarMenu("todos");
    calcularTotales();

    const seg = document.getElementById("seguimiento-pedido");
    if (seg) seg.style.display = "none";
    const modal = document.getElementById("modal-resumen");
    if (modal) modal.style.display = "none";

    // Limpiar campos del cliente
    ["cliente", "piso", "apartamento", "telefono"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const unir = document.getElementById("unirseGrupo");
    if (unir) unir.checked = false;

    console.log("✅ Sistema listo para nuevo pedido tras guardar criterio");
  }
  console.groupEnd();
});

/* =========================
   Utilidades UI y modales
   ========================= */
function toggleVentajasGrupo() {
  const bloque = document.getElementById("ventajasGrupo");
  if (!bloque) return;
  bloque.style.display = bloque.style.display === "none" ? "block" : "none";
}
window.toggleVentajasGrupo = toggleVentajasGrupo;

function mostrarDescripcion(descripcion, imagenUrl) {
  console.group("📝 Mostrar descripción del producto");
  const texto = document.getElementById("modal-texto");
  const img = document.getElementById("modal-imagen");
  const modal = document.getElementById("modal-descripcion");

  if (texto) texto.textContent = descripcion;
  if (img) img.src = imagenUrl || "";
  if (modal) modal.style.display = "block";

  console.log("🖼️ Descripción mostrada.");
  console.groupEnd();
}
window.mostrarDescripcion = mostrarDescripcion;

document.getElementById("modal-close")?.addEventListener("click", () => {
  const modal = document.getElementById("modal-descripcion");
  if (modal) modal.style.display = "none";
});

/* Helper para escapar HTML */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
