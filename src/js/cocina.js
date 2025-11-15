// src/js/cocina.js
const supabase = supabase.createClient("https://https://qeqltwrkubtyrmgvgaai.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw");

function verificarAccesoModulo() {
  const rol = localStorage.getItem("usuario_rol");
  if (!rol || !["admin", "cocina"].includes(rol)) {
    alert("Acceso denegado. Este módulo es exclusivo para cocina y administración.");
    window.location.href = "login.html";
  }
}

async function cargarPedidosCocina() {
  const { data, error } = await supabase.from("vw_pedidos_cocina").select("*");

  if (error) {
    console.error("❌ Error al cargar pedidos:", error);
    return;
  }

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

async function marcarEntregado(pedidoId) {
  const usuarioId = localStorage.getItem("usuario_id");
  const { error } = await supabase.rpc("actualizar_estado_pedido", {
    p_id: pedidoId,
    nuevo_estado: "entregado",
    usuario: usuarioId
  });

  if (error) {
    console.error("❌ Error al actualizar estado:", error);
    alert("No se pudo actualizar el estado");
  } else {
    console.log("✅ Pedido marcado como entregado:", pedidoId);
    cargarPedidosCocina();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  verificarAccesoModulo();
  cargarPedidosCocina();
});
