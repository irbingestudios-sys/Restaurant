// ┌───────────────────────────────────────────────┐
// │ Módulo: Reparto FOCSA                         │
// │ Script: reparto.js                            │
// └───────────────────────────────────────────────┘

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

// 1) Fetch seguro como en cocina (remueve ?columns=)
const safeFetch = (url, opts) => {
  try {
    let finalUrl = url;
    if (typeof finalUrl === "string") {
      finalUrl = finalUrl.replace(/(\?|&)columns=[^&]*/g, "");
    } else if (finalUrl instanceof URL) {
      finalUrl.searchParams.delete("columns");
    }
    console.log("HTTP SAFE CALL:", finalUrl);
    return window.fetch(finalUrl, opts);
  } catch (e) {
    console.warn("No se pudo sanitizar la URL, usando fetch estándar:", e);
    return window.fetch(url, opts);
  }
};

// 2) Cliente Supabase usando fetch seguro
const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw",
  { global: { fetch: safeFetch } }
);

window.supabase = supabase;

// 🟢 Inicialización
document.addEventListener("DOMContentLoaded", async () => {
  console.group("🟢 Módulo Reparto — Inicialización");
  console.log("🚀 Script reparto.js inicializado");

  const accesoOk = await verificarAcceso();
  if (!accesoOk) {
    console.groupEnd();
    return;
  }

  await cargarFiltrosDesdePedidos();
  await cargarPedidosEnReparto();

  setInterval(cargarPedidosEnReparto, 15000);

  document.getElementById("filtro-tipo").addEventListener("change", cargarPedidosEnReparto);
  document.getElementById("filtro-local").addEventListener("change", cargarPedidosEnReparto);

  document.getElementById("cerrar-sesion").addEventListener("click", async () => {
    console.log("🔒 Cerrando sesión...");
    await supabase.auth.signOut();
    location.reload();
  });

  console.groupEnd();
});

// 🔐 Verificación de usuario y rol (solo: super_admin, admin, gerente, repartidor)
async function verificarAcceso() {
  console.group("🔐 Verificación de acceso");

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    alert("❌ No hay sesión activa. Inicie sesión.");
    console.groupEnd();
    return false;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    alert("Acceso denegado. Usuario no válido.");
    console.groupEnd();
    return false;
  }

  const { data, error } = await supabase
    .from("usuario")
    .select("rol, activo, nombre")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    alert("Usuario no registrado.");
    console.groupEnd();
    return false;
  }

  if (!data.activo) {
    alert("Cuenta desactivada.");
    console.groupEnd();
    return false;
  }

  const rol = data.rol?.trim().toLowerCase();
  const rolesPermitidos = ["super_admin", "admin", "gerente", "repartidor"];

  if (!rolesPermitidos.includes(rol)) {
    alert("Acceso restringido. Rol no autorizado.");
    console.groupEnd();
    return false;
  }

  document.getElementById("bienvenida").textContent = `👋 Bienvenido ${data.nombre} (${rol})`;
  console.log("✅ Acceso permitido para rol:", rol);
  console.groupEnd();
  return true;
}

// 🔍 Cargar filtros dinámicos
async function cargarFiltrosDesdePedidos() {
  console.group("🔍 Cargando filtros dinámicos");
  const { data, error } = await supabase.from("pedidos").select("tipo, local");

  if (error) {
    console.error("❌ Error al cargar filtros:", error);
    console.groupEnd();
    return;
  }

  const tipos = [...new Set(data.map(p => p.tipo).filter(Boolean))];
  const locales = [...new Set(data.map(p => p.local).filter(Boolean))];

  const tipoSelect = document.getElementById("filtro-tipo");
  const localSelect = document.getElementById("filtro-local");

  tipoSelect.innerHTML = '<option value="todos">Todos</option>';
  localSelect.innerHTML = '<option value="todos">Todos</option>';

  tipos.forEach(tipo => {
    const opt = document.createElement("option");
    opt.value = tipo;
    opt.textContent = tipo;
    tipoSelect.appendChild(opt);
  });

  locales.forEach(local => {
    const opt = document.createElement("option");
    opt.value = local;
    opt.textContent = local;
    localSelect.appendChild(opt);
  });

  console.groupEnd();
}

// 📥 Cargar pedidos en reparto (solo cocinados)
async function cargarPedidosEnReparto() {
  console.group("📥 Carga de pedidos en reparto");

  const tipo = document.getElementById("filtro-tipo").value;
  const local = document.getElementById("filtro-local").value;

  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("*")
    .eq("estado_actual", "cocinado")
    .order("fecha_registro", { ascending: true });

  if (error) {
    console.error("❌ Error al cargar pedidos:", error);
    console.groupEnd();
    return;
  }

  let pedidosFiltrados = data || [];
  if (tipo !== "todos") pedidosFiltrados = pedidosFiltrados.filter(p => p.tipo === tipo);
  if (local !== "todos") pedidosFiltrados = pedidosFiltrados.filter(p => p.local === local);

  console.log("✅ Pedidos filtrados:", pedidosFiltrados.length);

  renderizarPedidos(pedidosFiltrados);
  renderResumenDia(pedidosFiltrados);
  renderResumenRepartidor(pedidosFiltrados);

  console.groupEnd();
}

