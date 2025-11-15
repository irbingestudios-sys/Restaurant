// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: FOCSA                                              │
// │ Script: script-focsa.js                                    │
// │ Descripción: Menú especial para clientes del edificio FOCSA│
// │ Autor: Irbing Brizuela                                     │
// │ Fecha: 2025-11-08                                          │
// └────────────────────────────────────────────────────────────┘

// === Inicialización Supabase FOCSA ===
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw"
);

window.supabase = supabase;
document.addEventListener("DOMContentLoaded", () => {
  console.log("📦 DOM cargado — cargando menú y envases");
  cargarMenuEspecial();
  cargarEnvases();
});
document.addEventListener("DOMContentLoaded", () => {
  const pedidoId = localStorage.getItem("pedido_id");
  if (!pedidoId) {
    console.warn("⚠️ No se encontró pedido_id en localStorage");
    return;
  }

  console.log("📦 DOM cargado — iniciando seguimiento de pedido:", pedidoId);

  async function actualizarSeguimiento() {
    await verificarIntegridadPedido(); // o actualizarEstadoPedido() si usas cocina_pedido directamente
  }

  actualizarSeguimiento();
  setInterval(actualizarSeguimiento, 10000);
});

let menu = [], envases = [];
const cantidades = {}, cantidadesEnvases = {};
let mensajeWhatsApp = "";

console.log("🚀 Script FOCSA inicializado");

//SECCIÓN 2 — Carga de menú y envase
document.addEventListener("DOMContentLoaded", () => {
  const pedidoId = localStorage.getItem("pedido_id");
  if (!pedidoId) {
    console.warn("⚠️ No se encontró pedido_id en localStorage");
    return;
  }

  console.log("📦 DOM cargado");
    async function actualizarSeguimiento() {
  await verificarIntegridadPedido();
}
  setInterval(actualizarSeguimiento, 10000);
  cargarMenuEspecial();
  cargarEnvases();
});

async function cargarMenuEspecial() {
  console.log("📥 Cargando menú especial...");
  const { data, error } = await supabase.rpc("obtener_menu_focsa");
  if (error) return console.error("❌ Error al cargar menú:", error);
  menu = data;
  console.log("✅ Menú cargado:", menu.length, "items");
  renderFiltroCategorias();
  renderMenuEspecial(menu);
}

function renderFiltroCategorias() {
  const filtro = document.getElementById("filtro");
  const categorias = [...new Set(menu.map(item => item.categoria).filter(Boolean))];
  filtro.innerHTML = '<option value="todos">Todas</option>';
  categorias.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    filtro.appendChild(option);
  });
  console.log("📂 Filtro de categorías renderizado");
}

window.filtrarMenu = () => {
  const seleccion = document.getElementById("filtro").value;
  const filtrado = seleccion === "todos" ? menu : menu.filter(item => item.categoria === seleccion);
  renderMenuEspecial(filtrado);
  console.log("🔍 Menú filtrado por:", seleccion);
};

