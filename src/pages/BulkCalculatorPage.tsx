import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  Play,
  Plus,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStudio } from '../context/StudioContext';
import { evaluateSafeFormula } from '../engine/safeMath';
import { convertUnit, type UnitCategoryId } from '../engine/units';
import { DocumentHead } from '../components/seo/DocumentHead';
import { CosmicEntrance, LiquidGlassReveal, MagneticButton } from '../components/motion/MotionLibrary';

type BulkMode =
  | 'add'
  | 'sub'
  | 'mul'
  | 'div'
  | 'percentage'
  | 'discount'
  | 'gst'
  | 'profit-loss'
  | 'average'
  | 'unit-convert'
  | 'date-diff'
  | 'custom';

interface BulkRow {
  id: string;
  colA: string;
  colB: string;
  colC: string;
  raw?: Record<string, string>;
}

interface ProcessedRow {
  index: number;
  colA: string;
  colB: string;
  colC: string;
  output: string;
  numericOutput: number | null;
  error?: string;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB safety limit
const MAX_ROWS = 50000;

function parseCsvLines(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const first = parseLine(lines[0]);
  const looksLikeHeader = first.some((cell) => Number.isNaN(Number(cell)) && cell.length > 0);
  if (looksLikeHeader && lines.length > 1) {
    return { headers: first, rows: lines.slice(1, MAX_ROWS + 1).map(parseLine) };
  }
  return {
    headers: first.map((_, i) => `col_${i + 1}`),
    rows: lines.slice(0, MAX_ROWS).map(parseLine),
  };
}

const SAMPLE_ROWS: BulkRow[] = [
  { id: 'r1', colA: '1200', colB: '18', colC: '2' },
  { id: 'r2', colA: '2450', colB: '12', colC: '5' },
  { id: 'r3', colA: '890', colB: '5', colC: '10' },
  { id: 'r4', colA: '4999', colB: '18', colC: '1' },
];

export const BulkCalculatorPage: React.FC = () => {
  const { showToast, addReport } = useStudio();
  const [rows, setRows] = useState<BulkRow[]>(SAMPLE_ROWS);
  const [csvHeaders, setCsvHeaders] = useState<string[]>(['colA', 'colB', 'colC']);
  const [mapA, setMapA] = useState('colA');
  const [mapB, setMapB] = useState('colB');
  const [mapC, setMapC] = useState('colC');

  const [mode, setMode] = useState<BulkMode>('gst');
  const [customFormula, setCustomFormula] = useState('(a * c) * (1 + b / 100)');
  const [unitCat, setUnitCat] = useState<UnitCategoryId>('length');
  const [fromUnit, setFromUnit] = useState('km');
  const [toUnit, setToUnit] = useState('mi');

  const [results, setResults] = useState<ProcessedRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showToast('File exceeds 5 MB limit for browser memory safety.', 'error');
      return;
    }
    const validExt = /\.(csv|tsv|txt)$/i.test(file.name);
    if (!validExt && file.type && !file.type.includes('text') && !file.type.includes('csv')) {
      showToast('Please upload a valid CSV or plain-text delimited file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const parsed = parseCsvLines(content);
      if (parsed.rows.length === 0) {
        showToast('No data rows detected in CSV.', 'error');
        return;
      }
      setCsvHeaders(parsed.headers);
      const h0 = parsed.headers[0] || 'col_1';
      const h1 = parsed.headers[1] || h0;
      const h2 = parsed.headers[2] || h1;
      setMapA(h0);
      setMapB(h1);
      setMapC(h2);

      const loaded: BulkRow[] = parsed.rows.map((cells, idx) => {
        const raw: Record<string, string> = {};
        parsed.headers.forEach((h, i) => {
          raw[h] = cells[i] ?? '';
        });
        return {
          id: `csv-${idx}-${Date.now()}`,
          colA: raw[h0] ?? '',
          colB: raw[h1] ?? '',
          colC: raw[h2] ?? '',
          raw,
        };
      });
      setRows(loaded);
      setResults([]);
      showToast(`Imported ${loaded.length} rows from "${file.name}".`, 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const applyColumnMapping = (nextA: string, nextB: string, nextC: string) => {
    setMapA(nextA);
    setMapB(nextB);
    setMapC(nextC);
    setRows((prev) =>
      prev.map((r) =>
        r.raw
          ? {
              ...r,
              colA: r.raw[nextA] ?? r.colA,
              colB: r.raw[nextB] ?? r.colB,
              colC: r.raw[nextC] ?? r.colC,
            }
          : r
      )
    );
  };

  const computeRow = (row: BulkRow, idx: number): ProcessedRow => {
    try {
      if (mode === 'date-diff') {
        const d1 = new Date(row.colA);
        const d2 = new Date(row.colB);
        if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) {
          throw new Error('Invalid date format (expected YYYY-MM-DD)');
        }
        const days = Math.round(Math.abs(d2.getTime() - d1.getTime()) / 86400000);
        return { index: idx + 1, colA: row.colA, colB: row.colB, colC: row.colC, output: `${days} days`, numericOutput: days };
      }

      const a = Number(row.colA);
      const b = row.colB.trim() === '' ? 0 : Number(row.colB);
      const c = row.colC.trim() === '' ? 1 : Number(row.colC);
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
        throw new Error('Non-numeric cell value');
      }

      let val = 0;
      if (mode === 'add') val = a + b;
      else if (mode === 'sub') val = a - b;
      else if (mode === 'mul') val = a * b;
      else if (mode === 'div') {
        if (b === 0) throw new Error('Division by zero');
        val = a / b;
      } else if (mode === 'percentage') val = (a / 100) * b;
      else if (mode === 'discount') val = a * (1 - b / 100);
      else if (mode === 'gst') val = a * (1 + b / 100);
      else if (mode === 'profit-loss') val = (b - a) * c;
      else if (mode === 'average') val = (a + b + c) / 3;
      else if (mode === 'unit-convert') val = convertUnit(a, unitCat, fromUnit, toUnit);
      else {
        const scope: Record<string, number> = { a, b, c };
        if (row.raw) {
          for (const [k, v] of Object.entries(row.raw)) {
            const safeKey = k.replace(/[^a-zA-Z0-9_]/g, '_');
            const n = Number(v);
            if (safeKey && Number.isFinite(n)) scope[safeKey] = n;
          }
        }
        val = evaluateSafeFormula(customFormula, scope);
      }

      return {
        index: idx + 1,
        colA: row.colA,
        colB: row.colB,
        colC: row.colC,
        output: Number.isInteger(val) ? String(val) : val.toFixed(4),
        numericOutput: val,
      };
    } catch (err) {
      return {
        index: idx + 1,
        colA: row.colA,
        colB: row.colB,
        colC: row.colC,
        output: 'Error',
        numericOutput: null,
        error: err instanceof Error ? err.message : 'Row error',
      };
    }
  };

  // Non-blocking chunked execution so browser UI stays responsive on large CSVs
  const runBulk = () => {
    if (rows.length === 0) {
      showToast('Add or import at least one row.', 'error');
      return;
    }
    cancelRef.current = false;
    setProcessing(true);
    setProgress(0);
    const out: ProcessedRow[] = [];
    const CHUNK = 250;
    let cursor = 0;

    const step = () => {
      if (cancelRef.current) {
        setProcessing(false);
        setResults(out);
        showToast(`Cancelled at ${out.length} / ${rows.length} rows.`, 'info');
        return;
      }
      const end = Math.min(rows.length, cursor + CHUNK);
      for (let i = cursor; i < end; i++) {
        out.push(computeRow(rows[i], i));
      }
      cursor = end;
      setProgress(Math.round((cursor / rows.length) * 100));

      if (cursor < rows.length) {
        requestAnimationFrame(step);
      } else {
        setResults(out);
        setProcessing(false);
        const errCount = out.filter((r) => r.error).length;
        showToast(
          errCount > 0
            ? `Processed ${out.length} rows (${errCount} row errors flagged).`
            : `Processed ${out.length} rows successfully.`,
          errCount > 0 ? 'info' : 'success'
        );
      }
    };
    requestAnimationFrame(step);
  };

  const summary = useMemo(() => {
    const validNums = results
      .map((r) => r.numericOutput)
      .filter((n): n is number => n !== null && Number.isFinite(n));
    const errorCount = results.filter((r) => r.error).length;
    if (validNums.length === 0) {
      return { count: results.length, valid: 0, errors: errorCount, sum: 0, avg: 0 };
    }
    const sum = validNums.reduce((s, v) => s + v, 0);
    return {
      count: results.length,
      valid: validNums.length,
      errors: errorCount,
      sum,
      avg: sum / validNums.length,
    };
  }, [results]);

  const exportCsv = () => {
    if (results.length === 0) return;
    const lines = [
      ['Row', mapA, mapB, mapC, 'Result', 'Error'],
      ...results.map((r) => [
        String(r.index),
        r.colA,
        r.colB,
        r.colC,
        r.output,
        r.error || '',
      ]),
    ];
    const csv = lines
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-calculation-${mode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported processed CSV file.', 'success');
  };

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Bulk Calculation Studio & CSV Batch Processor – BULK CALCULATOR STUDIO"
        description="Batch-calculate thousands of spreadsheet rows with CSV import, column mapping, custom safe formulas, row-level errors, and CSV export."
      />

      <CosmicEntrance>
        <LiquidGlassReveal className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <FileSpreadsheet className="h-4 w-4 text-orange-500" />
                <span>Non-Blocking Chunked Processor · Max 5 MB / 50,000 Rows</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                Bulk Calculation Studio
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                <Upload className="h-4 w-4" />
                <span>Import CSV</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <MagneticButton
                variant="outline"
                onClick={() =>
                  setRows((prev) => [
                    ...prev,
                    { id: `r-${Date.now()}`, colA: '100', colB: '10', colC: '1' },
                  ])
                }
              >
                <Plus className="h-4 w-4" /> Add Row
              </MagneticButton>
            </div>
          </div>
        </LiquidGlassReveal>
      </CosmicEntrance>

      {/* Formula & Mapping Config */}
      <LiquidGlassReveal className="p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Bulk Operation Mode
            </span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as BulkMode)}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="add">Bulk Addition (a + b)</option>
              <option value="sub">Bulk Subtraction (a - b)</option>
              <option value="mul">Bulk Multiplication (a × b)</option>
              <option value="div">Bulk Division (a / b)</option>
              <option value="percentage">Bulk Percentage (a% of b)</option>
              <option value="discount">Bulk Discount (a minus b%)</option>
              <option value="gst">Bulk GST / Tax (a + b%)</option>
              <option value="profit-loss">Bulk Profit &amp; Loss ((b - a) × c)</option>
              <option value="average">Bulk Row Average ((a + b + c) / 3)</option>
              <option value="unit-convert">Bulk Unit Conversion (a)</option>
              <option value="date-diff">Bulk Date Difference (a to b)</option>
              <option value="custom">Custom Safe Formula</option>
            </select>
          </label>

