// Safe recursive-descent mathematical expression parser and evaluator.
// Never uses eval(), new Function(), or dynamic code execution.

export type MathScope = Record<string, number>;

type TokenType =
  | 'number'
  | 'ident'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'question'
  | 'colon';

interface Token {
  type: TokenType;
  value: string;
}

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  PI: Math.PI,
  e: Math.E,
  E: Math.E,
  tau: Math.PI * 2,
};

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: (x) => Math.abs(x),
  round: (x, d = 0) => {
    const f = Math.pow(10, Math.min(10, Math.max(0, Math.trunc(d))));
    return Math.round(x * f) / f;
  },
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  sqrt: (x) => {
    if (x < 0) throw new Error('sqrt domain error: negative input');
    return Math.sqrt(x);
  },
  cbrt: (x) => Math.cbrt(x),
  pow: (a, b) => Math.pow(a, b),
  log: (x) => {
    if (x <= 0) throw new Error('log domain error: input must be > 0');
    return Math.log(x);
  },
  ln: (x) => {
    if (x <= 0) throw new Error('ln domain error: input must be > 0');
    return Math.log(x);
  },
  log10: (x) => {
    if (x <= 0) throw new Error('log10 domain error: input must be > 0');
    return Math.log10(x);
  },
  exp: (x) => Math.exp(x),
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  asin: (x) => Math.asin(x),
  acos: (x) => Math.acos(x),
  atan: (x) => Math.atan(x),
  min: (...args) => {
    if (args.length === 0) throw new Error('min requires at least 1 argument');
    return Math.min(...args);
  },
  max: (...args) => {
    if (args.length === 0) throw new Error('max requires at least 1 argument');
    return Math.max(...args);
  },
  clamp: (val, lo, hi) => Math.min(Math.max(val, lo), hi),
  if: (cond, a, b) => (cond ? a : b),
  avg: (...args) => {
    if (args.length === 0) throw new Error('avg requires at least 1 argument');
    return args.reduce((s, v) => s + v, 0) / args.length;
  },
};

const BLOCKED_IDENTS = new Set([
  'constructor',
  'prototype',
  '__proto__',
  'window',
  'document',
  'globalThis',
  'process',
  'eval',
  'Function',
]);

