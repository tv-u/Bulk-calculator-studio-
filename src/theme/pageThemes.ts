import { isSupportedLanguage } from '../i18n/languages';

export interface PageThemeIdentity {
  id: string;
  label: string;
  primary: string;
  secondary: string;
  gradient: string;
  badgeText: string;
}

export const CATEGORY_THEMES: Record<string, PageThemeIdentity> = {
  finance: {
    id: 'finance',
    label: 'Emerald Green & Gold',
    primary: '#10b981',
    secondary: '#f59e0b',
    gradient: 'linear-gradient(135deg, #10b981 0%, #f59e0b 100%)',
    badgeText: '#34d399',
  },
  mathematics: {
    id: 'mathematics',
    label: 'Electric Blue & Cyan',
    primary: '#3b82f6',
    secondary: '#06b6d4',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
    badgeText: '#38bdf8',
  },
  health: {
    id: 'health',
    label: 'Coral Pink & Violet',
    primary: '#ec4899',
    secondary: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    badgeText: '#f472b6',
  },
  engineering: {
    id: 'engineering',
    label: 'Cyan & Deep Indigo',
    primary: '#06b6d4',
    secondary: '#6366f1',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
    badgeText: '#22d3ee',
  },
  construction: {
    id: 'construction',
    label: 'Amber Orange & Gold',
    primary: '#f97316',
    secondary: '#eab308',
    gradient: 'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
    badgeText: '#fb923c',
  },
  business: {
    id: 'business',
    label: 'Royal Indigo & Violet',
    primary: '#6366f1',
    secondary: '#a855f7',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    badgeText: '#818cf8',
  },
  education: {
    id: 'education',
    label: 'Purple & Rose',
    primary: '#8b5cf6',
    secondary: '#ec4899',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    badgeText: '#c084fc',
  },
  science: {
    id: 'science',
    label: 'Teal & Cobalt Blue',
    primary: '#14b8a6',
    secondary: '#3b82f6',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)',
    badgeText: '#2dd4bf',
  },
  technology: {
    id: 'technology',
    label: 'Emerald Neon & Sky',
    primary: '#22c55e',
    secondary: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #0ea5e9 100%)',
    badgeText: '#4ade80',
  },
  'daily-life': {
    id: 'daily-life',
    label: 'Sky Blue & Teal',
    primary: '#0ea5e9',
    secondary: '#14b8a6',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)',
    badgeText: '#38bdf8',
  },
  automotive: {
    id: 'automotive',
    label: 'Racing Crimson & Orange',
    primary: '#ef4444',
    secondary: '#f97316',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
    badgeText: '#f87171',
  },
  agriculture: {
    id: 'agriculture',
    label: 'Harvest Lime & Emerald',
    primary: '#65a30d',
    secondary: '#10b981',
    gradient: 'linear-gradient(135deg, #65a30d 0%, #10b981 100%)',
    badgeText: '#a3e635',
  },
  sports: {
    id: 'sports',
    label: 'Crimson Rose & Violet',
    primary: '#f43f5e',
    secondary: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #8b5cf6 100%)',
    badgeText: '#fb7185',
  },
  food: {
    id: 'food',
    label: 'Warm Amber & Berry',
    primary: '#d97706',
    secondary: '#ec4899',
    gradient: 'linear-gradient(135deg, #d97706 0%, #ec4899 100%)',
    badgeText: '#fbbf24',
  },
  legal: {
    id: 'legal',
    label: 'Slate Steel & Sapphire',
    primary: '#475569',
    secondary: '#3b82f6',
    gradient: 'linear-gradient(135deg, #475569 0%, #3b82f6 100%)',
    badgeText: '#94a3b8',
  },
};

