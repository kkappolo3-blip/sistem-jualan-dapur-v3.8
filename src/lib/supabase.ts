import { createClient } from "@supabase/supabase-js";

// External Supabase project (per project owner's MD spec)
const supabaseUrl = "https://wqgasjjifjcjvjbyetrc.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZ2FzamppZmpjanZqYnlldHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAwODcsImV4cCI6MjA5NDg4NjA4N30._LUoiQzYgsYL4g6LY71-P_yE-x58tEfYjSCDkue-TGk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
});
