import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import {
  AdsConfig,
  ADSENSE_DB_KEYS,
  adsConfigFromSettingsMap,
  adsConfigToUpsertPayload,
  cacheAdsConfigLocally,
  emptyAdsConfig,
  hasActiveAdsConfig,
  normalizeAdsConfig,
  readCachedAdsConfig,
} from './adsConfig';
import {
  AI_SYSTEM_PROMPT_KEY,
  DEFAULT_AI_SYSTEM_PROMPT,
  cacheAiSystemPromptLocally,
  invalidateAiSystemPromptCache,
  normalizeAiSystemPrompt,
  readCachedAiSystemPrompt,
} from './aiPrompt';
import { fetchGeminiApiKeyAdmin, saveGeminiApiKeyAdmin } from './adminGemini';
import { getAdminToken, getAdminPassword, isLoggedIn } from './adminAuth';

/** Legacy blob key — migrated once into the 5 discrete rows. */
const LEGACY_ADS_BLOB_KEY = 'ads_config';

/** Skip Supabase round-trips when settings were fetched recently (Core Web Vitals). */
const SETTINGS_TTL_MS = 5 * 60 * 1000;
let settingsFetchedAt = 0;
let inflightSettingsRefresh: Promise<void> | null = null;

interface SettingsContextValue {
  adsConfig: AdsConfig;
  setAdsConfig: (config: AdsConfig) => Promise<void>;
  /** @deprecated Prefer adsConfig.publisherId */
  adsensePublisherId: string;
  setAdsensePublisherId: (id: string) => Promise<void>;
  hasAds: boolean;
  aiSystemPrompt: string;
  setAiSystemPrompt: (prompt: string) => Promise<void>;
  /** Full key — only populated after an authenticated admin refresh. Never loaded for public visitors. */
  geminiApiKey: string;
  geminiKeyConfigured: boolean;
  setGeminiApiKey: (key: string) => Promise<void>;
  refreshGeminiApiKey: () => Promise<void>;
  loading: boolean;
  refreshAdsConfig: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  adsConfig: emptyAdsConfig(),
  setAdsConfig: async () => {},
  adsensePublisherId: '',
  setAdsensePublisherId: async () => {},
  hasAds: false,
  aiSystemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
  setAiSystemPrompt: async () => {},
  geminiApiKey: '',
  geminiKeyConfigured: false,
  setGeminiApiKey: async () => {},
  refreshGeminiApiKey: async () => {},
  loading: true,
  refreshAdsConfig: async () => {},
  refreshSettings: async () => {},
});

function isEmptyAdsConfig(config: AdsConfig): boolean {
  return (
    !config.enabled &&
    !config.publisherId &&
    !config.slots.header &&
    !config.slots.inArticle &&
    !config.slots.sidebar
  );
}

async function fetchLegacyBlobConfig(): Promise<AdsConfig | null> {
  const { data: blobRow } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', LEGACY_ADS_BLOB_KEY)
    .maybeSingle();

  if (!blobRow?.value) return null;
  try {
    return normalizeAdsConfig(JSON.parse(blobRow.value));
  } catch {
    return null;
  }
}

async function fetchAdsConfigFromSupabase(): Promise<{ config: AdsConfig; shouldPersistDiscrete: boolean } | null> {
  const keys = Object.values(ADSENSE_DB_KEYS);
  const { data, error } = await supabase.from('app_settings').select('key, value').in('key', keys);

  if (error) {
    console.warn('Failed to load AdSense settings from Supabase', error);
    return null;
  }

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row?.key) map[row.key] = String(row.value ?? '');
  }

  const discrete = adsConfigFromSettingsMap(map);
  const foundAnyRow = (data ?? []).length > 0;

  if (!isEmptyAdsConfig(discrete)) {
    return { config: discrete, shouldPersistDiscrete: false };
  }

  const legacy = await fetchLegacyBlobConfig();
  if (legacy && !isEmptyAdsConfig(legacy)) {
    return { config: legacy, shouldPersistDiscrete: true };
  }

  if (foundAnyRow) {
    return { config: discrete, shouldPersistDiscrete: false };
  }

  return { config: emptyAdsConfig(), shouldPersistDiscrete: false };
}