function renderMenuEspecial(lista) {
  const contenedor = document.getElementById("menu-especial");
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
            <button class="btn-icono" onclick="mostrarDescripcion('${item.descripcion}', '${item.imagen_url}')">
              <img src="../assets/info-icon.svg" alt="Descripción" />
            </button>
          </div>
          <div class="producto-derecha">
            <span>${item.precio} CUP</span>
            <input type="number" min="0" value="${cantidades[item.nombre] || 0}" data-name="${item.nombre}" data-price="${item.precio}" />
          </div>
        </div>`;
    });
    contenedor.appendChild(grupo);
  }
  document.querySelectorAll("#menu-especial input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      cantidades[input.dataset.name] = parseInt(input.value) || 0;
      calcularTotales();
    });
  });
  console.log("🍽️ Menú renderizado");
}

async function cargarEnvases() {
  console.log("📥 Cargando envases...");
  const { data, error } = await supabase
    .from("menu_item")
    .select("*")
    .eq("categoria", "Envases")
    .eq("disponible", true)
    .gt("stock", 0)
    .order("precio", { ascending: true });
  if (error) return console.error("❌ Error al cargar envases:", error);
  envases = data;
  const contenedor = document.getElementById("envases-contenedor");
  contenedor.innerHTML = "";
  envases.forEach((item, index) => {
    const cantidadInicial = index === 0 ? 1 : 0;
    cantidadesEnvases[item.nombre] = cantidadInicial;
    const bloque = document.createElement("div");
    bloque.className = "producto-lineal";
    bloque.innerHTML = `
      <div class="producto-izquierda"><strong>${item.nombre}</strong></div>
      <div class="producto-derecha">
        <span>${item.precio} CUP</span>
        <input type="number" min="0" value="${cantidadInicial}" data-name="${item.nombre}" data-price="${item.precio}" />
      </div>`;
    contenedor.appendChild(bloque);
  });
  document.querySelectorAll("#envases-contenedor input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      cantidadesEnvases[input.dataset.name] = parseInt(input.value) || 0;
      calcularTotales();
    });
  });
  console.log("🧴 Envases cargados:", envases.length);
}

//SECCIÓN 3 — Totales y descripción
function calcularTotales() {
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
}

window.mostrarDescripcion = (texto, imagen) => {
  document.getElementById("modal-texto").textContent = texto || "Sin descripción disponible.";
  const img = document.getElementById("modal-imagen");
  img.src = imagen || "";
  img.style.display = imagen ? "block" : "none";
  document.getElementById("modal-descripcion").style.display = "flex";
  console.log("🔍 Mostrando descripción de producto");
};

// SECCIÓN 4 — Revisión y envío del pedido
// === Revisión del pedido ===
window.revisarPedido = () => {
  console.log("🔍 Iniciando revisión del pedido...");

  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();

  if (!cliente || !piso || !apartamento) {
    console.warn("⚠️ Datos incompletos: cliente, piso o apartamento faltan");
    alert("⚠️ Completa nombre, piso y apartamento antes de revisar el pedido");
    return;
  }

  console.log("✅ Datos del cliente:", { cliente, piso, apartamento });

  const items = [];
  let total = 0;
  let html = `
    <p><strong>Cliente:</strong> ${cliente}<br>
    <strong>Piso:</strong> ${piso}<br>
    <strong>Apartamento:</strong> ${apartamento}</p>
    <div class="resumen-lista">
  `;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre, cantidad: cant, subtotal });
      total += subtotal;
      html += `
        <div class="producto-lineal">
          <div class="producto-izquierda"><strong>${nombre}</strong></div>
          <div class="producto-derecha">
            <span>${item.precio} CUP</span>
            <span>x${cant}</span>
            <span>= ${subtotal} CUP</span>
          </div>
        </div>
      `;
    }
  }

  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre, cantidad: cant, subtotal });
      total += subtotal;
      html += `
        <div class="producto-lineal">
          <div class="producto-izquierda"><strong>${nombre}</strong></div>
          <div class="producto-derecha">
            <span>${item.precio} CUP</span>
            <span>x${cant}</span>
            <span>= ${subtotal} CUP</span>
          </div>
        </div>
      `;
    }
  }

  if (items.length === 0) {
    console.warn("⚠️ No se seleccionaron productos");
    alert("⚠️ No has seleccionado ningún producto");
    return;
  }

  html += `</div><p><strong>Total:</strong> ${total} CUP</p>`;
  document.getElementById("contenido-resumen").innerHTML = html;
  document.getElementById("modal-resumen").style.display = "flex";

  mensajeWhatsApp = `Pedido para: ${cliente}\nPiso: ${piso}\nApartamento: ${apartamento}\n\n` +
    items.map(i => `- ${i.nombre} x${i.cantidad} = ${i.subtotal} CUP`).join("\n") +
    `\n\nTotal: ${total} CUP`;

  console.log("📦 Pedido listo para revisión:", { items, total });
};

// === Envío del pedido ===
window.enviarPedido = async () => {
  console.log("📤 Enviando pedido...");

  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  if (!cliente || !piso || !apartamento) {
    console.warn("⚠️ Datos incompletos para envío");
    alert("⚠️ Completa nombre, piso y apartamento");
    return;
  }

  if (telefono && !/^\d+$/.test(telefono)) {
    console.warn("⚠️ Teléfono inválido:", telefono);
    alert("⚠️ El teléfono debe contener solo números");
    return;
  }

  const items = [];
  let total = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre, cantidad: cant, subtotal });
      total += subtotal;
    }
  }

  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre, cantidad: cant, subtotal });
      total += subtotal;
    }
  }

  if (items.length === 0) {
    console.warn("⚠️ Pedido vacío");
    alert("⚠️ Selecciona al menos un producto");
    return;
  }

  console.log("📦 Datos del pedido:", {
    cliente, piso, apartamento, telefono, unirse, items, total
  });

  const { data, error } = await supabase.rpc("registrar_pedido_focsa", {
    p_cliente: cliente,
    p_piso: piso,
    p_apartamento: apartamento,
    p_telefono: telefono || null,
    p_direccion: null,
    p_unirse_grupo: unirse,
    p_items: JSON.stringify(items)
  });

  if (error) {
    console.error("❌ Error al registrar pedido:", error);
    alert("Error al registrar el pedido");
    return;
  }

  const pedidoId = data?.pedido_id;
  if (!pedidoId) {
    console.warn("⚠️ No se devolvió pedido_id");
    alert("Pedido registrado pero sin ID");
    return;
  }

  console.log("✅ Pedido registrado correctamente:", pedidoId);
  localStorage.setItem("pedido_id", pedidoId);

  // Preparar resumen visual
  let resumenHTML = `<p><strong>Cliente:</strong> ${cliente}<br><strong>Piso:</strong> ${piso}<br><strong>Apartamento:</strong> ${apartamento}</p><ul>`;
  items.forEach(i => {
    resumenHTML += `<li>${i.nombre} x${i.cantidad} = ${i.subtotal} CUP</li>`;
  });
  resumenHTML += `</ul><p><strong>Total:</strong> ${total} CUP</p>`;

  mensajeWhatsApp = `Pedido para: ${cliente}\nPiso: ${piso}\nApartamento: ${apartamento}\n\n` +
    items.map(i => `- ${i.nombre} x${i.cantidad} = ${i.subtotal} CUP`).join("\n") +
    `\n\nTotal: ${total} CUP`;

  document.getElementById("modal-resumen").style.display = "none";
  document.getElementById("resumen").innerHTML = `
    <h3 class="titulo-seccion">Resumen detallado</h3>
    ${resumenHTML}
    <button onclick="enviarWhatsApp()" class="btn-secundario">✅ Confirmar y enviar</button>
    <button onclick="cancelar()" class="btn-secundario">❌ Cancelar</button>
  `;
  document.getElementById("confirmacion").style.display = "block";

  mostrarSeguimientoPedido();
};

// === Confirmar y enviar por WhatsApp ===
window.enviarWhatsApp = () => {
  console.log("📤 Enviando mensaje a WhatsApp...");

  const numero = "5350971023";
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensajeWhatsApp)}`;
  window.open(url, "_blank");

  document.getElementById("confirmacion").style.display = "none";
  mostrarSeguimientoPedido();

  Object.keys(cantidades).forEach(k => cantidades[k] = 0);
  Object.keys(cantidadesEnvases).forEach(k => cantidadesEnvases[k] = 0);
  document.querySelectorAll("input[type='number']").forEach(input => input.value = 0);
  calcularTotales();

  ["cliente", "piso", "apartamento", "telefono"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });
  document.getElementById("unirseGrupo").checked = false;

  document.getElementById("menu-especial").style.display = "none";
  document.getElementById("envases-contenedor").style.display = "none";
  document.getElementById("totales").style.display = "none";
  document.getElementById("seguimiento-pedido").style.display = "block";

  console.log("✅ Pedido enviado y sistema reiniciado");

  // registrarEventoPedido("pedido_enviado", "Pedido confirmado por cliente y enviado por WhatsApp");
};

