import type { CalculatorDefinition, CalculatorResult } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import type { CatalogEntryMeta } from '../catalogTypes';

const ENG_DISCLAIMER =
  'Engineering reference calculation only. Verify against applicable IEEE, ASME, ASHRAE, or IS codes and apply appropriate safety factors before construction or fabrication.';

export function buildPhysicsEngDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();
  const baseDef = {
    id: entry.slug,
    name: entry.name,
    shortDescription: `${entry.name} (#${entry.catalogNumber}) — standardized electrical, mechanical, fluid, or HVAC physics equation.`,
    category: 'engineering' as const,
    categoryLabel: entry.categoryLabel,
    keywords: [entry.name.toLowerCase(), entry.subcategory.toLowerCase(), 'engineering', 'physics'],
    synonyms: [entry.slug.replace(/-/g, ' ')],
    disclaimer: ENG_DISCLAIMER,
    relatedIds: ['ohms-law-calculator', 'voltage-calculator', 'force-calculator', 'pressure-calculator'],
  };

  // 1. Electrical & Electronics (AC/3-Phase, RMS/Peak, RC/RL/LC Resonance, Transformer, Wire Gauge, Motor)
  if (entry.solverKey === 'electrical_circuits') {
    if (/(rc |rl |lc |rlc|resonant|cutoff|reactance|impedance)/.test(n)) {
      return {
        ...baseDef,
        formulaDisplay: 'f₀ = 1 / (2π√(LC))  |  fc = 1 / (2πRC)  |  Xc = 1/(2πfC), Xl = 2πfL',
        explanation: 'Computes RC/RL cutoff frequency, LC resonant frequency, capacitive/inductive reactance, and total series impedance Z.',
        inputs: [
          { key: 'res', label: 'Resistance R (Ω)', type: 'number', defaultValue: 1000, min: 0.01, step: 10 },
          { key: 'capUf', label: 'Capacitance C (μF)', type: 'number', defaultValue: 10, min: 0.0001, step: 1 },
          { key: 'indMh', label: 'Inductance L (mH)', type: 'number', defaultValue: 50, min: 0.0001, step: 1 },
          { key: 'freqHz', label: 'Signal Frequency f (Hz)', type: 'number', defaultValue: 60, min: 0.01, step: 10 },
        ],
        compute: (vals): CalculatorResult => {
          const R = num(vals, 'res');
          const C = num(vals, 'capUf') * 1e-6;
          const L = num(vals, 'indMh') * 1e-3;
          const f = num(vals, 'freqHz');
          if (R <= 0 || C <= 0 || L <= 0 || f <= 0) throw new Error('R, C, L, and f must be positive.');
          const fcRc = 1 / (2 * Math.PI * R * C);
          const fResLc = 1 / (2 * Math.PI * Math.sqrt(L * C));
          const xc = 1 / (2 * Math.PI * f * C);
          const xl = 2 * Math.PI * f * L;
          const z = Math.hypot(R, xl - xc);
          return {
            primary: { label: n.includes('impedance') ? 'Series Impedance Z' : n.includes('resonant') || n.includes('lc') ? 'LC Resonant Frequency f₀' : 'RC Cutoff Frequency fc', value: n.includes('impedance') ? z : n.includes('resonant') || n.includes('lc') ? fResLc : fcRc, formatted: n.includes('impedance') ? `${z.toFixed(2)} Ω` : `${(n.includes('resonant') || n.includes('lc') ? fResLc : fcRc).toFixed(2)} Hz` },
            breakdown: [
              { label: 'RC Cutoff fc', value: fcRc, formatted: `${fcRc.toFixed(2)} Hz` },
              { label: 'LC Resonant f₀', value: fResLc, formatted: `${fResLc.toFixed(2)} Hz` },
              { label: 'Reactance XL / XC', value: xl, formatted: `${xl.toFixed(2)} Ω / ${xc.toFixed(2)} Ω` },
              { label: 'Total Impedance Z', value: z, formatted: `${z.toFixed(2)} Ω` },
            ],
            steps: [`f₀ = 1 / (2π√(${L}×${C})) = ${fResLc.toFixed(2)} Hz`, `Z = √(R² + (XL-XC)²) = ${z.toFixed(2)} Ω`],
          };
        },
      };
    }
    return {
      ...baseDef,
      formulaDisplay: 'P_3φ = √3·V·I·PF  |  V_rms = V_peak / √2  |  ΔV_drop = 2·I·R·L/1000',
      explanation: 'Computes single/three-phase AC/DC real, apparent, and reactive power, RMS/peak voltages, transformer ratios, and UPS/generator sizing.',
      inputs: [
        { key: 'volts', label: 'Voltage V (RMS / Line-to-Line)', type: 'number', defaultValue: 415, min: 0.1, step: 5 },
        { key: 'amps', label: 'Current I (Amperes)', type: 'number', defaultValue: 20, min: 0.01, step: 0.5 },
        { key: 'pf', label: 'Power Factor (cos φ)', type: 'number', defaultValue: 0.88, min: 0.1, max: 1, step: 0.01 },
        { key: 'phases', label: 'System Phase', type: 'select', defaultValue: n.includes('three') ? '3' : '1', options: [{ label: 'Single Phase / DC', value: '1' }, { label: 'Three Phase (√3)', value: '3' }] },
      ],
      compute: (vals): CalculatorResult => {
        const V = num(vals, 'volts'), I = num(vals, 'amps'), pf = num(vals, 'pf');
        const phase = str(vals, 'phases', '1');
        if (V <= 0 || I <= 0 || pf <= 0) throw new Error('Voltage, current, and PF must be positive.');
        const mult = phase === '3' ? Math.sqrt(3) : 1;
        const apparentVA = mult * V * I;
        const realW = apparentVA * pf;
        const reactiveVAR = apparentVA * Math.sqrt(Math.max(0, 1 - pf * pf));
        const vPeak = V * Math.SQRT2;
        return {
          primary: { label: n.includes('rms') || n.includes('peak') ? 'Peak Voltage (Vp)' : 'Real Power (kW)', value: n.includes('rms') || n.includes('peak') ? vPeak : realW / 1000, formatted: n.includes('rms') || n.includes('peak') ? `${vPeak.toFixed(2)} Vp (${(2 * vPeak).toFixed(2)} Vpp)` : `${(realW / 1000).toFixed(3)} kW` },
          breakdown: [
            { label: 'Apparent Power (kVA)', value: apparentVA / 1000, formatted: `${(apparentVA / 1000).toFixed(3)} kVA` },
            { label: 'Reactive Power (kVAR)', value: reactiveVAR / 1000, formatted: `${(reactiveVAR / 1000).toFixed(3)} kVAR` },
            { label: 'Peak Voltage (V·√2)', value: vPeak, formatted: `${vPeak.toFixed(2)} V` },
          ],
          steps: [`S = ${phase === '3' ? '√3×' : ''}${V}×${I} = ${(apparentVA / 1000).toFixed(3)} kVA`, `P = S × ${pf} = ${(realW / 1000).toFixed(3)} kW`],
        };
      },
    };
  }

  // 2. HVAC, Refrigeration, Ducts, Boilers & Plumbing
  if (entry.solverKey === 'hvac_plumbing') {
    return {
      ...baseDef,
      formulaDisplay: 'Q_sensible = 1.08 × CFM × ΔT (°F)  |  1 Ton = 12,000 BTU/h = 3.517 kW  |  Q = A·v',
      explanation: 'Computes HVAC cooling/heating BTU & Tonnage, duct airflow CFM velocity, plumbing pipe flow rate, and tank capacity.',
      inputs: [
        { key: 'areaSqFt', label: 'Room Area (sq ft) / Tank Length (m)', type: 'number', defaultValue: 300, min: 1, step: 10 },
        { key: 'heightOrDeltaT', label: 'Ceiling Height (ft) / ΔT (°F)', type: 'number', defaultValue: 10, min: 1, step: 1 },
        { key: 'occupants', label: 'Occupants / Air Changes per Hour (ACH)', type: 'number', defaultValue: 4, min: 1, max: 100, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const area = num(vals, 'areaSqFt'), h = num(vals, 'heightOrDeltaT'), occ = num(vals, 'occupants');
        if (area <= 0 || h <= 0) throw new Error('Dimensions must be positive.');
        // Standard ASHRAE residential cooling heuristic ~25 BTU/hr/sqft + 400 BTU/occupant
        const btuHr = area * 25 + occ * 400 + (h > 9 ? (h - 9) * area * 2 : 0);
        const tons = btuHr / 12000;
        const kw = btuHr * 0.000293071;
        const cfm = (area * h * Math.max(4, occ)) / 60;
        return {
          primary: { label: n.includes('cfm') || n.includes('airflow') || n.includes('ventilation') ? 'Required Airflow (CFM)' : 'Cooling Capacity (Tons / BTU)', value: n.includes('cfm') || n.includes('airflow') ? cfm : tons, formatted: n.includes('cfm') || n.includes('airflow') ? `${cfm.toFixed(1)} CFM` : `${tons.toFixed(2)} Tons (${Math.round(btuHr).toLocaleString()} BTU/h)` },
          breakdown: [
            { label: 'Thermal Load (BTU/h)', value: btuHr, formatted: `${Math.round(btuHr).toLocaleString()} BTU/h` },
            { label: 'Metric Equivalent (kW)', value: kw, formatted: `${kw.toFixed(2)} kW` },
            { label: 'Ventilation Airflow (CFM)', value: cfm, formatted: `${cfm.toFixed(1)} CFM` },
          ],
          steps: [`BTU/h = ${Math.round(btuHr)}`, `Tons = ${Math.round(btuHr)} / 12000 = ${tons.toFixed(2)} TR`],
        };
      },
    };
  }

  // 3. Mechanics, Fluid Dynamics, Stress, Buckling, Projectiles, Orbits, Waves
  if (/(reynolds|bernoulli|flow rate|pipe|pump|viscosity|hydrostatic|buoyancy|archimedes)/.test(n)) {
    return {
      ...baseDef,
      formulaDisplay: 'Re = (ρ·v·D) / μ  |  Q = A·v = (πD²/4)·v  |  ΔP_hydrostatic = ρ·g·h',
      explanation: 'Computes Reynolds number (laminar vs turbulent regime), volumetric pipe flow rate, hydrostatic pressure, and hydraulic power.',
      inputs: [
        { key: 'diameterMm', label: 'Pipe Diameter D (mm)', type: 'number', defaultValue: 50, min: 0.1, step: 1 },
        { key: 'velocity', label: 'Fluid Velocity v (m/s)', type: 'number', defaultValue: 2.0, min: 0.001, step: 0.1 },
        { key: 'density', label: 'Fluid Density ρ (kg/m³)', type: 'number', defaultValue: 1000, min: 0.1, step: 10 },
        { key: 'viscosityMpas', label: 'Dynamic Viscosity μ (mPa·s / cP)', type: 'number', defaultValue: 1.0, min: 0.001, step: 0.1 },
      ],
      compute: (vals): CalculatorResult => {
        const D = num(vals, 'diameterMm') / 1000;
        const v = num(vals, 'velocity');
        const rho = num(vals, 'density');
        const mu = num(vals, 'viscosityMpas') * 1e-3;
        if (D <= 0 || mu <= 0 || rho <= 0) throw new Error('Diameter, density, and viscosity must be positive.');
        const re = (rho * v * D) / mu;
        const area = Math.PI * (D / 2) ** 2;
        const qM3s = area * v;
        const regime = re < 2300 ? 'Laminar' : re < 4000 ? 'Transitional' : 'Turbulent';
        return {
          primary: { label: n.includes('reynolds') ? 'Reynolds Number (Re)' : 'Volumetric Flow Rate (Q)', value: n.includes('reynolds') ? re : qM3s * 1000, formatted: n.includes('reynolds') ? `${Math.round(re).toLocaleString()} (${regime})` : `${(qM3s * 1000).toFixed(2)} L/s` },
          breakdown: [
            { label: 'Reynolds Number (Re)', value: re, formatted: `${Math.round(re).toLocaleString()} — ${regime}` },
            { label: 'Flow Rate (L/s)', value: qM3s * 1000, formatted: `${(qM3s * 1000).toFixed(3)} L/s` },
            { label: 'Mass Flow Rate (kg/s)', value: qM3s * rho, formatted: `${(qM3s * rho).toFixed(3)} kg/s` },
            { label: 'Dynamic Pressure (½ρv²)', value: 0.5 * rho * v * v, formatted: `${(0.5 * rho * v * v).toFixed(1)} Pa` },
          ],
          steps: [`Re = (${rho}×${v}×${D}) / ${mu} = ${Math.round(re)} (${regime})`, `Q = π(${D}/2)² × ${v} = ${(qM3s * 1000).toFixed(3)} L/s`],
        };
      },
    };
  }

  return {
    ...baseDef,
    formulaDisplay: 'F = m·a  |  KE = ½m·v²  |  τ = F·r  |  Stress σ = F / A  |  R = (v₀²·sin2θ)/g',
    explanation: 'Computes classical mechanics, stress/torque/buckling, projectile trajectory, or heat transfer quantities.',
    inputs: [
      { key: 'val1', label: 'Mass / Force / Velocity (SI)', type: 'number', defaultValue: 50, min: 0.0001, step: 1 },
      { key: 'val2', label: 'Acceleration / Radius / Angle (°)', type: 'number', defaultValue: 9.81, min: 0.0001, step: 0.5 },
      { key: 'val3', label: 'Area (m²) / Time (s) / Specific Heat', type: 'number', defaultValue: 10, min: 0.0001, step: 0.5 },
    ],
    compute: (vals): CalculatorResult => {
      const a = num(vals, 'val1'), b = num(vals, 'val2'), c = num(vals, 'val3');
      if (a <= 0 || b <= 0 || c <= 0) throw new Error('Inputs must be positive.');
      if (n.includes('projectile')) {
        const rad = (Math.min(89.9, b) * Math.PI) / 180;
        const g = 9.80665;
        const range = (a * a * Math.sin(2 * rad)) / g;
        const maxH = (a * Math.sin(rad)) ** 2 / (2 * g);
        const tof = (2 * a * Math.sin(rad)) / g;
        return {
          primary: { label: n.includes('height') ? 'Max Height' : n.includes('time') ? 'Time of Flight' : 'Horizontal Range', value: n.includes('height') ? maxH : n.includes('time') ? tof : range, formatted: n.includes('height') ? `${maxH.toFixed(2)} m` : n.includes('time') ? `${tof.toFixed(2)} s` : `${range.toFixed(2)} m` },
          breakdown: [
            { label: 'Range (R)', value: range, formatted: `${range.toFixed(2)} m` },
            { label: 'Max Height (H)', value: maxH, formatted: `${maxH.toFixed(2)} m` },
            { label: 'Time of Flight (T)', value: tof, formatted: `${tof.toFixed(2)} s` },
          ],
          steps: [`v₀=${a} m/s, θ=${b}° → R=${range.toFixed(2)}m, H=${maxH.toFixed(2)}m, T=${tof.toFixed(2)}s`],
        };
      }
      const force = a * b;
      const ke = 0.5 * a * b * b;
      const stress = a / c;
      return {
        primary: { label: n.includes('stress') || n.includes('buckling') ? 'Stress / Load Ratio' : n.includes('kinetic') ? 'Kinetic Energy' : 'Computed Mechanical Output', value: n.includes('stress') ? stress : n.includes('kinetic') ? ke : force, formatted: n.includes('stress') ? `${stress.toFixed(2)} Pa` : n.includes('kinetic') ? `${ke.toFixed(2)} J` : `${force.toFixed(3)} N·m / N` },
        breakdown: [
          { label: 'Product (F=ma / τ=Fr)', value: force, formatted: force.toFixed(3) },
          { label: 'Kinetic / Elastic (½ab²)', value: ke, formatted: `${ke.toFixed(3)} J` },
          { label: 'Stress / Rate (a / c)', value: stress, formatted: stress.toFixed(4) },
        ],
        steps: [`Primary = ${a} × ${b} = ${force.toFixed(3)}`],
      };
    },
  };
}
