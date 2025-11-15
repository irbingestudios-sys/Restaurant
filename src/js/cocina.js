// src/js/cocina.js
import { supabase } from './supabaseClient.js';
import { logEvent } from './logger.js';

window.supabase = supabase;

let pedidosGlobal = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🔄 Iniciando módulo cocina...');

    // ── Grupo: Autenticación y perfil ──────────────────────────
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

    // ── Grupo: Carga inicial de pedidos ────────────────────────
    await cargarPedidos();

    // ── Grupo: Actualización automática ────────────────────────
    setInterval(cargarPedidos, 30000); // cada 30 segundos

    // ── Grupo: Botón de cierre de sesión ───────────────────────
    document.getElementById('cerrar-sesion').addEventListener('click', () => {
      console.log('🔒 Cerrando sesión...');
      localStorage.clear();
      window.location.href = 'login.html';
    });

    // ── Grupo: Delegación de eventos para botones ──────────────
    document.getElementById('lista-pedidos').addEventListener('click', e => {
      if (e.target.matches('button[data-pedido-id]')) {
        const pedidoId = e.target.getAttribute('data-pedido-id');
        marcarEntregado(pedidoId);
      }
    });

  } catch (err) {
    console.error('❌ Error en módulo cocina:', err.message);
    alert('Error al iniciar módulo cocina');
    window.location.href = '../../index.html';
  }
});

// ── Grupo: Carga de pedidos ───────────────────────────────────
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

// ── Grupo: Renderizado de pedidos ─────────────────────────────
function renderizarPedidos(lista) {
  const contenedor = document.getElementById('lista-pedidos');
  contenedor.innerHTML = '';

  lista.forEach(pedido => {
    const bloque = document.createElement('div');
    bloque.className = 'pedido-bloque';

    // Render de productos si existen
    let productosHTML = '';
    if (pedido.items && Array.isArray(pedido.items)) {
      productosHTML = `
        <ul class="productos-lista">
          ${pedido.items.map(item => `<li>${item.nombre} × ${item.cantidad}</li>`).join('')}
        </ul>
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

// ── Grupo: Marcar como entregado ──────────────────────────────
async function marcarEntregado(pedidoId) {
  const { data: perfil } = await supabase.rpc('obtener_perfil_seguro');
  const usuarioId = perfil?.[0]?.id;

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

// ── Grupo: Exponer función global ─────────────────────────────
window.marcarEntregado = marcarEntregado;
