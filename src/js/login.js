import { supabase } from './supabaseClient.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorMessage = document.getElementById('error-message');
  errorMessage.textContent = ''; // Limpia errores anteriores

  // Autenticación con Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorMessage.textContent = 'Credenciales incorrectas';
    return;
  }

  const userId = data.user.id;

  // Obtener el rol desde la tabla usuario
  const { data: perfil, error: perfilError } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', userId)
    .single();

  if (perfilError || !perfil) {
    errorMessage.textContent = 'Usuario sin rol asignado';
    return;
  }

  console.log('Rol detectado:', perfil.rol);

  // Redirección según el rol
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
      errorMessage.textContent = 'Rol no reconocido';
  }
});
