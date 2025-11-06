// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Login                                               │
// │ Script: login.js                                            │
// │ Descripción: Autenticación de usuario y redirección por rol│
// │ Autor: Irbing Brizuela                                      │
// │ Fecha: 2025-11-06                                           │
// └────────────────────────────────────────────────────────────┘

import { supabase } from './supabaseClient.js';
import { logEvent } from './logger.js';

const form = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  errorMessage.textContent = '';

  logEvent('info', 'Login', `Inicio de autenticación para: ${email}`);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logEvent('error', 'Login', `Credenciales incorrectas para ${email}: ${error.message}`);
    errorMessage.textContent = 'Credenciales incorrectas';
    return;
  }

  logEvent('info', 'Login', `Autenticación exitosa para: ${email}`);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (userError || !userId) {
    logEvent('error', 'Login', `Error al obtener usuario: ${userError?.message || 'ID no disponible'}`);
    errorMessage.textContent = 'Error interno';
    return;
  }

  const { data: perfil, error: perfilError } = await supabase.rpc('obtener_perfil_seguro');
  if (perfilError || !perfil || perfil.length === 0) {
    logEvent('error', 'Login', `Error al obtener perfil: ${perfilError?.message || 'Perfil vacío'}`);
    errorMessage.textContent = 'Error al obtener perfil';
    return;
  }

  const usuario = perfil[0];
  const nombre = usuario?.nombre || 'sin nombre';
  const rol = usuario?.rol || 'sin rol';

  logEvent('info', 'Login', `Usuario autenticado: ${email}, Rol: ${rol}`);

  await supabase.rpc('registrar_evento', {
    tipo: 'login',
    modulo: 'login',
    detalle: `Inicio de sesión para ${email} con rol ${rol}`
  });

  switch (rol) {
    case 'super_admin':
    case 'admin':
    case 'gerente':
      window.location.href = './src/modules/menu.html';
      break;
    case 'dependiente':
    case 'cocina':
    case 'repartidor':
      window.location.href = './menu.html';
      break;
    case 'cliente':
      window.location.href = './cliente.html';
      break;
    default:
      logEvent('warn', 'Login', `Rol no reconocido: ${rol}`);
      errorMessage.textContent = 'Rol no reconocido';
  }
});
