import { CATALOG_2500, getPublishedCatalogEntries } from './calculators';
import { TRANSLITERATION_ALIASES } from '../i18n/languages';

export interface SearchableDestination {
  id: string;
  catalogNumber?: number;
  name: string;
  route: string;
  category?: string;
  categoryLabel: string;
  shortDescription: string;
  keywords: string[];
  synonyms: string[];
  kind: 'calculator' | 'studio';
}

export interface SearchMatch {
  item: SearchableDestination;
  score: number;
  matchedKeyword?: string;
}

const STUDIO_DESTINATIONS: SearchableDestination[] = [
  {
    id: 'studio-bulk',
    name: 'Bulk Calculation Studio',
    route: '/bulk-calculator',
    categoryLabel: 'Bulk Studio',
    shortDescription: 'Process thousands of rows or CSV spreadsheets with custom & batch formulas.',
    keywords: ['bulk', 'csv', 'batch', 'spreadsheet', 'excel', 'rows', 'mass calculate'],
    synonyms: ['csv calculator', 'bulk math', 'batch processor'],
    kind: 'studio',
  },
  {
    id: 'studio-custom-builder',
    name: 'Custom Calculator Builder',
    route: '/custom-calculator-builder',
    categoryLabel: 'Studio Builder',
    shortDescription: 'Create, validate, preview, save, and export custom no-code calculators.',
    keywords: ['custom calculator', 'builder', 'no-code', 'formula builder'],
    synonyms: ['make calculator', 'custom formula'],
    kind: 'studio',
  },
  {
    id: 'studio-workflow',
    name: 'Visual Workflow Builder',
    route: '/workflow-builder',
    categoryLabel: 'Automation',
    shortDescription: 'Chain calculators together in a node-based calculation pipeline.',
    keywords: ['workflow', 'nodes', 'pipeline', 'automation', 'chain'],
    synonyms: ['node calculator', 'flow builder'],
    kind: 'studio',
  },
  {
    id: 'studio-unit-converter',
    name: 'Universal Unit Converter',
    route: '/unit-converter',
    categoryLabel: 'Converters',
    shortDescription: 'Convert Length, Weight, Area, Volume, Temp, Speed, Pressure, Energy & Data.',
    keywords: ['unit converter', 'convert', 'length', 'weight', 'temperature', 'pressure', 'energy'],
    synonyms: ['metric converter', 'imperial converter', 'cm to inches', 'kg to lbs'],
    kind: 'studio',
  },
  {
    id: 'studio-currency-converter',
    name: 'Live Currency Converter',
    route: '/currency-converter',
    categoryLabel: 'Converters',
    shortDescription: 'Convert INR, USD, EUR, GBP, AED, JPY and global currencies with live rate status.',
    keywords: ['currency', 'exchange rate', 'inr', 'usd', 'eur', 'forex', 'dollar to rupee'],
    synonyms: ['usd to inr', 'fx converter', 'money converter'],
    kind: 'studio',
  },
  {
    id: 'studio-math-lab',
    name: 'Mathematics Lab',
    route: '/math-lab',
    categoryLabel: 'Labs',
    shortDescription: 'Function graphing, matrices, numerical calculus, equation solver & precision controls.',
    keywords: ['math lab', 'graph', 'plot', 'matrix', 'calculus', 'integral', 'derivative'],
    synonyms: ['graphing calculator', 'algebra lab'],
    kind: 'studio',
  },
  {
    id: 'studio-finance-lab',
    name: 'Financial Simulation Lab',
    route: '/finance-lab',
    categoryLabel: 'Labs',
    shortDescription: 'Simulate loan schedules, inflation, break-even, sensitivity & scenario comparisons.',
    keywords: ['finance lab', 'simulation', 'amortization', 'sensitivity', 'break-even', 'cash flow'],
    synonyms: ['financial modeling', 'scenario analysis'],
    kind: 'studio',
  },
  {
    id: 'studio-data-analysis',
    name: 'Data Analysis Studio',
    route: '/data-analysis',
    categoryLabel: 'Analytics',
    shortDescription: 'Import CSV datasets, clean missing/duplicate rows, inspect statistics and charts.',
    keywords: ['data analysis', 'csv analysis', 'clean data', 'statistics', 'charts'],
    synonyms: ['dataset analyzer', 'csv explorer'],
    kind: 'studio',
  },
  {
    id: 'studio-ai-assistant',
    name: 'AI Calculation Assistant',
    route: '/ai-assistant',
    categoryLabel: 'Assistant',
    shortDescription: 'Translate natural-language questions into verified deterministic calculations.',
    keywords: ['ai', 'assistant', 'natural language', 'ask', 'formula help'],
    synonyms: ['ai math', 'smart assistant'],
    kind: 'studio',
  },
  {
    id: 'studio-formula-library',
    name: 'Formula Reference Library',
    route: '/formula-library',
    categoryLabel: 'Reference',
    shortDescription: 'Browse verified mathematical, financial, physics, and engineering formulas.',
    keywords: ['formula', 'library', 'equations', 'reference', 'cheat sheet'],
    synonyms: ['math formulas', 'physics formulas'],
    kind: 'studio',
  },
];

