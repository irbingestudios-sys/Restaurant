// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Conexión Supabase                                  │
// │ Script: supabaseClient.js                                  │
// │ Descripción: Inicializa el cliente Supabase para todo el sistema │
// │ Autor: Irbing Brizuela                                      │
// │ Fecha: 2025-11-05                                           │
// └────────────────────────────────────────────────────────────┘

// src/js/supabaseClient.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/+esm";

const SUPABASE_URL = "https://qeqltwrkubtyrmgvgaai.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // tu anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,          // ✅ guarda la sesión en localStorage
    autoRefreshToken: true,        // ✅ refresca tokens automáticamente
    detectSessionInUrl: true       // ✅ permite login vía redirect/callback
  }
});
// ─── Referencias técnicas ─────────────────────────────────────
// Proyecto Supabase: qeqltwrkubtyrmgvgaai
// Clave: anon (uso público, sin privilegios elevados)
// Usado por: login.js, admin.js, menu.js, cliente.js, auditoria.js
