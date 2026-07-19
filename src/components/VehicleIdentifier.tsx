import { useMemo, useState } from 'react';
import { Car, Lock, RotateCcw, Loader2, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { VehicleInfo } from '../lib/types';
import carsData from '../data/euroCarsDatabase.json';

interface VehicleIdentifierProps {
  vehicle: VehicleInfo;
  onIdentified: (v: VehicleInfo) => void;
  locked: boolean;
  onUnlock: () => void;
}

type Tab = 'vin' | 'manuel';
type FetchState = 'idle' | 'loading' | 'success' | 'error';

export default function VehicleIdentifier({ vehicle, onIdentified, locked, onUnlock }: VehicleIdentifierProps) {
  const [tab, setTab] = useState<Tab>('manuel');

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-trust-100 text-trust-700">
            <Car className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900">1. Identification du véhicule</h3>
            <p className="text-sm text-slate-500">Recherche manuelle ou VIN.</p>
          </div>
        </div>
        {locked && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-action-green/10 px-3 py-1.5 text-xs font-semibold text-action-greenDark">
              <CheckCircle2 className="h-3.5 w-3.5" /> Véhicule identifié
            </span>
            <button
              type="button"
              onClick={onUnlock}
              className="btn-ghost min-h-[44px] px-3 py-2 text-sm"
              title="Changer de véhicule"
            >
              <RotateCcw className="h-4 w-4" /> Changer
            </button>
          </div>
        )}
      </div>

      {locked ? (
        <IdentifiedCard vehicle={vehicle} />
      ) : (
        <>
          <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Mode d'identification">
            <TabButton active={tab === 'manuel'} onClick={() => setTab('manuel')}>Recherche manuelle</TabButton>
            <TabButton active={tab === 'vin'} onClick={() => setTab('vin')}>VIN</TabButton>
          </div>

          {tab === 'manuel' && <ManualTab onIdentified={onIdentified} initialVehicle={vehicle} />}
          {tab === 'vin' && <VinTab onIdentified={onIdentified} />}
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-[48px] flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${
        active ? 'bg-white text-trust-700 shadow-sm' : 'text-slate-600 hover:text-trust-700'
      }`}
    >
      {children}
    </button>
  );
}

function IdentifiedCard({ vehicle }: { vehicle: VehicleInfo }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-action-green/30 bg-action-green/5 p-5 sm:flex-row sm:items-center">
      <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-action-green/15 text-action-green">
        <Lock className="h-6 w-6" />
      </span>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-action-greenDark">Véhicule verrouillé</p>
        <p className="mt-1 font-display text-lg font-bold text-slate-900">
          {vehicle.marque} {vehicle.modele}
          {vehicle.version && <span className="text-slate-500"> · {vehicle.version}</span>}
        </p>
        <p className="text-sm text-slate-600">
          {vehicle.moteur}
          {vehicle.kilometrage && ` · ${vehicle.kilometrage} km`}
        </p>
      </div>
    </div>
  );
}

// ─── TAB 1: VIN (NHTSA vPIC API) ────────────────────────────────────────────

interface NhtsaResult {
  make: string;
  model: string;
  year: string;
}

async function decodeVin(vin: string): Promise<NhtsaResult> {
  const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
  if (!res.ok) throw new Error('VIN API error');
  const data = await res.json();
  const get = (name: string) => data.Results?.find((r: { Variable: string; Value: string }) => r.Variable === name)?.Value;
  const make = (get('Make') || '').trim();
  const model = (get('Model') || '').trim();
  const year = (get('Model Year') || '').trim();
  if (!make) throw new Error('VIN non reconnu');
  return { make, model, year };
}

function VinTab({ onIdentified }: { onIdentified: (v: VehicleInfo) => void }) {
  const [vin, setVin] = useState('');
  const [state, setState] = useState<FetchState>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    const clean = vin.toUpperCase().replace(/\s/g, '');
    if (clean.length !== 17) {
      setError('Le VIN doit comporter exactement 17 caractères.');
      return;
    }
    if (/I|O|Q/.test(clean)) {
      setError('Les lettres I, O et Q ne sont pas autorisées dans un VIN.');
      return;
    }
    setError('');
    setState('loading');
    try {
      const r = await decodeVin(clean);
      onIdentified({
        marque: r.make,
        modele: r.model || 'Modèle inconnu',
        version: r.year,
        moteur: '',
        kilometrage: '',
      });
      setState('success');
    } catch {
      setState('error');
      setError('VIN introuvable dans la base NHTSA. Vérifiez la saisie ou utilisez la recherche manuelle.');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="label-field">Numéro de châssis / VIN (17 caractères)</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <input
              type="text"
              value={vin}
              onChange={(e) => { setVin(e.target.value.toUpperCase()); setState('idle'); setError(''); }}
              placeholder="1HGBH41JXMN109186"
              maxLength={17}
              className="input-field font-mono uppercase tracking-[0.1em]"
            />
            <p className="mt-1.5 text-xs text-slate-400">{vin.length}/17 caractères</p>
          </div>
          <button onClick={submit} disabled={state === 'loading'} className="btn-green sm:w-auto">
            {state === 'loading' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Décodage…</>
            ) : (
              <><Search className="h-4 w-4" /> Décoder</>
            )}
          </button>
        </div>
        {error && (
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-action-redDark">
            <AlertTriangle className="h-4 w-4" /> {error}
          </p>
        )}
        {state === 'loading' && (
          <p className="mt-2 flex items-center gap-2 text-sm text-trust-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Interrogation de la base NHTSA vPIC…
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">Base de données NHTSA vPIC. Pour les véhicules européens non référencés, utilisez la recherche manuelle.</p>
      </div>
    </div>
  );
}

// ─── TAB 2: Recherche manuelle (100 % locale — euroCarsDatabase.json) ───────

interface RawCarModel {
  id?: number | string;
  name?: string;
  model?: string;
  engines?: unknown;
}

interface CarModel {
  id: number | string;
  name: string;
  engines?: unknown;
}

interface CarBrandEntry {
  marque?: string;
  brand?: string;
  models?: Array<string | RawCarModel>;
}

type CarsDatabase = CarBrandEntry[];

function getMarque(entry: CarBrandEntry): string {
  return (entry.marque ?? entry.brand ?? '').trim();
}

function isInvalidModelId(id: number | string | undefined | null): boolean {
  if (id === undefined || id === null) return false;
  return id === 0 || String(id) === '0';
}

function isSelectableModel(model: CarModel): boolean {
  return !isInvalidModelId(model.id) && model.name.trim().length > 0;
}

function findBrandBySelectedValue(selectedBrandValue: string): CarBrandEntry | undefined {
  if (!selectedBrandValue) return undefined;
  return (carsData as CarsDatabase).find(
    (brand) => (brand.marque ?? brand.brand ?? '') === selectedBrandValue,
  );
}

function normalizeBrandModels(brandEntry: CarBrandEntry | undefined): CarModel[] {
  if (!brandEntry?.models) return [];

  const marque = getMarque(brandEntry);
  return brandEntry.models
    .map((item, index) => {
      if (typeof item === 'string') {
        const name = item.trim();
        if (!name) return null;
        return { id: `${marque}-${index}`, name, engines: [] };
      }

      const name = (item.name ?? item.model ?? '').trim();
      if (!name || isInvalidModelId(item.id)) return null;
      return {
        id: item.id ?? `${marque}-${index}`,
        name,
        engines: item.engines,
      };
    })
    .filter((item): item is CarModel => item !== null && isSelectableModel(item));
}

function toEngineStrings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function findModelById(modelId: string): { brand: CarBrandEntry; model: RawCarModel } | undefined {
  if (!modelId) return undefined;
  const normalizedId = String(modelId);

  for (const brand of carsData as CarsDatabase) {
    if (!brand.models) continue;

    for (const model of brand.models) {
      if (typeof model === 'string') continue;
      if (String(model.id) === normalizedId) {
        return { brand, model };
      }
    }
  }

  return undefined;
}

function getEnginesForModelId(modelId: string, localModels: CarModel[]): string[] {
  const localMatch = localModels.find((model) => String(model.id) === String(modelId));
  if (localMatch) return toEngineStrings(localMatch.engines);

  const found = findModelById(modelId);
  if (!found) {
    console.warn(
      `[VehicleIdentifier] Aucun modèle trouvé pour modelId="${modelId}" dans euroCarsDatabase.json`,
    );
    return [];
  }
  return toEngineStrings(found.model.engines);
}

function getModelNameById(modelId: string, localModels: CarModel[]): string {
  const localMatch = localModels.find((model) => String(model.id) === String(modelId));
  if (localMatch) return localMatch.name;

  const found = findModelById(modelId);
  if (!found) return '';
  return (found.model.name ?? found.model.model ?? '').trim();
}

const SORTED_BRANDS = [...(carsData as CarsDatabase)]
  .filter((brand) => {
    const marque = getMarque(brand);
    return marque.length > 0 && marque !== '0';
  })
  .sort((a, b) => getMarque(a).localeCompare(getMarque(b), 'fr'));

function CascadingSelectRow({
  step,
  label,
  htmlFor,
  children,
}: {
  step: 1 | 2 | 3;
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <label className="label-field" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="flex items-stretch gap-3">
        <span
          aria-hidden
          className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-trust-700 text-sm font-bold text-white shadow-sm"
        >
          {step}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function ManualTab({ onIdentified, initialVehicle }: { onIdentified: (v: VehicleInfo) => void; initialVehicle: VehicleInfo }) {
  const [selectedBrand, setSelectedBrand] = useState('');
  const [models, setModels] = useState<CarModel[]>([]);
  const [selectedModelValue, setSelectedModelValue] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('');
  const [engines, setEngines] = useState<string[]>([]);
  const [km, setKm] = useState(initialVehicle.kilometrage || '');
  const [error, setError] = useState('');

  const modelName = useMemo(
    () => getModelNameById(selectedModelValue, models),
    [selectedModelValue, models],
  );

  const selectableModels = useMemo(
    () => models.filter((model) => model.id !== 0 && model.id !== '0' && String(model.id) !== '0'),
    [models],
  );

  const handleBrandChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBrandValue = event.target.value;
    if (!selectedBrandValue || selectedBrandValue === '0') {
      setSelectedBrand('');
      setModels([]);
      setSelectedModelValue('');
      setSelectedEngine('');
      setEngines([]);
      setError('');
      return;
    }
    const selectedBrandObj = findBrandBySelectedValue(selectedBrandValue);
    const nextModels = selectedBrandObj ? normalizeBrandModels(selectedBrandObj) : [];

    setSelectedBrand(selectedBrandValue);
    setModels(nextModels);
    setSelectedModelValue('');
    setSelectedEngine('');
    setEngines([]);
    setError('');
  };

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = event.target.value;
    if (!modelId || modelId === '0') {
      setSelectedModelValue('');
      setSelectedEngine('');
      setEngines([]);
      setError('');
      return;
    }

    setSelectedModelValue(modelId);
    setSelectedEngine('');
    setEngines(modelId ? getEnginesForModelId(modelId, models) : []);
    setError('');
  };

  const handleEngineChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEngine(event.target.value);
    setError('');
  };

  const submit = () => {
    setError('');
    if (!selectedBrand || !selectedModelValue) {
      setError('Marque et modèle sont obligatoires.');
      return;
    }
    onIdentified({
      marque: selectedBrand,
      modele: modelName,
      version: selectedEngine,
      moteur: selectedEngine,
      kilometrage: km,
    });
  };

  const selectChevronStyle = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='https://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
  };

  const selectClassName =
    'input-field min-h-[42px] w-full cursor-pointer appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <CascadingSelectRow step={1} label="Constructeur" htmlFor="vehicle-brand-select">
            <select
              id="vehicle-brand-select"
              value={selectedBrand}
              onChange={handleBrandChange}
              className={selectClassName}
              style={selectChevronStyle}
              aria-label="Sélectionner la marque du véhicule"
            >
              <option value="" disabled hidden>
                Sélectionner une marque
              </option>
              {SORTED_BRANDS.map((brand) => {
                const marque = getMarque(brand);
                return (
                  <option key={marque} value={marque}>
                    {marque}
                  </option>
                );
              })}
            </select>
          </CascadingSelectRow>

          <CascadingSelectRow step={2} label="Modèle" htmlFor="vehicle-model-select">
            <select
              id="vehicle-model-select"
              value={selectedModelValue}
              onChange={handleModelChange}
              disabled={selectableModels.length === 0}
              className={selectClassName}
              style={selectChevronStyle}
              aria-label="Sélectionner le modèle du véhicule"
            >
              <option value="" disabled hidden>
                Sélectionner un modèle
              </option>
              {selectableModels.map((model) => (
                <option key={String(model.id)} value={String(model.id)}>
                  {model.name}
                </option>
              ))}
            </select>
          </CascadingSelectRow>

          <CascadingSelectRow step={3} label="Motorisation" htmlFor="vehicle-engine-select">
            <select
              id="vehicle-engine-select"
              value={selectedEngine}
              onChange={handleEngineChange}
              disabled={engines.length === 0}
              className={selectClassName}
              style={selectChevronStyle}
              aria-label="Sélectionner la motorisation du véhicule"
            >
              <option value="" disabled hidden>
                Sélectionner une motorisation
              </option>
              {engines
                .filter((eng) => eng.trim().length > 0 && eng !== '0')
                .map((eng, idx) => (
                  <option key={idx} value={eng}>
                    {eng}
                  </option>
                ))}
            </select>
          </CascadingSelectRow>
        </div>

        <div>
          <label className="label-field">Kilométrage (optionnel)</label>
          <input
            className="input-field"
            placeholder="135 000"
            inputMode="numeric"
            value={km}
            onChange={(event) => setKm(event.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 text-sm font-medium text-action-redDark">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!selectedBrand || !selectedModelValue}
        className="btn-green w-full sm:w-auto"
      >
        <Search className="h-4 w-4" /> Rechercher
      </button>
    </div>
  );
}
