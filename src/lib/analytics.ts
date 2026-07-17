import { supabase } from './supabase';
import { DevisLogRow } from './persistence';

export interface AnalyticsSummary {
  totalAnalyzed: number;
  todayAnalyzed: number;
  uniqueVehicles: number;
  publishedReports: number;
  recent: DevisLogRow[];
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const empty: AnalyticsSummary = {
    totalAnalyzed: 0,
    todayAnalyzed: 0,
    uniqueVehicles: 0,
    publishedReports: 0,
    recent: [],
  };

  const todayIso = startOfTodayIso();

  const [totalRes, todayRes, recentRes, vehicleRes, reportsRes] = await Promise.all([
    supabase.from('devis_history').select('*', { count: 'exact', head: true }),
    supabase
      .from('devis_history')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso),
    supabase
      .from('devis_history')
      .select('id, created_at, marque, modele, input_mode, prix_garagiste, prix_reel, symptomes_devis')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase.from('devis_history').select('marque, modele'),
    supabase.from('quote_reports').select('*', { count: 'exact', head: true }).eq('published', true),
  ]);

  const unique = new Set(
    (vehicleRes.data ?? []).map((r) => `${(r.marque ?? '').trim().toLowerCase()}|${(r.modele ?? '').trim().toLowerCase()}`),
  );
  // Drop empty marque|modele pairs from the unique count.
  unique.delete('|');

  return {
    totalAnalyzed: totalRes.count ?? 0,
    todayAnalyzed: todayRes.count ?? 0,
    uniqueVehicles: unique.size,
    publishedReports: reportsRes.count ?? 0,
    recent: (recentRes.data as DevisLogRow[] | null) ?? empty.recent,
  };
}
