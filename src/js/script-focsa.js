// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: FOCSA                                              │
// │ Script: script-focsa.js                                    │
// │ Descripción: Menú especial para clientes del edificio FOCSA│
// │ Autor: Irbing Brizuela                                     │
// │ Fecha: 2025-11-08                                          │
// └────────────────────────────────────────────────────────────┘
// =========================
// FOCSA — Estado y utilidades
// =========================
console.log("🟢 FOCSA — Inicialización");
console.log("🚀 Script FOCSA inicializado");

// Inicialización Supabase (necesario para RPC)
// ⚠️ Sustituye con tu URL y ANON KEY reales de Supabase
const supabaseUrl = "https://qeqltwrkubtyrmgvgaai.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Estado global
let cantidadesMenu = {};
let cantidadesEnvases = {};
let pedidoActual = null;
let seguimientoTimer = null;

// =========================
// Inicialización FOCSA
// =========================
async function initFOCSA() {
  await cargarMenu();
  await cargarEnvases();
  actualizarTotales();
}
document.addEventListener("DOMContentLoaded", initFOCSA);

// =========================
// Carga del menú y envases
// =========================
async function cargarMenu() {
  console.log("📥 Carga de menú");
  const { data, error } = await supabase
    .from("menu_focsa")   // 👈 nombre real de la tabla
    .select("*")
    .order("orden", { ascending: true });

  if (error) {
    console.error("❌ Error cargando menú:", error);
    return [];
  }
  console.log("✅ Menú cargado:", data?.length || 0, "items");
  renderMenu(data || []);
  return data || [];
}

async function cargarEnvases() {
  console.log("📥 Carga de envases");
  const { data, error } = await supabase
    .from("menu_item")    // 👈 nombre real de la tabla
    .select("*")
    .order("orden", { ascending: true });

  if (error) {
    console.error("❌ Error cargando envases:", error);
    return [];
  }
  console.log("🧴 Envases cargados:", data?.length || 0);
  renderEnvases(data || []);
  return data || [];
}
// =========================
// Render de menú y envases
// =========================
function renderMenu(items) {
  const cont = document.getElementById("menu-especial");
  if (!cont) return;
  cont.innerHTML = "";
  items.forEach(item => {
    const li = document.createElement("div");
    li.className = "menu-item";
    li.innerHTML = `
      <div class="menu-nombre">${item.nombre}</div>
      <div class="menu-precio">${item.precio}</div>
      <div class="menu-controles">
        <button class="menos" data-id="${item.id}">-</button>
        <span class="cantidad" id="cant-menu-${item.id}">0</span>
        <button class="mas" data-id="${item.id}" data-precio="${item.precio}" data-nombre="${item.nombre}">+</button>
      </div>
    `;
    cont.appendChild(li);
  });
  cont.addEventListener("click", e => {
    if (e.target.classList.contains("mas")) {
      const id = e.target.dataset.id;
      const precio = Number(e.target.dataset.precio);
      const nombre = e.target.dataset.nombre;
      const prev = cantidadesMenu[id]?.cantidad || 0;
      const cantidad = prev + 1;
      const subtotal = cantidad * precio;
      cantidadesMenu[id] = { cantidad, precio, subtotal, nombre };
      document.getElementById(`cant-menu-${id}`).textContent = cantidad;
      actualizarTotales();
    }
    if (e.target.classList.contains("menos")) {
      const id = e.target.dataset.id;
      const prev = cantidadesMenu[id]?.cantidad || 0;
      const cantidad = Math.max(0, prev - 1);
      if (cantidad === 0) {
        delete cantidadesMenu[id];
      } else {
        const precio = cantidadesMenu[id].precio;
        const nombre = cantidadesMenu[id].nombre;
        const subtotal = cantidad * precio;
        cantidadesMenu[id] = { cantidad, precio, subtotal, nombre };
      }
      document.getElementById(`cant-menu-${id}`).textContent = cantidad;
      actualizarTotales();
    }
  });
}

