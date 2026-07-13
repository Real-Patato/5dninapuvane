import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.sgobwgtzzrgdmeyzdbup;
const supabaseAnonKey = import.meta.env.sb_publishable_3h0Eyh35lIDeIJs1uzSRIw_U4t4k5xd;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);