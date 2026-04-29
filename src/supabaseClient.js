import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tbdyvkrfprmviwiphxxt.supabase.co";
const supabaseAnonKey = "sb_publishable_Usz3WJfLN7bPlNfqH0DFCA_BZe2Cx50";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);