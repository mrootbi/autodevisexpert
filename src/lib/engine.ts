import { VehicleInfo, InputMode, RepairLine, DevisResult } from './types';

interface PriceEntry {
  label: string;
  prixReel: number;
  prixGarage: number;
  detail: string;
  keywords: RegExp;
}

const PRICE_TABLE: Record<string, PriceEntry[]> = {
  default: [
    {
      label: "Main d'œuvre",
      prixReel: 45,
      prixGarage: 80,
      detail: 'Tarif horaire atelier moyen vs concession',
      keywords: /main.?d.?œuvre|main.?d.?oeuvre|\bm\.?\s*o\.?\b|forfait|heures?\s*(de\s*)?(main|travail|atelier)/i,
    },
    {
      label: 'Filtre à huile',
      prixReel: 15,
      prixGarage: 32,
      detail: 'Pièce OEM equivalente',
      keywords: /filtre.{0,5}huile|filtre huile/i,
    },
    {
      label: 'Filtre à air',
      prixReel: 18,
      prixGarage: 35,
      detail: 'Pièce OEM equivalente',
      keywords: /filtre.{0,5}air|filtre air/i,
    },
    // 👇 زدت هادو فـ الديفولت باش يخدمو مع أي طوموبيل كيدخلها المستخدم 👇
    {
      label: 'Pompe à eau & Circuit de refroidissement (Générique)',
      prixReel: 75,
      prixGarage: 190,
      detail: 'Estimation indicative pièce + liquide de refroidissement',
      keywords: /pompe.{0,5}(à|a).{0,3}eau|pompe eau|fuite.{0,5}eau|refroidissement|eau/i,
    },
    {
      label: 'Système de freinage (Plaquettes / Disques)',
      prixReel: 60,
      prixGarage: 150,
      detail: 'Estimation indicative kit de freinage standard',
      keywords: /plaquette|frein|disque|purge/i,
    }
  ],
  '2.0 tdi': [
    {
      label: 'Kit distribution courroie + pompe à eau',
      prixReel: 320,
      prixGarage: 680,
      detail: "Pièce OEM Gates + main d'œuvre",
      keywords: /distribution|courroie|kit dist|chaine/i,
    },
    {
      label: 'Pompe à eau',
      prixReel: 85,
      prixGarage: 210,
      detail: "Pièce d'origine équipement",
      keywords: /pompe.{0,5}(à|a).{0,3}eau|pompe eau/i,
    },
    {
      label: 'Liquide de refroidissement G12+ (5L)',
      prixReel: 22,
      prixGarage: 65,
      detail: 'Liquide selon norme constructeur',
      keywords: /liquide.{0,12}refroid|refroidissement|g12|g13|coolant|antigel/i,
    },
    {
      label: 'Thermostat',
      prixReel: 35,
      prixGarage: 95,
      detail: 'Pièce OEM equivalente',
      keywords: /thermostat/i,
    },
    {
      label: 'Vidange + filtre huile (5W30 LongLife)',
      prixReel: 70,
      prixGarage: 140,
      detail: 'Huile 507.00 pour DPF/Common Rail',
      keywords: /vidange.{0,15}(huile|5w30|filtre)|vidange\s*\+?\s*filtre|5w30|507\.00/i,
    },
  ],
  '1.6 hdi': [
    {
      label: 'Kit distribution courroie',
      prixReel: 180,
      prixGarage: 420,
      detail: 'Pièce OEM equivalente',
      keywords: /distribution|courroie|kit dist|chaine/i,
    },
    {
      label: 'Injecteur',
      prixReel: 180,
      prixGarage: 380,
      detail: 'Pièce reconditionnée',
      keywords: /injecteur|injection/i,
    },
    {
      label: 'FAP nettoyage',
      prixReel: 250,
      prixGarage: 580,
      detail: 'Nettoyage en atelier',
      keywords: /fap|filtre.{0,5}particule|dpf|regén/i,
    },
  ],
  '1.6 bluehdi': [
    {
      label: 'Réservoir Adblue + pompe',
      prixReel: 380,
      prixGarage: 900,
      detail: 'Défaut connu PSA',
      keywords: /adblue|scr|réservoir adblue|reservoir adblue/i,
    },
    {
      label: 'Vidange',
      prixReel: 70,
      prixGarage: 150,
      detail: 'Huile 507.00',
      keywords: /vidange|huile moteur|5w30|507\.00/i,
    },
  ],
  essence: [
    {
      label: "Bougies d'allumage (x4)",
      prixReel: 40,
      prixGarage: 95,
      detail: 'Pièce OEM equivalente',
      keywords: /bougie|allumage/i,
    },
    {
      label: "Bobines d'allumage",
      prixReel: 70,
      prixGarage: 180,
      detail: 'Pièce OEM equivalente',
      keywords: /bobine|ignition/i,
    },
    {
      label: 'Vidange',
      prixReel: 55,
      prixGarage: 120,
      detail: 'Huile 5W30',
      keywords: /vidange|huile moteur|5w30/i,
    },
  ],
  freinage: [
    {
      label: 'Plaquettes avant',
      prixReel: 60,
      prixGarage: 160,
      detail: 'Kit avant OEM equivalente',
      keywords: /plaquette|frein avant|pad/i,
    },
    {
      label: 'Disques avant',
      prixReel: 90,
      prixGarage: 220,
      detail: 'Kit avant OEM equivalente',
      keywords: /disque.{0,5}frein|disque avant|rotor/i,
    },
    {
      label: 'Purge liquide de frein',
      prixReel: 25,
      prixGarage: 70,
      detail: 'Liquide DOT 4',
      keywords: /purge.{0,10}frein|liquide de frein|dot\s*4/i,
    },
  ],
  embrayage: [
    {
      label: 'Kit embrayage (disque + mécanisme + butée)',
      prixReel: 220,
      prixGarage: 520,
      detail: 'Pièce OEM equivalente',
      keywords: /embrayage|butée|butee|disque d'embrayage/i,
    },
    {
      label: 'Volant moteur bi-masse',
      prixReel: 280,
      prixGarage: 650,
      detail: 'Si bi-masse équipé',
      keywords: /volant moteur|bi.?masse|bimasse|dmf/i,
    },
  ],
};

