import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Bot, Send } from 'lucide-react';
import { getCalculatorById, getPublishedCalculators } from '../engine/calculators';
import { useStudio } from '../context/StudioContext';
import { DocumentHead } from '../components/seo/DocumentHead';
import { CosmicEntrance, LiquidGlassReveal, MagneticButton } from '../components/motion/MotionLibrary';

interface AiAssistData {
  recommendedCalculatorId?: string;
  extractedInputs?: Array<{ key: string; value: number }>;
  formulaExplanation?: string;
  customFormulaSuggestion?: string;
  workflowTip?: string;
}

export const AIAssistantPage: React.FC = () => {
  const { unpublishedCalculators, locale, currency } = useStudio();
  const [query, setQuery] = useState(
    'What is the monthly EMI for a 30 lakh home loan at 8.5% interest for 20 years?'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiData, setAiData] = useState<AiAssistData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setAiData(null);

    try {
      const published = getPublishedCalculators(unpublishedCalculators);
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          calculators: published.map((c) => ({
            id: c.id,
            name: c.name,
            inputKeys: c.inputs.map((i) => i.key),
          })),
        }),
      });
      const json = (await res.json()) as {
        available?: boolean;
        data?: AiAssistData;
        error?: string;
      };
      if (!res.ok || !json.available || !json.data) {
        setError(json.error || 'AI Assistant is currently unavailable.');
      } else {
        setAiData(json.data);
      }
    } catch {
      setError('Unable to reach AI Assistant server endpoint.');
    } finally {
      setLoading(false);
    }
  };

  // Compute deterministic numerical result from extracted inputs using our verified engine
  const matchedCalc = aiData?.recommendedCalculatorId
    ? getCalculatorById(aiData.recommendedCalculatorId)
    : undefined;

  let deterministicPreview: { primary: string; queryParams: string } | null = null;
  if (matchedCalc) {
    const merged: Record<string, number | string> = {};
    const params = new URLSearchParams();
    for (const f of matchedCalc.inputs) {
      merged[f.key] = f.defaultValue;
    }
    for (const pair of aiData?.extractedInputs || []) {
      if (pair.key && Number.isFinite(pair.value)) {
        merged[pair.key] = pair.value;
        params.set(pair.key, String(pair.value));
      }
    }
    try {
      const out = matchedCalc.compute(merged, { locale, currency });
      deterministicPreview = {
        primary: `${out.primary.label}: ${out.primary.formatted}`,
        queryParams: params.toString(),
      };
    } catch {
      deterministicPreview = null;
    }
  }

  return (
    <div className="space-y-6">
      <DocumentHead
        title="AI Calculation Assistant – BULK CALCULATOR STUDIO"
        description="Ask calculation questions in plain English. Powered by server-side Gemini intent parsing paired with deterministic calculation engines."
      />

      <CosmicEntrance>
        <LiquidGlassReveal className="p-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Bot className="h-4 w-4 text-purple-400" />
            <span>Internet-Dependent · Server-Side AI Intent + Deterministic Math</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            AI Calculation Assistant
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            AI identifies calculator intent, extracts values, and explains formulas; all numerical outputs are computed strictly by our verified mathematical engine.
          </p>
        </LiquidGlassReveal>
      </CosmicEntrance>

      <LiquidGlassReveal className="p-6 space-y-4">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <textarea
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you want to calculate..."
            className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <MagneticButton type="submit" variant="primary" disabled={loading}>
            <Send className="h-4 w-4" />
            {loading ? 'Analyzing Request...' : 'Analyze & Route to Calculator'}
          </MagneticButton>
        </form>

        {error && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">AI Service Unavailable</div>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {aiData && (
          <div className="space-y-4 border-t border-slate-200/70 pt-4 dark:border-slate-800">
            {matchedCalc && deterministicPreview && (
              <div className="rounded-xl border border-purple-500/35 bg-purple-500/10 p-4 space-y-2">
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-300">
                  Deterministic Engine Output ({matchedCalc.name})
                </div>
                <div className="font-mono text-xl font-bold tabular-nums">
                  {deterministicPreview.primary}
                </div>
                <Link
                  to={`/calculators/${matchedCalc.id}?${deterministicPreview.queryParams}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:underline dark:text-purple-300"
                >
                  Open Pre-filled {matchedCalc.name} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {aiData.formulaExplanation && (
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <h2 className="font-display text-sm font-semibold mb-1">Formula Explanation</h2>
                <p>{aiData.formulaExplanation}</p>
              </div>
            )}

            {aiData.customFormulaSuggestion && (
              <div className="rounded-xl border border-slate-200/70 p-3 font-mono text-xs dark:border-slate-800">
                Suggested Custom Formula: {aiData.customFormulaSuggestion}
              </div>
            )}

            {aiData.workflowTip && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Workflow Tip: {aiData.workflowTip}
              </p>
            )}
          </div>
        )}
      </LiquidGlassReveal>
    </div>
  );
};
