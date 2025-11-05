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

  // ─── Autenticación con Supabase ─────────────────────────────
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logEvent('error', 'Login', `Credenciales incorrectas para ${email}: ${error.message}`);
    errorMessage.textContent = 'Credenciales incorrectas';
    return;
  }

  // ─── Obtener ID del usuario autenticado ─────────────────────
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    logEvent('error', 'Login', 'No se pudo obtener el ID del usuario autenticado');
    errorMessage.textContent = 'Error interno';
    return;
  }

  // ─── Consulta del rol en la tabla usuario ───────────────────
  const { data: perfil, error: perfilError } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', userId)
    .single();

  if (perfilError || !perfil) {
    logEvent('warn', 'Login', `Usuario sin rol asignado: ${userId}`);
    errorMessage.textContent = 'Usuario sin rol asignado';
    return;
  }

  logEvent('info', 'Login', `Usuario autenticado: ${email}, Rol: ${perfil.rol}`);

  // ─── Redirección según el rol ───────────────────────────────
  switch (perfil.rol) {
    case 'super_admin':
    case 'admin':
    case 'gerente':
      window.location.href = './admin.html';
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
      logEvent('warn', 'Login', `Rol no reconocido: ${perfil.rol}`);
      errorMessage.textContent = 'Rol no reconocido';
  }
});

// ─── Referencias técnicas ─────────────────────────────────────
// Tablas utilizadas: usuario
// Funciones RPC: ninguna
// Estilos aplicados: styles-base.css
// Dependencias: supabaseClient.js, logger.js
