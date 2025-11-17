// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Reparto                                            │
// │ Script: reparto.js                                         │
// └────────────────────────────────────────────────────────────┘

// Similar a cocina.js, pero adaptado a reparto
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const supabase = createClient("https://qeqltwrkubtyrmgvgaai.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw");

// 📥 Cargar pedidos en reparto
async function cargarPedidosEnReparto() {
  console.group("📥 Carga de pedidos en reparto");

  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("*")
    .eq("estado_actual", "cocinado") // solo pedidos listos para entregar
    .order("fecha_registro", { ascending: true });

  if (error) {
    console.error("❌ Error al cargar pedidos:", error);
    console.groupEnd();
    return;
  }

  console.log("✅ Pedidos filtrados:", data.length);
  renderizarPedidos(data);
  renderResumenDia(data);
  renderResumenRepartidor(data);

  console.groupEnd();
}

// 🖼️ Renderizado de pedidos
function renderizarPedidos(pedidos) {
  const contenedor = document.getElementById("lista-pedidos");
  contenedor.innerHTML = "";

  if (pedidos.length === 0) {
    console.log("📭 Sin pedidos en reparto");
    return;
  }

  pedidos.forEach(pedido => {
    const fechaPedido = new Date(pedido.fecha_registro);
    const ahora = new Date();
    const diffMs = ahora - fechaPedido;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);

    let tiempoTranscurrido = diffHoras > 0
      ? `⏱ Esperando: ${diffHoras}h ${diffMin % 60}m`
      : `⏱ Esperando: ${diffMin} minutos`;

    const bloque = document.createElement("div");
    bloque.className = "pedido-bloque";

    const total = Array.isArray(pedido.items)
      ? pedido.items.reduce((sum, i) => sum + (i.subtotal || 0), 0)
      : 0;

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
}

// ✅ Marcar como entregado
async function marcarComoEntregado(pedidoId) {
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
    return;
  }

  console.log("📦 Pedido marcado como entregado");
  await cargarPedidosEnReparto();
}

// ❌ Rechazar entrega
async function rechazarEntrega(pedidoId) {
  const motivo = prompt("Motivo del rechazo:");
  if (!motivo) return;

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
    return;
  }

  console.log("📦 Pedido rechazado con motivo:", motivo);
  await cargarPedidosEnReparto();
}

// 📊 Resumen del día
function renderResumenDia(pedidos) {
  const resumen = document.getElementById("resumen-dia");
  resumen.innerHTML = `<strong>📊 Total pedidos en reparto:</strong> ${pedidos.length}`;
}

// 👨‍🚚 Resumen del repartidor
function renderResumenRepartidor(pedidos) {
  const resumen = document.getElementById("resumen-repartidor");
  resumen.innerHTML = `<strong>👨‍🚚 Pedidos entregados por ti:</strong> 0 (ejemplo, se puede conectar a RPC)`;
}

// 🌐 Exponer funciones
window.marcarComoEntregado = marcarComoEntregado;
window.rechazarEntrega = rechazarEntrega;

// Inicialización
document.addEventListener("DOMContentLoaded", cargarPedidosEnReparto);
