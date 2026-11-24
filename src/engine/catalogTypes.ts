import type { CalculatorDefinition } from './calculatorTypes';

export type CatalogCategory =
  | 'finance'
  | 'mathematics'
  | 'health'
  | 'engineering'
  | 'construction'
  | 'business'
  | 'education'
  | 'science'
  | 'technology'
  | 'daily-life'
  | 'automotive'
  | 'agriculture'
  | 'legal'
  | 'sports'
  | 'food';

export type ToolKind = 'calculator' | 'converter' | 'live-tool';
export type SafetyClass = 'standard' | 'financial' | 'clinical' | 'engineering';

export interface CatalogEntryMeta {
  catalogNumber: number;
  id: string;
  slug: string;
  name: string;
  partNumber: number;
  subcategory: string;
  category: CatalogCategory;
  categoryLabel: string;
  toolKind: ToolKind;
  safetyClass: SafetyClass;
  solverFamily: string;
  solverKey: string;
  canonicalSlug: string;
  isDuplicateName: boolean;
  status: 'validated' | 'published' | 'restricted' | 'unpublished' | 'pending';
}

export type DomainSolverFn = (entry: CatalogEntryMeta) => CalculatorDefinition;
