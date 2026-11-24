import type { CalculatorDefinition, DomainCategoryId } from './calculatorTypes';
import type { CatalogCategory, CatalogEntryMeta } from './catalogTypes';
import {
  CATALOG_2500,
  FLAGSHIP_BY_ID,
  LEGACY_FLAGSHIP_TO_SLUG,
  resolveCatalogEntryMeta,
} from './catalogResolver';
import { MATH_CALCULATORS } from './domains/mathCalculators';
import { FINANCE_CALCULATORS } from './domains/financeCalculators';
import { HEALTH_CALCULATORS } from './domains/healthCalculators';
import { ENGINEERING_CALCULATORS } from './domains/engineeringCalculators';
import { EDUCATION_AND_OTHER_CALCULATORS } from './domains/educationAndOtherCalculators';

export interface CategoryMeta {
  id: DomainCategoryId;
  name: string;
  description: string;
  accentFrom: string;
  accentTo: string;
  count?: number;
}

export const CATALOG_CATEGORIES: CategoryMeta[] = [
  {
    id: 'finance',
    name: 'Finance & Banking',
    description: 'EMI, SIP, Stock Valuation, Options Greeks, Crypto DeFi, India Tax, GST, Insurance & Loans.',
    accentFrom: '#10b981',
    accentTo: '#f59e0b',
    count: CATALOG_2500.filter((c) => c.category === 'finance').length,
  },
  {
    id: 'mathematics',
    name: 'Mathematics & Statistics',
    description: 'Algebra, Geometry, Trigonometry, Calculus, Matrices, Vectors, Number Theory & Probability.',
    accentFrom: '#3b82f6',
    accentTo: '#06b6d4',
    count: CATALOG_2500.filter((c) => c.category === 'mathematics').length,
  },
  {
    id: 'health',
    name: 'Health, Clinical & Fitness',
    description: 'BMI, BMR, TDEE, Clinical CrCl/eGFR, Pregnancy EDD, Pediatrics & Strength Metrics.',
    accentFrom: '#ec4899',
    accentTo: '#8b5cf6',
    count: CATALOG_2500.filter((c) => c.category === 'health').length,
  },
  {
    id: 'engineering',
    name: 'Engineering & Physics',
    description: 'AC/3-Phase Electrical, Electronics, Mechanical Stress, Fluids, HVAC, Thermodynamics & Optics.',
    accentFrom: '#06b6d4',
    accentTo: '#6366f1',
    count: CATALOG_2500.filter((c) => c.category === 'engineering').length,
  },
  {
    id: 'construction',
    name: 'Construction & Property',
    description: 'Concrete M15-M25, Steel Rebar D²/162, Land Area, Bricks, Tiles, Paint, HVAC & Solar Sizing.',
    accentFrom: '#f97316',
    accentTo: '#eab308',
    count: CATALOG_2500.filter((c) => c.category === 'construction').length,
  },
  {
    id: 'business',
    name: 'Business, Marketing & Supply Chain',
    description: 'SEO, ROAS, AdSense RPM, E-Commerce Margin, HR Attrition, Manufacturing EOQ/OEE & Logistics CBM.',
    accentFrom: '#6366f1',
    accentTo: '#a855f7',
    count: CATALOG_2500.filter((c) => c.category === 'business').length,
  },
  {
    id: 'education',
    name: 'Education & Academics',
    description: 'GPA, CGPA-to-Percentage, Grades, Attendance, Exam Ranks, Reading Time & Study Planners.',
    accentFrom: '#8b5cf6',
    accentTo: '#ec4899',
    count: CATALOG_2500.filter((c) => c.category === 'education').length,
  },
  {
    id: 'science',
    name: 'Chemistry, Biology & Astronomy',
    description: 'pH/Henderson-Hasselbalch, Molarity, Gas Laws, DNA GC%/Tm, Enzyme Kinetics, Orbital Δv & Weather.',
    accentFrom: '#14b8a6',
    accentTo: '#3b82f6',
    count: CATALOG_2500.filter((c) => c.category === 'science').length,
  },
  {
    id: 'technology',
    name: 'Technology, Net & Developer',
    description: 'CIDR Subnets, Live DNS/WHOIS/SSL Diagnostics, Bitrate, CSS px↔rem, WCAG Contrast & Encryption.',
    accentFrom: '#22c55e',
    accentTo: '#0ea5e9',
    count: CATALOG_2500.filter((c) => c.category === 'technology').length,
  },
  {
    id: 'daily-life',
    name: 'Everyday Life, Dates & Gaming',
    description: 'Exact Chronological Age, Date Difference, Split Bills, Tips, Electricity Bills & Gaming DPS.',
    accentFrom: '#0ea5e9',
    accentTo: '#14b8a6',
    count: CATALOG_2500.filter((c) => c.category === 'daily-life').length,
  },
  {
    id: 'automotive',
    name: 'Automotive, EV & Aviation',
    description: 'Engine Displacement, Torque↔HP, Gear Ratios, EV Range/Charging, Braking Distance & Flight TAS.',
    accentFrom: '#ef4444',
    accentTo: '#f97316',
    count: CATALOG_2500.filter((c) => c.category === 'automotive').length,
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Environment',
    description: 'NPK Fertilizer Dosage, Irrigation Scheduling, Seed Rate, Soil Volume, AQI & Carbon Footprint.',
    accentFrom: '#65a30d',
    accentTo: '#10b981',
    count: CATALOG_2500.filter((c) => c.category === 'agriculture').length,
  },
  {
    id: 'sports',
    name: 'Sports & Performance',
    description: 'Cricket Run Rate & NRR, Riegel Marathon Predictor, VO2 Max, Chess Elo & Swimming Splits.',
    accentFrom: '#f43f5e',
    accentTo: '#8b5cf6',
    count: CATALOG_2500.filter((c) => c.category === 'sports').length,
  },
  {
    id: 'food',
    name: 'Food, Baking & Nutrition',
    description: 'Recipe Scaling, Baker Hydration %, Sourdough Ratios, Coffee Brew Ratios & Food Cost %.',
    accentFrom: '#d97706',
    accentTo: '#ec4899',
    count: CATALOG_2500.filter((c) => c.category === 'food').length,
  },
  {
    id: 'legal',
    name: 'Legal & Compliance',
    description: 'Court Fee Estimates, Alimony & Child Support Formulas, Overtime & Legal Retainer Interest.',
    accentFrom: '#64748b',
    accentTo: '#3b82f6',
    count: CATALOG_2500.filter((c) => c.category === 'legal').length,
  },
];

