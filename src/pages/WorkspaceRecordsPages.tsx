import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Clock, Download, FileText, GitCompare, Printer, Trash2 } from 'lucide-react';
import { useStudio } from '../context/StudioContext';
import { DocumentHead } from '../components/seo/DocumentHead';
import { LiquidGlassReveal, MagneticButton } from '../components/motion/MotionLibrary';

export const SavedCalculationsPage: React.FC = () => {
  const { savedCalculations, deleteSavedCalculation, compareIds, toggleCompare } = useStudio();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Saved Calculations – BULK CALCULATOR STUDIO"
        description="Manage saved calculations and select items to compare side-by-side."
      />
      <LiquidGlassReveal className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Bookmark className="h-4 w-4 text-indigo-500" />
            <span>Local Workspace Storage</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold">Saved Calculations</h1>
        </div>
        <Link to="/compare">
          <MagneticButton variant="primary">
            <GitCompare className="h-4 w-4" />
            Compare Selected ({compareIds.length})
          </MagneticButton>
        </Link>
      </LiquidGlassReveal>

      {savedCalculations.length === 0 ? (
        <LiquidGlassReveal className="p-8 text-center">
          <p className="text-sm font-medium">No saved calculations yet.</p>
          <Link to="/calculators" className="mt-3 inline-block text-xs font-semibold text-indigo-500 hover:underline">
            Open a calculator and click Save →
          </Link>
        </LiquidGlassReveal>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {savedCalculations.map((item) => {
            const inCompare = compareIds.includes(item.id);
            return (
              <LiquidGlassReveal key={item.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/calculators/${item.calculatorId}`} className="font-display text-base font-semibold hover:underline">
                      {item.calculatorName}
                    </Link>
                    <div className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleCompare(item.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium border ${
                        inCompare
                          ? 'border-cyan-500 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {inCompare ? 'In Compare' : 'Compare'}
                    </button>
                    {confirmId === item.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          deleteSavedCalculation(item.id);
                          setConfirmId(null);
                        }}
                        className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-500"
                        aria-label="Delete saved item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
                  <div className="text-xs text-slate-500">{item.primaryLabel}</div>
                  <div className="font-mono text-lg font-bold tabular-nums">{item.primaryValue}</div>
                </div>
              </LiquidGlassReveal>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const HistoryPage: React.FC = () => {
  const { history, clearHistory } = useStudio();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Calculation History – BULK CALCULATOR STUDIO"
        description="Review your chronological calculation history."
      />
      <LiquidGlassReveal className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-4 w-4 text-cyan-500" />
            <span>Chronological Audit Trail</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold">Calculation History</h1>
        </div>
        {history.length > 0 && (
          confirmClear ? (
            <MagneticButton variant="danger" onClick={() => { clearHistory(); setConfirmClear(false); }}>
              Confirm Clear All
            </MagneticButton>
          ) : (
            <MagneticButton variant="outline" onClick={() => setConfirmClear(true)}>
              Clear History
            </MagneticButton>
          )
        )}
      </LiquidGlassReveal>

      {history.length === 0 ? (
        <LiquidGlassReveal className="p-8 text-center text-sm text-slate-500">
          No history logged yet. Click &ldquo;Calculate &amp; Log&rdquo; in any calculator.
        </LiquidGlassReveal>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <LiquidGlassReveal key={h.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link to={`/calculators/${h.calculatorId}`} className="font-display text-sm font-semibold hover:underline">
                  {h.calculatorName}
                </Link>
                <div className="text-xs text-slate-500">
                  {h.primaryLabel} · {new Date(h.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="font-mono text-base font-bold tabular-nums text-cyan-500">{h.primaryValue}</div>
            </LiquidGlassReveal>
          ))}
        </div>
      )}
    </div>
  );
};

export const CompareResultsPage: React.FC = () => {
  const { savedCalculations, compareIds, toggleCompare } = useStudio();
  const items = savedCalculations.filter((s) => compareIds.includes(s.id));

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Compare Calculation Results – BULK CALCULATOR STUDIO"
        description="Compare up to 4 saved calculations side by side."
      />
      <LiquidGlassReveal className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Compare Results</h1>
          <p className="text-xs text-slate-500">Select up to 4 items from Saved Calculations.</p>
        </div>
        <Link to="/saved">
          <MagneticButton variant="outline">Select Saved Items</MagneticButton>
        </Link>
      </LiquidGlassReveal>

      {items.length === 0 ? (
        <LiquidGlassReveal className="p-8 text-center text-sm text-slate-500">
          No items selected for comparison yet. Go to Saved Calculations and click Compare.
        </LiquidGlassReveal>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <LiquidGlassReveal key={item.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-sm font-bold">{item.calculatorName}</h2>
                <button
                  type="button"
                  onClick={() => toggleCompare(item.id)}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
                <div className="text-xs text-slate-500">{item.primaryLabel}</div>
                <div className="font-mono text-lg font-bold tabular-nums text-cyan-500">{item.primaryValue}</div>
              </div>
              <div className="space-y-1.5 text-xs">
                {item.breakdown.map((b) => (
                  <div key={b.label} className="flex justify-between gap-2 border-b border-slate-200/50 pb-1 dark:border-slate-800/50">
                    <span className="text-slate-500">{b.label}</span>
                    <span className="font-mono font-medium">{b.value}</span>
                  </div>
                ))}
              </div>
            </LiquidGlassReveal>
          ))}
        </div>
      )}
    </div>
  );
};

export const ReportsCenterPage: React.FC = () => {
  const { reports, deleteReport } = useStudio();

  const downloadJson = (rep: typeof reports[number]) => {
    const blob = new Blob([JSON.stringify(rep, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rep.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Reports Center – BULK CALCULATOR STUDIO"
        description="Inspect, print, or export structured calculation reports with formulas, inputs, and assumptions."
      />
      <LiquidGlassReveal className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileText className="h-4 w-4 text-rose-500" />
            <span>Structured Audit Reports</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold">Reports Center</h1>
        </div>
        {reports.length > 0 && (
          <MagneticButton variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save PDF
          </MagneticButton>
        )}
      </LiquidGlassReveal>

      {reports.length === 0 ? (
        <LiquidGlassReveal className="p-8 text-center text-sm text-slate-500">
          No reports generated yet. Use &ldquo;Report&rdquo; inside any calculator, Bulk Studio, Workflow Builder, or Data Analysis.
        </LiquidGlassReveal>
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => (
            <LiquidGlassReveal key={rep.id} className="p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 pb-3 dark:border-slate-800">
                <div>
                  <h2 className="font-display text-lg font-bold">{rep.title}</h2>
                  <p className="text-xs text-slate-500">
                    Source: {rep.source} · Created: {new Date(rep.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadJson(rep)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-700"
                  >
                    <Download className="h-3.5 w-3.5" /> JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteReport(rep.id)}
                    className="rounded-xl p-2 text-slate-400 hover:text-rose-500"
                    aria-label="Delete report"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 text-xs">
                <div>
                  <div className="font-semibold text-slate-500 mb-1.5">Inputs</div>
                  <div className="space-y-1">
                    {rep.inputs.map((inp, idx) => (
                      <div key={idx} className="flex justify-between gap-2">
                        <span>{inp.label}</span>
                        <span className="font-mono font-medium">{inp.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500 mb-1.5">Verified Results</div>
                  <div className="space-y-1">
                    {rep.results.map((r, idx) => (
                      <div key={idx} className="flex justify-between gap-2">
                        <span>{r.label}</span>
                        <span className="font-mono font-bold text-rose-500">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                <div><strong>Formulas:</strong> {rep.formulas.join(' ; ') || 'Standard'}</div>
                <div><strong>Assumptions:</strong> {rep.assumptions}</div>
                {rep.warnings.length > 0 && (
                  <div className="mt-1 text-amber-500"><strong>Warnings:</strong> {rep.warnings.join(' | ')}</div>
                )}
              </div>
            </LiquidGlassReveal>
          ))}
        </div>
      )}
    </div>
  );
};
