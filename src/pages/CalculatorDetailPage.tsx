import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Check,
  Copy,
  Download,
  FileDown,
  FileText,
  Heart,
  Radio,
  RotateCcw,
  Share2,
} from 'lucide-react';
import {
  CATALOG_2500,
  CATALOG_BY_SLUG,
  resolveCalculatorBySlugAsync,
  resolveCatalogEntryMeta,
} from '../engine/catalogResolver';
import type { CalculatorDefinition, CalculatorResult } from '../engine/calculatorTypes';
import { evaluateSafeFormula } from '../engine/safeMath';
import { resolveCategoryTheme } from '../theme/pageThemes';
import { useStudio } from '../context/StudioContext';
import { DocumentHead } from '../components/seo/DocumentHead';
import {
  CalculatorResultReveal,
  CosmicEntrance,
  LiquidGlassReveal,
  MagneticButton,
} from '../components/motion/MotionLibrary';
import { SimpleBarChart } from '../components/charts/SimpleChart';
import { MonetagAdSlot } from '../components/ads/MonetagAdSlot';
import { QuickCalculatorBar } from '../components/calculators/QuickCalculatorBar';

interface LiveToolResponse {
  available: boolean;
  lookupType?: string;
  domain?: string;
  timestamp?: string;
  summary?: string;
  details?: Record<string, unknown>;
  error?: string;
}

