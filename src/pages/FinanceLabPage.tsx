import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useStudio } from '../context/StudioContext';
import { formatCurrency, formatIndianCompact } from '../engine/formatters';
import { DocumentHead } from '../components/seo/DocumentHead';
import { CosmicEntrance, LiquidGlassReveal } from '../components/motion/MotionLibrary';
import { SimpleBarChart } from '../components/charts/SimpleChart';

export const FinanceLabPage: React.FC = () => {
  const { currency, locale } = useStudio();

  // Scenario A vs Scenario B Comparison
  const [monthlySip, setMonthlySip] = useState(15000);
  const [years, setYears] = useState(15);
  const [rateA, setRateA] = useState(10);
  const [rateB, setRateB] = useState(14);
  const [inflation, setInflation] = useState(6);

  // Break-even Simulator
  const [fixedCost, setFixedCost] = useState(250000);
  const [unitPrice, setUnitPrice] = useState(1200);
  const [unitVarCost, setUnitVarCost] = useState(700);

  const sim = useMemo(() => {
    const calcSip = (rAnnual: number) => {
      const i = rAnnual / 12 / 100;
      let invested = 0;
      let corpus = 0;
      const series: number[] = [];
      for (let y = 1; y <= years; y++) {
        for (let m = 0; m < 12; m++) {
          invested += monthlySip;
          corpus = (corpus + monthlySip) * (1 + i);
        }
        series.push(Math.round(corpus));
      }
      const realVal = corpus / Math.pow(1 + inflation / 100, years);
      return { invested, corpus, realVal, series };
    };

    const a = calcSip(rateA);
    const b = calcSip(rateB);
    const chartData = Array.from({ length: years }, (_, idx) => ({
      label: `Y${idx + 1}`,
      value: a.series[idx],
      secondary: Math.max(0, b.series[idx] - a.series[idx]),
    }));

    return { a, b, chartData };
  }, [monthlySip, years, rateA, rateB, inflation]);

  const breakEven = useMemo(() => {
    const margin = unitPrice - unitVarCost;
    if (margin <= 0) return { units: Infinity, revenue: Infinity };
    const units = Math.ceil(fixedCost / margin);
    return { units, revenue: units * unitPrice, margin };
  }, [fixedCost, unitPrice, unitVarCost]);

  // Sensitivity Matrix (Interest Rate vs Tenure for ₹10L Loan)
  const sensitivityRates = [7.5, 8.5, 9.5, 10.5];
  const sensitivityTenures = [10, 15, 20, 25];
  const calcEmi = (p: number, rAnnual: number, yrs: number) => {
    const r = rAnnual / 12 / 100;
    const n = yrs * 12;
    return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Financial Simulation Lab – BULK CALCULATOR STUDIO"
        description="Run inflation-adjusted wealth scenarios, sensitivity matrices, and break-even cash-flow simulations."
      />

      <CosmicEntrance>
        <LiquidGlassReveal className="p-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span>Scenario Modeling · Sensitivity Analysis · Break-Even</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            Financial Simulation Lab
          </h1>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
            Assumptions &amp; Limitations: Constant-rate mathematical projections for educational comparison only; market returns are never guaranteed.
          </p>
        </LiquidGlassReveal>
      </CosmicEntrance>

      {/* Scenario A vs B */}
      <LiquidGlassReveal className="p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Inflation-Adjusted Scenario Comparison</h2>
        <div className="grid gap-4 sm:grid-cols-5">
          <label className="space-y-1 text-xs">
            <span>Monthly SIP</span>
            <input type="number" value={monthlySip} onChange={(e) => setMonthlySip(Math.max(100, Number(e.target.value)))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="space-y-1 text-xs">
            <span>Horizon (Years)</span>
            <input type="number" min={1} max={40} value={years} onChange={(e) => setYears(Math.max(1, Math.min(40, Number(e.target.value))))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="space-y-1 text-xs">
            <span>Scenario A Return %</span>
            <input type="number" step="0.5" value={rateA} onChange={(e) => setRateA(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="space-y-1 text-xs">
            <span>Scenario B Return %</span>
            <input type="number" step="0.5" value={rateB} onChange={(e) => setRateB(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="space-y-1 text-xs">
            <span>Inflation % p.a.</span>
            <input type="number" step="0.5" value={inflation} onChange={(e) => setInflation(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-900" />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
            <div className="text-slate-500">Scenario A ({rateA}% p.a.)</div>
            <div className="mt-1 font-mono text-lg font-bold text-emerald-500">{formatCurrency(sim.a.corpus, currency, locale)}</div>
            <div className="text-slate-500">Today&apos;s purchasing power: {formatIndianCompact(sim.a.realVal)}</div>
          </div>
          <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
            <div className="text-slate-500">Scenario B ({rateB}% p.a.)</div>
            <div className="mt-1 font-mono text-lg font-bold text-amber-500">{formatCurrency(sim.b.corpus, currency, locale)}</div>
            <div className="text-slate-500">Today&apos;s purchasing power: {formatIndianCompact(sim.b.realVal)}</div>
          </div>
          <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
            <div className="text-slate-500">Total Capital Invested</div>
            <div className="mt-1 font-mono text-lg font-bold">{formatCurrency(sim.a.invested, currency, locale)}</div>
            <div className="text-slate-500">Spread (B - A): {formatIndianCompact(sim.b.corpus - sim.a.corpus)}</div>
          </div>
        </div>

        <SimpleBarChart data={sim.chartData} primaryLabel={`Scenario A (${rateA}%)`} secondaryLabel="Scenario B Upside" />
      </LiquidGlassReveal>

      {/* Break-even + Loan Sensitivity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LiquidGlassReveal className="p-6 space-y-4">
          <h2 className="font-display text-base font-semibold">Business Break-Even Analyzer</h2>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="space-y-1">
              <span>Fixed Cost</span>
              <input type="number" value={fixedCost} onChange={(e) => setFixedCost(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 font-mono dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="space-y-1">
              <span>Unit Price</span>
              <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 font-mono dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="space-y-1">
              <span>Variable Cost</span>
              <input type="number" value={unitVarCost} onChange={(e) => setUnitVarCost(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 font-mono dark:border-slate-700 dark:bg-slate-900" />
            </label>
          </div>
          <div className="rounded-xl border border-slate-200/70 p-4 text-xs dark:border-slate-800">
            <div className="text-slate-500">Break-Even Volume</div>
            <div className="mt-1 font-mono text-xl font-bold text-emerald-500">
              {Number.isFinite(breakEven.units) ? `${breakEven.units.toLocaleString()} units` : 'Price must exceed variable cost'}
            </div>
            {Number.isFinite(breakEven.revenue) && (
              <div className="mt-1 text-slate-500">Break-Even Revenue: {formatCurrency(breakEven.revenue, currency, locale)}</div>
            )}
          </div>
        </LiquidGlassReveal>

        <LiquidGlassReveal className="p-6 space-y-3">
          <h2 className="font-display text-base font-semibold">EMI Sensitivity Matrix (Per 10 Lakh Loan)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-2 pr-3">Rate \ Tenure</th>
                  {sensitivityTenures.map((t) => (
                    <th key={t} className="px-2 py-2">{t} yrs</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-mono">
                {sensitivityRates.map((r) => (
                  <tr key={r}>
                    <td className="py-2 pr-3 font-semibold">{r}%</td>
                    {sensitivityTenures.map((t) => (
                      <td key={t} className="px-2 py-2">
                        {formatCurrency(calcEmi(1000000, r, t), currency, locale)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LiquidGlassReveal>
      </div>
    </div>
  );
};
