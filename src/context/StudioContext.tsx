import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { NumberLocaleMode } from '../engine/formatters';
import type { WorkflowEdge, WorkflowNode } from '../engine/workflowEngine';
import {
  buildSearchIndex,
  type ImportedServerCalculator,
  type SearchableDestination,
} from '../engine/searchEngine';
import {
  EN_BASE_MESSAGES,
  getLanguageSpec,
  isSupportedLanguage,
  type LanguageSpec,
} from '../i18n/languages';

export type ThemePreset =
  | 'cosmic'
  | 'aurora'
  | 'midnight'
  | 'crystal'
  | 'neon'
  | 'premium-light'
  | 'premium-dark';

export type GlassStyle =
  | 'crystal'
  | 'frosted'
  | 'aurora'
  | 'neon'
  | 'midnight'
  | 'softlight'
  | 'transparent';

export type DisplayDensity = 'compact' | 'comfortable' | 'spacious';

export interface LightControlSettings {
  theme: ThemePreset;
  glassStyle: GlassStyle;
  ambientBrightness: number;
  panelBrightness: number;
  bgBrightness: number;
  glassTransparency: number;
  blurIntensity: number;
  glowIntensity: number;
  borderLighting: number;
  accentIntensity: number;
  gradientIntensity: number;
  backgroundMode: 'cosmic-stars' | 'aurora-mesh' | 'minimal-grid';
  highlightColor: string;
  neonIntensity: number;
  animationIntensity: number;
  particleIntensity: number;
  starSpeed: number;
  parallaxIntensity: number;
  transitionSpeed: number;
  density: DisplayDensity;
  highContrast: boolean;
  reducedEffects: boolean;
}

export const DEFAULT_LIGHT_SETTINGS: LightControlSettings = {
  theme: 'cosmic',
  glassStyle: 'crystal',
  ambientBrightness: 1,
  panelBrightness: 1,
  bgBrightness: 1,
  glassTransparency: 0.74,
  blurIntensity: 14,
  glowIntensity: 0.45,
  borderLighting: 0.16,
  accentIntensity: 1,
  gradientIntensity: 0.85,
  backgroundMode: 'cosmic-stars',
  highlightColor: '',
  neonIntensity: 0.4,
  animationIntensity: 1,
  particleIntensity: 0.75,
  starSpeed: 1,
  parallaxIntensity: 0.6,
  transitionSpeed: 200,
  density: 'comfortable',
  highContrast: false,
  reducedEffects: false,
};

export const THEME_PRESETS: Record<ThemePreset, Partial<LightControlSettings> & { isDark: boolean; label: string }> = {
  cosmic: { label: 'Cosmic', isDark: true, glassStyle: 'crystal', backgroundMode: 'cosmic-stars', glowIntensity: 0.5, neonIntensity: 0.45 },
  aurora: { label: 'Aurora', isDark: true, glassStyle: 'aurora', backgroundMode: 'aurora-mesh', glowIntensity: 0.65, gradientIntensity: 1 },
  midnight: { label: 'Midnight', isDark: true, glassStyle: 'midnight', backgroundMode: 'cosmic-stars', bgBrightness: 0.75, glowIntensity: 0.3 },
  crystal: { label: 'Crystal', isDark: true, glassStyle: 'transparent', backgroundMode: 'aurora-mesh', blurIntensity: 18, glassTransparency: 0.55 },
  neon: { label: 'Neon', isDark: true, glassStyle: 'neon', backgroundMode: 'cosmic-stars', neonIntensity: 0.9, glowIntensity: 0.85 },
  'premium-light': { label: 'Premium Light', isDark: false, glassStyle: 'softlight', backgroundMode: 'minimal-grid', glowIntensity: 0.2, neonIntensity: 0.1 },
  'premium-dark': { label: 'Premium Dark', isDark: true, glassStyle: 'frosted', backgroundMode: 'minimal-grid', glowIntensity: 0.3, neonIntensity: 0.2 },
};

export interface SavedCalculationItem {
  id: string;
  calculatorId: string;
  calculatorName: string;
  inputs: Record<string, number | string>;
  primaryLabel: string;
  primaryValue: string;
  breakdown: Array<{ label: string; value: string }>;
  createdAt: string;
}

