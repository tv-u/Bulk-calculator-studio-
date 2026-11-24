import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Calculator,
  Clock,
  Coins,
  FileSpreadsheet,
  FlaskConical,
  GitBranch,
  Globe,
  Ruler,
  Sparkles,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import {
  CATALOG_2500,
  CATALOG_CATEGORIES,
  getPublishedCatalogEntries,
} from '../engine/calculators';
import { resolveCategoryTheme } from '../theme/pageThemes';
import { useStudio } from '../context/StudioContext';
import { DocumentHead } from '../components/seo/DocumentHead';
import { SmartSearch } from '../components/search/SmartSearch';
import {
  AuroraFlow,
  CosmicEntrance,
  LiquidGlassReveal,
  MagneticButton,
} from '../components/motion/MotionLibrary';
import { MonetagAdSlot } from '../components/ads/MonetagAdSlot';
import { CalculatorToolCard } from '../components/calculators/CalculatorToolCard';

const FEATURED_SLUGS = [
  'emi-calculator',
  'sip-calculator',
  'percentage-calculator',
  'gst-calculator',
  'bmi-calculator',
  'compound-interest-calculator',
  'income-tax-calculator',
  'ip-subnet-calculator',
];

export const HomePage: React.FC = () => {
  const { unpublishedCalculators, customCalculators, favorites, toggleFavorite, history, language, t } = useStudio();
  const published = getPublishedCatalogEntries(unpublishedCalculators);
  const featured = FEATURED_SLUGS.map((slug) => CATALOG_2500.find((c) => c.slug === slug)).filter(Boolean);
  const recentTools = history.slice(0, 4);

  return (
    <div className="space-y-8">
      <DocumentHead
        title="BULK CALCULATOR STUDIO – 2,500 Verified Calculators in 50 Languages"
        description="Precision computational ecosystem featuring 2,500 verified calculators across 15 domains, 50 languages, Direct PDF Reports, Bulk CSV Studio, Custom Builder, and Visual Workflows."
        hreflangPath=""
      />

      {/* Hero Command Center with Instant 2,500-Calculator Smart Search */}
      <CosmicEntrance>
        <AuroraFlow className="liquid-glass card-3d p-6 sm:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-300">
              <Globe className="h-3.5 w-3.5" />
              <span>{t('hero.badge', `${published.length.toLocaleString()} Verified Calculators · 50 Languages`)}</span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl text-balance">
              BULK CALCULATOR STUDIO
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              {t(
                'hero.subtitle',
                `Explore ${published.length.toLocaleString()} deterministic calculators across 15 domains with high-precision financial math, bulk CSV computation, live network diagnostics, and instant PDF reports.`
              )}
            </p>

            <div className="mt-6">
              <SmartSearch variant="hero" enableSlashShortcut />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link to={`/${language}/finance`}>
                <MagneticButton variant="primary" className="btn-3d">
                  <Calculator className="h-4 w-4" />
                  {t('hero.exploreAll', `Explore ${published.length.toLocaleString()} Calculators`)}
                </MagneticButton>
              </Link>
              <Link to="/bulk-calculator">
                <MagneticButton variant="secondary">
                  <FileSpreadsheet className="h-4 w-4" />
                  {t('hero.openBulk', 'Open Bulk Studio')}
                </MagneticButton>
              </Link>
            </div>
          </div>
        </AuroraFlow>
      </CosmicEntrance>

      {/* Quick Resume Bar when user has calculation history */}
      {recentTools.length > 0 && (
        <section aria-labelledby="recent-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-heading" className="flex items-center gap-2 font-display text-base font-bold">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Quick Resume Recent Calculations</span>
            </h2>
            <Link to="/history" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Full History →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentTools.map((h) => {
              const meta = CATALOG_2500.find((c) => c.slug === h.calculatorId || c.id === h.calculatorId);
              const route = meta
                ? `/${language}/${meta.category}/${meta.slug}`
                : `/calculators/${h.calculatorId}`;
              return (
                <Link
                  key={h.id}
                  to={route}
                  className="liquid-glass card-3d rounded-xl p-3.5 hover:border-blue-500/40"
                >
                  <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {h.calculatorName}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="truncate text-slate-500 dark:text-slate-400">{h.primaryLabel}</span>
                    <span className="font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400">
                      {h.primaryValue}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Essential Calculators */}
      <section aria-labelledby="popular-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="popular-heading" className="font-display text-xl font-bold">
            Popular Calculators
          </h2>
          <Link to="/calculators" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Browse all {published.length.toLocaleString()} →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {featured.map((calc) => {
            if (!calc) return null;
            return (
              <CalculatorToolCard
                key={calc.id}
                item={calc}
                activeLang={language}
                isFavorite={favorites.includes(calc.slug) || favorites.includes(calc.id)}
                onToggleFavorite={toggleFavorite}
              />
            );
          })}
        </div>
      </section>

      {/* Studio Ecosystem Grid */}
      <section aria-labelledby="ecosystem-heading">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="ecosystem-heading" className="font-display text-xl font-bold">
              Computation Studios &amp; Labs
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Specialized workspaces engineered for speed, accuracy, and exportable PDF/CSV results
            </p>
          </div>
          <Link to="/dashboard" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Open Dashboard →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              to: '/bulk-calculator',
              title: 'Bulk Calculation Studio',
              desc: 'Multi-row grids, CSV upload, column mapping, safe batch formulas & CSV export.',
              icon: FileSpreadsheet,
            },
            {
              to: '/custom-calculator-builder',
              title: 'Custom Calculator Builder',
              desc: `Build & save custom formula tools (${customCalculators.length} saved locally).`,
              icon: Wrench,
            },
            {
              to: '/workflow-builder',
              title: 'Visual Workflow Builder',
              desc: 'Chain Input → EMI → Tax → Report nodes with cycle validation.',
              icon: GitBranch,
            },
            {
              to: '/math-lab',
              title: 'Mathematics Lab',
              desc: 'Function plotter, 2×2 matrices, equation solver & Simpson integration.',
              icon: FlaskConical,
            },
            {
              to: '/finance-lab',
              title: 'Financial Simulation Lab',
              desc: 'Amortization schedules, SIP vs Lumpsum, break-even & scenario comparison.',
              icon: TrendingUp,
            },
            {
              to: '/data-analysis',
              title: 'Data Analysis Studio',
              desc: 'CSV quality audit, missing/duplicate cleaning, descriptive stats & charts.',
              icon: BarChart3,
            },
            {
              to: '/unit-converter',
              title: 'Unit & Currency Engines',
              desc: '13 physical unit categories offline + live/cached currency rate checks.',
              icon: Ruler,
            },
            {
              to: '/ai-assistant',
              title: 'AI Calculation Assistant',
              desc: 'Natural-language intent routing backed by deterministic calculation math.',
              icon: Bot,
            },
          ].map((studio) => {
            const Icon = studio.icon;
            return (
              <Link
                key={studio.to}
                to={studio.to}
                className="liquid-glass card-3d group flex flex-col justify-between rounded-2xl p-5"
              >
                <div>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                    style={{ background: 'var(--page-gradient)' }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-display text-base font-semibold group-hover:text-blue-500 dark:group-hover:text-blue-400">
                    {studio.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {studio.desc}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>Launch Studio</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* All 15 Categories & Monetag Sponsored Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <LiquidGlassReveal className="card-3d p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              Browse All 15 Domains ({published.length.toLocaleString()} Tools)
            </h2>
            <Link to="/categories" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
              All Categories →
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {CATALOG_CATEGORIES.map((cat) => {
              const count = published.filter((c) => c.category === cat.id).length;
              const catTheme = resolveCategoryTheme(cat.id);
              return (
                <Link
                  key={cat.id}
                  to={`/${language}/${cat.id}`}
                  className="rounded-xl border border-slate-200/70 p-3 transition hover:bg-slate-100/60 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-xs font-semibold truncate">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ background: catTheme.gradient }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">{count}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {cat.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </LiquidGlassReveal>

        <MonetagAdSlot placement="homeSponsoredCard" />
      </div>

      {/* Quick India & Global Shortcuts */}
      <LiquidGlassReveal className="p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold">
                India-First &amp; 50-Language Global Precision
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Switch between Indian Lakhs/Crores (₹ INR), International currencies, and 50 languages (including RTL Arabic/Urdu/Hebrew/Persian) with instant PDF exports.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/currency-converter">
              <MagneticButton variant="outline">
                <Sparkles className="h-4 w-4" />
                Live Currency Rates
              </MagneticButton>
            </Link>
            <Link to="/settings">
              <MagneticButton variant="secondary">Regional Settings</MagneticButton>
            </Link>
          </div>
        </div>
      </LiquidGlassReveal>
    </div>
  );
};
