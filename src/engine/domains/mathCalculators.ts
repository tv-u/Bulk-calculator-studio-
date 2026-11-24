import type { CalculatorDefinition } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import { formatNumber } from '../formatters';
import { evaluateSafeFormula, numericalDerivative, simpsonIntegral } from '../safeMath';

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error('Factorial requires a non-negative integer.');
  if (n > 170) throw new Error('Factorial exceeds IEEE 754 floating-point range (max 170).');
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

export const MATH_CALCULATORS: CalculatorDefinition[] = [
  {
    id: 'percentage',
    name: 'Percentage Calculator',
    shortDescription: 'Calculate X% of Y, percentage change, and part-to-whole ratios instantly.',
    category: 'mathematics',
    categoryLabel: 'Mathematics',
    keywords: ['percent', 'percentage', 'pct', 'ratio', 'change', 'increase', 'decrease'],
    synonyms: ['% calculator', 'percent of number', 'percentage change', 'markup percentage'],
    formulaDisplay: 'Result = (Percentage / 100) × Base Value',
    explanation: 'Computes exact percentages, percentage difference between two values, and what percentage one number is of another.',
    inputs: [
      {
        key: 'mode',
        label: 'Calculation Mode',
        type: 'select',
        defaultValue: 'percent_of',
        options: [
          { label: 'What is X% of Y?', value: 'percent_of' },
          { label: 'X is what % of Y?', value: 'what_percent' },
          { label: 'Percentage Change (X to Y)', value: 'pct_change' },
        ],
      },
      { key: 'x', label: 'Value X', type: 'number', defaultValue: 18, step: 'any' },
      { key: 'y', label: 'Value Y', type: 'number', defaultValue: 2500, step: 'any' },
    ],
    relatedIds: ['discount', 'gst', 'profit-loss', 'ratio'],
    compute: (values, ctx) => {
      const mode = str(values, 'mode', 'percent_of');
      const x = num(values, 'x');
      const y = num(values, 'y');
      const loc = ctx?.locale ?? 'en-IN';

      if (mode === 'what_percent') {
        if (y === 0) throw new Error('Base value Y cannot be zero.');
        const pct = (x / y) * 100;
        return {
          primary: { label: 'Percentage', value: pct, formatted: `${formatNumber(pct, { locale: loc, decimals: 4 })}%`, unit: '%' },
          breakdown: [
            { label: 'Part (X)', value: x, formatted: formatNumber(x, { locale: loc }) },
            { label: 'Whole (Y)', value: y, formatted: formatNumber(y, { locale: loc }) },
            { label: 'Decimal Ratio', value: x / y, formatted: formatNumber(x / y, { locale: loc, decimals: 6 }) },
          ],
          steps: [`(${x} / ${y}) × 100 = ${pct.toFixed(4)}%`],
        };
      }

      if (mode === 'pct_change') {
        if (x === 0) throw new Error('Initial value X cannot be zero for percentage change.');
        const diff = y - x;
        const pct = (diff / Math.abs(x)) * 100;
        return {
          primary: {
            label: diff >= 0 ? 'Percentage Increase' : 'Percentage Decrease',
            value: pct,
            formatted: `${pct >= 0 ? '+' : ''}${formatNumber(pct, { locale: loc, decimals: 4 })}%`,
            unit: '%',
          },
          breakdown: [
            { label: 'Absolute Change', value: diff, formatted: formatNumber(diff, { locale: loc }) },
            { label: 'From (X)', value: x, formatted: formatNumber(x, { locale: loc }) },
            { label: 'To (Y)', value: y, formatted: formatNumber(y, { locale: loc }) },
          ],
          steps: [`((${y} - ${x}) / |${x}|) × 100 = ${pct.toFixed(4)}%`],
        };
      }

      const result = (x / 100) * y;
      return {
        primary: { label: `${x}% of ${y}`, value: result, formatted: formatNumber(result, { locale: loc, decimals: 4 }) },
        breakdown: [
          { label: 'Base + Percentage', value: y + result, formatted: formatNumber(y + result, { locale: loc }) },
          { label: 'Base - Percentage', value: y - result, formatted: formatNumber(y - result, { locale: loc }) },
          { label: 'Decimal Factor', value: x / 100, formatted: formatNumber(x / 100, { locale: loc, decimals: 4 }) },
        ],
        steps: [`(${x} / 100) × ${y} = ${result}`],
      };
    },
  },
  {
    id: 'scientific',
    name: 'Scientific Expression Calculator',
    shortDescription: 'Evaluate safe multi-function scientific expressions with trigonometry, logs, and roots.',
    category: 'mathematics',
    categoryLabel: 'Mathematics',
    keywords: ['scientific', 'expression', 'math', 'sin', 'cos', 'log', 'sqrt', 'power'],
    synonyms: ['scientific calc', 'formula evaluator', 'advanced calculator'],
    formulaDisplay: 'f(constants, operators, whitelisted math functions)',
    explanation: 'Uses a safe recursive-descent mathematical parser supporting trigonometric, logarithmic, exponential, and algebraic expressions.',
    inputs: [
      { key: 'expression', label: 'Mathematical Expression', type: 'text', defaultValue: 'sqrt(144) + sin(pi / 6) * 10 + 2^5', placeholder: 'e.g. (25 * 4) + sqrt(81)' },
      { key: 'decimals', label: 'Decimal Precision', type: 'number', defaultValue: 6, min: 0, max: 12, step: 1 },
    ],
    relatedIds: ['equation-solver', 'trigonometry', 'calculus', 'percentage'],
    compute: (values, ctx) => {
      const expr = str(values, 'expression');
      const decimals = Math.max(0, Math.min(12, Math.trunc(num(values, 'decimals', 6))));
      const val = evaluateSafeFormula(expr, {});
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'Evaluated Result', value: val, formatted: formatNumber(val, { locale: loc, decimals }) },
        breakdown: [
          { label: 'Exact IEEE-754 Value', value: val, formatted: String(val) },
          { label: 'Absolute Value', value: Math.abs(val), formatted: formatNumber(Math.abs(val), { locale: loc, decimals }) },
          { label: 'Scientific Notation', value: val.toExponential(4), formatted: val.toExponential(4) },
        ],
        steps: [`Parsed safely without eval(): ${expr} = ${val}`],
      };
    },
  },
  {
    id: 'fraction',
    name: 'Fraction Calculator',
    shortDescription: 'Add, subtract, multiply, and divide two fractions with automatic GCD simplification.',
    category: 'mathematics',
    categoryLabel: 'Mathematics',
    keywords: ['fraction', 'numerator', 'denominator', 'simplify', 'mixed number', 'gcd'],
    synonyms: ['fraction solver', 'reduce fraction', 'add fractions'],
    formulaDisplay: '(a/b) op (c/d) simplified by GCD',
    explanation: 'Computes exact rational arithmetic and reduces the resulting fraction to lowest terms using Euclid GCD.',
    inputs: [
      { key: 'n1', label: 'First Numerator (a)', type: 'number', defaultValue: 3, step: 1 },
      { key: 'd1', label: 'First Denominator (b)', type: 'number', defaultValue: 4, step: 1 },
      {
        key: 'op',
        label: 'Operation',
        type: 'select',
        defaultValue: 'add',
        options: [
          { label: 'Add (+)', value: 'add' },
          { label: 'Subtract (-)', value: 'sub' },
          { label: 'Multiply (×)', value: 'mul' },
          { label: 'Divide (÷)', value: 'div' },
        ],
      },
      { key: 'n2', label: 'Second Numerator (c)', type: 'number', defaultValue: 5, step: 1 },
      { key: 'd2', label: 'Second Denominator (d)', type: 'number', defaultValue: 8, step: 1 },
    ],
    relatedIds: ['ratio', 'percentage', 'scientific'],
    compute: (values) => {
      const n1 = Math.trunc(num(values, 'n1'));
      const d1 = Math.trunc(num(values, 'd1'));
      const n2 = Math.trunc(num(values, 'n2'));
      const d2 = Math.trunc(num(values, 'd2'));
      const op = str(values, 'op', 'add');
      if (d1 === 0 || d2 === 0) throw new Error('Denominator cannot be zero.');

      let rn = 0;
      let rd = 1;
      if (op === 'add') {
        rn = n1 * d2 + n2 * d1;
        rd = d1 * d2;
      } else if (op === 'sub') {
        rn = n1 * d2 - n2 * d1;
        rd = d1 * d2;
      } else if (op === 'mul') {
        rn = n1 * n2;
        rd = d1 * d2;
      } else {
        if (n2 === 0) throw new Error('Cannot divide by a zero fraction.');
        rn = n1 * d2;
        rd = d1 * n2;
      }

      if (rd < 0) {
        rn = -rn;
        rd = -rd;
      }
      const g = gcd(rn, rd);
      const sn = rn / g;
      const sd = rd / g;
      const dec = sn / sd;

      return {
        primary: { label: 'Simplified Fraction', value: `${sn}/${sd}`, formatted: sd === 1 ? `${sn}` : `${sn} / ${sd}` },
        breakdown: [
          { label: 'Decimal Equivalent', value: dec, formatted: dec.toFixed(6) },
          { label: 'Unsimplified Form', value: `${rn}/${rd}`, formatted: `${rn} / ${rd}` },
          { label: 'Greatest Common Divisor', value: g, formatted: String(g) },
        ],
        steps: [`Raw result: ${rn}/${rd}`, `Dividing numerator & denominator by GCD(${Math.abs(rn)}, ${rd}) = ${g} → ${sn}/${sd}`],
      };
    },
  },
  {
    id: 'ratio',
    name: 'Ratio & Proportion Calculator',
    shortDescription: 'Simplify ratios, find unit ratios, and solve missing terms in A : B = C : D.',
    category: 'mathematics',
    categoryLabel: 'Mathematics',
    keywords: ['ratio', 'proportion', 'aspect ratio', 'scale', 'simplify'],
    synonyms: ['ratio solver', 'a:b = c:d', 'proportion calculator'],
    formulaDisplay: 'A : B = C : D  ⇒  D = (B × C) / A',
    explanation: 'Reduces integer ratios by GCD and solves unknown values in direct proportions.',
    inputs: [
      { key: 'a', label: 'Term A', type: 'number', defaultValue: 16, step: 'any' },
      { key: 'b', label: 'Term B', type: 'number', defaultValue: 9, step: 'any' },
      { key: 'c', label: 'Target C (for A:B = C:D)', type: 'number', defaultValue: 1920, step: 'any' },
    ],
    relatedIds: ['fraction', 'percentage', 'area'],
    compute: (values, ctx) => {
      const a = num(values, 'a');
      const b = num(values, 'b');
      const c = num(values, 'c');
      if (a === 0 || b === 0) throw new Error('Ratio terms A and B must be non-zero.');
      const d = (b * c) / a;
      const loc = ctx?.locale ?? 'en-IN';
      const intScale = Number.isInteger(a) && Number.isInteger(b);
      const g = intScale ? gcd(a, b) : 1;
      const simplified = intScale ? `${a / g} : ${b / g}` : `1 : ${(b / a).toFixed(4)}`;

      return {
        primary: { label: 'Solved Proportion Term D', value: d, formatted: formatNumber(d, { locale: loc, decimals: 4 }) },
        breakdown: [
          { label: 'Simplified Ratio (A:B)', value: simplified, formatted: simplified },
          { label: 'Scale Factor (C / A)', value: c / a, formatted: formatNumber(c / a, { locale: loc, decimals: 4 }) },
          { label: 'Share of A in (A+B)', value: (a / (a + b)) * 100, formatted: `${((a / (a + b)) * 100).toFixed(2)}%` },
        ],
        steps: [`D = (${b} × ${c}) / ${a} = ${d}`],
      };
    },
  },
  {
    id: 'equation-solver',
    name: 'Quadratic Equation Solver',
    shortDescription: 'Solve ax² + bx + c = 0 for real or complex roots, discriminant, and vertex.',
    category: 'mathematics',
    categoryLabel: 'Mathematics',
    keywords: ['quadratic', 'equation', 'roots', 'algebra', 'polynomial', 'discriminant', 'vertex'],
    synonyms: ['quadratic formula', 'solve ax^2+bx+c=0', 'root finder'],
    formulaDisplay: 'x = (-b ± √(b² - 4ac)) / (2a)',
    explanation: 'Computes discriminant Δ = b² - 4ac, real or complex conjugate roots, and the parabola vertex (h, k).',
    inputs: [
      { key: 'a', label: 'Coefficient a (x²)', type: 'number', defaultValue: 1, step: 'any' },
      { key: 'b', label: 'Coefficient b (x)', type: 'number', defaultValue: -5, step: 'any' },
      { key: 'c', label: 'Constant c', type: 'number', defaultValue: 6, step: 'any' },
    ],
    relatedIds: ['scientific', 'matrix', 'calculus'],
    compute: (values) => {
      const a = num(values, 'a');
      const b = num(values, 'b');
      const c = num(values, 'c');
      if (a === 0) {
        if (b === 0) throw new Error('Both a and b cannot be zero.');
        const root = -c / b;
        return {
          primary: { label: 'Linear Root (a = 0)', value: root, formatted: `x = ${root.toFixed(4)}` },
          breakdown: [{ label: 'Equation Type', value: 'Linear', formatted: 'Linear bx + c = 0' }],
          steps: [`${b}x + ${c} = 0 ⇒ x = ${root}`],
        };
      }
      const disc = b * b - 4 * a * c;
      const vx = -b / (2 * a);
      const vy = a * vx * vx + b * vx + c;

      if (disc >= 0) {
        const sqrtD = Math.sqrt(disc);
        const r1 = (-b + sqrtD) / (2 * a);
        const r2 = (-b - sqrtD) / (2 * a);
        return {
          primary: {
            label: disc === 0 ? 'Double Real Root' : 'Real Roots (x₁, x₂)',
            value: `${r1}, ${r2}`,
            formatted: disc === 0 ? `x = ${r1.toFixed(4)}` : `x₁ = ${r1.toFixed(4)}, x₂ = ${r2.toFixed(4)}`,
          },
          breakdown: [
            { label: 'Discriminant (Δ)', value: disc, formatted: disc.toFixed(4) },
            { label: 'Parabola Vertex (h, k)', value: `${vx}, ${vy}`, formatted: `(${vx.toFixed(3)}, ${vy.toFixed(3)})` },
            { label: 'Sum of Roots (-b/a)', value: -b / a, formatted: (-b / a).toFixed(4) },
          ],
          steps: [`Δ = (${b})² - 4(${a})(${c}) = ${disc}`, `x = (${-b} ± √${disc}) / ${2 * a}`],
        };
      }

      const realPart = -b / (2 * a);
      const imagPart = Math.sqrt(-disc) / Math.abs(2 * a);
      return {
        primary: {
          label: 'Complex Conjugate Roots',
          value: `${realPart} ± ${imagPart}i`,
          formatted: `${realPart.toFixed(4)} ± ${imagPart.toFixed(4)}i`,
        },
        breakdown: [
          { label: 'Discriminant (Δ < 0)', value: disc, formatted: disc.toFixed(4) },
          { label: 'Parabola Vertex (h, k)', value: `${vx}, ${vy}`, formatted: `(${vx.toFixed(3)}, ${vy.toFixed(3)})` },
        ],
        steps: [`Δ = ${disc} < 0 ⇒ Complex roots ${realPart.toFixed(4)} ± ${imagPart.toFixed(4)}i`],
      };
    },
  },
  {
    id: 'matrix',
    name: '2×2 Matrix Calculator',
    shortDescription: 'Compute determinant, trace, transpose, and inverse of a 2×2 matrix.',
    category: 'mathematics',
    categoryLabel: 'Mathematics',
    keywords: ['matrix', 'determinant', 'inverse', 'transpose', 'linear algebra'],
    synonyms: ['2x2 matrix', 'matrix inverse', 'matrix determinant'],
    formulaDisplay: 'det(A) = ad - bc  |  A⁻¹ = (1/det) × [d, -b; -c, a]',
    explanation: 'Computes exact determinant, trace, eigenvalues discriminant, and inverse matrix when invertible (det ≠ 0).',
    inputs: [
      { key: 'a', label: 'Row 1, Col 1 (a)', type: 'number', defaultValue: 4, step: 'any' },
      { key: 'b', label: 'Row 1, Col 2 (b)', type: 'number', defaultValue: 7, step: 'any' },
      { key: 'c', label: 'Row 2, Col 1 (c)', type: 'number', defaultValue: 2, step: 'any' },
      { key: 'd', label: 'Row 2, Col 2 (d)', type: 'number', defaultValue: 6, step: 'any' },
    ],
    relatedIds: ['equation-solver', 'statistics', 'scientific'],
    compute: (values) => {
      const a = num(values, 'a');
      const b = num(values, 'b');
      const c = num(values, 'c');
      const d = num(values, 'd');
      const det = a * d - b * c;
      const trace = a + d;
      const invStr =
        det !== 0
          ? `[${(d / det).toFixed(3)}, ${(-b / det).toFixed(3)}; ${(-c / det).toFixed(3)}, ${(a / det).toFixed(3)}]`
          : 'Singular matrix (det = 0, no inverse)';

      return {
        primary: { label: 'Determinant det(A)', value: det, formatted: det.toFixed(4) },
        breakdown: [
          { label: 'Trace (a + d)', value: trace, formatted: trace.toFixed(4) },
          { label: 'Inverse Matrix A⁻¹', value: invStr, formatted: invStr },
          { label: 'Transpose Aᵀ', value: `[${a}, ${c}; ${b}, ${d}]`, formatted: `[${a}, ${c}; ${b}, ${d}]` },
        ],
        steps: [`det(A) = (${a}×${d}) - (${b}×${c}) = ${det}`],
      };
    },
  },
  {
    id: 'statistics',
    name: 'Descriptive Statistics Calculator',
    shortDescription: 'Compute mean, median, mode, variance, standard deviation, and quartiles from a dataset.',
    category: 'mathematics',
    categoryLabel: 'Mathematics',
    keywords: ['statistics', 'mean', 'median', 'mode', 'average', 'standard deviation', 'variance'],
    synonyms: ['average calculator', 'avg', 'std dev', 'data stats'],
    formulaDisplay: 'μ = Σx / n  |  s = √(Σ(x - μ)² / (n - 1))',
    explanation: 'Parses comma- or space-separated numbers and computes both population and sample dispersion metrics.',
    inputs: [
      { key: 'dataset', label: 'Numbers (comma or space separated)', type: 'text', defaultValue: '12, 18, 24, 24, 30, 36, 42, 48', placeholder: '10, 20, 30, 40' },
    ],
    relatedIds: ['probability', 'scientific', 'cgpa'],
    compute: (values, ctx) => {
      const raw = str(values, 'dataset');
      const nums = raw
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((s) => Number(s));
      if (nums.length === 0 || nums.some((n) => !Number.isFinite(n))) {
        throw new Error('Provide valid numeric values separated by commas or spaces.');
      }
      const sorted = [...nums].sort((x, y) => x - y);
      const n = nums.length;
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const mid = Math.floor(n / 2);
      const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      const popVar = nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
      const sampleVar = n > 1 ? nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1) : 0;
      const loc = ctx?.locale ?? 'en-IN';

      return {
        primary: { label: 'Arithmetic Mean (Average)', value: mean, formatted: formatNumber(mean, { locale: loc, decimals: 4 }) },
        breakdown: [
          { label: 'Median', value: median, formatted: formatNumber(median, { locale: loc, decimals: 4 }) },
          { label: 'Sample Std Dev (s)', value: Math.sqrt(sampleVar), formatted: formatNumber(Math.sqrt(sampleVar), { locale: loc, decimals: 4 }) },
          { label: 'Population Std Dev (σ)', value: Math.sqrt(popVar), formatted: formatNumber(Math.sqrt(popVar), { locale: loc, decimals: 4 }) },
          { label: 'Sum / Count', value: `${sum} / ${n}`, formatted: `${formatNumber(sum, { locale: loc })} (${n} items)` },
          { label: 'Min / Max / Range', value: `${sorted[0]} to ${sorted[n - 1]}`, formatted: `${sorted[0]} / ${sorted[n - 1]} (Δ ${sorted[n - 1] - sorted[0]})` },
        ],
        steps: [`Sorted ${n} values`, `Mean = ${sum} / ${n} = ${mean.toFixed(4)}`],
      };
    },
  },
  {
    id: 'probability',
    name: 'Probability, Permutations & Combinations',
    shortDescription: 'Calculate nPr, nCr, and Binomial probability P(X = k).',
    category: 'mathematics',
    categoryLabel: 'Mathematics',
    keywords: ['probability', 'permutation', 'combination', 'npr', 'ncr', 'binomial', 'factorial'],
    synonyms: ['ncr calculator', 'npr calculator', 'binomial distribution'],
    formulaDisplay: 'nCr = n! / (r!(n-r)!)  |  P(X=k) = nCk · pᵏ · (1-p)ⁿ⁻ᵏ',
    explanation: 'Computes exact combinatorics counts and binomial event probability.',
    inputs: [
      { key: 'n', label: 'Total Items / Trials (n)', type: 'number', defaultValue: 10, min: 0, max: 170, step: 1 },
      { key: 'r', label: 'Chosen Items / Successes (r / k)', type: 'number', defaultValue: 3, min: 0, max: 170, step: 1 },
      { key: 'p', label: 'Single Trial Probability (p, 0 to 1)', type: 'number', defaultValue: 0.25, min: 0, max: 1, step: 0.01 },
    ],
    relatedIds: ['statistics', 'scientific', 'percentage'],
    compute: (values) => {
      const n = Math.trunc(num(values, 'n'));
      const r = Math.trunc(num(values, 'r'));
      const p = num(values, 'p');
      if (n < 0 || r < 0 || r > n) throw new Error('Must satisfy 0 ≤ r ≤ n.');
      if (p < 0 || p > 1) throw new Error('Probability p must be between 0 and 1.');

      const nPr = factorial(n) / factorial(n - r);
      const nCr = nPr / factorial(r);
      const binom = nCr * Math.pow(p, r) * Math.pow(1 - p, n - r);

      return {
        primary: { label: `Combinations (${n}C${r})`, value: nCr, formatted: Math.round(nCr).toLocaleString('en-US') },
        breakdown: [
          { label: `Permutations (${n}P${r})`, value: nPr, formatted: Math.round(nPr).toLocaleString('en-US') },
          { label: `Binomial P(X = ${r})`, value: binom, formatted: `${(binom * 100).toFixed(4)}%` },
          { label: 'Expected Value (n·p)', value: n * p, formatted: (n * p).toFixed(4) },
        ],
        steps: [`${n}C${r} = ${n}! / (${r}! × ${n - r}!) = ${Math.round(nCr)}`, `P(X=${r}) = ${nCr} × ${p}^${r} × ${(1 - p).toFixed(4)}^${n - r}`],
      };
    },
  },
  {
    id: 'trigonometry',
    name: 'Trigonometry & Right Triangle Solver',
    shortDescription: 'Compute sin, cos, tan, radians/degrees, and solve right-angled triangle sides.',
    category: 'mathematics',
    categoryLabel: 'Mathematics',
    keywords: ['trigonometry', 'sin', 'cos', 'tan', 'angle', 'radian', 'degree', 'triangle', 'hypotenuse'],
    synonyms: ['trig calculator', 'right triangle solver', 'pythagoras'],
    formulaDisplay: 'c = √(a² + b²)  |  sin(θ), cos(θ), tan(θ)',
    explanation: 'Evaluates all primary trigonometric ratios for any angle and solves right triangle dimensions.',
    inputs: [
      { key: 'angle', label: 'Angle θ', type: 'number', defaultValue: 30, step: 'any' },
      {
        key: 'angleUnit',
        label: 'Angle Unit',
        type: 'select',
        defaultValue: 'deg',
        options: [
          { label: 'Degrees (°)', value: 'deg' },
          { label: 'Radians (rad)', value: 'rad' },
        ],
      },
      { key: 'adjacent', label: 'Adjacent Side (Base)', type: 'number', defaultValue: 10, min: 0.0001, step: 'any' },
    ],
    relatedIds: ['scientific', 'area', 'velocity'],
    compute: (values) => {
      const angle = num(values, 'angle');
      const unit = str(values, 'angleUnit', 'deg');
      const adj = num(values, 'adjacent');
      const rad = unit === 'deg' ? (angle * Math.PI) / 180 : angle;
      const deg = unit === 'deg' ? angle : (angle * 180) / Math.PI;
      const s = Math.sin(rad);
      const c = Math.cos(rad);
      const t = Math.abs(c) < 1e-12 ? Infinity : Math.tan(rad);
      const hyp = Math.abs(c) < 1e-12 ? Infinity : adj / c;
      const opp = Math.abs(c) < 1e-12 ? Infinity : adj * t;

      return {
        primary: { label: 'sin(θ) / cos(θ)', value: `${s.toFixed(6)} / ${c.toFixed(6)}`, formatted: `sin = ${s.toFixed(5)} · cos = ${c.toFixed(5)}` },
        breakdown: [
          { label: 'tan(θ)', value: Number.isFinite(t) ? t : 'Undefined', formatted: Number.isFinite(t) ? t.toFixed(6) : 'Undefined (cos θ = 0)' },
          { label: 'Degrees / Radians', value: `${deg.toFixed(3)}°`, formatted: `${deg.toFixed(3)}° = ${rad.toFixed(5)} rad` },
          { label: 'Triangle Opposite / Hypotenuse', value: opp, formatted: Number.isFinite(hyp) ? `Opp ${Math.abs(opp).toFixed(3)} · Hyp ${Math.abs(hyp).toFixed(3)}` : 'N/A' },
        ],
        steps: [`θ = ${deg.toFixed(4)}° (${rad.toFixed(6)} rad)`],
      };
    },
  },
  {
    id: 'calculus',
    name: 'Numerical Calculus (Derivative & Integral)',
    shortDescription: 'Approximate f\'(x) via central difference and ∫f(x)dx via Simpson\'s 1/3 rule.',
    category: 'mathematics',
    categoryLabel: 'Mathematics',
    keywords: ['calculus', 'derivative', 'integral', 'simpson', 'differentiation', 'integration'],
    synonyms: ['definite integral', 'numerical derivative', 'slope at x'],
    formulaDisplay: "f'(x) ≈ [f(x+h)-f(x-h)]/2h  |  ∫ₐᵇ f(x)dx (Simpson's Rule)",
    explanation: 'Evaluates numerical derivative at point x and definite integral over [a, b] using our safe AST math parser.',
    assumptions: 'Results are high-precision numerical approximations using central finite difference (h = 10⁻⁶) and 200-panel composite Simpson quadrature.',
    inputs: [
      { key: 'expr', label: 'Function f(x)', type: 'text', defaultValue: 'x^3 - 2*x + 5' },
      { key: 'x', label: "Evaluate Derivative f'(x) at x =", type: 'number', defaultValue: 2, step: 'any' },
      { key: 'a', label: 'Integral Lower Bound (a)', type: 'number', defaultValue: 0, step: 'any' },
      { key: 'b', label: 'Integral Upper Bound (b)', type: 'number', defaultValue: 3, step: 'any' },
    ],
    relatedIds: ['scientific', 'equation-solver', 'trigonometry'],
    compute: (values) => {
      const expr = str(values, 'expr');
      const x = num(values, 'x');
      const a = num(values, 'a');
      const b = num(values, 'b');
      const fx = evaluateSafeFormula(expr, { x });
      const dfx = numericalDerivative(expr, x);
      const integral = simpsonIntegral(expr, a, b, 200);

      return {
        primary: { label: `Definite Integral ∫[${a}, ${b}] f(x)dx`, value: integral, formatted: `${integral.toFixed(6)} (approx.)` },
        breakdown: [
          { label: `Value f(${x})`, value: fx, formatted: fx.toFixed(6) },
          { label: `Derivative f'(${x})`, value: dfx, formatted: `${dfx.toFixed(6)} (approx.)` },
        ],
        steps: [
          `Evaluated f(${x}) = ${fx.toFixed(6)}`,
          `Central difference f'(${x}) ≈ ${dfx.toFixed(6)}`,
          `200-step Simpson integral over [${a}, ${b}] ≈ ${integral.toFixed(6)}`,
        ],
        isApproximate: true,
      };
    },
  },
];
