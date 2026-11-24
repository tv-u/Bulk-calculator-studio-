import { describe, expect, it } from 'vitest';
import {
  evaluateSafeFormula,
  numericalDerivative,
  simpsonIntegral,
  validateSafeFormula,
} from '../src/engine/safeMath';

describe('Safe recursive-descent AST formula engine (Zero eval)', () => {
  it('evaluates arithmetic, precedence, exponents, functions, constants, and comparisons', () => {
    expect(evaluateSafeFormula('2 + 3 * 4^2')).toBe(50);
    expect(evaluateSafeFormula('sqrt(144) + abs(-8)')).toBe(20);
    expect(evaluateSafeFormula('sin(pi / 6)')).toBeCloseTo(0.5, 6);
    expect(evaluateSafeFormula('min(10, 4, 9) + max(2, 7)')).toBe(11);
    expect(evaluateSafeFormula('x > 100 ? x * 0.9 : x', { x: 200 })).toBe(180);
    expect(evaluateSafeFormula('x > 100 ? x * 0.9 : x', { x: 50 })).toBe(50);
  });

  it('computes numerical derivatives and Simpson integrals accurately', () => {
    // d/dx(x^3 - 2*x + 5) at x=2 => 3*4 - 2 = 10
    expect(numericalDerivative('x^3 - 2*x + 5', 2)).toBeCloseTo(10, 4);
    // integral of x^2 from 0 to 3 => 9
    expect(simpsonIntegral('x^2', 0, 3)).toBeCloseTo(9, 5);
  });

  it('rejects division by zero and oversized inputs', () => {
    expect(() => evaluateSafeFormula('10 / 0')).toThrow(/zero/i);
    expect(() => evaluateSafeFormula('1+'.repeat(400) + '1')).toThrow();
  });

  it('blocks dangerous JavaScript identifiers and injection attempts', () => {
    const blocked = [
      'eval("1+1")',
      'Function("return 1")()',
      'window.location',
      'document.cookie',
      'process.exit(1)',
      'constructor.constructor("return this")()',
      '__proto__',
    ];
    for (const expr of blocked) {
      const check = validateSafeFormula(expr);
      expect(check.valid).toBe(false);
    }
  });
});
