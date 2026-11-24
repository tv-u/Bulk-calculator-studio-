import React, { useMemo, useState } from 'react';
import { BarChart3, Download, Sparkles, Trash2, Upload } from 'lucide-react';
import { useStudio } from '../context/StudioContext';
import { DocumentHead } from '../components/seo/DocumentHead';
import { CosmicEntrance, LiquidGlassReveal, MagneticButton } from '../components/motion/MotionLibrary';
import { SimpleBarChart } from '../components/charts/SimpleChart';

const SAMPLE_CSV = `Region,Revenue,Units,DiscountPct
North,145000,120,5
South,182000,150,8
West,164000,138,6
East,98000,84,10
North,145000,120,5
Central,,92,4`;

export const DataAnalysisPage: React.FC = () => {
  const { showToast, addReport } = useStudio();
  const [headers, setHeaders] = useState<string[]>(['Region', 'Revenue', 'Units', 'DiscountPct']);
  const [rows, setRows] = useState<string[][]>(() =>
    SAMPLE_CSV.split('\n').slice(1).map((l) => l.split(','))
  );
  const [filterText, setFilterText] = useState('');
  const [sortCol, setSortCol] = useState<number>(1);
  const [sortAsc, setSortAsc] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File exceeds 5 MB safe limit.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || '')
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        showToast('CSV must contain a header row and at least 1 data row.', 'error');
        return;
      }
      setHeaders(lines[0].split(',').map((h) => h.trim()));
      setRows(lines.slice(1).map((l) => l.split(',').map((c) => c.trim())));
      showToast(`Loaded ${lines.length - 1} rows from ${file.name}.`, 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const qualityAudit = useMemo(() => {
    let missingCells = 0;
    const seen = new Set<string>();
    let duplicates = 0;
    for (const r of rows) {
      const key = r.join('|');
      if (seen.has(key)) duplicates++;
      seen.add(key);
      for (let i = 0; i < headers.length; i++) {
        if (!r[i] || r[i].trim() === '') missingCells++;
      }
    }
    return { missingCells, duplicates };
  }, [rows, headers]);

  const cleanDuplicates = () => {
    const seen = new Set<string>();
    const deduped = rows.filter((r) => {
      const k = r.join('|');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setRows(deduped);
    showToast('Removed duplicate rows.', 'success');
  };

  const fillMissingWithZeroOrMean = () => {
    const colMeans = headers.map((_, ci) => {
      const nums = rows.map((r) => Number(r[ci])).filter((n) => Number.isFinite(n) && rCellNonEmpty(n));
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    });
    function rCellNonEmpty(v: number) {
      return Number.isFinite(v);
    }
    setRows((prev) =>
      prev.map((r) =>
        headers.map((_, ci) => {
          const cur = (r[ci] ?? '').trim();
          if (cur !== '') return cur;
          const mean = colMeans[ci];
          return mean !== null ? mean.toFixed(2) : 'N/A';
        })
      )
    );
    showToast('Filled missing values using column mean / fallback.', 'success');
  };

  const numericSummaries = useMemo(() => {
    return headers.map((h, ci) => {
      const vals = rows
        .map((r) => r[ci]?.trim())
        .filter((s) => s !== undefined && s !== '')
        .map(Number)
        .filter((n) => Number.isFinite(n));
      if (vals.length === 0) return null;
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / vals.length;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return { name: h, count: vals.length, sum, mean, min, max, colIdx: ci };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [headers, rows]);

  const displayedRows = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.some((cell) => cell.toLowerCase().includes(q)))
      : [...rows];
    filtered.sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const an = Number(av);
      const bn = Number(bv);
      const cmp = Number.isFinite(an) && Number.isFinite(bn) ? an - bn : av.localeCompare(bv);
      return sortAsc ? cmp : -cmp;
    });
    return filtered;
  }, [rows, filterText, sortCol, sortAsc]);

  const chartData = useMemo(() => {
    const primaryNumCol = numericSummaries[0]?.colIdx ?? 1;
    return displayedRows.slice(0, 15).map((r, i) => ({
      label: r[0] || `Row ${i + 1}`,
      value: Number(r[primaryNumCol]) || 0,
    }));
  }, [displayedRows, numericSummaries]);

  const exportCleanedCsv = () => {
    const csv = [headers, ...displayedRows]
      .map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned-dataset.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Data Analysis & Cleaning Studio – BULK CALCULATOR STUDIO"
        description="Import CSV datasets, detect missing values and duplicates, clean data, view statistical summaries and charts, and export."
      />

      <CosmicEntrance>
        <LiquidGlassReveal className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <BarChart3 className="h-4 w-4 text-teal-500" />
                <span>CSV Quality Audit · Statistical Profiling · Export</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Data Analysis Studio</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload CSV</span>
                <input type="file" accept=".csv,.txt" onChange={handleUpload} className="hidden" />
              </label>
              <MagneticButton variant="secondary" onClick={exportCleanedCsv}>
                <Download className="h-4 w-4" /> Export CSV
              </MagneticButton>
              <MagneticButton
                variant="primary"
                onClick={() =>
                  addReport({
                    title: 'Dataset Analysis Report',
                    source: 'Data Analysis Studio',
                    inputs: [
                      { label: 'Rows', value: String(rows.length) },
                      { label: 'Columns', value: String(headers.length) },
                    ],
                    formulas: ['Sample mean, min, max, missing & duplicate scan'],
                    assumptions: 'Blank cells detected prior to mean imputation.',
                    results: numericSummaries.map((s) => ({
                      label: `${s.name} (Mean / Sum)`,
                      value: `${s.mean.toFixed(2)} / ${s.sum.toFixed(2)}`,
                    })),
                    warnings: [
                      ...(qualityAudit.missingCells > 0 ? [`${qualityAudit.missingCells} missing cells detected.`] : []),
                      ...(qualityAudit.duplicates > 0 ? [`${qualityAudit.duplicates} duplicate rows detected.`] : []),
                    ],
                  })
                }
              >
                Generate Report
              </MagneticButton>
            </div>
          </div>
        </LiquidGlassReveal>
      </CosmicEntrance>

      {/* Quality & Cleaning Bar */}
      <div className="grid gap-4 md:grid-cols-3">
        <LiquidGlassReveal className="p-4 text-xs">
          <div className="text-slate-500">Dataset Shape</div>
          <div className="mt-1 font-mono text-lg font-bold tabular-nums">
            {rows.length} rows × {headers.length} cols
          </div>
        </LiquidGlassReveal>
        <LiquidGlassReveal className="p-4 text-xs flex items-center justify-between gap-2">
          <div>
            <div className="text-slate-500">Missing Cells</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-amber-500">
              {qualityAudit.missingCells}
            </div>
          </div>
          {qualityAudit.missingCells > 0 && (
            <button
              type="button"
              onClick={fillMissingWithZeroOrMean}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-3 py-1.5 font-semibold text-amber-600 dark:text-amber-300"
            >
              <Sparkles className="h-3.5 w-3.5" /> Impute
            </button>
          )}
        </LiquidGlassReveal>
        <LiquidGlassReveal className="p-4 text-xs flex items-center justify-between gap-2">
          <div>
            <div className="text-slate-500">Duplicate Rows</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-rose-500">
              {qualityAudit.duplicates}
            </div>
          </div>
          {qualityAudit.duplicates > 0 && (
            <button
              type="button"
              onClick={cleanDuplicates}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-3 py-1.5 font-semibold text-rose-600 dark:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" /> Dedupe
            </button>
          )}
        </LiquidGlassReveal>
      </div>

      {/* Numeric Column Summaries & Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LiquidGlassReveal className="p-5 space-y-3">
          <h2 className="font-display text-base font-semibold">Numeric Column Summary</h2>
          <div className="space-y-2 text-xs">
            {numericSummaries.map((s) => (
              <div key={s.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/70 p-3 dark:border-slate-800 font-mono tabular-nums">
                <span className="font-semibold font-sans">{s.name}</span>
                <span>Mean: {s.mean.toFixed(2)}</span>
                <span>Min: {s.min}</span>
                <span>Max: {s.max}</span>
              </div>
            ))}
          </div>
        </LiquidGlassReveal>

        <LiquidGlassReveal className="p-5 space-y-3">
          <h2 className="font-display text-base font-semibold">Visual Distribution</h2>
          <SimpleBarChart data={chartData} primaryLabel={numericSummaries[0]?.name || 'Value'} />
        </LiquidGlassReveal>
      </div>

      {/* Interactive Table */}
      <LiquidGlassReveal className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Data Table Preview</h2>
          <input
            type="search"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter rows..."
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                {headers.map((h, ci) => (
                  <th key={h} className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (sortCol === ci) setSortAsc((a) => !a);
                        else { setSortCol(ci); setSortAsc(true); }
                      }}
                      className="font-semibold hover:underline"
                    >
                      {h} {sortCol === ci ? (sortAsc ? '↑' : '↓') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-mono">
              {displayedRows.slice(0, 100).map((r, ri) => (
                <tr key={ri}>
                  {headers.map((_, ci) => (
                    <td key={ci} className="px-3 py-2">
                      {r[ci]?.trim() ? r[ci] : <span className="text-amber-500">missing</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LiquidGlassReveal>
    </div>
  );
};
