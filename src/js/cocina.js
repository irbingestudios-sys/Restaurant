// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Cocina FOCSA                                       │
// │ Script: cocina.js                                          │
// │ Autor: Irbing Brizuela                                     │
// │ Fecha: 2025-11-16                                          │
// └────────────────────────────────────────────────────────────┘

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔐 Conexión Supabase
const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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

  const { data, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    console.warn("❌ Error al obtener rol");
    alert("Error al verificar rol.");
    location.href = "/login.html";
    return;
  }

  const rol = data.rol;
  const rolesPermitidos = ["admin", "super", "gerente", "cocina"];

  if (!rolesPermitidos.includes(rol)) {
    console.warn("❌ Rol no autorizado:", rol);
    alert("Acceso restringido. Este módulo es solo para cocina, gerencia o administración.");
    location.href = "/denegado.html";
    return;
  }

  document.getElementById("bienvenida").textContent = `👋 Bienvenido al módulo cocina (${rol})`;
  console.log("✅ Acceso permitido para rol:", rol);
  console.groupEnd();
}

// 📥 CARGA DE PEDIDOS
async function cargarPedidosEnCocina() {
  console.group("📥 Carga de pedidos en cocina");

  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("*")
    .in("estado_actual", ["pendiente", "en cocina"])
    .order("fecha_registro", { ascending: true });

  if (error) {
    console.error("❌ Error al cargar pedidos:", error);
    return;
  }

  console.log("✅ Pedidos cargados:", data.length);
  renderizarPedidos(data);
  renderResumenDia(data);

  console.groupEnd();
}

// 📊 RESUMEN DEL DÍA
function renderResumenDia(pedidos) {
  console.group("📊 Resumen del día");

  const resumen = document.getElementById("resumen-dia");
  const total = pedidos.length;
  const pendientes = pedidos.filter(p => p.estado_actual === "pendiente").length;
  const enCocina = pedidos.filter(p => p.estado_actual === "en cocina").length;

  resumen.innerHTML = `
    <strong>📊 Resumen del Día:</strong>
    Total: ${total} | Pendientes: ${pendientes} | En cocina: ${enCocina}
  `;

  console.log("📊 Total:", total, "| Pendientes:", pendientes, "| En cocina:", enCocina);
  console.groupEnd();
}

// 🖼️ RENDERIZADO DE PEDIDOS
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
    const total = pedido.items.reduce((sum, i) => sum + i.subtotal, 0);
    const bloque = document.createElement("div");
    bloque.className = "pedido-bloque";

    bloque.innerHTML = `
      <h3>📦 Pedido ${pedido.pedido_id.slice(0, 8)}...</h3>
      <p><strong>Cliente:</strong> ${pedido.cliente}</p>
      <p><strong>Canal:</strong> ${pedido.canal} | <strong>Estado:</strong> ${pedido.estado_actual}</p>
      <p><strong>Fecha:</strong> ${new Date(pedido.fecha_registro).toLocaleString()}</p>
      <ul>${pedido.items.map(i => `<li>${i.nombre} x${i.cantidad} = ${i.subtotal} CUP</li>`).join("")}</ul>
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
