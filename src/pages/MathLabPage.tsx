import React, { useMemo, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { evaluateSafeFormula, numericalDerivative, simpsonIntegral } from '../engine/safeMath';
import { DocumentHead } from '../components/seo/DocumentHead';
import { CosmicEntrance, LiquidGlassReveal } from '../components/motion/MotionLibrary';

export const MathLabPage: React.FC = () => {
  const [exprF, setExprF] = useState('sin(x) * 3 + x^2 / 8');
  const [exprG, setExprG] = useState('cos(x) * 2');
  const [xMin, setXMin] = useState(-6);
  const [xMax, setXMax] = useState(6);
  const [evalX, setEvalX] = useState(1.5);
  const [precision, setPrecision] = useState(5);

  const [sciExpr, setSciExpr] = useState('log10(1000) + sqrt(256) * cos(0)');
  const [quadA, setQuadA] = useState(2);
  const [quadB, setQuadB] = useState(-7);
  const [quadC, setQuadC] = useState(3);

  const plotData = useMemo(() => {
    const ptsF: Array<{ x: number; y: number }> = [];
    const ptsG: Array<{ x: number; y: number }> = [];
    const steps = 120;
    const span = Math.max(0.5, xMax - xMin);
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * span;
      try {
        const y = evaluateSafeFormula(exprF, { x });
        if (Math.abs(y) < 1e4) ptsF.push({ x, y });
      } catch {
        // skip discontinuity
      }
      if (exprG.trim()) {
        try {
          const yg = evaluateSafeFormula(exprG, { x });
          if (Math.abs(yg) < 1e4) ptsG.push({ x, y: yg });
        } catch {
          // skip
        }
      }
    }
    const allY = [...ptsF.map((p) => p.y), ...ptsG.map((p) => p.y)];
    const minY = allY.length ? Math.min(...allY, -1) : -5;
    const maxY = allY.length ? Math.max(...allY, 1) : 5;
    return { ptsF, ptsG, minY, maxY };
  }, [exprF, exprG, xMin, xMax]);

  const calculus = useMemo(() => {
    try {
      const fx = evaluateSafeFormula(exprF, { x: evalX });
      const dfx = numericalDerivative(exprF, evalX);
      const area = simpsonIntegral(exprF, xMin, xMax, 200);
      return { fx, dfx, area, error: null as string | null };
    } catch (err) {
      return {
        fx: 0,
        dfx: 0,
        area: 0,
        error: err instanceof Error ? err.message : 'Expression error',
      };
    }
  }, [exprF, evalX, xMin, xMax]);

  const sciResult = useMemo(() => {
    try {
      return { val: evaluateSafeFormula(sciExpr, {}), err: null as string | null };
    } catch (err) {
      return { val: null, err: err instanceof Error ? err.message : 'Invalid expression' };
    }
  }, [sciExpr]);

  const quadRoots = useMemo(() => {
    if (quadA === 0) return quadB === 0 ? 'No variable x' : `Linear: x = ${(-quadC / quadB).toFixed(precision)}`;
    const d = quadB * quadB - 4 * quadA * quadC;
    if (d >= 0) {
      const r1 = (-quadB + Math.sqrt(d)) / (2 * quadA);
      const r2 = (-quadB - Math.sqrt(d)) / (2 * quadA);
      return `x₁ = ${r1.toFixed(precision)}, x₂ = ${r2.toFixed(precision)} (Δ = ${d.toFixed(2)})`;
    }
    const re = (-quadB / (2 * quadA)).toFixed(precision);
    const im = (Math.sqrt(-d) / Math.abs(2 * quadA)).toFixed(precision);
    return `${re} ± ${im}i (Complex, Δ = ${d.toFixed(2)})`;
  }, [quadA, quadB, quadC, precision]);

  const toSvg = (x: number, y: number) => {
    const W = 640;
    const H = 260;
    const sx = ((x - xMin) / Math.max(0.5, xMax - xMin)) * W;
    const yRange = Math.max(0.5, plotData.maxY - plotData.minY);
    const sy = H - ((y - plotData.minY) / yRange) * (H - 20) - 10;
    return `${sx.toFixed(1)},${sy.toFixed(1)}`;
  };

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Mathematics Lab & Function Grapher – BULK CALCULATOR STUDIO"
        description="Plot functions f(x) & g(x), evaluate scientific expressions, solve quadratic equations, and compute numerical derivatives & integrals."
      />

      <CosmicEntrance>
        <LiquidGlassReveal className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <FlaskConical className="h-4 w-4 text-teal-400" />
                <span>Symbolic &amp; Numerical Lab · Exact vs Approximation Tracking</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Mathematics Lab</h1>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium">
              <span>Precision:</span>
              <select
                value={precision}
                onChange={(e) => setPrecision(Number(e.target.value))}
                className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono dark:border-slate-700 dark:bg-slate-900"
              >
                {[2, 4, 5, 6, 8, 10].map((p) => (
                  <option key={p} value={p}>{p} decimals</option>
                ))}
              </select>
            </label>
          </div>
        </LiquidGlassReveal>
      </CosmicEntrance>

      {/* Function Grapher & Calculus */}
      <LiquidGlassReveal className="p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-medium text-blue-500">f(x) =</span>
            <input
              type="text"
              value={exprF}
              onChange={(e) => setExprF(e.target.value)}
              className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-teal-500">g(x) = (optional)</span>
            <input
              type="text"
              value={exprG}
              onChange={(e) => setExprG(e.target.value)}
              className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">x Min / Max</span>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={xMin}
                onChange={(e) => setXMin(Number(e.target.value))}
                className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                type="number"
                value={xMax}
                onChange={(e) => setXMax(Number(e.target.value))}
                className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">Probe at x =</span>
            <input
              type="number"
              step="0.1"
              value={evalX}
              onChange={(e) => setEvalX(Number(e.target.value))}
              className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-slate-950/5 p-3 dark:border-slate-800 dark:bg-slate-950/60">
          <svg viewBox="0 0 640 260" className="h-60 w-full">
            {plotData.minY <= 0 && plotData.maxY >= 0 && (
              <line
                x1={0}
                x2={640}
                y1={260 - ((0 - plotData.minY) / Math.max(0.5, plotData.maxY - plotData.minY)) * 240 - 10}
                y2={260 - ((0 - plotData.minY) / Math.max(0.5, plotData.maxY - plotData.minY)) * 240 - 10}
                stroke="currentColor"
                strokeOpacity={0.25}
              />
            )}
            {xMin <= 0 && xMax >= 0 && (
              <line
                x1={((0 - xMin) / Math.max(0.5, xMax - xMin)) * 640}
                x2={((0 - xMin) / Math.max(0.5, xMax - xMin)) * 640}
                y1={0}
                y2={260}
                stroke="currentColor"
                strokeOpacity={0.25}
              />
            )}
            {plotData.ptsF.length > 1 && (
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                points={plotData.ptsF.map((p) => toSvg(p.x, p.y)).join(' ')}
              />
            )}
            {plotData.ptsG.length > 1 && (
              <polyline
                fill="none"
                stroke="#14b8a6"
                strokeWidth="2"
                strokeDasharray="5 3"
                points={plotData.ptsG.map((p) => toSvg(p.x, p.y)).join(' ')}
              />
            )}
          </svg>
        </div>

        {calculus.error ? (
          <p className="text-xs text-rose-500">{calculus.error}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
              <div className="text-slate-500">Exact f({evalX})</div>
              <div className="mt-1 font-mono text-base font-bold tabular-nums">{calculus.fx.toFixed(precision)}</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
              <div className="text-slate-500">Approx. Derivative f&apos;({evalX})</div>
              <div className="mt-1 font-mono text-base font-bold tabular-nums">{calculus.dfx.toFixed(precision)}</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
              <div className="text-slate-500">Approx. Integral ∫[{xMin}, {xMax}]</div>
              <div className="mt-1 font-mono text-base font-bold tabular-nums">{calculus.area.toFixed(precision)}</div>
            </div>
          </div>
        )}
      </LiquidGlassReveal>

      {/* Scientific Console & Quadratic Solver */}
      <div className="grid gap-6 md:grid-cols-2">
        <LiquidGlassReveal className="p-6 space-y-3">
          <h2 className="font-display text-base font-semibold">Scientific Expression Console</h2>
          <input
            type="text"
            value={sciExpr}
            onChange={(e) => setSciExpr(e.target.value)}
            className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="rounded-xl border border-slate-200/70 p-3.5 dark:border-slate-800">
            <div className="text-xs text-slate-500">Evaluated Output</div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums text-blue-500">
              {sciResult.err ? sciResult.err : sciResult.val?.toFixed(precision)}
            </div>
          </div>
        </LiquidGlassReveal>

        <LiquidGlassReveal className="p-6 space-y-3">
          <h2 className="font-display text-base font-semibold">Algebraic Quadratic Solver (ax² + bx + c = 0)</h2>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" value={quadA} onChange={(e) => setQuadA(Number(e.target.value))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input type="number" value={quadB} onChange={(e) => setQuadB(Number(e.target.value))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input type="number" value={quadC} onChange={(e) => setQuadC(Number(e.target.value))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900" />
          </div>
          <div className="rounded-xl border border-slate-200/70 p-3.5 dark:border-slate-800">
            <div className="text-xs text-slate-500">Exact Roots &amp; Discriminant</div>
            <div className="mt-1 font-mono text-sm font-bold tabular-nums text-teal-500">{quadRoots}</div>
          </div>
        </LiquidGlassReveal>
      </div>
    </div>
  );
};
