import { jsPDF } from 'jspdf';
import type { CalculatorDefinition, CalculatorResult } from '../engine/calculatorTypes';
import { RTL_LANGUAGE_CODES } from '../i18n/languages';

const NON_LATIN_LANGS = new Set([
  'hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ne', 'si',
  'zh-CN', 'zh-TW', 'ja', 'ko', 'th', 'ar', 'fa', 'he', 'ru', 'uk', 'el', 'bg', 'sr',
]);

export interface PdfExportPayload {
  calculator: CalculatorDefinition;
  values: Record<string, number | string>;
  result: CalculatorResult;
  language: string;
  pageUrl: string;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function openUnicodePrintSheet(payload: PdfExportPayload): void {
  const { calculator, values, result, language, pageUrl } = payload;
  const isRtl = RTL_LANGUAGE_CODES.has(language);
  const rows = calculator.inputs
    .map((f) => {
      const val = values[f.key] ?? f.defaultValue;
      return `<tr><td>${escapeHtml(f.label)}</td><td>${escapeHtml(String(val))}${f.unit ? ` ${escapeHtml(f.unit)}` : ''}</td></tr>`;
    })
    .join('');
  const breakdownRows = result.breakdown
    .map((m) => `<tr><td>${escapeHtml(m.label)}</td><td>${escapeHtml(m.formatted)}</td></tr>`)
    .join('');

  const scheduleHtml =
    result.tableHeaders && result.tableRows && result.tableRows.length > 0
      ? `<h3>Schedule Breakdown</h3>
         <table>
           <thead><tr>${result.tableHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
           <tbody>${result.tableRows
             .slice(0, 48)
             .map((r) => `<tr>${r.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`)
             .join('')}</tbody>
         </table>`
      : '';

  const html = `<!doctype html>
<html lang="${escapeHtml(language)}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(calculator.name)} - Report</title>
<style>
  @page { size: A4; margin: 16mm; }
  body {
    font-family: 'Noto Sans Devanagari', 'Noto Sans Arabic', 'Noto Sans Bengali', 'Noto Sans Tamil', 'Noto Sans SC', 'Noto Sans JP', system-ui, -apple-system, sans-serif;
    color: #0f172a;
    padding: 24px;
    max-width: 820px;
    margin: 0 auto;
    line-height: 1.5;
  }
  .banner { background: #0f172a; color: #f8fafc; padding: 18px 22px; border-radius: 12px; margin-bottom: 18px; }
  .banner small { display: block; font-size: 11px; letter-spacing: 0.08em; color: #94a3b8; }
  h1 { font-size: 21px; margin: 4px 0 0; }
  .meta { font-size: 12px; color: #475569; margin-bottom: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
  .primary { background: #eff6ff; border: 1px solid #bfdbfe; padding: 14px 18px; border-radius: 10px; margin-bottom: 18px; }
  .primary-val { font-size: 24px; font-weight: 700; color: #1d4ed8; }
  h3 { font-size: 14px; margin: 18px 0 8px; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 18px; font-size: 12.5px; }
  th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: ${isRtl ? 'right' : 'left'}; }
  th { background: #f8fafc; font-weight: 600; }
  .note { font-size: 11px; color: #64748b; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
</style>
</head>
<body>
  <div class="banner">
    <small>BULK CALCULATOR STUDIO · VERIFIED CALCULATION REPORT</small>
    <h1>${escapeHtml(calculator.name)}</h1>
  </div>
  <div class="meta">
    Catalog #${calculator.catalogNumber ?? 'Studio'} · Category: ${escapeHtml(calculator.categoryLabel)} · Generated: ${escapeHtml(new Date().toLocaleString())}<br/>
    URL: ${escapeHtml(pageUrl)}
  </div>
  <div class="primary">
    <div style="font-size:12px;color:#475569">${escapeHtml(result.primary.label)}</div>
    <div class="primary-val">${escapeHtml(result.primary.formatted)}</div>
  </div>
  <h3>Input Parameters</h3>
  <table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>
  <h3>Detailed Breakdown</h3>
  <table><thead><tr><th>Metric</th><th>Result</th></tr></thead><tbody>${breakdownRows}</tbody></table>
  ${scheduleHtml}
  <h3>Formula &amp; Derivation</h3>
  <p style="font-size:13px"><strong>Formula:</strong> <code>${escapeHtml(calculator.formulaDisplay)}</code></p>
  <p style="font-size:12.5px;color:#334155">${escapeHtml(calculator.explanation)}</p>
  ${calculator.assumptions ? `<p style="font-size:12px;color:#334155"><strong>Assumptions:</strong> ${escapeHtml(calculator.assumptions)}</p>` : ''}
  ${calculator.disclaimer ? `<p style="font-size:12px;color:#991b1b"><strong>Disclaimer:</strong> ${escapeHtml(calculator.disclaimer)}</p>` : ''}
  <div class="note">Generated locally by BULK CALCULATOR STUDIO deterministic engine.</div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc && iframe.contentWindow) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1800);
    }, 250);
  }
}

export function exportCalculationPdf(payload: PdfExportPayload): 'downloaded' | 'unicode-print' {
  const { calculator, values, result, language, pageUrl } = payload;

  if (NON_LATIN_LANGS.has(language)) {
    openUnicodePrintSheet(payload);
    return 'unicode-print';
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 42;
  let y = 48;

  // Brand Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 595, 76, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('BULK CALCULATOR STUDIO  |  VERIFIED REPORT', margin, 30);
  doc.setFontSize(17);
  doc.text(calculator.name, margin, 54);

  y = 100;
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9.5);
  doc.text(
    `Catalog #${calculator.catalogNumber ?? '-'}   |   Category: ${calculator.categoryLabel}   |   Date: ${new Date().toLocaleString()}`,
    margin,
    y
  );
  y += 14;
  doc.text(`URL: ${pageUrl}`, margin, y);
  y += 24;

  // Primary Result Card
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, 511, 56, 6, 6, 'F');
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(10);
  doc.text(result.primary.label, margin + 14, y + 20);
  doc.setFontSize(18);
  doc.text(String(result.primary.formatted), margin + 14, y + 43);
  y += 74;

