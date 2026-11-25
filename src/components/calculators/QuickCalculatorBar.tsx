import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Layers,
  Maximize2,
  Minimize2,
  Search,
  Target,
  X,
} from 'lucide-react';
import { CATALOG_2500, CATALOG_CATEGORIES } from '../../engine/calculators';
import type { CalculatorDefinition } from '../../engine/calculatorTypes';
import { resolveCategoryTheme } from '../../theme/pageThemes';
import { useStudio } from '../../context/StudioContext';

interface QuickCalculatorBarProps {
  calculator: CalculatorDefinition;
  activeLang: string;
}

export const QuickCalculatorBar: React.FC<QuickCalculatorBarProps> = ({
  calculator,
  activeLang,
}) => {
  const navigate = useNavigate();
  const { unpublishedCalculators, t } = useStudio();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [drawerCategory, setDrawerCategory] = useState<string>(calculator.category);
  const [drawerQuery, setDrawerQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const hiddenSet = useMemo(() => new Set(unpublishedCalculators), [unpublishedCalculators]);

  // Siblings in current category for instant Prev/Next switching without leaving workspace
  const categoryItems = useMemo(
    () =>
      CATALOG_2500.filter(
        (c) => c.category === calculator.category && !hiddenSet.has(c.slug)
      ),
    [calculator.category, hiddenSet]
  );

  const currentIdx = useMemo(
    () => categoryItems.findIndex((c) => c.slug === (calculator.slug || calculator.id)),
    [categoryItems, calculator]
  );

  const prevCalc = currentIdx > 0 ? categoryItems[currentIdx - 1] : undefined;
  const nextCalc =
    currentIdx >= 0 && currentIdx < categoryItems.length - 1
      ? categoryItems[currentIdx + 1]
      : undefined;

  // Reset drawer filter to current calculator's category whenever opened
  useEffect(() => {
    if (drawerOpen) {
      setDrawerCategory(calculator.category);
      setDrawerQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [drawerOpen, calculator.category]);

  // Keyboard shortcut: Escape closes drawer; Ctrl+K / Cmd+K opens quick switcher
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setDrawerOpen((prev) => !prev);
      } else if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const drawerResults = useMemo(() => {
    const q = drawerQuery.trim().toLowerCase();
    const list = CATALOG_2500.filter((c) => {
      if (hiddenSet.has(c.slug)) return false;
      if (!q && drawerCategory !== 'all' && c.category !== drawerCategory) return false;
      if (q) {
        if (drawerCategory !== 'all' && c.category !== drawerCategory) {
          // When user types a query, search across all categories if none match or keep filter?
          // Search across all categories when typing so users can jump anywhere instantly!
          return (
            c.name.toLowerCase().includes(q) ||
            c.subcategory.toLowerCase().includes(q) ||
            c.slug.includes(q) ||
            `#${c.catalogNumber}` === q
          );
        }
        return (
          c.name.toLowerCase().includes(q) ||
          c.subcategory.toLowerCase().includes(q) ||
          c.slug.includes(q) ||
          `#${c.catalogNumber}` === q
        );
      }
      return true;
    });
    return list.slice(0, 60);
  }, [drawerCategory, drawerQuery, hiddenSet]);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(`/${activeLang}/${calculator.category}`);
    }
  };

  const handleClose = () => {
    navigate(`/${activeLang}/${calculator.category}`);
  };

  const currentTheme = resolveCategoryTheme(calculator.category);

  return (
    <>
      {/* Persistent Sticky In-Calculator Control Dock */}
      <div className="liquid-glass sticky top-16 z-30 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl px-3.5 py-2.5 shadow-lg">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 transition"
            title="Go back to previous page"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t('calc.back', 'Back')}</span>
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="btn-3d inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition"
            style={{ background: currentTheme.gradient }}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{t('calc.switch', 'Switch Calculator')}</span>
            <kbd className="hidden sm:inline rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setIsFocusMode(true)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20 whitespace-nowrap shrink-0 transition"
            title="Open Single Calculator Focus Mode (Distraction-Free)"
          >
            <Target className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Focus Mode</span>
          </button>

          <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 ps-1">
            <Link to={`/${activeLang}/${calculator.category}`} className="hover:underline truncate max-w-[140px]">
              {calculator.categoryLabel}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[220px]">
              {calculator.name}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {prevCalc && (
            <Link
              to={`/${activeLang}/${prevCalc.category}/${prevCalc.slug}`}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-300/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              title={`Previous: ${prevCalc.name}`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('calc.prevTool', 'Prev')}</span>
            </Link>
          )}
          {nextCalc && (
            <Link
              to={`/${activeLang}/${nextCalc.category}/${nextCalc.slug}`}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-300/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              title={`Next: ${nextCalc.name}`}
            >
              <span className="hidden sm:inline">{t('calc.nextTool', 'Next')}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}

          <button
            type="button"
            onClick={handleClose}
            aria-label={`Close ${calculator.name}`}
            title={`${t('calc.close', 'Close')} (${calculator.categoryLabel})`}
            className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center gap-1 rounded-xl border border-rose-500/35 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-300 whitespace-nowrap shrink-0 transition"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">{t('calc.close', 'Close')}</span>
          </button>
        </div>
      </div>

      {/* Instant In-Page Calculator Switcher Slide-Over Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Quick Calculator Switcher"
        >
          <div
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="liquid-glass relative z-10 flex h-full w-full max-w-xl flex-col border-s border-slate-200/70 bg-white/95 p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950/95">
            {/* Drawer Header with Close X */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-3 dark:border-slate-800">
              <div>
                <h2 className="font-display text-lg font-bold">
                  {t('calc.switch', 'Switch Calculator')} (2,500+)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Jump directly to any tool without returning to the home page
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close switcher"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Instant Search Bar inside Drawer */}
            <div className="mt-4 relative">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="search"
                value={drawerQuery}
                onChange={(e) => setDrawerQuery(e.target.value)}
                placeholder="Type any tool name, #number (e.g. #42), or domain..."
                className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white/90 ps-10 pe-10 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              />
              {drawerQuery && (
                <button
                  type="button"
                  onClick={() => setDrawerQuery('')}
                  aria-label="Clear filter"
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Quick Tabs */}
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1.5">
              <button
                type="button"
                onClick={() => setDrawerCategory('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition ${
                  drawerCategory === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                All 15 Domains
              </button>
              {CATALOG_CATEGORIES.map((cat) => {
                const active = drawerCategory === cat.id;
                const theme = resolveCategoryTheme(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setDrawerCategory(cat.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition ${
                      active
                        ? 'text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                    style={active ? { background: theme.gradient } : undefined}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Calculator List */}
            <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto pe-1">
              {drawerResults.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No matching calculators found. Try another keyword or switch category.
                </div>
              ) : (
                drawerResults.map((item) => {
                  const isCurrent = item.slug === (calculator.slug || calculator.id);
                  const theme = resolveCategoryTheme(item.category);
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        navigate(`/${activeLang}/${item.category}/${item.slug}`);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-start transition ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-200/70 hover:bg-slate-100/80 dark:border-slate-800 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold text-white"
                          style={{ background: theme.gradient }}
                        >
                          #{item.catalogNumber}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {item.name}
                          </div>
                          <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {item.categoryLabel} · {item.subcategory}
                          </div>
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                          Active
                        </span>
                      ) : (
                        <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3 text-xs text-slate-500 dark:border-slate-800">
              <span>Showing top {drawerResults.length} matches</span>
              <Link
                to={`/${activeLang}/calculators`}
                onClick={() => setDrawerOpen(false)}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                <Calculator className="h-3.5 w-3.5" />
                Full Directory
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Single Calculator Focus Mode / Distraction-Free Theater Overlay */}
      {isFocusMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Single Calculator Focus Mode"
        >
          <div className="relative w-full max-w-3xl rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                  <Target className="h-4 w-4" />
                  <span>SINGLE CALCULATOR FOCUS MODE — ACTIVE</span>
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
                  {calculator.name}
                </h2>
                <p className="text-xs text-slate-400">{calculator.categoryLabel} · {calculator.subcategory}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFocusMode(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
              >
                <X className="h-4 w-4" />
                <span>Exit Focus Mode</span>
              </button>
            </div>

            <div className="rounded-2xl bg-slate-950/80 p-5 border border-slate-800 text-center space-y-3">
              <p className="text-sm text-slate-300">
                You are in Distraction-Free Focus Mode. All listings, sidebars, and extra headers are hidden. Use the inputs below or click <strong>Exit Focus Mode</strong> to return to the studio workspace.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFocusMode(false)}
                  className="btn-3d rounded-xl px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  Continue Calculating Here
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