// 🖼️ Renderizado de pedidos
function renderizarPedidos(pedidos) {
  console.group("🖼️ Renderizado de pedidos");
  const contenedor = document.getElementById("lista-pedidos");
  contenedor.innerHTML = "";

  if (pedidos.length === 0) {
    console.log("📭 Sin pedidos en reparto");
    console.groupEnd();
    return;
  }

  pedidos.forEach(pedido => {
    const fechaPedido = new Date(pedido.fecha_registro);
    const ahora = new Date();
    const diffMs = ahora - fechaPedido;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);

    const tiempoTranscurrido = diffHoras > 0
      ? `⏱ Esperando: ${diffHoras}h ${diffMin % 60}m`
      : `⏱ Esperando: ${diffMin} minutos`;

    const total = Array.isArray(pedido.items)
      ? pedido.items.reduce((sum, i) => sum + (i.subtotal || 0), 0)
      : 0;

    const bloque = document.createElement("div");
    bloque.className = "pedido-bloque";
    bloque.innerHTML = `
      <h3>🚚 Pedido ${pedido.pedido_id.slice(0, 8)}...</h3>
      <p><strong>Cliente:</strong> ${pedido.cliente}</p>
      <p><strong>Tipo:</strong> ${pedido.tipo} | <strong>Local:</strong> ${pedido.local}</p>
      <p><strong>Estado:</strong> ${pedido.estado_actual}</p>
      <p><strong>Fecha:</strong> ${fechaPedido.toLocaleString()}</p>
      <p><strong>Tiempo en espera:</strong> ${tiempoTranscurrido}</p>
      <p><strong>Total:</strong> ${total.toFixed(2)} CUP</p>
      <div class="acciones">
        <button onclick="marcarComoEntregado('${pedido.pedido_id}')">✅ Entregado</button>
        <button onclick="rechazarEntrega('${pedido.pedido_id}')">❌ Rechazar</button>
      </div>
    `;

    contenedor.appendChild(bloque);
  });

  console.groupEnd();
}

// ✅ Marcar como entregado
async function marcarComoEntregado(pedidoId) {
  console.group("✅ Marcar como entregado:", pedidoId);

  const { error } = await supabase
    .from("evento_pedido")
    .insert([{
      id: crypto.randomUUID(),
      pedido_id: pedidoId,
      etapa: "entregado",
      origen: "reparto",
      fecha: new Date().toISOString()
    }]);

  if (error) {
    console.error("❌ Error al registrar entrega:", error);
    console.groupEnd();
    return;
  }

  console.log("📦 Pedido marcado como entregado");
  await cargarPedidosEnReparto();
  console.groupEnd();
}

// ❌ Rechazar entrega
async function rechazarEntrega(pedidoId) {
  console.group("❌ Rechazar entrega:", pedidoId);

  const motivo = prompt("Motivo del rechazo:");
  if (!motivo) {
    console.warn("⚠️ Rechazo cancelado por falta de motivo");
    console.groupEnd();
    return;
  }

  const { error } = await supabase
    .from("eventos_pedido")
    .insert([{
      id: crypto.randomUUID(),
      pedido_id: pedidoId,
      tipo: "rechazado",
      descripcion: motivo,
      fecha: new Date().toISOString()
    }]);

  if (error) {
    console.error("❌ Error al registrar rechazo:", error);
    console.groupEnd();
    return;
  }

  console.log("📦 Entrega rechazada con motivo:", motivo);
  await cargarPedidosEnReparto();
  console.groupEnd();
}

// 📊 Resumen del día (simple)
function renderResumenDia(pedidos) {
  console.group("📊 Resumen del día");
  const resumen = document.getElementById("resumen-dia");
  resumen.innerHTML = `<strong>📊 Total pedidos en reparto:</strong> ${pedidos.length}`;
  console.groupEnd();
}

// 👨‍🚚 Resumen del repartidor (placeholder)
function renderResumenRepartidor(pedidos) {
  console.group("👨‍🚚 Resumen del repartidor");
  const resumen = document.getElementById("resumen-repartidor");
  resumen.innerHTML = `<strong>👨‍🚚 Entregados por ti:</strong> (Próximo: conectar a RPC)`;
  console.groupEnd();
}

// 🌐 Exponer funciones al HTML
window.marcarComoEntregado = marcarComoEntregado;
window.rechazarEntrega = rechazarEntrega;
