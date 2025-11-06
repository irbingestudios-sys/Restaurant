// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Menú                                                │
// │ Script: menu.js                                             │
// │ Descripción: Gestión de productos y acceso por rol         │
// │ Autor: Irbing Brizuela                                      │
// │ Fecha: 2025-11-06                                           │
// └────────────────────────────────────────────────────────────┘

import { supabase } from './supabaseClient.js';
import { logEvent } from './logger.js';

let productosGlobal = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: perfil, error } = await supabase.rpc('obtener_perfil_seguro');
    if (error || !perfil || perfil.length === 0) throw new Error('Perfil no disponible');

    const usuario = perfil[0];
    const nombre = usuario?.nombre || 'sin nombre';
    const rol = usuario?.rol || 'sin rol';
    const correo = usuario?.correo || 'sin correo';

    document.getElementById('bienvenida').textContent = `Bienvenido, ${nombre} (${rol})`;

    if (!['super_admin', 'admin', 'gerente'].includes(rol)) {
      logEvent('warn', 'Menu', `Acceso denegado para rol: ${rol}`);
      window.location.href = '../../index.html';
      return;
    }

    await supabase.rpc('registrar_evento', {
      tipo: 'acceso',
      modulo: 'menu',
      detalle: `Ingreso al módulo menú por ${correo} (${rol})`
    });

    const { data: productos, error: errorProductos } = await supabase.from('menu_item').select('*');
    if (errorProductos) throw new Error('Error al cargar productos');

    productosGlobal = productos;
    poblarFiltrosDesdeProductos(productosGlobal);

    const filtros = {
      destino: localStorage.getItem('filtro-destino') || '',
      area: localStorage.getItem('filtro-area') || '',
      disponible: localStorage.getItem('filtro-disponible') || ''
    };

    document.getElementById('filtro-destino').value = filtros.destino;
    document.getElementById('filtro-area').value = filtros.area;
    document.getElementById('filtro-disponible').value = filtros.disponible;

    document.getElementById('filtro-destino').addEventListener('change', cargarProductos);
    document.getElementById('filtro-area').addEventListener('change', cargarProductos);
    document.getElementById('filtro-disponible').addEventListener('change', cargarProductos);

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
        const { data: nuevos } = await supabase.from('menu_item').select('*');
        productosGlobal = nuevos;
        cargarProductos();
      }
    });

    cargarProductos();
  } catch (err) {
    logEvent('error', 'Menu', `Error al iniciar módulo: ${err.message}`);
    window.location.href = '../../index.html';
  }
});

function poblarFiltrosDesdeProductos(productos) {
  const destinosSet = new Set();
  const areasSet = new Set();

  productos.forEach(p => {
    (p.destinos || []).forEach(d => destinosSet.add(d));
    (p.areas || []).forEach(a => areasSet.add(a));
  });

  const destinoSelect = document.getElementById('filtro-destino');
  const areaSelect = document.getElementById('filtro-area');

  destinoSelect.innerHTML = '<option value="">Todos los destinos</option>';
  areaSelect.innerHTML = '<option value="">Todas las áreas</option>';

  [...destinosSet].sort().forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d.charAt(0).toUpperCase() + d.slice(1);
    destinoSelect.appendChild(opt);
  });

  [...areasSet].sort().forEach(a => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a.charAt(0).toUpperCase() + a.slice(1);
    areaSelect.appendChild(opt);
  });
}

function cargarProductos() {
  const destinoFiltro = document.getElementById('filtro-destino').value;
  const areaFiltro = document.getElementById('filtro-area').value;
  const disponibleFiltro = document.getElementById('filtro-disponible').value;

  localStorage.setItem('filtro-destino', destinoFiltro);
  localStorage.setItem('filtro-area', areaFiltro);
  localStorage.setItem('filtro-disponible', disponibleFiltro);

  const filtrados = productosGlobal.filter(p =>
    (!destinoFiltro || p.destinos.includes(destinoFiltro)) &&
    (!areaFiltro || p.areas.includes(areaFiltro)) &&
    (disponibleFiltro === '' || p.disponible === (disponibleFiltro === 'true'))
  );

  const agrupados = {};
  filtrados.forEach(p => {
    p.destinos.forEach(destino => {
      p.areas.forEach(area => {
        const clave = `${destino}__${area}`;
        if (!agrupados[clave]) agrupados[clave] = [];
        agrupados[clave].push(p);
      });
    });
  });

  const contenedor = document.getElementById('contenedor-productos');
  contenedor.innerHTML = '';

  Object.entries(agrupados).forEach(([clave, productos]) => {
    const [destino, area] = clave.split('__');
    const grupo = document.createElement('div');
    grupo.className = 'grupo-productos';
    grupo.innerHTML = `<h4>${destino.toUpperCase()} → ${area}</h4>`;

    const fila = document.createElement('div');
    fila.className = 'fila-productos';

    const encabezado = document.createElement('div');
    encabezado.className = 'producto-lineal encabezado';
    encabezado.innerHTML = `
      <strong>Nombre</strong>
      <span>Precio</span>
      <span>Categoría</span>
      <span>Acciones</span>
    `;
    fila.appendChild(encabezado);

    productos.forEach(p => {
      const filaProducto = document.createElement('div');
      filaProducto.className = 'producto-lineal';
      filaProducto.innerHTML = `
        <strong>${p.nombre}</strong>
        <span>$${p.precio.toFixed(2)}</span>
        <span>${p.categoria || ''}</span>
        <div class="acciones">
          <input type="checkbox" ${p.disponible ? 'checked' : ''} onchange="toggleDisponible('${p.id}', this.checked)" />
          <button onclick="editarProducto('${p.id}')">🖉</button>
          <button onclick="eliminarProducto('${p.id}')">🗑️</button>
        </div>
      `;
      fila.appendChild(filaProducto);
    });

    grupo.appendChild(fila);
    contenedor.appendChild(grupo);
  });
}

window.toggleDisponible = async (id, estado) => {
  const { error } = await supabase.from('menu_item').update({ disponible: estado }).eq('id', id);
  if (error) alert('❌ Error al actualizar disponibilidad');
  else {
    const { data: actualizados } = await supabase.from('menu_item').select('*');
    productosGlobal = actualizados;
    cargarProductos();
  }
};

window.eliminarProducto = async (id) => {
  if (!confirm('¿Eliminar este producto?')) return;
  const { error } = await supabase.from('menu_item').delete().eq('id', id);
  if (error) alert('❌ Error al eliminar');
  else {
    const { data: actualizados } = await supabase.from('menu_item').select('*');
    productosGlobal = actualizados;
    cargarProductos();
  }
};

window.editarProducto = async (id) => {
  alert('🖉 Editar producto: ' + id);
  // Aquí puedes abrir un modal o redirigir a un formulario de edición
};
