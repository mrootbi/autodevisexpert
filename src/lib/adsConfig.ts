export type AdSlotKey = 'header' | 'inArticle' | 'sidebar';

export interface AdsConfig {
  /** Master switch — when false, no AdSense units or script are rendered. */
  enabled: boolean;
  publisherId: string;
  slots: Record<AdSlotKey, string>;
}

/** Exact keys stored as rows in Supabase `app_settings`. */
export const ADSENSE_DB_KEYS = {
  enabled: 'adsense_enabled',
  publisherId: 'adsense_publisher_id',
  slotHeader: 'adsense_slot_header',
  slotInArticle: 'adsense_slot_in_article',
  slotSidebar: 'adsense_slot_sidebar',
} as const;

export const AD_SLOT_TO_DB_KEY: Record<AdSlotKey, string> = {
  header: ADSENSE_DB_KEYS.slotHeader,
  inArticle: ADSENSE_DB_KEYS.slotInArticle,
  sidebar: ADSENSE_DB_KEYS.slotSidebar,
};

export const AD_SLOT_LABELS: Record<AdSlotKey, string> = {
  header: 'Header',
  inArticle: 'In-Article',
  sidebar: 'Sidebar',
};

export const AD_SLOT_KEYS: AdSlotKey[] = ['header', 'inArticle', 'sidebar'];

const PLACEHOLDER_PUBLISHER = 'pub-0000000000000000';
const LOCAL_CACHE_KEY = 'autodevis_ads_config_cache';

export function emptyAdsConfig(): AdsConfig {
  return {
    enabled: false,
    publisherId: '',
    slots: { header: '', inArticle: '', sidebar: '' },
  };
}

export function normalizeAdsConfig(raw: unknown): AdsConfig {
  const base = emptyAdsConfig();
  if (!raw || typeof raw !== 'object') return base;

  const obj = raw as Partial<AdsConfig> & {
    slots?: Partial<Record<AdSlotKey, string>>;
    ads_enabled?: boolean;
  };
  const publisherId = typeof obj.publisherId === 'string' ? obj.publisherId.trim() : '';

  let enabled = false;
  if (typeof obj.enabled === 'boolean') enabled = obj.enabled;
  else if (typeof obj.ads_enabled === 'boolean') enabled = obj.ads_enabled;

  return {
    enabled,
    publisherId,
    slots: {
      header: typeof obj.slots?.header === 'string' ? obj.slots.header.trim() : '',
      inArticle: typeof obj.slots?.inArticle === 'string' ? obj.slots.inArticle.trim() : '',
      sidebar: typeof obj.slots?.sidebar === 'string' ? obj.slots.sidebar.trim() : '',
    },
  };
}

/** Build AdsConfig from a map of app_settings key → value. */
export function adsConfigFromSettingsMap(map: Record<string, string>): AdsConfig {
  const enabledRaw = (map[ADSENSE_DB_KEYS.enabled] || '').trim().toLowerCase();
  const enabled = enabledRaw === 'true' || enabledRaw === '1' || enabledRaw === 'yes';

  return normalizeAdsConfig({
    enabled,
    publisherId: map[ADSENSE_DB_KEYS.publisherId] || '',
    slots: {
      header: map[ADSENSE_DB_KEYS.slotHeader] || '',
      inArticle: map[ADSENSE_DB_KEYS.slotInArticle] || '',
      sidebar: map[ADSENSE_DB_KEYS.slotSidebar] || '',
    },
  });
}

/** Rows ready for supabase upsert (includes updated_at). */
export function adsConfigToUpsertPayload(config: AdsConfig): { key: string; value: string; updated_at: string }[] {
  const clean = normalizeAdsConfig(config);
  const now = new Date().toISOString();
  return [
    { key: ADSENSE_DB_KEYS.enabled, value: clean.enabled ? 'true' : 'false', updated_at: now },
    { key: ADSENSE_DB_KEYS.publisherId, value: clean.publisherId, updated_at: now },
    { key: ADSENSE_DB_KEYS.slotHeader, value: clean.slots.header, updated_at: now },
    { key: ADSENSE_DB_KEYS.slotInArticle, value: clean.slots.inArticle, updated_at: now },
    { key: ADSENSE_DB_KEYS.slotSidebar, value: clean.slots.sidebar, updated_at: now },
  ];
}

export function cacheAdsConfigLocally(config: AdsConfig): void {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(normalizeAdsConfig(config)));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('autodevis:ads-config-updated', { detail: config }));
}

export function readCachedAdsConfig(): AdsConfig | null {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) return normalizeAdsConfig(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return null;
}

/** AdSense `data-ad-client` / script client param (`ca-pub-…`). */
export function toAdClient(publisherId: string): string {
  const id = publisherId.trim();
  if (!id) return '';
  if (id.startsWith('ca-pub-')) return id;
  if (id.startsWith('pub-')) return `ca-${id}`;
  return id;
}

export function isValidPublisherId(publisherId: string): boolean {
  const id = publisherId.trim();
  if (!id || id === PLACEHOLDER_PUBLISHER || id === `ca-${PLACEHOLDER_PUBLISHER}`) return false;
  return /^(ca-)?pub-\d{10,20}$/.test(id);
}

export function isValidSlotId(slotId: string): boolean {
  const id = slotId.trim();
  return /^\d{5,20}$/.test(id);
}

export function hasActiveAdsConfig(config: AdsConfig): boolean {
  return config.enabled && isValidPublisherId(config.publisherId);
}

export function getSlotId(config: AdsConfig, slot: AdSlotKey): string {
  return config.slots[slot]?.trim() ?? '';
}

export function canRenderAdSlot(config: AdsConfig, slot: AdSlotKey): boolean {
  return hasActiveAdsConfig(config) && isValidSlotId(getSlotId(config, slot));
}

/** DB key for a given placement (for docs / debugging). */
export function dbKeyForSlot(slot: AdSlotKey): string {
  return AD_SLOT_TO_DB_KEY[slot];
}
