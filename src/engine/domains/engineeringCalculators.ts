import type { CalculatorDefinition } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';

export const ENGINEERING_CALCULATORS: CalculatorDefinition[] = [
  {
    id: 'ohms-law',
    name: "Ohm's Law & DC Power Solver",
    shortDescription: 'Solve Voltage (V), Current (I), Resistance (R), or Power (P) from any known pair.',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['ohms law', 'voltage', 'current', 'resistance', 'power', 'circuit', 'electronics'],
    synonyms: ['v=ir', 'electrical calculator', 'resistor calculator'],
    formulaDisplay: 'V = I × R  |  P = V × I = I²R = V²/R',
    explanation: 'Select which electrical quantity you want to solve for from two known DC quantities.',
    inputs: [
      {
        key: 'solveFor',
        label: 'Solve For',
        type: 'select',
        defaultValue: 'voltage',
        options: [
          { label: 'Voltage (V) from I & R', value: 'voltage' },
          { label: 'Current (I) from V & R', value: 'current' },
          { label: 'Resistance (R) from V & I', value: 'resistance' },
          { label: 'Power (P) from V & I', value: 'power' },
        ],
      },
      { key: 'valA', label: 'First Input (V or I)', type: 'number', defaultValue: 2, step: 'any' },
      { key: 'valB', label: 'Second Input (R or I)', type: 'number', defaultValue: 100, step: 'any' },
    ],
    relatedIds: ['voltage', 'current', 'resistance', 'power'],
    compute: (values) => {
      const mode = str(values, 'solveFor', 'voltage');
      const a = num(values, 'valA');
      const b = num(values, 'valB');
      let V = 0, I = 0, R = 0, P = 0;

      if (mode === 'voltage') {
        I = a; R = b; V = I * R; P = V * I;
      } else if (mode === 'current') {
        if (b === 0) throw new Error('Resistance cannot be zero.');
        V = a; R = b; I = V / R; P = V * I;
      } else if (mode === 'resistance') {
        if (b === 0) throw new Error('Current cannot be zero.');
        V = a; I = b; R = V / I; P = V * I;
      } else {
        V = a; I = b; P = V * I; R = I !== 0 ? V / I : Infinity;
      }

      const primaryMap: Record<string, { label: string; value: number; formatted: string }> = {
        voltage: { label: 'Voltage (V)', value: V, formatted: `${V.toFixed(4)} V` },
        current: { label: 'Current (I)', value: I, formatted: `${I.toFixed(4)} A` },
        resistance: { label: 'Resistance (R)', value: R, formatted: `${R.toFixed(4)} Ω` },
        power: { label: 'Power (P)', value: P, formatted: `${P.toFixed(4)} W` },
      };

      return {
        primary: primaryMap[mode],
        breakdown: [
          { label: 'Voltage (V)', value: V, formatted: `${V.toFixed(4)} V` },
          { label: 'Current (I)', value: I, formatted: `${I.toFixed(4)} A` },
          { label: 'Resistance (R)', value: Number.isFinite(R) ? R : '∞', formatted: Number.isFinite(R) ? `${R.toFixed(4)} Ω` : 'Open Circuit' },
          { label: 'Power (P)', value: P, formatted: `${P.toFixed(4)} W` },
        ],
        steps: [`V=${V.toFixed(3)}V, I=${I.toFixed(3)}A, R=${Number.isFinite(R) ? R.toFixed(3) : '∞'}Ω, P=${P.toFixed(3)}W`],
      };
    },
  },
  {
    id: 'voltage',
    name: 'Voltage Drop & Divider Calculator',
    shortDescription: 'Calculate output voltage of a resistive divider and conductor voltage drop.',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['voltage', 'divider', 'potential', 'resistor'],
    synonyms: ['voltage divider', 'vout calculator'],
    formulaDisplay: 'Vout = Vin × R₂ / (R₁ + R₂)',
    explanation: 'Determines unloaded voltage divider output and current draw.',
    inputs: [
      { key: 'vin', label: 'Input Voltage (Vin, V)', type: 'number', defaultValue: 12, step: 'any' },
      { key: 'r1', label: 'Resistor R₁ (Ω)', type: 'number', defaultValue: 1000, min: 0, step: 10 },
      { key: 'r2', label: 'Resistor R₂ (Ω)', type: 'number', defaultValue: 2200, min: 0, step: 10 },
    ],
    relatedIds: ['ohms-law', 'current', 'resistance'],
    compute: (values) => {
      const vin = num(values, 'vin');
      const r1 = num(values, 'r1');
      const r2 = num(values, 'r2');
      if (r1 + r2 <= 0) throw new Error('R1 + R2 must be > 0.');
      const vout = (vin * r2) / (r1 + r2);
      const currentMa = (vin / (r1 + r2)) * 1000;
      return {
        primary: { label: 'Output Voltage (Vout)', value: vout, formatted: `${vout.toFixed(4)} V` },
        breakdown: [
          { label: 'Divider Current', value: currentMa, formatted: `${currentMa.toFixed(3)} mA` },
          { label: 'Attenuation Ratio', value: r2 / (r1 + r2), formatted: `${((r2 / (r1 + r2)) * 100).toFixed(2)}%` },
        ],
        steps: [`Vout = ${vin} × ${r2} / (${r1} + ${r2}) = ${vout.toFixed(4)} V`],
      };
    },
  },
  {
    id: 'current',
    name: 'AC/DC Electrical Current Calculator',
    shortDescription: 'Calculate load current (Amperes) from power, voltage, and power factor.',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['current', 'amps', 'amperage', 'power factor', 'ac load'],
    synonyms: ['ampere calculator', 'load current'],
    formulaDisplay: 'DC: I = P / V  |  1-Phase AC: I = P / (V × PF)  |  3-Phase: I = P / (√3 × V × PF)',
    explanation: 'Computes conductor current for DC, single-phase AC, and balanced three-phase AC loads.',
    inputs: [
      {
        key: 'phase',
        label: 'System Type',
        type: 'select',
        defaultValue: 'ac1',
        options: [
          { label: 'DC', value: 'dc' },
          { label: 'Single-Phase AC', value: 'ac1' },
          { label: 'Three-Phase AC', value: 'ac3' },
        ],
      },
      { key: 'watts', label: 'Load Power (Watts)', type: 'number', defaultValue: 2000, min: 0, step: 10 },
      { key: 'volts', label: 'Voltage (V)', type: 'number', defaultValue: 230, min: 0.1, step: 1 },
      { key: 'pf', label: 'Power Factor (0.1–1.0)', type: 'number', defaultValue: 0.9, min: 0.1, max: 1, step: 0.01 },
    ],
    relatedIds: ['ohms-law', 'power', 'electricity-bill'],
    compute: (values) => {
      const sys = str(values, 'phase', 'ac1');
      const P = num(values, 'watts');
      const V = num(values, 'volts');
      const pf = num(values, 'pf', 1);
      if (V <= 0 || pf <= 0) throw new Error('Voltage and power factor must be > 0.');
      const I = sys === 'dc' ? P / V : sys === 'ac1' ? P / (V * pf) : P / (Math.sqrt(3) * V * pf);
      return {
        primary: { label: 'Load Current (I)', value: I, formatted: `${I.toFixed(3)} A` },
        breakdown: [
          { label: 'Apparent Power (VA)', value: sys === 'dc' ? P : P / pf, formatted: `${(sys === 'dc' ? P : P / pf).toFixed(1)} VA` },
          { label: 'Milliamps (mA)', value: I * 1000, formatted: `${Math.round(I * 1000)} mA` },
        ],
        steps: [`System: ${sys.toUpperCase()}, Power=${P}W, V=${V}V → I=${I.toFixed(3)} A`],
      };
    },
  },
  {
    id: 'resistance',
    name: 'Series & Parallel Resistance Calculator',
    shortDescription: 'Calculate total equivalent resistance for multiple resistors in series or parallel.',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['resistance', 'resistor', 'series', 'parallel', 'ohms'],
    synonyms: ['parallel resistor', 'equivalent resistance'],
    formulaDisplay: 'Series: ΣRᵢ  |  Parallel: 1 / Σ(1/Rᵢ)',
    explanation: 'Computes both series and parallel equivalent resistance from a comma-separated list of resistor values.',
    inputs: [
      { key: 'resistors', label: 'Resistor Values (Ω, comma-separated)', type: 'text', defaultValue: '100, 220, 470, 1000' },
    ],
    relatedIds: ['ohms-law', 'voltage', 'current'],
    compute: (values) => {
      const list = str(values, 'resistors')
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map(Number);
      if (list.length === 0 || list.some((r) => !Number.isFinite(r) || r <= 0)) {
        throw new Error('Enter positive resistor values separated by commas.');
      }
      const series = list.reduce((s, r) => s + r, 0);
      const parallel = 1 / list.reduce((s, r) => s + 1 / r, 0);
      return {
        primary: { label: 'Parallel Equivalent (R_p)', value: parallel, formatted: `${parallel.toFixed(3)} Ω` },
        breakdown: [
          { label: 'Series Equivalent (R_s)', value: series, formatted: `${series.toFixed(3)} Ω` },
          { label: 'Resistor Count', value: list.length, formatted: `${list.length} resistors` },
        ],
        steps: [`Series sum = ${series} Ω`, `Parallel 1 / Σ(1/R) = ${parallel.toFixed(4)} Ω`],
      };
    },
  },
  {
    id: 'power',
    name: 'Mechanical & Electrical Power Calculator',
    shortDescription: 'Compute Power (Watts / kW / Horsepower) from work and time.',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['power', 'watt', 'kilowatt', 'horsepower', 'work', 'energy'],
    synonyms: ['watts to hp', 'mechanical power'],
    formulaDisplay: 'P = Work (J) / Time (s)',
    explanation: 'Converts mechanical work over time into Watts, Kilowatts, and Horsepower.',
    inputs: [
      { key: 'workJ', label: 'Work / Energy (Joules)', type: 'number', defaultValue: 15000, min: 0, step: 100 },
      { key: 'timeS', label: 'Time Duration (Seconds)', type: 'number', defaultValue: 10, min: 0.001, step: 0.5 },
    ],
    relatedIds: ['energy', 'ohms-law', 'force'],
    compute: (values) => {
      const w = num(values, 'workJ');
      const t = num(values, 'timeS');
      if (t <= 0) throw new Error('Time must be > 0.');
      const watts = w / t;
      return {
        primary: { label: 'Power', value: watts, formatted: `${watts.toFixed(2)} W (${(watts / 1000).toFixed(4)} kW)` },
        breakdown: [
          { label: 'Horsepower (Mechanical)', value: watts / 745.7, formatted: `${(watts / 745.7).toFixed(4)} hp` },
          { label: 'BTU / hour', value: watts * 3.41214, formatted: `${(watts * 3.41214).toFixed(2)} BTU/h` },
        ],
        steps: [`P = ${w} J / ${t} s = ${watts.toFixed(2)} W`],
      };
    },
  },
  {
    id: 'energy',
    name: 'Kinetic & Potential Energy Calculator',
    shortDescription: 'Calculate mechanical kinetic energy (½mv²) and gravitational potential energy (mgh).',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['energy', 'kinetic', 'potential', 'joules', 'physics'],
    synonyms: ['kinetic energy', 'potential energy'],
    formulaDisplay: 'KE = ½·m·v²  |  PE = m·g·h',
    explanation: 'Computes mechanical energy in Joules, Kilojoules, and Watt-hours using g = 9.80665 m/s².',
    inputs: [
      { key: 'mass', label: 'Mass (kg)', type: 'number', defaultValue: 50, min: 0, step: 1 },
      { key: 'velocity', label: 'Velocity (m/s)', type: 'number', defaultValue: 12, min: 0, step: 0.5 },
      { key: 'height', label: 'Height (m)', type: 'number', defaultValue: 10, min: 0, step: 0.5 },
    ],
    relatedIds: ['power', 'velocity', 'force'],
    compute: (values) => {
      const m = num(values, 'mass');
      const v = num(values, 'velocity');
      const h = num(values, 'height');
      const ke = 0.5 * m * v * v;
      const pe = m * 9.80665 * h;
      const total = ke + pe;
      return {
        primary: { label: 'Total Mechanical Energy', value: total, formatted: `${total.toFixed(2)} J (${(total / 1000).toFixed(3)} kJ)` },
        breakdown: [
          { label: 'Kinetic Energy (½mv²)', value: ke, formatted: `${ke.toFixed(2)} J` },
          { label: 'Potential Energy (mgh)', value: pe, formatted: `${pe.toFixed(2)} J` },
          { label: 'Watt-hours', value: total / 3600, formatted: `${(total / 3600).toFixed(4)} Wh` },
        ],
        steps: [`KE = 0.5 × ${m} × ${v}² = ${ke.toFixed(2)} J`, `PE = ${m} × 9.80665 × ${h} = ${pe.toFixed(2)} J`],
      };
    },
  },
  {
    id: 'pressure',
    name: 'Pressure Calculator (P = F / A)',
    shortDescription: 'Calculate mechanical pressure in Pascals, kPa, Bar, ATM, and PSI.',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['pressure', 'pascal', 'bar', 'psi', 'force', 'area'],
    synonyms: ['p=f/a', 'hydraulic pressure'],
    formulaDisplay: 'P = Force (N) / Area (m²)',
    explanation: 'Computes stress/pressure across standard SI and Imperial units.',
    inputs: [
      { key: 'force', label: 'Force (Newtons)', type: 'number', defaultValue: 5000, step: 10 },
      { key: 'area', label: 'Contact Area (m²)', type: 'number', defaultValue: 0.05, min: 0.000001, step: 0.01 },
    ],
    relatedIds: ['force', 'density', 'area'],
    compute: (values) => {
      const f = num(values, 'force');
      const a = num(values, 'area');
      if (a <= 0) throw new Error('Area must be > 0.');
      const pa = f / a;
      return {
        primary: { label: 'Pressure', value: pa, formatted: `${(pa / 1000).toFixed(3)} kPa (${(pa / 100000).toFixed(4)} bar)` },
        breakdown: [
          { label: 'Pascals (Pa)', value: pa, formatted: `${pa.toFixed(2)} Pa` },
          { label: 'PSI', value: pa / 6894.757, formatted: `${(pa / 6894.757).toFixed(3)} psi` },
          { label: 'Atmospheres (atm)', value: pa / 101325, formatted: `${(pa / 101325).toFixed(4)} atm` },
        ],
        steps: [`P = ${f} N / ${a} m² = ${pa.toFixed(2)} Pa`],
      };
    },
  },
  {
    id: 'force',
    name: "Force Calculator (Newton's 2nd Law)",
    shortDescription: 'Calculate Net Force (N, kN, lbf) from mass and acceleration.',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['force', 'newton', 'mass', 'acceleration', 'physics'],
    synonyms: ['f=ma', 'net force'],
    formulaDisplay: 'F = m × a',
    explanation: "Applies Newton's Second Law in SI units and converts to kilonewtons and pound-force.",
    inputs: [
      { key: 'mass', label: 'Mass (kg)', type: 'number', defaultValue: 120, min: 0, step: 1 },
      { key: 'accel', label: 'Acceleration (m/s²)', type: 'number', defaultValue: 9.81, step: 0.1 },
    ],
    relatedIds: ['pressure', 'velocity', 'energy'],
    compute: (values) => {
      const m = num(values, 'mass');
      const a = num(values, 'accel');
      const N = m * a;
      return {
        primary: { label: 'Force (Newtons)', value: N, formatted: `${N.toFixed(3)} N` },
        breakdown: [
          { label: 'Kilonewtons (kN)', value: N / 1000, formatted: `${(N / 1000).toFixed(5)} kN` },
          { label: 'Pound-force (lbf)', value: N / 4.44822, formatted: `${(N / 4.44822).toFixed(3)} lbf` },
        ],
        steps: [`F = ${m} kg × ${a} m/s² = ${N.toFixed(3)} N`],
      };
    },
  },
  {
    id: 'velocity',
    name: 'Velocity & Kinematics Calculator',
    shortDescription: 'Calculate average velocity, acceleration, and distance covered.',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['velocity', 'speed', 'distance', 'kinematics', 'acceleration'],
    synonyms: ['speed calculator', 'v = d / t'],
    formulaDisplay: 'v = u + a·t  |  s = u·t + ½·a·t²',
    explanation: 'Computes final velocity and displacement under constant acceleration.',
    inputs: [
      { key: 'u', label: 'Initial Velocity u (m/s)', type: 'number', defaultValue: 0, step: 0.5 },
      { key: 'a', label: 'Acceleration a (m/s²)', type: 'number', defaultValue: 2.5, step: 0.1 },
      { key: 't', label: 'Time t (seconds)', type: 'number', defaultValue: 8, min: 0, step: 0.5 },
    ],
    relatedIds: ['force', 'energy', 'fuel-cost'],
    compute: (values) => {
      const u = num(values, 'u');
      const a = num(values, 'a');
      const t = num(values, 't');
      const v = u + a * t;
      const s = u * t + 0.5 * a * t * t;
      return {
        primary: { label: 'Final Velocity (v)', value: v, formatted: `${v.toFixed(3)} m/s (${(v * 3.6).toFixed(2)} km/h)` },
        breakdown: [
          { label: 'Displacement (s)', value: s, formatted: `${s.toFixed(3)} m` },
          { label: 'Average Velocity', value: (u + v) / 2, formatted: `${((u + v) / 2).toFixed(3)} m/s` },
        ],
        steps: [`v = ${u} + (${a}×${t}) = ${v} m/s`, `s = ${u}×${t} + 0.5×${a}×${t}² = ${s} m`],
      };
    },
  },
  {
    id: 'density',
    name: 'Material Density Calculator',
    shortDescription: 'Compute mass density ρ = m / V and relative specific gravity vs water.',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['density', 'mass', 'volume', 'specific gravity', 'material'],
    synonyms: ['rho = m/v', 'specific gravity'],
    formulaDisplay: 'ρ = Mass (kg) / Volume (m³)',
    explanation: 'Outputs density in kg/m³ and g/cm³ along with specific gravity relative to water (1000 kg/m³).',
    inputs: [
      { key: 'mass', label: 'Mass (kg)', type: 'number', defaultValue: 2700, min: 0, step: 1 },
      { key: 'volume', label: 'Volume (m³)', type: 'number', defaultValue: 1, min: 0.000001, step: 0.1 },
    ],
    relatedIds: ['volume', 'pressure', 'force'],
    compute: (values) => {
      const m = num(values, 'mass');
      const v = num(values, 'volume');
      if (v <= 0) throw new Error('Volume must be > 0.');
      const rho = m / v;
      return {
        primary: { label: 'Density (ρ)', value: rho, formatted: `${rho.toFixed(2)} kg/m³` },
        breakdown: [
          { label: 'g/cm³ (Specific Gravity)', value: rho / 1000, formatted: `${(rho / 1000).toFixed(4)} g/cm³` },
          { label: 'lb/ft³', value: rho * 0.062428, formatted: `${(rho * 0.062428).toFixed(3)} lb/ft³` },
        ],
        steps: [`ρ = ${m} kg / ${v} m³ = ${rho.toFixed(2)} kg/m³`],
      };
    },
  },
  {
    id: 'area',
    name: '2D Geometry Area Calculator',
    shortDescription: 'Calculate area and perimeter for Circle, Rectangle, Triangle, and Trapezoid.',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['area', 'geometry', 'circle', 'rectangle', 'triangle', 'perimeter'],
    synonyms: ['surface area', 'shape area'],
    formulaDisplay: 'Circle: πr²  |  Rectangle: l×w  |  Triangle: ½×b×h',
    explanation: 'Computes exact 2D area and boundary perimeter.',
    inputs: [
      {
        key: 'shape',
        label: 'Shape',
        type: 'select',
        defaultValue: 'rectangle',
        options: [
          { label: 'Rectangle (Length × Width)', value: 'rectangle' },
          { label: 'Circle (Radius = Dim 1)', value: 'circle' },
          { label: 'Triangle (Base × Height)', value: 'triangle' },
        ],
      },
      { key: 'd1', label: 'Dimension 1 (Length / Radius / Base)', type: 'number', defaultValue: 12, min: 0, step: 0.1 },
      { key: 'd2', label: 'Dimension 2 (Width / Height)', type: 'number', defaultValue: 8, min: 0, step: 0.1 },
    ],
    relatedIds: ['volume', 'land-measurement', 'paint'],
    compute: (values) => {
      const shape = str(values, 'shape', 'rectangle');
      const d1 = num(values, 'd1');
      const d2 = num(values, 'd2');
      if (shape === 'circle') {
        const a = Math.PI * d1 * d1;
        const c = 2 * Math.PI * d1;
        return {
          primary: { label: 'Circle Area', value: a, formatted: `${a.toFixed(4)} sq units` },
          breakdown: [{ label: 'Circumference', value: c, formatted: `${c.toFixed(4)} units` }],
          steps: [`π × ${d1}² = ${a.toFixed(4)}`],
        };
      }
      if (shape === 'triangle') {
        const a = 0.5 * d1 * d2;
        return {
          primary: { label: 'Triangle Area', value: a, formatted: `${a.toFixed(4)} sq units` },
          breakdown: [{ label: 'Base × Height', value: d1 * d2, formatted: `${(d1 * d2).toFixed(4)}` }],
          steps: [`0.5 × ${d1} × ${d2} = ${a.toFixed(4)}`],
        };
      }
      const a = d1 * d2;
      const p = 2 * (d1 + d2);
      return {
        primary: { label: 'Rectangle Area', value: a, formatted: `${a.toFixed(4)} sq units` },
        breakdown: [
          { label: 'Perimeter', value: p, formatted: `${p.toFixed(4)} units` },
          { label: 'Diagonal', value: Math.hypot(d1, d2), formatted: `${Math.hypot(d1, d2).toFixed(4)} units` },
        ],
        steps: [`${d1} × ${d2} = ${a.toFixed(4)}`],
      };
    },
  },
  {
    id: 'volume',
    name: '3D Volume Calculator',
    shortDescription: 'Calculate volume and surface area for Box, Cylinder, Sphere, and Cone.',
    category: 'engineering',
    categoryLabel: 'Engineering',
    keywords: ['volume', '3d', 'cylinder', 'sphere', 'cone', 'cuboid', 'capacity'],
    synonyms: ['tank volume', 'cubic volume'],
    formulaDisplay: 'Box: l·w·h  |  Cylinder: π·r²·h  |  Sphere: (4/3)·π·r³',
    explanation: 'Computes 3D capacity in cubic units and liters (assuming meter dimensions: 1 m³ = 1000 L).',
    inputs: [
      {
        key: 'shape',
        label: '3D Solid',
        type: 'select',
        defaultValue: 'cylinder',
        options: [
          { label: 'Cylinder (r = D1, h = D2)', value: 'cylinder' },
          { label: 'Sphere (r = D1)', value: 'sphere' },
          { label: 'Cone (r = D1, h = D2)', value: 'cone' },
          { label: 'Rectangular Box (D1 × D2 × D3)', value: 'box' },
        ],
      },
      { key: 'd1', label: 'Dim 1 (Radius / Length)', type: 'number', defaultValue: 2, min: 0, step: 0.1 },
      { key: 'd2', label: 'Dim 2 (Height / Width)', type: 'number', defaultValue: 5, min: 0, step: 0.1 },
      { key: 'd3', label: 'Dim 3 (Depth, Box only)', type: 'number', defaultValue: 3, min: 0, step: 0.1 },
    ],
    relatedIds: ['area', 'concrete', 'density'],
    compute: (values) => {
      const shape = str(values, 'shape', 'cylinder');
      const d1 = num(values, 'd1');
      const d2 = num(values, 'd2');
      const d3 = num(values, 'd3');
      let vol = 0;
      let surf = 0;
      if (shape === 'sphere') {
        vol = (4 / 3) * Math.PI * Math.pow(d1, 3);
        surf = 4 * Math.PI * d1 * d1;
      } else if (shape === 'cone') {
        vol = (1 / 3) * Math.PI * d1 * d1 * d2;
        surf = Math.PI * d1 * (d1 + Math.hypot(d1, d2));
      } else if (shape === 'box') {
        vol = d1 * d2 * d3;
        surf = 2 * (d1 * d2 + d2 * d3 + d1 * d3);
      } else {
        vol = Math.PI * d1 * d1 * d2;
        surf = 2 * Math.PI * d1 * (d1 + d2);
      }
      return {
        primary: { label: 'Volume', value: vol, formatted: `${vol.toFixed(4)} m³` },
        breakdown: [
          { label: 'Liters (if dims in m)', value: vol * 1000, formatted: `${(vol * 1000).toFixed(1)} L` },
          { label: 'Surface Area', value: surf, formatted: `${surf.toFixed(4)} m²` },
        ],
        steps: [`Solid: ${shape} → Volume = ${vol.toFixed(4)}`],
      };
    },
  },
];
