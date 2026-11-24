import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  Calculator,
  Clock,
  FileSpreadsheet,
  FileText,
  GitCompare,
  Heart,
  LayoutDashboard,
  Wrench,
} from 'lucide-react';
import { getCalculatorById, getPublishedCalculators } from '../engine/calculators';
import { useStudio } from '../context/StudioContext';
import { DocumentHead } from '../components/seo/DocumentHead';
import { SmartSearch } from '../components/search/SmartSearch';
import { FloatingDashboard, LiquidGlassReveal, MagneticButton } from '../components/motion/MotionLibrary';
import { MonetagAdSlot } from '../components/ads/MonetagAdSlot';

export const DashboardPage: React.FC = () => {
  const {
    favorites,
    savedCalculations,
    history,
    reports,
    usageCounts,
    unpublishedCalculators,
  } = useStudio();

  const published = getPublishedCalculators(unpublishedCalculators);
  const favoriteCalcs = favorites
    .map((id) => published.find((c) => c.id === id))
    .filter(Boolean);

  // Real usage ranking from actual user activity (never fabricated)
  const topUsed = Object.entries(usageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, count]) => ({ calc: getCalculatorById(id), count }))
    .filter((x) => x.calc && !unpublishedCalculators.includes(x.calc.id));

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Workspace Dashboard – BULK CALCULATOR STUDIO"
        description="Access your favorite calculators, calculation history, saved results, reports, and quick studio tools."
      />

      <FloatingDashboard>
        <LiquidGlassReveal className="p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <LayoutDashboard className="h-4 w-4 text-indigo-500" />
                <span>Local Workspace · Instant Offline Access</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                Computation Dashboard
              </h1>
            </div>
            <div className="w-full lg:w-96">
              <SmartSearch variant="dashboard" placeholder="Quick-jump to any calculator..." />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link to="/bulk-calculator">
              <MagneticButton variant="primary">
                <FileSpreadsheet className="h-4 w-4" /> Bulk Studio
              </MagneticButton>
            </Link>
            <Link to="/custom-calculator-builder">
              <MagneticButton variant="secondary">
                <Wrench className="h-4 w-4" /> Custom Builder
              </MagneticButton>
            </Link>
            <Link to="/saved">
              <MagneticButton variant="outline">
                <Bookmark className="h-4 w-4" /> Saved ({savedCalculations.length})
              </MagneticButton>
            </Link>
            <Link to="/compare">
              <MagneticButton variant="outline">
                <GitCompare className="h-4 w-4" /> Compare Results
              </MagneticButton>
            </Link>
          </div>
        </LiquidGlassReveal>
      </FloatingDashboard>

      {/* Real Local Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/calculators" className="liquid-glass rounded-2xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Published Calculators</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{published.length}</div>
        </Link>
        <Link to="/saved" className="liquid-glass rounded-2xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Saved Calculations</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{savedCalculations.length}</div>
        </Link>
        <Link to="/history" className="liquid-glass rounded-2xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Logged Runs (History)</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{history.length}</div>
        </Link>
        <Link to="/reports" className="liquid-glass rounded-2xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Generated Reports</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{reports.length}</div>
        </Link>
      </div>

      {/* Favorites & Most Used */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LiquidGlassReveal className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Heart className="h-4 w-4 text-rose-500" /> Favorite Calculators
            </h2>
            <Link to="/calculators" className="text-xs font-medium text-indigo-500 hover:underline">
              Manage
            </Link>
          </div>
          {favoriteCalcs.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {favoriteCalcs.map((c) => {
                if (!c) return null;
                return (
                  <Link
                    key={c.id}
                    to={`/calculators/${c.id}`}
                    className="rounded-xl border border-slate-200/70 p-3 hover:bg-slate-100/60 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <div className="text-[11px] text-slate-500">{c.categoryLabel}</div>
                    <div className="mt-0.5 text-sm font-semibold">{c.name}</div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Star any calculator to pin it here.</p>
          )}
        </LiquidGlassReveal>

        <LiquidGlassReveal className="p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Calculator className="h-4 w-4 text-cyan-500" /> Most Used by You
          </h2>
          {topUsed.length > 0 ? (
            <div className="space-y-2">
              {topUsed.map(({ calc, count }) => (
                <Link
                  key={calc!.id}
                  to={`/calculators/${calc!.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200/70 p-3 text-xs hover:bg-slate-100/60 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <span className="font-semibold">{calc!.name}</span>
                  <span className="font-mono text-slate-500 tabular-nums">{count} runs</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No logged runs yet — click &ldquo;Calculate &amp; Log&rdquo; inside any calculator to track real usage.
            </p>
          )}
        </LiquidGlassReveal>
      </div>

      {/* Recent History & Reports */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LiquidGlassReveal className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Clock className="h-4 w-4 text-indigo-500" /> Recent History
            </h2>
            <Link to="/history" className="text-xs font-medium text-indigo-500 hover:underline">
              View All
            </Link>
          </div>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.slice(0, 5).map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-xl border border-slate-200/70 p-3 text-xs dark:border-slate-800">
                  <div>
                    <div className="font-semibold">{h.calculatorName}</div>
                    <div className="text-slate-500">{h.primaryLabel}</div>
                  </div>
                  <div className="font-mono font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
                    {h.primaryValue}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Your logged calculations will appear here.</p>
          )}
        </LiquidGlassReveal>

        <LiquidGlassReveal className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <FileText className="h-4 w-4 text-rose-500" /> Recent Reports
            </h2>
            <Link to="/reports" className="text-xs font-medium text-indigo-500 hover:underline">
              Reports Center
            </Link>
          </div>
          {reports.length > 0 ? (
            <div className="space-y-2">
              {reports.slice(0, 4).map((r) => (
                <Link
                  key={r.id}
                  to="/reports"
                  className="block rounded-xl border border-slate-200/70 p-3 text-xs hover:bg-slate-100/60 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-slate-500">
                    {r.source} · {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Generate a report from any calculator, Bulk Studio, or Workflow.</p>
          )}
        </LiquidGlassReveal>
      </div>

      <MonetagAdSlot placement="dashboardBanner" variant="compact" />
    </div>
  );
};