          {csvHeaders.length > 0 && (
            <div className="grid grid-cols-3 gap-2 md:col-span-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500">Var a</span>
                <select
                  value={mapA}
                  onChange={(e) => applyColumnMapping(e.target.value, mapB, mapC)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500">Var b</span>
                <select
                  value={mapB}
                  onChange={(e) => applyColumnMapping(mapA, e.target.value, mapC)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500">Var c</span>
                <select
                  value={mapC}
                  onChange={(e) => applyColumnMapping(mapA, mapB, e.target.value)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        {mode === 'custom' && (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Custom Safe Formula (variables: a, b, c, or CSV column names)
            </span>
            <input
              type="text"
              value={customFormula}
              onChange={(e) => setCustomFormula(e.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        )}

        {mode === 'unit-convert' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={unitCat}
              onChange={(e) => {
                const next = e.target.value as UnitCategoryId;
                setUnitCat(next);
                if (next === 'length') { setFromUnit('km'); setToUnit('mi'); }
                else if (next === 'weight') { setFromUnit('kg'); setToUnit('lb'); }
                else if (next === 'temperature') { setFromUnit('C'); setToUnit('F'); }
              }}
              className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="length">Length (km ↔ mi)</option>
              <option value="weight">Weight (kg ↔ lb)</option>
              <option value="temperature">Temperature (C ↔ F)</option>
            </select>
            <input
              type="text"
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              placeholder="From unit (e.g. km)"
              className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              type="text"
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              placeholder="To unit (e.g. mi)"
              className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {!processing ? (
            <MagneticButton variant="primary" onClick={runBulk}>
              <Play className="h-4 w-4" />
              Run Batch ({rows.length} rows)
            </MagneticButton>
          ) : (
            <MagneticButton
              variant="danger"
              onClick={() => {
                cancelRef.current = true;
              }}
            >
              <Square className="h-4 w-4" />
              Cancel ({progress}%)
            </MagneticButton>
          )}

          {results.length > 0 && (
            <>
              <MagneticButton variant="secondary" onClick={exportCsv}>
                <Download className="h-4 w-4" />
                Export Results CSV
              </MagneticButton>
              <MagneticButton
                variant="outline"
                onClick={() =>
                  addReport({
                    title: `Bulk Studio Batch (${mode})`,
                    source: 'Bulk Calculation Studio',
                    inputs: [
                      { label: 'Rows Processed', value: String(summary.count) },
                      { label: 'Operation Mode', value: mode },
                    ],
                    formulas: [mode === 'custom' ? customFormula : mode],
                    assumptions: 'Row-level errors explicitly isolated without silent skipping.',
                    results: [
                      { label: 'Valid Outputs', value: String(summary.valid) },
                      { label: 'Row Errors', value: String(summary.errors) },
                      { label: 'Batch Sum', value: summary.sum.toFixed(2) },
                      { label: 'Batch Average', value: summary.avg.toFixed(4) },
                    ],
                    warnings: summary.errors > 0 ? [`${summary.errors} rows failed validation.`] : [],
                  })
                }
              >
                Save Batch Report
              </MagneticButton>
            </>
          )}
        </div>

        {processing && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full transition-all"
              style={{ width: `${progress}%`, background: 'var(--page-gradient)' }}
            />
          </div>
        )}
      </LiquidGlassReveal>

      {/* Editable Grid + Result Preview */}
      <LiquidGlassReveal className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Showing {Math.min(rows.length, 200)} of {rows.length} input rows</span>
          {results.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
              <span>Valid: {summary.valid}</span>
              <span>Errors: {summary.errors}</span>
              <span>Sum: {summary.sum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span>Avg: {summary.avg.toLocaleString('en-IN', { maximumFractionDigits: 4 })}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">{mapA} (a)</th>
                <th className="px-2 py-2">{mapB} (b)</th>
                <th className="px-2 py-2">{mapC} (c)</th>
                <th className="px-2 py-2">Calculated Output</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {rows.slice(0, 200).map((row, idx) => {
                const res = results[idx];
                return (
                  <tr key={row.id}>
                    <td className="px-2 py-2 font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.colA}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, colA: e.target.value } : r))
                          )
                        }
                        className="w-28 rounded-lg border border-slate-300 bg-white/70 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-900"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.colB}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, colB: e.target.value } : r))
                          )
                        }
                        className="w-28 rounded-lg border border-slate-300 bg-white/70 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-900"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.colC}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, colC: e.target.value } : r))
                          )
                        }
                        className="w-24 rounded-lg border border-slate-300 bg-white/70 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-900"
                      />
                    </td>
                    <td className="px-2 py-2 font-mono font-semibold">
                      {res ? (
                        res.error ? (
                          <span className="inline-flex items-center gap-1 text-rose-500">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {res.error}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">{res.output}</span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                        aria-label="Delete row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </LiquidGlassReveal>
    </div>
  );
};