// Synonym expansion map for common user abbreviations & natural phrasing
const SYNONYM_MAP: Record<string, string[]> = {
  'home loan': ['emi', 'loan', 'home-loan-calculator'],
  'car loan': ['emi', 'loan', 'car-loan-calculator'],
  'monthly payment': ['emi'],
  'body mass': ['bmi'],
  'salary': ['income tax', 'tax', 'gst', 'salary-calculator'],
  'avg': ['statistics', 'mean', 'average'],
  'pct': ['percentage'],
  'std': ['standard deviation'],
  'fx': ['currency'],
  'forex': ['currency', 'pip'],
  'house': ['land', 'concrete', 'bricks', 'paint', 'emi'],
  'plot': ['land'],
  'hex': ['binary', 'hexadecimal'],
  'octal': ['binary', 'octal'],
  'compound': ['compound interest', 'cagr'],
};

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

export interface CustomSavedCalculator {
  id: string;
  name: string;
  description: string;
  categoryLabel: string;
  published: boolean;
}

export interface ImportedServerCalculator {
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  formula: string;
}

export function buildSearchIndex(
  unpublishedIds: string[] = [],
  customCalculators: CustomSavedCalculator[] = [],
  language = 'en',
  importedCalculators: ImportedServerCalculator[] = []
): SearchableDestination[] {
  const entries = getPublishedCatalogEntries(unpublishedIds);
  const calcItems: SearchableDestination[] = entries.map((c) => ({
    id: c.slug,
    catalogNumber: c.catalogNumber,
    name: c.name,
    route: language === 'en' ? `/calculators/${c.slug}/` : `/${language}/${c.category}/${c.slug}`,
    category: c.category,
    categoryLabel: c.categoryLabel,
    shortDescription: `${c.subcategory} (#${c.catalogNumber}) · ${c.categoryLabel}`,
    keywords: [c.category, c.subcategory.toLowerCase(), `#${c.catalogNumber}`, ...(c.longTail ? c.longTail.split(' ') : [])],
    synonyms: [c.slug.replace(/-/g, ' ')],
    kind: 'calculator',
  }));

  const importedItems: SearchableDestination[] = importedCalculators.map((c) => ({
    id: c.slug,
    name: c.name,
    route: language === 'en' ? `/calculators/${c.slug}/` : `/${language}/${c.category}/${c.slug}`,
    category: c.category,
    categoryLabel: c.categoryLabel || 'Imported',
    shortDescription: `Imported calculator (${c.formula})`,
    keywords: ['imported', c.category, c.name.toLowerCase()],
    synonyms: [c.slug.replace(/-/g, ' ')],
    kind: 'calculator',
  }));

  const customItems: SearchableDestination[] = customCalculators
    .filter((c) => c.published)
    .map((c) => ({
      id: `custom-${c.id}`,
      name: c.name,
      route: `/custom-calculator-builder?load=${encodeURIComponent(c.id)}`,
      categoryLabel: c.categoryLabel || 'Custom Calculator',
      shortDescription: c.description || 'User-created custom formula calculator.',
      keywords: [c.name.toLowerCase(), 'custom', 'user formula'],
      synonyms: [],
      kind: 'calculator',
    }));

  return [...calcItems, ...importedItems, ...customItems, ...STUDIO_DESTINATIONS];
}