export interface CustomCalculatorFieldDef {
  key: string;
  label: string;
  type: 'number' | 'select';
  defaultValue: number;
  unit?: string;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: number }>;
}

export interface CustomCalculatorOutputDef {
  id: string;
  label: string;
  formula: string;
  unit?: string;
}

export interface CustomCalculatorConfig {
  id: string;
  name: string;
  description: string;
  categoryLabel: string;
  published: boolean;
  inputs: CustomCalculatorFieldDef[];
  outputs: CustomCalculatorOutputDef[];
  updatedAt: string;
}

export interface SavedWorkflowConfig {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  updatedAt: string;
}

export interface GeneratedReport {
  id: string;
  title: string;
  source: string;
  createdAt: string;
  inputs: Array<{ label: string; value: string }>;
  formulas: string[];
  assumptions: string;
  results: Array<{ label: string; value: string }>;
  warnings: string[];
}

export interface PublicAdConfig {
  enabled: boolean;
  directLink: string;
  frequencyCapMinutes: number;
  placements: {
    headerBanner: boolean;
    homeSponsoredCard: boolean;
    resultPromoCta: boolean;
    dashboardBanner: boolean;
    contentPageCard: boolean;
    footerSponsored: boolean;
  };
  publisherScriptConfigured: boolean;
}

export interface ImportedCalculatorFull extends ImportedServerCalculator {
  defaultInputA: number;
  defaultInputB: number;
  labelA: string;
  labelB: string;
  unit?: string;
}

interface ToastMessage {
  id: string;
  text: string;
  kind: 'info' | 'success' | 'error';
}

interface StudioContextValue {
  light: LightControlSettings;
  updateLight: (patch: Partial<LightControlSettings>) => void;
  applyThemePreset: (preset: ThemePreset) => void;
  resetLightSettings: () => void;
  saveLightSettings: () => void;
  isLightStudioOpen: boolean;
  setLightStudioOpen: (open: boolean) => void;

  language: string;
  languageSpec: LanguageSpec;
  setLanguage: (langCode: string) => void;
  t: (key: string, fallback?: string) => string;

  locale: NumberLocaleMode;
  setLocale: (loc: NumberLocaleMode) => void;
  currency: string;
  setCurrency: (cur: string) => void;

  savedCalculations: SavedCalculationItem[];
  saveCalculation: (item: Omit<SavedCalculationItem, 'id' | 'createdAt'>) => void;
  deleteSavedCalculation: (id: string) => void;
  history: SavedCalculationItem[];
  recordHistory: (item: Omit<SavedCalculationItem, 'id' | 'createdAt'>) => void;
  clearHistory: () => void;

  favorites: string[];
  toggleFavorite: (calculatorId: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  usageCounts: Record<string, number>;

  customCalculators: CustomCalculatorConfig[];
  saveCustomCalculator: (cfg: CustomCalculatorConfig) => void;
  deleteCustomCalculator: (id: string) => void;

  importedCalculators: ImportedCalculatorFull[];

  savedWorkflows: SavedWorkflowConfig[];
  saveWorkflow: (wf: SavedWorkflowConfig) => void;
  deleteWorkflow: (id: string) => void;

  reports: GeneratedReport[];
  addReport: (rep: Omit<GeneratedReport, 'id' | 'createdAt'>) => void;
  deleteReport: (id: string) => void;

  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;

  unpublishedCalculators: string[];
  adConfig: PublicAdConfig;
  refreshPublicConfig: () => Promise<void>;
  searchIndex: SearchableDestination[];

  toasts: ToastMessage[];
  showToast: (text: string, kind?: 'info' | 'success' | 'error') => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Storage quota or private mode
  }
}

