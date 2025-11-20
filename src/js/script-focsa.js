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

// Estado global
let cantidadesMenu = {};      // {itemId: {cantidad, precio, subtotal, nombre}}
let cantidadesEnvases = {};   // {envaseId: {cantidad, precio, subtotal, nombre}}
let pedidoActual = null;      // último pedido registrado {pedido_id, ...}
let seguimientoActivo = false;
let seguimientoTimer = null;
let usuarioActual = null;     // UUID del usuario autenticado

// Supón que ya tienes un cliente supabase inicializado como `supabase`

// =========================
// Autenticación y acceso
// =========================
async function verificarAcceso() {
  console.log("🔐 Verificación de acceso");
  const { data: user, error } = await supabase.auth.getUser();
  if (error || !user || !user.user) {
    console.error("❌ Usuario no autenticado");
    throw new Error("Usuario no autenticado");
  }
  usuarioActual = user.user.id;
  console.log("🧾 Usuario autenticado:", user.user.email);

  // Validar rol si aplica (opcional)
  const { data: rolData, error: rolError } = await supabase
    .from("usuario")
    .select("rol, activo, nombre")
    .eq("id", usuarioActual)
    .maybeSingle();

  if (rolError) console.warn("⚠️ No se pudo verificar rol:", rolError);
  if (rolData) console.log("✅ Acceso permitido para rol:", rolData.rol);
}

// =========================
// Carga del menú y envases
// =========================
async function cargarMenu() {
  console.log("📥 Carga de menú");
  const { data, error } = await supabase.from("menu_especial").select("*").order("orden", { ascending: true });
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
  const { data, error } = await supabase.from("envases").select("*").order("orden", { ascending: true });
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
  console.log("🖼️ Renderizado en menu-especial");
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
  console.log("🖼️ Renderizado en envases-contenedor");
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

  console.log("🧮 Totales actualizados:", { total, cantidad });
  const totalEl = document.getElementById("total-pedido");
  const cantEl = document.getElementById("cantidad-pedido");
  if (totalEl) totalEl.textContent = total;
  if (cantEl) cantEl.textContent = cantidad;
}

// =========================
// Validaciones y vista previa
// =========================
function construirItemsSeleccionados() {
  const items = [];
  Object.entries(cantidadesMenu).forEach(([id, v]) => {
    if (v.cantidad > 0) items.push({ nombre: v.nombre, precio: v.precio, cantidad: v.cantidad, subtotal: v.subtotal, tipo: "menu", id });
  });
  Object.entries(cantidadesEnvases).forEach(([id, v]) => {
    if (v.cantidad > 0) items.push({ nombre: v.nombre, precio: v.precio, cantidad: v.cantidad, subtotal: v.subtotal, tipo: "envase", id });
  });
  return items;
}

function revisarPedido() {
  console.log("🧾 Vista previa del pedido");
  const cliente = document.getElementById("cliente")?.value?.trim();
  const telefono = document.getElementById("telefono")?.value?.trim();
  const direccion = document.getElementById("direccion")?.value?.trim();
  const piso = document.getElementById("piso")?.value?.trim();
  const apartamento = document.getElementById("apartamento")?.value?.trim();
  const unirseGrupo = Boolean(document.getElementById("unirse-grupo")?.checked);

  if (!cliente || !telefono) {
    console.warn("❌ Datos incompletos para revisión.");
    return false;
  }

  const items = construirItemsSeleccionados();
  const tieneEnvase = items.some(i => i.tipo === "envase" && i.cantidad > 0);
  if (!tieneEnvase) {
    console.warn("❌ Pedido sin envases.");
    return false;
  }

  const total = items.reduce((acc, i) => acc + i.subtotal, 0);
  console.log("🧮 Resumen:", { cliente, telefono, direccion, piso, apartamento, unirseGrupo, total, cantidad: items.length });
  // Render del modal/resumen si aplica…
  return { cliente, telefono, direccion, piso, apartamento, unirseGrupo, items, total };
}

// =========================
// Filtros (opcional)
// =========================
function filtrarCategoria(cat) {
  console.log("🔍 Filtro de categoría");
  console.log("📌 Categoría seleccionada:", cat || "todos");
  // Implementa tu lógica de filtro sobre los elementos renderizados
}

// =========================
// Inicialización
// =========================
async function initFOCSA() {
  await verificarAcceso();
  await cargarMenu();
  await cargarEnvases();
  actualizarTotales();
}

document.addEventListener("DOMContentLoaded", initFOCSA);
// =========================
// Envío por WhatsApp + RPC
// =========================
async function enviarWhatsApp() {
  console.log("📲 Enviar pedido por WhatsApp");
  const resumen = revisarPedido();
  if (!resumen) return;

  console.log("✅ Datos del cliente verificados");
  const items = resumen.items;
  console.log("✅ Al menos un envase seleccionado");
  console.log("📦 Ítems construidos:", items);

  // Payload RPC — registrar_pedido_focsa(text, text, text, text, text, boolean, json, text) -> uuid
  const payload = {
    p_cliente: resumen.cliente,
    p_telefono: resumen.telefono,
    p_local: "FOCSA",
    p_tipo: "especial",
    p_canal: "whatsapp",
    p_unirse_grupo: resumen.unirseGrupo,
    p_items: JSON.stringify(items),
    p_descripcion: construirDescripcionWhatsApp(resumen) // opcional
  };

  const { data: pedidoId, error } = await supabase.rpc("registrar_pedido_focsa", payload);
  if (error) {
    console.error("❌ Error RPC:", error);
    return;
  }

  console.log("📥 Pedido registrado con ID:", pedidoId);
  pedidoActual = { pedido_id: pedidoId, total: resumen.total, cliente: resumen.cliente };
  localStorage.setItem("pedido_id_actual", pedidoId);

  // Abrir WhatsApp con mensaje
  abrirWhatsApp(resumen, pedidoId);

  // Limpiar selección
  resetSeleccion();
  console.log("🧹 Selección limpiada y menú reiniciado");

  // Activar seguimiento
  activarSeguimiento();
  console.log("📦 Seguimiento activado");
}