  // Inputs Section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text('Inputs', margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  for (const field of calculator.inputs) {
    const val = values[field.key] ?? field.defaultValue;
    doc.text(`• ${field.label}: ${String(val)}`, margin + 8, y);
    y += 15;
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
  }
  y += 10;

  // Breakdown Section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text('Detailed Breakdown', margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  for (const m of result.breakdown) {
    doc.text(`• ${m.label}: ${m.formatted}`, margin + 8, y);
    y += 15;
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
  }
  y += 12;

  // Formula & Steps
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text('Formula & Steps', margin, y);
  y += 16;
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const formulaLines = doc.splitTextToSize(`Formula: ${calculator.formulaDisplay}`, 500);
  doc.text(formulaLines, margin + 6, y);
  y += formulaLines.length * 13 + 6;

  for (const step of result.steps.slice(0, 6)) {
    const lines = doc.splitTextToSize(`- ${step}`, 500);
    doc.text(lines, margin + 6, y);
    y += lines.length * 13;
  }

  if (calculator.assumptions || calculator.disclaimer) {
    y += 14;
    if (y > 740) {
      doc.addPage();
      y = 48;
    }
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const notes = [calculator.assumptions, calculator.disclaimer].filter(Boolean).join('  |  ');
    const wrapped = doc.splitTextToSize(notes, 505);
    doc.text(wrapped, margin, y);
  }

  const safeSlug = (calculator.slug || calculator.id || 'calculation').replace(/[^a-z0-9-_]/gi, '-');
  doc.save(`${safeSlug}-report.pdf`);
  return 'downloaded';
}
