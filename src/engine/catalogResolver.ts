import catalogRaw from './generated/catalogIndex.json';
import type { CalculatorDefinition } from './calculatorTypes';
import { num, str } from './calculatorTypes';
import type { CatalogEntryMeta } from './catalogTypes';
import { UNIT_CATEGORIES, convertUnit, type UnitCategoryId } from './units';
import { MATH_CALCULATORS } from './domains/mathCalculators';
import { FINANCE_CALCULATORS } from './domains/financeCalculators';
import { HEALTH_CALCULATORS } from './domains/healthCalculators';
import { ENGINEERING_CALCULATORS } from './domains/engineeringCalculators';
import { EDUCATION_AND_OTHER_CALCULATORS } from './domains/educationAndOtherCalculators';

export const CATALOG_2500: CatalogEntryMeta[] = catalogRaw as CatalogEntryMeta[];

export const CATALOG_BY_SLUG = new Map<string, CatalogEntryMeta>(
  CATALOG_2500.map((entry) => [entry.slug, entry])
);

export const CATALOG_BY_NUMBER = new Map<number, CatalogEntryMeta>(
  CATALOG_2500.map((entry) => [entry.catalogNumber, entry])
);

export const FLAGSHIP_BY_ID = new Map<string, CalculatorDefinition>(
  [
    ...MATH_CALCULATORS,
    ...FINANCE_CALCULATORS,
    ...HEALTH_CALCULATORS,
    ...ENGINEERING_CALCULATORS,
    ...EDUCATION_AND_OTHER_CALCULATORS,
  ].map((c) => [c.id, c])
);

export const LEGACY_FLAGSHIP_TO_SLUG: Record<string, string> = {
  emi: 'emi-calculator',
  sip: 'sip-calculator',
  'compound-interest': 'compound-interest-calculator',
  'simple-interest': 'simple-interest-calculator',
  fd: 'fd-calculator',
  rd: 'rd-calculator',
  retirement: 'retirement-calculator',
  gst: 'gst-calculator',
  'income-tax': 'income-tax-calculator',
  roi: 'roi-calculator',
  cagr: 'cagr-calculator',
  'loan-eligibility': 'loan-eligibility-calculator',
  'profit-loss': 'profit-and-loss-calculator',
  discount: 'discount-calculator',
  scientific: 'scientific-calculator',
  fraction: 'fraction-calculator',
  percentage: 'percentage-calculator',
  ratio: 'ratio-calculator',
  statistics: 'standard-deviation-calculator',
  probability: 'probability-calculator',
  'equation-solver': 'equation-solver',
  matrix: 'matrix-calculator',
  trigonometry: 'trigonometry-calculator',
  calculus: 'calculus-calculator',
  area: 'area-calculator',
  volume: 'volume-calculator',
  bmi: 'bmi-calculator',
  bmr: 'bmr-calculator',
  tdee: 'tdee-calculator',
  calorie: 'calorie-calculator',
  'ideal-weight': 'ideal-weight-calculator',
  protein: 'protein-calculator',
  'water-intake': 'water-intake-calculator',
  age: 'age-calculator',
  'ohms-law': 'ohms-law-calculator',
  voltage: 'voltage-calculator',
  current: 'current-calculator',
  resistance: 'resistance-calculator',
  power: 'power-calculator-205',
  energy: 'energy-calculator',
  'electricity-bill': 'electricity-bill-calculator',
  force: 'force-calculator',
  velocity: 'velocity-calculator',
  pressure: 'pressure-calculator',
  density: 'density-calculator',
  concrete: 'concrete-calculator',
  bricks: 'brick-calculator',
  paint: 'paint-calculator',
  'land-measurement': 'land-area-calculator',
  gpa: 'gpa-calculator',
  cgpa: 'cgpa-calculator',
  'marks-percentage': 'marks-percentage-calculator',
  grade: 'grade-calculator',
  attendance: 'attendance-calculator',
  'study-time': 'study-time-calculator',
  'date-difference': 'date-difference-calculator',
  'fuel-cost': 'fuel-cost-calculator',
  bandwidth: 'bandwidth-calculator',
  'storage-converter': 'data-storage-converter',
  'binary-converter': 'binary-converter',
};

