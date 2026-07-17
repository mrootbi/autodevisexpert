import { supabase } from './supabase';
import { DevisResult, InputMode, QuoteReport, QuoteReportExpertAdvice, QuoteReportLine } from './types';
import { rebuildAndPersistSitemap } from './sitemap';

interface QuoteReportRow {
  id: string;
  created_at: string;
  car_slug: string;
  path_slug: string;
  title?: string | null;
  marque: string;
  modele: string;
  version: string | null;
  moteur: string | null;
  kilometrage: string | null;
  input_mode: string;
  lines: QuoteReportLine[];
  expert_advice: QuoteReportExpertAdvice;
  total_garagiste: number;
  total_reel: number;
  published: boolean;
}

/** French plate, contact details, and common identity patterns — never stored. */
export function sanitizePublicText(input: string): string {
  if (!input) return '';
  return input
    .replace(/\b[A-Z]{2}[-\s]?\d{3}[-\s]?[A-Z]{2}\b/gi, '[immatriculation]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:\+33|0033|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g, '[téléphone]')
    .replace(/\b(?:SIRET|SIREN)\s*:?\s*[\d\s]{6,}/gi, '')
    .replace(/\b(?:M\.|Mme|Monsieur|Madame|Mlle)\s+[A-ZÉÈÊÀÂÄÏÛÙÇ][A-Za-zàâäéèêëïîôùûüç'’\-]{1,30}/g, '[client]')
    .replace(/\b(?:Garage|Carrosserie|Concession|SARL|SAS|EURL|Auto\s*Service)\s+[A-ZÉÈÊÀÂÄ][\w\s'’\-]{1,40}/gi, '[garage]')
    .replace(/\b\d{1,3}\s+(?:rue|avenue|av\.|bd|boulevard|chemin|impasse|place)\b[^,.\n]{0,60}/gi, '[adresse]')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function slugifyCarPart(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function buildCarSlug(marque: string, modele: string): string {
  const parts = [slugifyCarPart(marque), slugifyCarPart(modele)].filter(Boolean);
  return parts.join('-') || 'vehicule';
}

export function buildPathSlug(carSlug: string, id: string): string {
  const shortId = id.replace(/-/g, '').slice(0, 8);
  return `${carSlug}-${shortId}`;
}

export function quoteReportPath(report: Pick<QuoteReport, 'pathSlug'>): string {
  return `/devis-analyses/${report.pathSlug}`;
}

function fallbackReportTitle(marque: string, modele: string, moteur?: string): string {
  const vehicle = [marque, modele, moteur].filter(Boolean).join(' ').trim();
  return vehicle ? `Analyse devis ${vehicle}` : 'Analyse de devis automobile';
}

function resolveReportTitle(row: QuoteReportRow): string {
  const fromColumn = typeof row.title === 'string' ? row.title.trim() : '';
  const fromAdvice =
    row.expert_advice && typeof row.expert_advice.title === 'string'
      ? row.expert_advice.title.trim()
      : '';
  return fromColumn || fromAdvice || fallbackReportTitle(row.marque, row.modele, row.moteur ?? undefined);
}

function mapRow(row: QuoteReportRow): QuoteReport {
  const expertAdvice = row.expert_advice ?? {
    title: '',
    body: '',
    recommendation: '',
    severity: 'info' as const,
  };
  return {
    id: row.id,
    createdAt: row.created_at,
    carSlug: row.car_slug,
    pathSlug: row.path_slug,
    title: resolveReportTitle(row),
    marque: row.marque,
    modele: row.modele,
    version: row.version ?? '',
    moteur: row.moteur ?? '',
    kilometrage: row.kilometrage ?? '',
    inputMode: (row.input_mode === 'devis' ? 'devis' : 'symptomes') as InputMode,
    lines: Array.isArray(row.lines) ? row.lines : [],
    expertAdvice,
    totalGaragiste: Number(row.total_garagiste) || 0,
    totalReel: Number(row.total_reel) || 0,
  };
}

/** Build a PII-free payload from a live analysis result (raw devis text is discarded). */
export function sanitizeDevisResult(result: DevisResult): {
  carSlug: string;
  title: string;
  marque: string;
  modele: string;
  version: string;
  moteur: string;
  kilometrage: string;
  inputMode: InputMode;
  lines: QuoteReportLine[];
  expertAdvice: QuoteReportExpertAdvice;
  totalGaragiste: number;
  totalReel: number;
} {
  const marque = sanitizePublicText(result.vehicle.marque).slice(0, 60);
  const modele = sanitizePublicText(result.vehicle.modele).slice(0, 60);
  const moteur = sanitizePublicText(result.vehicle.moteur).slice(0, 80);
  const expertTitle = sanitizePublicText(result.expertAdvice.title).slice(0, 160);

  return {
    carSlug: buildCarSlug(marque, modele),
    title: expertTitle || fallbackReportTitle(marque, modele, moteur),
    marque,
    modele,
    version: sanitizePublicText(result.vehicle.version).slice(0, 80),
    moteur,
    kilometrage: String(result.vehicle.kilometrage || '').replace(/[^\d]/g, '').slice(0, 7),
    inputMode: result.mode,
    lines: result.tableItems.map((item) => ({
      label: sanitizePublicText(item.label).slice(0, 120) || 'Poste',
      prixGaragiste: Math.round(Number(item.prixGaragiste) || 0),
      prixReel: Math.round(Number(item.prixReel) || 0),
      detail: sanitizePublicText(item.detail).slice(0, 280),
    })),
    expertAdvice: {
      title: expertTitle,
      body: sanitizePublicText(result.expertAdvice.body).slice(0, 4000),
      recommendation: sanitizePublicText(result.expertAdvice.recommendation).slice(0, 1500),
      severity: result.expertAdvice.severity,
    },
    totalGaragiste: Math.round(result.totalGaragiste),
    totalReel: Math.round(result.totalReel),
  };
}

function isPublishable(payload: ReturnType<typeof sanitizeDevisResult>): boolean {
  return Boolean(
    payload.marque &&
      payload.modele &&
      payload.lines.length > 0 &&
      (payload.totalGaragiste > 0 || payload.totalReel > 0),
  );
}

/** Persist a sanitized report and refresh the dynamic sitemap. Returns null if not publishable. */
export async function saveQuoteReport(result: DevisResult): Promise<QuoteReport | null> {
  const payload = sanitizeDevisResult(result);
  if (!isPublishable(payload)) return null;

  const id = crypto.randomUUID();
  const pathSlug = buildPathSlug(payload.carSlug, id);

  const baseRow = {
    id,
    car_slug: payload.carSlug,
    path_slug: pathSlug,
    marque: payload.marque,
    modele: payload.modele,
    version: payload.version || null,
    moteur: payload.moteur || null,
    kilometrage: payload.kilometrage || null,
    input_mode: payload.inputMode,
    lines: payload.lines,
    expert_advice: payload.expertAdvice,
    total_garagiste: payload.totalGaragiste,
    total_reel: payload.totalReel,
    published: true,
  };

  let { data, error } = await supabase
    .from('quote_reports')
    .insert({ ...baseRow, title: payload.title })
    .select('*')
    .single();

  // Older DBs without the title column: retry without it (title still lives in expert_advice).
  if (error && /title/i.test(error.message || '')) {
    ({ data, error } = await supabase.from('quote_reports').insert(baseRow).select('*').single());
  }

  if (error || !data) {
    console.warn('Failed to save quote report', error);
    return null;
  }

  void rebuildAndPersistSitemap().catch((err) => {
    console.warn('Failed to refresh sitemap after quote report', err);
  });

  return mapRow(data as QuoteReportRow);
}

export async function fetchQuoteReportByPathSlug(pathSlug: string): Promise<QuoteReport | null> {
  const { data, error } = await supabase
    .from('quote_reports')
    .select('*')
    .eq('path_slug', pathSlug)
    .eq('published', true)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as QuoteReportRow);
}

export async function fetchRecentQuoteReports(limit = 5): Promise<QuoteReport[]> {
  const { data, error } = await supabase
    .from('quote_reports')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as QuoteReportRow[]).map(mapRow);
}

