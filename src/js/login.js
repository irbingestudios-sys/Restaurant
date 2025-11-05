// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Login                                               │
// │ Script: login.js                                            │
// │ Descripción: Autenticación de usuario y redirección por rol│
// │ Autor: Irbing Brizuela                                      │
// │ Fecha: 2025-11-05                                           │
// └────────────────────────────────────────────────────────────┘

// ─── Importaciones ────────────────────────────────────────────
import { supabase } from './supabaseClient.js';
import { logEvent } from './logger.js';

// ─── Referencias al DOM ───────────────────────────────────────
const form = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

// ─── Evento: Envío del formulario ─────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  errorMessage.textContent = ''; // Limpia errores anteriores

  logEvent('info', 'Login', `Inicio de autenticación para: ${email}`);

  // ─── Autenticación con Supabase ─────────────────────────────
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logEvent('error', 'Login', `Credenciales incorrectas para ${email}: ${error.message}`);
    errorMessage.textContent = 'Credenciales incorrectas';
    return;
  }

  logEvent('info', 'Login', `Autenticación exitosa para: ${email}`);

  // ─── Obtener ID del usuario autenticado ─────────────────────
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  logEvent('info', 'Login', `Resultado de getUser(): ${JSON.stringify(userData)}`);

  if (userError) {
    logEvent('error', 'Login', `Error al obtener usuario: ${userError.message}`);
  }

  if (!userId) {
    logEvent('error', 'Login', 'No se pudo obtener el ID del usuario autenticado');
    errorMessage.textContent = 'Error interno';
    return;
  }

  logEvent('info', 'Login', `ID de usuario autenticado: ${userId}`);

  // ─── Consulta del rol usando función RPC ─────────────────────
  const { data: rol, error: rolError } = await supabase.rpc('obtener_rol');

  logEvent('info', 'Login', `Resultado de obtener_rol(): ${JSON.stringify(rol)}`);
  if (rolError) {
    logEvent('error', 'Login', `Error al consultar rol: ${rolError.message}`);
    errorMessage.textContent = 'Error al obtener rol';
    return;
  }

  if (!rol) {
    logEvent('warn', 'Login', `Usuario sin rol asignado: ${userId}`);
    errorMessage.textContent = 'Usuario sin rol asignado';
    return;
  }

  logEvent('info', 'Login', `Usuario autenticado: ${email}, Rol: ${rol}`);

  // ─── Registrar evento de login ──────────────────────────────
  await supabase.rpc('registrar_evento', {
    tipo: 'login',
    modulo: 'login',
    detalle: `Inicio de sesión para ${email} con rol ${rol}`
  });

  // ─── Redirección según el rol ───────────────────────────────
  switch (rol) {
    case 'super_admin':
    case 'admin':
    case 'gerente':
      logEvent('info', 'Login', `Redirigiendo a admin.html para rol: ${rol}`);
      window.location.href = './src/modules/menu.html';
      break;
    case 'dependiente':
    case 'cocina':
    case 'repartidor':
      logEvent('info', 'Login', `Redirigiendo a menu.html para rol: ${rol}`);
      window.location.href = './menu.html';
      break;
    case 'cliente':
      logEvent('info', 'Login', `Redirigiendo a cliente.html para rol: ${rol}`);
      window.location.href = './cliente.html';
      break;
    default:
      logEvent('warn', 'Login', `Rol no reconocido: ${rol}`);
      errorMessage.textContent = 'Rol no reconocido';
  }
});
