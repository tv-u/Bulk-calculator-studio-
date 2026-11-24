import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { getPublishedCalculators } from '../engine/calculators';
import { useStudio } from '../context/StudioContext';
import { DocumentHead } from '../components/seo/DocumentHead';
import { CosmicEntrance, LiquidGlassReveal } from '../components/motion/MotionLibrary';
import { MonetagAdSlot } from '../components/ads/MonetagAdSlot';

export const FormulaLibraryPage: React.FC = () => {
  const { unpublishedCalculators } = useStudio();
  const [query, setQuery] = useState('');
  const calcs = useMemo(() => {
    const pub = getPublishedCalculators(unpublishedCalculators);
    const q = query.trim().toLowerCase();
    if (!q) return pub;
    return pub.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.formulaDisplay.toLowerCase().includes(q) ||
        c.categoryLabel.toLowerCase().includes(q)
    );
  }, [unpublishedCalculators, query]);

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Formula Reference Library – BULK CALCULATOR STUDIO"
        description="Searchable reference of verified mathematical, financial, physics, engineering, and health formulas."
      />
      <CosmicEntrance>
        <LiquidGlassReveal className="p-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <BookOpen className="h-4 w-4 text-violet-400" />
              <span>Verified Equations &amp; Explanations</span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Formula Library</h1>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search formulas..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </LiquidGlassReveal>
      </CosmicEntrance>

      <div className="grid gap-4 md:grid-cols-2">
        {calcs.map((c) => (
          <LiquidGlassReveal key={c.id} className="p-5 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">{c.categoryLabel}</div>
              <h2 className="mt-0.5 font-display text-base font-semibold">{c.name}</h2>
              <div className="mt-2 rounded-xl border border-slate-200/70 bg-slate-950/5 p-3 font-mono text-xs dark:border-slate-800 dark:bg-slate-950/60">
                {c.formulaDisplay}
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{c.explanation}</p>
            </div>
            <Link
              to={`/calculators/${c.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-500 hover:underline"
            >
              Launch Interactive Calculator <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </LiquidGlassReveal>
        ))}
      </div>

      <MonetagAdSlot placement="contentPageCard" />
    </div>
  );
};