// === Cancelar resumen visual ===
window.cancelarResumen = () => {
  document.getElementById("modal-resumen").style.display = "none";
  console.log("❌ Resumen cancelado");
};

//SECCIÓN 5 — Guardar criterio del cliente
document.addEventListener("DOMContentLoaded", () => {
  const pedidoId = localStorage.getItem("pedido_id");
  const btnGuardar = document.getElementById("btn-guardar-criterio");
  const criterioInput = document.getElementById("criterio");

  if (!pedidoId) {
    console.warn("⚠️ No se encontró pedido_id en localStorage");
    return;
  }

  if (!btnGuardar || !criterioInput) {
    console.warn("⚠️ Elementos #btn-guardar-criterio o #criterio no encontrados");
    return;
  }

  btnGuardar.addEventListener("click", async () => {
    const criterio = criterioInput.value.trim();

    if (!criterio) {
      alert("⚠️ Escribe tu opinión antes de guardar");
      return;
    }

    console.log("📝 Guardando criterio del cliente:", criterio);

    const { error } = await supabase.rpc("guardar_criterio_cliente", {
      pedido: pedidoId,
      criterio: criterio
    });

    if (error) {
      console.error("❌ Error al guardar criterio:", error);
      alert("Hubo un problema al guardar el criterio");
    } else {
      console.log("✅ Criterio guardado correctamente");
      alert("Gracias por su opinión");
      criterioInput.value = "";
    }
  });
});

//SECCIÓN 6 — Verificación visual con
async function verificarIntegridadPedido() {
  const pedidoId = localStorage.getItem("pedido_id");
  if (!pedidoId) {
    console.warn("⚠️ No hay pedido_id para verificar integridad");
    return;
  }

  console.log("🔎 Verificando integridad del pedido:", pedidoId);

  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("estado_actual, replicado_en_cocina, tiene_eventos, fecha_registro")
    .eq("pedido_id", pedidoId)
    .maybeSingle();

  if (error) {
    console.error("❌ Error al consultar integridad:", error);
    return;
  }

  if (!data) {
    console.warn("⚠️ Pedido no encontrado en la vista");
    document.getElementById("estado-actual").textContent = "⚠️ Pedido no encontrado";
    return;
  }

  console.log("📋 Resultado de integridad:", data);

  const estado = data.estado_actual || "⏳ En espera de procesamiento";
  const replicado = data.replicado_en_cocina ? "✅ Replicado en cocina" : "⚠️ No replicado";
  const eventos = data.tiene_eventos ? "📌 Con eventos registrados" : "⚠️ Sin eventos";

  document.getElementById("estado-actual").textContent = `🧾 ${estado} | ${replicado} | ${eventos}`;
}