export const PAGE_THEMES: Record<string, PageThemeIdentity> = {
  home: {
    id: 'home',
    label: 'Cosmic Blue & Electric Violet',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    badgeText: '#60a5fa',
  },
  dashboard: {
    id: 'dashboard',
    label: 'Indigo & Cyan',
    primary: '#6366f1',
    secondary: '#06b6d4',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
    badgeText: '#22d3ee',
  },
  calculators: {
    id: 'calculators',
    label: 'Purple & Magenta',
    primary: '#9333ea',
    secondary: '#ec4899',
    gradient: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
    badgeText: '#e879f9',
  },
  'math-lab': CATEGORY_THEMES.mathematics,
  'finance-lab': CATEGORY_THEMES.finance,
  'bulk-calculator': {
    id: 'bulk-calculator',
    label: 'Orange & Electric Cyan',
    primary: '#f97316',
    secondary: '#06b6d4',
    gradient: 'linear-gradient(135deg, #f97316 0%, #06b6d4 100%)',
    badgeText: '#fb923c',
  },
  'custom-calculator-builder': {
    id: 'custom-calculator-builder',
    label: 'Violet & Pink',
    primary: '#8b5cf6',
    secondary: '#ec4899',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    badgeText: '#f472b6',
  },
  'workflow-builder': {
    id: 'workflow-builder',
    label: 'Neon Cyan & Deep Blue',
    primary: '#06b6d4',
    secondary: '#1d4ed8',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #1d4ed8 100%)',
    badgeText: '#22d3ee',
  },
  'data-analysis': {
    id: 'data-analysis',
    label: 'Teal & Lime',
    primary: '#0d9488',
    secondary: '#84cc16',
    gradient: 'linear-gradient(135deg, #0d9488 0%, #84cc16 100%)',
    badgeText: '#a3e635',
  },
  'ai-assistant': {
    id: 'ai-assistant',
    label: 'Aurora Purple & Pink',
    primary: '#a855f7',
    secondary: '#f43f5e',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #f43f5e 100%)',
    badgeText: '#c084fc',
  },
  'unit-converter': {
    id: 'unit-converter',
    label: 'Ocean Blue & Aqua',
    primary: '#0284c7',
    secondary: '#22d3ee',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #22d3ee 100%)',
    badgeText: '#38bdf8',
  },
  'currency-converter': CATEGORY_THEMES.finance,
  'formula-library': {
    id: 'formula-library',
    label: 'Deep Violet & Lavender',
    primary: '#6d28d9',
    secondary: '#a78bfa',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)',
    badgeText: '#c4b5fd',
  },
  reports: {
    id: 'reports',
    label: 'Burgundy & Rose',
    primary: '#be123c',
    secondary: '#fb7185',
    gradient: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)',
    badgeText: '#fda4af',
  },
  developer: CATEGORY_THEMES.technology,
  settings: {
    id: 'settings',
    label: 'Silver & Blue',
    primary: '#3b82f6',
    secondary: '#64748b',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #64748b 100%)',
    badgeText: '#93c5fd',
  },
  admin: {
    id: 'admin',
    label: 'Crimson & Electric Orange',
    primary: '#dc2626',
    secondary: '#f97316',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
    badgeText: '#f87171',
  },
  help: {
    id: 'help',
    label: 'Sky Blue & Indigo',
    primary: '#0ea5e9',
    secondary: '#6366f1',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
    badgeText: '#38bdf8',
  },
  about: {
    id: 'about',
    label: 'Royal Purple & Champagne',
    primary: '#7c3aed',
    secondary: '#d97706',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #d97706 100%)',
    badgeText: '#c4b5fd',
  },
  contact: {
    id: 'contact',
    label: 'Teal & Coral',
    primary: '#0d9488',
    secondary: '#f43f5e',
    gradient: 'linear-gradient(135deg, #0d9488 0%, #f43f5e 100%)',
    badgeText: '#2dd4bf',
  },
  'not-found': {
    id: 'not-found',
    label: 'Cosmic Purple & Neon Blue',
    primary: '#9333ea',
    secondary: '#2563eb',
    gradient: 'linear-gradient(135deg, #9333ea 0%, #2563eb 100%)',
    badgeText: '#a855f7',
  },
};

export function resolveCategoryTheme(category: string): PageThemeIdentity {
  return CATEGORY_THEMES[category] || PAGE_THEMES.calculators;
}

export function resolvePageTheme(pathname: string): PageThemeIdentity {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return PAGE_THEMES.home;

  // Check localized /{lang}/{category}/{slug?}
  if (isSupportedLanguage(segments[0])) {
    if (segments.length === 1) return PAGE_THEMES.home;
    if (CATEGORY_THEMES[segments[1]]) return CATEGORY_THEMES[segments[1]];
  }

  if (pathname.startsWith('/categories/')) {
    const cat = segments[1];
    if (cat && CATEGORY_THEMES[cat]) return CATEGORY_THEMES[cat];
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/saved') || pathname.startsWith('/history') || pathname.startsWith('/compare')) {
    return PAGE_THEMES.dashboard;
  }
  if (pathname.startsWith('/calculators') || pathname.startsWith('/categories')) return PAGE_THEMES.calculators;
  if (pathname.startsWith('/math-lab')) return PAGE_THEMES['math-lab'];
  if (pathname.startsWith('/finance-lab')) return PAGE_THEMES['finance-lab'];
  if (pathname.startsWith('/bulk-calculator')) return PAGE_THEMES['bulk-calculator'];
  if (pathname.startsWith('/custom-calculator-builder')) return PAGE_THEMES['custom-calculator-builder'];
  if (pathname.startsWith('/workflow-builder')) return PAGE_THEMES['workflow-builder'];
  if (pathname.startsWith('/data-analysis')) return PAGE_THEMES['data-analysis'];
  if (pathname.startsWith('/ai-assistant')) return PAGE_THEMES['ai-assistant'];
  if (pathname.startsWith('/unit-converter')) return PAGE_THEMES['unit-converter'];
  if (pathname.startsWith('/currency-converter')) return PAGE_THEMES['currency-converter'];
  if (pathname.startsWith('/formula-library')) return PAGE_THEMES['formula-library'];
  if (pathname.startsWith('/reports')) return PAGE_THEMES.reports;
  if (pathname.startsWith('/developer')) return PAGE_THEMES.developer;
  if (pathname.startsWith('/settings')) return PAGE_THEMES.settings;
  if (pathname.startsWith('/admin')) return PAGE_THEMES.admin;
  if (pathname.startsWith('/help')) return PAGE_THEMES.help;
  if (pathname.startsWith('/about')) return PAGE_THEMES.about;
  if (pathname.startsWith('/contact') || pathname.startsWith('/privacy') || pathname.startsWith('/terms') || pathname.startsWith('/disclaimer')) {
    return PAGE_THEMES.contact;
  }
  return PAGE_THEMES['not-found'];
}