function construirDescripcionWhatsApp(resumen) {
  const lineas = resumen.items.map(i => `- ${i.nombre} x${i.cantidad} (${i.subtotal})`);
  return `Cliente: ${resumen.cliente}\nTel: ${resumen.telefono}\nDir: ${resumen.direccion || ""}\nPiso: ${resumen.piso || ""} Apt: ${resumen.apartamento || ""}\nItems:\n${lineas.join("\n")}\nTotal: ${resumen.total}`;
}

function abrirWhatsApp(resumen, pedidoId) {
  const mensaje = encodeURIComponent(`${construirDescripcionWhatsApp(resumen)}\nPedido ID: ${pedidoId}`);
  const url = `https://wa.me/${resumen.telefono}?text=${mensaje}`;
  window.open(url, "_blank");
  console.log("📤 WhatsApp abierto con mensaje");
}

// =========================
// Seguimiento del pedido
// =========================
function activarSeguimiento() {
  if (seguimientoActivo) return;
  seguimientoActivo = true;
  iniciarSeguimiento();
}

function desactivarSeguimiento() {
  seguimientoActivo = false;
  if (seguimientoTimer) {
    clearTimeout(seguimientoTimer);
    seguimientoTimer = null;
  }
}

async function iniciarSeguimiento() {
  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (!pedidoId) return;
  await verificarIntegridadPedido(pedidoId);
  // Refresco controlado cada 15s (no loop infinito)
  seguimientoTimer = setTimeout(() => {
    if (seguimientoActivo) iniciarSeguimiento();
  }, 15000);
}

async function verificarIntegridadPedido(pedidoId) {
  try {
    console.log("🔎 Seguimiento del pedido");
    const { data, error } = await supabase
      .from("vw_integridad_pedido")
      .select("*")
      .eq("pedido_id", pedidoId)
      .maybeSingle();

    if (error || !data) {
      console.warn("⚠️ Error o pedido no encontrado");
      return;
    }

    // Mostrar estado
    let estadoTexto = `🧾 ${data.estado_actual}`;
    if (data.estado_actual !== "entregado") {
      const cocina = data.replicado_en_cocina ? "✅ Cocina OK" : "⚠️ Sin cocina";
      const reparto = data.replicado_en_reparto ? "✅ Reparto OK" : "⚠️ Sin reparto";
      estadoTexto += ` | ${cocina} | ${reparto}`;
    }
    const estadoEl = document.getElementById("estado-actual");
    if (estadoEl) estadoEl.textContent = estadoTexto;

    // Habilitar botón de entrega si está replicado en cocina y reparto
    const btnEntregar = document.getElementById("btn-entregar");
    if (btnEntregar) {
      btnEntregar.disabled = !(data.replicado_en_cocina && data.replicado_en_reparto);
    }

    // Si ya está entregado, no tiene sentido seguir mostrando badges de replicación
    if (data.estado_actual === "entregado") {
      const criterioBloque = document.getElementById("bloque-criterio");
      if (criterioBloque) criterioBloque.style.display = "block";
      // Opcional: parar seguimiento si ya está entregado
      // desactivarSeguimiento();
    }
  } catch (e) {
    console.error("❌ Error en verificarIntegridadPedido:", e);
  }
}

// =========================
// Marcar como entregado (RPC evento_pedido)
// =========================
async function marcarComoEntregado() {
  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (!pedidoId) {
    console.warn("⚠️ No hay pedido activo para entregar");
    return;
  }

  const { error } = await supabase.rpc("evento_pedido", {
    p_pedido_id: pedidoId,
    p_evento: "entregado",
    p_usuario: usuarioActual, // UUID del repartidor autenticado
    p_observacion: "Entrega confirmada por repartidor"
  });

  if (error) {
    console.error("❌ Error al marcar como entregado:", error);
    return;
  }

  console.log("✅ Pedido marcado como entregado:", pedidoId);
  const criterioBloque = document.getElementById("bloque-criterio");
  if (criterioBloque) criterioBloque.style.display = "block";
  // Forzar un refresco inmediato del seguimiento
  await verificarIntegridadPedido(pedidoId);
}

// Vincular botón
document.getElementById("btn-entregar")?.addEventListener("click", marcarComoEntregado);

// =========================
// Utilidades de limpieza
// =========================
function resetSeleccion() {
  cantidadesMenu = {};
  cantidadesEnvases = {};
  actualizarTotales();
  // Reinicia contadores visuales
  document.querySelectorAll("[id^='cant-menu-']").forEach(el => (el.textContent = "0"));
  document.querySelectorAll("[id^='cant-env-']").forEach(el => (el.textContent = "0"));
}

function resetFOCSA() {
  desactivarSeguimiento();
  localStorage.removeItem("pedido_id_actual");
  pedidoActual = null;
  resetSeleccion();
}

// =========================
// Exponer funciones (si las necesitas en HTML)
// =========================
window.enviarWhatsApp = enviarWhatsApp;
window.filtrarCategoria = filtrarCategoria;
window.resetFOCSA = resetFOCSA;
