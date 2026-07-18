import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  History,
  Save,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronRight,
  FileText,
  LogOut,
  BarChart3,
  Sparkles,
  RotateCcw,
  Activity,
  Car,
  FileCheck2,
  CalendarDays,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Shield,
} from 'lucide-react';
import SEO from '../components/SEO';
import { useSettings } from '../lib/settingsContext';
import {
  AD_SLOT_KEYS,
  AD_SLOT_LABELS,
  AD_SLOT_TO_DB_KEY,
  ADSENSE_DB_KEYS,
  AdsConfig,
  AdSlotKey,
  emptyAdsConfig,
  hasActiveAdsConfig,
  isValidPublisherId,
  isValidSlotId,
  normalizeAdsConfig,
  serializeAdsConfig,
} from '../lib/adsConfig';
import { AI_SYSTEM_PROMPT_KEY, DEFAULT_AI_SYSTEM_PROMPT } from '../lib/aiPrompt';
import {
  GEMINI_SETTING_KEY,
  countGeminiKeys,
  isValidGeminiKeysInput,
  parseGeminiKeysInput,
  serializeGeminiKeys,
} from '../lib/adminGemini';
import { getAdminToken, getAdminPassword, getAdminUsername, canAccessGeminiSecrets, isLoggedIn, logout } from '../lib/adminAuth';
import { fetchAdminUsername, saveAdminCredentials, validateAdminCredentialsForm } from '../lib/adminCredentials';
import { fetchAnalyticsSummary, AnalyticsSummary } from '../lib/analytics';
import { fetchDevisHistory, clearDevisHistory, DevisLogRow } from '../lib/persistence';
import { formatEuro } from '../lib/engine';
import { hasApiKeys } from '../lib/getApiKey';
import { ensureBlogRemoteSeeded, getBlogArticles } from '../lib/blogStore';
import AdminLoginPage from './AdminLoginPage';
import BlogCMS from '../components/BlogCMS';

type Tab = 'overview' | 'stats' | 'settings' | 'history' | 'blog';

type GeminiKeyRow = { id: string; value: string };