const DEFAULT_AD_CONFIG: PublicAdConfig = {
  enabled: true,
  directLink: 'https://uplcm.com/4/12282219',
  frequencyCapMinutes: 15,
  placements: {
    headerBanner: true,
    homeSponsoredCard: true,
    resultPromoCta: true,
    dashboardBanner: true,
    contentPageCard: true,
    footerSponsored: true,
  },
  publisherScriptConfigured: false,
};

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [light, setLight] = useState<LightControlSettings>(() =>
    loadJson('bcs_light_settings', DEFAULT_LIGHT_SETTINGS)
  );
  const [isLightStudioOpen, setLightStudioOpen] = useState(false);

  const [language, setLanguageState] = useState<string>(() => {
    const stored = loadJson<string>('bcs_language', 'en');
    return isSupportedLanguage(stored) ? stored : 'en';
  });
  const [messages, setMessages] = useState<Record<string, string>>(EN_BASE_MESSAGES);

  const [locale, setLocaleState] = useState<NumberLocaleMode>(() =>
    loadJson('bcs_locale', 'en-IN')
  );
  const [currency, setCurrencyState] = useState<string>(() =>
    loadJson('bcs_currency', 'INR')
  );

  const [savedCalculations, setSavedCalculations] = useState<SavedCalculationItem[]>(() =>
    loadJson('bcs_saved_calcs', [])
  );
  const [history, setHistory] = useState<SavedCalculationItem[]>(() =>
    loadJson('bcs_history', [])
  );
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadJson('bcs_favorites', ['emi-calculator', 'percentage-calculator', 'bmi-calculator', 'sip-calculator'])
  );
  const [compareIds, setCompareIds] = useState<string[]>(() =>
    loadJson('bcs_compare', [])
  );
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>(() =>
    loadJson('bcs_usage', {})
  );
  const [customCalculators, setCustomCalculators] = useState<CustomCalculatorConfig[]>(() =>
    loadJson('bcs_custom_calcs', [])
  );
  const [importedCalculators, setImportedCalculators] = useState<ImportedCalculatorFull[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflowConfig[]>(() =>
    loadJson('bcs_workflows', [])
  );
  const [reports, setReports] = useState<GeneratedReport[]>(() =>
    loadJson('bcs_reports', [])
  );
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    loadJson('bcs_recent_searches', [])
  );

  const [unpublishedCalculators, setUnpublishedCalculators] = useState<string[]>([]);
  const [adConfig, setAdConfig] = useState<PublicAdConfig>(DEFAULT_AD_CONFIG);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const languageSpec = useMemo(() => getLanguageSpec(language), [language]);

  // Apply dir="rtl|ltr" & lang attribute on <html> + fetch /messages/{code}.json
  useEffect(() => {
    const spec = getLanguageSpec(language);
    document.documentElement.setAttribute('lang', spec.code);
    document.documentElement.setAttribute('dir', spec.dir);

    if (spec.code === 'en') {
      setMessages(EN_BASE_MESSAGES);
      return;
    }

    let cancelled = false;
    fetch(`/messages/${encodeURIComponent(spec.code)}.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') {
          setMessages({ ...EN_BASE_MESSAGES, ...(data as Record<string, string>) });
        }
      })
      .catch(() => {
        if (!cancelled) setMessages(EN_BASE_MESSAGES);
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  const setLanguage = useCallback((langCode: string) => {
    const clean = isSupportedLanguage(langCode) ? langCode : 'en';
    setLanguageState(clean);
    saveJson('bcs_language', clean);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => messages[key] || EN_BASE_MESSAGES[key] || fallback || key,
    [messages]
  );

  const showToast = useCallback((text: string, kind: 'info' | 'success' | 'error' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, text, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const refreshPublicConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config/public');
      if (!res.ok) return;
      const data = (await res.json()) as {
        unpublishedCalculators?: string[];
        importedCalculators?: ImportedCalculatorFull[];
        ads?: PublicAdConfig;
      };
      if (Array.isArray(data.unpublishedCalculators)) {
        setUnpublishedCalculators(data.unpublishedCalculators);
      }
      if (Array.isArray(data.importedCalculators)) {
        setImportedCalculators(data.importedCalculators);
      }
      if (data.ads) {
        setAdConfig({
          ...DEFAULT_AD_CONFIG,
          ...data.ads,
          placements: {
            ...DEFAULT_AD_CONFIG.placements,
            ...(data.ads.placements || {}),
          },
        });
      }
    } catch {
      // Keep default offline config gracefully
    }
  }, []);

  useEffect(() => {
    void refreshPublicConfig();
  }, [refreshPublicConfig]);

  // Apply Light Control Studio variables globally to <html>
  useEffect(() => {
    const root = document.documentElement;
    const isDark = THEME_PRESETS[light.theme]?.isDark ?? true;
    root.classList.toggle('dark', isDark);
    root.setAttribute('data-density', light.density);
    root.classList.toggle('high-contrast', light.highContrast);
    root.classList.toggle('reduced-effects', light.reducedEffects);

    const glassClasses = ['crystal', 'frosted', 'aurora', 'neon', 'midnight', 'softlight', 'transparent'];
    glassClasses.forEach((g) => root.classList.remove(`glass-style-${g}`));
    root.classList.add(`glass-style-${light.glassStyle}`);

    root.style.setProperty('--ambient-brightness', String(light.ambientBrightness));
    root.style.setProperty('--panel-brightness', String(light.panelBrightness));
    root.style.setProperty('--bg-brightness', String(light.bgBrightness));
    root.style.setProperty('--glass-opacity', String(light.glassTransparency));
    root.style.setProperty('--glass-blur', `${light.blurIntensity}px`);
    root.style.setProperty('--glow-intensity', String(light.glowIntensity));
    root.style.setProperty('--border-light', String(light.borderLighting));
    root.style.setProperty('--accent-intensity', String(light.accentIntensity));
    root.style.setProperty('--gradient-intensity', String(light.gradientIntensity));
    root.style.setProperty('--neon-intensity', String(light.neonIntensity));
    root.style.setProperty('--transition-ms', `${light.transitionSpeed}ms`);
  }, [light]);

  const updateLight = useCallback((patch: Partial<LightControlSettings>) => {
    setLight((prev) => {
      const next = { ...prev, ...patch };
      saveJson('bcs_light_settings', next);
      return next;
    });
  }, []);

  const applyThemePreset = useCallback((preset: ThemePreset) => {
    const def = THEME_PRESETS[preset];
    setLight((prev) => {
      const next: LightControlSettings = {
        ...prev,
        theme: preset,
        glassStyle: def.glassStyle ?? prev.glassStyle,
        backgroundMode: def.backgroundMode ?? prev.backgroundMode,
        glowIntensity: def.glowIntensity ?? prev.glowIntensity,
        neonIntensity: def.neonIntensity ?? prev.neonIntensity,
        bgBrightness: def.bgBrightness ?? 1,
        blurIntensity: def.blurIntensity ?? prev.blurIntensity,
        glassTransparency: def.glassTransparency ?? prev.glassTransparency,
        gradientIntensity: def.gradientIntensity ?? prev.gradientIntensity,
      };
      saveJson('bcs_light_settings', next);
      return next;
    });
  }, []);

  const resetLightSettings = useCallback(() => {
    setLight(DEFAULT_LIGHT_SETTINGS);
    saveJson('bcs_light_settings', DEFAULT_LIGHT_SETTINGS);
    showToast('Light Control Studio restored to defaults.', 'info');
  }, [showToast]);

  const saveLightSettings = useCallback(() => {
    saveJson('bcs_light_settings', light);
    showToast('Visual preferences saved locally.', 'success');
  }, [light, showToast]);

  const setLocale = useCallback((loc: NumberLocaleMode) => {
    setLocaleState(loc);
    saveJson('bcs_locale', loc);
  }, []);

  const setCurrency = useCallback((cur: string) => {
    setCurrencyState(cur);
    saveJson('bcs_currency', cur);
  }, []);

  const saveCalculation = useCallback(
    (item: Omit<SavedCalculationItem, 'id' | 'createdAt'>) => {
      const entry: SavedCalculationItem = {
        ...item,
        id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      setSavedCalculations((prev) => {
        const next = [entry, ...prev].slice(0, 100);
        saveJson('bcs_saved_calcs', next);
        return next;
      });
      showToast('Calculation saved to workspace.', 'success');
    },
    [showToast]
  );

  const deleteSavedCalculation = useCallback((id: string) => {
    setSavedCalculations((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveJson('bcs_saved_calcs', next);
      return next;
    });
    setCompareIds((prev) => {
      const next = prev.filter((x) => x !== id);
      saveJson('bcs_compare', next);
      return next;
    });
  }, []);

  const recordHistory = useCallback((item: Omit<SavedCalculationItem, 'id' | 'createdAt'>) => {
    const entry: SavedCalculationItem = {
      ...item,
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 120);
      saveJson('bcs_history', next);
      return next;
    });
    setUsageCounts((prev) => {
      const next = { ...prev, [item.calculatorId]: (prev[item.calculatorId] || 0) + 1 };
      saveJson('bcs_usage', next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveJson('bcs_history', []);
    showToast('Calculation history cleared.', 'info');
  }, [showToast]);

  const toggleFavorite = useCallback((calculatorId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(calculatorId)
        ? prev.filter((id) => id !== calculatorId)
        : [calculatorId, ...prev];
      saveJson('bcs_favorites', next);
      return next;
    });
  }, []);

  const toggleCompare = useCallback(
    (id: string) => {
      setCompareIds((prev) => {
        if (prev.includes(id)) {
          const next = prev.filter((x) => x !== id);
          saveJson('bcs_compare', next);
          return next;
        }
        if (prev.length >= 4) {
          showToast('You can compare up to 4 calculations side by side.', 'info');
          return prev;
        }
        const next = [...prev, id];
        saveJson('bcs_compare', next);
        return next;
      });
    },
    [showToast]
  );

  const saveCustomCalculator = useCallback(
    (cfg: CustomCalculatorConfig) => {
      setCustomCalculators((prev) => {
        const exists = prev.some((c) => c.id === cfg.id);
        const next = exists ? prev.map((c) => (c.id === cfg.id ? cfg : c)) : [cfg, ...prev];
        saveJson('bcs_custom_calcs', next);
        return next;
      });
      showToast(`Saved custom calculator "${cfg.name}".`, 'success');
    },
    [showToast]
  );

  const deleteCustomCalculator = useCallback((id: string) => {
    setCustomCalculators((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveJson('bcs_custom_calcs', next);
      return next;
    });
  }, []);

  const saveWorkflow = useCallback(
    (wf: SavedWorkflowConfig) => {
      setSavedWorkflows((prev) => {
        const exists = prev.some((w) => w.id === wf.id);
        const next = exists ? prev.map((w) => (w.id === wf.id ? wf : w)) : [wf, ...prev];
        saveJson('bcs_workflows', next);
        return next;
      });
      showToast(`Workflow "${wf.name}" saved.`, 'success');
    },
    [showToast]
  );

  const deleteWorkflow = useCallback((id: string) => {
    setSavedWorkflows((prev) => {
      const next = prev.filter((w) => w.id !== id);
      saveJson('bcs_workflows', next);
      return next;
    });
  }, []);

  const addReport = useCallback(
    (rep: Omit<GeneratedReport, 'id' | 'createdAt'>) => {
      const full: GeneratedReport = {
        ...rep,
        id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      setReports((prev) => {
        const next = [full, ...prev].slice(0, 60);
        saveJson('bcs_reports', next);
        return next;
      });
      showToast('Report generated and stored in Reports Center.', 'success');
    },
    [showToast]
  );

  const deleteReport = useCallback((id: string) => {
    setReports((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveJson('bcs_reports', next);
      return next;
    });
  }, []);

  const addRecentSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((x) => x.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      saveJson('bcs_recent_searches', next);
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    saveJson('bcs_recent_searches', []);
  }, []);

  const searchIndex = useMemo(
    () => buildSearchIndex(unpublishedCalculators, customCalculators, language, importedCalculators),
    [unpublishedCalculators, customCalculators, language, importedCalculators]
  );

  const value: StudioContextValue = {
    light,
    updateLight,
    applyThemePreset,
    resetLightSettings,
    saveLightSettings,
    isLightStudioOpen,
    setLightStudioOpen,
    language,
    languageSpec,
    setLanguage,
    t,
    locale,
    setLocale,
    currency,
    setCurrency,
    savedCalculations,
    saveCalculation,
    deleteSavedCalculation,
    history,
    recordHistory,
    clearHistory,
    favorites,
    toggleFavorite,
    compareIds,
    toggleCompare,
    usageCounts,
    customCalculators,
    saveCustomCalculator,
    deleteCustomCalculator,
    importedCalculators,
    savedWorkflows,
    saveWorkflow,
    deleteWorkflow,
    reports,
    addReport,
    deleteReport,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    unpublishedCalculators,
    adConfig,
    refreshPublicConfig,
    searchIndex,
    toasts,
    showToast,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
};

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider');
  return ctx;
}