async function fetchAiSystemPromptFromSupabase(): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', AI_SYSTEM_PROMPT_KEY)
    .maybeSingle();

  if (error) {
    console.warn('Failed to load AI system prompt from Supabase', error);
    return null;
  }

  if (data?.value != null) {
    return normalizeAiSystemPrompt(String(data.value));
  }

  return null;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [adsConfig, setLocalConfig] = useState<AdsConfig>(() => emptyAdsConfig());
  const [aiSystemPrompt, setLocalAiPrompt] = useState<string>(() => {
    return readCachedAiSystemPrompt() ?? DEFAULT_AI_SYSTEM_PROMPT;
  });
  const [geminiApiKey, setLocalGeminiKey] = useState('');
  const [geminiKeyConfigured, setGeminiKeyConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshGeminiApiKey = useCallback(async () => {
    if (!isLoggedIn() || (!getAdminToken() && !getAdminPassword())) {
      setLocalGeminiKey('');
      setGeminiKeyConfigured(false);
      return;
    }
    try {
      const state = await fetchGeminiApiKeyAdmin();
      setLocalGeminiKey(state.geminiApiKey);
      setGeminiKeyConfigured(state.configured);
    } catch (err) {
      console.warn('Admin Gemini key refresh failed', err);
    }
  }, []);

  const mountedRef = useRef(true);

  const refreshSettings = useCallback(async (force = false) => {
    const cachedAds = readCachedAdsConfig();
    if (cachedAds) setLocalConfig(cachedAds);

    const cachedPrompt = readCachedAiSystemPrompt();
    if (cachedPrompt) setLocalAiPrompt(cachedPrompt);

    const fresh = Date.now() - settingsFetchedAt < SETTINGS_TTL_MS;
    if (!force && fresh && cachedAds) {
      setLoading(false);
      return;
    }

    if (inflightSettingsRefresh) {
      await inflightSettingsRefresh;
      if (mountedRef.current) setLoading(false);
      return;
    }

    inflightSettingsRefresh = (async () => {
      const [remoteAds, remotePrompt] = await Promise.all([
        fetchAdsConfigFromSupabase(),
        fetchAiSystemPromptFromSupabase(),
      ]);

      if (!mountedRef.current) return;

      if (remoteAds) {
        setLocalConfig(remoteAds.config);
        cacheAdsConfigLocally(remoteAds.config);
        // Migration write only from admin sessions — never seed as anonymous visitor.
        if (remoteAds.shouldPersistDiscrete && isLoggedIn()) {
          await supabase
            .from('app_settings')
            .upsert(adsConfigToUpsertPayload(remoteAds.config), { onConflict: 'key' });
        }
      } else if (!cachedAds) {
        setLocalConfig(emptyAdsConfig());
      }

      if (remotePrompt != null) {
        setLocalAiPrompt(remotePrompt);
        cacheAiSystemPromptLocally(remotePrompt);
      } else if (!cachedPrompt) {
        // Local default only — do not write app_settings from public visitors.
        setLocalAiPrompt(DEFAULT_AI_SYSTEM_PROMPT);
        cacheAiSystemPromptLocally(DEFAULT_AI_SYSTEM_PROMPT);
      }

      settingsFetchedAt = Date.now();
    })().finally(() => {
      inflightSettingsRefresh = null;
    });

    await inflightSettingsRefresh;
    if (mountedRef.current) setLoading(false);
  }, []);

  const refreshAdsConfig = useCallback(() => refreshSettings(true), [refreshSettings]);

  useEffect(() => {
    mountedRef.current = true;
    void refreshSettings(false);
    return () => {
      mountedRef.current = false;
    };
  }, [refreshSettings]);

  const setAdsConfig = useCallback(async (config: AdsConfig) => {
    const clean = normalizeAdsConfig(config);
    const payload = adsConfigToUpsertPayload(clean);

    // Optimistic local update so the admin UI stays responsive while Supabase writes.
    setLocalConfig(clean);
    cacheAdsConfigLocally(clean);
    settingsFetchedAt = Date.now();

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .upsert(payload, { onConflict: 'key' })
        .select('key, value');

      if (error) {
        console.error('[AdSense] Supabase upsert failed', {
          error,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          payload,
        });
        throw error;
      }

      console.info(
        '[AdSense] Upserted keys:',
        (data ?? []).map((row) => row.key).join(', ') || payload.map((p) => p.key).join(', '),
      );
    } catch (err) {
      console.error('[AdSense] Unexpected save error', err, { payload });
      throw err;
    }
  }, []);

  const setAiSystemPrompt = useCallback(async (prompt: string) => {
    const clean = normalizeAiSystemPrompt(prompt);

    // Prefer UPDATE then INSERT — clearer errors than a silent upsert under RLS.
    const { data: updated, error: updateError } = await supabase
      .from('app_settings')
      .update({ value: clean, updated_at: new Date().toISOString() })
      .eq('key', AI_SYSTEM_PROMPT_KEY)
      .select('key');

    if (updateError) {
      console.warn('Failed to update AI system prompt in Supabase', updateError);
      throw updateError;
    }

    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase.from('app_settings').insert({
        key: AI_SYSTEM_PROMPT_KEY,
        value: clean,
        updated_at: new Date().toISOString(),
      });
      if (insertError) {
        console.warn('Failed to insert AI system prompt in Supabase', insertError);
        throw insertError;
      }
    }

    invalidateAiSystemPromptCache();
    setLocalAiPrompt(clean);
    cacheAiSystemPromptLocally(clean);
    settingsFetchedAt = 0;
  }, []);

  const setGeminiApiKey = useCallback(async (key: string) => {
    const state = await saveGeminiApiKeyAdmin(key);
    setLocalGeminiKey(state.geminiApiKey);
    setGeminiKeyConfigured(state.configured);
  }, []);

  const setAdsensePublisherId = useCallback(
    async (id: string) => {
      await setAdsConfig({ ...adsConfig, publisherId: id.trim() });
    },
    [adsConfig, setAdsConfig],
  );

  return (
    <SettingsContext.Provider
      value={{
        adsConfig,
        setAdsConfig,
        adsensePublisherId: adsConfig.publisherId,
        setAdsensePublisherId,
        hasAds: hasActiveAdsConfig(adsConfig),
        aiSystemPrompt,
        setAiSystemPrompt,
        geminiApiKey,
        geminiKeyConfigured,
        setGeminiApiKey,
        refreshGeminiApiKey,
        loading,
        refreshAdsConfig,
        refreshSettings: () => refreshSettings(true),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
