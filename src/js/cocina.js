// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Cocina FOCSA                                       │
// │ Script: cocina.js (Parte 1)                                │
// └────────────────────────────────────────────────────────────┘

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔐 Conexión Supabase
const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw"
);
window.supabase = supabase;

// 🟢 INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", async () => {
  console.group("🟢 Módulo Cocina — Inicialización");
  console.log("🚀 Script cocina.js inicializado");

  await verificarAcceso(); // 🔐 Verifica sesión y rol
  await cargarPedidosEnCocina(); // 📥 Carga inicial
  setInterval(cargarPedidosEnCocina, 15000); // 🔄 Auto-refresh cada 15s

  console.groupEnd();
});

// 🔐 VERIFICACIÓN DE USUARIO Y ROL
async function verificarAcceso() {
  console.group("🔐 Verificación de acceso");

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.warn("❌ Usuario no autenticado");
    alert("Acceso denegado. No ha iniciado sesión.");
    location.href = "/login.html";
    return;
  }

  console.log("🧾 Usuario autenticado:", user);

  const { data, error } = await supabase
    .from("usuario")
    .select("rol, activo, nombre")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    console.warn("❌ Error al obtener rol o usuario no registrado:", error);
    alert("Error al verificar rol.");
    location.href = "/login.html";
    return;
  }

  if (!data.activo) {
    console.warn("⛔ Usuario inactivo:", data.nombre);
    alert("Su cuenta está desactivada.");
    location.href = "/login.html";
    return;
  }

  const rol = data.rol;
  const rolesPermitidos = ["admin", "super", "super_admin", "gerente", "cocina"];

  if (!rolesPermitidos.includes(rol)) {
    console.warn("❌ Rol no autorizado:", rol);
    alert("Acceso restringido. Este módulo es solo para cocina, gerencia o administración.");
    location.href = "/denegado.html";
    return;
  }

  document.getElementById("bienvenida").textContent = `👋 Bienvenido ${data.nombre} (${rol})`;
  console.log("✅ Acceso permitido para rol:", rol);
  console.groupEnd();
}

// 📥 CARGA DE PEDIDOS CON FILTROS
async function cargarPedidosEnCocina() {
  console.group("📥 Carga de pedidos en cocina");

  const tipoSeleccionado = document.getElementById("filtro-tipo").value;
  const localSeleccionado = document.getElementById("filtro-local").value;

  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("*")
    .in("estado_actual", ["pendiente", "en cocina"])
    .order("fecha_registro", { ascending: true });

  if (error) {
    console.error("❌ Error al cargar pedidos:", error);
    return;
  }

  let pedidosFiltrados = data;

  if (tipoSeleccionado !== "todos") {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.tipo === tipoSeleccionado);
  }

  if (localSeleccionado !== "todos") {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.local === localSeleccionado);
  }

  console.log("✅ Pedidos filtrados:", pedidosFiltrados.length);
  renderizarPedidos(pedidosFiltrados);
  renderResumenDia(pedidosFiltrados);
  renderResumenPorLocal(pedidosFiltrados);

  console.groupEnd();
}

// 📊 RESUMEN DEL DÍA
function renderResumenDia(pedidos) {
  console.group("📊 Resumen del día");

  const resumen = document.getElementById("resumen-dia");
  const hoy = new Date().toISOString().slice(0, 10);

  const pendientesHoy = pedidos.filter(p =>
    p.estado_actual === "pendiente" &&
    p.fecha_registro.slice(0, 10) === hoy
  );

  const totalPedidos = pedidos.length;
  const pendientes = pendientesHoy.length;
  const enCocina = pedidos.filter(p => p.estado_actual === "en cocina").length;

  const totalCUP = pendientesHoy.reduce((sum, p) => {
    const subtotal = Array.isArray(p.items)
      ? p.items.reduce((acc, item) => acc + item.subtotal, 0)
      : 0;
    return sum + subtotal;
  }, 0);

  resumen.innerHTML = `
    <strong>📊 Resumen del Día:</strong><br>
    Total pedidos: ${totalPedidos}<br>
    Pendientes hoy: ${pendientes} | En cocina: ${enCocina}<br>
    Total CUP (pendientes hoy): ${totalCUP.toFixed(2)}
  `;

  console.log("📊 Total pedidos:", totalPedidos);
  console.log("📌 Pendientes hoy:", pendientes);
  console.log("👨‍🍳 En cocina:", enCocina);
  console.log("💰 Total CUP (pendientes hoy):", totalCUP.toFixed(2));

  console.groupEnd();
}