let geminiRowKeySeq = 0;
function newKeyRow(value = ''): GeminiKeyRow {
  geminiRowKeySeq += 1;
  return { id: `gk-${Date.now()}-${geminiRowKeySeq}`, value };
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!authed) return;
    void ensureBlogRemoteSeeded();
  }, [authed]);

  if (!authed) return <AdminLoginPage onSuccess={() => setAuthed(true)} />;

  return (
    <>
      <SEO title="Admin" description="Tableau de bord administrateur AutoDevis Expert." canonicalPath="/mouadbi" noIndex />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <p className="font-display text-sm font-bold text-slate-900">AutoDevis Admin</p>
              <p className="text-xs text-slate-500">Connecté : admin</p>
            </div>
            <nav className="flex flex-col p-2">
              <SidebarItem active={tab === 'overview'} onClick={() => setTab('overview')} icon={<LayoutDashboard className="h-4 w-4" />}>
                Vue d&apos;ensemble
              </SidebarItem>
              <SidebarItem active={tab === 'stats'} onClick={() => setTab('stats')} icon={<BarChart3 className="h-4 w-4" />}>
                Statistiques
              </SidebarItem>
              <SidebarItem active={tab === 'blog'} onClick={() => setTab('blog')} icon={<FileText className="h-4 w-4" />}>
                Blog — Articles
              </SidebarItem>
              <SidebarItem active={tab === 'settings'} onClick={() => setTab('settings')} icon={<Settings className="h-4 w-4" />}>
                Intégrations
              </SidebarItem>
              <SidebarItem active={tab === 'history'} onClick={() => setTab('history')} icon={<History className="h-4 w-4" />}>
                Historique devis
              </SidebarItem>
            </nav>
            <div className="border-t border-slate-100 p-3">
              <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:text-trust-700">
                <ExternalLink className="h-3 w-3" /> Voir le site public
              </Link>
              <button
                onClick={() => {
                  logout();
                  setAuthed(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-action-redDark hover:bg-action-red/5"
              >
                <LogOut className="h-3 w-3" /> Déconnexion
              </button>
            </div>
          </div>
        </aside>

        <section>
          {tab === 'overview' && <Overview onJump={setTab} />}
          {tab === 'stats' && <AnalyticsPanel />}
          {tab === 'blog' && <BlogCMS />}
          {tab === 'settings' && <ApiSettings />}
          {tab === 'history' && <HistoryTable />}
        </section>
      </div>
    </>
  );
}

function SidebarItem({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? 'bg-trust-50 text-trust-700' : 'text-slate-600 hover:bg-slate-50 hover:text-trust-700'
      }`}
    >
      {icon}
      {children}
      {active && <ChevronRight className="ml-auto h-4 w-4" />}
    </button>
  );
}

function Overview({ onJump }: { onJump: (t: Tab) => void }) {
  const { adsConfig, loading, aiSystemPrompt, geminiKeyConfigured, refreshGeminiApiKey } = useSettings();
  const [history, setHistory] = useState<DevisLogRow[]>([]);
  const [blogCount, setBlogCount] = useState(0);

  useEffect(() => {
    fetchDevisHistory().then(setHistory);
    setBlogCount(getBlogArticles().length);
    void refreshGeminiApiKey();
  }, [refreshGeminiApiKey]);

  const hasAdsense = !loading && hasActiveAdsConfig(adsConfig);
  const configuredSlots = AD_SLOT_KEYS.filter((key) => isValidSlotId(adsConfig.slots[key])).length;
  const hasGemini = geminiKeyConfigured || hasApiKeys();
  const promptPreview = aiSystemPrompt.trim().slice(0, 48) || '—';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Vue d&apos;ensemble</h1>
        <p className="text-sm text-slate-500">État du comparateur, des intégrations et du blog.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Devis analysés" value={String(history.length)} hint="historique (aperçu)" />
        <StatCard
          label="AdSense"
          value={hasAdsense ? 'Activé' : 'Inactif'}
          hint={hasAdsense ? `${adsConfig.publisherId} · ${configuredSlots}/3 slots` : 'non configuré'}
          tone={hasAdsense ? 'green' : 'red'}
        />
        <StatCard
          label="Gemini AI"
          value={hasGemini ? 'Configuré' : 'Inactif'}
          hint={
            geminiKeyConfigured
              ? 'clé Supabase (sécurisée)'
              : hasApiKeys()
                ? 'fallback local apiConfig'
                : 'ajoutez la clé dans Intégrations'
          }
          tone={hasGemini ? 'green' : 'red'}
        />
        <StatCard label="Articles blog" value={String(blogCount)} hint="publiés" />
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-slate-900">Actions rapides</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={() => onJump('stats')} className="btn-ghost">
            Voir les statistiques
          </button>
          <button onClick={() => onJump('blog')} className="btn-ghost">
            Gérer le blog
          </button>
          <button onClick={() => onJump('settings')} className="btn-ghost">
            Intégrations &amp; prompt AI
          </button>
          <button onClick={() => onJump('history')} className="btn-ghost">
            Voir l&apos;historique
          </button>
        </div>
        <p className="mt-4 truncate text-xs text-slate-400" title={aiSystemPrompt}>
          Prompt système : {promptPreview}
          {aiSystemPrompt.trim().length > 48 ? '…' : ''}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'green' | 'red';
  icon?: React.ReactNode;
}) {
  const toneColor = tone === 'green' ? 'text-action-greenDark' : tone === 'red' ? 'text-action-redDark' : 'text-slate-900';
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        {icon && <span className="rounded-lg bg-trust-50 p-2 text-trust-700">{icon}</span>}
      </div>
      <p className={`mt-1 font-display text-2xl font-extrabold ${toneColor}`}>{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function AnalyticsPanel() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setSummary(await fetchAnalyticsSummary());
    } catch {
      setError('Impossible de charger les statistiques Supabase.');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Statistiques</h1>
          <p className="text-sm text-slate-500">Activité live des analyses de devis (Supabase).</p>
        </div>
        <button type="button" onClick={() => void load()} className="btn-ghost sm:w-auto" disabled={loading}>
          <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-action-red/20 bg-action-red/5 px-4 py-3 text-sm text-action-redDark">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total devis analysés"
          value={loading ? '…' : String(summary?.totalAnalyzed ?? 0)}
          hint="toutes les analyses réussies"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Aujourd'hui"
          value={loading ? '…' : String(summary?.todayAnalyzed ?? 0)}
          hint="depuis minuit (heure locale)"
          icon={<CalendarDays className="h-4 w-4" />}
          tone={!loading && (summary?.todayAnalyzed ?? 0) > 0 ? 'green' : 'neutral'}
        />
        <StatCard
          label="Véhicules uniques"
          value={loading ? '…' : String(summary?.uniqueVehicles ?? 0)}
          hint="engagement (marque + modèle)"
          icon={<Car className="h-4 w-4" />}
        />
        <StatCard
          label="Rapports SEO"
          value={loading ? '…' : String(summary?.publishedReports ?? 0)}
          hint="pages /devis-analyses publiées"
          icon={<FileCheck2 className="h-4 w-4" />}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Derniers devis analysés</h2>
          <p className="text-xs text-slate-500">15 analyses les plus récentes — statut = analyse réussie.</p>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Chargement…</p>
        ) : !summary || summary.recent.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Aucune analyse pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Marque / modèle</th>
                  <th className="px-4 py-3 text-right">Prix détecté</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.recent.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {r.marque ?? '—'} {r.modele ?? ''}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-800">
                      {r.prix_garagiste != null ? formatEuro(Number(r.prix_garagiste)) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-action-green/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-action-greenDark">
                        <CheckCircle2 className="h-3 w-3" />
                        Réussi
                        <span className="font-normal text-slate-400">
                          · {r.input_mode === 'devis' ? 'Devis' : 'Symptômes'}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ApiSettings() {
  const {
    adsConfig,
    setAdsConfig,
    aiSystemPrompt,
    setAiSystemPrompt,
    geminiApiKey,
    geminiKeyConfigured,
    setGeminiApiKey,
    refreshGeminiApiKey,
    loading,
    refreshSettings,
  } = useSettings();
  const [draft, setDraft] = useState<AdsConfig>(() => emptyAdsConfig());
  const [promptDraft, setPromptDraft] = useState(DEFAULT_AI_SYSTEM_PROMPT);
  /** Last AdSense config synced from settings — avoid wiping in-progress edits / toggles. */
  const lastSyncedAdsRef = useRef<string | null>(null);
  /** Last prompt value synced from settings context — used to avoid wiping in-progress edits. */
  const lastSyncedPromptRef = useRef<string | null>(null);
  const [keyRows, setKeyRows] = useState<GeminiKeyRow[]>(() => [newKeyRow('')]);
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [adsSaved, setAdsSaved] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [savingAds, setSavingAds] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [promptError, setPromptError] = useState('');
  const [keyError, setKeyError] = useState('');
  const [adminUsernameDraft, setAdminUsernameDraft] = useState(() => getAdminUsername() || 'admin');
  const [loadedAdminUsername, setLoadedAdminUsername] = useState(() => getAdminUsername() || 'admin');
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('');
  const [adminPasswordDraft, setAdminPasswordDraft] = useState('');
  const [showAdminCurrentPass, setShowAdminCurrentPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);
  const [credsError, setCredsError] = useState('');
  const [credsFieldErrors, setCredsFieldErrors] = useState<{
    current?: string;
    username?: string;
    password?: string;
  }>({});

  useEffect(() => {
    void refreshSettings();
    void refreshGeminiApiKey();
  }, [refreshSettings, refreshGeminiApiKey]);

  useEffect(() => {
    if (!canAccessGeminiSecrets()) return;
    void fetchAdminUsername()
      .then((name) => {
        setAdminUsernameDraft(name);
        setLoadedAdminUsername(name);
      })
      .catch(() => {
        const cached = getAdminUsername();
        if (cached) {
          setAdminUsernameDraft(cached);
          setLoadedAdminUsername(cached);
        }
      });
  }, []);

  // Sync ads draft from settings, but never clobber local edits while the draft is dirty.
  useEffect(() => {
    if (loading) return;
    setDraft((current) => {
      const remote = normalizeAdsConfig(adsConfig);
      const remoteKey = serializeAdsConfig(remote);
      const currentKey = serializeAdsConfig(current);
      if (lastSyncedAdsRef.current === null || currentKey === lastSyncedAdsRef.current) {
        lastSyncedAdsRef.current = remoteKey;
        return remote;
      }
      return current;
    });
  }, [loading, adsConfig]);

  // Sync prompt from settings, but never clobber local edits while the draft is dirty.
  useEffect(() => {
    if (loading) return;
    setPromptDraft((current) => {
      const remote = aiSystemPrompt;
      if (lastSyncedPromptRef.current === null || current === lastSyncedPromptRef.current) {
        lastSyncedPromptRef.current = remote;
        return remote;
      }
      return current;
    });
  }, [loading, aiSystemPrompt]);

  useEffect(() => {
    const parsed = parseGeminiKeysInput(geminiApiKey);
    const rows = parsed.length > 0 ? parsed.map((value) => newKeyRow(value)) : [newKeyRow('')];
    setKeyRows(rows);
    setVisibleKeyIds({});
  }, [geminiApiKey]);

  const setSlot = (key: AdSlotKey, value: string) => {
    setDraft((prev) => ({
      ...prev,
      slots: { ...prev.slots, [key]: value },
    }));
  };

  const adsDirty =
    serializeAdsConfig(draft) !== (lastSyncedAdsRef.current ?? serializeAdsConfig(adsConfig));
  const publisherOk = !draft.publisherId || isValidPublisherId(draft.publisherId);
  const slotsOk = AD_SLOT_KEYS.every((key) => !draft.slots[key] || isValidSlotId(draft.slots[key]));
  // Turning ads OFF must always be savable — skip publisher/slot validation when disabled.
  const fieldsValid = draft.enabled ? publisherOk && slotsOk : true;
  const canSave = fieldsValid && adsDirty;
  const promptDirty = promptDraft.trim() !== aiSystemPrompt.trim();
  const canSavePrompt = promptDraft.trim().length > 40;

  const serializedKeys = serializeGeminiKeys(keyRows.map((r) => r.value));
  const keyDirty = serializedKeys !== serializeGeminiKeys(parseGeminiKeysInput(geminiApiKey));
  const canSaveKey = isValidGeminiKeysInput(serializedKeys);
  const draftKeyCount = countGeminiKeys(serializedKeys);
  const savedKeyCount = countGeminiKeys(geminiApiKey);
  const canManageKeys = canAccessGeminiSecrets();
  const hasEdgeToken = !!getAdminToken();
  const hasPasswordSession = !!getAdminPassword();
  const invalidRowIndexes = keyRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.value.trim().length > 0 && row.value.trim().length < 20)
    .map(({ index }) => index);

  const updateKeyRow = (id: string, value: string) => {
    setKeyRows((prev) => prev.map((row) => (row.id === id ? { ...row, value } : row)));
  };

  const addKeyRow = () => {
    const row = newKeyRow('');
    setKeyRows((prev) => [...prev, row]);
  };

  const removeKeyRow = (id: string) => {
    setKeyRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== id);
    });
    setVisibleKeyIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeyIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const persistAds = async (next: AdsConfig) => {
    const clean = normalizeAdsConfig(next);

    // Only enforce publisher/slot shape when ads are being left ON.
    if (clean.enabled) {
      const publisherValid = !clean.publisherId || isValidPublisherId(clean.publisherId);
      const slotsValid = AD_SLOT_KEYS.every((key) => !clean.slots[key] || isValidSlotId(clean.slots[key]));
      if (!publisherValid || !slotsValid) {
        console.warn('[AdSense] Save blocked — invalid publisher or slot ID', clean);
        setSaveError('Corrigez le Publisher ID ou les slots invalides avant d’enregistrer.');
        return false;
      }
    }

    setSavingAds(true);
    setSaveError('');
    try {
      await setAdsConfig(clean);
      lastSyncedAdsRef.current = serializeAdsConfig(clean);
      setDraft(clean);
      setAdsSaved(true);
      setTimeout(() => setAdsSaved(false), 3000);
      return true;
    } catch (err) {
      console.error('[AdSense] Admin save failed', err);
      const detail =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message || '')
          : '';
      setSaveError(
        detail
          ? `Échec de l’enregistrement AdSense : ${detail}`
          : 'Échec de l’enregistrement dans Supabase. Vérifiez la console / RLS puis réessayez.',
      );
      return false;
    } finally {
      setSavingAds(false);
    }
  };

  const saveAds = async () => {
    await persistAds(draft);
  };

  const toggleEnabled = () => {
    if (savingAds) return;
    const next = normalizeAdsConfig({ ...draft, enabled: !draft.enabled });
    // Optimistic UI — mark dirty so "Enregistrer AdSense" unlocks immediately.
    setDraft(next);
    setSaveError('');
    // Auto-persist; turning OFF always allowed even with invalid slot fields.
    void persistAds(next).then((ok) => {
      if (!ok) {
        setDraft((prev) => normalizeAdsConfig({ ...prev, enabled: !next.enabled }));
      }
    });
  };

  const savePrompt = async () => {
    if (!canSavePrompt) return;
    setSavingPrompt(true);
    setPromptError('');
    setPromptSaved(false);
    try {
      await setAiSystemPrompt(promptDraft);
      const clean = promptDraft.trim() || DEFAULT_AI_SYSTEM_PROMPT;
      lastSyncedPromptRef.current = clean;
      setPromptDraft(clean);
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 4000);
    } catch (err) {
      const detail =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message || '')
          : '';
      setPromptError(
        detail
          ? `Échec de l’enregistrement du prompt : ${detail}`
          : 'Échec de l’enregistrement du prompt. Vérifiez la connexion Supabase / RLS puis réessayez.',
      );
    } finally {
      setSavingPrompt(false);
    }
  };

  const resetPrompt = () => {
    setPromptDraft(DEFAULT_AI_SYSTEM_PROMPT);
    setPromptSaved(false);
    setPromptError('');
  };

  const saveKey = async () => {
    if (!canSaveKey) return;
    setSavingKey(true);
    setKeyError('');
    try {
      await setGeminiApiKey(serializedKeys);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Échec de l’enregistrement de la clé.');
    } finally {
      setSavingKey(false);
    }
  };

  const saveCredentials = async () => {
    setCredsSaved(false);
    setCredsError('');
    setCredsFieldErrors({});

    if (!canManageKeys) {
      setCredsError('Session admin incomplete — reconnectez-vous avant de modifier les identifiants.');
      return;
    }

    const usernameUnchanged = adminUsernameDraft.trim() === loadedAdminUsername.trim();
    const passwordUnchanged = adminPasswordDraft.length === 0;

    const validationError = validateAdminCredentialsForm({
      currentPassword: adminCurrentPassword,
      newUsername: adminUsernameDraft,
      newPassword: adminPasswordDraft,
      usernameUnchanged,
      passwordUnchanged,
    });

    if (validationError) {
      const fieldErrors: { current?: string; username?: string; password?: string } = {};
      if (!adminCurrentPassword.trim()) {
        fieldErrors.current = 'Mot de passe actuel requis.';
      }
      if (adminUsernameDraft.trim().length < 3) {
        fieldErrors.username = 'Minimum 3 caractères.';
      }
      if (adminPasswordDraft && adminPasswordDraft.length < 8) {
        fieldErrors.password = 'Minimum 8 caractères.';
      }
      if (usernameUnchanged && passwordUnchanged) {
        fieldErrors.username = fieldErrors.username || 'Modifiez au moins un champ.';
      }
      setCredsFieldErrors(fieldErrors);
      setCredsError(validationError);
      return;
    }

    setSavingCreds(true);
    try {
      const result = await saveAdminCredentials({
        currentPassword: adminCurrentPassword,
        newUsername: adminUsernameDraft,
        newPassword: adminPasswordDraft,
      });
      setAdminUsernameDraft(result.username);
      setLoadedAdminUsername(result.username);
      setAdminPasswordDraft('');
      setAdminCurrentPassword('');
      setCredsSaved(true);
      setTimeout(() => setCredsSaved(false), 4000);
    } catch (err) {
      setCredsError(err instanceof Error ? err.message : 'Échec de la mise à jour des identifiants.');
    } finally {
      setSavingCreds(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Réglages & intégrations</h1>
        <p className="text-sm text-slate-500">
          AdSense, sécurité admin, prompt AI et clés Gemini stockés dans Supabase (
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">app_settings</code>
          ).
        </p>
      </header>

      {/* Admin credentials / Sécurité */}
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-trust-100 text-trust-700">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Sécurité — Identifiants Admin</h2>
            <p className="text-xs text-slate-500">
              Clés <code className="font-mono">admin_panel_username</code> /{' '}
              <code className="font-mono">admin_panel_password</code>
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label-field" htmlFor="admin-current-password">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                id="admin-current-password"
                className={`input-field pr-10 ${credsFieldErrors.current ? 'border-action-red/40 focus:border-action-red focus:ring-action-red/10' : ''}`}
                type={showAdminCurrentPass ? 'text' : 'password'}
                placeholder="Confirmez votre mot de passe actuel"
                value={adminCurrentPassword}
                onChange={(e) => {
                  setAdminCurrentPassword(e.target.value);
                  setCredsError('');
                  setCredsFieldErrors((prev) => ({ ...prev, current: undefined }));
                }}
                autoComplete="current-password"
                disabled={!canManageKeys || savingCreds}
              />
              <button
                type="button"
                onClick={() => setShowAdminCurrentPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showAdminCurrentPass ? 'Masquer' : 'Afficher'}
              >
                {showAdminCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {credsFieldErrors.current && (
              <p className="mt-1.5 text-xs font-medium text-action-redDark">{credsFieldErrors.current}</p>
            )}
          </div>

          <div>
            <label className="label-field" htmlFor="admin-username">
              Nom d&apos;utilisateur Admin
            </label>
            <input
              id="admin-username"
              className={`input-field ${credsFieldErrors.username ? 'border-action-red/40 focus:border-action-red focus:ring-action-red/10' : ''}`}
              value={adminUsernameDraft}
              onChange={(e) => {
                setAdminUsernameDraft(e.target.value);
                setCredsError('');
                setCredsFieldErrors((prev) => ({ ...prev, username: undefined }));
              }}
              autoComplete="username"
              disabled={!canManageKeys || savingCreds}
            />
            {credsFieldErrors.username && (
              <p className="mt-1.5 text-xs font-medium text-action-redDark">{credsFieldErrors.username}</p>
            )}
          </div>

          <div>
            <label className="label-field" htmlFor="admin-password">
              Nouveau mot de passe Admin
            </label>
            <div className="relative">
              <input
                id="admin-password"
                className={`input-field pr-10 ${credsFieldErrors.password ? 'border-action-red/40 focus:border-action-red focus:ring-action-red/10' : ''}`}
                type={showAdminPass ? 'text' : 'password'}
                placeholder="Laisser vide pour ne pas changer"
                value={adminPasswordDraft}
                onChange={(e) => {
                  setAdminPasswordDraft(e.target.value);
                  setCredsError('');
                  setCredsFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                autoComplete="new-password"
                disabled={!canManageKeys || savingCreds}
              />
              <button
                type="button"
                onClick={() => setShowAdminPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showAdminPass ? 'Masquer' : 'Afficher'}
              >
                {showAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">Minimum 8 caractères si vous changez le mot de passe.</p>
            {credsFieldErrors.password && (
              <p className="mt-1 text-xs font-medium text-action-redDark">{credsFieldErrors.password}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void saveCredentials()}
            className="btn-green sm:w-auto"
            disabled={savingCreds || !canManageKeys}
          >
            {savingCreds ? 'Enregistrement…' : credsSaved ? 'Identifiants enregistrés' : 'Enregistrer les identifiants'}
            {credsSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          </button>
        </div>
        {credsError && (
          <div className="mt-3 rounded-xl border border-action-red/20 bg-action-red/5 px-4 py-3 text-sm font-medium text-action-redDark">
            {credsError}
          </div>
        )}
        {credsSaved && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-action-green/10 px-4 py-3 text-sm font-medium text-action-greenDark">
            <CheckCircle2 className="h-4 w-4" /> Identifiants mis à jour — utilisez-les à la prochaine connexion.
          </div>
        )}
      </div>

      {/* AI Prompt + Gemini Key Control Room */}
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-trust-100 text-trust-700">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Configuration AI</h2>
            <p className="text-xs text-slate-500">
              Prompt (<code className="font-mono">{AI_SYSTEM_PROMPT_KEY}</code>) + clé (
              <code className="font-mono">{GEMINI_SETTING_KEY}</code>)
            </p>
          </div>
        </div>

        {!canManageKeys && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Session admin incomplete. Déconnectez-vous puis reconnectez-vous avec vos identifiants Supabase pour
            gérer les secrets.
          </div>
        )}
        {canManageKeys && !hasEdgeToken && hasPasswordSession && (
          <div className="mb-6 rounded-xl border border-trust-200 bg-trust-50 px-4 py-3 text-sm text-trust-800">
            Mode table directe : les clés Gemini sont lues/écrites dans{' '}
            <code className="font-mono text-xs">app_settings</code> (plus de RPC PostgREST).
          </div>
        )}
        {canManageKeys && hasEdgeToken && (
          <div className="mb-6 rounded-xl border border-action-green/20 bg-action-green/5 px-4 py-3 text-sm text-action-greenDark">
            Session admin active — clés Gemini sauvegardées dans{' '}
            <code className="font-mono text-xs">app_settings.gemini_api_key</code>.
          </div>
        )}

        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <label className="label-field mb-0">
            Clé(s) API Gemini{' '}
            <span className="font-mono text-[10px] font-normal text-slate-400">({GEMINI_SETTING_KEY})</span>
          </label>
          {draftKeyCount > 0 && (
            <span className="text-xs font-medium text-slate-500">
              {draftKeyCount} clé{draftKeyCount > 1 ? 's' : ''} active{draftKeyCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {keyRows.map((row, index) => {
            const visible = !!visibleKeyIds[row.id];
            const tooShort = row.value.trim().length > 0 && row.value.trim().length < 20;
            const canDelete = keyRows.length > 1;

            return (
              <div
                key={row.id}
                className="group animate-[geminiRowIn_220ms_ease-out] rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 transition hover:border-trust-200 hover:bg-white"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-400 shadow-sm ring-1 ring-slate-200">
                    {index + 1}
                  </span>
                  <div className="relative min-w-0 flex-1">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id={`gemini-api-key-${row.id}`}
                      className={`input-field px-10 font-mono text-sm ${tooShort ? 'border-action-red/40 focus:border-action-red focus:ring-action-red/10' : ''}`}
                      type={visible ? 'text' : 'password'}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={`Clé Gemini #${index + 1} (AIza…)`}
                      value={row.value}
                      onChange={(e) => updateKeyRow(row.id, e.target.value)}
                      disabled={loading || savingKey}
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(row.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={visible ? `Masquer la clé ${index + 1}` : `Afficher la clé ${index + 1}`}
                    >
                      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeKeyRow(row.id)}
                    disabled={!canDelete || savingKey}
                    title={canDelete ? 'Supprimer cette clé' : 'Conservez au moins une ligne'}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-transparent text-slate-400 transition hover:border-action-red/20 hover:bg-action-red/5 hover:text-action-redDark disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={`Supprimer la clé ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {tooShort && (
                  <p className="mt-1.5 pl-11 text-xs font-medium text-action-redDark">
                    Cette clé est trop courte (minimum 20 caractères).
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addKeyRow}
            disabled={savingKey || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-trust-300 bg-trust-50/50 px-4 py-2.5 text-sm font-semibold text-trust-700 transition hover:border-trust-400 hover:bg-trust-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Ajouter une clé
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Stockage Supabase en une seule chaîne (virgules). L&apos;Edge Function répartit le trafic au hasard et
          bascule automatiquement en cas de 429 / quota.
        </p>
        {invalidRowIndexes.length > 0 && (
          <p className="mt-2 text-xs font-medium text-action-redDark">
            Corrigez les clés trop courtes avant d&apos;enregistrer.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void saveKey()}
            className="btn-green sm:w-auto"
            disabled={savingKey || !canSaveKey || !keyDirty || !canManageKeys}
          >
            {keySaved ? 'Clé(s) enregistrée(s)' : 'Enregistrer les clés'}
            {keySaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => void refreshGeminiApiKey()}
            className="btn-ghost sm:w-auto"
            disabled={!canManageKeys || savingKey}
          >
            <RotateCcw className="h-4 w-4" /> Recharger
          </button>
          {geminiKeyConfigured && (
            <span className="text-xs font-medium text-action-greenDark">
              Actif dans Supabase
              {savedKeyCount > 0 ? ` · ${savedKeyCount} clé${savedKeyCount > 1 ? 's' : ''}` : ''}
            </span>
          )}
        </div>
        {keyError && <p className="mt-2 text-xs font-medium text-action-redDark">{keyError}</p>}

        <div className="my-8 border-t border-slate-100" />

        <label className="label-field" htmlFor="ai-system-prompt">
          Prompt système
        </label>
        <textarea
          id="ai-system-prompt"
          className="input-field min-h-[280px] resize-y font-mono text-xs leading-relaxed"
          value={promptDraft}
          onChange={(e) => setPromptDraft(e.target.value)}
          spellCheck={false}
          disabled={loading}
        />
        <p className="mt-2 text-xs text-slate-400">
          Le contexte véhicule / document est ajouté automatiquement. Conservez les consignes JSON pour que le
          comparateur parse correctement la réponse.
        </p>
        {!canSavePrompt && (
          <p className="mt-2 text-xs font-medium text-action-redDark">Le prompt est trop court (minimum ~40 caractères).</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void savePrompt()}
            className="btn-green sm:w-auto"
            disabled={savingPrompt || !canSavePrompt || !promptDirty}
          >
            {promptSaved ? 'Enregistré' : 'Enregistrer le Prompt'}
            {promptSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          </button>
          <button type="button" onClick={resetPrompt} className="btn-ghost sm:w-auto" disabled={savingPrompt}>
            <RotateCcw className="h-4 w-4" /> Restaurer le défaut
          </button>
        </div>
        {promptError && <p className="mt-2 text-xs font-medium text-action-redDark">{promptError}</p>}
        {promptSaved && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-action-green/10 px-4 py-3 text-sm font-medium text-action-greenDark">
            <CheckCircle2 className="h-4 w-4" /> Prompt système enregistré — actif dès la prochaine analyse.
          </div>
        )}
      </div>

      {/* AdSense */}
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-trust-100 text-trust-700">
            <Settings className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Google AdSense</h2>
            <p className="text-xs text-slate-500">
              5 clés : <code className="font-mono">{ADSENSE_DB_KEYS.enabled}</code>, publisher + 3 slots
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Activer Google AdSense</p>
            <p className="text-xs text-slate-500">
              Clé <code className="font-mono">{ADSENSE_DB_KEYS.enabled}</code> — désactivé = aucune pub.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.enabled}
            aria-label="Activer Google AdSense"
            disabled={savingAds}
            onClick={toggleEnabled}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-trust-100 disabled:cursor-wait disabled:opacity-60 ${
              draft.enabled ? 'bg-action-green' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 translate-y-0.5 rounded-full bg-white shadow transition duration-200 ${
                draft.enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <label className="label-field" htmlFor="ads-publisher">
          Publisher ID{' '}
          <span className="font-mono text-[10px] font-normal text-slate-400">({ADSENSE_DB_KEYS.publisherId})</span>
        </label>
        <input
          id="ads-publisher"
          className="input-field font-mono"
          placeholder="pub-0000000000000000"
          value={draft.publisherId}
          onChange={(e) => setDraft((prev) => ({ ...prev, publisherId: e.target.value }))}
        />
        <p className="mt-2 text-xs text-slate-400">
          Format : <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">pub-XXXXXXXXXXXXXXXX</code> ou{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">ca-pub-…</code>.
        </p>
        {draft.publisherId && !isValidPublisherId(draft.publisherId) && (
          <p className="mt-2 text-xs font-medium text-action-redDark">Publisher ID invalide.</p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {AD_SLOT_KEYS.map((key) => (
            <div key={key}>
              <label className="label-field" htmlFor={`ads-slot-${key}`}>
                Slot {AD_SLOT_LABELS[key]}{' '}
                <span className="font-mono text-[10px] font-normal text-slate-400">({AD_SLOT_TO_DB_KEY[key]})</span>
              </label>
              <input
                id={`ads-slot-${key}`}
                className="input-field font-mono"
                placeholder="1234567890"
                value={draft.slots[key]}
                onChange={(e) => setSlot(key, e.target.value)}
              />
              {draft.slots[key] && !isValidSlotId(draft.slots[key]) && (
                <p className="mt-1 text-xs font-medium text-action-redDark">Slot ID invalide (chiffres uniquement).</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void saveAds()}
            className="btn-green sm:w-auto"
            disabled={savingAds || !canSave}
            title={
              !adsDirty
                ? 'Aucune modification à enregistrer'
                : draft.enabled && !fieldsValid
                  ? 'Corrigez le Publisher ID ou les slots invalides'
                  : 'Enregistrer la configuration AdSense'
            }
          >
            {adsSaved ? 'Enregistré' : 'Enregistrer AdSense'}
            {adsSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          </button>
          {adsDirty && !draft.enabled && (
            <span className="text-xs font-medium text-slate-500">Désactivation prête à être enregistrée</span>
          )}
        </div>
        {saveError && <p className="mt-2 text-xs font-medium text-action-redDark">{saveError}</p>}
        {draft.enabled && !fieldsValid && (
          <p className="mt-2 text-xs font-medium text-action-redDark">
            Publisher ID ou slot invalide — corrigez-les, ou désactivez AdSense pour enregistrer quand même.
          </p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Upsert Supabase des 5 clés à chaque enregistrement ou bascule du commutateur. Slots vides = pas de pub. Les
          pubs sont masquées sur le tableau de bord. Désactiver AdSense ignore la validation des champs.
        </p>

        {adsSaved && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-action-green/10 px-4 py-3 text-sm font-medium text-action-greenDark">
            <CheckCircle2 className="h-4 w-4" /> Configuration AdSense enregistrée.
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryTable() {
  const [rows, setRows] = useState<DevisLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setRows(await fetchDevisHistory());
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const clear = async () => {
    await clearDevisHistory();
    await load();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Historique des devis</h1>
          <p className="text-sm text-slate-500">Dernières générations analysées par le comparateur.</p>
        </div>
        <button onClick={() => void clear()} className="btn-ghost text-action-redDark">
          <Trash2 className="h-4 w-4" /> Vider
        </button>
      </header>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Aucun devis généré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Véhicule</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Détail</th>
                  <th className="px-4 py-3 text-right">Garagiste</th>
                  <th className="px-4 py-3 text-right">Réel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {r.marque ?? '—'} {r.modele ?? ''}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          r.input_mode === 'devis' ? 'bg-trust-50 text-trust-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.input_mode === 'devis' ? 'Devis' : 'Symptômes'}
                      </span>
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-xs text-slate-500" title={r.symptomes_devis ?? ''}>
                      {r.symptomes_devis ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                      {r.prix_garagiste != null ? formatEuro(Number(r.prix_garagiste)) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-action-greenDark">
                      {r.prix_reel != null ? formatEuro(Number(r.prix_reel)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
