import { supabase } from './supabaseClient.js';
import { logEvent } from './logger.js';

window.supabase = supabase;

let pedidosGlobal = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🔄 Iniciando módulo cocina...');

    // ── Autenticación y perfil ───────────────────────────────
    const { data: perfil, error } = await supabase.rpc('obtener_perfil_seguro');
    if (error || !perfil || perfil.length === 0) throw new Error('Perfil no disponible');

    const usuario = perfil[0];
    const nombre = usuario?.nombre || 'sin nombre';
    const rol = usuario?.rol || 'sin rol';
    const correo = usuario?.correo || 'sin correo';
    const usuarioId = usuario?.id;

    console.log(`✅ Perfil cargado: ${nombre} (${rol})`);
    document.getElementById('bienvenida').textContent = `Bienvenido, ${nombre} (${rol})`;

    if (!['super_admin', 'admin', 'cocina'].includes(rol)) {
      logEvent('warn', 'Cocina', `Acceso denegado para rol: ${rol}`);
      window.location.href = '../../index.html';
      return;
    }

    await supabase.rpc('registrar_evento', {
      tipo: 'acceso',
      modulo: 'cocina',
      detalle: `Ingreso al módulo cocina por ${correo} (${rol})`
    });

    // ── Resumen diario ───────────────────────────────────────
const { data: resumen, error: errorResumen } = await supabase.rpc('resumen_cocina_dia', {
  p_usuario: usuarioId
});

if (errorResumen) {
  console.warn('⚠️ Error al obtener resumen diario:', errorResumen.message);
} else if (resumen && resumen.length > 0) {
  const r = resumen[0];
  const resumenEl = document.getElementById('resumen-dia');
  if (resumenEl) {
    resumenEl.innerHTML = `
      <p>📦 Entregados hoy: <strong>${r.entregados}</strong> — 💰 <strong>${r.importe_entregado.toFixed(2)} CUP</strong></p>
      <p>⏳ Pendientes hoy: <strong>${r.pendientes}</strong> — 💰 <strong>${r.importe_pendiente.toFixed(2)} CUP</strong></p>
    `;
  } else {
    console.warn('⚠️ Elemento #resumen-dia no encontrado en el DOM');
  }
}

    // ── Carga inicial de pedidos ─────────────────────────────
    await cargarPedidos();

    // ── Actualización automática ─────────────────────────────
    setInterval(cargarPedidos, 30000); // cada 30 segundos

    // ── Cierre de sesión ─────────────────────────────────────
    document.getElementById('cerrar-sesion').addEventListener('click', () => {
      console.log('🔒 Cerrando sesión...');
      localStorage.clear();
      window.location.href = 'login.html';
    });

    // ── Delegación de eventos para botones ───────────────────
    document.getElementById('lista-pedidos').addEventListener('click', e => {
      if (e.target.matches('button[data-pedido-id]')) {
        const pedidoId = e.target.getAttribute('data-pedido-id');
        marcarEntregado(pedidoId, usuarioId);
      }
    });

  } catch (err) {
    console.error('❌ Error en módulo cocina:', err.message);
    alert('Error al iniciar módulo cocina');
    window.location.href = '../../index.html';
  }
});

// ── Cargar pedidos desde la vista ────────────────────────────
async function cargarPedidos() {
  console.log('📦 Cargando pedidos desde vista técnica...');

  const { data, error } = await supabase.from('vw_pedidos_cocina').select('*');
  if (error) {
    console.error('❌ Error al cargar pedidos:', error.message);
    return;
  }

  pedidosGlobal = data;
  console.log(`✅ ${pedidosGlobal.length} pedidos cargados`);
  renderizarPedidos(pedidosGlobal);
}

// ── Renderizar pedidos con productos e importes ──────────────
function renderizarPedidos(lista) {
  const contenedor = document.getElementById('lista-pedidos');
  contenedor.innerHTML = '';

  lista.forEach(pedido => {
    const bloque = document.createElement('div');
    bloque.className = 'pedido-bloque';

    let productosHTML = '';
    let total = 0;

    if (pedido.items && Array.isArray(pedido.items)) {
      productosHTML = `
        <ul class="productos-lista">
          ${pedido.items.map(item => {
            const importe = item.cantidad * item.precio;
            total += importe;
            return `<li>${item.nombre} × ${item.cantidad} — ${importe.toFixed(2)} CUP</li>`;
          }).join('')}
        </ul>
        <p><strong>Total:</strong> ${total.toFixed(2)} CUP</p>
      `;
    }

    bloque.innerHTML = `
      <p><strong>${pedido.cliente}</strong> — Piso ${pedido.piso}, Apto ${pedido.apartamento}</p>
      <p>🕒 ${new Date(pedido.fecha_registro).toLocaleString()}</p>
      <p>Estado: <span class="estado ${pedido.estado || 'pendiente'}">${pedido.estado || 'pendiente'}</span></p>
      ${pedido.criterio ? `<p>📝 Criterio: ${pedido.criterio}</p>` : ''}
      ${productosHTML}
      <button data-pedido-id="${pedido.pedido_id}">✅ Marcar como entregado</button>
    `;
    contenedor.appendChild(bloque);
  });
}

// ── Marcar pedido como entregado ─────────────────────────────
async function marcarEntregado(pedidoId, usuarioId) {
  console.log('📤 Marcando pedido como entregado:', pedidoId);

  const { error } = await supabase.rpc('actualizar_estado_pedido', {
    p_id: pedidoId,
    nuevo_estado: 'entregado',
    usuario: usuarioId
  });

  if (error) {
    console.error('❌ Error al actualizar estado:', error.message);
    alert('No se pudo actualizar el estado');
  } else {
    console.log('✅ Pedido actualizado correctamente');
    await cargarPedidos();
  }
}

// ── Exponer función global ───────────────────────────────────
window.marcarEntregado = marcarEntregado;