// 📍 RESUMEN POR LOCAL
function renderResumenPorLocal(pedidos) {
  console.group("📍 Resumen por local");

  const resumen = document.getElementById("resumen-local");
  const locales = ["FOCSA", "LOCAL", "REPARTO"];
  const resumenes = [];

  locales.forEach(local => {
    const pedidosLocal = pedidos.filter(p => p.local === local);
    const totalPedidos = pedidosLocal.length;
    const totalCUP = pedidosLocal.reduce((sum, p) => {
      const subtotal = Array.isArray(p.items)
        ? p.items.reduce((acc, item) => acc + item.subtotal, 0)
        : 0;
      return sum + subtotal;
    }, 0);

    resumenes.push({ local, totalPedidos, totalCUP });
    console.log(`📍 ${local}: ${totalPedidos} pedidos | ${totalCUP.toFixed(2)} CUP`);
  });

  resumen.innerHTML = `
    <strong>📍 Resumen por Local:</strong><br>
    ${resumenes.map(r => `${r.local}: ${r.totalPedidos} pedidos | ${r.totalCUP.toFixed(2)} CUP`).join("<br>")}
  `;

  console.groupEnd();
}

// 🖼️ RENDERIZADO DE PEDIDOS AGRUPADOS CON VALIDACIÓN
function renderizarPedidos(pedidos) {
  console.group("🖼️ Renderizado de pedidos");

  const contenedor = document.getElementById("lista-pedidos");
  contenedor.innerHTML = "";

  if (pedidos.length === 0) {
    contenedor.innerHTML = "<p>No hay pedidos pendientes.</p>";
    console.log("📭 Sin pedidos pendientes");
    console.groupEnd();
    return;
  }

  pedidos.forEach(pedido => {
    // ✅ Validación de estructura de items
    if (!Array.isArray(pedido.items)) {
      console.warn("⚠️ Pedido omitido por estructura inválida de items:", pedido.pedido_id);
      return;
    }

    const total = pedido.items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
    const bloque = document.createElement("div");
    bloque.className = "pedido-bloque";

    // 🧩 Agrupar por categoría
    const agrupado = {};
    pedido.items.forEach(item => {
      if (!item || typeof item !== "object" || !item.nombre || !item.cantidad || typeof item.subtotal !== "number") {
        console.warn("⚠️ Ítem inválido en pedido:", pedido.pedido_id, item);
        return;
      }

      const categoria = item.categoria || "Sin categoría";
      if (!agrupado[categoria]) agrupado[categoria] = [];
      agrupado[categoria].push(item);
    });

    // 🔠 Ordenar alfabéticamente dentro de cada categoría
    for (const cat in agrupado) {
      agrupado[cat].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    // 🧾 Construir HTML
    let listaHTML = "";
    for (const cat in agrupado) {
      listaHTML += `<h4>${cat}</h4><ul>`;
      agrupado[cat].forEach(i => {
        listaHTML += `<li>${i.nombre} x${i.cantidad} = ${i.subtotal} CUP</li>`;
      });
      listaHTML += `</ul>`;
    }

    bloque.innerHTML = `
      <h3>📦 Pedido ${pedido.pedido_id.slice(0, 8)}...</h3>
      <p><strong>Cliente:</strong> ${pedido.cliente}</p>
      <p><strong>Tipo:</strong> ${pedido.tipo} | <strong>Local:</strong> ${pedido.local}</p>
      <p><strong>Estado:</strong> ${pedido.estado_actual}</p>
      <p><strong>Fecha:</strong> ${new Date(pedido.fecha_registro).toLocaleString()}</p>
      ${listaHTML}
      <p><strong>Total:</strong> ${total.toFixed(2)} CUP</p>
      <div class="acciones">
        <button onclick="marcarComoCocinado('${pedido.pedido_id}')">✅ Cocinado</button>
        <button onclick="rechazarPedido('${pedido.pedido_id}')">❌ Rechazar</button>
      </div>
    `;

    contenedor.appendChild(bloque);
  });

  console.groupEnd();
}

// ✅ MARCAR COMO COCINADO
async function marcarComoCocinado(pedidoId) {
  console.group("✅ Marcar como cocinado:", pedidoId);

  const { error } = await supabase
    .from("log_eventos_pedido")
    .insert([{
      pedido_id: pedidoId,
      evento: "cocinado",
      origen: "cocina",
      timestamp: new Date().toISOString()
    }]);

  if (error) {
    console.error("❌ Error al registrar evento:", error);
    return;
  }

  console.log("📦 Pedido marcado como cocinado");
  cargarPedidosEnCocina();

  console.groupEnd();
}

// ❌ RECHAZAR PEDIDO
async function rechazarPedido(pedidoId) {
  console.group("❌ Rechazar pedido:", pedidoId);

  const motivo = prompt("Motivo del rechazo:");
  if (!motivo) {
    console.warn("⚠️ Rechazo cancelado por falta de motivo");
    console.groupEnd();
    return;
  }

  const { error } = await supabase
    .from("log_eventos_pedido")
    .insert([{
      pedido_id: pedidoId,
      evento: "rechazado",
      origen: "cocina",
      detalle: motivo,
      timestamp: new Date().toISOString()
    }]);

  if (error) {
    console.error("❌ Error al registrar rechazo:", error);
    return;
  }

  console.log("📦 Pedido rechazado con motivo:", motivo);
  cargarPedidosEnCocina();

  console.groupEnd();
}

// 🌐 Exponer funciones al HTML
window.marcarComoCocinado = marcarComoCocinado;
window.rechazarPedido = rechazarPedido;
