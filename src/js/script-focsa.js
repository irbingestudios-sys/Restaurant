// ┌───────────────────────────────────────────────┐
// │ Módulo: FOCSA                                 │
// │ Script: script-focsa.js (versión completa)    │
// │ Ajustado según cambios solicitados            │
// └───────────────────────────────────────────────┘

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient("https://qeqltwrkubtyrmgvgaai.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw");
window.supabase = supabase;

let menu = [];
let envases = [];
let cantidades = {};
let cantidadesEnvases = {};

document.addEventListener("DOMContentLoaded", () => {
  console.group("🟢 FOCSA — Inicialización");
  console.log("🚀 Script FOCSA inicializado");

  cargarMenuEspecial();
  cargarEnvases();
  iniciarSeguimiento();

  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (pedidoId) {
    document.getElementById("seguimiento-pedido").style.display = "block";
  }

  renderizarSeguimientoPedidos();
  console.groupEnd();
});

// CARGA DE MENÚ Y ENVASES
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

  const filtro = document.getElementById("filtro");
  filtro.innerHTML = '<option value="todos">Todas</option>';
  const categoriasUnicas = [...new Set(menu.map(item => item.categoria))];
  if (!categoriasUnicas.includes("Envases")) categoriasUnicas.push("Envases");
  categoriasUnicas.forEach(cat => {
    const opcion = document.createElement("option");
    opcion.value = cat;
    opcion.textContent = cat;
    filtro.appendChild(opcion);
  });
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

// RENDERIZADO (sin stock)
function renderGrupo(lista, contenedorId, destinoCantidades) {
  console.group(`🖼️ Renderizado en ${contenedorId}`);
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = "";
  const agrupado = {};

  lista.forEach(item => {
    if (!agrupado[item.categoria]) agrupado[item.categoria] = [];
    agrupado[item.categoria].push(item);
  });

  for (const categoria in agrupado) {
    const grupo = document.createElement("div");
    grupo.className = "categoria-grupo";
    grupo.innerHTML += `<h3 class="titulo-seccion">${categoria}</h3>`;
    agrupado[categoria].forEach(item => {
      grupo.innerHTML += `
        <div class="producto-lineal">
          <div class="producto-izquierda">
            <strong>${item.nombre}</strong>
            ${item.descripcion ? `<button class="btn-icono" onclick="mostrarDescripcion('${escapeHtml(item.descripcion)}', '${item.imagen_url || ""}')">
              <img src="https://irbingestudios-sys.github.io/Restaurant/src/assets/info-icon.svg" alt="Descripción" />
            </button>` : ""}
          </div>
          <div class="producto-derecha">
            <span>${item.precio} CUP</span>
            <input type="number" min="0" value="${destinoCantidades[item.nombre] || 0}" 
                   data-name="${item.nombre}" data-price="${item.precio}" />
          </div>
        </div>`;
    });
    contenedor.appendChild(grupo);
  }

  document.querySelectorAll(`#${contenedorId} input[type='number']`).forEach(input => {
    input.addEventListener("input", () => {
      destinoCantidades[input.dataset.name] = parseInt(input.value) || 0;
      calcularTotales();
    });
  });
  console.groupEnd();
}

function renderMenuEspecial(lista) {
  renderGrupo(lista, "menu-especial", cantidades);
}
function renderEnvases(lista) {
  renderGrupo(lista, "envases-contenedor", cantidadesEnvases);
}

// FILTRO
function filtrarMenu() {
  console.group("🔍 Filtro de categoría");
  const categoriaSeleccionada = document.getElementById("filtro").value;
  console.log("📌 Categoría seleccionada:", categoriaSeleccionada);

  if (categoriaSeleccionada === "todos") {
    renderMenuEspecial(menu);
    renderEnvases(envases);
  } else if (categoriaSeleccionada === "Envases") {
    renderGrupo(envases.filter(item => item.categoria === "Envases"), "envases-contenedor", cantidadesEnvases);
    document.getElementById("menu-especial").innerHTML = "";
  } else {
    renderGrupo(menu.filter(item => item.categoria === categoriaSeleccionada), "menu-especial", cantidades);
    document.getElementById("envases-contenedor").innerHTML = "";
  }
  console.groupEnd();
}
window.filtrarMenu = filtrarMenu;