const EXPERT_ADVICE_TEMPLATES: Record<string, DevisResult['expertAdvice']> = {
  '2.0 tdi': {
    title: 'Sur ce 2.0 TDI : flashez le circuit et passez au G12+',
    body: "Quand on change la pompe à eau d'un 2.0 TDI (code moteur CFFB, CBAB…), VW préconise du G13. Mais le G12+ a une meilleure stabilité thermique sur les moteurs qui souffrent, et il est parfaitement compatible aluminium. Le G13, plus \"écolo\" (glycérol), a tendance à perdre ses propriétés plus vite dans un circuit déjà fatigué. Avant de remplir, flashez le circuit (purge obligatoire) : un mélange G12+/G13, même à 90/10, réduit drastiquement la protection cavitation de la pompe neuve.",
    recommendation: "Demandez explicitement du G12+ (concentration 50/50) et une purge complète du vase au radiateur. Le G13 est vendu deux fois plus cher et ne vous apportera rien de plus sur ce moteur.",
    severity: 'warning',
  },
  default: {
    title: "L'œil du mécano sur votre devis",
    body: "Quand un devis multiplie par deux le prix de base pièces + main d'œuvre, posez systématiquement trois questions : la pièce est-elle en pièce OEM equivalente ou sous-marque ? Le temps de main d'œuvre correspond-il au barème constructeur ? Les consommables (joints, liquides, purge) sont-ils détaillés séparément ?",
    recommendation: "Exigez le détail par poste. Un devis opaque est le premier signe d'une marge artificielle.",
    severity: 'info',
  },
};

const MAIN_OEUVRE_LABEL = "Main d'œuvre";

function detectCategory(vehicle: VehicleInfo, rawInput: string): string {
  const text = `${vehicle.moteur} ${vehicle.modele} ${rawInput}`.toLowerCase();
  if (/2\.0\s*tdi|tdi\s*2\.0/.test(text)) return '2.0 tdi';
  if (/1\.6\s*bluehdi|bluehdi/.test(text)) return '1.6 bluehdi';
  if (/1\.6\s*hdi/.test(text)) return '1.6 hdi';
  if (/frein|plaquette|disque|purge|liquide de frein/.test(text)) return 'freinage';
  if (/embrayage|volant moteur|bi-masse|bimasse/.test(text)) return 'embrayage';
  if (/essence|boug|bobine|tspi|1\.2 tce|1\.6 vti/.test(text)) return 'essence';
  return 'default';
}

