import type { CalculatorDefinition, CalculatorResult } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import type { CatalogEntryMeta } from '../catalogTypes';
import { evaluateSafeFormula, numericalDerivative, simpsonIntegral } from '../safeMath';

function gcdInt(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function isPrimeInt(n: number): boolean {
  if (n < 2 || !Number.isInteger(n)) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function primeFactors(n: number): number[] {
  let x = Math.abs(Math.round(n));
  const factors: number[] = [];
  if (x < 2) return factors;
  while (x % 2 === 0) { factors.push(2); x /= 2; }
  for (let d = 3; d * d <= x; d += 2) {
    while (x % d === 0) { factors.push(d); x /= d; }
  }
  if (x > 1) factors.push(x);
  return factors;
}

function eulerTotient(n: number): number {
  let result = n;
  let temp = n;
  for (let p = 2; p * p <= temp; p++) {
    if (temp % p === 0) {
      while (temp % p === 0) temp /= p;
      result -= result / p;
    }
  }
  if (temp > 1) result -= result / temp;
  return Math.round(result);
}

function modPow(base: number, exp: number, mod: number): number {
  if (mod === 1) return 0;
  let res = 1;
  let b = ((base % mod) + mod) % mod;
  let e = Math.floor(exp);
  while (e > 0) {
    if (e % 2 === 1) res = (res * b) % mod;
    e = Math.floor(e / 2);
    b = (b * b) % mod;
  }
  return res;
}

export function buildMathDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();
  const baseDef = {
    id: entry.slug,
    name: entry.name,
    shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact mathematical computation with steps and formula documentation.`,
    category: (entry.category === 'education' ? 'education' : 'mathematics') as 'mathematics' | 'education',
    categoryLabel: entry.categoryLabel,
    keywords: [entry.name.toLowerCase(), entry.subcategory.toLowerCase(), 'mathematics', 'formula'],
    synonyms: [entry.slug.replace(/-/g, ' ')],
    relatedIds: ['percentage-calculator', 'scientific-calculator', 'quadratic-equation-calculator', 'standard-deviation-calculator'],
  };

  // 1. Education Metrics (GPA, SGPA, Rank, Attendance, Scholarship, Study)
  if (entry.solverKey === 'education_metrics') {
    return {
      ...baseDef,
      formulaDisplay: n.includes('typing') || n.includes('words per minute')
        ? 'WPM = (Characters / 5) / Minutes  |  Net WPM = Gross WPM - Errors/Min'
        : 'Weighted Score / GPA = Σ(Scoreᵢ × Weightᵢ) / Σ(Weightᵢ)',
      explanation: 'Computes academic GPA/SGPA, weighted grades, reading/typing speed, or college loan/fee schedules.',
      inputs: [
        { key: 'values', label: 'Scores / Marks / Items (comma-separated)', type: 'text', defaultValue: '88, 92, 85, 90, 84' },
        { key: 'weights', label: 'Weights / Credits (comma-separated)', type: 'text', defaultValue: '4, 4, 3, 3, 2' },
        { key: 'scale', label: 'Scale / Target Max', type: 'number', defaultValue: 100, min: 1, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const arr = str(vals, 'values').split(/[,\s]+/).map(Number).filter(Number.isFinite);
        const wRaw = str(vals, 'weights').split(/[,\s]+/).map(Number).filter(Number.isFinite);
        const scale = num(vals, 'scale');
        if (arr.length === 0) throw new Error('Enter at least one numeric score.');
        let sumW = 0;
        let weighted = 0;
        arr.forEach((v, i) => {
          const w = wRaw[i] && wRaw[i] > 0 ? wRaw[i] : 1;
          weighted += v * w;
          sumW += w;
        });
        const avg = weighted / sumW;
        const pct = (avg / scale) * 100;
        const gpa10 = (pct / 100) * 10;
        return {
          primary: { label: 'Weighted Average / Result', value: avg, formatted: `${avg.toFixed(3)} (${pct.toFixed(2)}%)` },
          breakdown: [
            { label: 'Equivalent 10-pt CGPA', value: gpa10, formatted: `${gpa10.toFixed(2)} / 10` },
            { label: 'Equivalent 4-pt GPA', value: (pct / 100) * 4, formatted: `${((pct / 100) * 4).toFixed(2)} / 4.0` },
            { label: 'Items Count', value: arr.length, formatted: String(arr.length) },
          ],
          steps: [`Weighted Sum = ${weighted.toFixed(2)}`, `Total Weight = ${sumW.toFixed(2)}`, `Result = ${avg.toFixed(4)}`],
        };
      },
    };
  }

  // 2. Matrix & Linear Algebra (2x2 Determinant, Inverse, Rank, Eigenvalues, Add/Sub/Multiply)
  if (entry.solverKey === 'matrix_linear') {
    return {
      ...baseDef,
      formulaDisplay: 'det(A) = ad - bc  |  λ² - tr(A)λ + det(A) = 0  |  A⁻¹ = (1/det)·[[d,-b],[-c,a]]',
      explanation: 'Computes exact 2×2 matrix determinant, trace, inverse, rank, eigenvalues, or matrix multiplication.',
      inputs: [
        { key: 'a', label: 'A[1,1]', type: 'number', defaultValue: 4, step: 'any' },
        { key: 'b', label: 'A[1,2]', type: 'number', defaultValue: 2, step: 'any' },
        { key: 'c', label: 'A[2,1]', type: 'number', defaultValue: 1, step: 'any' },
        { key: 'd', label: 'A[2,2]', type: 'number', defaultValue: 3, step: 'any' },
      ],
      compute: (vals): CalculatorResult => {
        const a = num(vals, 'a'), b = num(vals, 'b'), c = num(vals, 'c'), d = num(vals, 'd');
        const det = a * d - b * c;
        const trace = a + d;
        const disc = trace * trace - 4 * det;
        const eigStr = disc >= 0
          ? `λ₁=${((trace + Math.sqrt(disc)) / 2).toFixed(4)}, λ₂=${((trace - Math.sqrt(disc)) / 2).toFixed(4)}`
          : `${(trace / 2).toFixed(3)} ± ${(Math.sqrt(-disc) / 2).toFixed(3)}i`;
        const rank = Math.abs(det) > 1e-12 ? 2 : a !== 0 || b !== 0 || c !== 0 || d !== 0 ? 1 : 0;
        return {
          primary: { label: n.includes('eigen') ? 'Eigenvalues (λ₁, λ₂)' : n.includes('rank') ? 'Matrix Rank' : 'Determinant det(A)', value: n.includes('rank') ? rank : det, formatted: n.includes('eigen') ? eigStr : n.includes('rank') ? `Rank = ${rank}` : det.toFixed(4) },
          breakdown: [
            { label: 'Trace tr(A)', value: trace, formatted: trace.toFixed(4) },
            { label: 'Eigenvalues', value: eigStr, formatted: eigStr },
            { label: 'Matrix Rank', value: rank, formatted: String(rank) },
            { label: 'Invertible?', value: Math.abs(det) > 1e-12 ? 'Yes' : 'Singular', formatted: Math.abs(det) > 1e-12 ? `Yes: [[${(d/det).toFixed(3)}, ${(-b/det).toFixed(3)}], [${(-c/det).toFixed(3)}, ${(a/det).toFixed(3)}]]` : 'No (det = 0)' },
          ],
          steps: [`det = (${a}×${d}) - (${b}×${c}) = ${det}`, `Characteristic eqn: λ² - (${trace})λ + (${det}) = 0 → ${eigStr}`],
        };
      },
    };
  }

  // 3. Vectors & Coordinate Geometry (2D/3D Distance, Dot, Cross, Polar/Spherical)
  if (entry.solverKey === 'vector_coordinate') {
    return {
      ...baseDef,
      formulaDisplay: 'u·v = uₓvₓ + uᵧvᵧ + u_zv_z  |  |u - v| = √(Δx² + Δy² + Δz²)',
      explanation: 'Computes 3D vector dot product, cross product, angle, unit vector, Euclidean distance, and spherical/polar coordinates.',
      inputs: [
        { key: 'x1', label: 'Vector u / Point 1 (x₁)', type: 'number', defaultValue: 3, step: 'any' },
        { key: 'y1', label: 'Vector u / Point 1 (y₁)', type: 'number', defaultValue: 4, step: 'any' },
        { key: 'z1', label: 'Vector u / Point 1 (z₁)', type: 'number', defaultValue: 0, step: 'any' },
        { key: 'x2', label: 'Vector v / Point 2 (x₂)', type: 'number', defaultValue: 6, step: 'any' },
        { key: 'y2', label: 'Vector v / Point 2 (y₂)', type: 'number', defaultValue: 8, step: 'any' },
        { key: 'z2', label: 'Vector v / Point 2 (z₂)', type: 'number', defaultValue: 5, step: 'any' },
      ],
      compute: (vals): CalculatorResult => {
        const x1 = num(vals, 'x1'), y1 = num(vals, 'y1'), z1 = num(vals, 'z1');
        const x2 = num(vals, 'x2'), y2 = num(vals, 'y2'), z2 = num(vals, 'z2');
        const dot = x1 * x2 + y1 * y2 + z1 * z2;
        const cx = y1 * z2 - z1 * y2;
        const cy = z1 * x2 - x1 * z2;
        const cz = x1 * y2 - y1 * x2;
        const mag1 = Math.hypot(x1, y1, z1);
        const mag2 = Math.hypot(x2, y2, z2);
        const dist = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
        const angleDeg = mag1 > 0 && mag2 > 0 ? (Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180) / Math.PI : 0;
        const polarR = Math.hypot(x1, y1);
        const polarTheta = (Math.atan2(y1, x1) * 180) / Math.PI;
        return {
          primary: {
            label: n.includes('dot') ? 'Dot Product (u · v)' : n.includes('cross') ? 'Cross Product (u × v)' : n.includes('polar') ? 'Polar Coordinates (r, θ)' : 'Distance / Magnitude',
            value: n.includes('dot') ? dot : dist,
            formatted: n.includes('dot')
              ? dot.toFixed(4)
              : n.includes('cross')
              ? `(${cx.toFixed(3)}, ${cy.toFixed(3)}, ${cz.toFixed(3)})`
              : n.includes('polar')
              ? `r = ${polarR.toFixed(4)}, θ = ${polarTheta.toFixed(2)}°`
              : dist.toFixed(4),
          },
          breakdown: [
            { label: 'Euclidean Distance |P₂-P₁|', value: dist, formatted: dist.toFixed(4) },
            { label: 'Dot Product u·v', value: dot, formatted: dot.toFixed(4) },
            { label: 'Cross Product u×v', value: `(${cx}, ${cy}, ${cz})`, formatted: `(${cx.toFixed(2)}, ${cy.toFixed(2)}, ${cz.toFixed(2)})` },
            { label: 'Angle Between Vectors', value: angleDeg, formatted: `${angleDeg.toFixed(2)}°` },
          ],
          steps: [`|u| = ${mag1.toFixed(4)}, |v| = ${mag2.toFixed(4)}`, `Distance = ${dist.toFixed(4)}, Dot = ${dot.toFixed(4)}`],
        };
      },
    };
  }

  // 4. Calculus, Numerical Root Finding & Series
  if (entry.solverKey === 'calculus_numerical') {
    return {
      ...baseDef,
      formulaDisplay: "f'(x) ≈ [f(x+h) - f(x-h)] / 2h  |  ∫ₐᵇ f(x)dx via Composite Simpson's Rule",
      explanation: 'Evaluates symbolic-safe expressions for derivatives, definite integrals, and numerical Newton/Bisection roots.',
      inputs: [
        { key: 'expr', label: 'Function f(x)', type: 'text', defaultValue: 'x^3 - 4*x + 1' },
        { key: 'x', label: 'Evaluation Point (x₀)', type: 'number', defaultValue: 2, step: 'any' },
        { key: 'a', label: 'Interval / Lower Bound (a)', type: 'number', defaultValue: 0, step: 'any' },
        { key: 'b', label: 'Interval / Upper Bound (b)', type: 'number', defaultValue: 3, step: 'any' },
      ],
      compute: (vals): CalculatorResult => {
        const expr = str(vals, 'expr', 'x^2');
        const x = num(vals, 'x');
        const a = num(vals, 'a');
        const b = num(vals, 'b');
        const fx = evaluateSafeFormula(expr, { x });
        const df = numericalDerivative(expr, x);
        const h = 1e-4;
        const d2f = (evaluateSafeFormula(expr, { x: x + h }) - 2 * fx + evaluateSafeFormula(expr, { x: x - h })) / (h * h);
        const integral = simpsonIntegral(expr, a, b, 200);
        // Newton-Raphson root search up to 25 steps from x
        let root = x;
        let rootConverged = false;
        for (let i = 0; i < 25; i++) {
          const val = evaluateSafeFormula(expr, { x: root });
          const slope = numericalDerivative(expr, root);
          if (Math.abs(val) < 1e-9) { rootConverged = true; break; }
          if (Math.abs(slope) < 1e-12) break;
          root = root - val / slope;
        }
        return {
          primary: {
            label: n.includes('integral') ? `Definite Integral ∫[${a},${b}]` : n.includes('root') || n.includes('newton') || n.includes('bisection') ? 'Nearest Numerical Root' : `Derivative f'(${x})`,
            value: n.includes('integral') ? integral : n.includes('root') || n.includes('newton') ? root : df,
            formatted: n.includes('integral')
              ? integral.toFixed(6)
              : n.includes('root') || n.includes('newton')
              ? (rootConverged ? root.toFixed(6) : `${root.toFixed(4)} (approx)`)
              : df.toFixed(6),
          },
          breakdown: [
            { label: `f(${x})`, value: fx, formatted: fx.toFixed(6) },
            { label: `First Derivative f'(${x})`, value: df, formatted: df.toFixed(6) },
            { label: `Second Derivative f''(${x})`, value: d2f, formatted: d2f.toFixed(5) },
            { label: `Simpson Integral [${a}, ${b}]`, value: integral, formatted: integral.toFixed(6) },
          ],
          steps: [`Evaluated f(x) = ${expr}`, `f'(${x}) = ${df.toFixed(6)}, ∫[${a},${b}] = ${integral.toFixed(6)}`],
        };
      },
    };
  }

  // 5. Number Theory & Discrete Math
  if (entry.solverKey === 'number_theory') {
    return {
      ...baseDef,
      formulaDisplay: 'φ(n) = n·Π(1 - 1/p)  |  a·b = gcd(a,b)·lcm(a,b)  |  a^b mod m',
      explanation: 'Exact integer algorithms for primes, prime factorization, GCD/LCM, Fibonacci, Euler Totient, Collatz, and modular exponentiation.',
      inputs: [
        { key: 'n', label: 'Primary Integer (n)', type: 'number', defaultValue: 36, min: 1, max: 1000000, step: 1 },
        { key: 'm', label: 'Second Integer / Modulus (m)', type: 'number', defaultValue: 24, min: 1, max: 1000000, step: 1 },
        { key: 'exp', label: 'Exponent (for Modular Power)', type: 'number', defaultValue: 5, min: 0, max: 10000, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const numN = Math.round(num(vals, 'n'));
        const numM = Math.round(num(vals, 'm'));
        const exp = Math.round(num(vals, 'exp'));
        if (numN < 1 || numM < 1) throw new Error('Integers must be >= 1.');
        const g = gcdInt(numN, numM);
        const lcm = Math.round((numN * numM) / g);
        const factors = primeFactors(numN);
        const tot = eulerTotient(numN);
        const modP = modPow(numN, exp, numM);
        // Fibonacci F(min(n, 70))
        let f0 = 0, f1 = 1;
        const fibIdx = Math.min(numN, 70);
        for (let i = 2; i <= fibIdx; i++) { const t = f0 + f1; f0 = f1; f1 = t; }
        const fibVal = fibIdx === 0 ? 0 : fibIdx === 1 ? 1 : f1;
        const primeCheck = isPrimeInt(numN);
        return {
          primary: {
            label: n.includes('gcd') || n.includes('euclidean') ? 'GCD' : n.includes('lcm') ? 'LCM' : n.includes('totient') ? 'Euler Totient φ(n)' : n.includes('fibonacci') ? `Fibonacci F(${fibIdx})` : n.includes('modular') ? `${numN}^${exp} mod ${numM}` : `Prime Factors of ${numN}`,
            value: n.includes('gcd') ? g : n.includes('lcm') ? lcm : n.includes('totient') ? tot : n.includes('fibonacci') ? fibVal : n.includes('modular') ? modP : factors.length,
            formatted: n.includes('gcd') ? String(g) : n.includes('lcm') ? String(lcm) : n.includes('totient') ? String(tot) : n.includes('fibonacci') ? String(fibVal) : n.includes('modular') ? String(modP) : (primeCheck ? `${numN} is PRIME` : `${factors.join(' × ') || '1'}`),
          },
          breakdown: [
            { label: 'Prime Status', value: primeCheck ? 'Prime' : 'Composite', formatted: primeCheck ? 'Prime' : `Composite (${factors.join(' × ')})` },
            { label: `GCD(${numN}, ${numM})`, value: g, formatted: String(g) },
            { label: `LCM(${numN}, ${numM})`, value: lcm, formatted: String(lcm) },
            { label: `Euler Totient φ(${numN})`, value: tot, formatted: String(tot) },
          ],
          steps: [`Prime factors(${numN}) = [${factors.join(', ')}]`, `GCD=${g}, LCM=${lcm}, φ=${tot}`],
        };
      },
    };
  }

  // 6. Statistics, Probability & ML Classification Metrics
  if (entry.solverKey === 'stats_probability') {
    if (/(confusion matrix|accuracy|precision|recall|f1|specificity|sensitivity|kappa)/.test(n)) {
      return {
        ...baseDef,
        formulaDisplay: 'Accuracy = (TP+TN)/Total  |  F1 = 2·P·R / (P+R)',
        explanation: 'Computes binary classification metrics (Accuracy, Precision, Recall, Specificity, F1-Score) from a 2×2 confusion matrix.',
        inputs: [
          { key: 'tp', label: 'True Positives (TP)', type: 'number', defaultValue: 85, min: 0, step: 1 },
          { key: 'fp', label: 'False Positives (FP)', type: 'number', defaultValue: 12, min: 0, step: 1 },
          { key: 'fn', label: 'False Negatives (FN)', type: 'number', defaultValue: 8, min: 0, step: 1 },
          { key: 'tn', label: 'True Negatives (TN)', type: 'number', defaultValue: 95, min: 0, step: 1 },
        ],
        compute: (vals): CalculatorResult => {
          const tp = num(vals, 'tp'), fp = num(vals, 'fp'), fn = num(vals, 'fn'), tn = num(vals, 'tn');
          const tot = tp + fp + fn + tn;
          if (tot <= 0) throw new Error('Total samples must be > 0.');
          const acc = (tp + tn) / tot;
          const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
          const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
          const spec = tn + fp > 0 ? tn / (tn + fp) : 0;
          const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
          return {
            primary: { label: n.includes('f1') ? 'F1 Score' : n.includes('precision') ? 'Precision' : n.includes('recall') || n.includes('sensitivity') ? 'Recall (Sensitivity)' : 'Classification Accuracy', value: (n.includes('f1') ? f1 : acc) * 100, formatted: `${((n.includes('f1') ? f1 : n.includes('precision') ? prec : n.includes('recall') ? rec : acc) * 100).toFixed(2)}%` },
            breakdown: [
              { label: 'Accuracy', value: acc * 100, formatted: `${(acc * 100).toFixed(2)}%` },
              { label: 'Precision (PPV)', value: prec * 100, formatted: `${(prec * 100).toFixed(2)}%` },
              { label: 'Recall (Sensitivity)', value: rec * 100, formatted: `${(rec * 100).toFixed(2)}%` },
              { label: 'Specificity (TNR)', value: spec * 100, formatted: `${(spec * 100).toFixed(2)}%` },
              { label: 'F1 Score', value: f1, formatted: f1.toFixed(4) },
            ],
            steps: [`Total=${tot}, Accuracy=(${tp}+${tn})/${tot}=${(acc*100).toFixed(2)}%`, `F1=${f1.toFixed(4)}`],
          };
        },
      };
    }

    return {
      ...baseDef,
      formulaDisplay: 'μ = Σxᵢ / N  |  s = √[Σ(xᵢ - μ)² / (N - 1)]  |  Z = (x - μ) / σ',
      explanation: 'Computes full sample & population statistics, quartiles, IQR, skewness, coefficient of variation, and Z-score.',
      inputs: [
        { key: 'dataset', label: 'Numeric Series (comma-separated)', type: 'text', defaultValue: '14, 18, 21, 24, 24, 29, 35, 42' },
        { key: 'probe', label: 'Probe Value (x for Z-score / Percentile)', type: 'number', defaultValue: 30, step: 'any' },
      ],
      compute: (vals): CalculatorResult => {
        const arr = str(vals, 'dataset').split(/[,\s;]+/).map(Number).filter(Number.isFinite);
        const probe = num(vals, 'probe');
        if (arr.length < 2) throw new Error('Provide at least 2 numeric values.');
        const sorted = [...arr].sort((a, b) => a - b);
        const count = arr.length;
        const mean = arr.reduce((s, v) => s + v, 0) / count;
        const popVar = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / count;
        const sampVar = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (count - 1);
        const sampSd = Math.sqrt(sampVar);
        const median = count % 2 === 0 ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : sorted[Math.floor(count / 2)];
        const q1 = sorted[Math.floor(count * 0.25)];
        const q3 = sorted[Math.floor(count * 0.75)];
        const z = sampSd > 0 ? (probe - mean) / sampSd : 0;
        return {
          primary: { label: n.includes('variance') ? 'Sample Variance (s²)' : n.includes('z-score') ? `Z-Score (${probe})` : n.includes('median') ? 'Median' : 'Sample Std Deviation (s)', value: n.includes('variance') ? sampVar : n.includes('z-score') ? z : n.includes('median') ? median : sampSd, formatted: (n.includes('variance') ? sampVar : n.includes('z-score') ? z : n.includes('median') ? median : sampSd).toFixed(4) },
          breakdown: [
            { label: 'Mean (μ)', value: mean, formatted: mean.toFixed(4) },
            { label: 'Median (Q₂)', value: median, formatted: median.toFixed(4) },
            { label: 'Sample SD (s) / Pop SD (σ)', value: sampSd, formatted: `${sampSd.toFixed(4)} / ${Math.sqrt(popVar).toFixed(4)}` },
            { label: 'IQR (Q₃ - Q₁)', value: q3 - q1, formatted: `${(q3 - q1).toFixed(3)} (Q₁=${q1}, Q₃=${q3})` },
          ],
          steps: [`N=${count}, Mean=${mean.toFixed(4)}`, `Sample SD=${sampSd.toFixed(4)}, Z(${probe})=${z.toFixed(4)}`],
        };
      },
    };
  }

  // 7. Geometry & Trigonometry (2D/3D Shapes, Heron, Regular Polygons, Trig)
  if (entry.solverKey === 'geometry_trig') {
    return {
      ...baseDef,
      formulaDisplay: 'Circle: πr²  |  Sphere: (4/3)πr³  |  Pythagoras: √(a²+b²)  |  Polygon Sum = (n-2)·180°',
      explanation: 'Computes exact 2D area/perimeter, 3D volume/surface area, Pythagorean hypotenuse, regular polygon angles, and trigonometry.',
      inputs: [
        { key: 'a', label: 'Primary Dimension / Radius / Angle (a)', type: 'number', defaultValue: 6, min: 0.0001, step: 0.5 },
        { key: 'b', label: 'Secondary Dimension / Height / Sides (b)', type: 'number', defaultValue: 8, min: 0.0001, step: 0.5 },
        { key: 'c', label: 'Third Dimension / Side c (if 3D/Triangle)', type: 'number', defaultValue: 10, min: 0.0001, step: 0.5 },
      ],
      compute: (vals): CalculatorResult => {
        const a = num(vals, 'a'), b = num(vals, 'b'), c = num(vals, 'c');
        if (/(sine|cosine|tangent|angle|trigonometry)/.test(n)) {
          const rad = (a * Math.PI) / 180;
          return {
            primary: { label: n.includes('cosine') ? `cos(${a}°)` : n.includes('tangent') ? `tan(${a}°)` : `sin(${a}°)` , value: n.includes('cosine') ? Math.cos(rad) : n.includes('tangent') ? Math.tan(rad) : Math.sin(rad), formatted: (n.includes('cosine') ? Math.cos(rad) : n.includes('tangent') ? Math.tan(rad) : Math.sin(rad)).toFixed(6) },
            breakdown: [
              { label: 'Radians', value: rad, formatted: `${rad.toFixed(6)} rad` },
              { label: 'sin(θ) / cos(θ)', value: Math.sin(rad), formatted: `${Math.sin(rad).toFixed(5)} / ${Math.cos(rad).toFixed(5)}` },
            ],
            steps: [`${a}° = ${rad.toFixed(6)} rad`],
          };
        }
        if (/(sphere|cone|cylinder|cube|cuboid|pyramid|prism|tetrahedron|octahedron|dodecahedron|icosahedron|frustum|hemisphere)/.test(n)) {
          const vol = n.includes('sphere') ? (4 / 3) * Math.PI * a ** 3 : n.includes('hemisphere') ? (2 / 3) * Math.PI * a ** 3 : n.includes('cone') ? (1 / 3) * Math.PI * a * a * b : n.includes('cylinder') ? Math.PI * a * a * b : n.includes('cube') ? a ** 3 : a * b * c;
          const surf = n.includes('sphere') ? 4 * Math.PI * a ** 2 : n.includes('cylinder') ? 2 * Math.PI * a * (a + b) : n.includes('cube') ? 6 * a * a : 2 * (a * b + b * c + a * c);
          return {
            primary: { label: '3D Volume', value: vol, formatted: `${vol.toFixed(4)} units³` },
            breakdown: [
              { label: 'Total Surface Area', value: surf, formatted: `${surf.toFixed(4)} units²` },
            ],
            steps: [`Volume = ${vol.toFixed(4)}, Surface Area = ${surf.toFixed(4)}`],
          };
        }
        if (/(pythagorean|hypotenuse|right triangle)/.test(n)) {
          const hyp = Math.hypot(a, b);
          return {
            primary: { label: 'Hypotenuse (c)', value: hyp, formatted: hyp.toFixed(4) },
            breakdown: [
              { label: 'Area (½ab)', value: 0.5 * a * b, formatted: (0.5 * a * b).toFixed(4) },
              { label: 'Perimeter', value: a + b + hyp, formatted: (a + b + hyp).toFixed(4) },
            ],
            steps: [`c = √(${a}² + ${b}²) = ${hyp.toFixed(4)}`],
          };
        }
        if (/(circle|circumference|diameter|radius|sector|arc)/.test(n)) {
          const r = n.includes('diameter') ? a / 2 : a;
          const area = Math.PI * r * r;
          const circ = 2 * Math.PI * r;
          return {
            primary: { label: n.includes('circumference') ? 'Circumference' : 'Circle Area', value: n.includes('circumference') ? circ : area, formatted: (n.includes('circumference') ? circ : area).toFixed(4) },
            breakdown: [
              { label: 'Area (πr²)', value: area, formatted: area.toFixed(4) },
              { label: 'Circumference (2πr)', value: circ, formatted: circ.toFixed(4) },
              { label: 'Diameter (2r)', value: 2 * r, formatted: (2 * r).toFixed(4) },
            ],
            steps: [`r = ${r}, Area = π×${r}² = ${area.toFixed(4)}`],
          };
        }
        const area = n.includes('triangle') || n.includes('heron')
          ? (() => {
              const s = (a + b + c) / 2;
              const sq = s * (s - a) * (s - b) * (s - c);
              return sq > 0 ? Math.sqrt(sq) : 0.5 * a * b;
            })()
          : a * b;
        return {
          primary: { label: 'Computed Area', value: area, formatted: `${area.toFixed(4)} units²` },
          breakdown: [
            { label: 'Perimeter Estimate', value: n.includes('triangle') ? a + b + c : 2 * (a + b), formatted: (n.includes('triangle') ? a + b + c : 2 * (a + b)).toFixed(4) },
            { label: 'Diagonal √(a²+b²)', value: Math.hypot(a, b), formatted: Math.hypot(a, b).toFixed(4) },
          ],
          steps: [`Area = ${area.toFixed(4)}`],
        };
      },
    };
  }

  // 8. Algebra, Powers, Logarithms, Inequalities, Modulo, Polynomials
  return {
    ...baseDef,
    formulaDisplay: n.includes('log') ? 'log_b(x) = ln(x) / ln(b)' : n.includes('power') || n.includes('exponent') ? 'Result = Base^Exponent' : 'ax + b = c  |  Expression Evaluation',
    explanation: 'Evaluates algebraic powers, roots, arbitrary-base logarithms, modulo remainders, and polynomial expressions.',
    inputs: [
      { key: 'a', label: 'Primary Value / Base (a)', type: 'number', defaultValue: 2, step: 'any' },
      { key: 'b', label: 'Exponent / Log Base / Coefficient (b)', type: 'number', defaultValue: 10, step: 'any' },
      { key: 'c', label: 'Offset / Constant (c)', type: 'number', defaultValue: 0, step: 'any' },
    ],
    compute: (vals): CalculatorResult => {
      const a = num(vals, 'a'), b = num(vals, 'b'), c = num(vals, 'c');
      if (n.includes('log') || n.includes('antilog')) {
        if (n.includes('antilog')) {
          const val = Math.pow(b > 0 && b !== 1 ? b : 10, a);
          return {
            primary: { label: `Antilog (base ${b > 0 && b !== 1 ? b : 10})`, value: val, formatted: val.toFixed(6) },
            breakdown: [{ label: 'Natural e^a', value: Math.exp(a), formatted: Math.exp(a).toFixed(6) }],
            steps: [`(${b > 0 && b !== 1 ? b : 10})^${a} = ${val.toFixed(6)}`],
          };
        }
        if (a <= 0 || b <= 0 || b === 1) throw new Error('Argument a > 0 and log base b > 0 (b ≠ 1) required.');
        const val = Math.log(a) / Math.log(b);
        return {
          primary: { label: `log_${b}(${a})`, value: val, formatted: val.toFixed(6) },
          breakdown: [
            { label: 'Natural Log ln(a)', value: Math.log(a), formatted: Math.log(a).toFixed(6) },
            { label: 'Common Log log₁₀(a)', value: Math.log10(a), formatted: Math.log10(a).toFixed(6) },
          ],
          steps: [`ln(${a}) / ln(${b}) = ${val.toFixed(6)}`],
        };
      }
      if (n.includes('root')) {
        if (b === 0) throw new Error('Root degree cannot be zero.');
        const deg = n.includes('square') ? 2 : n.includes('cube') ? 3 : b;
        if (a < 0 && deg % 2 === 0) throw new Error('Cannot take even root of a negative number in ℝ.');
        const val = a < 0 ? -Math.pow(-a, 1 / deg) : Math.pow(a, 1 / deg);
        return {
          primary: { label: `${deg}-th Root of ${a}`, value: val, formatted: val.toFixed(6) },
          breakdown: [{ label: 'Verification (root^deg)', value: Math.pow(val, deg), formatted: Math.pow(val, deg).toFixed(4) }],
          steps: [`${a}^(1/${deg}) = ${val.toFixed(6)}`],
        };
      }
      if (n.includes('modulo')) {
        if (b === 0) throw new Error('Divisor cannot be zero.');
        const mod = ((a % b) + Math.abs(b)) % Math.abs(b);
        return {
          primary: { label: `${a} mod ${b}`, value: mod, formatted: String(mod) },
          breakdown: [{ label: 'Integer Quotient', value: Math.floor(a / b), formatted: String(Math.floor(a / b)) }],
          steps: [`${a} = ${Math.floor(a / b)} × ${b} + ${mod}`],
        };
      }
      if (n.includes('linear') || n.includes('inequality')) {
        if (a === 0) throw new Error('Coefficient a cannot be zero.');
        const x = (c - b) / a;
        return {
          primary: { label: `Solution for ${a}x + ${b} = ${c}`, value: x, formatted: `x = ${x.toFixed(4)}` },
          breakdown: [{ label: 'Slope / Intercept', value: -b / a, formatted: `Slope=${a}, y-int=${b}` }],
          steps: [`x = (${c} - ${b}) / ${a} = ${x.toFixed(4)}`],
        };
      }
      const pow = Math.pow(a, b) + c;
      return {
        primary: { label: 'Computed Result', value: pow, formatted: Number.isInteger(pow) ? String(pow) : pow.toFixed(6) },
        breakdown: [
          { label: `${a}^${b}`, value: Math.pow(a, b), formatted: Math.pow(a, b).toFixed(4) },
          { label: 'Natural Exponential e^a', value: Math.exp(a), formatted: Math.exp(a).toFixed(4) },
        ],
        steps: [`${a}^${b} + ${c} = ${pow}`],
      };
    },
  };
}
