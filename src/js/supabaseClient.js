// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Conexión Supabase                                  │
// │ Script: supabaseClient.js                                  │
// │ Descripción: Inicializa el cliente Supabase para todo el sistema │
// │ Autor: Irbing Brizuela                                      │
// │ Fecha: 2025-11-05                                           │
// └────────────────────────────────────────────────────────────┘

// ─── Importación del cliente Supabase ─────────────────────────
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ─── Inicialización del cliente ───────────────────────────────
export const supabase = createClient(
  'https://qeqltwrkubtyrmgvgaai.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw' // Clave pública anónima
);

// ─── Referencias técnicas ─────────────────────────────────────
// Proyecto Supabase: qeqltwrkubtyrmgvgaai
// Clave: anon (uso público, sin privilegios elevados)
// Usado por: login.js, admin.js, menu.js, cliente.js, auditoria.js
