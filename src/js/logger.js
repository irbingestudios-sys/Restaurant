// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Logger                                              │
// │ Script: logger.js                                           │
// │ Descripción: Registro estructurado en consola y Supabase   │
// │ Autor: Irbing Brizuela                                      │
// │ Fecha: 2025-11-05                                           │
// └────────────────────────────────────────────────────────────┘

import { supabase } from './supabaseClient.js';

export function logEvent(type, label, data) {
  const timestamp = new Date().toISOString();
  const prefix = `[${label}] ${timestamp}`;

  switch (type) {
    case 'error': console.error(`${prefix} ❌`, data); break;
    case 'warn': console.warn(`${prefix} ⚠️`, data); break;
    case 'info': console.info(`${prefix} ℹ️`, data); break;
    default: console.log(`${prefix} 🔍`, data);
  }

  logToSupabase(type, label, data, timestamp);
}

async function logToSupabase(tipo, modulo, detalle, fecha) {
  const { data: userData } = await supabase.auth.getUser();
  const usuario_id = userData?.user?.id || null;

  const { error } = await supabase.from('auditoria_menu').insert([{
    tipo,
    modulo,
    detalle: typeof detalle === 'string' ? detalle : JSON.stringify(detalle),
    fecha,
    usuario_id,
  }]);

  if (error) {
    console.warn(`[Logger] ⚠️ Error al registrar en auditoria_menu: ${error.message}`);
  }
}

// ─── Referencias técnicas ─────────────────────────────────────
// Tablas utilizadas: auditoria_menu
// Campos requeridos: tipo, modulo, detalle, fecha, usuario_id
// Usado por: login.js, admin.js, menu.js, cliente.js
