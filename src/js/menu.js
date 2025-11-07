// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Menú                                               │
// │ Script: menu.js                                            │
// │ Descripción: Gestión de productos y acceso por rol         │
// │ Autor: Irbing Brizuela                                     │
// │ Fecha: 2025-11-06                                          │
// └────────────────────────────────────────────────────────────┘

import { supabase } from './supabaseClient.js';
import { logEvent } from './logger.js';

let productosGlobal = [];
let productosTemporales = [];
let productoActualIndex = null;

window.supabase = supabase;

// ── Grupo: Inicialización del módulo ──────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🔄 Iniciando módulo de menú...');
    const { data: perfil, error } = await supabase.rpc('obtener_perfil_seguro');
    if (error || !perfil || perfil.length === 0) throw new Error('Perfil no disponible');

    const usuario = perfil[0];
    const nombre = usuario?.nombre || 'sin nombre';
    const rol = usuario?.rol || 'sin rol';
    const correo = usuario?.correo || 'sin correo';

    console.log(`✅ Perfil cargado: ${nombre} (${rol})`);
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
    console.log(`📦 Productos cargados: ${productosGlobal.length}`);
    poblarFiltrosDesdeProductos(productosGlobal);

    const filtros = {
      destino: localStorage.getItem('filtro-destino') || '',
      area: localStorage.getItem('filtro-area') || '',
      disponible: localStorage.getItem('filtro-disponible') || '',
      stock: localStorage.getItem('filtro-stock') || ''
    };

    document.getElementById('filtro-destino').value = filtros.destino;
    document.getElementById('filtro-area').value = filtros.area;
    document.getElementById('filtro-disponible').value = filtros.disponible;
    document.getElementById('filtro-stock').value = filtros.stock;

    ['filtro-destino', 'filtro-area', 'filtro-disponible', 'filtro-stock'].forEach(id => {
      document.getElementById(id).addEventListener('change', e => {
        localStorage.setItem(id, e.target.value);
        console.log(`🔍 Filtro actualizado: ${id} = ${e.target.value}`);
        cargarProductos();
      });
    });

    cargarProductos();
  } catch (err) {
    console.error('❌ Error al iniciar módulo:', err);
    logEvent('error', 'Menu', `Error al iniciar módulo: ${err.message}`);
    window.location.href = '../../index.html';
  }
});
// ── Grupo: Poblar filtros dinámicos ───────────────────────────
function poblarFiltrosDesdeProductos(productos) {
  console.log('🔧 Poblando filtros desde productos...');
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
  console.log('✅ Filtros poblados correctamente');
}

