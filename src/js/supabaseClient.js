import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://qeqltwrkubtyrmgvgaai.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // clave pública anon
);
