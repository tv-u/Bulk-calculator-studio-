import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Ruler } from 'lucide-react';
import { convertUnit, UNIT_CATEGORIES, type UnitCategoryId } from '../engine/units';
import { DocumentHead } from '../components/seo/DocumentHead';
import { CosmicEntrance, LiquidGlassReveal } from '../components/motion/MotionLibrary';

export const UnitConverterPage: React.FC = () => {
  const [catId, setCatId] = useState<UnitCategoryId>('length');
  const category = useMemo(() => UNIT_CATEGORIES.find((c) => c.id === catId)!, [catId]);
  const [fromUnit, setFromUnit] = useState('km');
  const [toUnit, setToUnit] = useState('mi');
  const [amount, setAmount] = useState('10');

  const handleCategoryChange = (nextId: UnitCategoryId) => {
    setCatId(nextId);
    const nextCat = UNIT_CATEGORIES.find((c) => c.id === nextId)!;
    setFromUnit(nextCat.units[0].id);
    setToUnit(nextCat.units[1]?.id || nextCat.units[0].id);
  };

  const numericVal = Number(amount);
  const converted = useMemo(() => {
    if (!Number.isFinite(numericVal)) return null;
    try {
      return convertUnit(numericVal, catId, fromUnit, toUnit);
    } catch {
      return null;
    }
  }, [numericVal, catId, fromUnit, toUnit]);

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Universal Unit Converter (13 Categories) – BULK CALCULATOR STUDIO"
        description="Convert Length, Weight, Area, Volume, Temperature, Speed, Time, Pressure, Energy, Power, Data, Force, and Density offline."
      />

      <CosmicEntrance>
        <LiquidGlassReveal className="p-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Ruler className="h-4 w-4 text-sky-500" />
            <span>13 Physical &amp; Digital Categories · Works 100% Offline</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Universal Unit Converter</h1>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {UNIT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategoryChange(c.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  c.id === catId
                    ? 'text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                style={c.id === catId ? { background: 'var(--page-gradient)' } : undefined}
              >
                {c.name}
              </button>
            ))}
          </div>
        </LiquidGlassReveal>
      </CosmicEntrance>

      <LiquidGlassReveal className="p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-7 items-end">
          <label className="sm:col-span-2 space-y-1.5 text-xs">
            <span className="font-medium">Value</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-base dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="sm:col-span-2 space-y-1.5 text-xs">
            <span className="font-medium">From Unit</span>
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {category.units.map((u) => (
                <option key={u.id} value={u.id}>{u.label} ({u.symbol})</option>
              ))}
            </select>
          </label>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                setFromUnit(toUnit);
                setToUnit(fromUnit);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              aria-label="Swap units"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>
          <label className="sm:col-span-2 space-y-1.5 text-xs">
            <span className="font-medium">To Unit</span>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {category.units.map((u) => (
                <option key={u.id} value={u.id}>{u.label} ({u.symbol})</option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200/70 p-5 dark:border-slate-800">
          <div className="text-xs text-slate-500">Converted Value</div>
          <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-sky-500">
            {converted !== null
              ? `${converted.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${
                  category.units.find((u) => u.id === toUnit)?.symbol || ''
                }`
              : 'Enter a valid number'}
          </div>
        </div>

        {/* All equivalents table */}
        {Number.isFinite(numericVal) && (
          <div className="grid gap-2.5 sm:grid-cols-3">
            {category.units.map((u) => {
              const v = convertUnit(numericVal, catId, fromUnit, u.id);
              return (
                <div key={u.id} className="rounded-xl border border-slate-200/70 p-3 text-xs dark:border-slate-800">
                  <div className="text-slate-500">{u.label}</div>
                  <div className="mt-0.5 font-mono font-semibold tabular-nums">
                    {v.toLocaleString('en-US', { maximumFractionDigits: 6 })} {u.symbol}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </LiquidGlassReveal>
    </div>
  );
};