export function attachCatalogMeta(def: CalculatorDefinition, entry: CatalogEntryMeta): CalculatorDefinition {
  return {
    ...def,
    id: entry.slug,
    slug: entry.slug,
    name: entry.name,
    catalogNumber: entry.catalogNumber,
    partNumber: entry.partNumber,
    subcategory: entry.subcategory,
    toolKind: entry.toolKind,
    safetyClass: entry.safetyClass,
    canonicalSlug: entry.canonicalSlug,
    category: entry.category,
    categoryLabel: entry.categoryLabel,
    relatedIds: def.relatedIds?.length ? def.relatedIds : getRelatedCatalogSlugs(entry, 4),
  };
}

export function buildUnitVariantDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();

  if (n.includes('degree to radian') || n.includes('radian to degree')) {
    const degToRad = n.includes('degree to radian');
    return attachCatalogMeta(
      {
        id: entry.slug,
        name: entry.name,
        shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact π/180 trigonometric angle conversion.`,
        category: entry.category,
        categoryLabel: entry.categoryLabel,
        keywords: ['angle', 'degree', 'radian', 'trigonometry'],
        synonyms: [entry.slug.replace(/-/g, ' ')],
        formulaDisplay: degToRad ? 'rad = deg × (π / 180)' : 'deg = rad × (180 / π)',
        explanation: 'Converts precisely between degrees and radians.',
        inputs: [
          {
            key: 'val',
            label: degToRad ? 'Degrees (°)' : 'Radians (rad)',
            type: 'number',
            defaultValue: degToRad ? 180 : 3.14159265,
            step: 0.01,
          },
        ],
        relatedIds: [],
        compute: (vals) => {
          const v = num(vals, 'val');
          const out = degToRad ? (v * Math.PI) / 180 : (v * 180) / Math.PI;
          const unit = degToRad ? 'rad' : '°';
          return {
            primary: { label: degToRad ? 'Radians' : 'Degrees', value: out, formatted: `${out.toFixed(6)} ${unit}`, unit },
            breakdown: [
              { label: 'Input Value', value: v, formatted: `${v} ${degToRad ? '°' : 'rad'}` },
              { label: 'π Multiples', value: degToRad ? v / 180 : out / 180, formatted: `${(degToRad ? v / 180 : out / 180).toFixed(4)} π` },
            ],
            steps: [degToRad ? `${v}° × π/180 = ${out.toFixed(6)} rad` : `${v} rad × 180/π = ${out.toFixed(6)}°`],
          };
        },
      },
      entry
    );
  }

  if (n.includes('ohm to siemens')) {
    return attachCatalogMeta(
      {
        id: entry.slug,
        name: entry.name,
        shortDescription: `${entry.name} (#${entry.catalogNumber}) — electrical conductance G = 1 / R.`,
        category: entry.category,
        categoryLabel: entry.categoryLabel,
        keywords: ['ohm', 'siemens', 'conductance', 'resistance'],
        synonyms: ['conductance converter'],
        formulaDisplay: 'Conductance G (S) = 1 / Resistance R (Ω)',
        explanation: 'Converts electrical resistance in Ohms to conductance in Siemens.',
        inputs: [
          { key: 'ohms', label: 'Resistance (Ω)', type: 'number', defaultValue: 50, min: 0.000001, step: 1 },
        ],
        relatedIds: [],
        compute: (vals) => {
          const r = num(vals, 'ohms');
          if (r <= 0) throw new Error('Resistance must be greater than zero.');
          const g = 1 / r;
          return {
            primary: { label: 'Conductance', value: g, formatted: `${g.toFixed(6)} S`, unit: 'S' },
            breakdown: [
              { label: 'Millisiemens (mS)', value: g * 1000, formatted: `${(g * 1000).toFixed(4)} mS` },
              { label: 'Microsiemens (µS)', value: g * 1e6, formatted: `${(g * 1e6).toFixed(2)} µS` },
            ],
            steps: [`G = 1 / ${r} Ω = ${g.toFixed(6)} S`],
          };
        },
      },
      entry
    );
  }

  if (n.includes('css unit')) {
    return attachCatalogMeta(
      {
        id: entry.slug,
        name: entry.name,
        shortDescription: `${entry.name} (#${entry.catalogNumber}) — convert px, rem, em, pt, and vw accurately.`,
        category: entry.category,
        categoryLabel: entry.categoryLabel,
        keywords: ['css', 'px', 'rem', 'em', 'pt'],
        synonyms: ['px to rem'],
        formulaDisplay: 'rem = px / rootFontSize  |  pt = px × 0.75',
        explanation: 'Converts CSS typography and layout units against configurable root font size.',
        inputs: [
          { key: 'px', label: 'Pixels (px)', type: 'number', defaultValue: 16, min: 0, step: 1 },
          { key: 'rootPx', label: 'Root Font Size (px)', type: 'number', defaultValue: 16, min: 8, max: 48, step: 1 },
          { key: 'viewportW', label: 'Viewport Width (px)', type: 'number', defaultValue: 1440, min: 320, step: 10 },
        ],
        relatedIds: [],
        compute: (vals) => {
          const px = num(vals, 'px');
          const root = num(vals, 'rootPx', 16);
          const vw = num(vals, 'viewportW', 1440);
          const rem = px / root;
          const pt = px * 0.75;
          const vwPct = (px / vw) * 100;
          return {
            primary: { label: 'REM Value', value: rem, formatted: `${rem.toFixed(4)} rem`, unit: 'rem' },
            breakdown: [
              { label: 'EM (1:1 parent)', value: rem, formatted: `${rem.toFixed(4)} em` },
              { label: 'Points (pt)', value: pt, formatted: `${pt.toFixed(2)} pt` },
              { label: 'Viewport Width (vw)', value: vwPct, formatted: `${vwPct.toFixed(3)} vw` },
            ],
            steps: [`${px}px / ${root}px root = ${rem.toFixed(4)} rem`],
          };
        },
      },
      entry
    );
  }

  if (n.includes('awg to mm')) {
    return attachCatalogMeta(
      {
        id: entry.slug,
        name: entry.name,
        shortDescription: `${entry.name} (#${entry.catalogNumber}) — ASTM B258 American Wire Gauge diameter & cross-section.`,
        category: entry.category,
        categoryLabel: entry.categoryLabel,
        keywords: ['awg', 'wire gauge', 'diameter', 'mm2'],
        synonyms: ['wire size converter'],
        formulaDisplay: 'd (mm) = 0.127 × 92^((36 − AWG) / 39)',
        explanation: 'Computes exact wire diameter in millimeters and cross-sectional area in mm² for ASTM B258 AWG gauges.',
        inputs: [
          { key: 'awg', label: 'AWG Gauge (-3 to 40)', type: 'number', defaultValue: 14, min: -3, max: 40, step: 1 },
        ],
        relatedIds: [],
        compute: (vals) => {
          const awg = num(vals, 'awg');
          const d = 0.127 * Math.pow(92, (36 - awg) / 39);
          const area = Math.PI * Math.pow(d / 2, 2);
          return {
            primary: { label: 'Wire Diameter', value: d, formatted: `${d.toFixed(3)} mm`, unit: 'mm' },
            breakdown: [
              { label: 'Cross-Section Area', value: area, formatted: `${area.toFixed(3)} mm²` },
              { label: 'Diameter (Inches)', value: d / 25.4, formatted: `${(d / 25.4).toFixed(4)} in` },
            ],
            steps: [`d = 0.127 × 92^((36 - ${awg})/39) = ${d.toFixed(3)} mm`],
          };
        },
      },
      entry
    );
  }

  if (n.includes('fuel unit')) {
    return attachCatalogMeta(
      {
        id: entry.slug,
        name: entry.name,
        shortDescription: `${entry.name} (#${entry.catalogNumber}) — convert km/L, L/100km, MPG (US), and MPG (UK).`,
        category: entry.category,
        categoryLabel: entry.categoryLabel,
        keywords: ['fuel economy', 'mpg', 'km/l', 'l/100km'],
        synonyms: ['mileage converter'],
        formulaDisplay: 'L/100km = 100 / (km/L) = 235.21458 / MPG(US)',
        explanation: 'Converts accurately between metric and imperial fuel economy metrics.',
        inputs: [
          { key: 'kmPerL', label: 'Efficiency (km/L)', type: 'number', defaultValue: 18, min: 0.1, step: 0.5 },
        ],
        relatedIds: [],
        compute: (vals) => {
          const kpl = num(vals, 'kmPerL');
          if (kpl <= 0) throw new Error('Efficiency must be positive.');
          const l100 = 100 / kpl;
          const mpgUs = kpl * 2.35214583;
          const mpgUk = kpl * 2.82480936;
          return {
            primary: { label: 'US MPG', value: mpgUs, formatted: `${mpgUs.toFixed(2)} MPG (US)` },
            breakdown: [
              { label: 'L/100km', value: l100, formatted: `${l100.toFixed(2)} L/100km` },
              { label: 'Imperial MPG (UK)', value: mpgUk, formatted: `${mpgUk.toFixed(2)} MPG (UK)` },
            ],
            steps: [`${kpl} km/L = ${l100.toFixed(2)} L/100km = ${mpgUs.toFixed(2)} MPG (US)`],
          };
        },
      },
      entry
    );
  }

  if (n.includes('astronomical unit')) {
    return attachCatalogMeta(
      {
        id: entry.slug,
        name: entry.name,
        shortDescription: `${entry.name} (#${entry.catalogNumber}) — convert AU, Light-Years, Parsecs, and Kilometers.`,
        category: entry.category,
        categoryLabel: entry.categoryLabel,
        keywords: ['au', 'light year', 'parsec', 'astronomy'],
        synonyms: ['space distance converter'],
        formulaDisplay: '1 AU = 149,597,870.7 km  |  1 ly = 63,241.077 AU  |  1 pc = 206,264.806 AU',
        explanation: 'IAU 2012 exact astronomical distance conversions.',
        inputs: [{ key: 'au', label: 'Astronomical Units (AU)', type: 'number', defaultValue: 1, min: 0, step: 0.1 }],
        relatedIds: [],
        compute: (vals) => {
          const au = num(vals, 'au');
          const km = au * 149597870.7;
          const ly = au / 63241.077;
          const pc = au / 206264.806;
          return {
            primary: { label: 'Kilometers', value: km, formatted: `${km.toLocaleString()} km`, unit: 'km' },
            breakdown: [
              { label: 'Light-Years (ly)', value: ly, formatted: `${ly.toExponential(4)} ly` },
              { label: 'Parsecs (pc)', value: pc, formatted: `${pc.toExponential(4)} pc` },
            ],
            steps: [`${au} AU × 149,597,870.7 km/AU = ${km.toLocaleString()} km`],
          };
        },
      },
      entry
    );
  }

  let unitCatId: UnitCategoryId = 'length';
  let defaultFrom = 'm';
  let defaultTo = 'ft';
  let defaultValue = 100;

  if (n.includes('weight') || n.includes('mass')) {
    unitCatId = 'weight';
    defaultFrom = 'kg';
    defaultTo = 'lb';
    defaultValue = 70;
  } else if (n.includes('temperature') || n.includes('celsius') || n.includes('fahrenheit') || n.includes('kelvin')) {
    unitCatId = 'temperature';
    defaultFrom = n.includes('fahrenheit to') ? 'F' : n.includes('kelvin') ? 'K' : 'C';
    defaultTo = defaultFrom === 'C' ? 'F' : 'C';
    defaultValue = n.includes('body') ? 37 : n.includes('baking') ? 180 : 25;
  } else if (n.includes('square') || n.includes('area') || n.includes('acre') || n.includes('hectare')) {
    unitCatId = 'area';
    defaultFrom = n.includes('acre') ? 'acre' : 'sqm';
    defaultTo = n.includes('acre') ? 'hectare' : 'sqft';
    defaultValue = n.includes('acre') ? 5 : 100;
  } else if (n.includes('volume')) {
    unitCatId = 'volume';
    defaultFrom = 'L';
    defaultTo = 'gal_us';
    defaultValue = 10;
  } else if (n.includes('speed') || n.includes('wind speed')) {
    unitCatId = 'speed';
    defaultFrom = 'kph';
    defaultTo = 'mph';
    defaultValue = 100;
  } else if (n.includes('pressure') || n.includes('atmospheric')) {
    unitCatId = 'pressure';
    defaultFrom = 'atm';
    defaultTo = 'psi';
    defaultValue = 1;
  } else if (n.includes('energy')) {
    unitCatId = 'energy';
    defaultFrom = 'kWh';
    defaultTo = 'kJ';
    defaultValue = 10;
  } else if (n.includes('power')) {
    unitCatId = 'power';
    defaultFrom = 'kW';
    defaultTo = 'hp';
    defaultValue = 50;
  } else if (n.includes('force')) {
    unitCatId = 'force';
    defaultFrom = 'N';
    defaultTo = 'lbf';
    defaultValue = 100;
  } else if (n.includes('data unit')) {
    unitCatId = 'data';
    defaultFrom = 'GB';
    defaultTo = 'GiB';
    defaultValue = 512;
  }

  const cat = UNIT_CATEGORIES.find((c) => c.id === unitCatId) || UNIT_CATEGORIES[0];
  const opts = cat.units.map((u) => ({ label: `${u.label} (${u.symbol})`, value: u.id }));

  return attachCatalogMeta(
    {
      id: entry.slug,
      name: entry.name,
      shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact NIST/SI ${cat.name.toLowerCase()} conversion.`,
      category: entry.category,
      categoryLabel: entry.categoryLabel,
      keywords: [cat.name.toLowerCase(), 'converter', ...cat.units.map((u) => u.label.toLowerCase())],
      synonyms: [entry.slug.replace(/-/g, ' ')],
      formulaDisplay: `Target = Source × (Factor_from / Factor_to)`,
      explanation: `Deterministic ${cat.name} conversion using exact international conversion constants.`,
      inputs: [
        { key: 'amount', label: `Input Value`, type: 'number', defaultValue, step: 0.1 },
        { key: 'fromUnit', label: 'From Unit', type: 'select', defaultValue: defaultFrom, options: opts },
        { key: 'toUnit', label: 'To Unit', type: 'select', defaultValue: defaultTo, options: opts },
      ],
      relatedIds: [],
      compute: (vals) => {
        const amt = num(vals, 'amount');
        const fromId = str(vals, 'fromUnit', defaultFrom);
        const toId = str(vals, 'toUnit', defaultTo);
        const result = convertUnit(amt, unitCatId, fromId, toId);
        const targetUnit = cat.units.find((u) => u.id === toId);
        const sym = targetUnit?.symbol || toId;
        const formatted = Math.abs(result) >= 0.0001 || result === 0 ? `${Number(result.toPrecision(8))} ${sym}` : `${result.toExponential(4)} ${sym}`;
        return {
          primary: { label: `${targetUnit?.label || toId}`, value: result, formatted, unit: sym },
          breakdown: cat.units.slice(0, 6).map((u) => {
            const v = convertUnit(amt, unitCatId, fromId, u.id);
            return {
              label: `${u.label} (${u.symbol})`,
              value: v,
              formatted: `${Math.abs(v) >= 0.0001 || v === 0 ? Number(v.toPrecision(7)) : v.toExponential(3)} ${u.symbol}`,
            };
          }),
          steps: [`Converted ${amt} ${fromId} -> ${formatted}`],
        };
      },
    },
    entry
  );
}

export function resolveCatalogEntryMeta(slugOrId: string): CatalogEntryMeta | undefined {
  const clean = slugOrId.trim().toLowerCase();
  const direct = CATALOG_BY_SLUG.get(clean);
  if (direct) return direct;
  const aliasedSlug = LEGACY_FLAGSHIP_TO_SLUG[clean];
  if (aliasedSlug) return CATALOG_BY_SLUG.get(aliasedSlug);
  return undefined;
}

export function getRelatedCatalogSlugs(entry: CatalogEntryMeta, count = 4): string[] {
  const siblings = CATALOG_2500.filter(
    (c) => c.slug !== entry.slug && (c.subcategory === entry.subcategory || c.category === entry.category)
  );
  const sorted = [
    ...siblings.filter((c) => c.subcategory === entry.subcategory),
    ...siblings.filter((c) => c.subcategory !== entry.subcategory),
  ];
  return sorted.slice(0, count).map((c) => c.slug);
}

export async function resolveCalculatorBySlugAsync(slugOrId: string): Promise<CalculatorDefinition | undefined> {
  const clean = slugOrId.trim().toLowerCase();
  const entry = resolveCatalogEntryMeta(clean);
  if (!entry) return FLAGSHIP_BY_ID.get(clean);

  switch (entry.solverFamily) {
    case 'flagship': {
      const fId = entry.solverKey.replace(/^flagship:/, '');
      const fDef = FLAGSHIP_BY_ID.get(fId);
      if (fDef) return attachCatalogMeta(fDef, entry);
      const mod = await import('./solvers/financeSolver');
      return attachCatalogMeta(mod.buildFinanceDefinition(entry), entry);
    }
    case 'unit':
      return buildUnitVariantDefinition(entry);
    case 'finance': {
      const mod = await import('./solvers/financeSolver');
      return attachCatalogMeta(mod.buildFinanceDefinition(entry), entry);
    }
    case 'math': {
      const mod = await import('./solvers/mathSolver');
      return attachCatalogMeta(mod.buildMathDefinition(entry), entry);
    }
    case 'health': {
      const mod = await import('./solvers/healthSolver');
      return attachCatalogMeta(mod.buildHealthDefinition(entry), entry);
    }
    case 'physicsEng': {
      const mod = await import('./solvers/physicsEngSolver');
      return attachCatalogMeta(mod.buildPhysicsEngDefinition(entry), entry);
    }
    case 'chemBio': {
      const mod = await import('./solvers/chemBioSolver');
      return attachCatalogMeta(mod.buildChemBioDefinition(entry), entry);
    }
    case 'constructionAgri': {
      const mod = await import('./solvers/constructionAgriSolver');
      return attachCatalogMeta(mod.buildConstructionAgriDefinition(entry), entry);
    }
    case 'businessHr':
    case 'dailyAstro': {
      const mod = await import('./solvers/businessAndDailySolver');
      return attachCatalogMeta(mod.buildBusinessAndDailyDefinition(entry), entry);
    }
    case 'techNet': {
      const mod = await import('./solvers/techNetSolver');
      return attachCatalogMeta(mod.buildTechNetDefinition(entry), entry);
    }
    default: {
      const mod = await import('./solvers/businessAndDailySolver');
      return attachCatalogMeta(mod.buildBusinessAndDailyDefinition(entry), entry);
    }
  }
}
