// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Logger                                              │
// │ Script: logger.js                                           │
// │ Descripción: Registro estructurado de eventos en consola   │
// │ Autor: Irbing Brizuela                                      │
// │ Fecha: 2025-11-05                                           │
// └────────────────────────────────────────────────────────────┘

// ─── Función principal: logEvent ──────────────────────────────
// Registra eventos en consola con tipo, etiqueta y timestamp
export function logEvent(type, label, data) {
  const timestamp = new Date().toISOString();
  const prefix = `[${label}] ${timestamp}`;

  switch (type) {
    case 'error':
      console.error(`${prefix} ❌`, data);
      break;
    case 'warn':
      console.warn(`${prefix} ⚠️`, data);
      break;
    case 'info':
      console.info(`${prefix} ℹ️`, data);
      break;
    default:
      console.log(`${prefix} 🔍`, data);
  }
}

// ─── Referencias técnicas ─────────────────────────────────────
// Usado por: login.js, admin.js, menu.js, cliente.js, auditoria.js
// Tipos de evento: error, warn, info, default
// Extensible para auditoría en Supabase si se requiere