// ── Grupo: Mostrar resumen por destino, área y categoría ──────
function mostrarResumen(productos) {
  console.log('📊 Generando resumen de productos...');
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
  console.log('✅ Resumen generado');
}
// ── Grupo: Renderizado de productos por categoría ─────────────
function cargarProductos() {
  console.log('🔄 Renderizando productos con filtros activos...');
  const destinoFiltro = document.getElementById('filtro-destino').value;
  const areaFiltro = document.getElementById('filtro-area').value;
  const disponibleFiltro = document.getElementById('filtro-disponible').value;
  const stockFiltro = document.getElementById('filtro-stock').value;

  localStorage.setItem('filtro-destino', destinoFiltro);
  localStorage.setItem('filtro-area', areaFiltro);
  localStorage.setItem('filtro-disponible', disponibleFiltro);
  localStorage.setItem('filtro-stock', stockFiltro);

  const filtrados = productosGlobal.filter(p => {
    const cumpleDestino = !destinoFiltro || (p.destinos || []).includes(destinoFiltro);
    const cumpleArea = !areaFiltro || (p.areas || []).includes(areaFiltro);
    const cumpleDisponible =
  disponibleFiltro === ''
    || (disponibleFiltro === 'true' && p.disponible === true)
    || (disponibleFiltro === 'false' && p.disponible === false);
    console.log(`🔍 Filtro disponible=${disponibleFiltro}, Producto=${p.nombre}, disponible=${p.disponible}`);
    const cumpleStock = stockFiltro !== 'bajo' || (typeof p.stock === 'number' && p.stock >= 0 && p.stock < 10);
    return cumpleDestino && cumpleArea && cumpleDisponible && cumpleStock;
  });

  console.log(`📦 Productos filtrados: ${filtrados.length}`);
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
      <h4>
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
      <span>Stock</span>
      <span>Acciones</span>
    `;
    fila.appendChild(encabezado);

    productos.forEach(p => {
  console.log(`🧾 Producto: ${p.nombre}, Stock: ${p.stock}`);
  console.log(`🧾 Producto: ${p.nombre}, Disponible:`, p.disponible, typeof p.disponible);
  // ... renderizado
      const filaProducto = document.createElement('div');
      filaProducto.className = 'producto-lineal';
      filaProducto.innerHTML = `
        <strong>${p.nombre}</strong>
        <span>$${p.precio?.toFixed(2) ?? '—'}</span>
        <span>${p.categoria || '—'}</span>
        <span>${typeof p.stock === 'number' ? p.stock : '—'}</span>
        <div class="acciones">
          <input type="checkbox" ${p.disponible === true ? 'checked' : ''} onchange="toggleDisponibleDesdeEvento(event, '${p.id}')" />
          <button onclick="editarProducto('${p.id}')">🖋️</button>
          <button onclick="eliminarProducto('${p.id}')">🗑️</button>
        </div>
      `
        ;
      fila.appendChild(filaProducto);
    });

    grupo.appendChild(fila);
    contenedor.appendChild(grupo);
  });

  console.log('✅ Renderizado completo');
}

// ── Grupo: Función para contraer/expandir categoría ───────────
window.toggleCategoria = (btn) => {
  const fila = btn.closest('.grupo-productos').querySelector('.fila-productos');
  const oculto = fila.style.display === 'none';
  fila.style.display = oculto ? 'block' : 'none';
  btn.textContent = oculto ? '−' : '+';
};

// ── Grupo: Acciones sobre productos ───────────────────────────

window.toggleDisponibleDesdeEvento = (e, id) => {
  const estado = e.target.checked;
  toggleDisponible(id, estado);
};

window.toggleDisponible = async (id, estado) => {
  console.log(`🔁 Actualizando disponibilidad: ID=${id}, Estado=${estado}`);
  console.log('🧪 ID limpio:', typeof id, id);
  console.log('🧪 Estado recibido:', estado, '→ typeof:', typeof estado);
  
  const { error: errorUpdate } = await supabase
    .from('menu_item')
    .update({ disponible: estado === true })
    .eq('id', id);

  if (errorUpdate) {
    console.error('❌ Error al actualizar disponibilidad:', errorUpdate);
    alert('❌ Error al actualizar disponibilidad');
    return;
  }

  console.log('✅ Disponibilidad actualizada');

  const { data: verificado, error: errorVerificado } = await supabase
    .from('menu_item')
    .select('id, nombre, disponible')
    .eq('id', id);

  if (errorVerificado) {
    console.error('❌ Error al verificar disponibilidad:', errorVerificado);
  } else {
    console.log('🔍 Verificación post-update:', verificado);
  }

  const { data: actualizados, error: errorProductos } = await supabase
    .from('menu_item')
    .select('*');

  if (errorProductos) {
    console.error('❌ Error al recargar productos:', errorProductos);
    alert('❌ Error al recargar productos');
    return;
  }

  productosGlobal = actualizados;
  cargarProductos();
};

window.eliminarProducto = async (id) => {
  if (!id || typeof id !== 'string') {
    console.warn('⚠️ ID inválido para eliminación:', id);
    alert('⚠️ No se puede eliminar: ID inválido');
    return;
  }

  if (!confirm('¿Eliminar este producto?')) return;

  console.log(`🗑️ Eliminando producto ID=${id}`);

  const { data, error } = await supabase
    .from('menu_item')
    .delete()
    .eq('id', id)
    .select(); // ← devuelve las filas eliminadas

  if (error) {
    console.error('❌ Error al eliminar producto:', error);
    alert('❌ Error al eliminar');
    return;
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ No se encontró producto con ese ID:', id);
    alert('⚠️ Producto no encontrado o ya eliminado');
    return;
  }

  console.log('✅ Producto eliminado:', data[0]);

  const { data: actualizados, error: errorActualizados } = await supabase.from('menu_item').select('*');
  if (errorActualizados) {
    console.error('❌ Error al recargar productos:', errorActualizados);
    alert('❌ Error al recargar productos');
    return;
  }

  productosGlobal = actualizados;
  cargarProductos();
};

window.editarProducto = async (id) => {
  console.log(`🖋️ Editar producto ID=${id}`);
  alert('🖋️ Editar producto: ' + id);
  // Aquí puedes abrir un modal o redirigir a un formulario de edición
};
// ── Grupo: Modal de creación múltiple ─────────────────────────
const modal = document.getElementById('modal-producto');
const contenedorFormularios = document.getElementById('contenedor-formularios');
const btnAgregarProducto = document.getElementById('btnAgregarProducto');
const btnGuardarTodos = document.getElementById('btnGuardarTodos');
const btnCancelarModal = document.getElementById('btnCancelarModal');
const btnCrear = document.getElementById('btnCrear');

btnCrear.addEventListener('click', () => {
  console.log('🆕 Abriendo modal de creación múltiple');
  productosTemporales = [];
  contenedorFormularios.innerHTML = '';
  agregarFormularioProducto();
  modal.style.display = 'flex';
});

btnAgregarProducto.addEventListener('click', () => {
  console.log('➕ Agregando nuevo formulario de producto');
  agregarFormularioProducto();
});

btnCancelarModal.addEventListener('click', () => {
  console.log('❌ Cancelando creación múltiple');
  modal.style.display = 'none';
});

// ── Grupo: Agregar formulario dinámico ────────────────────────
function agregarFormularioProducto() {
  const index = productosTemporales.length;
productosTemporales.push({
  nombre: '',
  precio: 0,
  categoria: 'plato fuerte',
  descripcion: '',
  imagen_url: '',
  disponible: false,
  stock: 0,
  areas: [],
  destinos: [],
  etiquetas: [] // ← necesario
});

  const div = document.createElement('div');
  div.className = 'formulario-lineal';
 div.innerHTML = `
  <div>
    <label>Nombre</label>
    <input type="text" placeholder="Nombre" onchange="actualizarCampo(${index}, 'nombre', this.value); verificarNombre(${index})" />
    <div id="advertencia-nombre-${index}" class="advertencia"></div>
  </div>

  <div>
    <label>Precio</label>
    <input type="number" placeholder="Precio" onchange="actualizarCampo(${index}, 'precio', parseFloat(this.value)); verificarPrecio(${index})" />
    <div id="advertencia-precio-${index}" class="advertencia"></div>
  </div>

  <div>
  <div>
  <label>Categoría</label>
  <select onchange="manejarCategoria(this, ${index})">
    <option value="plato fuerte">Plato fuerte</option>
    <option value="bebida">Bebida</option>
    <option value="postre">Postre</option>
    <option value="otra">Otra...</option>
  </select>
  <input type="text" placeholder="Categoría personalizada" style="display: none;"
    onchange="actualizarCampo(${index}, 'categoria', this.value)" />
</div>
  </div>

  <div>
    <label>Stock</label>
    <input type="number" placeholder="Stock" onchange="actualizarCampo(${index}, 'stock', parseInt(this.value)); verificarStock(${index})" />
    <div id="advertencia-stock-${index}" class="advertencia"></div>
  </div>

  <div>
    <label>Áreas</label>
    <select multiple onchange="actualizarCampo(${index}, 'areas', Array.from(this.selectedOptions).map(o => o.value))">
      <option value="cocina">Cocina</option>
      <option value="bar">Bar</option>
      <option value="cantina">Cantina</option>
      <option value="diskoteca">Diskoteca</option>
      <option value="terraza">Terraza</option>
    </select>
  </div>

  <div>
    <label>Destinos</label>
    <select multiple onchange="actualizarCampo(${index}, 'destinos', Array.from(this.selectedOptions).map(o => o.value))">
      <option value="reparto">Reparto</option>
      <option value="local">Local</option>
      <option value="especial">Especial</option>
    </select>
  </div>

  <div>
    <label>Detalle</label>
    <button onclick="abrirDetalle(${index})">📝</button>
  </div>
`;
  contenedorFormularios.appendChild(div);
  contenedorFormularios.lastElementChild.scrollIntoView({ behavior: 'smooth' });
}

// ── Grupo: Validaciones por campo ─────────────────────────────
window.verificarNombre = (i) => {
  const n = productosTemporales[i].nombre;
  const advertencia = document.getElementById(`advertencia-nombre-${i}`);
  if (advertencia) advertencia.textContent = !n ? '⚠️ Nombre vacío' : '';
};

window.verificarPrecio = (i) => {
  const p = productosTemporales[i].precio;
  const advertencia = document.getElementById(`advertencia-precio-${i}`);
  if (advertencia) advertencia.textContent = p < 1 || isNaN(p) ? '⚠️ Precio inválido' : '';
};

window.verificarStock = (i) => {
  const s = productosTemporales[i].stock;
  const advertencia = document.getElementById(`advertencia-stock-${i}`);
  if (advertencia) advertencia.textContent = s <= 0 || isNaN(s) ? '⚠️ Stock inválido' : '';
};

// ── Grupo: Guardar todos los productos válidos ────────────────
btnGuardarTodos.addEventListener('click', async () => {
  console.log('💾 Guardando todos los productos...');
  let errores = 0;

  for (let i = 0; i < productosTemporales.length; i++) {
    const p = productosTemporales[i];
    const advertencias = [];

    if (!p.nombre) {
      advertencias.push('nombre vacío');
    }

    if (isNaN(p.precio) || p.precio < 1) {
      advertencias.push('precio inválido');
    }

    if (isNaN(p.stock) || p.stock <= 0) {
      advertencias.push('stock inválido');
    }

    if (advertencias.length > 0) {
      errores++;
      console.warn(`⚠️ Producto inválido [${i}]:`, p, advertencias);
      await supabase.rpc('registrar_evento', {
        tipo: 'error',
        modulo: 'menu',
        detalle: `Producto inválido: ${p.nombre || 'sin nombre'} (${advertencias.join(', ')})`
      });
      continue;
    }

    const { data, error } = await supabase.rpc('crear_menu_item', {
  nombre: p.nombre,
  descripcion: p.descripcion,
  precio: p.precio,
  disponible: p.disponible,
  categoria: p.categoria,
  etiquetas: p.etiquetas || [], // ← asegúrate de incluir esto
  imagen_url: p.imagen_url,
  areas: p.areas,
  destinos: p.destinos
});
    if (error) {
      console.error(`❌ Error al crear producto [${i}]:`, error);
      await supabase.rpc('registrar_evento', {
        tipo: 'error',
        modulo: 'menu',
        detalle: `Error al crear producto: ${p.nombre} (${error.message})`
      });
    } else {
      console.log(`✅ Producto creado: ${p.nombre}`);
      await supabase.rpc('registrar_evento', {
        tipo: 'creación',
        modulo: 'menu',
        detalle: `Producto creado: ${p.nombre} (${p.categoria}) por $${p.precio}`
      });
    }
  }

  if (errores > 0) {
    alert(`⚠️ ${errores} producto(s) no se guardaron por errores`);
    return;
  }

  modal.style.display = 'none';
  const { data: nuevos } = await supabase.from('menu_item').select('*');
  productosGlobal = nuevos;
  cargarProductos();
});
// ── Grupo: Modal de detalles (descripción e imagen) ───────────
const modalDetalle = document.getElementById('modal-detalle');
const descripcionInput = document.getElementById('descripcion-detalle');
const imagenInput = document.getElementById('imagen-detalle');
const btnAplicarDetalle = document.getElementById('btnAplicarDetalle');
const btnCerrarDetalle = document.getElementById('btnCerrarDetalle');

window.abrirDetalle = (i) => {
  console.log(`📝 Abriendo detalle para producto temporal [${i}]`);
  productoActualIndex = i;
  descripcionInput.value = productosTemporales[i].descripcion || '';
  imagenInput.value = productosTemporales[i].imagen_url || '';
  modalDetalle.style.display = 'flex';
};

btnAplicarDetalle.addEventListener('click', () => {
  if (productoActualIndex === null || productoActualIndex >= productosTemporales.length) {
    console.warn('⚠️ Índice inválido al aplicar detalle');
    return;
  }
  productosTemporales[productoActualIndex].descripcion = descripcionInput.value;
  productosTemporales[productoActualIndex].imagen_url = imagenInput.value;
  console.log(`✅ Detalle aplicado a producto [${productoActualIndex}]`);
  modalDetalle.style.display = 'none';
});

btnCerrarDetalle.addEventListener('click', () => {
  console.log('❌ Cerrando modal de detalle sin aplicar cambios');
  modalDetalle.style.display = 'none';
});

// ── Grupo: Funciones auxiliares ───────────────────────────────
window.actualizarCampo = (i, campo, valor) => {
  if (!productosTemporales[i]) return;
  productosTemporales[i][campo] = valor;
  console.log(`✏️ Campo actualizado: producto[${i}].${campo} =`, valor);
};

window.manejarCategoria = (select, i) => {
  const input = select.nextElementSibling;
  if (select.value === 'otra') {
    input.style.display = 'inline-block';
    productosTemporales[i].categoria = '';
    console.log(`🔧 Activando campo de categoría personalizada para producto[${i}]`);
  } else {
    input.style.display = 'none';
    productosTemporales[i].categoria = select.value;
    console.log(`✅ Categoría seleccionada: ${select.value} para producto[${i}]`);
  }
};

window.agregarAreaPersonalizada = (i, valor) => {
  if (!valor) return;
  const select = contenedorFormularios.children[i].querySelector('select[multiple]');
  const existe = Array.from(select.options).some(opt => opt.value === valor);
  if (!existe) {
    const opt = document.createElement('option');
    opt.value = valor;
    opt.textContent = valor.charAt(0).toUpperCase() + valor.slice(1);
    opt.selected = true;
    select.appendChild(opt);
    console.log(`➕ Área personalizada agregada: ${valor}`);
  }
  const seleccionadas = Array.from(select.selectedOptions).map(o => o.value);
  productosTemporales[i].areas = seleccionadas;
  console.log(`✅ Áreas actualizadas para producto[${i}]:`, seleccionadas);
};