// Backward compatible alias used across existing studio pages
export const DOMAIN_CATEGORIES: CategoryMeta[] = CATALOG_CATEGORIES;

export const CALCULATOR_REGISTRY: CalculatorDefinition[] = [
  ...MATH_CALCULATORS,
  ...FINANCE_CALCULATORS,
  ...HEALTH_CALCULATORS,
  ...ENGINEERING_CALCULATORS,
  ...EDUCATION_AND_OTHER_CALCULATORS,
];

export { CATALOG_2500, LEGACY_FLAGSHIP_TO_SLUG, resolveCatalogEntryMeta };

export function getCalculatorById(idOrSlug: string): CalculatorDefinition | undefined {
  const clean = idOrSlug.trim().toLowerCase();
  const direct = CALCULATOR_REGISTRY.find((c) => c.id === clean);
  if (direct) return direct;
  const aliased = LEGACY_FLAGSHIP_TO_SLUG[clean];
  if (aliased) {
    const meta = resolveCatalogEntryMeta(aliased);
    if (meta && meta.solverFamily === 'flagship') {
      return FLAGSHIP_BY_ID.get(meta.solverKey.replace(/^flagship:/, ''));
    }
  }
  return undefined;
}

export function getPublishedCalculators(unpublishedIds: string[] = []): CalculatorDefinition[] {
  if (unpublishedIds.length === 0) return CALCULATOR_REGISTRY;
  const hidden = new Set(unpublishedIds);
  return CALCULATOR_REGISTRY.filter((c) => !hidden.has(c.id));
}

export function getPublishedCatalogEntries(unpublishedIds: string[] = []): CatalogEntryMeta[] {
  if (unpublishedIds.length === 0) return CATALOG_2500;
  const hidden = new Set(unpublishedIds);
  return CATALOG_2500.filter(
    (entry) => !hidden.has(entry.slug) && !hidden.has(entry.id) && !hidden.has(entry.canonicalSlug)
  );
}

export function isValidCatalogCategory(cat: string): cat is CatalogCategory {
  return CATALOG_CATEGORIES.some((c) => c.id === cat);
}
