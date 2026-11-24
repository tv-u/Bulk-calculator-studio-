import type { CalculatorDefinition, CalculatorResult } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import type { CatalogEntryMeta } from '../catalogTypes';

const HEALTH_DISCLAIMER =
  'Informational anthropometric/clinical reference tool only. Not a substitute for professional medical diagnosis or individualized clinical judgment.';

export function buildHealthDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();
  const baseDef = {
    id: entry.slug,
    name: entry.name,
    shortDescription: `${entry.name} (#${entry.catalogNumber}) — standardized physiological, sports, nutrition, or clinical reference formula.`,
    category: entry.category as 'health' | 'sports' | 'food',
    categoryLabel: entry.categoryLabel,
    keywords: [entry.name.toLowerCase(), entry.subcategory.toLowerCase(), entry.category],
    synonyms: [entry.slug.replace(/-/g, ' ')],
    disclaimer: entry.category === 'food' ? undefined : HEALTH_DISCLAIMER,
    relatedIds: ['bmi-calculator', 'bmr-calculator', 'tdee-calculator', 'protein-calculator'],
  };

  // 1. Clinical Medical & Scoring Calculators (CrCl, eGFR, Anion Gap, QTc, MAP, Osmolality, Fluid, Dose)
  if (entry.solverKey === 'clinical_medical') {
    if (/(gfr|creatinine|cockcroft)/.test(n)) {
      return {
        ...baseDef,
        formulaDisplay: 'Cockcroft-Gault CrCl = [(140 - Age) × Weight] / (72 × SCr) × (0.85 if female)',
        explanation: 'Estimates renal creatinine clearance (Cockcroft-Gault) and CKD-EPI eGFR reference.',
        assumptions: 'Stable serum creatinine; adult non-pregnant patients.',
        inputs: [
          { key: 'sex', label: 'Sex', type: 'select', defaultValue: 'male', options: [{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }] },
          { key: 'age', label: 'Age (years)', type: 'number', defaultValue: 45, min: 18, max: 110, step: 1 },
          { key: 'weight', label: 'Weight (kg)', type: 'number', defaultValue: 72, min: 25, max: 250, step: 0.5 },
          { key: 'scr', label: 'Serum Creatinine (mg/dL)', type: 'number', defaultValue: 1.0, min: 0.2, max: 20, step: 0.05 },
        ],
        compute: (vals): CalculatorResult => {
          const fem = str(vals, 'sex', 'male') === 'female';
          const age = num(vals, 'age');
          const wt = num(vals, 'weight');
          const scr = num(vals, 'scr');
          if (scr <= 0 || age <= 0 || wt <= 0) throw new Error('Age, weight, and SCr must be positive.');
          const crcl = (((140 - age) * wt) / (72 * scr)) * (fem ? 0.85 : 1);
          const k = fem ? 0.7 : 0.9;
          const alpha = fem ? -0.241 : -0.302;
          const egfr = 142 * Math.pow(Math.min(scr / k, 1), alpha) * Math.pow(Math.max(scr / k, 1), -1.2) * Math.pow(0.9938, age) * (fem ? 1.012 : 1);
          return {
            primary: { label: n.includes('gfr') ? 'CKD-EPI 2021 eGFR' : 'Cockcroft-Gault CrCl', value: n.includes('gfr') ? egfr : crcl, formatted: `${(n.includes('gfr') ? egfr : crcl).toFixed(1)} mL/min` },
            breakdown: [
              { label: 'Cockcroft-Gault CrCl', value: crcl, formatted: `${crcl.toFixed(1)} mL/min` },
              { label: 'CKD-EPI 2021 eGFR', value: egfr, formatted: `${egfr.toFixed(1)} mL/min/1.73m²` },
            ],
            steps: [`CrCl = [(140 - ${age}) × ${wt}] / (72 × ${scr}) × ${fem ? '0.85' : '1.0'} = ${crcl.toFixed(2)}`],
          };
        },
      };
    }
    if (/(sodium|anion|osmolar|osmolality|calcium|potassium|map|arterial pressure|pulse pressure|shock index|qtc|cardiac)/.test(n)) {
      return {
        ...baseDef,
        formulaDisplay: 'MAP = (SBP + 2·DBP)/3  |  Anion Gap = Na - (Cl + HCO₃)  |  QTc = QT / √(60/HR)',
        explanation: 'Computes clinical hemodynamic or electrolyte reference parameters with clear standard equations.',
        inputs: [
          { key: 'a', label: n.includes('sodium') || n.includes('anion') || n.includes('osmol') ? 'Serum Na⁺ (mEq/L) / SBP (mmHg)' : 'Primary Metric (SBP / QT ms / HR)', type: 'number', defaultValue: n.includes('qtc') ? 400 : n.includes('anion') || n.includes('sodium') ? 140 : 120, min: 0.1, step: 1 },
          { key: 'b', label: n.includes('anion') ? 'Serum Cl⁻ (mEq/L)' : n.includes('sodium') ? 'Glucose (mg/dL)' : 'Secondary Metric (DBP / HR bpm)', type: 'number', defaultValue: n.includes('anion') ? 104 : n.includes('sodium') ? 180 : 80, min: 0.1, step: 1 },
          { key: 'c', label: 'Third Metric (HCO₃⁻ / BUN / SV mL)', type: 'number', defaultValue: 24, min: 0, step: 1 },
        ],
        compute: (vals): CalculatorResult => {
          const a = num(vals, 'a'), b = num(vals, 'b'), c = num(vals, 'c');
          if (n.includes('anion')) {
            const ag = a - (b + c);
            return {
              primary: { label: 'Serum Anion Gap', value: ag, formatted: `${ag.toFixed(1)} mEq/L` },
              breakdown: [{ label: 'Reference Range', value: '8-12', formatted: '8 – 12 mEq/L (without K⁺)' }],
              steps: [`AG = ${a} - (${b} + ${c}) = ${ag.toFixed(1)}`],
            };
          }
          if (n.includes('sodium')) {
            const corrNa = a + 0.016 * (b - 100);
            return {
              primary: { label: 'Katz Corrected Sodium', value: corrNa, formatted: `${corrNa.toFixed(1)} mEq/L` },
              breakdown: [{ label: 'Correction Factor', value: corrNa - a, formatted: `${(corrNa - a).toFixed(2)} mEq/L` }],
              steps: [`Corrected Na = ${a} + 0.016 × (${b} - 100) = ${corrNa.toFixed(1)}`],
            };
          }
          if (n.includes('qtc')) {
            const rr = 60 / b;
            const qtc = a / Math.sqrt(rr);
            return {
              primary: { label: 'Bazett QTc Interval', value: qtc, formatted: `${qtc.toFixed(1)} ms` },
              breakdown: [{ label: 'RR Interval', value: rr, formatted: `${rr.toFixed(3)} sec` }],
              steps: [`QTc = ${a} / √(${rr.toFixed(3)}) = ${qtc.toFixed(1)} ms`],
            };
          }
          const map = (a + 2 * b) / 3;
          const pp = a - b;
          const shockIdx = b > 0 ? a / b : 0;
          return {
            primary: { label: n.includes('pulse') ? 'Pulse Pressure' : n.includes('shock') ? 'Ratio / Shock Index' : 'Mean Arterial Pressure (MAP)', value: n.includes('pulse') ? pp : n.includes('shock') ? shockIdx : map, formatted: n.includes('pulse') ? `${pp.toFixed(1)} mmHg` : n.includes('shock') ? shockIdx.toFixed(2) : `${map.toFixed(1)} mmHg` },
            breakdown: [
              { label: 'Mean Arterial Pressure', value: map, formatted: `${map.toFixed(1)} mmHg` },
              { label: 'Pulse Pressure (SBP - DBP)', value: pp, formatted: `${pp.toFixed(1)} mmHg` },
            ],
            steps: [`MAP = (${a} + 2×${b}) / 3 = ${map.toFixed(1)} mmHg`],
          };
        },
      };
    }
    return {
      ...baseDef,
      formulaDisplay: 'Holliday-Segar 4-2-1 Rule / Weight-Based Rate = Dose × Weight / Concentration',
      explanation: 'Computes clinical reference totals, IV infusion drop rates, or composite risk scores (informational reference only).',
      inputs: [
        { key: 'weight', label: 'Body Weight / Metric (kg)', type: 'number', defaultValue: 70, min: 1, max: 300, step: 0.5 },
        { key: 'factor', label: 'Rate / Dose Factor (mL/kg or mg/kg)', type: 'number', defaultValue: 30, min: 0.1, max: 500, step: 0.5 },
        { key: 'hours', label: 'Duration (Hours)', type: 'number', defaultValue: 24, min: 0.25, max: 168, step: 0.5 },
      ],
      compute: (vals): CalculatorResult => {
        const w = num(vals, 'weight'), f = num(vals, 'factor'), h = num(vals, 'hours');
        if (w <= 0 || h <= 0) throw new Error('Weight and hours must be positive.');
        // Holliday-Segar hourly maintenance mL/h
        const maintHr = w <= 10 ? 4 * w : w <= 20 ? 40 + 2 * (w - 10) : 60 + (w - 20);
        const total = w * f;
        const perHour = total / h;
        const gttMin20 = (perHour * 20) / 60;
        return {
          primary: { label: 'Computed Reference Total', value: total, formatted: `${total.toFixed(1)} units (${perHour.toFixed(1)}/hr)` },
          breakdown: [
            { label: 'Holliday-Segar Maintenance', value: maintHr, formatted: `${maintHr.toFixed(1)} mL/hr (${(maintHr * 24).toFixed(0)} mL/day)` },
            { label: 'Drip Rate (20 gtt/mL)', value: gttMin20, formatted: `${gttMin20.toFixed(1)} drops/min` },
          ],
          steps: [`Total = ${w} × ${f} = ${total.toFixed(1)}`, `Hourly = ${perHour.toFixed(2)}/hr`],
        };
      },
    };
  }

  // 2. Pregnancy & Cycle Calculators
  if (entry.solverKey === 'pregnancy_cycle') {
    return {
      ...baseDef,
      formulaDisplay: "Naegele's Rule: EDD = LMP + 280 days (40 weeks)",
      explanation: 'Estimates gestational week, expected due date (EDD), fertile ovulation window, and trimester milestones from Last Menstrual Period.',
      inputs: [
        { key: 'lmpDate', label: 'First Day of Last Menstrual Period (LMP)', type: 'date', defaultValue: '2026-08-01' },
        { key: 'cycleLen', label: 'Average Cycle Length (Days)', type: 'number', defaultValue: 28, min: 20, max: 45, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const lmp = new Date(str(vals, 'lmpDate', '2026-08-01'));
        const cycle = num(vals, 'cycleLen');
        if (Number.isNaN(lmp.getTime())) throw new Error('Provide a valid LMP date.');
        const edd = new Date(lmp.getTime() + (280 + (cycle - 28)) * 86400000);
        const ovulation = new Date(lmp.getTime() + (cycle - 14) * 86400000);
        const today = new Date();
        const gestDays = Math.max(0, Math.floor((today.getTime() - lmp.getTime()) / 86400000));
        return {
          primary: { label: 'Estimated Due Date (EDD)', value: edd.toISOString().slice(0, 10), formatted: edd.toDateString() },
          breakdown: [
            { label: 'Estimated Ovulation Day', value: ovulation.toISOString().slice(0, 10), formatted: ovulation.toDateString() },
            { label: 'Current Gestational Age', value: Math.floor(gestDays / 7), formatted: `${Math.floor(gestDays / 7)} wks ${gestDays % 7} days` },
          ],
          steps: [`LMP ${lmp.toISOString().slice(0, 10)} + ${280 + (cycle - 28)} days = ${edd.toISOString().slice(0, 10)}`],
        };
      },
    };
  }

  // 3. Sports & Athletics
  if (entry.solverKey === 'sports_athletics') {
    if (n.includes('cricket')) {
      return {
        ...baseDef,
        formulaDisplay: 'Run Rate = Runs / Overs  |  NRR = (Runs For / Overs Faced) - (Runs Against / Overs Bowled)',
        explanation: 'Computes Cricket Run Rate, Required Run Rate, Net Run Rate, Strike Rate, or Bowling Economy.',
        inputs: [
          { key: 'runsFor', label: 'Runs Scored (For)', type: 'number', defaultValue: 185, min: 0, step: 1 },
          { key: 'oversFaced', label: 'Overs Faced', type: 'number', defaultValue: 20, min: 0.1, step: 0.1 },
          { key: 'runsAgainst', label: 'Runs Conceded (Against)', type: 'number', defaultValue: 162, min: 0, step: 1 },
          { key: 'oversBowled', label: 'Overs Bowled', type: 'number', defaultValue: 20, min: 0.1, step: 0.1 },
        ],
        compute: (vals): CalculatorResult => {
          const rf = num(vals, 'runsFor'), ofa = num(vals, 'oversFaced'), ra = num(vals, 'runsAgainst'), ob = num(vals, 'oversBowled');
          if (ofa <= 0 || ob <= 0) throw new Error('Overs must be positive.');
          const rr = rf / ofa;
          const oppRr = ra / ob;
          const nrr = rr - oppRr;
          return {
            primary: { label: n.includes('net run') ? 'Net Run Rate (NRR)' : 'Team Run Rate', value: n.includes('net run') ? nrr : rr, formatted: n.includes('net run') ? `${nrr >= 0 ? '+' : ''}${nrr.toFixed(3)}` : `${rr.toFixed(2)} RPO` },
            breakdown: [
              { label: 'Scoring Run Rate', value: rr, formatted: `${rr.toFixed(2)} runs/over` },
              { label: 'Conceded Economy Rate', value: oppRr, formatted: `${oppRr.toFixed(2)} runs/over` },
              { label: 'Net Run Rate (NRR)', value: nrr, formatted: `${nrr >= 0 ? '+' : ''}${nrr.toFixed(3)}` },
            ],
            steps: [`NRR = (${rf}/${ofa}) - (${ra}/${ob}) = ${nrr.toFixed(3)}`],
          };
        },
      };
    }
    return {
      ...baseDef,
      formulaDisplay: 'Pace = Time / Distance  |  Riegel Prediction T₂ = T₁ × (D₂ / D₁)^1.06',
      explanation: 'Computes running/cycling/swimming pace, speed, split times, Riegel race prediction, and VO2max estimate.',
      inputs: [
        { key: 'distKm', label: 'Distance (km)', type: 'number', defaultValue: 10, min: 0.1, max: 500, step: 0.5 },
        { key: 'timeMin', label: 'Elapsed Time (Minutes)', type: 'number', defaultValue: 48, min: 0.5, max: 3000, step: 0.5 },
        { key: 'targetKm', label: 'Target Race Distance (km)', type: 'number', defaultValue: 21.0975, min: 0.1, max: 500, step: 0.5 },
      ],
      compute: (vals): CalculatorResult => {
        const d1 = num(vals, 'distKm'), t1 = num(vals, 'timeMin'), d2 = num(vals, 'targetKm');
        if (d1 <= 0 || t1 <= 0) throw new Error('Distance and time must be positive.');
        const paceMinKm = t1 / d1;
        const speedKph = (d1 / t1) * 60;
        const predMin = t1 * Math.pow(d2 / d1, 1.06);
        const pMin = Math.floor(paceMinKm);
        const pSec = Math.round((paceMinKm - pMin) * 60);
        return {
          primary: { label: 'Average Pace', value: paceMinKm, formatted: `${pMin}:${String(pSec).padStart(2, '0')} min/km` },
          breakdown: [
            { label: 'Average Speed', value: speedKph, formatted: `${speedKph.toFixed(2)} km/h` },
            { label: `Riegel Prediction (${d2} km)`, value: predMin, formatted: `${Math.floor(predMin / 60)}h ${Math.round(predMin % 60)}m` },
          ],
          steps: [`Pace = ${t1}/${d1} = ${paceMinKm.toFixed(2)} min/km`, `Riegel T₂ = ${t1} × (${d2}/${d1})^1.06 = ${predMin.toFixed(1)} min`],
        };
      },
    };
  }

  // 4. Nutrition, Food & Culinary
  if (entry.solverKey === 'nutrition_culinary') {
    return {
      ...baseDef,
      formulaDisplay: "Scaled Qty = Base Qty × (Target Servings / Original Servings)  |  Baker's % = (Ingredient / Flour) × 100",
      explanation: 'Computes recipe portion scaling, baker’s hydration percentage, food cost percentage, and nutritional calories.',
      inputs: [
        { key: 'baseQty', label: 'Base Ingredient / Flour Weight (g)', type: 'number', defaultValue: 500, min: 1, step: 10 },
        { key: 'waterOrCost', label: 'Liquid Weight (g) / Recipe Cost', type: 'number', defaultValue: 325, min: 0, step: 5 },
        { key: 'origServings', label: 'Original Servings', type: 'number', defaultValue: 4, min: 1, step: 1 },
        { key: 'targetServings', label: 'Target Servings', type: 'number', defaultValue: 10, min: 1, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const base = num(vals, 'baseQty'), w = num(vals, 'waterOrCost'), s1 = num(vals, 'origServings'), s2 = num(vals, 'targetServings');
        if (s1 <= 0 || s2 <= 0) throw new Error('Servings must be positive.');
        const scale = s2 / s1;
        const scaledBase = base * scale;
        const bakersHydration = base > 0 ? (w / base) * 100 : 0;
        return {
          primary: { label: n.includes('hydration') || n.includes('baker') || n.includes('ratio') ? "Baker's Hydration / Ratio (%)" : `Scaled Quantity (${s2} servings)`, value: n.includes('hydration') || n.includes('baker') ? bakersHydration : scaledBase, formatted: n.includes('hydration') || n.includes('baker') ? `${bakersHydration.toFixed(1)}%` : `${scaledBase.toFixed(1)} g` },
          breakdown: [
            { label: 'Scale Multiplier', value: scale, formatted: `${scale.toFixed(2)}×` },
            { label: 'Scaled Liquid / Second Item', value: w * scale, formatted: `${(w * scale).toFixed(1)} g` },
            { label: "Baker's % (w / base)", value: bakersHydration, formatted: `${bakersHydration.toFixed(1)}%` },
          ],
          steps: [`Scale = ${s2}/${s1} = ${scale.toFixed(2)}×`, `Scaled Primary = ${scaledBase.toFixed(1)} g`],
        };
      },
    };
  }

  // 5. General Health, Body Fat, Heart Rate, Sleep, Fitness
  return {
    ...baseDef,
    formulaDisplay: 'Karvonen HR = (HRmax - HRrest)·%Intensity + HRrest  |  Epley 1RM = W·(1 + Reps/30)',
    explanation: 'Computes standardized fitness, body composition, heart rate training zone, sleep cycle, or metabolic targets.',
    inputs: [
      { key: 'weight', label: 'Weight / Lift Load (kg)', type: 'number', defaultValue: 70, min: 1, max: 500, step: 0.5 },
      { key: 'heightCm', label: 'Height (cm) / Reps', type: 'number', defaultValue: 175, min: 1, max: 270, step: 0.5 },
      { key: 'age', label: 'Age (years)', type: 'number', defaultValue: 28, min: 5, max: 110, step: 1 },
      { key: 'waistCm', label: 'Waist (cm) / Resting HR', type: 'number', defaultValue: 82, min: 30, max: 250, step: 0.5 },
    ],
    compute: (vals): CalculatorResult => {
      const w = num(vals, 'weight'), h = num(vals, 'heightCm'), age = num(vals, 'age'), waist = num(vals, 'waistCm');
      if (w <= 0 || h <= 0) throw new Error('Weight and height must be positive.');
      const hM = h / 100;
      const bmi = w / (hM * hM);
      const hrMax = 220 - age;
      const hrTarget70 = (hrMax - 65) * 0.7 + 65;
      const whtr = waist / h;
      const oneRm = w * (1 + Math.min(30, age) / 30);
      return {
        primary: { label: n.includes('heart') ? 'Target Heart Rate (70%)' : n.includes('one rep') ? 'Epley 1RM Estimate' : n.includes('waist') ? 'Waist-to-Height Ratio' : 'Health / Fitness Metric', value: n.includes('heart') ? hrTarget70 : n.includes('one rep') ? oneRm : n.includes('waist') ? whtr : bmi, formatted: n.includes('heart') ? `${Math.round(hrTarget70)} bpm (Max ${hrMax})` : n.includes('one rep') ? `${oneRm.toFixed(1)} kg` : n.includes('waist') ? whtr.toFixed(3) : `${bmi.toFixed(2)} kg/m²` },
        breakdown: [
          { label: 'BMI (Quetelet)', value: bmi, formatted: `${bmi.toFixed(2)} kg/m²` },
          { label: 'Waist-to-Height Ratio', value: whtr, formatted: `${whtr.toFixed(3)} (< 0.50 optimal)` },
          { label: 'Max Heart Rate (220 - Age)', value: hrMax, formatted: `${hrMax} bpm` },
        ],
        steps: [`BMI = ${bmi.toFixed(2)}, WHtR = ${whtr.toFixed(3)}, HRmax = ${hrMax}`],
      };
    },
  };
}
