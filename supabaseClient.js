import { createClient } from '@supabase/supabase-js';

// ════════════════════════════════════════════════════════════
// CONEXIÓN AL SISTEMA MINISTERIAL FGE GUERRERO
// ════════════════════════════════════════════════════════════

const SUPABASE_URL = "https://jedmzwmeeefwvipumbay.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Nn1a5X8FD6g2k7eRL0NRCw_5M-x3VCk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