export function tokenizeExpression(expr: string): Token[] {
  if (expr.length > 500) {
    throw new Error('Formula exceeds 500-character safety limit.');
  }
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      let dotCount = 0;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        if (expr[i] === '.') dotCount++;
        if (dotCount > 1) throw new Error(`Invalid number literal near "${numStr}."`);
        numStr += expr[i++];
      }
      if (i < expr.length && (expr[i] === 'e' || expr[i] === 'E')) {
        numStr += expr[i++];
        if (i < expr.length && (expr[i] === '+' || expr[i] === '-')) {
          numStr += expr[i++];
        }
        let expDigits = 0;
        while (i < expr.length && /[0-9]/.test(expr[i])) {
          numStr += expr[i++];
          expDigits++;
        }
        if (expDigits === 0) throw new Error('Invalid scientific notation');
      }
      tokens.push({ type: 'number', value: numStr });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        id += expr[i++];
      }
      if (BLOCKED_IDENTS.has(id)) {
        throw new Error(`Identifier "${id}" is not permitted.`);
      }
      tokens.push({ type: 'ident', value: id });
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ch });
      i++;
      continue;
    }
    if (ch === '?') {
      tokens.push({ type: 'question', value: ch });
      i++;
      continue;
    }
    if (ch === ':') {
      tokens.push({ type: 'colon', value: ch });
      i++;
      continue;
    }
    const two = expr.slice(i, i + 2);
    if (['>=', '<=', '==', '!=', '&&', '||'].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if (['+', '-', '*', '/', '%', '^', '>', '<', '!'].includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${ch}" in formula.`);
  }
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private scope: MathScope;
  private steps = 0;
  private readonly maxSteps = 2000;

  constructor(tokens: Token[], scope: MathScope) {
    this.tokens = tokens;
    this.scope = scope;
  }

  private tick(): void {
    this.steps++;
    if (this.steps > this.maxSteps) {
      throw new Error('Formula evaluation exceeded complexity limit.');
    }
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  parse(): number {
    if (this.tokens.length === 0) {
      throw new Error('Formula cannot be empty.');
    }
    const val = this.parseTernary();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected token "${this.tokens[this.pos].value}"`);
    }
    if (!Number.isFinite(val)) {
      throw new Error('Result is undefined or infinite.');
    }
    return val;
  }

  private parseTernary(): number {
    this.tick();
    const cond = this.parseOr();
    if (this.peek()?.type === 'question') {
      this.consume();
      const tVal = this.parseTernary();
      if (this.peek()?.type !== 'colon') {
        throw new Error('Expected ":" in conditional expression.');
      }
      this.consume();
      const fVal = this.parseTernary();
      return cond ? tVal : fVal;
    }
    return cond;
  }

  private parseOr(): number {
    let left = this.parseAnd();
    while (this.peek()?.type === 'op' && this.peek()?.value === '||') {
      this.consume();
      const right = this.parseAnd();
      left = left || right ? 1 : 0;
    }
    return left;
  }

  private parseAnd(): number {
    let left = this.parseEquality();
    while (this.peek()?.type === 'op' && this.peek()?.value === '&&') {
      this.consume();
      const right = this.parseEquality();
      left = left && right ? 1 : 0;
    }
    return left;
  }

  private parseEquality(): number {
    let left = this.parseComparison();
    while (
      this.peek()?.type === 'op' &&
      (this.peek()?.value === '==' || this.peek()?.value === '!=')
    ) {
      const op = this.consume().value;
      const right = this.parseComparison();
      left = op === '==' ? (left === right ? 1 : 0) : left !== right ? 1 : 0;
    }
    return left;
  }

  private parseComparison(): number {
    let left = this.parseAdditive();
    while (
      this.peek()?.type === 'op' &&
      ['>', '<', '>=', '<='].includes(this.peek()!.value)
    ) {
      const op = this.consume().value;
      const right = this.parseAdditive();
      if (op === '>') left = left > right ? 1 : 0;
      else if (op === '<') left = left < right ? 1 : 0;
      else if (op === '>=') left = left >= right ? 1 : 0;
      else left = left <= right ? 1 : 0;
    }
    return left;
  }

  private parseAdditive(): number {
    let left = this.parseMultiplicative();
    while (
      this.peek()?.type === 'op' &&
      (this.peek()?.value === '+' || this.peek()?.value === '-')
    ) {
      const op = this.consume().value;
      const right = this.parseMultiplicative();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private parseMultiplicative(): number {
    let left = this.parsePower();
    while (
      this.peek()?.type === 'op' &&
      ['*', '/', '%'].includes(this.peek()!.value)
    ) {
      const op = this.consume().value;
      const right = this.parsePower();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero.');
        left /= right;
      } else {
        if (right === 0) throw new Error('Modulo by zero.');
        left %= right;
      }
    }
    return left;
  }

  private parsePower(): number {
    const base = this.parseUnary();
    if (this.peek()?.type === 'op' && this.peek()?.value === '^') {
      this.consume();
      const exp = this.parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  private parseUnary(): number {
    this.tick();
    if (this.peek()?.type === 'op' && ['+', '-', '!'].includes(this.peek()!.value)) {
      const op = this.consume().value;
      const val = this.parseUnary();
      if (op === '-') return -val;
      if (op === '!') return val ? 0 : 1;
      return val;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    this.tick();
    const tok = this.peek();
    if (!tok) throw new Error('Unexpected end of formula.');

    if (tok.type === 'number') {
      this.consume();
      const n = Number(tok.value);
      if (Number.isNaN(n)) throw new Error(`Invalid number "${tok.value}"`);
      return n;
    }

    if (tok.type === 'lparen') {
      this.consume();
      const inner = this.parseTernary();
      if (this.peek()?.type !== 'rparen') {
        throw new Error('Missing closing parenthesis ")".');
      }
      this.consume();
      return inner;
    }

    if (tok.type === 'ident') {
      this.consume();
      // Function call
      if (this.peek()?.type === 'lparen') {
        this.consume();
        const fn = FUNCTIONS[tok.value];
        if (!fn) {
          throw new Error(`Unsupported function "${tok.value}()".`);
        }
        const args: number[] = [];
        if (this.peek()?.type !== 'rparen') {
          args.push(this.parseTernary());
          while (this.peek()?.type === 'comma') {
            this.consume();
            args.push(this.parseTernary());
          }
        }
        if (this.peek()?.type !== 'rparen') {
          throw new Error(`Expected ")" after arguments to ${tok.value}().`);
        }
        this.consume();
        return fn(...args);
      }
      // Variable or constant
      if (Object.prototype.hasOwnProperty.call(this.scope, tok.value)) {
        return this.scope[tok.value];
      }
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, tok.value)) {
        return CONSTANTS[tok.value];
      }
      throw new Error(`Unknown variable "${tok.value}".`);
    }

    throw new Error(`Unexpected token "${tok.value}".`);
  }
}

export function evaluateSafeFormula(expr: string, scope: MathScope = {}): number {
  const tokens = tokenizeExpression(expr);
  const parser = new Parser(tokens, scope);
  return parser.parse();
}

export function validateSafeFormula(
  expr: string,
  allowedVariables: string[] = []
): { valid: boolean; error?: string } {
  try {
    const scope: MathScope = {};
    for (const v of allowedVariables) {
      scope[v] = 1;
    }
    evaluateSafeFormula(expr, scope);
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid formula',
    };
  }
}

export function numericalDerivative(expr: string, x: number, h = 1e-6): number {
  const fPlus = evaluateSafeFormula(expr, { x: x + h });
  const fMinus = evaluateSafeFormula(expr, { x: x - h });
  return (fPlus - fMinus) / (2 * h);
}

export function simpsonIntegral(expr: string, a: number, b: number, n = 200): number {
  const steps = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / steps;
  let sum = evaluateSafeFormula(expr, { x: a }) + evaluateSafeFormula(expr, { x: b });
  for (let i = 1; i < steps; i++) {
    const xi = a + i * h;
    sum += (i % 2 === 0 ? 2 : 4) * evaluateSafeFormula(expr, { x: xi });
  }
  return (h / 3) * sum;
}

export const WHITELISTED_MATH_FUNCTIONS = Object.keys(FUNCTIONS);