function renderEnvases(items) {
  const cont = document.getElementById("envases-contenedor");
  if (!cont) return;
  cont.innerHTML = "";
  items.forEach(item => {
    const li = document.createElement("div");
    li.className = "envase-item";
    li.innerHTML = `
      <div class="envase-nombre">${item.nombre}</div>
      <div class="envase-precio">${item.precio}</div>
      <div class="envase-controles">
        <button class="menos-env" data-id="${item.id}">-</button>
        <span class="cantidad" id="cant-env-${item.id}">0</span>
        <button class="mas-env" data-id="${item.id}" data-precio="${item.precio}" data-nombre="${item.nombre}">+</button>
      </div>
    `;
    cont.appendChild(li);
  });
  cont.addEventListener("click", e => {
    if (e.target.classList.contains("mas-env")) {
      const id = e.target.dataset.id;
      const precio = Number(e.target.dataset.precio);
      const nombre = e.target.dataset.nombre;
      const prev = cantidadesEnvases[id]?.cantidad || 0;
      const cantidad = prev + 1;
      const subtotal = cantidad * precio;
      cantidadesEnvases[id] = { cantidad, precio, subtotal, nombre };
      document.getElementById(`cant-env-${id}`).textContent = cantidad;
      actualizarTotales();
    }
    if (e.target.classList.contains("menos-env")) {
      const id = e.target.dataset.id;
      const prev = cantidadesEnvases[id]?.cantidad || 0;
      const cantidad = Math.max(0, prev - 1);
      if (cantidad === 0) {
        delete cantidadesEnvases[id];
      } else {
        const precio = cantidadesEnvases[id].precio;
        const nombre = cantidadesEnvases[id].nombre;
        const subtotal = cantidad * precio;
        cantidadesEnvases[id] = { cantidad, precio, subtotal, nombre };
      }
      document.getElementById(`cant-env-${id}`).textContent = cantidad;
      actualizarTotales();
    }
  });
}

// =========================
// Totales
// =========================
function actualizarTotales() {
  const totalMenu = Object.values(cantidadesMenu).reduce((acc, v) => acc + v.subtotal, 0);
  const totalEnv = Object.values(cantidadesEnvases).reduce((acc, v) => acc + v.subtotal, 0);
  const cantMenu = Object.values(cantidadesMenu).reduce((acc, v) => acc + v.cantidad, 0);
  const cantEnv = Object.values(cantidadesEnvases).reduce((acc, v) => acc + v.cantidad, 0);

  const total = totalMenu + totalEnv;
  const cantidad = cantMenu + cantEnv;

  document.getElementById("total-cup").textContent = total;
  document.getElementById("total-items").textContent = cantidad;
}

// =========================
// Construcción de items
// =========================
function construirItemsSeleccionados() {
  const items = [];
  Object.entries(cantidadesMenu).forEach(([id, v]) => {
    if (v.cantidad > 0) items.push({ nombre: v.nombre, precio: v.precio, cantidad: v.cantidad, subtotal: v.subtotal });
  });
  Object.entries(cantidadesEnvases).forEach(([id, v]) => {
    if (v.cantidad > 0) items.push({ nombre: v.nombre, precio: v.precio, cantidad: v.cantidad, subtotal: v.subtotal });
  });
  return items;
}

