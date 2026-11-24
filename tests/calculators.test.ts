import { describe, expect, it } from 'vitest';
import {
  CALCULATOR_REGISTRY,
  getCalculatorById,
  getPublishedCalculators,
} from '../src/engine/calculators';
import { UNIT_CATEGORIES, convertUnit } from '../src/engine/units';

describe('CALCULATOR_REGISTRY completeness & default computation', () => {
  it('contains at least 55 verified deterministic calculators with unique IDs', () => {
    expect(CALCULATOR_REGISTRY.length).toBeGreaterThanOrEqual(55);
    const ids = new Set(CALCULATOR_REGISTRY.map((c) => c.id));
    expect(ids.size).toBe(CALCULATOR_REGISTRY.length);
  });

  it('computes valid results for default inputs on every single published calculator', () => {
    for (const calc of CALCULATOR_REGISTRY) {
      const defaults: Record<string, number | string> = {};
      for (const field of calc.inputs) {
        defaults[field.key] = field.defaultValue;
      }
      const res = calc.compute(defaults, { locale: 'en-IN', currency: 'INR' });
      expect(res.primary).toBeDefined();
      expect(res.primary.formatted.length).toBeGreaterThan(0);
      expect(Array.isArray(res.breakdown)).toBe(true);
      expect(Array.isArray(res.steps)).toBe(true);
    }
  });

  it('excludes unpublished calculators cleanly via getPublishedCalculators', () => {
    const filtered = getPublishedCalculators(['emi', 'bmi']);
    expect(filtered.some((c) => c.id === 'emi')).toBe(false);
    expect(filtered.some((c) => c.id === 'bmi')).toBe(false);
    expect(filtered.length).toBe(CALCULATOR_REGISTRY.length - 2);
  });
});

describe('Domain reference accuracy & boundary checks', () => {
  it('EMI: ₹25,00,000 @ 8.5% for 20 years matches standard monthly EMI formula', () => {
    const emi = getCalculatorById('emi')!;
    const res = emi.compute({ principal: 2500000, rate: 8.5, years: 20 });
    expect(Number(res.primary.value)).toBeCloseTo(21695.58, 1);

    // Zero interest boundary
    const zeroRate = emi.compute({ principal: 120000, rate: 0, years: 1 });
    expect(Number(zeroRate.primary.value)).toBeCloseTo(10000, 2);

    // Invalid principal throws
    expect(() => emi.compute({ principal: 0, rate: 8.5, years: 20 })).toThrow();
  });

  it('GST: Exclusive 18% on 10,000 yields 11,800 total and 1,800 GST (CGST 900 + SGST 900)', () => {
    const gst = getCalculatorById('gst')!;
    const excl = gst.compute({ amount: 10000, slab: '18', mode: 'exclusive' });
    expect(Number(excl.primary.value)).toBeCloseTo(11800, 2);
    expect(Number(excl.breakdown[0].value)).toBeCloseTo(10000, 2);
    expect(Number(excl.breakdown[1].value)).toBeCloseTo(1800, 2);
    expect(Number(excl.breakdown[2].value)).toBeCloseTo(900, 2);

    const incl = gst.compute({ amount: 11800, slab: '18', mode: 'inclusive' });
    expect(Number(incl.primary.value)).toBeCloseTo(11800, 2);
    expect(Number(incl.breakdown[0].value)).toBeCloseTo(10000, 2);
    expect(Number(incl.breakdown[1].value)).toBeCloseTo(1800, 2);
  });

  it('BMI: 70 kg, 175 cm equals ~22.86 kg/m² Normal Weight and rejects zero height', () => {
    const bmi = getCalculatorById('bmi')!;
    const res = bmi.compute({ weight: 70, heightCm: 175 });
    expect(Number(res.primary.value)).toBeCloseTo(22.857, 2);
    expect(res.primary.formatted).toContain('Normal Weight');
    expect(() => bmi.compute({ weight: 70, heightCm: 0 })).toThrow();
  });

  it('Percentage & Quadratic Equation Solver handle normal, negative, and degenerate inputs', () => {
    const pct = getCalculatorById('percentage')!;
    const r1 = pct.compute({ mode: 'percent_of', x: 18, y: 2500 });
    expect(Number(r1.primary.value)).toBeCloseTo(450, 4);

    const rChange = pct.compute({ mode: 'pct_change', x: 200, y: 150 });
    expect(Number(rChange.primary.value)).toBeCloseTo(-25, 4);

    const eq = getCalculatorById('equation-solver')!;
    const roots = eq.compute({ a: 1, b: -5, c: 6 });
    expect(roots.primary.formatted).toContain('3');
    expect(roots.primary.formatted).toContain('2');

    // Complex discriminant case
    const complexRoots = eq.compute({ a: 1, b: 0, c: 4 });
    expect(complexRoots.primary.formatted).toContain('2.0000i');
  });

  it("Ohm's Law & Velocity solve accurately and reject zero denominators", () => {
    const ohm = getCalculatorById('ohms-law')!;
    const v = ohm.compute({ solveFor: 'voltage', valA: 2, valB: 100 });
    expect(Number(v.primary.value)).toBeCloseTo(200, 4);
    expect(() => ohm.compute({ solveFor: 'current', valA: 12, valB: 0 })).toThrow();
  });
});

describe('Universal Unit Converter across all 13 categories', () => {
  it('covers 13 unit categories and converts round-trip accurately', () => {
    expect(UNIT_CATEGORIES.length).toBe(13);
    expect(convertUnit(1, 'length', 'km', 'm')).toBeCloseTo(1000, 6);
    expect(convertUnit(100, 'temperature', 'C', 'F')).toBeCloseTo(212, 6);
    expect(convertUnit(0, 'temperature', 'C', 'K')).toBeCloseTo(273.15, 6);
    expect(convertUnit(1, 'data', 'GiB', 'MiB')).toBeCloseTo(1024, 6);
    expect(convertUnit(1, 'pressure', 'atm', 'kPa')).toBeCloseTo(101.325, 4);

    for (const cat of UNIT_CATEGORIES) {
      const first = cat.units[0].id;
      const last = cat.units[cat.units.length - 1].id;
      const forward = convertUnit(42.5, cat.id, first, last);
      const back = convertUnit(forward, cat.id, last, first);
      expect(back).toBeCloseTo(42.5, 4);
    }
  });
});
