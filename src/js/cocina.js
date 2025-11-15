// src/js/cocina.js

// ┌────────────────────────────────────────────┐
// │ Sección 1: Inicialización Supabase         │
// └────────────────────────────────────────────┘
const { createClient } = supabase;
const supabaseClient = createClient("https://https://qeqltwrkubtyrmgvgaai.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw");
console.log("✅ Supabase inicializado");

// ┌────────────────────────────────────────────┐
// │ Sección 2: Verificación de sesión y rol    │
// └────────────────────────────────────────────┘
function verificarAccesoModulo() {
  const usuarioId = localStorage.getItem("usuario_id");
  const rol = localStorage.getItem("usuario_rol");
  const area = localStorage.getItem("usuario_area");

  if (!usuarioId || !rol) {
    console.warn("⚠️ Usuario no autenticado");
    alert("Debes iniciar sesión");
    window.location.href = "login.html";
    return;
  }

  if (!["admin", "cocina", "super_admin"].includes(rol)) {
    console.warn("⛔ Acceso denegado para rol:", rol);
    alert("Acceso denegado. Este módulo es exclusivo para cocina y administración.");
    window.location.href = "login.html";
    return;
  }

  console.log(`✅ Acceso autorizado: ${rol} (${area || "sin área"})`);
}

// ┌────────────────────────────────────────────┐
// │ Sección 3: Cargar pedidos desde Supabase   │
// └────────────────────────────────────────────┘
async function cargarPedidosCocina() {
  console.log("📦 Cargando pedidos desde vista técnica...");

  const { data, error } = await supabaseClient.from("vw_pedidos_cocina").select("*");

  if (error) {
    console.error("❌ Error al cargar pedidos:", error);
    return;
  }

  console.log(`✅ ${data.length} pedidos cargados`);
  const contenedor = document.getElementById("lista-pedidos");
  contenedor.innerHTML = "";

  data.forEach(pedido => {
    const bloque = document.createElement("div");
    bloque.className = "pedido-bloque";
    bloque.innerHTML = `
      <p><strong>${pedido.cliente}</strong> — Piso ${pedido.piso}, Apto ${pedido.apartamento}</p>
      <p>🕒 ${new Date(pedido.fecha_registro).toLocaleString()}</p>
      <p>Estado: <span class="estado ${pedido.estado || 'pendiente'}">${pedido.estado || 'pendiente'}</span></p>
      ${pedido.criterio ? `<p>📝 Criterio: ${pedido.criterio}</p>` : ""}
      <button onclick="marcarEntregado('${pedido.pedido_id}')">✅ Marcar como entregado</button>
    `;
    contenedor.appendChild(bloque);
  });
}

// ┌────────────────────────────────────────────┐
// │ Sección 4: Marcar pedido como entregado    │
// └────────────────────────────────────────────┘
async function marcarEntregado(pedidoId) {
  const usuarioId = localStorage.getItem("usuario_id");
  console.log("📤 Marcando pedido como entregado:", pedidoId);

  const { error } = await supabaseClient.rpc("actualizar_estado_pedido", {
    p_id: pedidoId,
    nuevo_estado: "entregado",
    usuario: usuarioId
  });

  if (error) {
    console.error("❌ Error al actualizar estado:", error);
    alert("No se pudo actualizar el estado");
  } else {
    console.log("✅ Pedido actualizado correctamente");
    cargarPedidosCocina();
  }
}

// ┌────────────────────────────────────────────┐
// │ Sección 5: Inicialización del módulo       │
// └────────────────────────────────────────────┘
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Módulo cocina iniciado");
  verificarAccesoModulo();
  cargarPedidosCocina();
});