export function searchRegistry(
  rawQuery: string,
  index: SearchableDestination[],
  limit = 15
): SearchMatch[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  // Direct catalog number lookup (#1 .. #2500)
  const numMatch = query.match(/^#?(\d{1,4})$/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    const exactNum = index.find((item) => item.catalogNumber === n);
    if (exactNum) {
      return [{ item: exactNum, score: 150, matchedKeyword: `#${n}` }];
    }
  }

  // Hindi/Hinglish transliteration alias matches
  const translitTargets = new Set<string>();
  for (const [alias, slugs] of Object.entries(TRANSLITERATION_ALIASES)) {
    if (alias === query || alias.startsWith(query) || query.includes(alias)) {
      slugs.forEach((s) => translitTargets.add(s));
    }
  }

  const expandedTerms = new Set<string>([query]);
  for (const [phrase, targets] of Object.entries(SYNONYM_MAP)) {
    if (query.includes(phrase) || phrase.startsWith(query)) {
      targets.forEach((t) => expandedTerms.add(t));
    }
  }

  const queryWords = query.split(/\s+/).filter(Boolean);
  const results: SearchMatch[] = [];

  for (const item of index) {
    const nameLower = item.name.toLowerCase();
    const catLower = item.categoryLabel.toLowerCase();
    const descLower = item.shortDescription.toLowerCase();
    let bestScore = 0;
    let matchedKeyword: string | undefined;

    if (translitTargets.has(item.id)) {
      bestScore = Math.max(bestScore, 115);
      matchedKeyword = `alias:${query}`;
    }

    // 1. Exact & prefix match on Name
    if (nameLower === query) {
      bestScore = Math.max(bestScore, 130);
    } else if (nameLower.startsWith(query)) {
      bestScore = Math.max(bestScore, 102);
    } else if (nameLower.includes(query)) {
      bestScore = Math.max(bestScore, 88);
    }

    // 2. Exact & partial match on ID / slug
    if (item.id.toLowerCase() === query) {
      bestScore = Math.max(bestScore, 118);
      matchedKeyword = item.id;
    } else if (item.id.toLowerCase().includes(query)) {
      bestScore = Math.max(bestScore, 82);
      matchedKeyword = item.id;
    }

    // 3. Keywords & Synonyms
    for (const kw of [...item.keywords, ...item.synonyms]) {
      const kwLow = kw.toLowerCase();
      if (kwLow === query) {
        bestScore = Math.max(bestScore, 96);
        matchedKeyword = kw;
      } else if (kwLow.startsWith(query)) {
        bestScore = Math.max(bestScore, 80);
        matchedKeyword = matchedKeyword || kw;
      } else if (kwLow.includes(query) || (kwLow.length >= 3 && query.includes(kwLow))) {
        bestScore = Math.max(bestScore, 68);
        matchedKeyword = matchedKeyword || kw;
      }
    }

    // 4. Expanded Synonym terms
    for (const term of expandedTerms) {
      if (term === query) continue;
      if (nameLower.includes(term) || item.id === term || item.keywords.some((k) => k.includes(term))) {
        bestScore = Math.max(bestScore, 76);
        matchedKeyword = matchedKeyword || term;
      }
    }

    // 5. Category match
    if (catLower.includes(query)) {
      bestScore = Math.max(bestScore, 55);
      matchedKeyword = matchedKeyword || item.categoryLabel;
    }

    // 6. Multi-word match across name + keywords + desc
    if (queryWords.length > 1) {
      const haystack = `${nameLower} ${catLower} ${descLower} ${item.keywords.join(' ')} ${item.synonyms.join(' ')}`.toLowerCase();
      const matchedCount = queryWords.filter((w) => haystack.includes(w)).length;
      if (matchedCount === queryWords.length) {
        bestScore = Math.max(bestScore, 84);
      } else if (matchedCount > 0) {
        bestScore = Math.max(bestScore, 36 + matchedCount * 10);
      }
    }

    if (bestScore > 0) {
      results.push({ item, score: bestScore, matchedKeyword });
    }
  }

  // Fast fuzzy fallback only if fewer than 5 results matched above (keeps 2,500-item search < 8ms)
  if (results.length < 5 && query.length >= 4) {
    const seen = new Set(results.map((r) => r.item.id));
    for (const item of index) {
      if (seen.has(item.id)) continue;
      const tokens = item.name.toLowerCase().split(/[\s/&()-]+/).filter((t) => t.length >= 4);
      let bestFuzzy = 0;
      let tokMatched = '';
      for (const tok of tokens) {
        if (Math.abs(tok.length - query.length) > 2) continue;
        const dist = levenshtein(query, tok);
        const maxAllowed = query.length >= 7 ? 2 : 1;
        if (dist <= maxAllowed) {
          const s = 62 - dist * 12;
          if (s > bestFuzzy) {
            bestFuzzy = s;
            tokMatched = `${tok} (fuzzy)`;
          }
        }
      }
      if (bestFuzzy > 0) {
        results.push({ item, score: bestFuzzy, matchedKeyword: tokMatched });
      }
    }
  }

  // Prefer lower catalogNumber on equal scores so flagship #1-#50 tools appear first
  results.sort(
    (a, b) =>
      b.score - a.score ||
      (a.item.catalogNumber ?? 9999) - (b.item.catalogNumber ?? 9999) ||
      a.item.name.localeCompare(b.item.name)
  );
  return results.slice(0, limit);
}

export { CATALOG_2500 };
