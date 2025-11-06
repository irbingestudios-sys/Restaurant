// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Menú                                                │
// │ Script: menu.js                                             │
// │ Descripción: Gestión de productos y acceso por rol         │
// │ Autor: Irbing Brizuela                                      │
// │ Fecha: 2025-11-06                                           │
// └────────────────────────────────────────────────────────────┘

import { supabase } from './supabaseClient.js';
import { logEvent } from './logger.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: perfil, error } = await supabase.rpc('obtener_perfil_seguro');
    if (error || !perfil || perfil.length === 0) throw new Error('Perfil no disponible');

    const usuario = perfil[0];
    const nombre = usuario?.nombre || 'sin nombre';
    const rol = usuario?.rol || 'sin rol';

    document.getElementById('bienvenida').textContent = `Bienvenido, ${nombre} (${rol})`;

    if (!['super_admin', 'admin', 'gerente'].includes(rol)) {
      logEvent('warn', 'Menu', `Acceso denegado para rol: ${rol}`);
      window.location.href = '../../index.html';
      return;
    }

    await supabase.rpc('registrar_evento', {
      tipo: 'acceso',
      modulo: 'menu',
      detalle: `Ingreso al módulo menú por ${nombre} (${rol})`
    });

    cargarProductos();

    document.getElementById('btnCrear').addEventListener('click', async () => {
      const nuevo = {
        nombre: 'Producto de prueba',
        descripcion: 'Descripción breve',
        precio: 100,
        disponible: true,
        categoria: 'plato fuerte',
        etiquetas: ['vegano'],
        imagen_url: 'https://via.placeholder.com/200',
        areas: ['cocina'],
        destinos: ['local']
      };

      const { data, error } = await supabase.rpc('crear_menu_item', nuevo);
      if (error) {
        logEvent('error', 'Menu', `Error al crear producto: ${error.message}`);
      } else {
        logEvent('info', 'Menu', `Producto creado con ID: ${data}`);
        cargarProductos();
      }
    });

  } catch (err) {
    logEvent('error', 'Menu', `Error al iniciar módulo: ${err.message}`);
    window.location.href = '../../index.html';
  }
});

async function cargarProductos() {
  const { data: productos, error } = await supabase
    .from('menu_item')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) {
    logEvent('error', 'Menu', `Error al cargar productos: ${error.message}`);
    return;
  }

  const contenedor = document.getElementById('lista-productos');
  contenedor.innerHTML = '';

  productos.forEach(p => {
    const card = document.createElement('div');
    card.className = 'producto';
    card.innerHTML = `
      <img src="${p.imagen_url}" alt="${p.nombre}" />
      <h4>${p.nombre}</h4>
      <p>$${p.precio.toFixed(2)}</p>
      <p class="etiquetas">${(p.etiquetas || []).join(', ')}</p>
      <p><strong>Áreas:</strong> ${p.areas.join(', ')}</p>
      <p><strong>Destinos:</strong> ${p.destinos.join(', ')}</p>
    `;
    contenedor.appendChild(card);
  });
}
