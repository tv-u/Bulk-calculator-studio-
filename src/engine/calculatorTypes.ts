import type { NumberLocaleMode } from './formatters';

export type DomainCategoryId =
  | 'mathematics'
  | 'finance'
  | 'health'
  | 'engineering'
  | 'education'
  | 'date-time'
  | 'construction'
  | 'technology'
  | 'everyday'
  | 'business'
  | 'science'
  | 'daily-life'
  | 'automotive'
  | 'agriculture'
  | 'legal'
  | 'sports'
  | 'food';

export interface CalculatorFieldOption {
  label: string;
  value: string;
}

export interface CalculatorField {
  key: string;
  label: string;
  type: 'number' | 'select' | 'text' | 'date';
  defaultValue: number | string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number | string;
  placeholder?: string;
  options?: CalculatorFieldOption[];
  helpText?: string;
}

export interface CalculatorMetric {
  label: string;
  value: number | string;
  formatted: string;
  unit?: string;
}

export interface CalculatorChartPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface CalculatorResult {
  primary: CalculatorMetric;
  breakdown: CalculatorMetric[];
  steps: string[];
  chartData?: CalculatorChartPoint[];
  chartLabels?: { primary: string; secondary?: string };
  tableHeaders?: string[];
  tableRows?: Array<Array<string | number>>;
  isApproximate?: boolean;
  warnings?: string[];
}

export interface ComputeContext {
  locale: NumberLocaleMode;
  currency: string;
}

export interface CalculatorDefinition {
  id: string;
  slug?: string;
  catalogNumber?: number;
  partNumber?: number;
  subcategory?: string;
  toolKind?: 'calculator' | 'converter' | 'live-tool';
  safetyClass?: 'standard' | 'financial' | 'clinical' | 'engineering';
  canonicalSlug?: string;
  name: string;
  shortDescription: string;
  category: DomainCategoryId;
  categoryLabel: string;
  keywords: string[];
  synonyms: string[];
  formulaDisplay: string;
  explanation: string;
  assumptions?: string;
  disclaimer?: string;
  inputs: CalculatorField[];
  relatedIds: string[];
  compute: (values: Record<string, number | string>, ctx?: ComputeContext) => CalculatorResult;
}

export function num(values: Record<string, number | string>, key: string, fallback = 0): number {
  const raw = values[key];
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) throw new Error(`Invalid numeric value for ${key}.`);
    return raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') return fallback;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) throw new Error(`"${raw}" is not a valid number for ${key}.`);
    return parsed;
  }
  return fallback;
}

export function str(values: Record<string, number | string>, key: string, fallback = ''): string {
  const raw = values[key];
  if (raw === undefined || raw === null) return fallback;
  return String(raw).trim();
}
