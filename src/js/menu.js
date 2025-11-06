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
window.supabase = supabase;
// ── Grupo: Inicialización del módulo ──────────────────────────
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
// ── Grupo: Modal de creación de producto ──────────────────────
const modal = document.getElementById('modal-producto');
const btnCrear = document.getElementById('btnCrear');
const btnGuardar = document.getElementById('guardar-producto');
const btnCancelar = document.getElementById('cancelar-producto');

btnCrear.addEventListener('click', () => {
  modal.style.display = 'flex';
});

btnCancelar.addEventListener('click', () => {
  modal.style.display = 'none';
});

btnGuardar.addEventListener('click', async () => {
  const nombre = document.getElementById('nombre-producto').value.trim();
  const precio = parseFloat(document.getElementById('precio-producto').value);
  const categoria = document.getElementById('categoria-producto').value;

  if (!nombre || isNaN(precio)) {
    alert('Nombre y precio son obligatorios');
    return;
  }

  const nuevo = {
    nombre,
    descripcion: 'Nuevo producto creado desde modal',
    precio,
    disponible: true,
    categoria,
    etiquetas: [],
    imagen_url: 'https://via.placeholder.com/200',
    areas: ['cocina'],
    destinos: ['local']
  };

  const { data, error } = await supabase.rpc('crear_menu_item', nuevo);
  if (error) {
    logEvent('error', 'Menu', `Error al crear producto: ${error.message}`);
    alert('Error al crear producto');
  } else {
    logEvent('info', 'Menu', `Producto creado con ID: ${data}`);
    await supabase.rpc('registrar_evento', {
      tipo: 'creación',
      modulo: 'menu',
      detalle: `Producto creado: ${nombre} (${categoria}) por $${precio}`
    });
    modal.style.display = 'none';
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

// ── Grupo: Poblar filtros dinámicos ───────────────────────────
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

// ── Grupo: Mostrar resumen por destino, área y categoría ──────
function mostrarResumen(productos) {
  const resumen = {
    destinos: {},
    areas: {},
    categorias: {}
  };

  productos.forEach(p => {
    (p.destinos || []).forEach(d => resumen.destinos[d] = (resumen.destinos[d] || 0) + 1);
    (p.areas || []).forEach(a => resumen.areas[a] = (resumen.areas[a] || 0) + 1);
    const c = p.categoria || 'Sin categoría';
    resumen.categorias[c] = (resumen.categorias[c] || 0) + 1;
  });

  const contenedor = document.getElementById('resumen');
  contenedor.innerHTML = '';

  const crearBox = (titulo, datos) => {
    const box = document.createElement('div');
    box.className = 'resumen-box';
    box.innerHTML = `<h5>${titulo}</h5><ul>` +
      Object.entries(datos).map(([k, v]) => `<li>${k}: ${v}</li>`).join('') +
      `</ul>`;
    return box;
  };

  contenedor.appendChild(crearBox('Por destino', resumen.destinos));
  contenedor.appendChild(crearBox('Por área', resumen.areas));
  contenedor.appendChild(crearBox('Por categoría', resumen.categorias));
}

// ── Grupo: Renderizado de productos por categoría ─────────────
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

  mostrarResumen(filtrados);

  const agrupados = {};
  filtrados.forEach(p => {
    const categoria = p.categoria || 'Sin categoría';
    if (!agrupados[categoria]) agrupados[categoria] = [];
    agrupados[categoria].push(p);
  });

  const contenedor = document.getElementById('contenedor-productos');
  contenedor.innerHTML = '';

  Object.entries(agrupados).forEach(([categoria, productos]) => {
    const grupo = document.createElement('div');
    grupo.className = 'grupo-productos';
    grupo.innerHTML = `
      <h4 style="display: flex; justify-content: space-between; align-items: center;">
        <span>${categoria.toUpperCase()}</span>
        <button class="btn-toggle-categoria" onclick="toggleCategoria(this)">−</button>
      </h4>
    `;

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

// ── Grupo: Función para contraer/expandir categoría ───────────
window.toggleCategoria = (btn) => {
  const fila = btn.closest('.grupo-productos').querySelector('.fila-productos');
  const oculto = fila.style.display === 'none';
  fila.style.display = oculto ? 'block' : 'none';
  btn.textContent = oculto ? '−' : '+';
};

// ── Grupo: Acciones sobre productos ───────────────────────────
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