// =========================
// Envío por WhatsApp + RPC
// =========================
async function enviarWhatsApp() {
  const cliente = document.getElementById("cliente")?.value?.trim();
  const telefono = document.getElementById("telefono")?.value?.trim();
  const piso = document.getElementById("piso")?.value?.trim();
  const apartamento = document.getElementById("apartamento")?.value?.trim();
  const unirseGrupo = Boolean(document.getElementById("unirseGrupo")?.checked);

  if (!cliente || !piso || !apartamento) {
    alert("Por favor, complete los datos del cliente antes de enviar.");
    return;
  }

  const items = construirItemsSeleccionados();
  const tieneEnvase = items.some(i => i.nombre.toLowerCase().includes("envase") || i.nombre.toLowerCase().includes("bolsa"));
  if (!tieneEnvase) {
    alert("Debe seleccionar al menos un envase para realizar la entrega.");
    return;
  }

  const total = items.reduce((acc, i) => acc + i.subtotal, 0);

  const { data, error } = await supabase.rpc("registrar_pedido_focsa", {
    p_cliente: cliente,
    p_piso: piso,
    p_apartamento: apartamento,
    p_telefono: telefono || null,
    p_direccion: null,
    p_unirse_grupo: unirseGrupo,
    p_items: JSON.stringify(items),
    p_canal: "whatsapp"
  });

  if (error) {
    console.error("❌ Error RPC:", error);
    alert("Hubo un error registrando el pedido.");
    return;
  }

    const pedidoId = data;
  localStorage.setItem("pedido_id_actual", pedidoId);

  // Construir mensaje para WhatsApp
  const mensaje = `🧾 Pedido FOCSA
Cliente: ${cliente}
Piso: ${piso}
Apartamento: ${apartamento}
Teléfono: ${telefono || "—"}
${unirseGrupo ? "✅ Desea unirse al grupo" : "❌ No desea unirse"}

${items.map(i => `• ${i.nombre} x${i.cantidad} = ${i.subtotal} CUP`).join("\n")}

Total: ${total.toFixed(2)} CUP
Pedido ID: ${pedidoId}`;

  const url = `https://wa.me/+5355582319?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");

  resetSeleccion();
  iniciarSeguimiento();
}

// =========================
// Seguimiento del pedido
// =========================
async function iniciarSeguimiento() {
  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (!pedidoId) return;
  await verificarIntegridadPedido(pedidoId);
  seguimientoTimer = setTimeout(iniciarSeguimiento, 15000);
}

async function verificarIntegridadPedido(pedidoId) {
  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("*")
    .eq("pedido_id", pedidoId)
    .maybeSingle();

  if (error || !data) {
    console.warn("⚠️ Error o pedido no encontrado");
    return;
  }

  let estadoTexto = `🧾 ${data.estado_actual}`;
  if (data.estado_actual !== "entregado") {
    const cocina = data.replicado_en_cocina ? "✅ Cocina OK" : "⚠️ Sin cocina";
    const reparto = data.replicado_en_reparto ? "✅ Reparto OK" : "⚠️ Sin reparto";
    estadoTexto += ` | ${cocina} | ${reparto}`;
  }
  document.getElementById("estado-actual").textContent = estadoTexto;

  const btnEntregar = document.getElementById("btn-entregado");
  if (btnEntregar) {
    btnEntregar.disabled = !(data.replicado_en_cocina && data.replicado_en_reparto);
  }

  if (data.estado_actual === "entregado") {
    document.getElementById("bloque-criterio").style.display = "block";
  }
}

// =========================
// Marcar como entregado
// =========================
async function marcarComoEntregado() {
  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (!pedidoId) {
    alert("No hay pedido activo para entregar.");
    return;
  }

  const { error } = await supabase.rpc("evento_pedido", {
    p_pedido_id: pedidoId,
    p_evento: "entregado",
    p_usuario: null, // FOCSA no requiere autenticación
    p_observacion: "Entrega confirmada"
  });

  if (error) {
    console.error("❌ Error al marcar como entregado:", error);
    alert("Error al marcar como entregado.");
    return;
  }

  console.log("✅ Pedido marcado como entregado:", pedidoId);
  document.getElementById("bloque-criterio").style.display = "block";
  await verificarIntegridadPedido(pedidoId);
}

document.getElementById("btn-entregado")?.addEventListener("click", marcarComoEntregado);

// =========================
// Utilidades
// =========================
function resetSeleccion() {
  cantidadesMenu = {};
  cantidadesEnvases = {};
  actualizarTotales();
  document.querySelectorAll("[id^='cant-menu-']").forEach(el => (el.textContent = "0"));
  document.querySelectorAll("[id^='cant-env-']").forEach(el => (el.textContent = "0"));
}

function resetearFOCSA() {
  clearTimeout(seguimientoTimer);
  localStorage.removeItem("pedido_id_actual");
  pedidoActual = null;
  resetSeleccion();
  document.getElementById("estado-actual").textContent = "🕓 Pendiente";
  document.getElementById("bloque-criterio").style.display = "none";
}

// =========================
// Exponer funciones al HTML
// =========================
window.enviarWhatsApp = enviarWhatsApp;
window.resetearFOCSA = resetearFOCSA;
window.marcarComoEntregado = marcarComoEntregado;
