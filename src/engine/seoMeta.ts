export const SITE_ORIGIN = 'https://bulk-calculator-studio.pages.dev';

export function buildCalculatorPermalink(slug: string): string {
  return `/calculators/${slug}/`;
}

export function buildCalculatorCanonical(slug: string): string {
  return `${SITE_ORIGIN}/calculators/${slug}/`;
}

export interface SeoMetaInput {
  name: string;
  slug: string;
  category: string;
  categoryLabel: string;
  subcategory?: string;
  longTail?: string;
}

export function buildCalculatorSeoMeta(
  entry: SeoMetaInput,
  fallbackDesc?: string
): {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
} {
  const name = entry.name.trim();
  const title =
    name.length <= 28
      ? `${name} – Free Online Tool | BulkCalc`
      : name.length <= 46
      ? `${name} | BulkCalc`
      : `${name} – BulkCalc`;

  const sub = (entry.subcategory || entry.categoryLabel || entry.category).trim();
  const longTailPhrase = entry.longTail
    ? entry.longTail.trim()
    : `${sub.toLowerCase()} formula with step-by-step breakdown`;

  let description = `Calculate ${name.toLowerCase()} results with ${longTailPhrase}. Free instant online tool with PDF & CSV export at BulkCalc.`;
  if (description.length > 160) {
    description = `Free ${name}: ${longTailPhrase}. Instant step-by-step results, chart breakdown & PDF/CSV export at BulkCalc.`;
  }
  if (description.length > 160 && fallbackDesc) {
    description = fallbackDesc.slice(0, 157).trim() + (fallbackDesc.length > 157 ? '...' : '');
  }
  if (description.length > 160) {
    description = description.slice(0, 157).trimEnd() + '...';
  }

  const nLow = name.toLowerCase();
  const kwList = [
    nLow,
    `${nLow} online free no signup`,
    `${nLow} step by step formula`,
    entry.longTail ? `${nLow} ${entry.longTail}` : `${nLow} ${sub.toLowerCase()}`,
    `${nLow} pdf csv export`,
    `${entry.category} calculator`,
  ];

  return {
    title,
    description,
    keywords: [...new Set(kwList)].join(', '),
    canonicalUrl: buildCalculatorCanonical(entry.slug),
  };
}
