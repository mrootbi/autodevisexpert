import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  MessageSquare,
  UploadCloud,
  Camera,
  X,
  Loader2,
  ShieldCheck,
  Lightbulb,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Wrench,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { VehicleInfo, InputMode, DevisResult } from '../lib/types';
import { formatEuro } from '../lib/engine';
import {
  runAnalysis,
  GeminiConfigError,
  GeminiApiError,
  isHighDemandError,
  isAllKeysBlockedError,
  GeminiDocument,
} from '../lib/gemini';
import { logDevis } from '../lib/persistence';
import { quoteReportPath, saveQuoteReport } from '../lib/quoteReports';
import VehicleIdentifier from './VehicleIdentifier';
import AdSenseUnit from './AdSenseUnit';
import ShareResultButton from './ShareResultButton';
import PriceComparisonLines from './PriceComparisonLines';
import AlertModal from './AlertModal';
import { sanitizeUserText, safeMarkdownUrl, MAX_USER_TEXT_CHARS } from '../lib/sanitize';
import { reportMarkdownHeadingComponents } from '../lib/reportMarkdown';

const emptyVehicle: VehicleInfo = { marque: '', modele: '', version: '', moteur: '', kilometrage: '' };
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3 MB — matches edge payload limits

function mimeFromFileName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Lecture du fichier impossible.'));
        return;
      }
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        reject(new Error('Encodage du fichier impossible.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

export default function DevisTool() {
  const [vehicle, setVehicle] = useState<VehicleInfo>(emptyVehicle);
  const [locked, setLocked] = useState(false);
  const [mode, setMode] = useState<InputMode | null>(null);
  const [symptomes, setSymptomes] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<GeminiDocument | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DevisResult | null>(null);
  const [publicReportPath, setPublicReportPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highDemandOpen, setHighDemandOpen] = useState(false);
  const [allKeysBlocked, setAllKeysBlocked] = useState(false);

  const handleIdentified = (v: VehicleInfo) => {
    setVehicle(v);
    setLocked(true);
  };

  const handleUnlock = () => {
    setLocked(false);
    setResult(null);
    setPublicReportPath(null);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setFileName(null);
      setUploadedDocument(null);
      setError('Fichier trop volumineux (max 3 Mo). Compressez la photo ou utilisez un PDF plus léger.');
      return;
    }
    const mimeType = file.type || mimeFromFileName(file.name);
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (mimeType && !allowed.includes(mimeType) && !mimeType.startsWith('image/')) {
      setError('Format non supporté. Utilisez PDF, JPG, PNG ou WebP.');
      return;
    }
    try {
      const base64 = await readFileAsBase64(file);
      setFileName(file.name);
      setUploadedDocument({ base64, mimeType: mimeType || 'application/octet-stream', fileName: file.name });
      setError(null);
    } catch {
      setFileName(null);
      setUploadedDocument(null);
      setError('Impossible de lire le fichier. Réessayez avec un PDF ou une image.');
    }
  };

  const reset = () => {
    setVehicle(emptyVehicle);
    setLocked(false);
    setMode(null);
    setSymptomes('');
    setFileName(null);
    setUploadedDocument(null);
    setResult(null);
    setPublicReportPath(null);
    setError(null);
    setHighDemandOpen(false);
    setAllKeysBlocked(false);
  };

  const analyze = async () => {
    setError(null);
    if (!locked || !vehicle.marque) {
      setError("Identifiez votre véhicule d'abord.");
      return;
    }
    if (mode === null) {
      setError('Choisissez "J\'ai un devis" ou "Je n\'ai pas de devis".');
      return;
    }
    if (mode === 'symptomes' && !symptomes.trim()) {
      setError('Décrivez les symptômes ou réparations.');
      return;
    }
    if (mode === 'devis' && !symptomes.trim() && !uploadedDocument) {
      setError('Déposez un devis ou décrivez les interventions.');
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setPublicReportPath(null);

    const cleanInput = sanitizeUserText(symptomes, MAX_USER_TEXT_CHARS);
    const totalMatch = cleanInput.match(/(?:total[:\s]*)?(\d{2,5})\s*(?:€|euros?|eur)/i);
    const quotedTotal = totalMatch ? parseInt(totalMatch[1], 10) : undefined;

    try {
      const res = await runAnalysis(
        vehicle,
        mode === 'devis' ? 'devis' : 'symptomes',
        cleanInput,
        quotedTotal,
        mode === 'devis' ? uploadedDocument ?? undefined : undefined,
      );
      setResult(res);
      setHighDemandOpen(false);
      setAllKeysBlocked(false);
      logDevis(res).catch((err) => console.warn('Failed to log devis analytics', err));
      saveQuoteReport(res)
        .then((report) => {
          if (report) setPublicReportPath(quoteReportPath(report));
        })
        .catch((err) => console.warn('Failed to save public quote report', err));
    } catch (err) {
      if (isAllKeysBlockedError(err)) {
        setError(null);
        setAllKeysBlocked(true);
        setHighDemandOpen(true);
      } else if (isHighDemandError(err)) {
        setError(null);
        setHighDemandOpen(true);
      } else if (err instanceof GeminiConfigError) {
        setError(err.message);
      } else if (err instanceof GeminiApiError) {
        const msg = err.message;
        setError(
          /failed to fetch/i.test(msg)
            ? 'Impossible de joindre le service d’analyse. Vérifiez votre connexion et réessayez.'
            : msg,
        );
      } else if (err instanceof TypeError && /failed to fetch/i.test(err.message)) {
        setError('Impossible de joindre le service d’analyse. Vérifiez votre connexion et réessayez.');
      } else {
        setError("Une erreur inattendue est survenue lors de l'analyse.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const canSubmit =
    locked &&
    !!mode &&
    (mode === 'devis' ? symptomes.trim().length > 0 || !!uploadedDocument : symptomes.trim().length > 0);

  return (
    <div className="space-y-8">
      <AlertModal
        open={highDemandOpen}
        title={allKeysBlocked ? 'Service temporairement indisponible' : 'Oups, il y a beaucoup de monde !'}
        message={
          allKeysBlocked
            ? 'Toutes nos clés API sont temporairement surchargées. Veuillez patienter quelques minutes avant de relancer une analyse.'
            : 'Notre intelligence artificielle est très sollicitée en ce moment. Merci de patienter quelques secondes et de cliquer sur « Réessayer ».'
        }
        onClose={() => !analyzing && setHighDemandOpen(false)}
        onRetry={allKeysBlocked ? undefined : () => void analyze()}
        retryLabel="Réessayer"
        retrying={analyzing}
      />

      <VehicleIdentifier vehicle={vehicle} onIdentified={handleIdentified} locked={locked} onUnlock={handleUnlock} />

      <div id="devis-step-2" className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              locked ? 'bg-trust-100 text-trust-700' : 'bg-slate-100 text-slate-300'
            }`}
          >
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900">2. Devis ou symptômes ?</h3>
            <p className="text-sm text-slate-500">
              {locked ? 'Deux façons de vous aider.' : "Identifiez votre véhicule d'abord."}
            </p>
          </div>
        </div>

        <div className={`grid gap-4 sm:grid-cols-2 ${!locked ? 'pointer-events-none opacity-50' : ''}`}>
          <ModeCard
            active={mode === 'devis'}
            onClick={() => setMode('devis')}
            icon={<UploadCloud className="h-5 w-5" />}
            title="J'ai un devis"
            description="Déposez le PDF/photo du devis garagiste. On décode le détail."
          />
          <ModeCard
            active={mode === 'symptomes'}
            onClick={() => setMode('symptomes')}
            icon={<MessageSquare className="h-5 w-5" />}
            title="Je n'ai pas de devis"
            description="Décrivez les symptômes (bruit, voyant, fuite…), je propose."
          />
        </div>

        {mode === 'devis' && locked && (
          <div className="mt-6 animate-fadeIn">
            <DropZone
              fileName={fileName}
              onFile={handleFile}
              onClear={() => {
                setFileName(null);
                setUploadedDocument(null);
              }}
            />
          </div>
        )}

        {mode && locked && (
          <div className="mt-6 animate-fadeIn">
            <label className="label-field">
              {mode === 'devis'
                ? 'Complément / total mentionné (optionnel si devis joint)'
                : 'Décrivez les symptômes et réparations attendues'}
            </label>
            <textarea
              className="input-field min-h-[120px] resize-y"
              placeholder={
                mode === 'devis'
                  ? 'Ex : pompe à eau + thermostat + vidange liquide refroidissement. Total : 720€'
                  : 'Ex : Fuite liquide de refroidissement sous la voiture, température qui monte en cote. Pompe à eau à changer ?'
              }
              value={symptomes}
              maxLength={MAX_USER_TEXT_CHARS}
              onChange={(e) => setSymptomes(e.target.value.slice(0, MAX_USER_TEXT_CHARS))}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Mentionnez le moteur et l&apos;intervention pour un meilleur résultat. On ne stocke que les données
              nécessaires.
            </p>
          </div>
        )}

        {/* Form banner — null when AdSense off (no reserved space) */}
        {mode && locked && (
          <AdSenseUnit slot="header" placement="formBanner" className="mt-6 rounded-xl" />
        )}

        {error && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-action-red/10 px-4 py-2.5 text-sm font-medium text-action-redDark">
            <AlertTriangle className="h-4 w-4" /> {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            className="btn-green w-full sm:w-auto"
            onClick={() => void analyze()}
            disabled={!canSubmit || analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Analyser le devis
              </>
            )}
          </button>
          {(result || mode || locked) && (
            <button className="btn-ghost w-full sm:w-auto" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Recommencer
            </button>
          )}
        </div>
      </div>

      {analyzing && <AnalysisLoadingScreen />}

      {result && (
        <div className="animate-slideUp space-y-6">
          <ResultsDashboard result={result} />
          {publicReportPath && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-trust-100 bg-trust-50 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Page publique anonymisée créée</p>
                <p className="text-xs text-slate-500">
                  Aucune donnée personnelle n&apos;est publiée (pas de plaque, nom ni garage).
                </p>
              </div>
              <Link to={publicReportPath} className="btn-ghost text-trust-700">
                <ExternalLink className="h-4 w-4" /> Voir le rapport SEO
              </Link>
            </div>
          )}
          <AdSenseUnit slot="inArticle" placement="preVerdict" className="rounded-xl" />
          <ExpertAdvice result={result} />
          <ShareResultButton sharePath={publicReportPath} />
        </div>
      )}
    </div>
  );
}

function AnalysisLoadingScreen() {
  return (
    <div
      className="card animate-fadeIn overflow-hidden p-6 sm:p-8"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-trust-100 text-trust-700">
          <Loader2 className="h-7 w-7 animate-spin" />
        </span>
        <h3 className="mt-4 font-display text-xl font-bold text-slate-900">Analyse en cours…</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          Notre IA compare votre devis aux tarifs du marché. Cela prend généralement 5 à 10 secondes.
        </p>
      </div>

      <AdSenseUnit slot="inArticle" placement="loading" className="mt-6 rounded-xl" />

      <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-trust-500" />
        Décodage des postes · Estimation pièces &amp; main-d&apos;œuvre
      </div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-trust-500 bg-trust-50 ring-2 ring-trust-200'
          : 'border-slate-200 bg-white hover:border-trust-300 hover:bg-slate-50'
      }`}
    >
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition ${
          active
            ? 'bg-trust-700 text-white'
            : 'bg-slate-100 text-slate-600 group-hover:bg-trust-100 group-hover:text-trust-700'
        }`}
      >
        {icon}
      </span>
      <div>
        <p className="font-display font-bold text-slate-900">{title}</p>
        <p className="mt-0.5 text-sm text-slate-700">{description}</p>
      </div>
      {active && (
        <span className="absolute right-3 top-3">
          <span className="flex h-3 w-3 animate-pulseRing rounded-full bg-action-green ring-4 ring-action-green/20" />
        </span>
      )}
    </button>
  );
}

function DropZone({
  fileName,
  onFile,
  onClear,
}: {
  fileName: string | null;
  onFile: (f: File) => void | Promise<void>;
  onClear: () => void;
}) {
  const [drag, setDrag] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void onFile(f);
    // Allow re-selecting the same file / retaking a photo
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void onFile(f);
        }}
        className={`flex min-h-[160px] w-full max-w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed px-4 py-6 text-center transition sm:min-h-[180px] sm:px-8 sm:py-8 ${
          drag ? 'border-trust-500 bg-trust-50' : 'border-slate-300 bg-slate-50 hover:border-trust-300'
        }`}
      >
        {fileName ? (
          <>
            <ShieldCheck className="h-8 w-8 flex-shrink-0 text-action-green" />
            <p className="max-w-full break-all px-1 font-semibold text-slate-900 sm:truncate sm:break-normal">
              {fileName}
            </p>
            <p className="text-xs text-slate-500">Cliquez pour remplacer, ou prenez une nouvelle photo.</p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onClear();
              }}
              className="mt-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-action-redDark hover:bg-action-red/5"
            >
              <X className="h-4 w-4" /> Retirer
            </button>
          </>
        ) : (
          <>
            <span className="relative inline-flex flex-shrink-0">
              <UploadCloud className={`h-8 w-8 ${drag ? 'text-trust-600' : 'text-slate-400'}`} />
              <span
                className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-slate-50 ${
                  drag ? 'bg-trust-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
                aria-hidden
              >
                <Camera className="h-3 w-3" />
              </span>
            </span>
            <p className="px-1 font-semibold leading-snug text-slate-900">
              Déposez ou photographiez votre devis
            </p>
            <p className="max-w-[20rem] px-1 text-xs leading-relaxed text-slate-500">
              PDF, JPG, PNG ou Photo Caméra — analysé par Gemini Vision
            </p>
            <p className="text-[11px] font-medium text-trust-700 sm:hidden">
              Sur mobile : choisissez « Prendre une photo » ou un fichier
            </p>
          </>
        )}
        {/* No `capture` here — mobile OS can offer Camera + Files + Gallery */}
        <input
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </label>

      {/* Explicit camera path — `capture` opens the rear camera on supported phones */}
      <label className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-trust-300 hover:bg-trust-50 hover:text-trust-800">
        <Camera className="h-4 w-4 flex-shrink-0 text-trust-700" />
        Prendre une photo du devis
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleInputChange}
        />
      </label>
    </div>
  );
}

function ResultsDashboard({ result }: { result: DevisResult }) {
  const diff = result.totalGaragiste - result.totalReel;
  const pct = result.totalGaragiste > 0 ? Math.round((diff / result.totalGaragiste) * 100) : 0;
  return (
    <section className="card overflow-hidden" aria-labelledby="results-heading">
      <header className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h3 id="results-heading" className="font-display text-xl font-bold text-slate-900">
            Résultats du comparatif
          </h3>
          <p className="mt-0.5 break-words text-sm text-slate-500">
            {result.vehicle.marque} {result.vehicle.modele} {result.vehicle.version} — {result.vehicle.moteur}
            {result.vehicle.kilometrage && ` · ${result.vehicle.kilometrage} km`}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-action-red/10 px-3 py-1.5 text-sm font-bold text-action-redDark">
          Écart : +{formatEuro(diff)} ({pct}%)
        </span>
      </header>
      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6">
        <Stat label="Devis garagiste" value={formatEuro(result.totalGaragiste)} color="red" />
        <Stat label="Prix réel marché" value={formatEuro(result.totalReel)} color="green" />
        <Stat label="Économie possible" value={formatEuro(diff)} color="trust" />
      </div>
      <AdSenseUnit slot="inArticle" placement="results" className="mx-4 mb-4 rounded-xl sm:mx-6" />
      <PriceComparisonLines
        lines={result.tableItems}
        totalGaragiste={result.totalGaragiste}
        totalReel={result.totalReel}
      />
      <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 sm:px-6">
        Prix indicatifs basés sur le marché français des pièces OEM equivalentes et main d&apos;œuvre indépendante. Ne
        remplace pas un diagnostic physique en atelier.
      </p>
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: 'red' | 'green' | 'trust' }) {
  const palette = {
    red: 'bg-action-red/10 text-action-redDark',
    green: 'bg-action-green/10 text-action-greenDark',
    trust: 'bg-trust-50 text-trust-700',
  }[color];
  return (
    <div className={`rounded-2xl p-4 ${palette}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function ExpertAdvice({ result }: { result: DevisResult }) {
  const sev = result.expertAdvice.severity;
  const ringColor = sev === 'danger' ? 'ring-action-red/20' : sev === 'warning' ? 'ring-amber-300' : 'ring-trust-200';
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-card ring-1 ${ringColor} sm:p-8`}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-trust-100">
          <Lightbulb className="h-5 w-5 text-trust-700" />
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-trust-600">Avis de l&apos;expert</p>
          <h3 className="font-display text-xl font-bold text-slate-900">{result.expertAdvice.title}</h3>
        </div>
      </div>
      <div className="prose-article mt-5">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          urlTransform={safeMarkdownUrl}
          components={reportMarkdownHeadingComponents}
        >
          {result.expertAdvice.body}
        </ReactMarkdown>
      </div>
      <RecommendationActionPlan
        recommendation={result.expertAdvice.recommendation}
        severity={sev}
        mode={result.mode}
      />
    </div>
  );
}

const ACTION_PLAN_ICONS = [AlertTriangle, Wrench, FileText] as const;

const ACTION_PLAN_ICON_STYLES = [
  'bg-amber-100 text-amber-600 ring-amber-200/60',
  'bg-trust-100 text-trust-700 ring-trust-200/60',
  'bg-slate-100 text-slate-600 ring-slate-200/60',
] as const;

function parseRecommendationSteps(text: string): string[] {
  const cleaned = text.replace(/\*\*/g, '').trim();
  if (!cleaned) return [];

  const bulletParts = cleaned
    .split(/\n+|(?:^|\s)[-•*]\s+|\d+[.)]\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12);

  if (bulletParts.length >= 2) return bulletParts.slice(0, 3);

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12);

  if (sentences.length >= 2) return sentences.slice(0, 3);

  return [cleaned];
}

function splitStepForScan(step: string): { title: string; detail?: string } {
  const colonIndex = step.indexOf(':');
  if (colonIndex > 0 && colonIndex < 90) {
    return {
      title: step.slice(0, colonIndex + 1).trim(),
      detail: step.slice(colonIndex + 1).trim() || undefined,
    };
  }

  const periodIndex = step.search(/[.!?]/);
  if (periodIndex > 0 && periodIndex < 140) {
    const title = step.slice(0, periodIndex + 1).trim();
    const detail = step.slice(periodIndex + 1).trim();
    return detail ? { title, detail } : { title: step };
  }

  return { title: step };
}

function defaultActionSteps(mode: InputMode): string[] {
  if (mode === 'devis') {
    return [
      "Priorisez les postes où l'écart garagiste / marché dépasse 30 %.",
      "Demandez le détail pièce et main-d'œuvre pour chaque ligne contestée.",
      'Comparez avec au moins un second devis indépendant avant de valider.',
    ];
  }
  return [
    "Identifiez les symptômes précis (bruit, voyant, fuite) avant l'intervention.",
    'Demandez un devis écrit détaillé avant toute réparation.',
    'Vérifiez que les pièces proposées correspondent à votre motorisation.',
  ];
}

function RecommendationActionPlan({
  recommendation,
  severity,
  mode,
}: {
  recommendation: string;
  severity: DevisResult['expertAdvice']['severity'];
  mode: InputMode;
}) {
  const parsed = parseRecommendationSteps(recommendation);
  const steps = (parsed.length > 0 ? parsed : defaultActionSteps(mode)).slice(0, 3);

  const scrollToDevisStep = () => {
    document.getElementById('devis-step-2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mt-6 rounded-2xl bg-[#f9fafb] p-4 ring-1 ring-slate-200/80 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Plan d&apos;action recommandé</p>

      <ul className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const Icon = ACTION_PLAN_ICONS[index] ?? FileText;
          const iconStyle = ACTION_PLAN_ICON_STYLES[index] ?? ACTION_PLAN_ICON_STYLES[2];
          const { title, detail } = splitStepForScan(step);
          const warnAccent = index === 0 && severity === 'danger';

          return (
            <li
              key={`${index}-${title.slice(0, 24)}`}
              className="flex gap-3 rounded-xl border border-white bg-white p-4 shadow-sm"
            >
              <span
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ring-1 ${
                  warnAccent ? 'bg-action-red/10 text-action-redDark ring-action-red/20' : iconStyle
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug text-slate-900">{title}</p>
                {detail && <p className="mt-1 text-sm leading-relaxed text-slate-600">{detail}</p>}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={scrollToDevisStep}
        className="mt-4 flex w-full items-center gap-4 rounded-xl border border-trust-200 bg-gradient-to-r from-trust-700 to-trust-800 p-4 text-left text-white shadow-md transition hover:from-trust-800 hover:to-trust-900"
      >
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
          <UploadCloud className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-bold sm:text-base">
            Déposez votre devis pour une analyse des prix
          </span>
          <span className="mt-0.5 block text-xs text-trust-100 sm:text-sm">
            Comparez ligne par ligne avec les tarifs du marché indépendant.
          </span>
        </span>
        <ArrowUpRight className="h-5 w-5 flex-shrink-0 opacity-80" />
      </button>
    </div>
  );
}