function getCandidatePool(category: string): PriceEntry[] {
  const categoryItems = PRICE_TABLE[category] ?? [];
  const defaultItems = PRICE_TABLE.default;
  const seen = new Set<string>();
  const pool: PriceEntry[] = [];

  for (const entry of [...categoryItems, ...defaultItems]) {
    if (seen.has(entry.label)) continue;
    seen.add(entry.label);
    pool.push(entry);
  }

  return pool;
}

function entryMatchesInput(entry: PriceEntry, text: string): boolean {
  if (entry.label.includes('Kit distribution') && /pompe.{0,5}(à|a).{0,3}eau|pompe eau/i.test(text) && !/distribution|courroie|kit dist|chaine/i.test(text)) {
    return false;
  }
  return entry.keywords.test(text);
}

function buildTableItems(category: string, rawInput: string, vehicle: VehicleInfo): RepairLine[] {
  const text = `${vehicle.moteur} ${vehicle.modele} ${rawInput}`.toLowerCase();
  const pool = getCandidatePool(category);
  const mainOeuvre = pool.find((e) => e.label === MAIN_OEUVRE_LABEL) ?? PRICE_TABLE.default[0];

  let matched = pool.filter((entry) => entry.label !== MAIN_OEUVRE_LABEL && entryMatchesInput(entry, text));

  // 👇 هنا قادينا الـ Fallback باش مايبقاش يعطي ديما 147 يورو 👇
  if (matched.length === 0) {
    const dynamicLabel = rawInput.trim().length > 3 
      ? `Intervention : ${rawInput.substring(0, 45)}...` 
      : "Entretien / Réparation mécanique";
      
    return [
      {
        label: mainOeuvre.label,
        prixGaragiste: mainOeuvre.prixGarage,
        prixReel: mainOeuvre.prixReel,
        detail: mainOeuvre.detail,
      },
      {
        label: dynamicLabel,
        prixGaragiste: 130,
        prixReel: 65,
        detail: "Estimation personnalisée basée sur la description",
      }
    ];
  }

  const tableItems: RepairLine[] = matched.map((entry) => ({
    label: entry.label,
    prixGaragiste: entry.prixGarage,
    prixReel: entry.prixReel,
    detail: entry.detail,
  }));

  if (tableItems.length > 0 && !tableItems.some((item) => item.label === MAIN_OEUVRE_LABEL)) {
    tableItems.unshift({
      label: mainOeuvre.label,
      prixGaragiste: mainOeuvre.prixGarage,
      prixReel: mainOeuvre.prixReel,
      detail: mainOeuvre.detail,
    });
  }

  return tableItems;
}

export function analyzeDevis(
  vehicle: VehicleInfo,
  mode: InputMode,
  rawInput: string,
  quotedTotal?: number,
): DevisResult {
  const category = detectCategory(vehicle, rawInput);
  const tableItems = buildTableItems(category, rawInput, vehicle);

  if (quotedTotal && quotedTotal > 0) {
    const sumGarage = tableItems.reduce((s, item) => s + item.prixGaragiste, 0);
    if (sumGarage > 0) {
      const ratio = quotedTotal / sumGarage;
      tableItems.forEach((item) => {
        item.prixGaragiste = Math.round(item.prixGaragiste * ratio);
      });
    }
  }

  const totalGaragiste = tableItems.reduce((s, item) => s + item.prixGaragiste, 0);
  const totalReel = tableItems.reduce((s, item) => s + item.prixReel, 0);
  const expert = EXPERT_ADVICE_TEMPLATES[category] ?? EXPERT_ADVICE_TEMPLATES.default;

  return {
    vehicle,
    mode,
    rawInput,
    tableItems,
    expertAdvice: expert,
    totalGaragiste,
    totalReel,
  };
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}