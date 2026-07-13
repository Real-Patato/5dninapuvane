import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://sgobwgtzzrgdmeyzdbup.supabase.co/";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_3h0Eyh35lIDeIJs1uzSRIw_U4t4k5xd";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);