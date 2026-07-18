export interface VehicleInfo {
  marque: string;
  modele: string;
  version: string;
  moteur: string;
  kilometrage: string;
}

export type InputMode = 'symptomes' | 'devis';

export interface RepairLine {
  label: string;
  prixGaragiste: number;
  prixReel: number;
  detail: string;
}

export interface DevisResult {
  vehicle: VehicleInfo;
  mode: InputMode;
  rawInput: string;
  tableItems: RepairLine[];
  expertAdvice: {
    title: string;
    body: string;
    recommendation: string;
    severity: 'info' | 'warning' | 'danger';
  };
  totalGaragiste: number;
  totalReel: number;
}

export interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: string;
  date: string;
  author: string;
  cover: string;
  /** Optional uploaded cover (data URL). Falls back to gradient `cover`. */
  coverImage?: string;
  content: string;
  /** SEO keywords / tags (injected as meta name="keywords" on the public article page). */
  keywords?: string[];
}

/** Sanitized, anonymous quote report for programmatic SEO pages. */
export interface QuoteReportLine {
  label: string;
  prixGaragiste: number;
  prixReel: number;
  detail: string;
}

export interface QuoteReportExpertAdvice {
  title: string;
  body: string;
  recommendation: string;
  severity: 'info' | 'warning' | 'danger';
}

export interface QuoteReport {
  id: string;
  createdAt: string;
  carSlug: string;
  pathSlug: string;
  /** AI-generated public title (from expert advice / title column). */
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
}
