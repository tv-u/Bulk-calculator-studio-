import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { CATALOG_CATEGORIES, getPublishedCatalogEntries } from '../engine/calculators';
import { resolveCategoryTheme } from '../theme/pageThemes';
import { useStudio } from '../context/StudioContext';
import { DocumentHead } from '../components/seo/DocumentHead';
import { CosmicEntrance, LiquidGlassReveal } from '../components/motion/MotionLibrary';
import { MonetagAdSlot } from '../components/ads/MonetagAdSlot';
import { CalculatorToolCard } from '../components/calculators/CalculatorToolCard';

const PAGE_SIZE = 48;

export const CalculatorsDirectoryPage: React.FC<{ mode?: 'all' | 'categories' }> = ({
  mode = 'all',
}) => {
  const { categoryId, category, lang } = useParams<{
    categoryId?: string;
    category?: string;
    lang?: string;
  }>();
  const routeCat = category || categoryId;

  const {
    unpublishedCalculators,
    importedCalculators,
    favorites,
    toggleFavorite,
    customCalculators,
    language,
  } = useStudio();

  const activeLang = lang || language || 'en';
  const publishedCatalog = useMemo(
    () => getPublishedCatalogEntries(unpublishedCalculators),
    [unpublishedCalculators]
  );

  const [selectedCat, setSelectedCat] = useState<string>(routeCat || 'all');
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSelectedCat(routeCat || 'all');
    setPage(1);
  }, [routeCat]);

  const activeCategoryMeta = CATALOG_CATEGORIES.find((c) => c.id === selectedCat);

  const allEntries = useMemo(() => {
    const importedMapped = importedCalculators.map((ic, i) => ({
      catalogNumber: publishedCatalog.length + 1 + i,
      id: ic.slug,
      slug: ic.slug,
      name: ic.name,
      partNumber: 51,
      subcategory: 'Admin Imported',
      category: (CATALOG_CATEGORIES.some((c) => c.id === ic.category) ? ic.category : 'business') as any,
      categoryLabel: ic.categoryLabel || 'Custom Imported',
      toolKind: 'calculator' as const,
      safetyClass: 'standard' as const,
      solverFamily: 'imported',
      solverKey: ic.formula,
      canonicalSlug: ic.slug,
      isDuplicateName: false,
      status: 'published' as const,
    }));
    return [...publishedCatalog, ...importedMapped];
  }, [publishedCatalog, importedCalculators]);

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return allEntries.filter((c) => {
      if (selectedCat !== 'all' && c.category !== selectedCat) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.subcategory.toLowerCase().includes(q) ||
        c.categoryLabel.toLowerCase().includes(q) ||
        c.slug.includes(q) ||
        `#${c.catalogNumber}` === q
      );
    });
  }, [allEntries, selectedCat, filterText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  return (
    <div className="space-y-6">
      <DocumentHead
        title={
          activeCategoryMeta
            ? `${activeCategoryMeta.name} (${filtered.length} Calculators) – BULK CALCULATOR STUDIO`
            : mode === 'categories'
            ? '15 Calculator Categories – BULK CALCULATOR STUDIO'
            : `All ${allEntries.length.toLocaleString()} Calculators Directory – BULK CALCULATOR STUDIO`
        }
        description={`Browse all ${allEntries.length.toLocaleString()} verified Finance, Math, Health, Engineering, Construction, Science, Business, Legal, Sports, Automotive & Developer calculators.`}
        hreflangPath={selectedCat !== 'all' ? `/${selectedCat}` : '/calculators'}
      />

      <CosmicEntrance>
        <LiquidGlassReveal className="card-3d p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Master Catalog · {allEntries.length.toLocaleString()} Verified Calculators Published
                {customCalculators.filter((c) => c.published).length > 0 &&
                  ` · ${customCalculators.filter((c) => c.published).length} Custom`}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                {activeCategoryMeta
                  ? `${activeCategoryMeta.name}`
                  : mode === 'categories'
                  ? '15 Domain Categories'
                  : `All ${allEntries.length.toLocaleString()} Calculators`}
              </h1>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={filterText}
                onChange={(e) => {
                  setFilterText(e.target.value);
                  setPage(1);
                }}
                placeholder={`Filter ${allEntries.length.toLocaleString()} tools by name, #number, or domain...`}
                className="w-full rounded-xl border border-slate-300 bg-white/80 py-2.5 ps-9 pe-3 text-sm focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/70"
              />
            </div>
          </div>

          {/* 15 Category Filter Bar */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedCat('all');
                setPage(1);
              }}
              className={`min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                selectedCat === 'all'
                  ? 'text-white shadow-sm'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              style={selectedCat === 'all' ? { background: 'var(--page-gradient)' } : undefined}
            >
              All ({allEntries.length.toLocaleString()})
            </button>
            {CATALOG_CATEGORIES.map((cat) => {
              const count = allEntries.filter((c) => c.category === cat.id).length;
              const active = selectedCat === cat.id;
              const theme = resolveCategoryTheme(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCat(cat.id);
                    setPage(1);
                  }}
                  className={`min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'text-white shadow-sm'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                  style={active ? { background: theme.gradient } : undefined}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </LiquidGlassReveal>
      </CosmicEntrance>

      {/* Category Overview Cards */}
      {mode === 'categories' && selectedCat === 'all' && !filterText && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOG_CATEGORIES.map((cat) => {
            const count = allEntries.filter((c) => c.category === cat.id).length;
            const theme = resolveCategoryTheme(cat.id);
            return (
              <Link
                key={cat.id}
                to={`/${activeLang}/${cat.id}`}
                className="liquid-glass card-3d rounded-2xl p-5"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span
                    className="h-2.5 w-10 rounded-full"
                    style={{ background: theme.gradient }}
                  />
                  <span className="font-mono tabular-nums">{count} tools</span>
                </div>
                <h2 className="mt-2 font-display text-lg font-bold">{cat.name}</h2>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                  {cat.description}
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Browse {cat.name} <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Paginated Calculator Grid (48 per page for 60fps speed) */}
      {pageItems.length > 0 ? (
        <>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()} calculators
            </span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((calc) => (
              <CalculatorToolCard
                key={calc.slug}
                item={calc}
                activeLang={activeLang}
                isFavorite={favorites.includes(calc.slug) || favorites.includes(calc.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-700"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="px-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-700"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <LiquidGlassReveal className="p-8 text-center">
          <p className="text-sm font-medium">No calculators match your current filter.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCat('all');
              setFilterText('');
              setPage(1);
            }}
            className="mt-3 text-xs font-semibold text-blue-500 hover:underline"
          >
            Reset Directory Filters
          </button>
        </LiquidGlassReveal>
      )}

      <MonetagAdSlot placement="contentPageCard" variant="compact" />
    </div>
  );
};
