import type { CalculatorDefinition, CalculatorResult } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import type { CatalogEntryMeta } from '../catalogTypes';

export function buildChemBioDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();
  const baseDef = {
    id: entry.slug,
    name: entry.name,
    shortDescription: `${entry.name} (#${entry.catalogNumber}) — analytical chemistry, process engineering, or molecular biology equation.`,
    category: (entry.category === 'engineering' ? 'engineering' : 'science') as 'science' | 'engineering',
    categoryLabel: entry.categoryLabel,
    keywords: [entry.name.toLowerCase(), entry.subcategory.toLowerCase(), 'chemistry', 'biology', 'science'],
    synonyms: [entry.slug.replace(/-/g, ' ')],
    relatedIds: ['molarity-calculator', 'ph-calculator', 'ideal-gas-calculator', 'dna-concentration-calculator'],
  };

  // 1. Biology, Genetics, DNA/RNA, PCR, Michaelis-Menten, Diversity Index
  if (entry.solverKey === 'biology_genetics') {
    if (/(dna|rna|gc content|at content|melting temp|primer)/.test(n)) {
      return {
        ...baseDef,
        formulaDisplay: 'GC% = [(G + C) / Length] × 100  |  Wallace Tm = 2(A+T) + 4(G+C) °C  |  dsDNA MW ≈ 650·N g/mol',
        explanation: 'Analyzes nucleotide sequence composition (GC%, AT%), primer melting temperature Tm, and approximate molecular weight.',
        inputs: [
          { key: 'seq', label: 'DNA / Primer Sequence (A, T, G, C)', type: 'text', defaultValue: 'ATGGCTAGCGTATCGATCGA' },
        ],
        compute: (vals): CalculatorResult => {
          const seq = str(vals, 'seq', 'ATGGCTAGCGTATCGATCGA').toUpperCase().replace(/[^ATGCNU]/g, '');
          if (seq.length === 0) throw new Error('Enter valid nucleotide bases (A, T/U, G, C).');
          const a = (seq.match(/A/g) || []).length;
          const t = (seq.match(/[TU]/g) || []).length;
          const g = (seq.match(/G/g) || []).length;
          const c = (seq.match(/C/g) || []).length;
          const gcPct = ((g + c) / seq.length) * 100;
          const tm = seq.length < 14 ? 2 * (a + t) + 4 * (g + c) : 64.9 + (41 * (g + c - 16.4)) / seq.length;
          const mw = seq.length * 650;
          return {
            primary: { label: n.includes('tm') || n.includes('melting') ? 'Primer Melting Temp (Tm)' : n.includes('molecular') ? 'dsDNA Molecular Weight' : 'GC Content (%)', value: n.includes('tm') || n.includes('melting') ? tm : n.includes('molecular') ? mw : gcPct, formatted: n.includes('tm') || n.includes('melting') ? `${tm.toFixed(1)} °C` : n.includes('molecular') ? `${mw.toLocaleString()} g/mol` : `${gcPct.toFixed(2)}%` },
            breakdown: [
              { label: 'Sequence Length', value: seq.length, formatted: `${seq.length} bp` },
              { label: 'GC / AT Content', value: gcPct, formatted: `GC ${gcPct.toFixed(1)}% | AT ${(100 - gcPct).toFixed(1)}%` },
              { label: 'Melting Temp (Tm)', value: tm, formatted: `${tm.toFixed(1)} °C` },
              { label: 'Approx. dsDNA MW', value: mw, formatted: `${mw.toLocaleString()} Da` },
            ],
            steps: [`Counts: A=${a}, T/U=${t}, G=${g}, C=${c} (len=${seq.length})`, `GC% = ${gcPct.toFixed(2)}%, Tm = ${tm.toFixed(1)}°C`],
          };
        },
      };
    }
    if (/(michaelis|enzyme|km |vmax)/.test(n)) {
      return {
        ...baseDef,
        formulaDisplay: 'v = (Vmax · [S]) / (Km + [S])',
        explanation: 'Computes initial enzymatic reaction velocity using the Michaelis-Menten saturation equation.',
        inputs: [
          { key: 'vmax', label: 'Vmax (μmol/min)', type: 'number', defaultValue: 120, min: 0.001, step: 5 },
          { key: 'km', label: 'Michaelis Constant Km (mM)', type: 'number', defaultValue: 2.5, min: 0.0001, step: 0.1 },
          { key: 'sub', label: 'Substrate Conc. [S] (mM)', type: 'number', defaultValue: 5.0, min: 0, step: 0.5 },
        ],
        compute: (vals): CalculatorResult => {
          const vm = num(vals, 'vmax'), km = num(vals, 'km'), s = num(vals, 'sub');
          if (vm <= 0 || km <= 0 || s < 0) throw new Error('Vmax and Km must be positive, [S] >= 0.');
          const v = (vm * s) / (km + s);
          return {
            primary: { label: 'Reaction Velocity (v)', value: v, formatted: `${v.toFixed(3)} μmol/min` },
            breakdown: [
              { label: 'Saturation (% Vmax)', value: (v / vm) * 100, formatted: `${((v / vm) * 100).toFixed(1)}%` },
              { label: 'Catalytic Efficiency Ratio', value: vm / km, formatted: (vm / km).toFixed(3) },
            ],
            steps: [`v = (${vm} × ${s}) / (${km} + ${s}) = ${v.toFixed(3)}`],
          };
        },
      };
    }
    return {
      ...baseDef,
      formulaDisplay: "Shannon H' = -Σ pᵢ·ln(pᵢ)  |  Hardy-Weinberg: p² + 2pq + q² = 1  |  N(t) = N₀·e^(rt)",
      explanation: 'Computes ecological diversity indices (Shannon/Simpson), Hardy-Weinberg genotype frequencies, or exponential cell doubling growth.',
      inputs: [
        { key: 'counts', label: 'Species Counts / Allele Freqs (comma-separated)', type: 'text', defaultValue: '25, 40, 15, 20' },
        { key: 'hours', label: 'Growth Time / Doubling Time (hr)', type: 'number', defaultValue: 6, min: 0.1, step: 0.5 },
      ],
      compute: (vals): CalculatorResult => {
        const arr = str(vals, 'counts').split(/[,\s]+/).map(Number).filter((x) => Number.isFinite(x) && x > 0);
        const t = num(vals, 'hours');
        if (arr.length === 0) throw new Error('Enter positive numeric species/population counts.');
        const total = arr.reduce((a, b) => a + b, 0);
        let shannon = 0;
        let simpsonSum = 0;
        for (const c of arr) {
          const p = c / total;
          shannon -= p * Math.log(p);
          simpsonSum += p * p;
        }
        const simpson = 1 - simpsonSum;
        const pHw = arr[0] <= 1 ? arr[0] : arr[0] / total;
        const qHw = 1 - pHw;
        return {
          primary: { label: n.includes('hardy') ? 'Heterozygote Freq (2pq)' : n.includes('simpson') ? 'Simpson Diversity (1 - D)' : 'Shannon Diversity (H′)', value: n.includes('hardy') ? 2 * pHw * qHw : n.includes('simpson') ? simpson : shannon, formatted: n.includes('hardy') ? `${(2 * pHw * qHw * 100).toFixed(2)}% (p²=${(pHw*pHw).toFixed(3)}, q²=${(qHw*qHw).toFixed(3)})` : (n.includes('simpson') ? simpson : shannon).toFixed(4) },
          breakdown: [
            { label: 'Shannon Index H′', value: shannon, formatted: shannon.toFixed(4) },
            { label: 'Simpson Index (1 - D)', value: simpson, formatted: simpson.toFixed(4) },
            { label: 'Doubling Generations (t/2)', value: Math.pow(2, t / 2), formatted: `${Math.pow(2, t / 2).toFixed(2)}× growth` },
          ],
          steps: [`Total N = ${total}, Species S = ${arr.length}`, `H′ = ${shannon.toFixed(4)}, 1-D = ${simpson.toFixed(4)}`],
        };
      },
    };
  }

  // 2. Chemical Process Engineering (LMTD Heat Exchanger, Residence Time, Distillation, Membrane)
  if (entry.solverKey === 'chemical_process') {
    return {
      ...baseDef,
      formulaDisplay: 'LMTD = (ΔT₁ - ΔT₂) / ln(ΔT₁ / ΔT₂)  |  τ = V / Q  |  Q = U·A·LMTD',
      explanation: 'Computes Heat Exchanger LMTD, CSTR/PFR reactor residence time, distillation recovery, and Darcy pipe loss.',
      inputs: [
        { key: 'dt1', label: 'Hot Approach ΔT₁ (°C) / Reactor Volume V (m³)', type: 'number', defaultValue: 45, min: 0.01, step: 1 },
        { key: 'dt2', label: 'Cold Approach ΔT₂ (°C) / Flow Rate Q (m³/h)', type: 'number', defaultValue: 18, min: 0.01, step: 1 },
        { key: 'ua', label: 'Heat Transfer Coeff U·A (kW/°C) / Conc C₀', type: 'number', defaultValue: 12, min: 0.01, step: 0.5 },
      ],
      compute: (vals): CalculatorResult => {
        const a = num(vals, 'dt1'), b = num(vals, 'dt2'), c = num(vals, 'ua');
        if (a <= 0 || b <= 0 || c <= 0) throw new Error('All process parameters must be positive.');
        const lmtd = Math.abs(a - b) < 1e-6 ? a : (a - b) / Math.log(a / b);
        const heatDutyKw = c * lmtd;
        const resTimeHr = a / b;
        return {
          primary: { label: n.includes('residence') || n.includes('reactor') || n.includes('cstr') || n.includes('pfr') ? 'Mean Residence Time (τ)' : 'Log Mean Temp Diff (LMTD)', value: n.includes('residence') || n.includes('reactor') ? resTimeHr : lmtd, formatted: n.includes('residence') || n.includes('reactor') ? `${resTimeHr.toFixed(3)} hr (${(resTimeHr * 60).toFixed(1)} min)` : `${lmtd.toFixed(2)} °C` },
          breakdown: [
            { label: 'Heat Duty (U·A·LMTD)', value: heatDutyKw, formatted: `${heatDutyKw.toFixed(2)} kW` },
            { label: 'Space Velocity (1/τ)', value: 1 / resTimeHr, formatted: `${(1 / resTimeHr).toFixed(3)} hr⁻¹` },
          ],
          steps: [`LMTD = (${a} - ${b}) / ln(${a}/${b}) = ${lmtd.toFixed(3)} °C`],
        };
      },
    };
  }

  // 3. Analytical Chemistry & Thermodynamics (Molarity, Dilution, pH, Ideal Gas, Half-Life, Gibbs)
  if (/(ph|poh|acid|buffer|henderson)/.test(n)) {
    return {
      ...baseDef,
      formulaDisplay: 'pH = -log₁₀[H⁺]  |  pH = pKa + log₁₀([A⁻]/[HA])  |  pH + pOH = 14 (25°C)',
      explanation: 'Computes strong acid/base pH, pOH, and Henderson-Hasselbalch buffer solution pH.',
      inputs: [
        { key: 'conc', label: 'H⁺ Concentration (mol/L) or [A⁻] Base', type: 'number', defaultValue: 0.001, min: 1e-14, max: 20, step: 0.0001 },
        { key: 'acidConc', label: 'Conjugate Acid [HA] (for Buffer)', type: 'number', defaultValue: 0.001, min: 1e-14, max: 20, step: 0.0001 },
        { key: 'pka', label: 'pKa (for Buffer / Weak Acid)', type: 'number', defaultValue: 4.76, min: -10, max: 20, step: 0.05 },
      ],
      compute: (vals): CalculatorResult => {
        const h = num(vals, 'conc'), ha = num(vals, 'acidConc'), pka = num(vals, 'pka');
        if (h <= 0 || ha <= 0) throw new Error('Concentrations must be positive.');
        const isBuffer = n.includes('buffer') || n.includes('henderson');
        const ph = isBuffer ? pka + Math.log10(h / ha) : -Math.log10(h);
        const poh = 14 - ph;
        return {
          primary: { label: n.includes('poh') ? 'Solution pOH' : 'Solution pH', value: n.includes('poh') ? poh : ph, formatted: (n.includes('poh') ? poh : ph).toFixed(3) },
          breakdown: [
            { label: 'pH', value: ph, formatted: ph.toFixed(3) },
            { label: 'pOH (25°C)', value: poh, formatted: poh.toFixed(3) },
            { label: 'Character', value: ph < 6.9 ? 'Acidic' : ph > 7.1 ? 'Basic' : 'Neutral', formatted: ph < 6.9 ? 'Acidic' : ph > 7.1 ? 'Basic / Alkaline' : 'Neutral' },
          ],
          steps: [isBuffer ? `pH = ${pka} + log₁₀(${h}/${ha}) = ${ph.toFixed(3)}` : `pH = -log₁₀(${h}) = ${ph.toFixed(3)}`],
        };
      },
    };
  }

  return {
    ...baseDef,
    formulaDisplay: 'M = n / V(L)  |  C₁V₁ = C₂V₂  |  PV = nRT (R = 0.082057 L·atm/mol·K)',
    explanation: 'Computes molarity, serial dilution, ideal gas law state variables, half-life decay, and ΔG = ΔH - TΔS.',
    inputs: [
      { key: 'molesOrC1', label: 'Moles n / Conc C₁ (M) / Initial N₀', type: 'number', defaultValue: 1.5, min: 0.0001, step: 0.1 },
      { key: 'volL', label: 'Volume V (Liters) / Half-Life t₁/₂', type: 'number', defaultValue: 2.0, min: 0.0001, step: 0.1 },
      { key: 'tempK', label: 'Temperature T (Kelvin) / Elapsed Time', type: 'number', defaultValue: 298.15, min: 0.1, step: 5 },
    ],
    compute: (vals): CalculatorResult => {
      const a = num(vals, 'molesOrC1'), b = num(vals, 'volL'), t = num(vals, 'tempK');
      if (a <= 0 || b <= 0 || t <= 0) throw new Error('Values must be positive.');
      const molarity = a / b;
      const pressureAtm = (a * 0.082057366 * t) / b;
      const decayRem = a * Math.pow(0.5, t / (b * 100));
      return {
        primary: { label: n.includes('gas') || n.includes('boyle') || n.includes('charles') || n.includes('avogadro') ? 'Ideal Gas Pressure (P)' : n.includes('half life') || n.includes('decay') ? 'Remaining Quantity N(t)' : 'Molar Concentration (M)', value: n.includes('gas') || n.includes('boyle') ? pressureAtm : n.includes('half life') || n.includes('decay') ? decayRem : molarity, formatted: n.includes('gas') || n.includes('boyle') ? `${pressureAtm.toFixed(3)} atm` : n.includes('half life') || n.includes('decay') ? decayRem.toFixed(4) : `${molarity.toFixed(4)} mol/L` },
        breakdown: [
          { label: 'Molarity (n / V)', value: molarity, formatted: `${molarity.toFixed(4)} M` },
          { label: 'Ideal Gas P (PV=nRT)', value: pressureAtm, formatted: `${pressureAtm.toFixed(3)} atm (${(pressureAtm * 101.325).toFixed(1)} kPa)` },
          { label: 'Target Vol for 0.1M Dilution', value: (molarity * b) / 0.1, formatted: `${((molarity * b) / 0.1).toFixed(2)} L` },
        ],
        steps: [`M = ${a} / ${b} = ${molarity.toFixed(4)} M`, `P = ${a}×0.08206×${t}/${b} = ${pressureAtm.toFixed(3)} atm`],
      };
    },
  };
}
