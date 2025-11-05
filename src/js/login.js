import { supabase } from './supabaseClient.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorMessage = document.getElementById('error-message');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorMessage.textContent = 'Credenciales incorrectas';
    return;
  }

  const userId = data.user.id;
  const { data: perfil } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', userId)
    .single();

  if (!perfil) {
    errorMessage.textContent = 'Usuario sin rol asignado';
    return;
  }

  switch (perfil.rol) {
    case 'super_admin':
    case 'admin':
    case 'gerente':
      window.location.href = './admin.html';
      break;
    case 'staff':
      window.location.href = './menu.html';
      break;
    default:
      errorMessage.textContent = 'Rol no reconocido';
  }
});
