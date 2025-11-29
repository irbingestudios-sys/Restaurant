/* ┌────────────────────────────────────────────────────────────┐
   │ Módulo: Usuarios y Roles                                   │
   │ Archivo: usuarios.js                                       │
   │ Descripción: Lógica de creación de usuarios y asignación   │
   │ Autor: Irbing Brizuela                                     │
   │ Fecha: 2025-11-28                                          │
   └──────────────────────────────────────────────────────────── */

// Configuración Supabase
const SUPABASE_URL = 'https://qeqltwrkubtyrmgvgaai.supabase.co'; // reemplaza
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw';                // reemplaza
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

// Inicializar
loadInventory();
