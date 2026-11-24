import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Download, Plus, Save, Trash2, Upload, Wrench } from 'lucide-react';
import {
  useStudio,
  type CustomCalculatorConfig,
  type CustomCalculatorFieldDef,
  type CustomCalculatorOutputDef,
} from '../context/StudioContext';
import { evaluateSafeFormula, validateSafeFormula, WHITELISTED_MATH_FUNCTIONS } from '../engine/safeMath';
import { DocumentHead } from '../components/seo/DocumentHead';
import { CosmicEntrance, LiquidGlassReveal, MagneticButton } from '../components/motion/MotionLibrary';

export const CustomBuilderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { customCalculators, saveCustomCalculator, deleteCustomCalculator, showToast } = useStudio();

  const [calcId, setCalcId] = useState(() => `custom-${Date.now()}`);
  const [name, setName] = useState('Solar ROI & Payback Estimator');
  const [description, setDescription] = useState('Custom calculator using safe whitelisted formulas.');
  const [categoryLabel, setCategoryLabel] = useState('Custom Finance');
  const [published, setPublished] = useState(true);

  const [inputs, setInputs] = useState<CustomCalculatorFieldDef[]>([
    { key: 'systemCost', label: 'Installation Cost', type: 'number', defaultValue: 180000, unit: '₹', min: 1 },
    { key: 'monthlyBill', label: 'Monthly Power Savings', type: 'number', defaultValue: 3200, unit: '₹', min: 1 },
    { key: 'subsidy', label: 'Govt Subsidy', type: 'number', defaultValue: 30000, unit: '₹', min: 0 },
  ]);

  const [outputs, setOutputs] = useState<CustomCalculatorOutputDef[]>([
    { id: 'out1', label: 'Net Upfront Cost', formula: 'max(0, systemCost - subsidy)', unit: '₹' },
    { id: 'out2', label: 'Payback Period (Years)', formula: 'round((max(0, systemCost - subsidy)) / (monthlyBill * 12), 2)', unit: 'Years' },
  ]);

  const [previewValues, setPreviewValues] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadId = searchParams.get('load');
    if (loadId) {
      const found = customCalculators.find((c) => c.id === loadId);
      if (found) {
        setCalcId(found.id);
        setName(found.name);
        setDescription(found.description);
        setCategoryLabel(found.categoryLabel);
        setPublished(found.published);
        setInputs(found.inputs);
        setOutputs(found.outputs);
      }
    }
  }, [searchParams, customCalculators]);

  useEffect(() => {
    setPreviewValues((prev) => {
      const next: Record<string, number> = {};
      for (const inp of inputs) {
        next[inp.key] = prev[inp.key] ?? inp.defaultValue;
      }
      return next;
    });
  }, [inputs]);

  const allowedVars = useMemo(() => inputs.map((i) => i.key).filter(Boolean), [inputs]);

  const evaluatedOutputs = useMemo(() => {
    return outputs.map((out) => {
      const check = validateSafeFormula(out.formula, allowedVars);
      if (!check.valid) {
        return { ...out, valid: false, error: check.error, result: null };
      }
      try {
        const val = evaluateSafeFormula(out.formula, previewValues);
        return { ...out, valid: true, error: undefined, result: val };
      } catch (err) {
        return {
          ...out,
          valid: false,
          error: err instanceof Error ? err.message : 'Evaluation error',
          result: null,
        };
      }
    });
  }, [outputs, allowedVars, previewValues]);

  const handleSave = () => {
    if (!name.trim()) {
      showToast('Please enter a calculator name.', 'error');
      return;
    }
    if (evaluatedOutputs.some((o) => !o.valid)) {
      showToast('Fix formula errors before saving.', 'error');
      return;
    }
    const cfg: CustomCalculatorConfig = {
      id: calcId,
      name: name.trim(),
      description: description.trim(),
      categoryLabel: categoryLabel.trim() || 'Custom',
      published,
      inputs,
      outputs,
      updatedAt: new Date().toISOString(),
    };
    saveCustomCalculator(cfg);
  };

  const handleExportJson = () => {
    const cfg: CustomCalculatorConfig = {
      id: calcId,
      name,
      description,
      categoryLabel,
      published,
      inputs,
      outputs,
      updatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as CustomCalculatorConfig;
        if (!parsed.name || !Array.isArray(parsed.inputs) || !Array.isArray(parsed.outputs)) {
          throw new Error('Invalid calculator configuration JSON.');
        }
        setCalcId(`custom-${Date.now()}`);
        setName(parsed.name);
        setDescription(parsed.description || '');
        setCategoryLabel(parsed.categoryLabel || 'Custom');
        setInputs(parsed.inputs);
        setOutputs(parsed.outputs);
        showToast(`Imported "${parsed.name}".`, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Custom Calculator Builder – BULK CALCULATOR STUDIO"
        description="Build no-code custom calculators with input validation, whitelisted safe formulas, live preview, and JSON export."
      />

      <CosmicEntrance>
        <LiquidGlassReveal className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Wrench className="h-4 w-4 text-violet-500" />
                <span>AST Safe Formula Parser · Zero eval() · Search Sync</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                Custom Calculator Builder
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                <Upload className="h-3.5 w-3.5" />
                <span>Import JSON</span>
                <input type="file" accept=".json,application/json" onChange={handleImportJson} className="hidden" />
              </label>
              <MagneticButton variant="outline" onClick={handleExportJson}>
                <Download className="h-4 w-4" /> Export Config
              </MagneticButton>
              <MagneticButton variant="primary" onClick={handleSave}>
                <Save className="h-4 w-4" /> Save Calculator
              </MagneticButton>
            </div>
          </div>
        </LiquidGlassReveal>
      </CosmicEntrance>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Builder Form */}
        <LiquidGlassReveal className="p-6 lg:col-span-7 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium">Calculator Title</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Category Label</span>
              <input
                type="text"
                value={categoryLabel}
                onChange={(e) => setCategoryLabel(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="flex items-center gap-2 pt-6 text-xs font-medium">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-4 w-4 accent-violet-500"
              />
              <span>Publish to Smart Search Index</span>
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium">Description</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>

          {/* Input Fields */}
          <div className="space-y-3 border-t border-slate-200/70 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">Input Fields</h2>
              <button
                type="button"
                onClick={() =>
                  setInputs((prev) => [
                    ...prev,
                    {
                      key: `var${prev.length + 1}`,
                      label: `Input ${prev.length + 1}`,
                      type: 'number',
                      defaultValue: 10,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-violet-500 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add Input
              </button>
            </div>
            {inputs.map((inp, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
                <input
                  type="text"
                  value={inp.key}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                    setInputs((prev) => prev.map((x, i) => (i === idx ? { ...x, key: val } : x)));
                  }}
                  placeholder="varKey"
                  className="col-span-3 rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={inp.label}
                  onChange={(e) =>
                    setInputs((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Field Label"
                  className="col-span-4 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="number"
                  value={inp.defaultValue}
                  onChange={(e) =>
                    setInputs((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, defaultValue: Number(e.target.value) } : x))
                    )
                  }
                  className="col-span-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={inp.unit || ''}
                  onChange={(e) =>
                    setInputs((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)))
                  }
                  placeholder="Unit"
                  className="col-span-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setInputs((prev) => prev.filter((_, i) => i !== idx))}
                  className="col-span-1 flex justify-center text-slate-400 hover:text-rose-500"
                  aria-label="Remove input"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Output Formulas */}
          <div className="space-y-3 border-t border-slate-200/70 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">Output Formulas</h2>
              <button
                type="button"
                onClick={() =>
                  setOutputs((prev) => [
                    ...prev,
                    { id: `out-${Date.now()}`, label: `Output ${prev.length + 1}`, formula: allowedVars[0] || '0', unit: '' },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-violet-500 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add Output
              </button>
            </div>
            {outputs.map((out, idx) => {
              const evalState = evaluatedOutputs[idx];
              return (
                <div key={out.id} className="space-y-2 rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={out.label}
                      onChange={(e) =>
                        setOutputs((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                      }
                      placeholder="Output Label"
                      className="col-span-8 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={out.unit || ''}
                      onChange={(e) =>
                        setOutputs((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)))
                      }
                      placeholder="Unit"
                      className="col-span-3 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setOutputs((prev) => prev.filter((_, i) => i !== idx))}
                      className="col-span-1 flex justify-center text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={out.formula}
                    onChange={(e) =>
                      setOutputs((prev) => prev.map((x, i) => (i === idx ? { ...x, formula: e.target.value } : x)))
                    }
                    placeholder="Formula expression"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  {!evalState?.valid && (
                    <p className="text-xs text-rose-500">{evalState?.error}</p>
                  )}
                </div>
              );
            })}
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Whitelisted functions: {WHITELISTED_MATH_FUNCTIONS.join(', ')}
            </p>
          </div>
        </LiquidGlassReveal>

        {/* Live Preview & Saved Library */}
        <div className="space-y-6 lg:col-span-5">
          <LiquidGlassReveal className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Live Interactive Preview</h2>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="space-y-3">
              {inputs.map((inp) => (
                <label key={inp.key} className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {inp.label} {inp.unit ? `(${inp.unit})` : ''}
                  </span>
                  <input
                    type="number"
                    value={previewValues[inp.key] ?? inp.defaultValue}
                    onChange={(e) =>
                      setPreviewValues((prev) => ({
                        ...prev,
                        [inp.key]: Number(e.target.value),
                      }))
                    }
                    className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
              ))}
            </div>
            <div className="space-y-2 border-t border-slate-200/70 pt-4 dark:border-slate-800">
              {evaluatedOutputs.map((out) => (
                <div key={out.id} className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{out.label}</div>
                  <div className="mt-1 font-mono text-lg font-bold tabular-nums text-violet-600 dark:text-violet-300">
                    {out.result !== null
                      ? `${out.result.toLocaleString('en-IN', { maximumFractionDigits: 4 })} ${out.unit || ''}`
                      : 'Invalid Formula'}
                  </div>
                </div>
              ))}
            </div>
          </LiquidGlassReveal>

          {customCalculators.length > 0 && (
            <LiquidGlassReveal className="p-5 space-y-3">
              <h2 className="font-display text-sm font-semibold">Saved Custom Calculators</h2>
              <div className="space-y-2">
                {customCalculators.map((cc) => (
                  <div key={cc.id} className="flex items-center justify-between rounded-xl border border-slate-200/70 p-3 text-xs dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setCalcId(cc.id);
                        setName(cc.name);
                        setDescription(cc.description);
                        setCategoryLabel(cc.categoryLabel);
                        setPublished(cc.published);
                        setInputs(cc.inputs);
                        setOutputs(cc.outputs);
                      }}
                      className="text-left font-semibold hover:text-violet-500"
                    >
                      {cc.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCustomCalculator(cc.id)}
                      className="text-slate-400 hover:text-rose-500"
                      aria-label={`Delete ${cc.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </LiquidGlassReveal>
          )}
        </div>
      </div>
    </div>
  );
};