export const CalculatorDetailPage: React.FC = () => {
  const { slug, lang } = useParams<{ slug: string; category?: string; lang?: string }>();
  const [searchParams] = useSearchParams();
  const {
    locale,
    currency,
    language,
    unpublishedCalculators,
    importedCalculators,
    favorites,
    toggleFavorite,
    saveCalculation,
    recordHistory,
    addReport,
    showToast,
    t,
  } = useStudio();

  const activeLang = lang || language || 'en';
  const [calc, setCalc] = useState<CalculatorDefinition | undefined>(undefined);
  const [loadingCalc, setLoadingCalc] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setCalc(undefined);
      return;
    }
    const imported = importedCalculators.find((ic) => ic.slug === slug);
    if (imported) {
      setCalc({
        id: imported.slug,
        slug: imported.slug,
        name: imported.name,
        shortDescription: `${imported.name} — admin-imported deterministic formula calculator.`,
        category: (imported.category as any) || 'business',
        categoryLabel: imported.categoryLabel || 'Imported',
        keywords: [imported.name.toLowerCase(), 'imported'],
        synonyms: [imported.slug.replace(/-/g, ' ')],
        formulaDisplay: imported.formula,
        explanation: `Evaluated safely via AST expression parser: ${imported.formula}`,
        inputs: [
          { key: 'a', label: imported.labelA || 'Input A (a)', type: 'number', defaultValue: imported.defaultInputA ?? 100, step: 0.1 },
          { key: 'b', label: imported.labelB || 'Input B (b)', type: 'number', defaultValue: imported.defaultInputB ?? 10, step: 0.1 },
        ],
        relatedIds: [],
        compute: (vals) => {
          const a = Number(vals.a ?? 0);
          const b = Number(vals.b ?? 0);
          const out = evaluateSafeFormula(imported.formula, { a, b });
          const formatted = `${Number(out.toFixed(4))}${imported.unit ? ` ${imported.unit}` : ''}`;
          return {
            primary: { label: 'Computed Result', value: out, formatted, unit: imported.unit },
            breakdown: [
              { label: imported.labelA || 'a', value: a, formatted: String(a) },
              { label: imported.labelB || 'b', value: b, formatted: String(b) },
            ],
            steps: [`${imported.formula} with a=${a}, b=${b} -> ${formatted}`],
          };
        },
      });
      setLoadingCalc(false);
      return;
    }

    setLoadingCalc(true);
    void resolveCalculatorBySlugAsync(slug)
      .then((loaded) => {
        if (!cancelled) {
          setCalc(loaded);
          setLoadingCalc(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCalc(undefined);
          setLoadingCalc(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, importedCalculators]);

  const isHidden = useMemo(() => {
    if (!calc) return false;
    return (
      unpublishedCalculators.includes(calc.id) ||
      (calc.slug ? unpublishedCalculators.includes(calc.slug) : false)
    );
  }, [calc, unpublishedCalculators]);

  const [values, setValues] = useState<Record<string, number | string>>({});
  const [copied, setCopied] = useState(false);

  // Live Network Tool state
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveResult, setLiveResult] = useState<LiveToolResponse | null>(null);

  useEffect(() => {
    if (!calc) return;
    const init: Record<string, number | string> = {};
    for (const f of calc.inputs) {
      const qp = searchParams.get(f.key);
      if (qp !== null) {
        init[f.key] = f.type === 'number' ? Number(qp) : qp;
      } else {
        init[f.key] = f.defaultValue;
      }
    }
    setValues(init);
    setLiveResult(null);
  }, [calc, searchParams]);

  const { result, error } = useMemo<{ result: CalculatorResult | null; error: string | null }>(() => {
    if (!calc || isHidden) return { result: null, error: null };
    if (Object.keys(values).length === 0) return { result: null, error: null };
    try {
      const res = calc.compute(values, { locale, currency });
      return { result: res, error: null };
    } catch (err) {
      return {
        result: null,
        error: err instanceof Error ? err.message : 'Unable to compute with current inputs.',
      };
    }
  }, [calc, isHidden, values, locale, currency]);

  const categoryPeers = useMemo(() => {
    if (!calc) return [];
    const currentSlug = calc.slug || calc.id;
    return CATALOG_2500.filter(
      (c) => c.category === calc.category && c.slug !== currentSlug && !unpublishedCalculators.includes(c.slug)
    ).slice(0, 6);
  }, [calc, unpublishedCalculators]);

  if (loadingCalc && !calc) {
    return (
      <LiquidGlassReveal className="p-8 text-center">
        <p className="text-sm text-slate-500">Loading precision calculator engine...</p>
      </LiquidGlassReveal>
    );
  }

  if (!calc || isHidden) {
    return (
      <LiquidGlassReveal className="p-8 text-center">
        <DocumentHead
          title="Calculator Not Found – BULK CALCULATOR STUDIO"
          description="The requested calculator could not be found or is currently unpublished."
          noIndex
        />
        <h1 className="font-display text-2xl font-bold">Calculator Unavailable</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This calculator does not exist or has been unpublished by the administrator.
        </p>
        <Link to="/calculators" className="mt-4 inline-block">
          <MagneticButton variant="primary">Browse All 2,500 Calculators</MagneticButton>
        </Link>
      </LiquidGlassReveal>
    );
  }

  const categoryTheme = resolveCategoryTheme(calc.category);
  const isFav = favorites.includes(calc.id);
  const related = (calc.relatedIds || [])
    .map((id) => CATALOG_BY_SLUG.get(id) || resolveCatalogEntryMeta(id))
    .filter(Boolean)
    .slice(0, 4);

  const handleReset = () => {
    const resetVals: Record<string, number | string> = {};
    for (const f of calc.inputs) resetVals[f.key] = f.defaultValue;
    setValues(resetVals);
    setLiveResult(null);
    showToast('Inputs reset to defaults.', 'info');
  };

  const handleRunLiveTool = async () => {
    setLiveLoading(true);
    setLiveResult(null);
    try {
      const res = await fetch('/api/live-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: String(values.domain || 'example.com'),
          lookupType: String(values.lookupType || 'dns'),
        }),
      });
      const data = (await res.json()) as LiveToolResponse;
      setLiveResult(data);
      if (!data.available) {
        showToast(data.error || 'Live service unavailable.', 'error');
      }
    } catch {
      setLiveResult({ available: false, error: 'Live tool endpoint unreachable while offline.' });
    } finally {
      setLiveLoading(false);
    }
  };

  const handleCalculateLog = () => {
    if (!result) return;
    recordHistory({
      calculatorId: calc.id,
      calculatorName: calc.name,
      inputs: values,
      primaryLabel: result.primary.label,
      primaryValue: result.primary.formatted,
      breakdown: result.breakdown.map((b) => ({ label: b.label, value: b.formatted })),
    });
    showToast('Logged calculation to History.', 'success');
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      calculatorId: calc.id,
      calculatorName: calc.name,
      inputs: values,
      primaryLabel: result.primary.label,
      primaryValue: result.primary.formatted,
      breakdown: result.breakdown.map((b) => ({ label: b.label, value: b.formatted })),
    });
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    const { exportCalculationPdf } = await import('../utils/pdfExport');
    const mode = exportCalculationPdf({
      calculator: calc,
      values,
      result,
      language: activeLang,
      pageUrl: window.location.href,
    });
    showToast(
      mode === 'downloaded' ? 'PDF report downloaded directly.' : 'Unicode print-to-PDF sheet opened.',
      'success'
    );
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = [
      `${calc.name}`,
      `${result.primary.label}: ${result.primary.formatted}`,
      ...result.breakdown.map((b) => `${b.label}: ${b.formatted}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('Result copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Clipboard permission unavailable.', 'error');
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const url = window.location.href;
    const text = `${calc.name}: ${result.primary.label} = ${result.primary.formatted}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: calc.name, text, url });
        return;
      } catch {
        // Fallback to copy
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      showToast('Shareable result link copied.', 'success');
    } catch {
      showToast('Unable to share on this browser.', 'error');
    }
  };

  const handleDownloadCsv = () => {
    if (!result) return;
    const rows: string[][] = [
      ['Calculator', calc.name],
      ['Catalog #', String(calc.catalogNumber || '-')],
      ['Generated At', new Date().toISOString()],
      [],
      ['Input Parameter', 'Value'],
      ...calc.inputs.map((f) => [f.label, String(values[f.key] ?? '')]),
      [],
      ['Output Metric', 'Result'],
      [result.primary.label, result.primary.formatted],
      ...result.breakdown.map((b) => [b.label, b.formatted]),
    ];
    if (result.tableHeaders && result.tableRows) {
      rows.push([], result.tableHeaders, ...result.tableRows.map((r) => r.map(String)));
    }
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${calc.id}-result.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded CSV result file.', 'success');
  };

  const handleCreateReport = () => {
    if (!result) return;
    addReport({
      title: `${calc.name} Report`,
      source: calc.name,
      inputs: calc.inputs.map((f) => ({ label: f.label, value: String(values[f.key] ?? '') })),
      formulas: [calc.formulaDisplay],
      assumptions: calc.assumptions || calc.disclaimer || 'Standard deterministic mathematical evaluation.',
      results: [
        { label: result.primary.label, value: result.primary.formatted },
        ...result.breakdown.map((b) => ({ label: b.label, value: b.formatted })),
      ],
      warnings: result.isApproximate ? ['Numerical approximation shown alongside formula notes.'] : [],
    });
  };

  const safetyDisclaimer =
    calc.disclaimer ||
    (calc.safetyClass === 'clinical'
      ? 'Clinical & Health Formula Notice: For educational & reference use only; consult a licensed physician before clinical decisions.'
      : calc.safetyClass === 'financial'
      ? 'Financial & Tax Estimate Notice: Calculations follow standard mathematical conventions; verify final figures with your bank or tax advisor.'
      : calc.safetyClass === 'engineering'
      ? 'Engineering Safety Notice: Apply statutory safety factors and local building/electrical codes before construction or wiring.'
      : undefined);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const schemaJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: calc.name,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      description: calc.shortDescription,
      url: `${origin}/${activeLang}/${calc.category}/${calc.slug || calc.id}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: calc.categoryLabel, item: `${origin}/${activeLang}/${calc.category}` },
        { '@type': 'ListItem', position: 3, name: calc.name, item: `${origin}/${activeLang}/${calc.category}/${calc.slug || calc.id}` },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <DocumentHead
        title={`${calc.name} (#${calc.catalogNumber || 'Studio'}) – BULK CALCULATOR STUDIO`}
        description={calc.shortDescription}
        hreflangPath={`/${calc.category}/${calc.slug || calc.id}`}
        jsonLd={schemaJsonLd}
      />

      {/* Sticky Back, Close (x), Prev/Next & Instant 2,500-Calculator Switcher */}
      <QuickCalculatorBar calculator={calc} activeLang={activeLang} />

      {/* Category-Themed Precision Header */}
      <CosmicEntrance>
        <LiquidGlassReveal className="card-3d overflow-hidden p-0">
          <div className="h-1.5 w-full" style={{ background: categoryTheme.gradient }} />
          <div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {calc.catalogNumber && (
                  <span
                    className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold text-white"
                    style={{ background: categoryTheme.gradient }}
                  >
                    #{calc.catalogNumber}
                  </span>
                )}
                <Link to={`/${activeLang}/${calc.category}`} className="font-medium hover:underline">
                  {calc.categoryLabel}
                </Link>
                {calc.subcategory && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{calc.subcategory}</span>
                  </>
                )}
                {calc.toolKind === 'live-tool' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-300">
                      <Radio className="h-3 w-3" /> Live Server Tool
                    </span>
                  </>
                )}
              </div>
              <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl text-balance">
                {calc.name}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                {calc.shortDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleFavorite(calc.id)}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition ${
                isFav
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-500'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
              <span>{isFav ? 'Favorited' : 'Favorite'}</span>
            </button>
          </div>
        </LiquidGlassReveal>
      </CosmicEntrance>

      {/* Main Precision Workspace */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <LiquidGlassReveal className="card-3d p-6 lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold">
              {t('calc.inputs', 'Input Parameters')}
            </h2>
            <span className="font-mono text-[11px] text-slate-400">
              {calc.inputs.length} field{calc.inputs.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-4">
            {calc.inputs.map((field) => (
              <label key={field.key} className="block space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
                  {field.unit && (
                    <span className="font-mono text-slate-400">{field.unit}</span>
                  )}
                </div>
                {field.type === 'select' ? (
                  <select
                    value={String(values[field.key] ?? field.defaultValue)}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={values[field.key] ?? ''}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white/90 px-3.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                  />
                )}
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {calc.toolKind === 'live-tool' ? (
              <MagneticButton
                variant="primary"
                className="btn-3d"
                onClick={() => void handleRunLiveTool()}
                disabled={liveLoading}
              >
                <Radio className="h-4 w-4" />
                {liveLoading ? 'Querying Live Server...' : t('calc.liveRun', 'Run Live Network Diagnostic')}
              </MagneticButton>
            ) : (
              <MagneticButton variant="primary" className="btn-3d" onClick={handleCalculateLog} disabled={!result}>
                {t('calc.calculate', 'Calculate & Log')}
              </MagneticButton>
            )}
            <MagneticButton variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              {t('calc.reset', 'Reset')}
            </MagneticButton>
          </div>

          {/* Direct Same-Category Quick Switcher inside Workspace */}
          {categoryPeers.length > 0 && (
            <div className="border-t border-slate-200/70 pt-4 dark:border-slate-800">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  More in {calc.categoryLabel}
                </span>
                <Link
                  to={`/${activeLang}/${calc.category}`}
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  All →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                {categoryPeers.map((peer) => (
                  <Link
                    key={peer.slug}
                    to={`/${activeLang}/${peer.category}/${peer.slug}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/70 px-3 py-2 text-xs hover:bg-slate-100/70 dark:border-slate-800 dark:hover:bg-slate-800/60 transition"
                  >
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                      #{peer.catalogNumber} {peer.name}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </LiquidGlassReveal>

        <div className="space-y-6 lg:col-span-7">
          {liveResult && (
            <LiquidGlassReveal className="card-3d p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">
                  {liveResult.available ? 'Live Server Diagnostic Result' : 'Service Unavailable'}
                </h2>
                {liveResult.timestamp && (
                  <span className="font-mono text-[11px] text-slate-500">{liveResult.timestamp}</span>
                )}
              </div>
              {liveResult.available ? (
                <>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {liveResult.summary}
                  </div>
                  <pre className="overflow-auto rounded-xl bg-slate-950/80 p-3 font-mono text-xs text-slate-100">
                    {JSON.stringify(liveResult.details, null, 2)}
                  </pre>
                </>
              ) : (
                <p className="text-sm text-rose-500">{liveResult.error}</p>
              )}
            </LiquidGlassReveal>
          )}

          {error ? (
            <LiquidGlassReveal className="border-rose-500/40 p-6">
              <div className="flex items-start gap-3 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-sm">{t('calc.errorTitle', 'Input Validation Error')}</h2>
                  <p className="mt-1 text-sm">{error}</p>
                </div>
              </div>
            </LiquidGlassReveal>
          ) : result ? (
            <CalculatorResultReveal
              keyTrigger={`${calc.id}-${result.primary.formatted}`}
              className="liquid-glass card-3d rounded-2xl p-6 space-y-5"
            >
              {/* Precision Primary Result Readout */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 pb-4 dark:border-slate-800">
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {result.primary.label}
                    <span aria-hidden="true"> · </span>
                    {result.isApproximate ? 'Numerical Approximation' : 'Verified Deterministic Output'}
                  </div>
                  <div
                    className="mt-1 font-display text-3xl font-bold tabular-nums sm:text-4xl"
                    style={{ color: categoryTheme.primary }}
                  >
                    {result.primary.formatted}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="btn-3d inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white whitespace-nowrap shrink-0"
                    style={{ background: categoryTheme.gradient }}
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>{t('calc.downloadPdf', 'PDF Report')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : t('calc.copy', 'Copy')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleShare()}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>{t('calc.share', 'Share')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>{t('calc.save', 'Save')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{t('calc.csv', 'CSV')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateReport}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{t('calc.report', 'Report')}</span>
                  </button>
                </div>
              </div>

              {/* Breakdown Metrics */}
              {result.breakdown.length > 0 && (
                <div>
                  <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('calc.breakdown', 'Detailed Breakdown')}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {result.breakdown.map((b) => (
                      <div
                        key={b.label}
                        className="rounded-xl border border-slate-200/70 p-3.5 dark:border-slate-800"
                      >
                        <div className="text-xs text-slate-500 dark:text-slate-400">{b.label}</div>
                        <div className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {b.formatted}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chart if available */}
              {result.chartData && result.chartData.length > 0 && (
                <div className="pt-2">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Visual Projection
                  </h3>
                  <SimpleBarChart
                    data={result.chartData}
                    primaryLabel={result.chartLabels?.primary}
                    secondaryLabel={result.chartLabels?.secondary}
                  />
                </div>
              )}

              {/* Step-by-Step Formula & Explanation */}
              <div className="space-y-2 border-t border-slate-200/70 pt-4 text-xs dark:border-slate-800">
                <div className="font-semibold text-slate-700 dark:text-slate-200">
                  {t('calc.formula', 'Formula')}: <code className="font-mono font-normal">{calc.formulaDisplay}</code>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{calc.explanation}</p>
                {result.steps.map((s, idx) => (
                  <div key={idx} className="font-mono text-slate-500 dark:text-slate-400">
                    • {s}
                  </div>
                ))}
                {(calc.assumptions || safetyDisclaimer) && (
                  <div className="mt-2 rounded-lg bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200 space-y-1">
                    {calc.assumptions && <div><strong>{t('calc.assumptions', 'Assumptions')}:</strong> {calc.assumptions}</div>}
                    {safetyDisclaimer && <div><strong>{t('calc.disclaimer', 'Notice')}:</strong> {safetyDisclaimer}</div>}
                  </div>
                )}
              </div>
            </CalculatorResultReveal>
          ) : null}

          {/* Optional Table */}
          {result?.tableHeaders && result.tableRows && result.tableRows.length > 0 && (
            <LiquidGlassReveal className="p-5">
              <h3 className="mb-3 font-display text-base font-semibold">Schedule Breakdown</h3>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-start text-xs tabular-nums">
                  <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <tr>
                      {result.tableHeaders.map((h) => (
                        <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {result.tableRows.map((row, idx) => (
                      <tr key={idx}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 font-mono">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LiquidGlassReveal>
          )}

          {/* Worked Example & FAQ */}
          <LiquidGlassReveal className="p-5 space-y-3 text-xs">
            <h2 className="font-display text-sm font-bold">Worked Example &amp; Quick FAQ</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Using default parameters ({calc.inputs.map((i) => `${i.label}: ${i.defaultValue}`).join(', ')}),{' '}
              {calc.name} deterministically computes{' '}
              <strong>{result ? `${result.primary.label} = ${result.primary.formatted}` : 'live results'}</strong>.
            </p>
            <details className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
              <summary className="cursor-pointer font-semibold">Can I switch tools without going back to Home?</summary>
              <p className="mt-1.5 text-slate-600 dark:text-slate-400">
                Yes. Use <strong>Switch Calculator (⌘K)</strong>, <strong>Prev/Next</strong>, or the <strong>More in {calc.categoryLabel}</strong> list right inside this view, or press <strong>← Back</strong> / <strong>× Close</strong> anytime.
              </p>
            </details>
            <details className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
              <summary className="cursor-pointer font-semibold">Does this work offline and support PDF export?</summary>
              <p className="mt-1.5 text-slate-600 dark:text-slate-400">
                {calc.toolKind === 'live-tool'
                  ? 'Live DNS/WHOIS/SSL diagnostics require an active server connection and honestly show Service Unavailable offline.'
                  : 'Yes! All mathematical, financial, scientific, and engineering formulas execute 100% locally in your browser with full PDF and CSV export.'}
              </p>
            </details>
          </LiquidGlassReveal>

          <MonetagAdSlot placement="resultPromoCta" variant="compact" />
        </div>
      </div>

      {/* Related Calculators */}
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">{t('calc.related', 'Related Calculators')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((rc) => {
              if (!rc) return null;
              const rcSlug = 'slug' in rc && rc.slug ? rc.slug : rc.id;
              return (
                <Link
                  key={rcSlug}
                  to={`/${activeLang}/${rc.category}/${rcSlug}`}
                  className="liquid-glass card-3d rounded-xl p-4 hover:border-blue-500/40"
                >
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{rc.categoryLabel}</div>
                  <div className="mt-1 font-display text-sm font-semibold">{rc.name}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
