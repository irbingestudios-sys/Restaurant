/* ┌────────────────────────────────────────────────────────────┐
   │ Módulo: Usuarios y Roles                                   │
   │ Archivo: usuarios.js                                       │
   │ Descripción: CRUD de usuarios, asignación de permisos,     │
   │ inventario y logs                                          │
   │ Autor: Irbing Brizuela                                     │
   │ Fecha: 2025-11-28                                          │
   └──────────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  // Configuración Supabase
  const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co'; // reemplaza
  const SUPABASE_ANON_KEY = 'TU-ANON-KEY';                // reemplaza
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Logs
  const logEl = document.getElementById('log');
  function log(msg, level = 'info') {
    const time = new Date().toLocaleTimeString();
    const cls = level === 'error' ? 'err' : level === 'warn' ? 'warn' : 'ok';
    logEl.insertAdjacentHTML('afterbegin', `<div class="${cls}">[${time}] ${msg}</div>`);
  }
  document.getElementById('btnClearLogs').addEventListener('click', () => logEl.innerHTML = '');

  // Crear usuario
  document.getElementById('btnCrearUsuario').addEventListener('click', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const rol = document.getElementById('rol').value;

    if (!nombre || !correo || !rol) {
      log('Todos los campos son obligatorios', 'warn');
      return;
    }

    const { data, error } = await sb.rpc('crear_usuario', { p_nombre: nombre, p_correo: correo, p_rol: rol });
    if (error) {
      log(`Error al crear usuario: ${error.message}`, 'error');
    } else {
      log(`Usuario creado con id=${data}`, 'ok');
      document.getElementById('mensaje-crear').style.display = 'block';
      loadUsuarios();
    }
  });

  // Asignar permiso
  document.getElementById('btnAsignarPermiso').addEventListener('click', async (e) => {
    e.preventDefault();
    const rol = document.getElementById('rol-permiso').value;
    const permiso = document.getElementById('permiso').value;

    const { error } = await sb.rpc('asignar_permiso_a_rol', { p_rol: rol, p_permiso: permiso });
    if (error) {
      log(`Error al asignar permiso: ${error.message}`, 'error');
    } else {
      log(`Permiso '${permiso}' asignado al rol '${rol}'`, 'ok');
      document.getElementById('mensaje-permiso').style.display = 'block';
      loadInventory();
    }
  });

  // Probar permiso
  document.getElementById('btnProbarPermiso').addEventListener('click', async (e) => {
    e.preventDefault();
    const uid = document.getElementById('tpUsuarioId').value.trim();
    const permiso = document.getElementById('tpPermiso').value.trim();

    if (!uid || !permiso) {
      log('UUID y permiso requeridos', 'warn');
      return;
    }

    const { data, error } = await sb.rpc('tiene_permiso', { p_usuario_id: uid, p_permiso: permiso });
    if (error) {
      log(`Error al verificar permiso: ${error.message}`, 'error');
    } else {
      const ok = !!data;
      document.getElementById('tpResultado').textContent = ok ? 'Tiene permiso ✅' : 'No tiene permiso ❌';
      log(`tiene_permiso(${uid}, ${permiso}) => ${ok}`, ok ? 'ok' : 'warn');
    }
  });

  // Inventario
  async function loadInventory() {
    const { data: permisos } = await sb.from('permiso').select('*');
    const { data: relaciones } = await sb.from('rol_permiso').select('rol, permiso(nombre)');

    document.getElementById('lista-permisos').innerHTML =
      (permisos || []).map(p => `<li>${p.nombre}</li>`).join('');

    document.getElementById('lista-roles').innerHTML =
      (relaciones || []).map(r => `<li>${r.rol} → ${r.permiso?.nombre}</li>`).join('');

    log('Inventario actualizado', 'ok');
  }
  document.getElementById('btnReloadInventory').addEventListener('click', loadInventory);

  // Listar usuarios
  async function loadUsuarios() {
    const { data, error } = await sb.from('usuario').select('*').order('creado_en', { ascending: false });
    if (error) {
      log(`Error al cargar usuarios: ${error.message}`, 'error');
      return;
    }

    const tbody = document.getElementById('usuarios-body');
    tbody.innerHTML = '';
    (data || []).forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.nombre}</td>
        <td>${u.correo || '-'}</td>
        <td>${u.rol}</td>
        <td>${u.activo ? '✅' : '❌'}</td>
        <td>
          <button class="btnEditar" data-id="${u.id}">✏️ Editar</button>
          <button class="btnEliminar" data-id="${u.id}">🗑️ Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Eventos editar
    document.querySelectorAll('.btnEditar').forEach(btn => {
      btn.addEventListener('click', () => abrirModalEditar(btn.dataset.id));
    });

    // Eventos eliminar
    document.querySelectorAll('.btnEliminar').forEach(btn => {
      btn.addEventListener('click', () => confirmarEliminar(btn.dataset.id));
    });
  }

  // Modal editar
  async function abrirModalEditar(id) {
    const { data } = await sb.from('usuario').select('*').eq('id', id).single();
    if (!data) return;

    document.getElementById('edit-nombre').value = data.nombre;
    document.getElementById('edit-correo').value = data.correo || '';
    document.getElementById('edit-rol').value = data.rol;
    document.getElementById('edit-activo').value = data.activo ? 'true' : 'false';

    document.getElementById('btnGuardarCambios').dataset.id = id;
    document.getElementById('modal-editar').style.display = 'flex';
  }

  document.getElementById('btnGuardarCambios').addEventListener('click', async (e) => {
    e.preventDefault();
    const id = e.target.dataset.id;
    const nombre = document.getElementById('edit-nombre').value.trim();
    const correo = document.getElementById('edit-correo').value.trim();
    const rol = document.getElementById('edit-rol').value;
    const activo = document.getElementById('edit-activo').value === 'true';

    const { error } = await sb.from('usuario').update({
      nombre, correo, rol, activo
    }).eq('id', id);

    if (error) {
      log(`Error al actualizar usuario: ${error.message}`, 'error');
    } else {
      log(`Usuario actualizado correctamente ✅`, 'ok');
      document.getElementById('modal-editar').style.display = 'none';
      loadUsuarios();
    }
  });

  document.getElementById('btnCerrarModal').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('modal-editar').style.display = 'none';
  });

  // Modal eliminar
  let usuarioAEliminar = null;
  function confirmarEliminar(id) {
    usuarioAEliminar = id;
    document.getElementById('modal-confirmar').style.display = 'flex';
  }

  document.getElementById('btnConfirmarEliminar').addEventListener('click', async () => {
    if (!usuarioAEliminar) return;
    const { error } = await sb.from('usuario').delete().eq('id', usuarioAEliminar);
    if (error) {
      log(`Error al eliminar usuario: ${error.message}`, 'error');
    } else {
      log(`Usuario eliminado correctamente ✅`, 'ok');
      loadUsuarios();
    }
    cerrarModalEliminar();
  });

  document.getElementById('btnCancelarEliminar').addEventListener('click', cerrarModalEliminar);

  function cerrarModalEliminar() {
    usuarioAEliminar = null;
    document.getElementById('modal-confirmar').style.display = 'none';
  }

  // Inicializar
  loadInventory();
  loadUsuarios();
});
