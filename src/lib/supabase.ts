import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface DbUser {
  id: string;
  email: string;
  username: string;
  total_xp: number;
  highest_level: number;
  games_played: number;
  created_at: string;
}

export interface GameSave {
  id: string;
  user_id: string;
  grid_state: unknown;
  money: number;
  xp: number;
  level: number;
  cycle: number;
  avg_happiness: number;
  avg_pollution: number;
  total_income_earned: number;
  missions_progress: unknown;
  unlocked_buildings: string[];
  last_saved: string;
  created_at: string;
}
