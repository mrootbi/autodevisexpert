import { supabase } from './supabase';
import { DevisResult } from './types';

export interface DevisLogRow {
  id: string;
  created_at: string;
  marque: string | null;
  modele: string | null;
  input_mode: string;
  prix_garagiste: number | null;
  prix_reel: number | null;
  symptomes_devis: string | null;
}

export async function logDevis(result: DevisResult): Promise<void> {
  await supabase.from('devis_history').insert({
    marque: result.vehicle.marque,
    modele: result.vehicle.modele,
    version: result.vehicle.version,
    moteur: result.vehicle.moteur,
    kilometrage: result.vehicle.kilometrage ? parseInt(result.vehicle.kilometrage, 10) : null,
    input_mode: result.mode,
    prix_garagiste: result.totalGaragiste,
    prix_reel: result.totalReel,
    symptomes_devis: result.rawInput.slice(0, 1000),
  });
}

export async function fetchDevisHistory(): Promise<DevisLogRow[]> {
  const { data, error } = await supabase
    .from('devis_history')
    .select('id, created_at, marque, modele, input_mode, prix_garagiste, prix_reel, symptomes_devis')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data as DevisLogRow[];
}

export async function clearDevisHistory(): Promise<void> {
  await supabase.from('devis_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}