// TOTALES
function calcularTotales() {
  console.group("🧮 Cálculo de totales");
  let total = 0, cantidad = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      total += cant * item.precio;
      cantidad += cant;
    }
  }
  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      total += cant * item.precio;
      cantidad += cant;
    }
  }

  document.getElementById("total-cup").textContent = total.toFixed(2);
  document.getElementById("total-items").textContent = cantidad;
  console.log("🧮 Totales actualizados:", { total, cantidad });
  console.groupEnd();
}

// VISTA PREVIA DEL PEDIDO (modal)
function revisarPedido() {
  console.group("🧾 Vista previa del pedido");
  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  if (!cliente || !piso || !apartamento) {
    alert("Por favor, complete los datos del cliente antes de revisar/enviar el pedido.");
    console.warn("❌ Datos incompletos para revisión.");
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

  const resumen = document.getElementById("contenido-resumen");
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

  document.getElementById("modal-resumen").style.display = "block";
  console.groupEnd();
}
window.revisarPedido = revisarPedido;

// ENVIAR POR WHATSAPP (RPC + abrir mensaje)
async function enviarWhatsApp() {
  console.group("📲 Enviar pedido por WhatsApp");

  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  if (!cliente || !piso || !apartamento) {
    alert("Por favor, complete los datos del cliente antes de enviar.");
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

  const { data, error } = await supabase.rpc("registrar_pedido_focsa", {
    p_cliente: cliente,
    p_piso: piso,
    p_apartamento: apartamento,
    p_telefono: telefono || null,
    p_direccion: null,
    p_unirse_grupo: unirse,
    p_items: items,           // ✅ siempre objeto
    p_canal: "whatsapp"
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

  document.getElementById("modal-resumen").style.display = "none";
  cantidades = {};
  cantidadesEnvases = {};
  filtrarMenu();
  calcularTotales();
  mostrarSeguimientoPedido();
  console.groupEnd();
}
window.enviarWhatsApp = enviarWhatsApp;

// OPCIONAL: Enviar desde botón principal (misma validación, canal = "rpc")
window.enviarPedido = async () => {
  console.group("📤 RPC — registrar_pedido_focsa (canal rpc)");

  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  if (!cliente || !piso || !apartamento) {
    alert("Por favor, complete los datos del cliente antes de enviar el pedido.");
    console.warn("❌ Datos del cliente incompletos.");
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
  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      items.push({ nombre: item.nombre, cantidad: cant, precio: item.precio, subtotal: cant * item.precio });
    }
  }
  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      items.push({ nombre: item.nombre, cantidad: cant, precio: item.precio, subtotal: cant * item.precio });
    }
  }

  const { data, error } = await supabase.rpc("registrar_pedido_focsa", {
    p_cliente: cliente,
    p_piso: piso,
    p_apartamento: apartamento,
    p_telefono: telefono || null,
    p_direccion: null,
    p_unirse_grupo: unirse,
    p_items: items,           // ✅ objeto
    p_canal: "rpc"
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
  console.log("📥 pedido_id_actual guardado:", pedidoId);

  mostrarSeguimientoPedido();
  console.groupEnd();
};

// CANCELAR RESUMEN
function cancelarResumen() {
  console.group("❌ Cancelar pedido");
  cantidades = {};
  cantidadesEnvases = {};
  filtrarMenu();
  calcularTotales();
  document.getElementById("modal-resumen").style.display = "none";
  console.log("🧹 Pedido cancelado y reiniciado");
  console.groupEnd();
}
window.cancelarResumen = cancelarResumen;
document.getElementById("modal-close-resumen").addEventListener("click", cancelarResumen);

// MOSTRAR SEGUIMIENTO
function mostrarSeguimientoPedido() {
  document.getElementById("seguimiento-pedido").style.display = "block";
  iniciarSeguimiento();
}
window.mostrarSeguimientoPedido = mostrarSeguimientoPedido;

// SEGUIMIENTO
function iniciarSeguimiento() {
  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (!pedidoId) return;
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
  document.getElementById("estado-actual").textContent = `🧾 ${estado}`;

  const btnEntregar = document.getElementById("btn-entregado");
  btnEntregar.disabled = estado !== "entregado";
  btnEntregar.onclick = () => {
    if (estado === "entregado") {
      document.getElementById("bloque-criterio").style.display = "block";
    }
  };
  console.groupEnd();
}

async function renderizarSeguimientoPedidos() {
  console.group("📦 Seguimiento múltiple de pedidos");
  const historial = JSON.parse(localStorage.getItem("historial_pedidos") || "[]");
  const contenedor = document.getElementById("seguimiento-multiple");
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
        <h4>📦 Pedido: ${pedidoId.slice(0, 8)}...</h4>
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

// GUARDAR CRITERIO DEL CLIENTE
document.getElementById("btn-guardar-criterio").addEventListener("click", async () => {
  console.group("📝 Guardar criterio del cliente");

  const criterio = document.getElementById("criterio").value.trim();
  const pedidoId = localStorage.getItem("pedido_id_actual");

  // Validación
  if (!criterio || !pedidoId) {
    console.warn("⚠️ No hay criterio o pedido activo.");
    console.groupEnd();
    return;
  }

  // Inserción en la tabla criterio_cliente
  // Guardar criterio vía RPC
const { error } = await supabase.rpc("guardar_criterio_focsa", {
  p_pedido_id: pedidoId,
  p_criterio: criterio
});

if (error) {
  console.error("❌ Error al guardar criterio:", error);
  alert("Ocurrió un error al guardar su opinión. Intente nuevamente.");
} else {
  console.log("✅ Criterio guardado:", criterio);
  alert("¡Gracias por su opinión!");
  // ... resto de tu limpieza y reinicio
}
    // 🧹 Limpieza total para nuevo pedido
    document.getElementById("bloque-criterio").style.display = "none";
    document.getElementById("criterio").value = "";

    // Borrar almacenamiento local
    localStorage.clear();
    sessionStorage.clear();

    // Resetear variables
    cantidades = {};
    cantidadesEnvases = {};

    // Reiniciar UI
    filtrarMenu();
    calcularTotales();
    document.getElementById("seguimiento-pedido").style.display = "none";
    document.getElementById("modal-resumen").style.display = "none";

    // Limpiar campos del cliente
    document.getElementById("cliente").value = "";
    document.getElementById("piso").value = "";
    document.getElementById("apartamento").value = "";
    document.getElementById("telefono").value = "";
    document.getElementById("unirseGrupo").checked = false;

    console.log("✅ Sistema listo para nuevo pedido tras guardar criterio");
  }

  console.groupEnd();
});
// UTILITARIOS DE UI
function toggleVentajasGrupo() {
  const bloque = document.getElementById("ventajasGrupo");
  bloque.style.display = bloque.style.display === "none" ? "block" : "none";
}
window.toggleVentajasGrupo = toggleVentajasGrupo;

function mostrarDescripcion(descripcion, imagenUrl) {
  console.group("📝 Mostrar descripción del producto");
  document.getElementById("modal-texto").textContent = descripcion;
  document.getElementById("modal-imagen").src = imagenUrl || "";
  document.getElementById("modal-descripcion").style.display = "block";
  console.log("🖼️ Descripción mostrada.");
  console.groupEnd();
}
window.mostrarDescripcion = mostrarDescripcion;

document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("modal-descripcion").style.display = "none";
});

// Helper para escapar HTML en descripciones
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
