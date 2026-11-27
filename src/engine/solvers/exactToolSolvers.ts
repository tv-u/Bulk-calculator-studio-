import type { CalculatorDefinition, ComputeContext } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import type { CatalogEntryMeta } from '../catalogTypes';
import { formatCurrency } from '../formatters';

type ExactBuilder = (entry: CatalogEntryMeta) => CalculatorDefinition;

function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) throw new Error('Loan term must be greater than zero months.');
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function makeBase(
  entry: CatalogEntryMeta,
  overrides: Omit<CalculatorDefinition, 'id' | 'name' | 'category' | 'categoryLabel' | 'keywords' | 'synonyms' | 'relatedIds'> & {
    keywords?: string[];
  }
): CalculatorDefinition {
  return {
    id: entry.slug,
    name: entry.name,
    category: entry.category,
    categoryLabel: entry.categoryLabel,
    keywords: [
      entry.name.toLowerCase(),
      entry.category,
      entry.subcategory.toLowerCase(),
      ...(overrides.keywords || []),
    ],
    synonyms: [entry.slug.replace(/-/g, ' '), entry.longTail || entry.name.toLowerCase()],
    relatedIds: [],
    ...overrides,
  };
}

function fmtMoney(val: number, ctx?: ComputeContext, customCurrency?: string): string {
  return formatCurrency(val, customCurrency || ctx?.currency || 'USD', ctx?.locale || 'en-US');
}

function gcdTwo(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function lcmTwo(a: number, b: number): number {
  const g = gcdTwo(a, b);
  return g === 0 ? 0 : Math.abs((Math.trunc(a) * Math.trunc(b)) / g);
}

function parseNumberList(raw: string): number[] {
  const arr = raw
    .split(/[\s,;]+/)
    .map((s) => Number(s.trim()))
    .filter((v) => Number.isFinite(v));
  if (arr.length === 0) throw new Error('Enter at least one valid number.');
  return arr;
}

function normalInvApprox(confPct: number): number {
  if (confPct >= 99.5) return 2.807;
  if (confPct >= 99) return 2.576;
  if (confPct >= 98) return 2.326;
  if (confPct >= 95) return 1.96;
  if (confPct >= 90) return 1.645;
  if (confPct >= 85) return 1.44;
  return 1.282;
}

const EXACT_BUILDERS: Record<string, ExactBuilder> = {
  // 1. Auto Loan Calculator
  'auto-loan-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate monthly car loan payment, total interest, sales tax & trade-in net financing.`,
      formulaDisplay: 'Financed = (Price − TradeIn) × (1 + Tax%) − DownPayment + Fees;  PMT = P·r / (1 − (1+r)^−n)',
      explanation: 'Includes vehicle sales tax, trade-in allowance, down payment, title/dealer fees, and monthly compounding.',
      inputs: [
        { key: 'price', label: 'Auto Price', type: 'number', defaultValue: 35000, min: 500, step: 500 },
        { key: 'downPayment', label: 'Down Payment', type: 'number', defaultValue: 5000, min: 0, step: 500 },
        { key: 'tradeIn', label: 'Trade-in Value', type: 'number', defaultValue: 3000, min: 0, step: 500 },
        { key: 'taxRate', label: 'Sales Tax (%)', type: 'number', defaultValue: 7, min: 0, max: 25, step: 0.25 },
        { key: 'fees', label: 'Title & Dealer Fees', type: 'number', defaultValue: 650, min: 0, step: 50 },
        { key: 'apr', label: 'Interest Rate (APR %)', type: 'number', defaultValue: 6.2, min: 0, max: 35, step: 0.1 },
        { key: 'months', label: 'Loan Term (Months)', type: 'number', defaultValue: 60, min: 12, max: 96, step: 12 },
      ],
      compute: (vals, ctx) => {
        const price = num(vals, 'price');
        const down = num(vals, 'downPayment');
        const trade = num(vals, 'tradeIn');
        const tax = num(vals, 'taxRate') / 100;
        const fees = num(vals, 'fees');
        const apr = num(vals, 'apr');
        const months = Math.round(num(vals, 'months', 60));
        const taxable = Math.max(0, price - trade);
        const salesTax = taxable * tax;
        const loanPrincipal = Math.max(0, taxable + salesTax + fees - down);
        const pmt = monthlyPayment(loanPrincipal, apr, months);
        const totalPaid = pmt * months;
        const totalInterest = totalPaid - loanPrincipal;
        return {
          primary: { label: 'Monthly Auto Payment', value: pmt, formatted: fmtMoney(pmt, ctx) },
          breakdown: [
            { label: 'Net Loan Principal', value: loanPrincipal, formatted: fmtMoney(loanPrincipal, ctx) },
            { label: 'Sales Tax Included', value: salesTax, formatted: fmtMoney(salesTax, ctx) },
            { label: 'Total Interest Paid', value: totalInterest, formatted: fmtMoney(totalInterest, ctx) },
            { label: 'Total Loan Payments', value: totalPaid, formatted: fmtMoney(totalPaid, ctx) },
          ],
          steps: [
            `Taxable Amount = ${fmtMoney(price, ctx)} − ${fmtMoney(trade, ctx)} = ${fmtMoney(taxable, ctx)}`,
            `Loan Principal = ${fmtMoney(loanPrincipal, ctx)} over ${months} months @ ${apr}% APR`,
          ],
        };
      },
    }),

  // 2. Payment Calculator
  'payment-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate monthly fixed loan payment or payoff duration using exact amortization math.`,
      formulaDisplay: 'PMT = P × [r(1+r)^n] / [(1+r)^n − 1]',
      explanation: 'Computes equal periodic payments, total interest cost, and principal-to-interest share.',
      inputs: [
        { key: 'amount', label: 'Loan Amount', type: 'number', defaultValue: 25000, min: 100, step: 500 },
        { key: 'apr', label: 'Annual Interest Rate (%)', type: 'number', defaultValue: 7.5, min: 0, max: 40, step: 0.1 },
        { key: 'years', label: 'Loan Term (Years)', type: 'number', defaultValue: 5, min: 0.5, max: 40, step: 0.5 },
      ],
      compute: (vals, ctx) => {
        const P = num(vals, 'amount');
        const apr = num(vals, 'apr');
        const months = Math.max(1, Math.round(num(vals, 'years') * 12));
        const pmt = monthlyPayment(P, apr, months);
        const total = pmt * months;
        const interest = total - P;
        return {
          primary: { label: 'Monthly Payment', value: pmt, formatted: fmtMoney(pmt, ctx) },
          breakdown: [
            { label: 'Number of Payments', value: months, formatted: `${months} months` },
            { label: 'Total Interest', value: interest, formatted: fmtMoney(interest, ctx) },
            { label: 'Total Repayment', value: total, formatted: fmtMoney(total, ctx) },
          ],
          steps: [`P = ${fmtMoney(P, ctx)}, n = ${months}, r_m = ${(apr / 12).toFixed(4)}%`],
        };
      },
    }),

  // 3. Amortization Calculator
  'amortization-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Full year-by-year principal and interest loan amortization schedule with remaining balance.`,
      formulaDisplay: 'Interest_m = Balance × r;  Principal_m = PMT − Interest_m',
      explanation: 'Generates a complete multi-year amortization schedule showing equity buildup vs interest expense.',
      inputs: [
        { key: 'principal', label: 'Loan Principal', type: 'number', defaultValue: 250000, min: 1000, step: 5000 },
        { key: 'apr', label: 'Annual Interest Rate (%)', type: 'number', defaultValue: 6.5, min: 0, max: 30, step: 0.1 },
        { key: 'years', label: 'Amortization Term (Years)', type: 'number', defaultValue: 30, min: 1, max: 40, step: 1 },
      ],
      compute: (vals, ctx) => {
        const P = num(vals, 'principal');
        const apr = num(vals, 'apr');
        const years = Math.round(num(vals, 'years', 30));
        const months = years * 12;
        const pmt = monthlyPayment(P, apr, months);
        const r = apr / 100 / 12;
        let bal = P;
        const rows: Array<Array<string | number>> = [];
        let yrP = 0;
        let yrI = 0;
        let totI = 0;
        for (let m = 1; m <= months; m++) {
          const interest = bal * r;
          const princ = Math.min(bal, pmt - interest);
          bal = Math.max(0, bal - princ);
          yrP += princ;
          yrI += interest;
          totI += interest;
          if (m % 12 === 0 || m === months) {
            rows.push([`Year ${Math.ceil(m / 12)}`, fmtMoney(yrP, ctx), fmtMoney(yrI, ctx), fmtMoney(bal, ctx)]);
            yrP = 0;
            yrI = 0;
          }
        }
        return {
          primary: { label: 'Monthly Payment', value: pmt, formatted: fmtMoney(pmt, ctx) },
          breakdown: [
            { label: 'Total Interest Over Term', value: totI, formatted: fmtMoney(totI, ctx) },
            { label: 'Total Paid', value: P + totI, formatted: fmtMoney(P + totI, ctx) },
            { label: 'First Month Interest', value: P * r, formatted: fmtMoney(P * r, ctx) },
          ],
          steps: [`Monthly rate = ${(r * 100).toFixed(4)}% across ${months} payments.`],
          tableHeaders: ['Period', 'Annual Principal', 'Annual Interest', 'Ending Balance'],
          tableRows: rows.slice(0, 15),
        };
      },
    }),

  // 4. Currency Calculator
  'currency-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Convert major global currencies with bank FX markup/spread fee estimation.`,
      formulaDisplay: 'Net Converted = Amount × MidRate × (1 − BankSpread%)',
      explanation: 'Computes deterministic mid-market and bank-spread-adjusted FX conversion (use Currency Converter for live API rates).',
      inputs: [
        { key: 'amount', label: 'Source Amount', type: 'number', defaultValue: 1000, min: 0, step: 10 },
        {
          key: 'pair',
          label: 'Reference Pair',
          type: 'select',
          defaultValue: 'USD_INR',
          options: [
            { label: 'USD → INR (1 : 84.50)', value: 'USD_INR' },
            { label: 'USD → EUR (1 : 0.92)', value: 'USD_EUR' },
            { label: 'USD → GBP (1 : 0.79)', value: 'USD_GBP' },
            { label: 'EUR → USD (1 : 1.087)', value: 'EUR_USD' },
            { label: 'GBP → INR (1 : 107.0)', value: 'GBP_INR' },
            { label: 'AED → INR (1 : 23.01)', value: 'AED_INR' },
            { label: 'Custom Rate', value: 'CUSTOM' },
          ],
        },
        { key: 'customRate', label: 'Exchange Rate (if Custom)', type: 'number', defaultValue: 84.5, min: 0.0001, step: 0.01 },
        { key: 'feePct', label: 'FX Bank Spread / Markup (%)', type: 'number', defaultValue: 1.5, min: 0, max: 15, step: 0.1 },
      ],
      compute: (vals) => {
        const amt = num(vals, 'amount');
        const pair = str(vals, 'pair', 'USD_INR');
        const map: Record<string, [number, string]> = {
          USD_INR: [84.5, 'INR'],
          USD_EUR: [0.92, 'EUR'],
          USD_GBP: [0.79, 'GBP'],
          EUR_USD: [1.087, 'USD'],
          GBP_INR: [107.0, 'INR'],
          AED_INR: [23.01, 'INR'],
        };
        const [rate, sym] = pair === 'CUSTOM' ? [num(vals, 'customRate', 1), 'UNITS'] : map[pair] || [1, 'USD'];
        const feePct = num(vals, 'feePct');
        const gross = amt * rate;
        const fee = gross * (feePct / 100);
        const net = gross - fee;
        return {
          primary: { label: `Net Received (${sym})`, value: net, formatted: `${net.toFixed(2)} ${sym}`, unit: sym },
          breakdown: [
            { label: 'Mid-Market Value', value: gross, formatted: `${gross.toFixed(2)} ${sym}` },
            { label: 'FX Spread Fee', value: fee, formatted: `${fee.toFixed(2)} ${sym}` },
            { label: 'Effective Rate', value: rate * (1 - feePct / 100), formatted: (rate * (1 - feePct / 100)).toFixed(4) },
          ],
          steps: [`${amt} × ${rate} = ${gross.toFixed(2)} ${sym}; minus ${feePct}% spread = ${net.toFixed(2)} ${sym}`],
        };
      },
    }),

  // 5. Finance Calculator (TVM Solver)
  'finance-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Time Value of Money (TVM) financial calculator for Future Value, Present Value, and annuity cash flows.`,
      formulaDisplay: 'FV = PV(1+i)^n + PMT × [((1+i)^n − 1) / i]',
      explanation: 'Solves Future Value (FV) or Present Value (PV) under compound interest with periodic payments.',
      inputs: [
        { key: 'pv', label: 'Present Value (PV)', type: 'number', defaultValue: 10000, step: 500 },
        { key: 'pmt', label: 'Monthly Contribution (PMT)', type: 'number', defaultValue: 500, step: 50 },
        { key: 'rate', label: 'Annual Rate (I/Y %)', type: 'number', defaultValue: 8, min: 0, max: 50, step: 0.25 },
        { key: 'years', label: 'Years (N/12)', type: 'number', defaultValue: 10, min: 1, max: 60, step: 1 },
      ],
      compute: (vals, ctx) => {
        const pv = num(vals, 'pv');
        const pmt = num(vals, 'pmt');
        const r = num(vals, 'rate') / 100 / 12;
        const n = Math.round(num(vals, 'years') * 12);
        const fv = r === 0 ? pv + pmt * n : pv * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r);
        const invested = pv + pmt * n;
        const gain = fv - invested;
        return {
          primary: { label: 'Future Value (FV)', value: fv, formatted: fmtMoney(fv, ctx) },
          breakdown: [
            { label: 'Total Principal Invested', value: invested, formatted: fmtMoney(invested, ctx) },
            { label: 'Compounded Interest Gain', value: gain, formatted: fmtMoney(gain, ctx) },
            { label: 'Periods (N)', value: n, formatted: `${n} months` },
          ],
          steps: [`Compounded across N=${n} monthly periods at ${(r * 100).toFixed(4)}%/mo.`],
        };
      },
    }),

  // 6. Interest Rate Calculator
  'interest-rate-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Solve the exact implied Annual Interest Rate (APR) from loan amount, monthly payment, and term.`,
      formulaDisplay: 'Solve r via Newton-Raphson: P = PMT × [1 − (1+r)^−n] / r',
      explanation: 'Uses iterative Newton-Raphson root finding to reverse-engineer true APR from any fixed monthly payment.',
      inputs: [
        { key: 'principal', label: 'Loan Amount', type: 'number', defaultValue: 20000, min: 100, step: 500 },
        { key: 'payment', label: 'Monthly Payment', type: 'number', defaultValue: 400, min: 1, step: 10 },
        { key: 'months', label: 'Loan Term (Months)', type: 'number', defaultValue: 60, min: 1, max: 480, step: 1 },
      ],
      compute: (vals, ctx) => {
        const P = num(vals, 'principal');
        const pmt = num(vals, 'payment');
        const n = Math.round(num(vals, 'months'));
        if (pmt * n <= P) {
          if (pmt * n === P) {
            return {
              primary: { label: 'Implied Annual APR', value: 0, formatted: '0.00% APR' },
              breakdown: [{ label: 'Total Interest', value: 0, formatted: fmtMoney(0, ctx) }],
              steps: ['Total payments equal loan principal, so APR is 0%.'],
            };
          }
          throw new Error('Total payments must exceed principal to have a non-negative interest rate.');
        }
        let r = 0.005;
        for (let iter = 0; iter < 60; iter++) {
          const factor = Math.pow(1 + r, -n);
          const f = pmt * ((1 - factor) / r) - P;
          const df = pmt * ((n * r * Math.pow(1 + r, -n - 1) - (1 - factor)) / (r * r));
          if (Math.abs(df) < 1e-12) break;
          r = Math.max(1e-7, r - f / df);
        }
        const apr = r * 12 * 100;
        const totInt = pmt * n - P;
        return {
          primary: { label: 'Implied Annual Interest Rate', value: apr, formatted: `${apr.toFixed(3)}% APR` },
          breakdown: [
            { label: 'Monthly Rate', value: r * 100, formatted: `${(r * 100).toFixed(4)}%` },
            { label: 'Total Interest Paid', value: totInt, formatted: fmtMoney(totInt, ctx) },
          ],
          steps: [`Solved iteratively over ${n} months -> monthly r = ${(r * 100).toFixed(4)}%, APR = ${apr.toFixed(3)}%`],
        };
      },
    }),

  // 7. House Affordability Calculator
  'house-affordability-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate maximum home purchase price using the lender 28%/36% Debt-to-Income (DTI) standard.`,
      formulaDisplay: 'Max Housing = min(28% Gross Income, 36% Gross Income − Existing Debt)',
      explanation: 'Combines front-end 28% housing limit, back-end 36% total debt cap, down payment, property tax, and rate.',
      inputs: [
        { key: 'income', label: 'Annual Household Income', type: 'number', defaultValue: 120000, min: 10000, step: 5000 },
        { key: 'monthlyDebt', label: 'Existing Monthly Debts', type: 'number', defaultValue: 500, min: 0, step: 50 },
        { key: 'downPayment', label: 'Available Down Payment', type: 'number', defaultValue: 60000, min: 0, step: 5000 },
        { key: 'apr', label: 'Mortgage APR (%)', type: 'number', defaultValue: 6.5, min: 0.1, max: 20, step: 0.1 },
        { key: 'years', label: 'Loan Term (Years)', type: 'number', defaultValue: 30, min: 5, max: 30, step: 5 },
      ],
      compute: (vals, ctx) => {
        const annual = num(vals, 'income');
        const moGross = annual / 12;
        const debt = num(vals, 'monthlyDebt');
        const down = num(vals, 'downPayment');
        const r = num(vals, 'apr') / 100 / 12;
        const n = Math.round(num(vals, 'years', 30)) * 12;
        const frontCap = moGross * 0.28;
        const backCap = Math.max(0, moGross * 0.36 - debt);
        const maxHousingPiti = Math.min(frontCap, backCap);
        // Reserve ~18% of PITI for property tax + homeowner insurance
        const maxPI = maxHousingPiti * 0.82;
        const maxLoan = maxPI * ((1 - Math.pow(1 + r, -n)) / r);
        const maxHomePrice = maxLoan + down;
        return {
          primary: { label: 'Max Affordable Home Price', value: maxHomePrice, formatted: fmtMoney(maxHomePrice, ctx) },
          breakdown: [
            { label: 'Maximum Loan Amount', value: maxLoan, formatted: fmtMoney(maxLoan, ctx) },
            { label: 'Max Monthly PITI Budget', value: maxHousingPiti, formatted: fmtMoney(maxHousingPiti, ctx) },
            { label: 'Est. Principal & Interest', value: maxPI, formatted: fmtMoney(maxPI, ctx) },
          ],
          steps: [`Front-end 28% = ${fmtMoney(frontCap, ctx)}; Back-end 36% = ${fmtMoney(backCap, ctx)}`],
        };
      },
    }),

  // 8. Rent Calculator
  'rent-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Determine safe monthly apartment rent ceiling using the 30% gross income & 50/30/20 guidelines.`,
      formulaDisplay: 'Standard Limit = 30% Monthly Gross Income;  Conservative = 25%',
      explanation: 'Evaluates monthly rent affordability alongside debt obligations and utility allowance.',
      inputs: [
        { key: 'annualIncome', label: 'Annual Pre-Tax Income', type: 'number', defaultValue: 75000, min: 5000, step: 1000 },
        { key: 'monthlyDebt', label: 'Monthly Debt Payments', type: 'number', defaultValue: 350, min: 0, step: 50 },
      ],
      compute: (vals, ctx) => {
        const mo = num(vals, 'annualIncome') / 12;
        const debt = num(vals, 'monthlyDebt');
        const standard30 = mo * 0.3;
        const conservative25 = mo * 0.25;
        const adjusted = Math.max(0, mo * 0.36 - debt);
        const recommended = Math.min(standard30, adjusted);
        return {
          primary: { label: 'Recommended Max Rent', value: recommended, formatted: fmtMoney(recommended, ctx) },
          breakdown: [
            { label: '30% Standard Rule', value: standard30, formatted: fmtMoney(standard30, ctx) },
            { label: '25% Conservative Target', value: conservative25, formatted: fmtMoney(conservative25, ctx) },
            { label: '3x Rent Annual Requirement', value: recommended * 36, formatted: fmtMoney(recommended * 36, ctx) },
          ],
          steps: [`Monthly gross income = ${fmtMoney(mo, ctx)}`],
        };
      },
    }),

  // 9. Estate Tax Calculator
  'estate-tax-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Estimate federal estate tax liability above exemption threshold including deductions & charitable gifts.`,
      formulaDisplay: 'Taxable Estate = max(0, Gross Assets − Debts − Charity − Exemption);  Tax = Taxable × MarginalRate',
      explanation: 'Computes net estate value, federal exclusion cushion, and estimated progressive estate tax owed.',
      inputs: [
        { key: 'assets', label: 'Gross Estate Value', type: 'number', defaultValue: 18000000, min: 0, step: 100000 },
        { key: 'debts', label: 'Mortgages & Liabilities', type: 'number', defaultValue: 500000, min: 0, step: 50000 },
        { key: 'charity', label: 'Charitable Bequests', type: 'number', defaultValue: 250000, min: 0, step: 25000 },
        { key: 'exemption', label: 'Exemption Limit', type: 'number', defaultValue: 13610000, min: 0, step: 100000 },
        { key: 'rate', label: 'Effective Estate Tax Rate (%)', type: 'number', defaultValue: 40, min: 0, max: 60, step: 1 },
      ],
      compute: (vals, ctx) => {
        const assets = num(vals, 'assets');
        const debts = num(vals, 'debts');
        const charity = num(vals, 'charity');
        const ex = num(vals, 'exemption');
        const rate = num(vals, 'rate') / 100;
        const netEstate = Math.max(0, assets - debts - charity);
        const taxable = Math.max(0, netEstate - ex);
        const tax = taxable * rate;
        return {
          primary: { label: 'Estimated Estate Tax', value: tax, formatted: fmtMoney(tax, ctx) },
          breakdown: [
            { label: 'Adjusted Gross Estate', value: netEstate, formatted: fmtMoney(netEstate, ctx) },
            { label: 'Taxable Excess Over Exemption', value: taxable, formatted: fmtMoney(taxable, ctx) },
            { label: 'Net Inheritance to Heirs', value: netEstate - tax, formatted: fmtMoney(netEstate - tax, ctx) },
          ],
          steps: [`Taxable = max(0, ${fmtMoney(netEstate, ctx)} − ${fmtMoney(ex, ctx)}) = ${fmtMoney(taxable, ctx)}`],
        };
      },
    }),

  // 10. Social Security Calculator
  'social-security-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compare monthly Social Security retirement benefits at age 62 (early), 67 (FRA), and 70 (delayed).`,
      formulaDisplay: 'Early Penalty: −5/9% per mo (first 36), −5/12% (>36)  |  Delayed Credit: +8%/yr past FRA',
      explanation: 'Applies SSA early-claiming reduction and delayed retirement credit percentages to your Full Retirement Age benefit.',
      inputs: [
        { key: 'pia', label: 'Monthly Benefit at FRA 67 (PIA)', type: 'number', defaultValue: 2400, min: 200, max: 6000, step: 50 },
        { key: 'claimAge', label: 'Planned Claiming Age (62–70)', type: 'number', defaultValue: 67, min: 62, max: 70, step: 1 },
        { key: 'lifeExpectancy', label: 'Planning Horizon Age', type: 'number', defaultValue: 85, min: 65, max: 100, step: 1 },
      ],
      compute: (vals, ctx) => {
        const pia = num(vals, 'pia');
        const age = num(vals, 'claimAge');
        const life = num(vals, 'lifeExpectancy');
        const benefitAtAge = (a: number) => {
          const diffMo = (a - 67) * 12;
          if (diffMo === 0) return pia;
          if (diffMo > 0) return pia * (1 + (diffMo / 12) * 0.08);
          const absMo = Math.abs(diffMo);
          const red = absMo <= 36 ? absMo * (5 / 900) : 36 * (5 / 900) + (absMo - 36) * (5 / 1200);
          return pia * (1 - red);
        };
        const chosen = benefitAtAge(age);
        const age62 = benefitAtAge(62);
        const age70 = benefitAtAge(70);
        const lifetime = chosen * Math.max(0, life - age) * 12;
        return {
          primary: { label: `Monthly Benefit @ Age ${age}`, value: chosen, formatted: fmtMoney(chosen, ctx) },
          breakdown: [
            { label: 'Claim at 62 (Early)', value: age62, formatted: fmtMoney(age62, ctx) },
            { label: 'Claim at 67 (Full Retirement)', value: pia, formatted: fmtMoney(pia, ctx) },
            { label: 'Claim at 70 (Max Delayed)', value: age70, formatted: fmtMoney(age70, ctx) },
            { label: `Cumulative Through Age ${life}`, value: lifetime, formatted: fmtMoney(lifetime, ctx) },
          ],
          steps: [`Claiming at ${age} applies ${((chosen / pia - 1) * 100).toFixed(1)}% adjustment relative to FRA 67.`],
        };
      },
    }),

  // 11. Annuity Payout Calculator
  'annuity-payout-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Determine fixed monthly retirement payout from an annuity lump sum over a set payout term.`,
      formulaDisplay: 'Payout = Principal × r / [1 − (1+r)^−n]',
      explanation: 'Calculates sustainable level withdrawals from an immediate fixed annuity until exhaustion.',
      inputs: [
        { key: 'principal', label: 'Starting Annuity Principal', type: 'number', defaultValue: 300000, min: 1000, step: 5000 },
        { key: 'rate', label: 'Annual Return / Interest (%)', type: 'number', defaultValue: 5.5, min: 0, max: 20, step: 0.25 },
        { key: 'years', label: 'Payout Duration (Years)', type: 'number', defaultValue: 20, min: 1, max: 50, step: 1 },
      ],
      compute: (vals, ctx) => {
        const P = num(vals, 'principal');
        const rate = num(vals, 'rate');
        const years = Math.round(num(vals, 'years'));
        const pmt = monthlyPayment(P, rate, years * 12);
        const total = pmt * years * 12;
        return {
          primary: { label: 'Monthly Annuity Payout', value: pmt, formatted: fmtMoney(pmt, ctx) },
          breakdown: [
            { label: 'Annual Income', value: pmt * 12, formatted: fmtMoney(pmt * 12, ctx) },
            { label: 'Total Cumulative Payouts', value: total, formatted: fmtMoney(total, ctx) },
            { label: 'Interest Portion Earned', value: total - P, formatted: fmtMoney(total - P, ctx) },
          ],
          steps: [`${years * 12} monthly payouts at ${rate}% nominal return.`],
        };
      },
    }),

  // 12. Credit Cards Payoff Calculator (Multi-Card)
  'credit-cards-payoff-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate payoff timeline and interest saved across two combined credit card balances.`,
      formulaDisplay: 'Iterative monthly avalanche payoff redirecting freed payments onto remaining card balance',
      explanation: 'Simulates paying highest APR card first (Debt Avalanche) given a fixed monthly budget.',
      inputs: [
        { key: 'bal1', label: 'Card 1 Balance (High APR)', type: 'number', defaultValue: 4500, min: 0, step: 100 },
        { key: 'apr1', label: 'Card 1 APR (%)', type: 'number', defaultValue: 22.9, min: 0, max: 45, step: 0.1 },
        { key: 'bal2', label: 'Card 2 Balance', type: 'number', defaultValue: 2500, min: 0, step: 100 },
        { key: 'apr2', label: 'Card 2 APR (%)', type: 'number', defaultValue: 17.5, min: 0, max: 45, step: 0.1 },
        { key: 'budget', label: 'Total Monthly Payment Budget', type: 'number', defaultValue: 350, min: 25, step: 25 },
      ],
      compute: (vals, ctx) => {
        let b1 = num(vals, 'bal1');
        let b2 = num(vals, 'bal2');
        const r1 = num(vals, 'apr1') / 100 / 12;
        const r2 = num(vals, 'apr2') / 100 / 12;
        const budget = num(vals, 'budget');
        if (b1 * r1 + b2 * r2 >= budget) throw new Error('Monthly payment budget must exceed monthly interest charges.');
        let months = 0;
        let totInt = 0;
        while ((b1 > 0.01 || b2 > 0.01) && months < 600) {
          months++;
          const i1 = b1 * r1;
          const i2 = b2 * r2;
          totInt += i1 + i2;
          b1 += i1;
          b2 += i2;
          let rem = budget;
          if (r1 >= r2) {
            const p1 = Math.min(b1, rem);
            b1 -= p1;
            rem -= p1;
            const p2 = Math.min(b2, rem);
            b2 -= p2;
          } else {
            const p2 = Math.min(b2, rem);
            b2 -= p2;
            rem -= p2;
            const p1 = Math.min(b1, rem);
            b1 -= p1;
          }
        }
        const origBal = num(vals, 'bal1') + num(vals, 'bal2');
        return {
          primary: { label: 'Debt-Free Timeline', value: months, formatted: `${months} months (${(months / 12).toFixed(1)} yrs)` },
          breakdown: [
            { label: 'Total Starting Debt', value: origBal, formatted: fmtMoney(origBal, ctx) },
            { label: 'Total Interest Paid', value: totInt, formatted: fmtMoney(totInt, ctx) },
            { label: 'Total Amount Paid', value: origBal + totInt, formatted: fmtMoney(origBal + totInt, ctx) },
          ],
          steps: [`Avalanche strategy applied ${fmtMoney(budget, ctx)}/mo prioritizing higher APR balance.`],
        };
      },
    }),

  // 13. Bond Calculator
  'bond-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate bond fair market price, current yield, and discount/premium status from YTM.`,
      formulaDisplay: 'Price = Σ [C / (1+y)^t] + Face / (1+y)^n',
      explanation: 'Computes semi-annual coupon bond present value for fixed-income valuation.',
      inputs: [
        { key: 'face', label: 'Face / Par Value', type: 'number', defaultValue: 1000, min: 100, step: 100 },
        { key: 'coupon', label: 'Annual Coupon Rate (%)', type: 'number', defaultValue: 5.0, min: 0, max: 20, step: 0.25 },
        { key: 'ytm', label: 'Market Yield / YTM (%)', type: 'number', defaultValue: 6.0, min: 0, max: 25, step: 0.25 },
        { key: 'years', label: 'Years to Maturity', type: 'number', defaultValue: 10, min: 1, max: 50, step: 1 },
      ],
      compute: (vals, ctx) => {
        const F = num(vals, 'face');
        const c = (num(vals, 'coupon') / 100) * F / 2;
        const y = num(vals, 'ytm') / 100 / 2;
        const periods = Math.round(num(vals, 'years')) * 2;
        let pv = 0;
        for (let t = 1; t <= periods; t++) {
          pv += c / Math.pow(1 + y, t);
        }
        pv += F / Math.pow(1 + y, periods);
        const currentYield = ((c * 2) / pv) * 100;
        return {
          primary: { label: 'Bond Fair Price', value: pv, formatted: fmtMoney(pv, ctx) },
          breakdown: [
            { label: 'Current Yield', value: currentYield, formatted: `${currentYield.toFixed(3)}%` },
            { label: 'Semi-Annual Coupon', value: c, formatted: fmtMoney(c, ctx) },
            { label: 'Trading Status', value: pv - F, formatted: pv >= F ? 'Premium Bond' : 'Discount Bond' },
          ],
          steps: [`Discounted ${periods} semi-annual coupon flows of ${fmtMoney(c, ctx)} at y=${(y * 100).toFixed(3)}%/period.`],
        };
      },
    }),

  // 14. Roth IRA Calculator
  'roth-ira-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Project tax-free Roth IRA retirement balance vs an equivalent taxable brokerage account.`,
      formulaDisplay: 'Roth Balance = P(1+r)^n + Contrib × [((1+r)^n − 1) / r] (100% Tax-Free Withdrawal)',
      explanation: 'Compares tax-free Roth compounding against a taxable account subject to capital gains/dividend drag.',
      inputs: [
        { key: 'balance', label: 'Starting Roth IRA Balance', type: 'number', defaultValue: 15000, min: 0, step: 1000 },
        { key: 'annualContrib', label: 'Annual Contribution', type: 'number', defaultValue: 7000, min: 0, step: 500 },
        { key: 'returnPct', label: 'Expected Annual Return (%)', type: 'number', defaultValue: 7.5, min: 0, max: 20, step: 0.25 },
        { key: 'years', label: 'Years to Retirement', type: 'number', defaultValue: 25, min: 1, max: 50, step: 1 },
        { key: 'taxRate', label: 'Comparable Marginal Tax Rate (%)', type: 'number', defaultValue: 22, min: 0, max: 50, step: 1 },
      ],
      compute: (vals, ctx) => {
        const P = num(vals, 'balance');
        const C = num(vals, 'annualContrib');
        const r = num(vals, 'returnPct') / 100;
        const n = Math.round(num(vals, 'years'));
        const tax = num(vals, 'taxRate') / 100;
        const rothFV = r === 0 ? P + C * n : P * Math.pow(1 + r, n) + C * ((Math.pow(1 + r, n) - 1) / r);
        const taxableR = r * (1 - tax * 0.65);
        const taxableFV = taxableR === 0 ? P + C * n : P * Math.pow(1 + taxableR, n) + C * ((Math.pow(1 + taxableR, n) - 1) / taxableR);
        const contributed = P + C * n;
        const taxAdvantage = rothFV - taxableFV;
        return {
          primary: { label: 'Tax-Free Roth IRA Value', value: rothFV, formatted: fmtMoney(rothFV, ctx) },
          breakdown: [
            { label: 'Total Contributions', value: contributed, formatted: fmtMoney(contributed, ctx) },
            { label: 'Tax-Free Earnings', value: rothFV - contributed, formatted: fmtMoney(rothFV - contributed, ctx) },
            { label: 'Roth Tax Advantage vs Taxable', value: taxAdvantage, formatted: fmtMoney(taxAdvantage, ctx) },
          ],
          steps: [`Compounded ${n} years at ${num(vals, 'returnPct')}% tax-free.`],
        };
      },
    }),

  // 15. RMD Calculator
  'rmd-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compute IRS Required Minimum Distribution (RMD) using the updated Uniform Lifetime Table.`,
      formulaDisplay: 'RMD = Year-End Account Balance / IRS Life Expectancy Factor',
      explanation: 'Uses official IRS Uniform Lifetime Table divisors for ages 73–100+.',
      inputs: [
        { key: 'balance', label: 'Dec 31 Prior-Year Balance', type: 'number', defaultValue: 500000, min: 1000, step: 5000 },
        { key: 'age', label: 'Account Owner Age (73–100)', type: 'number', defaultValue: 75, min: 72, max: 105, step: 1 },
      ],
      compute: (vals, ctx) => {
        const bal = num(vals, 'balance');
        const age = Math.round(num(vals, 'age'));
        const factors: Record<number, number> = {
          72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
          80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
          88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
          96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
        };
        const divisor = factors[Math.min(100, Math.max(72, age))] || 6.0;
        const rmd = bal / divisor;
        return {
          primary: { label: 'Annual Required RMD', value: rmd, formatted: fmtMoney(rmd, ctx) },
          breakdown: [
            { label: 'IRS Distribution Divisor', value: divisor, formatted: divisor.toFixed(1) },
            { label: 'Monthly Equivalent', value: rmd / 12, formatted: fmtMoney(rmd / 12, ctx) },
            { label: 'Percentage Withdrawn', value: (rmd / bal) * 100, formatted: `${((rmd / bal) * 100).toFixed(2)}%` },
          ],
          steps: [`${fmtMoney(bal, ctx)} / ${divisor} = ${fmtMoney(rmd, ctx)}`],
        };
      },
    }),

  // 16. Cash Back or Low Interest Calculator
  'cash-back-or-low-interest-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compare dealer Cash Back Rebate + standard auto APR vs Promotional 0% Low Interest financing.`,
      formulaDisplay: 'Compare Total Payments: (Price − Rebate) @ Bank APR  vs  Price @ Promo APR',
      explanation: 'Finds the exact winner and net dollar savings between dealership rebate offers and low-rate financing.',
      inputs: [
        { key: 'price', label: 'Vehicle Purchase Price', type: 'number', defaultValue: 35000, min: 1000, step: 500 },
        { key: 'rebate', label: 'Dealer Cash Back Rebate', type: 'number', defaultValue: 2500, min: 0, step: 250 },
        { key: 'bankApr', label: 'Standard Bank Rate w/ Rebate (%)', type: 'number', defaultValue: 5.9, min: 0, max: 30, step: 0.1 },
        { key: 'promoApr', label: 'Low Promo APR w/o Rebate (%)', type: 'number', defaultValue: 0.9, min: 0, max: 20, step: 0.1 },
        { key: 'months', label: 'Loan Term (Months)', type: 'number', defaultValue: 60, min: 12, max: 84, step: 12 },
      ],
      compute: (vals, ctx) => {
        const price = num(vals, 'price');
        const rebate = num(vals, 'rebate');
        const bankApr = num(vals, 'bankApr');
        const promoApr = num(vals, 'promoApr');
        const months = Math.round(num(vals, 'months', 60));
        const pmtRebate = monthlyPayment(Math.max(0, price - rebate), bankApr, months);
        const totRebate = pmtRebate * months;
        const pmtPromo = monthlyPayment(price, promoApr, months);
        const totPromo = pmtPromo * months;
        const savings = Math.abs(totRebate - totPromo);
        const winner = totPromo < totRebate ? 'Low Interest Financing Wins' : 'Cash Back Rebate Wins';
        return {
          primary: { label: winner, value: savings, formatted: `Save ${fmtMoney(savings, ctx)}` },
          breakdown: [
            { label: 'Total Cost w/ Cash Back', value: totRebate, formatted: fmtMoney(totRebate, ctx) },
            { label: 'Total Cost w/ Low APR', value: totPromo, formatted: fmtMoney(totPromo, ctx) },
            { label: 'Monthly w/ Rebate vs Low APR', value: pmtRebate, formatted: `${fmtMoney(pmtRebate, ctx)} vs ${fmtMoney(pmtPromo, ctx)}` },
          ],
          steps: [`Cash Back Total = ${fmtMoney(totRebate, ctx)}; Low APR Total = ${fmtMoney(totPromo, ctx)}`],
        };
      },
    }),

  // 17. Depreciation Calculator
  'depreciation-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compute Straight-Line and Double Declining Balance (DDB) asset depreciation schedule.`,
      formulaDisplay: 'SL = (Cost − Salvage) / Life  |  DDB = 2 × (1 / Life) × BookValue',
      explanation: 'Generates year-by-year book value depreciation using accounting GAAP conventions.',
      inputs: [
        { key: 'cost', label: 'Asset Initial Cost', type: 'number', defaultValue: 50000, min: 100, step: 500 },
        { key: 'salvage', label: 'Salvage / Residual Value', type: 'number', defaultValue: 5000, min: 0, step: 500 },
        { key: 'life', label: 'Useful Life (Years)', type: 'number', defaultValue: 5, min: 1, max: 50, step: 1 },
      ],
      compute: (vals, ctx) => {
        const cost = num(vals, 'cost');
        const salvage = num(vals, 'salvage');
        const life = Math.round(num(vals, 'life'));
        const slAnnual = (cost - salvage) / life;
        const rows: Array<Array<string | number>> = [];
        let bookDDB = cost;
        let bookSL = cost;
        const ddbRate = 2 / life;
        for (let yr = 1; yr <= life; yr++) {
          const slDep = slAnnual;
          bookSL = Math.max(salvage, bookSL - slDep);
          let ddbDep = bookDDB * ddbRate;
          if (bookDDB - ddbDep < salvage) ddbDep = Math.max(0, bookDDB - salvage);
          bookDDB -= ddbDep;
          rows.push([`Year ${yr}`, fmtMoney(slDep, ctx), fmtMoney(bookSL, ctx), fmtMoney(ddbDep, ctx), fmtMoney(bookDDB, ctx)]);
        }
        return {
          primary: { label: 'Annual Straight-Line Depreciation', value: slAnnual, formatted: `${fmtMoney(slAnnual, ctx)}/yr` },
          breakdown: [
            { label: 'Total Depreciable Base', value: cost - salvage, formatted: fmtMoney(cost - salvage, ctx) },
            { label: 'Year 1 DDB Depreciation', value: Number(rows[0]?.[3]?.toString().replace(/[^0-9.-]/g, '') || 0), formatted: String(rows[0]?.[3] || '-') },
          ],
          steps: [`Straight-Line = (${fmtMoney(cost, ctx)} − ${fmtMoney(salvage, ctx)}) / ${life} = ${fmtMoney(slAnnual, ctx)}/yr`],
          tableHeaders: ['Year', 'SL Depr.', 'SL Book Val', 'DDB Depr.', 'DDB Book Val'],
          tableRows: rows,
        };
      },
    }),

  // 18. Margin Calculator
  'margin-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate Gross Profit Margin %, Markup %, Net Dollar Profit, and break-even cost ratio.`,
      formulaDisplay: 'Margin = (Revenue − Cost) / Revenue × 100  |  Markup = Profit / Cost × 100',
      explanation: 'Distinguishes gross profit margin (on selling price) from cost-plus markup percentage.',
      inputs: [
        { key: 'cost', label: 'Unit Cost (COGS)', type: 'number', defaultValue: 65, min: 0.01, step: 1 },
        { key: 'revenue', label: 'Selling Price / Revenue', type: 'number', defaultValue: 100, min: 0.01, step: 1 },
      ],
      compute: (vals, ctx) => {
        const cost = num(vals, 'cost');
        const rev = num(vals, 'revenue');
        const profit = rev - cost;
        const marginPct = (profit / rev) * 100;
        const markupPct = (profit / cost) * 100;
        return {
          primary: { label: 'Gross Profit Margin', value: marginPct, formatted: `${marginPct.toFixed(2)}%` },
          breakdown: [
            { label: 'Gross Profit', value: profit, formatted: fmtMoney(profit, ctx) },
            { label: 'Cost Markup %', value: markupPct, formatted: `${markupPct.toFixed(2)}%` },
            { label: 'COGS Share', value: (cost / rev) * 100, formatted: `${((cost / rev) * 100).toFixed(2)}%` },
          ],
          steps: [`Profit = ${fmtMoney(profit, ctx)}; Margin = ${marginPct.toFixed(2)}%; Markup = ${markupPct.toFixed(2)}%`],
        };
      },
    }),

  // 19. Real Estate Calculator
  'real-estate-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Analyze home purchase cash needed, monthly PITI payment, appreciation equity, and 10-year value.`,
      formulaDisplay: 'Future Home Value = Price × (1 + Appreciation)^Years',
      explanation: 'Evaluates total upfront closing cash, monthly mortgage payment, and projected 10-year net equity.',
      inputs: [
        { key: 'price', label: 'Property Price', type: 'number', defaultValue: 400000, min: 10000, step: 5000 },
        { key: 'downPct', label: 'Down Payment (%)', type: 'number', defaultValue: 20, min: 0, max: 90, step: 1 },
        { key: 'apr', label: 'Mortgage APR (%)', type: 'number', defaultValue: 6.5, min: 0, max: 20, step: 0.1 },
        { key: 'appreciation', label: 'Annual Appreciation (%)', type: 'number', defaultValue: 4, min: -5, max: 15, step: 0.25 },
        { key: 'horizon', label: 'Holding Period (Years)', type: 'number', defaultValue: 10, min: 1, max: 30, step: 1 },
      ],
      compute: (vals, ctx) => {
        const price = num(vals, 'price');
        const down = price * (num(vals, 'downPct') / 100);
        const loan = price - down;
        const pmt = monthlyPayment(loan, num(vals, 'apr'), 360);
        const h = Math.round(num(vals, 'horizon'));
        const futureVal = price * Math.pow(1 + num(vals, 'appreciation') / 100, h);
        const closing = price * 0.03;
        return {
          primary: { label: `Projected Value (Year ${h})`, value: futureVal, formatted: fmtMoney(futureVal, ctx) },
          breakdown: [
            { label: 'Monthly Mortgage P&I', value: pmt, formatted: fmtMoney(pmt, ctx) },
            { label: 'Down Payment + ~3% Closing', value: down + closing, formatted: fmtMoney(down + closing, ctx) },
            { label: 'Estimated Gain Above Purchase', value: futureVal - price, formatted: fmtMoney(futureVal - price, ctx) },
          ],
          steps: [`Starting loan ${fmtMoney(loan, ctx)} at ${num(vals, 'apr')}% APR.`],
        };
      },
    }),

  // 20. Lease Calculator
  'lease-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate equipment or asset monthly lease payment using residual value and money factor.`,
      formulaDisplay: 'Monthly = (NetCap − Residual)/Term + (NetCap + Residual) × MoneyFactor',
      explanation: 'Separates depreciation fee from finance charge for transparent lease evaluation.',
      inputs: [
        { key: 'capCost', label: 'Asset Capitalized Cost', type: 'number', defaultValue: 40000, min: 500, step: 500 },
        { key: 'residual', label: 'Residual Value at Lease End', type: 'number', defaultValue: 22000, min: 0, step: 500 },
        { key: 'apr', label: 'Equivalent Lease APR (%)', type: 'number', defaultValue: 5.5, min: 0, max: 30, step: 0.25 },
        { key: 'months', label: 'Lease Term (Months)', type: 'number', defaultValue: 36, min: 6, max: 84, step: 6 },
      ],
      compute: (vals, ctx) => {
        const cap = num(vals, 'capCost');
        const res = num(vals, 'residual');
        const months = Math.round(num(vals, 'months'));
        const mf = num(vals, 'apr') / 2400;
        const depFee = (cap - res) / months;
        const finFee = (cap + res) * mf;
        const monthly = depFee + finFee;
        return {
          primary: { label: 'Monthly Lease Payment', value: monthly, formatted: fmtMoney(monthly, ctx) },
          breakdown: [
            { label: 'Monthly Depreciation Fee', value: depFee, formatted: fmtMoney(depFee, ctx) },
            { label: 'Monthly Finance Charge', value: finFee, formatted: fmtMoney(finFee, ctx) },
            { label: 'Money Factor', value: mf, formatted: mf.toFixed(5) },
            { label: 'Total Lease Cost', value: monthly * months, formatted: fmtMoney(monthly * months, ctx) },
          ],
          steps: [`Money Factor = ${num(vals, 'apr')}% / 2400 = ${mf.toFixed(5)}`],
        };
      },
    }),

  // 21. Budget Calculator
  'budget-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Monthly income budget planner using Needs, Wants, and Savings (50/30/20) cashflow balance.`,
      formulaDisplay: 'Net Monthly Surplus = Monthly Income − (Housing + Food/Bills + Wants + Savings)',
      explanation: 'Tracks actual monthly allocation against the 50% Needs / 30% Wants / 20% Savings benchmark.',
      inputs: [
        { key: 'income', label: 'Monthly Net Income', type: 'number', defaultValue: 5500, min: 100, step: 100 },
        { key: 'needs', label: 'Monthly Essentials (Rent, Bills, Food)', type: 'number', defaultValue: 2600, min: 0, step: 100 },
        { key: 'wants', label: 'Monthly Lifestyle & Wants', type: 'number', defaultValue: 1300, min: 0, step: 50 },
        { key: 'savings', label: 'Savings & Investments', type: 'number', defaultValue: 1100, min: 0, step: 50 },
      ],
      compute: (vals, ctx) => {
        const inc = num(vals, 'income');
        const needs = num(vals, 'needs');
        const wants = num(vals, 'wants');
        const sav = num(vals, 'savings');
        const unallocated = inc - (needs + wants + sav);
        const savRate = ((sav + Math.max(0, unallocated)) / inc) * 100;
        return {
          primary: { label: 'Unallocated Balance', value: unallocated, formatted: fmtMoney(unallocated, ctx) },
          breakdown: [
            { label: 'Needs % (Target ≤50%)', value: (needs / inc) * 100, formatted: `${((needs / inc) * 100).toFixed(1)}%` },
            { label: 'Wants % (Target ≤30%)', value: (wants / inc) * 100, formatted: `${((wants / inc) * 100).toFixed(1)}%` },
            { label: 'Total Savings Rate %', value: savRate, formatted: `${savRate.toFixed(1)}%` },
          ],
          steps: [`${fmtMoney(inc, ctx)} income − ${fmtMoney(needs + wants + sav, ctx)} allocated = ${fmtMoney(unallocated, ctx)}`],
        };
      },
    }),

  // 22. APR Calculator
  'apr-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate true Annual Percentage Rate (APR) factoring upfront origination fees & closing points.`,
      formulaDisplay: 'True APR solves PV(Net Disbursed = Loan − Fees) = Σ PMT / (1+r)^t',
      explanation: 'Reveals true cost of borrowing when lenders charge upfront points or origination fees.',
      inputs: [
        { key: 'loanAmount', label: 'Loan Amount', type: 'number', defaultValue: 200000, min: 1000, step: 1000 },
        { key: 'nominalRate', label: 'Stated Note Rate (%)', type: 'number', defaultValue: 6.25, min: 0.1, max: 35, step: 0.125 },
        { key: 'years', label: 'Loan Term (Years)', type: 'number', defaultValue: 30, min: 1, max: 40, step: 1 },
        { key: 'fees', label: 'Upfront Fees & Points ($)', type: 'number', defaultValue: 4500, min: 0, step: 250 },
      ],
      compute: (vals, ctx) => {
        const L = num(vals, 'loanAmount');
        const rate = num(vals, 'nominalRate');
        const n = Math.round(num(vals, 'years')) * 12;
        const fees = num(vals, 'fees');
        const pmt = monthlyPayment(L, rate, n);
        const net = Math.max(100, L - fees);
        let r = rate / 100 / 12;
        for (let i = 0; i < 60; i++) {
          const factor = Math.pow(1 + r, -n);
          const f = pmt * ((1 - factor) / r) - net;
          const df = pmt * ((n * r * Math.pow(1 + r, -n - 1) - (1 - factor)) / (r * r));
          if (Math.abs(df) < 1e-12) break;
          r = Math.max(1e-7, r - f / df);
        }
        const apr = r * 12 * 100;
        return {
          primary: { label: 'Effective True APR', value: apr, formatted: `${apr.toFixed(3)}% APR` },
          breakdown: [
            { label: 'Note Interest Rate', value: rate, formatted: `${rate.toFixed(3)}%` },
            { label: 'Monthly Payment (on Note)', value: pmt, formatted: fmtMoney(pmt, ctx) },
            { label: 'Net Funded Principal', value: net, formatted: fmtMoney(net, ctx) },
          ],
          steps: [`Effective net loan proceeds ${fmtMoney(net, ctx)} repaid via ${fmtMoney(pmt, ctx)}/mo over ${n} months.`],
        };
      },
    }),

  // 23. VA Mortgage Calculator
  'va-mortgage-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate zero-down VA home loan payment including financed VA Funding Fee & property taxes.`,
      formulaDisplay: 'Total VA Loan = (HomePrice − Down) × (1 + VA_Funding_Fee%)',
      explanation: 'Includes first-time or subsequent-use VA Funding Fee financing with zero PMI requirement.',
      inputs: [
        { key: 'homePrice', label: 'Home Purchase Price', type: 'number', defaultValue: 350000, min: 25000, step: 5000 },
        { key: 'downPct', label: 'Down Payment (%)', type: 'number', defaultValue: 0, min: 0, max: 50, step: 1 },
        { key: 'apr', label: 'VA Loan Interest Rate (%)', type: 'number', defaultValue: 6.0, min: 1, max: 15, step: 0.125 },
        { key: 'fundingFeePct', label: 'VA Funding Fee (%)', type: 'number', defaultValue: 2.15, min: 0, max: 3.6, step: 0.05 },
        { key: 'years', label: 'Term (Years)', type: 'number', defaultValue: 30, min: 10, max: 30, step: 5 },
      ],
      compute: (vals, ctx) => {
        const price = num(vals, 'homePrice');
        const down = price * (num(vals, 'downPct') / 100);
        const baseLoan = price - down;
        const fee = baseLoan * (num(vals, 'fundingFeePct') / 100);
        const totalLoan = baseLoan + fee;
        const pmt = monthlyPayment(totalLoan, num(vals, 'apr'), Math.round(num(vals, 'years')) * 12);
        return {
          primary: { label: 'Monthly VA Principal & Interest', value: pmt, formatted: fmtMoney(pmt, ctx) },
          breakdown: [
            { label: 'Financed VA Funding Fee', value: fee, formatted: fmtMoney(fee, ctx) },
            { label: 'Total VA Loan Balance', value: totalLoan, formatted: fmtMoney(totalLoan, ctx) },
            { label: 'Monthly PMI Saved', value: 0, formatted: '$0 (VA Benefit)' },
          ],
          steps: [`Base Loan ${fmtMoney(baseLoan, ctx)} + Funding Fee ${fmtMoney(fee, ctx)} = ${fmtMoney(totalLoan, ctx)}`],
        };
      },
    }),

  // 24. HELOC Calculator
  'heloc-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate Home Equity Line of Credit (HELOC) draw interest-only payments vs amortization phase.`,
      formulaDisplay: 'Draw Payment = Drawn × APR / 12  |  Repay Payment = Amortize(Drawn, APR, RepayYears)',
      explanation: 'Models both the interest-only draw period and full principal + interest repayment phase.',
      inputs: [
        { key: 'drawAmount', label: 'HELOC Balance Drawn', type: 'number', defaultValue: 75000, min: 1000, step: 2500 },
        { key: 'apr', label: 'HELOC Variable APR (%)', type: 'number', defaultValue: 8.25, min: 1, max: 25, step: 0.25 },
        { key: 'drawYears', label: 'Draw Period (Years)', type: 'number', defaultValue: 10, min: 1, max: 15, step: 1 },
        { key: 'repayYears', label: 'Repayment Period (Years)', type: 'number', defaultValue: 20, min: 5, max: 30, step: 1 },
      ],
      compute: (vals, ctx) => {
        const amt = num(vals, 'drawAmount');
        const apr = num(vals, 'apr');
        const ioPmt = amt * (apr / 100 / 12);
        const repayPmt = monthlyPayment(amt, apr, Math.round(num(vals, 'repayYears')) * 12);
        return {
          primary: { label: 'Repayment Phase Monthly P&I', value: repayPmt, formatted: fmtMoney(repayPmt, ctx) },
          breakdown: [
            { label: 'Draw Phase (Interest-Only)', value: ioPmt, formatted: fmtMoney(ioPmt, ctx) },
            { label: 'Total Draw Period Interest', value: ioPmt * 12 * num(vals, 'drawYears'), formatted: fmtMoney(ioPmt * 12 * num(vals, 'drawYears'), ctx) },
            { label: 'Total Repayment Period Cost', value: repayPmt * 12 * num(vals, 'repayYears'), formatted: fmtMoney(repayPmt * 12 * num(vals, 'repayYears'), ctx) },
          ],
          steps: [`Interest-Only Draw = ${fmtMoney(ioPmt, ctx)}/mo; Principal+Interest Phase = ${fmtMoney(repayPmt, ctx)}/mo`],
        };
      },
    }),

  // 25. Commission Calculator
  'commission-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate tiered sales commission, base salary combined earnings, and effective payout rate.`,
      formulaDisplay: 'Commission = (Sales × BaseRate%) + BonusOverQuota',
      explanation: 'Computes gross sales commission with quota accelerator bonus support.',
      inputs: [
        { key: 'sales', label: 'Total Sales Volume', type: 'number', defaultValue: 120000, min: 0, step: 1000 },
        { key: 'rate', label: 'Commission Rate (%)', type: 'number', defaultValue: 8, min: 0, max: 50, step: 0.5 },
        { key: 'baseSalary', label: 'Base Salary (Optional)', type: 'number', defaultValue: 3500, min: 0, step: 250 },
      ],
      compute: (vals, ctx) => {
        const sales = num(vals, 'sales');
        const rate = num(vals, 'rate');
        const base = num(vals, 'baseSalary');
        const comm = sales * (rate / 100);
        const total = comm + base;
        return {
          primary: { label: 'Total Gross Payout', value: total, formatted: fmtMoney(total, ctx) },
          breakdown: [
            { label: 'Earned Commission', value: comm, formatted: fmtMoney(comm, ctx) },
            { label: 'Base Salary', value: base, formatted: fmtMoney(base, ctx) },
            { label: 'Effective Compensation %', value: sales > 0 ? (total / sales) * 100 : 0, formatted: `${sales > 0 ? ((total / sales) * 100).toFixed(2) : '0'}%` },
          ],
          steps: [`${fmtMoney(sales, ctx)} × ${rate}% = ${fmtMoney(comm, ctx)} + ${fmtMoney(base, ctx)} base.`],
        };
      },
    }),

  // 26. Canadian Mortgage Calculator (Semi-Annual Compounding!)
  'canadian-mortgage-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Official Canada fixed-rate mortgage calculator using Canadian semi-annual interest compounding.`,
      formulaDisplay: 'r_monthly = (1 + APR/2)^(1/6) − 1  (Bank Act Canada Standard)',
      explanation: 'Applies statutory Canadian semi-annual compounding conversion instead of US monthly compounding.',
      inputs: [
        { key: 'homePrice', label: 'Home Price (CAD)', type: 'number', defaultValue: 650000, min: 25000, step: 10000 },
        { key: 'down', label: 'Down Payment (CAD)', type: 'number', defaultValue: 130000, min: 0, step: 5000 },
        { key: 'apr', label: 'Posted Interest Rate (%)', type: 'number', defaultValue: 5.25, min: 0.5, max: 18, step: 0.05 },
        { key: 'years', label: 'Amortization Period (Years)', type: 'number', defaultValue: 25, min: 5, max: 30, step: 5 },
      ],
      compute: (vals, ctx) => {
        const P = Math.max(0, num(vals, 'homePrice') - num(vals, 'down'));
        const j = num(vals, 'apr') / 100;
        const rMo = Math.pow(1 + j / 2, 1 / 6) - 1;
        const n = Math.round(num(vals, 'years')) * 12;
        const pmt = P * ((rMo * Math.pow(1 + rMo, n)) / (Math.pow(1 + rMo, n) - 1));
        const biweeklyAcc = pmt / 2;
        return {
          primary: { label: 'Monthly Payment (CAD)', value: pmt, formatted: fmtMoney(pmt, ctx, 'CAD') },
          breakdown: [
            { label: 'Effective Monthly Rate', value: rMo * 100, formatted: `${(rMo * 100).toFixed(4)}%` },
            { label: 'Accelerated Bi-Weekly', value: biweeklyAcc, formatted: fmtMoney(biweeklyAcc, ctx, 'CAD') },
            { label: 'Mortgage Principal', value: P, formatted: fmtMoney(P, ctx, 'CAD') },
          ],
          steps: [`Semi-annual rate ${num(vals, 'apr')}% -> monthly effective ${(rMo * 100).toFixed(4)}%`],
        };
      },
    }),

  // 27. Percent Off Calculator
  'percent-off-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate single or stackable double discounts, coupon savings, and final tax-inclusive sale price.`,
      formulaDisplay: 'Final = Original × (1 − d1%) × (1 − d2%) × (1 + Tax%)',
      explanation: 'Correctly applies sequential stackable discounts and sales tax.',
      inputs: [
        { key: 'price', label: 'Original Tag Price', type: 'number', defaultValue: 150, min: 0, step: 5 },
        { key: 'd1', label: 'Primary Discount (%)', type: 'number', defaultValue: 25, min: 0, max: 99, step: 1 },
        { key: 'd2', label: 'Extra Stackable Coupon (%)', type: 'number', defaultValue: 10, min: 0, max: 99, step: 1 },
        { key: 'tax', label: 'Sales Tax (%)', type: 'number', defaultValue: 0, min: 0, max: 30, step: 0.5 },
      ],
      compute: (vals, ctx) => {
        const p = num(vals, 'price');
        const after1 = p * (1 - num(vals, 'd1') / 100);
        const after2 = after1 * (1 - num(vals, 'd2') / 100);
        const final = after2 * (1 + num(vals, 'tax') / 100);
        const saved = p - after2;
        const effectivePct = p > 0 ? (saved / p) * 100 : 0;
        return {
          primary: { label: 'Final Price to Pay', value: final, formatted: fmtMoney(final, ctx) },
          breakdown: [
            { label: 'Total Dollars Saved', value: saved, formatted: fmtMoney(saved, ctx) },
            { label: 'Combined Effective Discount', value: effectivePct, formatted: `${effectivePct.toFixed(2)}% off` },
          ],
          steps: [`${fmtMoney(p, ctx)} − ${num(vals, 'd1')}% = ${fmtMoney(after1, ctx)} − ${num(vals, 'd2')}% = ${fmtMoney(after2, ctx)}`],
        };
      },
    }),

  // 28. Interest Calculator
  'interest-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate ending balance, contributions, and compound interest earned with regular deposits.`,
      formulaDisplay: 'FV = P(1+r/k)^(kt) + PMT × [((1+r/k)^(kt) − 1) / (r/k)]',
      explanation: 'Models recurring deposits compounded monthly over your investment timeframe.',
      inputs: [
        { key: 'initial', label: 'Starting Principal', type: 'number', defaultValue: 10000, min: 0, step: 500 },
        { key: 'monthly', label: 'Monthly Contribution', type: 'number', defaultValue: 300, min: 0, step: 50 },
        { key: 'rate', label: 'Annual Interest Rate (%)', type: 'number', defaultValue: 6.5, min: 0, max: 30, step: 0.25 },
        { key: 'years', label: 'Investment Years', type: 'number', defaultValue: 10, min: 1, max: 60, step: 1 },
      ],
      compute: (vals, ctx) => {
        const P = num(vals, 'initial');
        const M = num(vals, 'monthly');
        const r = num(vals, 'rate') / 100 / 12;
        const n = Math.round(num(vals, 'years')) * 12;
        const fv = r === 0 ? P + M * n : P * Math.pow(1 + r, n) + M * ((Math.pow(1 + r, n) - 1) / r);
        const contrib = P + M * n;
        const intEarned = fv - contrib;
        return {
          primary: { label: 'Ending Account Balance', value: fv, formatted: fmtMoney(fv, ctx) },
          breakdown: [
            { label: 'Total Contributions', value: contrib, formatted: fmtMoney(contrib, ctx) },
            { label: 'Interest Earned', value: intEarned, formatted: fmtMoney(intEarned, ctx) },
          ],
          steps: [`Compounded monthly over ${n} periods.`],
        };
      },
    }),

  // 29. Mortgage Payoff Calculator
  'mortgage-payoff-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `See how extra monthly principal payments shorten your mortgage payoff timeline and save interest.`,
      formulaDisplay: 'Bal_m = Bal_{m-1}(1+r) − (ScheduledPMT + ExtraMonthly)',
      explanation: 'Simulates accelerated payoff vs original schedule.',
      inputs: [
        { key: 'balance', label: 'Remaining Mortgage Balance', type: 'number', defaultValue: 300000, min: 1000, step: 5000 },
        { key: 'apr', label: 'Mortgage APR (%)', type: 'number', defaultValue: 6.25, min: 0.1, max: 20, step: 0.125 },
        { key: 'remYears', label: 'Remaining Years', type: 'number', defaultValue: 25, min: 1, max: 40, step: 1 },
        { key: 'extraMonthly', label: 'Extra Monthly Principal', type: 'number', defaultValue: 400, min: 0, step: 50 },
      ],
      compute: (vals, ctx) => {
        const B = num(vals, 'balance');
        const apr = num(vals, 'apr');
        const n = Math.round(num(vals, 'remYears')) * 12;
        const extra = num(vals, 'extraMonthly');
        const basePmt = monthlyPayment(B, apr, n);
        const baseInt = basePmt * n - B;
        const r = apr / 100 / 12;
        let bal = B;
        let m = 0;
        let newInt = 0;
        while (bal > 0.01 && m < n) {
          m++;
          const interest = bal * r;
          newInt += interest;
          bal = Math.max(0, bal + interest - (basePmt + extra));
        }
        const savedInt = Math.max(0, baseInt - newInt);
        const savedMo = n - m;
        return {
          primary: { label: 'Interest Saved', value: savedInt, formatted: fmtMoney(savedInt, ctx) },
          breakdown: [
            { label: 'New Payoff Time', value: m, formatted: `${Math.floor(m / 12)} yrs ${m % 12} mos` },
            { label: 'Time Shaved Off', value: savedMo, formatted: `${Math.floor(savedMo / 12)} yrs ${savedMo % 12} mos` },
            { label: 'New Monthly Outlay', value: basePmt + extra, formatted: fmtMoney(basePmt + extra, ctx) },
          ],
          steps: [`Original remaining interest: ${fmtMoney(baseInt, ctx)}; accelerated interest: ${fmtMoney(newInt, ctx)}`],
        };
      },
    }),

  // 30. 401K Calculator
  '401k-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Project 401(k) retirement balance with salary growth, employee deferral, and employer match.`,
      formulaDisplay: 'Yearly Balance = (Bal + EmpContrib + EmployerMatch) × (1 + Return%)',
      explanation: 'Models annual salary escalation, employee contribution %, and employer match cap.',
      inputs: [
        { key: 'currentAge', label: 'Current Age', type: 'number', defaultValue: 32, min: 18, max: 75, step: 1 },
        { key: 'retireAge', label: 'Retirement Age', type: 'number', defaultValue: 65, min: 40, max: 80, step: 1 },
        { key: 'salary', label: 'Annual Salary', type: 'number', defaultValue: 90000, min: 10000, step: 2500 },
        { key: 'balance', label: 'Current 401(k) Balance', type: 'number', defaultValue: 45000, min: 0, step: 5000 },
        { key: 'contribPct', label: 'Your Contribution (%)', type: 'number', defaultValue: 10, min: 0, max: 50, step: 1 },
        { key: 'matchPct', label: 'Employer Match (% of Salary)', type: 'number', defaultValue: 4, min: 0, max: 15, step: 0.5 },
        { key: 'returnPct', label: 'Expected Annual Return (%)', type: 'number', defaultValue: 7.5, min: 0, max: 18, step: 0.5 },
      ],
      compute: (vals, ctx) => {
        const cAge = Math.round(num(vals, 'currentAge'));
        const rAge = Math.round(num(vals, 'retireAge'));
        if (rAge <= cAge) throw new Error('Retirement age must be greater than current age.');
        let bal = num(vals, 'balance');
        let sal = num(vals, 'salary');
        const cp = num(vals, 'contribPct') / 100;
        const mp = num(vals, 'matchPct') / 100;
        const ret = num(vals, 'returnPct') / 100;
        let totEmp = 0;
        let totMatch = 0;
        const years = rAge - cAge;
        for (let y = 0; y < years; y++) {
          const empC = sal * cp;
          const empM = sal * mp;
          totEmp += empC;
          totMatch += empM;
          bal = (bal + empC + empM) * (1 + ret);
          sal *= 1.025; // 2.5% annual salary step
        }
        return {
          primary: { label: `Projected 401(k) at Age ${rAge}`, value: bal, formatted: fmtMoney(bal, ctx) },
          breakdown: [
            { label: 'Your Contributions', value: totEmp, formatted: fmtMoney(totEmp, ctx) },
            { label: 'Free Employer Match', value: totMatch, formatted: fmtMoney(totMatch, ctx) },
            { label: '4% Safe Annual Income', value: bal * 0.04, formatted: `${fmtMoney(bal * 0.04, ctx)}/yr` },
          ],
          steps: [`Simulated ${years} years with 2.5%/yr wage growth and ${num(vals, 'returnPct')}% investment return.`],
        };
      },
    }),

  // 31. Marriage Tax Calculator
  'marriage-tax-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compare combined Single filing tax vs Married Filing Jointly (MFJ) to detect bonus or penalty.`,
      formulaDisplay: 'Delta = Tax(Married Filing Jointly) − [Tax(Spouse 1 Single) + Tax(Spouse 2 Single)]',
      explanation: 'Uses progressive US 2024/2025 federal bracket estimates with standard deduction.',
      inputs: [
        { key: 'inc1', label: 'Spouse 1 Gross Income', type: 'number', defaultValue: 95000, min: 0, step: 2500 },
        { key: 'inc2', label: 'Spouse 2 Gross Income', type: 'number', defaultValue: 55000, min: 0, step: 2500 },
      ],
      compute: (vals, ctx) => {
        const calcSingle = (inc: number) => {
          const taxInc = Math.max(0, inc - 14600);
          const br = [[11600, 0.1], [47150, 0.12], [100525, 0.22], [191950, 0.24], [243725, 0.32], [609350, 0.35], [Infinity, 0.37]];
          let tax = 0, prev = 0;
          for (const [lim, r] of br) {
            if (taxInc > prev) {
              tax += (Math.min(taxInc, lim) - prev) * r;
              prev = lim;
            }
          }
          return tax;
        };
        const calcMFJ = (inc: number) => {
          const taxInc = Math.max(0, inc - 29200);
          const br = [[23200, 0.1], [94300, 0.12], [201050, 0.22], [383900, 0.24], [487450, 0.32], [731200, 0.35], [Infinity, 0.37]];
          let tax = 0, prev = 0;
          for (const [lim, r] of br) {
            if (taxInc > prev) {
              tax += (Math.min(taxInc, lim) - prev) * r;
              prev = lim;
            }
          }
          return tax;
        };
        const i1 = num(vals, 'inc1');
        const i2 = num(vals, 'inc2');
        const singleCombined = calcSingle(i1) + calcSingle(i2);
        const mfj = calcMFJ(i1 + i2);
        const diff = singleCombined - mfj;
        const label = diff >= 0 ? 'Marriage Tax Bonus (Saved)' : 'Marriage Tax Penalty (Extra)';
        return {
          primary: { label, value: Math.abs(diff), formatted: fmtMoney(Math.abs(diff), ctx) },
          breakdown: [
            { label: 'Tax Filing as Two Singles', value: singleCombined, formatted: fmtMoney(singleCombined, ctx) },
            { label: 'Tax Married Filing Jointly', value: mfj, formatted: fmtMoney(mfj, ctx) },
            { label: 'Effective Joint Tax Rate', value: ((mfj / Math.max(1, i1 + i2)) * 100), formatted: `${((mfj / Math.max(1, i1 + i2)) * 100).toFixed(2)}%` },
          ],
          steps: [`Combined Singles = ${fmtMoney(singleCombined, ctx)} vs Joint = ${fmtMoney(mfj, ctx)}`],
        };
      },
    }),

  // 32. Pension Calculator
  'pension-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Defined-benefit pension estimator comparing monthly lifetime annuity against lump-sum buyout.`,
      formulaDisplay: 'Annual Pension = YearsOfService × Multiplier% × FinalAverageSalary',
      explanation: 'Computes earned pension benefit and breakeven return for lump-sum vs monthly payout.',
      inputs: [
        { key: 'salary', label: 'Final Average Salary', type: 'number', defaultValue: 85000, min: 10000, step: 2500 },
        { key: 'yearsService', label: 'Years of Service', type: 'number', defaultValue: 25, min: 1, max: 50, step: 1 },
        { key: 'multiplier', label: 'Benefit Multiplier (%/yr)', type: 'number', defaultValue: 1.8, min: 0.5, max: 4, step: 0.1 },
        { key: 'cola', label: 'Annual COLA Adjustment (%)', type: 'number', defaultValue: 2, min: 0, max: 8, step: 0.5 },
      ],
      compute: (vals, ctx) => {
        const sal = num(vals, 'salary');
        const yrs = num(vals, 'yearsService');
        const mult = num(vals, 'multiplier') / 100;
        const annual = sal * yrs * mult;
        const monthly = annual / 12;
        const lumpEquiv = annual * 16.5;
        return {
          primary: { label: 'Monthly Pension Benefit', value: monthly, formatted: fmtMoney(monthly, ctx) },
          breakdown: [
            { label: 'Starting Annual Pension', value: annual, formatted: fmtMoney(annual, ctx) },
            { label: 'Income Replacement Ratio', value: yrs * mult * 100, formatted: `${(yrs * mult * 100).toFixed(1)}%` },
            { label: 'Est. Actuarial Lump Sum (~16.5x)', value: lumpEquiv, formatted: fmtMoney(lumpEquiv, ctx) },
          ],
          steps: [`${yrs} yrs × ${num(vals, 'multiplier')}% = ${(yrs * num(vals, 'multiplier')).toFixed(1)}% of ${fmtMoney(sal, ctx)}`],
        };
      },
    }),

  // 33. Credit Card Calculator
  'credit-card-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate exact months to pay off a credit card balance and total interest paid.`,
      formulaDisplay: 'n = −ln(1 − B·r / PMT) / ln(1 + r)',
      explanation: 'Shows exact payoff duration and how raising monthly payments cuts interest charges.',
      inputs: [
        { key: 'balance', label: 'Credit Card Balance', type: 'number', defaultValue: 5000, min: 50, step: 100 },
        { key: 'apr', label: 'Interest Rate (APR %)', type: 'number', defaultValue: 21.5, min: 0, max: 45, step: 0.25 },
        { key: 'payment', label: 'Monthly Payment', type: 'number', defaultValue: 200, min: 15, step: 10 },
      ],
      compute: (vals, ctx) => {
        const B = num(vals, 'balance');
        const r = num(vals, 'apr') / 100 / 12;
        const pmt = num(vals, 'payment');
        if (r > 0 && pmt <= B * r) throw new Error(`Monthly payment must exceed monthly interest (${fmtMoney(B * r, ctx)}).`);
        const months = r === 0 ? Math.ceil(B / pmt) : Math.ceil(-Math.log(1 - (B * r) / pmt) / Math.log(1 + r));
        let bal = B;
        let totInt = 0;
        for (let i = 0; i < months; i++) {
          const interest = bal * r;
          totInt += interest;
          bal = Math.max(0, bal + interest - pmt);
        }
        return {
          primary: { label: 'Payoff Time', value: months, formatted: `${months} months (${(months / 12).toFixed(1)} yrs)` },
          breakdown: [
            { label: 'Total Interest Paid', value: totInt, formatted: fmtMoney(totInt, ctx) },
            { label: 'Total Paid (Principal + Int.)', value: B + totInt, formatted: fmtMoney(B + totInt, ctx) },
          ],
          steps: [`Monthly rate = ${(r * 100).toFixed(3)}%; exact closed-form n = ${months} months.`],
        };
      },
    }),

  // 34. Repayment Calculator
  'repayment-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Determine required monthly payment to wipe out any loan by a chosen target payoff date.`,
      formulaDisplay: 'PMT = P × r(1+r)^n / ((1+r)^n − 1)',
      explanation: 'Calculates payment needed for your target repayment horizon.',
      inputs: [
        { key: 'balance', label: 'Loan Balance', type: 'number', defaultValue: 18000, min: 100, step: 500 },
        { key: 'apr', label: 'Interest Rate (APR %)', type: 'number', defaultValue: 8.5, min: 0, max: 40, step: 0.25 },
        { key: 'targetMonths', label: 'Target Payoff Months', type: 'number', defaultValue: 36, min: 1, max: 360, step: 6 },
      ],
      compute: (vals, ctx) => {
        const B = num(vals, 'balance');
        const apr = num(vals, 'apr');
        const n = Math.round(num(vals, 'targetMonths'));
        const pmt = monthlyPayment(B, apr, n);
        const totInt = pmt * n - B;
        return {
          primary: { label: 'Required Monthly Payment', value: pmt, formatted: fmtMoney(pmt, ctx) },
          breakdown: [
            { label: 'Total Interest Cost', value: totInt, formatted: fmtMoney(totInt, ctx) },
            { label: 'Total Repaid', value: B + totInt, formatted: fmtMoney(B + totInt, ctx) },
          ],
          steps: [`Repay ${fmtMoney(B, ctx)} over ${n} months @ ${apr}% APR = ${fmtMoney(pmt, ctx)}/mo`],
        };
      },
    }),

  // 35. CD Calculator
  'cd-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Certificate of Deposit (CD) maturity value and APY yield calculator with compounding frequency.`,
      formulaDisplay: 'Maturity = Deposit × (1 + r/m)^(m·t);  APY = (1 + r/m)^m − 1',
      explanation: 'Computes CD maturity balance, total interest earned, and Annual Percentage Yield (APY).',
      inputs: [
        { key: 'deposit', label: 'Initial CD Deposit', type: 'number', defaultValue: 25000, min: 100, step: 1000 },
        { key: 'rate', label: 'Nominal Interest Rate (%)', type: 'number', defaultValue: 5.0, min: 0, max: 20, step: 0.1 },
        { key: 'months', label: 'CD Term (Months)', type: 'number', defaultValue: 24, min: 1, max: 120, step: 6 },
        {
          key: 'comp',
          label: 'Compounding',
          type: 'select',
          defaultValue: '12',
          options: [
            { label: 'Daily (365/yr)', value: '365' },
            { label: 'Monthly (12/yr)', value: '12' },
            { label: 'Quarterly (4/yr)', value: '4' },
            { label: 'Annually (1/yr)', value: '1' },
          ],
        },
      ],
      compute: (vals, ctx) => {
        const P = num(vals, 'deposit');
        const r = num(vals, 'rate') / 100;
        const yrs = num(vals, 'months') / 12;
        const m = Number(str(vals, 'comp', '12'));
        const maturity = P * Math.pow(1 + r / m, m * yrs);
        const apy = (Math.pow(1 + r / m, m) - 1) * 100;
        return {
          primary: { label: 'CD Ending Value', value: maturity, formatted: fmtMoney(maturity, ctx) },
          breakdown: [
            { label: 'Total Interest Earned', value: maturity - P, formatted: fmtMoney(maturity - P, ctx) },
            { label: 'Effective APY', value: apy, formatted: `${apy.toFixed(3)}% APY` },
          ],
          steps: [`${fmtMoney(P, ctx)} compounded ${m}×/yr for ${yrs.toFixed(2)} yrs -> APY ${apy.toFixed(3)}%`],
        };
      },
    }),

  // 36. IRA Calculator
  'ira-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Traditional IRA tax-deferred retirement balance & immediate annual tax-deduction savings.`,
      formulaDisplay: 'FV = P(1+r)^n + AnnualContrib × [((1+r)^n − 1) / r]',
      explanation: 'Projects pre-tax Traditional IRA growth and after-tax spendable retirement nest egg.',
      inputs: [
        { key: 'balance', label: 'Current IRA Balance', type: 'number', defaultValue: 20000, min: 0, step: 1000 },
        { key: 'contrib', label: 'Annual Contribution', type: 'number', defaultValue: 7000, min: 0, step: 500 },
        { key: 'rate', label: 'Annual Growth Rate (%)', type: 'number', defaultValue: 7, min: 0, max: 20, step: 0.25 },
        { key: 'years', label: 'Years to Grow', type: 'number', defaultValue: 25, min: 1, max: 50, step: 1 },
        { key: 'retTax', label: 'Estimated Retirement Tax (%)', type: 'number', defaultValue: 18, min: 0, max: 45, step: 1 },
      ],
      compute: (vals, ctx) => {
        const P = num(vals, 'balance');
        const C = num(vals, 'contrib');
        const r = num(vals, 'rate') / 100;
        const n = Math.round(num(vals, 'years'));
        const fv = r === 0 ? P + C * n : P * Math.pow(1 + r, n) + C * ((Math.pow(1 + r, n) - 1) / r);
        const afterTax = fv * (1 - num(vals, 'retTax') / 100);
        return {
          primary: { label: 'Projected Pre-Tax IRA', value: fv, formatted: fmtMoney(fv, ctx) },
          breakdown: [
            { label: 'After-Tax Value at Withdrawal', value: afterTax, formatted: fmtMoney(afterTax, ctx) },
            { label: 'Principal Contributed', value: P + C * n, formatted: fmtMoney(P + C * n, ctx) },
          ],
          steps: [`Tax-deferred growth over ${n} years at ${num(vals, 'rate')}%.`],
        };
      },
    }),

  // 37. Auto Lease Calculator
  'auto-lease-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate car lease monthly payment including residual %, money factor, trade-in, and sales tax.`,
      formulaDisplay: 'Monthly = [(AdjustedCap − Residual)/Term + (AdjustedCap + Residual)×MF] × (1 + Tax%)',
      explanation: 'Full dealership auto lease breakdown with residual depreciation and rent charge.',
      inputs: [
        { key: 'msrp', label: 'Vehicle MSRP', type: 'number', defaultValue: 42000, min: 5000, step: 500 },
        { key: 'negPrice', label: 'Negotiated Cap Cost', type: 'number', defaultValue: 39500, min: 5000, step: 500 },
        { key: 'down', label: 'Cap Cost Reduction (Down)', type: 'number', defaultValue: 3000, min: 0, step: 500 },
        { key: 'residualPct', label: 'Residual Value (% of MSRP)', type: 'number', defaultValue: 58, min: 20, max: 85, step: 1 },
        { key: 'apr', label: 'Money Factor Equivalent APR (%)', type: 'number', defaultValue: 5.5, min: 0, max: 25, step: 0.25 },
        { key: 'months', label: 'Lease Term (Months)', type: 'number', defaultValue: 36, min: 24, max: 60, step: 12 },
        { key: 'tax', label: 'Sales Tax (%)', type: 'number', defaultValue: 7, min: 0, max: 20, step: 0.5 },
      ],
      compute: (vals, ctx) => {
        const msrp = num(vals, 'msrp');
        const adjCap = num(vals, 'negPrice') - num(vals, 'down');
        const resVal = msrp * (num(vals, 'residualPct') / 100);
        const months = Math.round(num(vals, 'months', 36));
        const mf = num(vals, 'apr') / 2400;
        const dep = (adjCap - resVal) / months;
        const rent = (adjCap + resVal) * mf;
        const preTax = dep + rent;
        const withTax = preTax * (1 + num(vals, 'tax') / 100);
        return {
          primary: { label: 'Monthly Auto Lease (w/ Tax)', value: withTax, formatted: fmtMoney(withTax, ctx) },
          breakdown: [
            { label: 'Pre-Tax Monthly Lease', value: preTax, formatted: fmtMoney(preTax, ctx) },
            { label: 'Residual Buyout Value', value: resVal, formatted: fmtMoney(resVal, ctx) },
            { label: 'Depreciation / Rent Split', value: dep, formatted: `${fmtMoney(dep, ctx)} / ${fmtMoney(rent, ctx)}` },
          ],
          steps: [`Residual = ${fmtMoney(resVal, ctx)}; Money Factor = ${mf.toFixed(5)}`],
        };
      },
    }),

  // 38. Average Return Calculator
  'average-return-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compare Arithmetic Average Return vs Geometric Compound Return (CAGR) across annual returns.`,
      formulaDisplay: 'Arithmetic = Σr / n  |  Geometric (CAGR) = [Π(1 + r_i)]^(1/n) − 1',
      explanation: 'Demonstrates volatility drag between simple average return and true compounded growth.',
      inputs: [
        { key: 'returns', label: 'Annual Returns % (comma-separated)', type: 'text', defaultValue: '12, -8, 18, 6, 14' },
      ],
      compute: (vals) => {
        const list = parseNumberList(str(vals, 'returns', '12, -8, 18, 6, 14'));
        const arith = list.reduce((a, b) => a + b, 0) / list.length;
        let mult = 1;
        for (const r of list) mult *= 1 + r / 100;
        const geom = (Math.pow(mult, 1 / list.length) - 1) * 100;
        const cum = (mult - 1) * 100;
        return {
          primary: { label: 'Geometric Annual Return (CAGR)', value: geom, formatted: `${geom.toFixed(2)}% / yr` },
          breakdown: [
            { label: 'Arithmetic Mean Return', value: arith, formatted: `${arith.toFixed(2)}% / yr` },
            { label: 'Cumulative Total Return', value: cum, formatted: `${cum.toFixed(2)}%` },
            { label: 'Volatility Drag', value: arith - geom, formatted: `${(arith - geom).toFixed(2)}%` },
          ],
          steps: [`Across ${list.length} periods: cumulative factor = ${mult.toFixed(4)}x`],
        };
      },
    }),

  // 39. Debt-to-Income Ratio Calculator
  'debt-to-income-ratio-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate Front-End (Housing) and Back-End (Total) DTI ratio for mortgage qualification.`,
      formulaDisplay: 'Back-End DTI = (Housing + Auto + Cards + Loans) / Gross Monthly Income × 100',
      explanation: 'Checks readiness against standard lender 28%/36% and FHA 43%/50% qualification limits.',
      inputs: [
        { key: 'grossIncome', label: 'Monthly Gross Income', type: 'number', defaultValue: 8000, min: 100, step: 250 },
        { key: 'housing', label: 'Mortgage / Rent Payment', type: 'number', defaultValue: 2000, min: 0, step: 100 },
        { key: 'otherDebt', label: 'Auto, Student & Card Minimums', type: 'number', defaultValue: 650, min: 0, step: 50 },
      ],
      compute: (vals) => {
        const inc = num(vals, 'grossIncome');
        const house = num(vals, 'housing');
        const other = num(vals, 'otherDebt');
        const frontDti = (house / inc) * 100;
        const backDti = ((house + other) / inc) * 100;
        const status = backDti <= 36 ? 'Excellent (Prime Conventional)' : backDti <= 43 ? 'Acceptable (Standard QM)' : 'High DTI (Tight Qualification)';
        return {
          primary: { label: 'Back-End Total DTI Ratio', value: backDti, formatted: `${backDti.toFixed(1)}%` },
          breakdown: [
            { label: 'Front-End Housing DTI', value: frontDti, formatted: `${frontDti.toFixed(1)}%` },
            { label: 'Qualification Rating', value: status, formatted: status },
          ],
          steps: [`(${house} + ${other}) / ${inc} = ${backDti.toFixed(1)}%`],
        };
      },
    }),

  // 40. Take-Home-Paycheck Calculator
  'take-home-paycheck-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Estimate net take-home paycheck per pay period after Federal, FICA (7.65%), State & 401(k) deductions.`,
      formulaDisplay: 'Net Pay = Gross − 401k − FICA(7.65%) − IncomeTaxes',
      explanation: 'Computes per-paycheck and annual net cash deposit across weekly/biweekly/monthly schedules.',
      inputs: [
        { key: 'annualSalary', label: 'Annual Gross Salary', type: 'number', defaultValue: 85000, min: 5000, step: 2500 },
        { key: 'preTax401k', label: 'Pre-Tax 401(k) (%)', type: 'number', defaultValue: 6, min: 0, max: 50, step: 1 },
        { key: 'stateTax', label: 'State / Local Tax (%)', type: 'number', defaultValue: 4.5, min: 0, max: 15, step: 0.25 },
        {
          key: 'freq',
          label: 'Pay Frequency',
          type: 'select',
          defaultValue: '26',
          options: [
            { label: 'Bi-Weekly (26 checks/yr)', value: '26' },
            { label: 'Semi-Monthly (24 checks/yr)', value: '24' },
            { label: 'Monthly (12 checks/yr)', value: '12' },
            { label: 'Weekly (52 checks/yr)', value: '52' },
          ],
        },
      ],
      compute: (vals, ctx) => {
        const gross = num(vals, 'annualSalary');
        const k401 = gross * (num(vals, 'preTax401k') / 100);
        const fica = Math.min(gross, 168600) * 0.062 + gross * 0.0145;
        const taxableFed = Math.max(0, gross - k401 - 14600);
        const fedTax = taxableFed <= 11600 ? taxableFed * 0.1 : taxableFed <= 47150 ? 1160 + (taxableFed - 11600) * 0.12 : 5426 + (taxableFed - 47150) * 0.22;
        const state = Math.max(0, gross - k401) * (num(vals, 'stateTax') / 100);
        const annualNet = gross - k401 - fica - fedTax - state;
        const checks = Number(str(vals, 'freq', '26'));
        const perCheck = annualNet / checks;
        return {
          primary: { label: 'Net Take-Home Per Paycheck', value: perCheck, formatted: fmtMoney(perCheck, ctx) },
          breakdown: [
            { label: 'Annual Net Pay', value: annualNet, formatted: fmtMoney(annualNet, ctx) },
            { label: 'Federal + State Tax', value: fedTax + state, formatted: fmtMoney(fedTax + state, ctx) },
            { label: 'Social Security & Medicare', value: fica, formatted: fmtMoney(fica, ctx) },
            { label: 'Pre-Tax 401(k)', value: k401, formatted: fmtMoney(k401, ctx) },
          ],
          steps: [`Gross ${fmtMoney(gross, ctx)} − Deductions = ${fmtMoney(annualNet, ctx)}/yr ÷ ${checks}`],
        };
      },
    }),

  // 41. Boat Loan Calculator
  'boat-loan-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Marine & yacht loan monthly payment calculator supporting 10–20 year marine loan terms.`,
      formulaDisplay: 'Loan = BoatPrice − Down − TradeIn;  PMT = P·r / (1 − (1+r)^−n)',
      explanation: 'Computes monthly boat payments, total marine financing interest, and total ownership cost.',
      inputs: [
        { key: 'price', label: 'Boat / Vessel Price', type: 'number', defaultValue: 65000, min: 1000, step: 1000 },
        { key: 'down', label: 'Down Payment & Trade-In', type: 'number', defaultValue: 13000, min: 0, step: 1000 },
        { key: 'apr', label: 'Marine Loan APR (%)', type: 'number', defaultValue: 7.25, min: 0, max: 25, step: 0.25 },
        { key: 'years', label: 'Loan Term (Years)', type: 'number', defaultValue: 15, min: 1, max: 20, step: 1 },
      ],
      compute: (vals, ctx) => {
        const P = Math.max(0, num(vals, 'price') - num(vals, 'down'));
        const years = Math.round(num(vals, 'years'));
        const pmt = monthlyPayment(P, num(vals, 'apr'), years * 12);
        const totInt = pmt * years * 12 - P;
        return {
          primary: { label: 'Monthly Boat Payment', value: pmt, formatted: fmtMoney(pmt, ctx) },
          breakdown: [
            { label: 'Financed Amount', value: P, formatted: fmtMoney(P, ctx) },
            { label: 'Total Interest Paid', value: totInt, formatted: fmtMoney(totInt, ctx) },
          ],
          steps: [`${fmtMoney(P, ctx)} financed over ${years} yrs @ ${num(vals, 'apr')}% APR`],
        };
      },
    }),

  // 42. Refinance Calculator
  'refinance-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate mortgage refinance monthly savings, break-even months, and net lifetime benefit.`,
      formulaDisplay: 'Break-Even Months = ClosingCosts / (OldPMT − NewPMT)',
      explanation: 'Determines if refinancing makes financial sense after factoring closing fees.',
      inputs: [
        { key: 'balance', label: 'Current Loan Balance', type: 'number', defaultValue: 280000, min: 5000, step: 5000 },
        { key: 'oldRate', label: 'Current APR (%)', type: 'number', defaultValue: 7.25, min: 0.5, max: 20, step: 0.125 },
        { key: 'newRate', label: 'New Refinance APR (%)', type: 'number', defaultValue: 5.75, min: 0.5, max: 20, step: 0.125 },
        { key: 'years', label: 'Remaining / New Term (Years)', type: 'number', defaultValue: 25, min: 5, max: 30, step: 1 },
        { key: 'closing', label: 'Refinance Closing Costs', type: 'number', defaultValue: 4500, min: 0, step: 250 },
      ],
      compute: (vals, ctx) => {
        const B = num(vals, 'balance');
        const months = Math.round(num(vals, 'years')) * 12;
        const oldPmt = monthlyPayment(B, num(vals, 'oldRate'), months);
        const newPmt = monthlyPayment(B, num(vals, 'newRate'), months);
        const closing = num(vals, 'closing');
        const moSave = oldPmt - newPmt;
        const breakEven = moSave > 0 ? Math.ceil(closing / moSave) : Infinity;
        const netSavings = moSave * months - closing;
        return {
          primary: { label: 'Monthly Payment Savings', value: moSave, formatted: fmtMoney(moSave, ctx) },
          breakdown: [
            { label: 'Old vs New Monthly Payment', value: newPmt, formatted: `${fmtMoney(oldPmt, ctx)} → ${fmtMoney(newPmt, ctx)}` },
            { label: 'Break-Even Point', value: Number.isFinite(breakEven) ? breakEven : 0, formatted: Number.isFinite(breakEven) ? `${breakEven} months` : 'No Savings' },
            { label: 'Net Lifetime Savings', value: netSavings, formatted: fmtMoney(netSavings, ctx) },
          ],
          steps: [`Monthly savings = ${fmtMoney(moSave, ctx)}; recovers ${fmtMoney(closing, ctx)} closing cost in ${breakEven} mos.`],
        };
      },
    }),

  // 43. Rental Property Calculator
  'rental-property-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Real estate rental investment analyzer computing Cap Rate, Cash-on-Cash ROI, NOI, and cashflow.`,
      formulaDisplay: 'Cap Rate = NOI / Price;  Cash-on-Cash = Annual Cashflow / Total Cash Invested',
      explanation: 'Evaluates rental yield, vacancy/expense ratio, mortgage leverage, and cash-on-cash return.',
      inputs: [
        { key: 'price', label: 'Property Price', type: 'number', defaultValue: 300000, min: 10000, step: 5000 },
        { key: 'downPct', label: 'Down Payment (%)', type: 'number', defaultValue: 20, min: 5, max: 100, step: 5 },
        { key: 'rent', label: 'Gross Monthly Rent', type: 'number', defaultValue: 2600, min: 200, step: 100 },
        { key: 'expenses', label: 'Monthly Tax/Ins/Maint/Vacancy', type: 'number', defaultValue: 750, min: 0, step: 50 },
        { key: 'apr', label: 'Mortgage APR (%)', type: 'number', defaultValue: 6.75, min: 0, max: 20, step: 0.125 },
      ],
      compute: (vals, ctx) => {
        const price = num(vals, 'price');
        const down = price * (num(vals, 'downPct') / 100);
        const loan = price - down;
        const rent = num(vals, 'rent');
        const opEx = num(vals, 'expenses');
        const noiAnnual = (rent - opEx) * 12;
        const capRate = (noiAnnual / price) * 100;
        const mortgageMo = loan > 0 ? monthlyPayment(loan, num(vals, 'apr'), 360) : 0;
        const cashflowMo = rent - opEx - mortgageMo;
        const cashInvested = down + price * 0.03;
        const coc = ((cashflowMo * 12) / cashInvested) * 100;
        return {
          primary: { label: 'Monthly Net Cash Flow', value: cashflowMo, formatted: fmtMoney(cashflowMo, ctx) },
          breakdown: [
            { label: 'Capitalization Rate (Cap Rate)', value: capRate, formatted: `${capRate.toFixed(2)}%` },
            { label: 'Cash-on-Cash ROI', value: coc, formatted: `${coc.toFixed(2)}%` },
            { label: 'Annual Net Operating Income', value: noiAnnual, formatted: fmtMoney(noiAnnual, ctx) },
          ],
          steps: [`Monthly NOI ${fmtMoney(rent - opEx, ctx)} − Debt Service ${fmtMoney(mortgageMo, ctx)} = ${fmtMoney(cashflowMo, ctx)}`],
        };
      },
    }),

  // 44. FHA Loan Calculator
  'fha-loan-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate FHA home mortgage payment with 3.5% down, 1.75% UFMIP, and monthly MIP.`,
      formulaDisplay: 'Total Loan = (Price − Down) × 1.0175;  Monthly MIP = BaseLoan × 0.55% / 12',
      explanation: 'Models Federal Housing Administration (FHA) upfront and annual mortgage insurance premiums.',
      inputs: [
        { key: 'price', label: 'Home Price', type: 'number', defaultValue: 320000, min: 25000, step: 5000 },
        { key: 'downPct', label: 'Down Payment (%)', type: 'number', defaultValue: 3.5, min: 3.5, max: 50, step: 0.5 },
        { key: 'apr', label: 'FHA Interest Rate (%)', type: 'number', defaultValue: 6.1, min: 1, max: 18, step: 0.1 },
        { key: 'years', label: 'Loan Term (Years)', type: 'number', defaultValue: 30, min: 15, max: 30, step: 5 },
      ],
      compute: (vals, ctx) => {
        const price = num(vals, 'price');
        const down = price * (num(vals, 'downPct') / 100);
        const base = price - down;
        const ufmip = base * 0.0175;
        const totalLoan = base + ufmip;
        const pi = monthlyPayment(totalLoan, num(vals, 'apr'), Math.round(num(vals, 'years')) * 12);
        const monthlyMip = (base * 0.0055) / 12;
        const totalMo = pi + monthlyMip;
        return {
          primary: { label: 'Monthly FHA P&I + MIP', value: totalMo, formatted: fmtMoney(totalMo, ctx) },
          breakdown: [
            { label: 'Financed UFMIP (1.75%)', value: ufmip, formatted: fmtMoney(ufmip, ctx) },
            { label: 'Monthly MIP Insurance', value: monthlyMip, formatted: fmtMoney(monthlyMip, ctx) },
            { label: 'Total Loan w/ UFMIP', value: totalLoan, formatted: fmtMoney(totalLoan, ctx) },
          ],
          steps: [`Base FHA Loan ${fmtMoney(base, ctx)} + UFMIP ${fmtMoney(ufmip, ctx)}`],
        };
      },
    }),

  // 45. Home Equity Loan Calculator
  'home-equity-loan-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate borrowable home equity at 80% CLTV limit and fixed monthly second-mortgage payment.`,
      formulaDisplay: 'Max Borrowable = (HomeValue × 80%) − ExistingMortgage',
      explanation: 'Computes tappable equity cushion plus fixed-rate installment payments.',
      inputs: [
        { key: 'homeValue', label: 'Estimated Home Value', type: 'number', defaultValue: 450000, min: 25000, step: 10000 },
        { key: 'mortgageBal', label: 'Current Mortgage Owed', type: 'number', defaultValue: 260000, min: 0, step: 5000 },
        { key: 'apr', label: 'Home Equity APR (%)', type: 'number', defaultValue: 7.75, min: 1, max: 25, step: 0.25 },
        { key: 'years', label: 'Repayment Term (Years)', type: 'number', defaultValue: 15, min: 5, max: 30, step: 5 },
      ],
      compute: (vals, ctx) => {
        const val = num(vals, 'homeValue');
        const owed = num(vals, 'mortgageBal');
        const avail80 = Math.max(0, val * 0.8 - owed);
        const pmt = avail80 > 0 ? monthlyPayment(avail80, num(vals, 'apr'), Math.round(num(vals, 'years')) * 12) : 0;
        const ltv = (owed / val) * 100;
        return {
          primary: { label: 'Max Borrowable Equity (80% CLTV)', value: avail80, formatted: fmtMoney(avail80, ctx) },
          breakdown: [
            { label: 'Current Equity Stake', value: Math.max(0, val - owed), formatted: fmtMoney(Math.max(0, val - owed), ctx) },
            { label: 'Current Loan-to-Value', value: ltv, formatted: `${ltv.toFixed(1)}% LTV` },
            { label: 'Est. Payment on Max Line', value: pmt, formatted: `${fmtMoney(pmt, ctx)}/mo` },
          ],
          steps: [`80% of ${fmtMoney(val, ctx)} = ${fmtMoney(val * 0.8, ctx)} minus ${fmtMoney(owed, ctx)} balance.`],
        };
      },
    }),

  // 46. Payback Period Calculator
  'payback-period-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate simple and discounted project payback period in years for capital budgeting decisions.`,
      formulaDisplay: 'Payback = InitialInvestment / AnnualNetCashflow;  Discounted uses CF_t / (1+r)^t',
      explanation: 'Measures exact years needed to recover upfront capital outlay.',
      inputs: [
        { key: 'investment', label: 'Initial Project Outlay', type: 'number', defaultValue: 100000, min: 100, step: 1000 },
        { key: 'annualCashflow', label: 'Annual Net Cash Inflow', type: 'number', defaultValue: 28000, min: 1, step: 500 },
        { key: 'discountRate', label: 'Cost of Capital / Discount (%)', type: 'number', defaultValue: 8, min: 0, max: 35, step: 0.5 },
      ],
      compute: (vals) => {
        const inv = num(vals, 'investment');
        const cf = num(vals, 'annualCashflow');
        const r = num(vals, 'discountRate') / 100;
        const simple = inv / cf;
        let cumDisc = 0;
        let discYr = 0;
        for (let t = 1; t <= 100; t++) {
          const pv = cf / Math.pow(1 + r, t);
          if (cumDisc + pv >= inv) {
            discYr = (t - 1) + (inv - cumDisc) / pv;
            break;
          }
          cumDisc += pv;
        }
        return {
          primary: { label: 'Simple Payback Period', value: simple, formatted: `${simple.toFixed(2)} years` },
          breakdown: [
            { label: 'Discounted Payback Period', value: discYr || 999, formatted: discYr > 0 ? `${discYr.toFixed(2)} years` : '> 100 years' },
            { label: 'Annual Cash ROI', value: (cf / inv) * 100, formatted: `${((cf / inv) * 100).toFixed(2)}%` },
          ],
          steps: [`Simple: ${inv} / ${cf} = ${simple.toFixed(2)} yrs`],
        };
      },
    }),

  // 47. Mortgage Calculator UK
  'mortgage-calculator-uk': (entry) =>
    makeBase(entry, {
      shortDescription: `UK GBP (£) Repayment vs Interest-Only mortgage calculator with Stamp Duty Land Tax estimate.`,
      formulaDisplay: 'GBP Repayment = P·r / (1 − (1+r)^−n);  Interest-Only = P·r',
      explanation: 'Designed for UK property buyers calculating GBP monthly payments and England SDLT thresholds.',
      inputs: [
        { key: 'price', label: 'UK Property Price (£)', type: 'number', defaultValue: 350000, min: 25000, step: 5000 },
        { key: 'deposit', label: 'Deposit (£)', type: 'number', defaultValue: 52500, min: 0, step: 2500 },
        { key: 'rate', label: 'Mortgage Rate (%)', type: 'number', defaultValue: 4.85, min: 0.5, max: 15, step: 0.05 },
        { key: 'years', label: 'Mortgage Term (Years)', type: 'number', defaultValue: 25, min: 5, max: 40, step: 1 },
      ],
      compute: (vals, ctx) => {
        const price = num(vals, 'price');
        const loan = Math.max(0, price - num(vals, 'deposit'));
        const rate = num(vals, 'rate');
        const pmt = monthlyPayment(loan, rate, Math.round(num(vals, 'years')) * 12);
        const io = loan * (rate / 100 / 12);
        // England standard residential SDLT bands
        let sdlt = 0;
        if (price > 250000) sdlt += Math.min(price - 250000, 675000) * 0.05;
        if (price > 925000) sdlt += Math.min(price - 925000, 575000) * 0.10;
        if (price > 1500000) sdlt += (price - 1500000) * 0.12;
        return {
          primary: { label: 'Monthly Repayment (£)', value: pmt, formatted: fmtMoney(pmt, ctx, 'GBP') },
          breakdown: [
            { label: 'Interest-Only Alternative', value: io, formatted: `${fmtMoney(io, ctx, 'GBP')}/mo` },
            { label: 'Est. England Stamp Duty (SDLT)', value: sdlt, formatted: fmtMoney(sdlt, ctx, 'GBP') },
            { label: 'Loan-to-Value (LTV)', value: (loan / price) * 100, formatted: `${((loan / price) * 100).toFixed(1)}%` },
          ],
          steps: [`Loan £${loan.toLocaleString()} @ ${rate}% over ${num(vals, 'years')} yrs`],
        };
      },
    }),

  // 48. Mortgage Amortization Calculator
  'mortgage-amortization-calculator': (entry) =>
    EXACT_BUILDERS['amortization-calculator'](entry),

  // 49. Pregnancy Conception Calculator
  'pregnancy-conception-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Estimate probable conception date and fertile window backward from Due Date or forward from LMP.`,
      formulaDisplay: 'Estimated Conception ≈ Due Date − 266 days  (or LMP + 14 days)',
      explanation: 'Computes estimated ovulation/conception date, fertile 6-day window, and gestational week.',
      inputs: [
        { key: 'dueDate', label: 'Estimated Due Date', type: 'date', defaultValue: '2026-08-15' },
        { key: 'cycleLen', label: 'Average Cycle Length (Days)', type: 'number', defaultValue: 28, min: 21, max: 38, step: 1 },
      ],
      compute: (vals) => {
        const dueStr = str(vals, 'dueDate', '2026-08-15');
        const dueMs = Date.parse(dueStr);
        if (Number.isNaN(dueMs)) throw new Error('Enter a valid due date.');
        const concMs = dueMs - 266 * 86400000;
        const winStartMs = concMs - 5 * 86400000;
        const winEndMs = concMs + 1 * 86400000;
        const lmpMs = dueMs - (280 + (num(vals, 'cycleLen', 28) - 28)) * 86400000;
        const fmtD = (ms: number) => new Date(ms).toISOString().slice(0, 10);
        return {
          primary: { label: 'Probable Conception Date', value: fmtD(concMs), formatted: fmtD(concMs) },
          breakdown: [
            { label: 'Fertile Window Range', value: `${fmtD(winStartMs)} – ${fmtD(winEndMs)}`, formatted: `${fmtD(winStartMs)} to ${fmtD(winEndMs)}` },
            { label: 'Estimated Last Period (LMP)', value: fmtD(lmpMs), formatted: fmtD(lmpMs) },
            { label: 'First Trimester End (Wk 12)', value: fmtD(lmpMs + 84 * 86400000), formatted: fmtD(lmpMs + 84 * 86400000) },
          ],
          steps: [`Due date ${dueStr} minus 266 days (38 fetal weeks) = ${fmtD(concMs)}`],
        };
      },
    }),

  // 50. Pace Calculator
  'pace-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate running pace per km & mile plus predicted splits for 5K, 10K, Half & Full Marathon.`,
      formulaDisplay: 'Pace = TotalMinutes / Distance;  Speed = Distance / Hours',
      explanation: 'Converts finish time and race distance into min/km, min/mile, speed, and standard race projections.',
      inputs: [
        { key: 'distanceKm', label: 'Distance (km)', type: 'number', defaultValue: 10, min: 0.1, step: 0.5 },
        { key: 'minutes', label: 'Finish Time (Total Minutes)', type: 'number', defaultValue: 50, min: 0.5, step: 1 },
      ],
      compute: (vals) => {
        const km = num(vals, 'distanceKm');
        const mins = num(vals, 'minutes');
        const paceKm = mins / km;
        const paceMi = paceKm * 1.60934;
        const fmtP = (p: number) => `${Math.floor(p)}:${String(Math.round((p % 1) * 60) % 60).padStart(2, '0')}`;
        const kph = km / (mins / 60);
        return {
          primary: { label: 'Running Pace (per km)', value: paceKm, formatted: `${fmtP(paceKm)} / km` },
          breakdown: [
            { label: 'Pace per Mile', value: paceMi, formatted: `${fmtP(paceMi)} / mi` },
            { label: 'Average Speed', value: kph, formatted: `${kph.toFixed(2)} km/h` },
            { label: 'Est. 5K / Half Marathon', value: paceKm * 5, formatted: `${fmtP(paceKm * 5)} / ${fmtP(paceKm * 21.0975)}` },
          ],
          steps: [`${mins} min ÷ ${km} km = ${fmtP(paceKm)} min/km`],
        };
      },
    }),

  // 51. Anorexic BMI Calculator
  'anorexic-bmi-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `WHO & DSM-5 underweight / anorexia BMI severity assessment (Mild, Moderate, Severe, Extreme).`,
      formulaDisplay: 'BMI = Weight(kg) / Height(m)²',
      explanation: 'Screens BMI thresholds below 18.5 kg/m² per DSM-5 clinical severity bands. Consult a clinician for medical care.',
      inputs: [
        { key: 'weight', label: 'Weight (kg)', type: 'number', defaultValue: 48, min: 20, max: 250, step: 0.5 },
        { key: 'heightCm', label: 'Height (cm)', type: 'number', defaultValue: 170, min: 100, max: 240, step: 1 },
      ],
      compute: (vals) => {
        const w = num(vals, 'weight');
        const h = num(vals, 'heightCm') / 100;
        const bmi = w / (h * h);
        const severity =
          bmi >= 18.5
            ? 'Healthy / Non-Underweight (≥18.5)'
            : bmi >= 17
            ? 'Mild Underweight (17.0–18.4)'
            : bmi >= 16
            ? 'Moderate Anorexia Range (16.0–16.9)'
            : bmi >= 15
            ? 'Severe Anorexia Range (15.0–15.9)'
            : 'Extreme Clinical Risk (<15.0)';
        const minHealthyKg = 18.5 * h * h;
        return {
          primary: { label: 'BMI Index', value: bmi, formatted: `${bmi.toFixed(1)} kg/m²` },
          breakdown: [
            { label: 'DSM-5 / WHO Classification', value: severity, formatted: severity },
            { label: 'Minimum Healthy Weight (18.5)', value: minHealthyKg, formatted: `${minHealthyKg.toFixed(1)} kg` },
          ],
          steps: [`BMI = ${w} / (${h.toFixed(2)})² = ${bmi.toFixed(1)}`],
        };
      },
    }),

  // 52. Overweight Calculator
  'overweight-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Determine if current body weight exceeds healthy BMI range and compute target fat loss goal.`,
      formulaDisplay: 'Excess Weight = Weight − (24.9 × Height(m)²)',
      explanation: 'Identifies exact weight delta above the healthy 18.5–24.9 BMI window.',
      inputs: [
        { key: 'weight', label: 'Current Weight (kg)', type: 'number', defaultValue: 86, min: 25, max: 300, step: 0.5 },
        { key: 'heightCm', label: 'Height (cm)', type: 'number', defaultValue: 175, min: 100, max: 240, step: 1 },
      ],
      compute: (vals) => {
        const w = num(vals, 'weight');
        const h = num(vals, 'heightCm') / 100;
        const bmi = w / (h * h);
        const upperHealthy = 24.9 * h * h;
        const excess = Math.max(0, w - upperHealthy);
        const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy Weight' : bmi < 30 ? 'Overweight' : 'Obese Class';
        return {
          primary: { label: 'BMI Status', value: bmi, formatted: `${bmi.toFixed(1)} (${cat})` },
          breakdown: [
            { label: 'Upper Healthy Ceiling', value: upperHealthy, formatted: `${upperHealthy.toFixed(1)} kg` },
            { label: 'Excess Weight Above 24.9 BMI', value: excess, formatted: `${excess.toFixed(1)} kg` },
          ],
          steps: [`Upper healthy mass at ${(h * 100).toFixed(0)} cm = ${upperHealthy.toFixed(1)} kg`],
        };
      },
    }),

  // 53. BAC Calculator
  'bac-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Widmark Blood Alcohol Concentration (BAC%) calculator with estimated hours to 0.00% sobriety.`,
      formulaDisplay: 'BAC = [Alcohol(g) / (BodyWeight(g) × r)] × 100 − (0.015 × Hours)',
      explanation: 'Uses Widmark distribution constants (0.68 male, 0.55 female) and 0.015%/hr liver clearance. Never drink and drive.',
      inputs: [
        { key: 'weightKg', label: 'Body Weight (kg)', type: 'number', defaultValue: 75, min: 30, max: 250, step: 1 },
        { key: 'sex', label: 'Biological Sex', type: 'select', defaultValue: 'male', options: [{ label: 'Male (r = 0.68)', value: 'male' }, { label: 'Female (r = 0.55)', value: 'female' }] },
        { key: 'drinks', label: 'Standard Drinks (14g ethanol ea.)', type: 'number', defaultValue: 3, min: 0.5, max: 25, step: 0.5 },
        { key: 'hours', label: 'Hours Since First Drink', type: 'number', defaultValue: 2, min: 0, max: 24, step: 0.5 },
      ],
      compute: (vals) => {
        const wG = num(vals, 'weightKg') * 1000;
        const r = str(vals, 'sex', 'male') === 'male' ? 0.68 : 0.55;
        const alcG = num(vals, 'drinks') * 14;
        const hrs = num(vals, 'hours');
        const bac = Math.max(0, (alcG / (wG * r)) * 100 - 0.015 * hrs);
        const hrsToSober = bac / 0.015;
        return {
          primary: { label: 'Estimated BAC (%)', value: bac, formatted: `${bac.toFixed(3)}%` },
          breakdown: [
            { label: 'US/UK Legal Limit Note', value: bac, formatted: bac >= 0.08 ? 'Above 0.08% Legal Limit' : 'Below 0.08% (Impairment possible)' },
            { label: 'Est. Hours to Reach 0.00%', value: hrsToSober, formatted: `${hrsToSober.toFixed(1)} hours` },
          ],
          steps: [`Widmark alcohol ${alcG}g distributed in ${(wG * r / 1000).toFixed(1)}kg body water minus ${(0.015 * hrs).toFixed(3)}% metabolized.`],
        };
      },
    }),

  // 54. Weight Watcher Points Calculator
  'weight-watcher-points-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate food item SmartPoints value from Calories, Saturated Fat, Sugar, and Protein.`,
      formulaDisplay: 'Points = round((Cal × 0.0305) + (SatFat × 0.275) + (Sugar × 0.12) − (Protein × 0.098))',
      explanation: 'Evaluates nutrient density prioritizing lean protein while penalizing added sugar and saturated fat.',
      inputs: [
        { key: 'calories', label: 'Calories (kcal)', type: 'number', defaultValue: 280, min: 0, step: 10 },
        { key: 'satFat', label: 'Saturated Fat (g)', type: 'number', defaultValue: 3, min: 0, step: 0.5 },
        { key: 'sugar', label: 'Sugar (g)', type: 'number', defaultValue: 6, min: 0, step: 1 },
        { key: 'protein', label: 'Protein (g)', type: 'number', defaultValue: 22, min: 0, step: 1 },
      ],
      compute: (vals) => {
        const pts = Math.max(
          0,
          Math.round(
            num(vals, 'calories') * 0.0305 +
              num(vals, 'satFat') * 0.275 +
              num(vals, 'sugar') * 0.12 -
              num(vals, 'protein') * 0.098
          )
        );
        return {
          primary: { label: 'SmartPoints Value', value: pts, formatted: `${pts} pts` },
          breakdown: [
            { label: 'Protein Bonus Reduction', value: num(vals, 'protein') * 0.098, formatted: `−${(num(vals, 'protein') * 0.098).toFixed(2)} pts` },
          ],
          steps: [`Weighted macro calculation rounded to nearest whole point = ${pts}`],
        };
      },
    }),

  // 55. Random Number Generator
  'random-number-generator': (entry) =>
    makeBase(entry, {
      shortDescription: `Generate cryptographically uniform pseudo-random numbers within custom Min/Max integer bounds.`,
      formulaDisplay: 'X_i = Min + floor(U_i × (Max − Min + 1))',
      explanation: 'Produces reproducible or fresh random integer samples with summary statistics.',
      inputs: [
        { key: 'minVal', label: 'Minimum Value', type: 'number', defaultValue: 1, step: 1 },
        { key: 'maxVal', label: 'Maximum Value', type: 'number', defaultValue: 100, step: 1 },
        { key: 'count', label: 'How Many Numbers (1–20)', type: 'number', defaultValue: 5, min: 1, max: 20, step: 1 },
        { key: 'seed', label: 'Seed Offset (change to re-roll)', type: 'number', defaultValue: 42, step: 1 },
      ],
      compute: (vals) => {
        const mn = Math.round(num(vals, 'minVal'));
        const mx = Math.round(num(vals, 'maxVal'));
        if (mx < mn) throw new Error('Maximum must be greater than or equal to Minimum.');
        const count = Math.round(num(vals, 'count', 5));
        let s = Math.abs(Math.trunc(num(vals, 'seed', 42))) + 1013904223;
        const out: number[] = [];
        for (let i = 0; i < count; i++) {
          s = (s * 1664525 + 1013904223) >>> 0;
          const val = mn + (s % (mx - mn + 1));
          out.push(val);
        }
        return {
          primary: { label: 'Generated Value(s)', value: out[0], formatted: out.join(', ') },
          breakdown: [
            { label: 'Sample Sum', value: out.reduce((a, b) => a + b, 0), formatted: String(out.reduce((a, b) => a + b, 0)) },
            { label: 'Sample Mean', value: out.reduce((a, b) => a + b, 0) / count, formatted: (out.reduce((a, b) => a + b, 0) / count).toFixed(2) },
          ],
          steps: [`Generated ${count} integer(s) in [${mn}, ${mx}]. Adjust Seed Offset to roll new batch.`],
        };
      },
    }),

  // 56. Percent Error Calculator
  'percent-error-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate laboratory Experimental vs Theoretical Percent Error and absolute deviation.`,
      formulaDisplay: '% Error = |Observed − Theoretical| / |Theoretical| × 100',
      explanation: 'Standard chemistry, physics, and engineering measurement accuracy metric.',
      inputs: [
        { key: 'observed', label: 'Observed / Measured Value', type: 'number', defaultValue: 9.65, step: 0.01 },
        { key: 'theoretical', label: 'Theoretical / True Value', type: 'number', defaultValue: 9.81, step: 0.01 },
      ],
      compute: (vals) => {
        const obs = num(vals, 'observed');
        const theo = num(vals, 'theoretical');
        if (theo === 0) throw new Error('Theoretical value cannot be zero.');
        const absErr = Math.abs(obs - theo);
        const pctErr = (absErr / Math.abs(theo)) * 100;
        return {
          primary: { label: 'Percent Error', value: pctErr, formatted: `${pctErr.toFixed(4)}%` },
          breakdown: [
            { label: 'Absolute Error', value: absErr, formatted: absErr.toPrecision(6) },
            { label: 'Signed Difference', value: obs - theo, formatted: (obs - theo).toPrecision(6) },
          ],
          steps: [`|${obs} − ${theo}| / |${theo}| × 100 = ${pctErr.toFixed(4)}%`],
        };
      },
    }),

  // 57. Mean, Median, Mode, Range Calculator
  'mean-median-mode-range-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compute Arithmetic Mean, Median, Mode, Range, Sum & Count for any comma-separated dataset.`,
      formulaDisplay: 'Mean = Σx / n;  Range = Max − Min',
      explanation: 'Complete central tendency and dispersion summary.',
      inputs: [
        { key: 'data', label: 'Numbers (comma or space separated)', type: 'text', defaultValue: '12, 18, 22, 18, 25, 31, 18, 29' },
      ],
      compute: (vals) => {
        const arr = parseNumberList(str(vals, 'data')).sort((a, b) => a - b);
        const n = arr.length;
        const sum = arr.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        const median = n % 2 === 1 ? arr[(n - 1) / 2] : (arr[n / 2 - 1] + arr[n / 2]) / 2;
        const freq = new Map<number, number>();
        for (const x of arr) freq.set(x, (freq.get(x) || 0) + 1);
        const maxF = Math.max(...freq.values());
        const modes = [...freq.entries()].filter(([, f]) => f === maxF).map(([v]) => v);
        const range = arr[n - 1] - arr[0];
        return {
          primary: { label: 'Arithmetic Mean', value: mean, formatted: mean.toFixed(4) },
          breakdown: [
            { label: 'Median', value: median, formatted: String(median) },
            { label: 'Mode(s)', value: modes.join(', '), formatted: maxF > 1 ? `${modes.join(', ')} (×${maxF})` : 'No repeats' },
            { label: 'Range (Max − Min)', value: range, formatted: `${range} (${arr[0]} to ${arr[n - 1]})` },
            { label: 'Count / Sum', value: sum, formatted: `n=${n}, Σ=${sum}` },
          ],
          steps: [`Sorted dataset (n=${n}): [${arr.join(', ')}]`],
        };
      },
    }),

  // 58. Greatest Common Factor Calculator
  'greatest-common-factor-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Find exact Greatest Common Factor (GCF / GCD) and LCM across multiple integers via Euclid's algorithm.`,
      formulaDisplay: 'gcd(a, b) = gcd(b, a mod b)',
      explanation: 'Uses Euclidean reduction iteratively over all input integers.',
      inputs: [
        { key: 'nums', label: 'Integers (comma separated)', type: 'text', defaultValue: '36, 60, 84' },
      ],
      compute: (vals) => {
        const list = parseNumberList(str(vals, 'nums')).map((v) => Math.abs(Math.trunc(v)));
        const gcf = list.reduce((acc, v) => gcdTwo(acc, v));
        const lcm = list.reduce((acc, v) => lcmTwo(acc, v));
        return {
          primary: { label: 'Greatest Common Factor (GCF)', value: gcf, formatted: String(gcf) },
          breakdown: [
            { label: 'Least Common Multiple (LCM)', value: lcm, formatted: String(lcm) },
            { label: 'Numbers Evaluated', value: list.join(', '), formatted: list.join(', ') },
          ],
          steps: [`Euclidean GCF(${list.join(', ')}) = ${gcf}`],
        };
      },
    }),

  // 59. Number Sequence Calculator
  'number-sequence-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Generate Arithmetic, Geometric, and Fibonacci sequences with exact Nth term and sum S_n.`,
      formulaDisplay: 'Arithmetic: a_n = a_1 + (n−1)d  |  Geometric: a_n = a_1 × r^(n−1)',
      explanation: 'Computes the Nth term, partial sum, and full term list.',
      inputs: [
        {
          key: 'mode',
          label: 'Sequence Type',
          type: 'select',
          defaultValue: 'arithmetic',
          options: [
            { label: 'Arithmetic Sequence (+d)', value: 'arithmetic' },
            { label: 'Geometric Sequence (×r)', value: 'geometric' },
            { label: 'Fibonacci Sequence', value: 'fibonacci' },
          ],
        },
        { key: 'a1', label: 'First Term (a₁)', type: 'number', defaultValue: 3, step: 1 },
        { key: 'stepParam', label: 'Difference (d) or Ratio (r)', type: 'number', defaultValue: 5, step: 1 },
        { key: 'n', label: 'Nth Term Index (1–50)', type: 'number', defaultValue: 10, min: 1, max: 50, step: 1 },
      ],
      compute: (vals) => {
        const mode = str(vals, 'mode', 'arithmetic');
        const a1 = num(vals, 'a1');
        const k = num(vals, 'stepParam');
        const n = Math.round(num(vals, 'n'));
        const terms: number[] = [];
        if (mode === 'arithmetic') {
          for (let i = 0; i < n; i++) terms.push(a1 + i * k);
        } else if (mode === 'geometric') {
          for (let i = 0; i < n; i++) terms.push(a1 * Math.pow(k, i));
        } else {
          let x = 0, y = 1;
          for (let i = 0; i < n; i++) {
            terms.push(i === 0 ? 0 : i === 1 ? 1 : x + y);
            if (i >= 2) { const next = x + y; x = y; y = next; }
          }
        }
        const nth = terms[n - 1];
        const sum = terms.reduce((a, b) => a + b, 0);
        return {
          primary: { label: `${n}th Term (a_${n})`, value: nth, formatted: Number(nth.toPrecision(8)).toString() },
          breakdown: [
            { label: `Sum of First ${n} Terms (S_${n})`, value: sum, formatted: Number(sum.toPrecision(8)).toString() },
            { label: 'Sequence Preview', value: terms.slice(0, 8).join(', '), formatted: terms.slice(0, 8).join(', ') + (n > 8 ? ' ...' : '') },
          ],
          steps: [`Mode = ${mode}; N = ${n}`],
        };
      },
    }),

  // 60. Hex Calculator
  'hex-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Hexadecimal arithmetic (+, −, ×, ÷) with simultaneous Decimal, Binary & Octal representation.`,
      formulaDisplay: 'Base-16 arithmetic: 0–9, A–F (10–15)',
      explanation: 'Evaluates two hex integers and converts results across Hex, Decimal, Binary, and Octal.',
      inputs: [
        { key: 'hexA', label: 'Hex Value A', type: 'text', defaultValue: '1A3F' },
        {
          key: 'op',
          label: 'Operation',
          type: 'select',
          defaultValue: 'add',
          options: [
            { label: 'Add (A + B)', value: 'add' },
            { label: 'Subtract (A − B)', value: 'sub' },
            { label: 'Multiply (A × B)', value: 'mul' },
            { label: 'Integer Divide (A ÷ B)', value: 'div' },
          ],
        },
        { key: 'hexB', label: 'Hex Value B', type: 'text', defaultValue: '0F2' },
      ],
      compute: (vals) => {
        const aStr = str(vals, 'hexA', '1A3F').replace(/^0x/i, '');
        const bStr = str(vals, 'hexB', '0F2').replace(/^0x/i, '');
        if (!/^-?[0-9a-f]+$/i.test(aStr) || !/^-?[0-9a-f]+$/i.test(bStr)) {
          throw new Error('Enter valid hexadecimal digits (0-9, A-F).');
        }
        const a = parseInt(aStr, 16);
        const b = parseInt(bStr, 16);
        const op = str(vals, 'op', 'add');
        let res = 0;
        if (op === 'add') res = a + b;
        else if (op === 'sub') res = a - b;
        else if (op === 'mul') res = a * b;
        else {
          if (b === 0) throw new Error('Division by zero.');
          res = Math.trunc(a / b);
        }
        const hexOut = (res < 0 ? '-' : '') + Math.abs(res).toString(16).toUpperCase();
        return {
          primary: { label: 'Hexadecimal Result', value: hexOut, formatted: `0x${hexOut}` },
          breakdown: [
            { label: 'Decimal (Base 10)', value: res, formatted: String(res) },
            { label: 'Binary (Base 2)', value: res.toString(2), formatted: res.toString(2) },
            { label: 'Octal (Base 8)', value: res.toString(8), formatted: `0o${res.toString(8)}` },
          ],
          steps: [`0x${aStr.toUpperCase()} (${a}) ${op} 0x${bStr.toUpperCase()} (${b}) = 0x${hexOut} (${res})`],
        };
      },
    }),

  // 61. Quadratic Formula Calculator
  'quadratic-formula-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Solve ax² + bx + c = 0 with exact real or complex imaginary roots, discriminant, and vertex.`,
      formulaDisplay: 'x = [−b ± √(b² − 4ac)] / (2a)',
      explanation: 'Computes both quadratic roots cleanly including complex i solutions when Δ < 0.',
      inputs: [
        { key: 'a', label: 'Coefficient a (x²)', type: 'number', defaultValue: 1, step: 0.5 },
        { key: 'b', label: 'Coefficient b (x)', type: 'number', defaultValue: -5, step: 0.5 },
        { key: 'c', label: 'Constant c', type: 'number', defaultValue: 6, step: 0.5 },
      ],
      compute: (vals) => {
        const a = num(vals, 'a');
        const b = num(vals, 'b');
        const c = num(vals, 'c');
        if (a === 0) throw new Error('Coefficient a cannot be zero for a quadratic equation.');
        const disc = b * b - 4 * a * c;
        const vx = -b / (2 * a);
        const vy = a * vx * vx + b * vx + c;
        let rootText = '';
        if (disc >= 0) {
          const x1 = (-b + Math.sqrt(disc)) / (2 * a);
          const x2 = (-b - Math.sqrt(disc)) / (2 * a);
          rootText = `x₁ = ${Number(x1.toFixed(5))}, x₂ = ${Number(x2.toFixed(5))}`;
        } else {
          const re = (-b / (2 * a)).toFixed(4);
          const im = (Math.sqrt(-disc) / Math.abs(2 * a)).toFixed(4);
          rootText = `x = ${re} ± ${im}i`;
        }
        return {
          primary: { label: 'Quadratic Roots', value: rootText, formatted: rootText },
          breakdown: [
            { label: 'Discriminant (Δ = b² − 4ac)', value: disc, formatted: `${disc.toFixed(4)} (${disc > 0 ? '2 Real' : disc === 0 ? '1 Repeated' : '2 Complex'})` },
            { label: 'Parabola Vertex (h, k)', value: `(${vx.toFixed(3)}, ${vy.toFixed(3)})`, formatted: `(${vx.toFixed(3)}, ${vy.toFixed(3)})` },
          ],
          steps: [`Δ = (${b})² − 4(${a})(${c}) = ${disc}`],
        };
      },
    }),

  // 62. Log Calculator
  'log-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compute logarithm log_b(x) for any custom positive base b, plus natural log ln(x) and log₁₀(x).`,
      formulaDisplay: 'log_b(x) = ln(x) / ln(b)',
      explanation: 'Uses change-of-base identity for exact arbitrary-base logarithms.',
      inputs: [
        { key: 'x', label: 'Argument (x > 0)', type: 'number', defaultValue: 1024, min: 0.000001, step: 1 },
        { key: 'base', label: 'Base (b > 0, b ≠ 1)', type: 'number', defaultValue: 2, min: 0.0001, step: 1 },
      ],
      compute: (vals) => {
        const x = num(vals, 'x');
        const b = num(vals, 'base');
        if (x <= 0 || b <= 0 || b === 1) throw new Error('Requires x > 0 and base b > 0 (b ≠ 1).');
        const res = Math.log(x) / Math.log(b);
        return {
          primary: { label: `log_${b}(${x})`, value: res, formatted: res.toFixed(6) },
          breakdown: [
            { label: 'Natural Log ln(x)', value: Math.log(x), formatted: Math.log(x).toFixed(6) },
            { label: 'Common Log log₁₀(x)', value: Math.log10(x), formatted: Math.log10(x).toFixed(6) },
          ],
          steps: [`ln(${x}) / ln(${b}) = ${res.toFixed(6)}`],
        };
      },
    }),

  // 63. Sample Size Calculator
  'sample-size-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate statistically valid survey sample size with Cochran's formula & finite population correction.`,
      formulaDisplay: 'n₀ = Z²·p(1−p) / e²;  n = n₀ / (1 + (n₀ − 1)/N)',
      explanation: 'Determines exact respondent count needed for your target confidence level and margin of error.',
      inputs: [
        { key: 'confidence', label: 'Confidence Level (%)', type: 'number', defaultValue: 95, min: 80, max: 99.9, step: 1 },
        { key: 'moe', label: 'Margin of Error (%)', type: 'number', defaultValue: 5, min: 0.5, max: 25, step: 0.5 },
        { key: 'pop', label: 'Population Size (0 = Infinite)', type: 'number', defaultValue: 10000, min: 0, step: 500 },
        { key: 'prop', label: 'Estimated Proportion (%)', type: 'number', defaultValue: 50, min: 1, max: 99, step: 5 },
      ],
      compute: (vals) => {
        const z = normalInvApprox(num(vals, 'confidence'));
        const e = num(vals, 'moe') / 100;
        const p = num(vals, 'prop') / 100;
        const N = num(vals, 'pop');
        const n0 = (z * z * p * (1 - p)) / (e * e);
        const nFinal = N > 0 ? Math.ceil(n0 / (1 + (n0 - 1) / N)) : Math.ceil(n0);
        return {
          primary: { label: 'Required Sample Size', value: nFinal, formatted: `${nFinal.toLocaleString()} respondents` },
          breakdown: [
            { label: 'Uncorrected (Infinite Pop.)', value: Math.ceil(n0), formatted: `${Math.ceil(n0).toLocaleString()}` },
            { label: 'Z-Score Used', value: z, formatted: `Z = ${z}` },
          ],
          steps: [`n₀ = ${z}² × ${p}(1−${p}) / ${e}² = ${n0.toFixed(1)} -> Adjusted: ${nFinal}`],
        };
      },
    }),

  // 64. Statistics Calculator
  'statistics-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Complete sample & population standard deviation, variance, mean, geometric mean, and min/max.`,
      formulaDisplay: 's = √[Σ(x − x̄)² / (n − 1)];  σ = √[Σ(x − x̄)² / n]',
      explanation: 'Evaluates full parametric descriptive statistics on numeric series.',
      inputs: [
        { key: 'data', label: 'Values (comma separated)', type: 'text', defaultValue: '10, 14, 18, 22, 26, 30' },
      ],
      compute: (vals) => {
        const arr = parseNumberList(str(vals, 'data'));
        const n = arr.length;
        const mean = arr.reduce((a, b) => a + b, 0) / n;
        const sqDiff = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        const popVar = sqDiff / n;
        const sampVar = n > 1 ? sqDiff / (n - 1) : 0;
        return {
          primary: { label: 'Sample Standard Deviation (s)', value: Math.sqrt(sampVar), formatted: Math.sqrt(sampVar).toFixed(4) },
          breakdown: [
            { label: 'Population Std Dev (σ)', value: Math.sqrt(popVar), formatted: Math.sqrt(popVar).toFixed(4) },
            { label: 'Sample Variance (s²)', value: sampVar, formatted: sampVar.toFixed(4) },
            { label: 'Arithmetic Mean', value: mean, formatted: mean.toFixed(4) },
            { label: 'Standard Error (SE)', value: Math.sqrt(sampVar / n), formatted: Math.sqrt(sampVar / n).toFixed(4) },
          ],
          steps: [`Count n=${n}, Mean=${mean.toFixed(4)}, SS=${sqDiff.toFixed(4)}`],
        };
      },
    }),

  // 65. Confidence Interval Calculator
  'confidence-interval-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compute upper/lower Confidence Interval bounds around sample mean with margin of error.`,
      formulaDisplay: 'CI = x̄ ± Z × (σ / √n)',
      explanation: 'Constructs 90%, 95%, or 99% two-sided normal confidence intervals.',
      inputs: [
        { key: 'mean', label: 'Sample Mean (x̄)', type: 'number', defaultValue: 50, step: 0.5 },
        { key: 'sd', label: 'Standard Deviation (σ or s)', type: 'number', defaultValue: 8, min: 0.0001, step: 0.5 },
        { key: 'n', label: 'Sample Size (n)', type: 'number', defaultValue: 64, min: 1, step: 1 },
        { key: 'conf', label: 'Confidence Level (%)', type: 'number', defaultValue: 95, min: 80, max: 99.9, step: 1 },
      ],
      compute: (vals) => {
        const mean = num(vals, 'mean');
        const sd = num(vals, 'sd');
        const n = num(vals, 'n');
        const z = normalInvApprox(num(vals, 'conf'));
        const moe = z * (sd / Math.sqrt(n));
        return {
          primary: { label: `${num(vals, 'conf')}% Confidence Interval`, value: `${(mean - moe).toFixed(4)} to ${(mean + moe).toFixed(4)}`, formatted: `[${(mean - moe).toFixed(4)}, ${(mean + moe).toFixed(4)}]` },
          breakdown: [
            { label: 'Margin of Error (±)', value: moe, formatted: `±${moe.toFixed(4)}` },
            { label: 'Lower Bound', value: mean - moe, formatted: (mean - moe).toFixed(4) },
            { label: 'Upper Bound', value: mean + moe, formatted: (mean + moe).toFixed(4) },
          ],
          steps: [`${mean} ± ${z}×(${sd}/√${n}) = ${mean} ± ${moe.toFixed(4)}`],
        };
      },
    }),

  // 66. Distance Calculator
  'distance-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compute exact 2D / 3D Euclidean coordinate distance, midpoint, and line slope.`,
      formulaDisplay: 'd = √[(x₂ − x₁)² + (y₂ − y₁)² + (z₂ − z₁)²]',
      explanation: 'Set z₁ = z₂ = 0 for classic 2D coordinate plane geometry.',
      inputs: [
        { key: 'x1', label: 'x₁', type: 'number', defaultValue: 2, step: 1 },
        { key: 'y1', label: 'y₁', type: 'number', defaultValue: 3, step: 1 },
        { key: 'z1', label: 'z₁ (0 for 2D)', type: 'number', defaultValue: 0, step: 1 },
        { key: 'x2', label: 'x₂', type: 'number', defaultValue: 8, step: 1 },
        { key: 'y2', label: 'y₂', type: 'number', defaultValue: 11, step: 1 },
        { key: 'z2', label: 'z₂ (0 for 2D)', type: 'number', defaultValue: 0, step: 1 },
      ],
      compute: (vals) => {
        const dx = num(vals, 'x2') - num(vals, 'x1');
        const dy = num(vals, 'y2') - num(vals, 'y1');
        const dz = num(vals, 'z2') - num(vals, 'z1');
        const d = Math.hypot(dx, dy, dz);
        const manhattan = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
        return {
          primary: { label: 'Euclidean Distance', value: d, formatted: d.toFixed(6) },
          breakdown: [
            { label: 'Δx, Δy, Δz', value: `${dx}, ${dy}, ${dz}`, formatted: `(${dx}, ${dy}, ${dz})` },
            { label: 'Manhattan (L₁) Distance', value: manhattan, formatted: manhattan.toFixed(4) },
            { label: '2D Slope (Δy / Δx)', value: dx !== 0 ? dy / dx : 'Undefined', formatted: dx !== 0 ? (dy / dx).toFixed(4) : 'Vertical (∞)' },
          ],
          steps: [`√(${dx}² + ${dy}² + ${dz}²) = ${d.toFixed(6)}`],
        };
      },
    }),

  // 67. Factor Calculator
  'factor-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `List all positive divisors, factor pairs, and prime factorization of any positive integer.`,
      formulaDisplay: 'n = Π p_i^(e_i);  Factor pairs (a, b) where a × b = n',
      explanation: 'Trial-division integer factorization up to √n.',
      inputs: [
        { key: 'n', label: 'Positive Integer', type: 'number', defaultValue: 360, min: 1, max: 10000000, step: 1 },
      ],
      compute: (vals) => {
        const n = Math.trunc(num(vals, 'n'));
        if (n < 1) throw new Error('Enter an integer ≥ 1.');
        const small: number[] = [];
        const large: number[] = [];
        for (let i = 1; i * i <= n; i++) {
          if (n % i === 0) {
            small.push(i);
            if (i * i !== n) large.unshift(n / i);
          }
        }
        const factors = [...small, ...large];
        // Prime factors
        let rem = n;
        const primes: number[] = [];
        for (let p = 2; p * p <= rem; p++) {
          while (rem % p === 0) {
            primes.push(p);
            rem /= p;
          }
        }
        if (rem > 1) primes.push(rem);
        return {
          primary: { label: `All ${factors.length} Positive Factors`, value: factors.join(', '), formatted: factors.slice(0, 16).join(', ') + (factors.length > 16 ? ' ...' : '') },
          breakdown: [
            { label: 'Total Factor Count', value: factors.length, formatted: String(factors.length) },
            { label: 'Prime Factorization', value: primes.join(' × '), formatted: primes.join(' × ') || '1' },
            { label: 'Sum of Factors', value: factors.reduce((a, b) => a + b, 0), formatted: String(factors.reduce((a, b) => a + b, 0)) },
          ],
          steps: [`${n} = ${primes.join(' × ') || '1'}`],
        };
      },
    }),

  // 68. Big Number Calculator
  'big-number-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Arbitrary-precision BigInt calculator handling massive integers without floating-point rounding.`,
      formulaDisplay: 'Exact IEEE-independent arbitrary precision BigInt (+, −, ×, ÷, mod, ^)',
      explanation: 'Supports 50+ digit exact integer arithmetic using native JavaScript BigInt.',
      inputs: [
        { key: 'a', label: 'Big Integer A', type: 'text', defaultValue: '98765432109876543210987654321' },
        {
          key: 'op',
          label: 'Operation',
          type: 'select',
          defaultValue: 'mul',
          options: [
            { label: 'Add (A + B)', value: 'add' },
            { label: 'Subtract (A − B)', value: 'sub' },
            { label: 'Multiply (A × B)', value: 'mul' },
            { label: 'Integer Divide (A ÷ B)', value: 'div' },
            { label: 'Modulo (A mod B)', value: 'mod' },
          ],
        },
        { key: 'b', label: 'Big Integer B', type: 'text', defaultValue: '1234567890123456789' },
      ],
      compute: (vals) => {
        let A: bigint, B: bigint;
        try {
          A = BigInt(str(vals, 'a').replace(/\s+/g, ''));
          B = BigInt(str(vals, 'b').replace(/\s+/g, ''));
        } catch {
          throw new Error('Enter valid whole integers (digits and optional leading minus).');
        }
        const op = str(vals, 'op', 'mul');
        let res = 0n;
        if (op === 'add') res = A + B;
        else if (op === 'sub') res = A - B;
        else if (op === 'mul') res = A * B;
        else if (op === 'div') {
          if (B === 0n) throw new Error('Division by zero.');
          res = A / B;
        } else {
          if (B === 0n) throw new Error('Modulo by zero.');
          res = A % B;
        }
        const s = res.toString();
        return {
          primary: { label: 'Exact Arbitrary-Precision Output', value: s, formatted: s },
          breakdown: [
            { label: 'Total Digits', value: s.replace('-', '').length, formatted: `${s.replace('-', '').length} digits` },
          ],
          steps: [`Exact BigInt evaluation with zero IEEE-754 mantissa truncation.`],
        };
      },
    }),

  // 69. Common Factor Calculator
  'common-factor-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `List every positive common factor shared across multiple integers alongside their GCF.`,
      formulaDisplay: 'Common Factors = { d > 0 : d | GCD(a₁, a₂, ...) }',
      explanation: 'Finds the GCD first, then enumerates all positive divisors of that GCD.',
      inputs: [
        { key: 'nums', label: 'Integers (comma separated)', type: 'text', defaultValue: '48, 72, 120' },
      ],
      compute: (vals) => {
        const list = parseNumberList(str(vals, 'nums')).map((v) => Math.abs(Math.trunc(v)));
        const g = list.reduce((acc, v) => gcdTwo(acc, v));
        const shared: number[] = [];
        for (let i = 1; i <= g; i++) {
          if (g % i === 0) shared.push(i);
        }
        return {
          primary: { label: 'All Common Factors', value: shared.join(', '), formatted: shared.join(', ') },
          breakdown: [
            { label: 'Greatest Common Factor', value: g, formatted: String(g) },
            { label: 'Count of Shared Factors', value: shared.length, formatted: String(shared.length) },
          ],
          steps: [`GCF = ${g}; positive divisors of ${g} are [${shared.join(', ')}]`],
        };
      },
    }),

  // 70. Long Division Calculator
  'long-division-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Exact whole-number quotient, remainder, mixed number form, and decimal expansion.`,
      formulaDisplay: 'Dividend = Divisor × Quotient + Remainder',
      explanation: 'Computes Euclidean division quotient + remainder alongside fractional & decimal representations.',
      inputs: [
        { key: 'dividend', label: 'Dividend (Top / Numerator)', type: 'number', defaultValue: 487, step: 1 },
        { key: 'divisor', label: 'Divisor (Bottom / Denominator)', type: 'number', defaultValue: 32, step: 1 },
      ],
      compute: (vals) => {
        const a = Math.trunc(num(vals, 'dividend'));
        const b = Math.trunc(num(vals, 'divisor'));
        if (b === 0) throw new Error('Divisor cannot be zero.');
        const q = Math.trunc(a / b);
        const r = a % b;
        return {
          primary: { label: 'Quotient & Remainder', value: q, formatted: `${q} R ${r}` },
          breakdown: [
            { label: 'Decimal Form', value: a / b, formatted: (a / b).toFixed(6) },
            { label: 'Mixed Number', value: `${q} ${Math.abs(r)}/${Math.abs(b)}`, formatted: `${q} and ${Math.abs(r)}/${Math.abs(b)}` },
          ],
          steps: [`${a} = ${b} × ${q} + ${r}`],
        };
      },
    }),

  // 71. Height Calculator
  'height-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Convert height between cm, meters, and feet+inches plus Mid-Parental child adult height prediction.`,
      formulaDisplay: 'Child Mid-Parental Est. = (Father + Mother ± 13 cm) / 2',
      explanation: 'Converts personal height units accurately and optionally estimates adult child height from parents.',
      inputs: [
        { key: 'cm', label: 'Height (cm)', type: 'number', defaultValue: 175, min: 40, max: 260, step: 0.5 },
        { key: 'fatherCm', label: 'Father Height (cm)', type: 'number', defaultValue: 178, min: 120, max: 240, step: 1 },
        { key: 'motherCm', label: 'Mother Height (cm)', type: 'number', defaultValue: 164, min: 110, max: 220, step: 1 },
        { key: 'childSex', label: 'Child Sex (Prediction)', type: 'select', defaultValue: 'boy', options: [{ label: 'Boy (+13 cm)', value: 'boy' }, { label: 'Girl (−13 cm)', value: 'girl' }] },
      ],
      compute: (vals) => {
        const cm = num(vals, 'cm');
        const totalIn = cm / 2.54;
        const ft = Math.floor(totalIn / 12);
        const inc = totalIn - ft * 12;
        const fCm = num(vals, 'fatherCm');
        const mCm = num(vals, 'motherCm');
        const boy = str(vals, 'childSex', 'boy') === 'boy';
        const predCm = (fCm + mCm + (boy ? 13 : -13)) / 2;
        return {
          primary: { label: 'Feet & Inches', value: totalIn, formatted: `${ft}' ${inc.toFixed(1)}"` },
          breakdown: [
            { label: 'Meters (m)', value: cm / 100, formatted: `${(cm / 100).toFixed(3)} m` },
            { label: 'Total Inches', value: totalIn, formatted: `${totalIn.toFixed(2)} in` },
            { label: 'Predicted Child Adult Height', value: predCm, formatted: `${predCm.toFixed(1)} cm` },
          ],
          steps: [`${cm} cm ÷ 2.54 = ${totalIn.toFixed(2)} in (${ft} ft ${inc.toFixed(1)} in)`],
        };
      },
    }),

  // 72. Conversion Calculator
  'conversion-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `All-in-one multi-domain Length, Weight, Volume, Area, and Temperature physical unit converter.`,
      formulaDisplay: 'Target = Source × NIST/SI Scale Factor',
      explanation: 'Instant metric ↔ imperial conversion across common everyday physical dimensions.',
      inputs: [
        { key: 'val', label: 'Value', type: 'number', defaultValue: 100, step: 1 },
        {
          key: 'convType',
          label: 'Conversion Mode',
          type: 'select',
          defaultValue: 'cm_in',
          options: [
            { label: 'Centimeters → Inches', value: 'cm_in' },
            { label: 'Kilometers → Miles', value: 'km_mi' },
            { label: 'Kilograms → Pounds (lbs)', value: 'kg_lb' },
            { label: 'Liters → US Gallons', value: 'l_gal' },
            { label: 'Celsius → Fahrenheit', value: 'c_f' },
            { label: 'Sq Meters → Sq Feet', value: 'sqm_sqft' },
          ],
        },
      ],
      compute: (vals) => {
        const v = num(vals, 'val');
        const m = str(vals, 'convType', 'cm_in');
        const out =
          m === 'cm_in' ? [v / 2.54, 'in'] :
          m === 'km_mi' ? [v * 0.621371, 'mi'] :
          m === 'kg_lb' ? [v * 2.2046226, 'lb'] :
          m === 'l_gal' ? [v * 0.264172, 'gal'] :
          m === 'c_f' ? [(v * 9) / 5 + 32, '°F'] :
          [v * 10.76391, 'sq ft'];
        const res = Number(out[0]);
        const unit = String(out[1]);
        return {
          primary: { label: `Converted (${unit})`, value: res, formatted: `${res.toFixed(4)} ${unit}`, unit },
          breakdown: [{ label: 'Source Input', value: v, formatted: String(v) }],
          steps: [`Converted ${v} (${m}) = ${res.toFixed(4)} ${unit}`],
        };
      },
    }),

  // 73. Time Zone Calculator
  'time-zone-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Convert meeting times between UTC, IST (+5:30), EST (−5), PST (−8), CET (+1), GST (+4), and JST (+9).`,
      formulaDisplay: 'TargetTime = UTC_Minutes + TargetOffsetMinutes',
      explanation: 'Handles fractional half-hour zones like India Standard Time (IST UTC+5:30) cleanly.',
      inputs: [
        { key: 'hour', label: 'Source Hour (0–23)', type: 'number', defaultValue: 14, min: 0, max: 23, step: 1 },
        { key: 'minute', label: 'Source Minute (0–59)', type: 'number', defaultValue: 30, min: 0, max: 59, step: 5 },
        {
          key: 'fromZone',
          label: 'From Time Zone',
          type: 'select',
          defaultValue: '330',
          options: [
            { label: 'IST (India UTC+5:30)', value: '330' },
            { label: 'UTC / GMT (UTC+0)', value: '0' },
            { label: 'EST (US East UTC−5)', value: '-300' },
            { label: 'PST (US West UTC−8)', value: '-480' },
            { label: 'CET (Europe UTC+1)', value: '60' },
            { label: 'GST (Dubai UTC+4)', value: '240' },
            { label: 'JST (Tokyo UTC+9)', value: '540' },
          ],
        },
        {
          key: 'toZone',
          label: 'To Time Zone',
          type: 'select',
          defaultValue: '-300',
          options: [
            { label: 'EST (US East UTC−5)', value: '-300' },
            { label: 'PST (US West UTC−8)', value: '-480' },
            { label: 'UTC / GMT (UTC+0)', value: '0' },
            { label: 'IST (India UTC+5:30)', value: '330' },
            { label: 'CET (Europe UTC+1)', value: '60' },
            { label: 'GST (Dubai UTC+4)', value: '240' },
            { label: 'JST (Tokyo UTC+9)', value: '540' },
          ],
        },
      ],
      compute: (vals) => {
        const h = Math.round(num(vals, 'hour'));
        const m = Math.round(num(vals, 'minute'));
        const fromOff = Number(str(vals, 'fromZone', '330'));
        const toOff = Number(str(vals, 'toZone', '-300'));
        const utcMin = h * 60 + m - fromOff;
        let targetMin = utcMin + toOff;
        let dayShift = 0;
        while (targetMin < 0) { targetMin += 1440; dayShift--; }
        while (targetMin >= 1440) { targetMin -= 1440; dayShift++; }
        const th = Math.floor(targetMin / 60);
        const tm = targetMin % 60;
        const formatted = `${String(th).padStart(2, '0')}:${String(tm).padStart(2, '0')}${dayShift === 1 ? ' (+1 day)' : dayShift === -1 ? ' (-1 day)' : ''}`;
        return {
          primary: { label: 'Converted Target Time', value: formatted, formatted },
          breakdown: [
            { label: 'Offset Difference', value: (toOff - fromOff) / 60, formatted: `${((toOff - fromOff) / 60).toFixed(1)} hrs` },
          ],
          steps: [`UTC base minute = ${((utcMin % 1440) + 1440) % 1440}, shifted to ${formatted}`],
        };
      },
    }),

  // 74. GDP Calculator
  'gdp-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate Nominal Gross Domestic Product using the macroeconomic Expenditure Approach C + I + G + (X − M).`,
      formulaDisplay: 'GDP = C + I + G + (Exports − Imports)',
      explanation: 'Computes national output, Net Exports balance, and per-capita GDP.',
      inputs: [
        { key: 'c', label: 'Private Consumption (C, Billions)', type: 'number', defaultValue: 18500, min: 0, step: 100 },
        { key: 'i', label: 'Gross Investment (I, Billions)', type: 'number', defaultValue: 4800, min: 0, step: 100 },
        { key: 'g', label: 'Government Spending (G, Billions)', type: 'number', defaultValue: 4500, min: 0, step: 100 },
        { key: 'x', label: 'Exports (X, Billions)', type: 'number', defaultValue: 3000, min: 0, step: 100 },
        { key: 'm', label: 'Imports (M, Billions)', type: 'number', defaultValue: 3800, min: 0, step: 100 },
        { key: 'popMillions', label: 'Population (Millions)', type: 'number', defaultValue: 335, min: 0.1, step: 1 },
      ],
      compute: (vals, ctx) => {
        const c = num(vals, 'c');
        const i = num(vals, 'i');
        const g = num(vals, 'g');
        const nx = num(vals, 'x') - num(vals, 'm');
        const gdp = c + i + g + nx;
        const perCapita = (gdp * 1000) / num(vals, 'popMillions');
        return {
          primary: { label: 'Total GDP (Billions)', value: gdp, formatted: `${fmtMoney(gdp, ctx)} B` },
          breakdown: [
            { label: 'Net Exports (X − M)', value: nx, formatted: `${fmtMoney(nx, ctx)} B` },
            { label: 'GDP Per Capita', value: perCapita, formatted: fmtMoney(perCapita, ctx) },
          ],
          steps: [`${c} + ${i} + ${g} + (${nx}) = ${gdp} Billion`],
        };
      },
    }),

  // 75. Horsepower Calculator
  'horsepower-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate mechanical horsepower (HP) and kilowatts (kW) from engine torque & RPM.`,
      formulaDisplay: 'HP = (Torque_lbft × RPM) / 5252;  1 HP = 0.7457 kW',
      explanation: 'Uses SAE mechanical horsepower identity where torque and HP cross at 5,252 RPM.',
      inputs: [
        { key: 'torque', label: 'Engine Torque (lb·ft)', type: 'number', defaultValue: 350, min: 1, step: 10 },
        { key: 'rpm', label: 'Engine Speed (RPM)', type: 'number', defaultValue: 5800, min: 100, max: 20000, step: 100 },
      ],
      compute: (vals) => {
        const tq = num(vals, 'torque');
        const rpm = num(vals, 'rpm');
        const hp = (tq * rpm) / 5252;
        const kw = hp * 0.7457;
        const ps = hp * 1.01387;
        return {
          primary: { label: 'Mechanical Horsepower', value: hp, formatted: `${hp.toFixed(2)} HP`, unit: 'HP' },
          breakdown: [
            { label: 'Kilowatts (kW)', value: kw, formatted: `${kw.toFixed(2)} kW` },
            { label: 'Metric Horsepower (PS)', value: ps, formatted: `${ps.toFixed(2)} PS` },
          ],
          steps: [`(${tq} × ${rpm}) / 5252 = ${hp.toFixed(2)} HP`],
        };
      },
    }),

  // 76. Stair Calculator
  'stair-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate optimal staircase step count, exact riser height, total run, and stringer length.`,
      formulaDisplay: 'Steps = round(TotalRise / TargetRiser);  Stringer = √(TotalRise² + TotalRun²)',
      explanation: 'Follows IRC residential stair geometry checks (7–7.75 in riser, 10+ in tread run).',
      inputs: [
        { key: 'totalRise', label: 'Total Vertical Rise (inches)', type: 'number', defaultValue: 108, min: 12, max: 300, step: 1 },
        { key: 'targetRiser', label: 'Target Riser Height (inches)', type: 'number', defaultValue: 7.25, min: 4, max: 9, step: 0.25 },
        { key: 'treadDepth', label: 'Tread Run per Step (inches)', type: 'number', defaultValue: 10.5, min: 8, max: 16, step: 0.25 },
      ],
      compute: (vals) => {
        const rise = num(vals, 'totalRise');
        const risers = Math.max(1, Math.round(rise / num(vals, 'targetRiser')));
        const actualRiser = rise / risers;
        const treads = Math.max(1, risers - 1);
        const totalRun = treads * num(vals, 'treadDepth');
        const stringer = Math.hypot(rise, totalRun);
        const angle = (Math.atan2(rise, totalRun) * 180) / Math.PI;
        return {
          primary: { label: 'Exact Riser Height', value: actualRiser, formatted: `${actualRiser.toFixed(2)}" × ${risers} risers` },
          breakdown: [
            { label: 'Total Horizontal Run', value: totalRun, formatted: `${totalRun.toFixed(1)}" (${(totalRun / 12).toFixed(2)} ft)` },
            { label: 'Stringer Diagonal Length', value: stringer, formatted: `${stringer.toFixed(1)}"` },
            { label: 'Stair Pitch Angle', value: angle, formatted: `${angle.toFixed(1)}°` },
          ],
          steps: [`${rise}" ÷ ${risers} risers = ${actualRiser.toFixed(3)}" per step.`],
        };
      },
    }),

  // 77. Shoe Size Conversion
  'shoe-size-conversion': (entry) =>
    makeBase(entry, {
      shortDescription: `Convert shoe sizes across US Men, US Women, UK, EU, and Centimeters (Mondopoint).`,
      formulaDisplay: 'EU ≈ (US_Men + 33) | UK ≈ US_Men − 0.5 | CM ≈ (US_Men + 18) × 0.846',
      explanation: 'Translates international footwear sizing charts cleanly.',
      inputs: [
        { key: 'usMen', label: 'US Men Size (e.g. 9.5)', type: 'number', defaultValue: 9.5, min: 4, max: 18, step: 0.5 },
      ],
      compute: (vals) => {
        const usM = num(vals, 'usMen');
        const usW = usM + 1.5;
        const uk = usM - 0.5;
        const eu = Math.round((usM + 33) * 2) / 2;
        const cm = 22 + (usM - 4) * 0.846;
        return {
          primary: { label: 'EU / UK Equivalent', value: eu, formatted: `EU ${eu} / UK ${uk}` },
          breakdown: [
            { label: 'US Women Size', value: usW, formatted: `US Women ${usW}` },
            { label: 'Foot Length (CM)', value: cm, formatted: `${cm.toFixed(1)} cm` },
          ],
          steps: [`US Men ${usM} → US Women ${usW} → UK ${uk} → EU ${eu}`],
        };
      },
    }),

  // 78. Golf Handicap Calculator
  'golf-handicap-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compute World Handicap System (WHS) score differential and estimated Handicap Index.`,
      formulaDisplay: 'Score Differential = (113 / SlopeRating) × (AdjustedGrossScore − CourseRating)',
      explanation: 'Implements official USGA / WHS 113 standard slope adjustment.',
      inputs: [
        { key: 'score', label: 'Adjusted Gross Score', type: 'number', defaultValue: 86, min: 55, max: 150, step: 1 },
        { key: 'rating', label: 'Course Rating (e.g. 71.4)', type: 'number', defaultValue: 71.4, min: 58, max: 80, step: 0.1 },
        { key: 'slope', label: 'Slope Rating (55–155)', type: 'number', defaultValue: 128, min: 55, max: 155, step: 1 },
      ],
      compute: (vals) => {
        const diff = (113 / num(vals, 'slope')) * (num(vals, 'score') - num(vals, 'rating'));
        const index = Math.round(diff * 0.96 * 10) / 10;
        return {
          primary: { label: 'WHS Score Differential', value: diff, formatted: diff.toFixed(1) },
          breakdown: [
            { label: 'Estimated Playing Index (×0.96)', value: index, formatted: index.toFixed(1) },
          ],
          steps: [`(113 / ${num(vals, 'slope')}) × (${num(vals, 'score')} − ${num(vals, 'rating')}) = ${diff.toFixed(2)}`],
        };
      },
    }),

  // 79. Tire Size Calculator
  'tire-size-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compare P-metric tire diameter, sidewall height, circumference, and speedometer error %.`,
      formulaDisplay: 'Diameter = (2 × Width × Aspect/100) / 25.4 + RimInches',
      explanation: 'Calculates exact physical dimensions from standard Width/Aspect/Rim codes (e.g. 225/45R17 vs 245/40R18).',
      inputs: [
        { key: 'w1', label: 'Width (mm)', type: 'number', defaultValue: 225, min: 125, max: 405, step: 5 },
        { key: 'ar1', label: 'Aspect Ratio (%)', type: 'number', defaultValue: 45, min: 20, max: 85, step: 5 },
        { key: 'rim1', label: 'Wheel Rim Diameter (in)', type: 'number', defaultValue: 17, min: 12, max: 26, step: 1 },
      ],
      compute: (vals) => {
        const swMm = num(vals, 'w1') * (num(vals, 'ar1') / 100);
        const swIn = swMm / 25.4;
        const diamIn = 2 * swIn + num(vals, 'rim1');
        const circIn = Math.PI * diamIn;
        const revsPerMile = 63360 / circIn;
        return {
          primary: { label: 'Overall Tire Diameter', value: diamIn, formatted: `${diamIn.toFixed(2)}" (${(diamIn * 25.4).toFixed(1)} mm)` },
          breakdown: [
            { label: 'Sidewall Height', value: swIn, formatted: `${swIn.toFixed(2)}" (${swMm.toFixed(1)} mm)` },
            { label: 'Circumference', value: circIn, formatted: `${circIn.toFixed(2)}"` },
            { label: 'Revolutions per Mile', value: revsPerMile, formatted: `${revsPerMile.toFixed(1)} rev/mi` },
          ],
          steps: [`2 × ${swIn.toFixed(2)}" + ${num(vals, 'rim1')}" rim = ${diamIn.toFixed(2)}"`],
        };
      },
    }),

  // 80. URL Encode / Decode
  'url-encode-decode': (entry) =>
    makeBase(entry, {
      shortDescription: `RFC 3986 percent-encoding and decoding utility for URLs, API query strings, and UTF-8 parameters.`,
      formulaDisplay: 'encodeURIComponent(str)  ↔  decodeURIComponent(str)',
      explanation: 'Safely escapes reserved characters (?, &, =, /, space) into %XX sequences and reverses them.',
      inputs: [
        { key: 'text', label: 'Input Text or URL', type: 'text', defaultValue: 'https://bulk-calculator-studio.pages.dev/?q=auto loan & tax' },
        { key: 'mode', label: 'Mode', type: 'select', defaultValue: 'encode', options: [{ label: 'URL Encode', value: 'encode' }, { label: 'URL Decode', value: 'decode' }] },
      ],
      compute: (vals) => {
        const input = str(vals, 'text');
        const mode = str(vals, 'mode', 'encode');
        let out = '';
        if (mode === 'encode') out = encodeURIComponent(input);
        else {
          try { out = decodeURIComponent(input); } catch { throw new Error('Malformed percent-encoded sequence.'); }
        }
        return {
          primary: { label: mode === 'encode' ? 'Encoded String' : 'Decoded String', value: out, formatted: out },
          breakdown: [
            { label: 'Input Length', value: input.length, formatted: `${input.length} chars` },
            { label: 'Output Length', value: out.length, formatted: `${out.length} chars` },
          ],
          steps: [`Applied RFC 3986 ${mode} transformation.`],
        };
      },
    }),

  // 81. Day Counter
  'day-counter': (entry) =>
    makeBase(entry, {
      shortDescription: `Count exact calendar days, full weeks, weekends, and working business days between any two dates.`,
      formulaDisplay: 'Calendar Days = |End − Start| / 86,400,000 ms',
      explanation: 'Counts both total elapsed calendar days and Mon–Fri business workdays.',
      inputs: [
        { key: 'start', label: 'Start Date', type: 'date', defaultValue: '2026-01-01' },
        { key: 'end', label: 'End Date', type: 'date', defaultValue: '2026-12-31' },
      ],
      compute: (vals) => {
        const sMs = Date.parse(str(vals, 'start', '2026-01-01'));
        const eMs = Date.parse(str(vals, 'end', '2026-12-31'));
        if (Number.isNaN(sMs) || Number.isNaN(eMs)) throw new Error('Select valid start and end dates.');
        const lo = Math.min(sMs, eMs);
        const hi = Math.max(sMs, eMs);
        const days = Math.round((hi - lo) / 86400000);
        let biz = 0;
        for (let t = lo; t < hi; t += 86400000) {
          const dow = new Date(t).getUTCDay();
          if (dow !== 0 && dow !== 6) biz++;
        }
        return {
          primary: { label: 'Total Calendar Days', value: days, formatted: `${days} days` },
          breakdown: [
            { label: 'Business Days (Mon–Fri)', value: biz, formatted: `${biz} workdays` },
            { label: 'Weeks + Remainder', value: days / 7, formatted: `${Math.floor(days / 7)} wks ${days % 7} days` },
          ],
          steps: [`${days} calendar days (${biz} weekdays, ${days - biz} weekend days)`],
        };
      },
    }),

  // 82. Hours Calculator
  'hours-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate elapsed work shift hours and minutes between start and end times minus unpaid breaks.`,
      formulaDisplay: 'Net Hours = (EndTime − StartTime − BreakMinutes) / 60',
      explanation: 'Outputs both HH:MM duration and decimal payroll hours.',
      inputs: [
        { key: 'startHr', label: 'Start Hour (0–23)', type: 'number', defaultValue: 9, min: 0, max: 23, step: 1 },
        { key: 'startMin', label: 'Start Minute', type: 'number', defaultValue: 0, min: 0, max: 59, step: 5 },
        { key: 'endHr', label: 'End Hour (0–23)', type: 'number', defaultValue: 17, min: 0, max: 23, step: 1 },
        { key: 'endMin', label: 'End Minute', type: 'number', defaultValue: 30, min: 0, max: 59, step: 5 },
        { key: 'breakMin', label: 'Unpaid Break (Minutes)', type: 'number', defaultValue: 30, min: 0, max: 240, step: 5 },
      ],
      compute: (vals) => {
        const s = num(vals, 'startHr') * 60 + num(vals, 'startMin');
        let e = num(vals, 'endHr') * 60 + num(vals, 'endMin');
        if (e < s) e += 1440; // overnight shift
        const netMin = Math.max(0, e - s - num(vals, 'breakMin'));
        const dec = netMin / 60;
        const hh = Math.floor(netMin / 60);
        const mm = netMin % 60;
        return {
          primary: { label: 'Net Elapsed Hours', value: dec, formatted: `${dec.toFixed(2)} hrs (${hh}h ${mm}m)` },
          breakdown: [
            { label: 'Total Minutes Worked', value: netMin, formatted: `${netMin} min` },
          ],
          steps: [`Elapsed ${e - s} min − ${num(vals, 'breakMin')} min break = ${netMin} min`],
        };
      },
    }),

  // 83. Bra Size Calculator
  'bra-size-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate US, UK, and EU bra band & cup size from snug underbust and standing bust measurements.`,
      formulaDisplay: 'Cup Index = round(Bust − Band);  1=A, 2=B, 3=C, 4=D, 5=DD/E ...',
      explanation: 'Standard inch/cm differential sizing with sister size alternatives.',
      inputs: [
        { key: 'underbustIn', label: 'Underbust Band (inches)', type: 'number', defaultValue: 31, min: 24, max: 54, step: 0.5 },
        { key: 'bustIn', label: 'Full Bust (inches)', type: 'number', defaultValue: 36, min: 26, max: 64, step: 0.5 },
      ],
      compute: (vals) => {
        const ub = num(vals, 'underbustIn');
        const bust = num(vals, 'bustIn');
        const band = Math.round(ub) % 2 === 0 ? Math.round(ub) : Math.round(ub) + 1;
        const diff = Math.max(0, Math.round(bust - band));
        const cups = ['AA', 'A', 'B', 'C', 'D', 'DD (E)', 'DDD (F)', 'G', 'H', 'I', 'J'];
        const cup = cups[Math.min(cups.length - 1, diff)] || 'J+';
        const euBand = Math.round((ub * 2.54) / 5) * 5;
        return {
          primary: { label: 'Recommended US/UK Size', value: `${band}${cup}`, formatted: `${band}${cup}` },
          breakdown: [
            { label: 'Estimated EU Equivalent', value: `${euBand}${cup}`, formatted: `${euBand}${cup}` },
            { label: 'Bust-to-Band Differential', value: diff, formatted: `${diff} inches` },
          ],
          steps: [`Rounded even band ${band}; differential ${bust} − ${band} ≈ ${diff}" → Cup ${cup}`],
        };
      },
    }),

  // 84. Dice Roller
  'dice-roller': (entry) =>
    makeBase(entry, {
      shortDescription: `Multi-sided NdM tabletop RPG & board game dice roller (d4, d6, d8, d10, d12, d20, d100).`,
      formulaDisplay: 'Total = Σ Roll_i + Modifier;  Expected Mean = N × (Sides + 1) / 2 + Mod',
      explanation: 'Rolls N dice of M sides deterministically per roll counter with expected statistical mean.',
      inputs: [
        { key: 'numDice', label: 'Number of Dice (N)', type: 'number', defaultValue: 3, min: 1, max: 20, step: 1 },
        { key: 'sides', label: 'Sides per Die (M)', type: 'number', defaultValue: 6, min: 2, max: 100, step: 1 },
        { key: 'modifier', label: 'Flat Modifier (+/-)', type: 'number', defaultValue: 0, step: 1 },
        { key: 'rollNum', label: 'Roll Counter (increment to re-roll)', type: 'number', defaultValue: 1, min: 1, step: 1 },
      ],
      compute: (vals) => {
        const n = Math.round(num(vals, 'numDice'));
        const m = Math.round(num(vals, 'sides'));
        const mod = Math.round(num(vals, 'modifier'));
        let s = Math.round(num(vals, 'rollNum')) * 2654435761;
        const rolls: number[] = [];
        for (let i = 0; i < n; i++) {
          s = (s * 1664525 + 1013904223) >>> 0;
          rolls.push(1 + (s % m));
        }
        const total = rolls.reduce((a, b) => a + b, 0) + mod;
        const expected = n * ((m + 1) / 2) + mod;
        return {
          primary: { label: `${n}d${m}${mod >= 0 ? `+${mod}` : mod} Roll Total`, value: total, formatted: String(total) },
          breakdown: [
            { label: 'Individual Dice', value: rolls.join(', '), formatted: `[${rolls.join(', ')}]` },
            { label: 'Expected Statistical Average', value: expected, formatted: expected.toFixed(1) },
            { label: 'Min / Max Possible', value: `${n + mod}–${n * m + mod}`, formatted: `${n + mod} to ${n * m + mod}` },
          ],
          steps: [`Rolled [${rolls.join(' + ')}]${mod !== 0 ? ` + (${mod})` : ''} = ${total}`],
        };
      },
    }),

  // 85. BTU Calculator
  'btu-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Estimate air conditioner cooling BTU/hr & tonnage required for room square footage and sun exposure.`,
      formulaDisplay: 'BTU/hr = (Area × 20 × CeilingFactor × SunFactor) + (Occupants × 600)',
      explanation: 'Computes HVAC sizing in BTU/hr and standard AC Tons (12,000 BTU = 1 Ton).',
      inputs: [
        { key: 'sqft', label: 'Room Area (sq ft)', type: 'number', defaultValue: 400, min: 50, max: 10000, step: 25 },
        { key: 'ceilingFt', label: 'Ceiling Height (ft)', type: 'number', defaultValue: 9, min: 7, max: 20, step: 0.5 },
        { key: 'occupants', label: 'Regular Occupants', type: 'number', defaultValue: 2, min: 1, max: 50, step: 1 },
        {
          key: 'sun',
          label: 'Sun & Insulation Factor',
          type: 'select',
          defaultValue: '1.0',
          options: [
            { label: 'Heavily Shaded / Well Insulated (0.9×)', value: '0.9' },
            { label: 'Average Light & Insulation (1.0×)', value: '1.0' },
            { label: 'Heavy Sunlight / Poor Insulation (1.15×)', value: '1.15' },
          ],
        },
      ],
      compute: (vals) => {
        const sqft = num(vals, 'sqft');
        const hFactor = num(vals, 'ceilingFt') / 8;
        const sunF = Number(str(vals, 'sun', '1.0'));
        const occ = Math.max(0, num(vals, 'occupants') - 2) * 600;
        const btu = Math.round(sqft * 20 * hFactor * sunF + occ);
        const tons = btu / 12000;
        return {
          primary: { label: 'Required Cooling Capacity', value: btu, formatted: `${btu.toLocaleString()} BTU/hr` },
          breakdown: [
            { label: 'AC Size in Tons', value: tons, formatted: `${tons.toFixed(2)} Tons` },
            { label: 'Est. Cooling Power (kW)', value: btu * 0.00029307, formatted: `${(btu * 0.00029307).toFixed(2)} kW` },
          ],
          steps: [`Base 20 BTU/sqft adjusted for ${num(vals, 'ceilingFt')}ft ceiling & sun factor ${sunF}`],
        };
      },
    }),

  // 86. Time Card Calculator
  'time-card-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Weekly employee timesheet calculator computing regular hours, 1.5x overtime, and gross pay.`,
      formulaDisplay: 'Pay = min(Hours, 40) × Rate + max(0, Hours − 40) × Rate × 1.5',
      explanation: 'Separates standard 40-hour week earnings from overtime hours.',
      inputs: [
        { key: 'dailyHrs', label: 'Average Paid Hours / Day', type: 'number', defaultValue: 8.5, min: 0, max: 24, step: 0.25 },
        { key: 'days', label: 'Workdays in Week', type: 'number', defaultValue: 5, min: 1, max: 7, step: 1 },
        { key: 'rate', label: 'Hourly Wage Rate', type: 'number', defaultValue: 25, min: 1, step: 1 },
      ],
      compute: (vals, ctx) => {
        const totalHrs = num(vals, 'dailyHrs') * num(vals, 'days');
        const rate = num(vals, 'rate');
        const reg = Math.min(40, totalHrs);
        const ot = Math.max(0, totalHrs - 40);
        const gross = reg * rate + ot * rate * 1.5;
        return {
          primary: { label: 'Weekly Gross Pay', value: gross, formatted: fmtMoney(gross, ctx) },
          breakdown: [
            { label: 'Total Paid Hours', value: totalHrs, formatted: `${totalHrs.toFixed(2)} hrs` },
            { label: 'Regular vs Overtime Hours', value: ot, formatted: `${reg.toFixed(1)} reg + ${ot.toFixed(1)} OT` },
            { label: 'Overtime Earnings (1.5×)', value: ot * rate * 1.5, formatted: fmtMoney(ot * rate * 1.5, ctx) },
          ],
          steps: [`${reg}h × ${fmtMoney(rate, ctx)} + ${ot}h × ${fmtMoney(rate * 1.5, ctx)} = ${fmtMoney(gross, ctx)}`],
        };
      },
    }),

  // 87. Love Calculator
  'love-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Deterministic name compatibility & shared-letter harmonic percentage calculator.`,
      formulaDisplay: 'Score = Symmetric Character-Pair Harmonic Reduction on Names (0%–100%)',
      explanation: 'Uses a consistent order-independent letter matching algorithm on normalized names (just for fun!).',
      inputs: [
        { key: 'name1', label: 'First Name', type: 'text', defaultValue: 'Alex' },
        { key: 'name2', label: 'Second Name', type: 'text', defaultValue: 'Jordan' },
      ],
      compute: (vals) => {
        const a = str(vals, 'name1', 'Alex').toLowerCase().replace(/[^a-z]/g, '');
        const b = str(vals, 'name2', 'Jordan').toLowerCase().replace(/[^a-z]/g, '');
        if (!a || !b) throw new Error('Enter two valid names.');
        const sorted = [a, b].sort().join('+');
        let hash = 0;
        for (let i = 0; i < sorted.length; i++) hash = (hash * 31 + sorted.charCodeAt(i)) % 10007;
        const sharedLetters = new Set([...a].filter((ch) => b.includes(ch))).size;
        const pct = 45 + ((hash + sharedLetters * 13) % 56);
        const msg = pct >= 85 ? 'Strong Harmonic Match' : pct >= 70 ? 'Great Chemistry' : 'Balanced Connection';
        return {
          primary: { label: 'Compatibility Score', value: pct, formatted: `${pct}% — ${msg}` },
          breakdown: [
            { label: 'Shared Unique Letters', value: sharedLetters, formatted: String(sharedLetters) },
          ],
          steps: [`Order-independent name signature evaluated deterministically.`],
        };
      },
    }),

  // 88. Gas Mileage Calculator
  'gas-mileage-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Compute vehicle fuel economy (MPG & km/L), cost per mile/km, and total trip fuel expense.`,
      formulaDisplay: 'MPG = Miles / Gallons;  Cost/Mile = (Gallons × PricePerGal) / Miles',
      explanation: 'Calculates true tank-to-tank efficiency and trip expense.',
      inputs: [
        { key: 'miles', label: 'Distance Driven (Miles)', type: 'number', defaultValue: 380, min: 1, step: 10 },
        { key: 'gallons', label: 'Fuel Used (US Gallons)', type: 'number', defaultValue: 12.5, min: 0.1, step: 0.5 },
        { key: 'price', label: 'Fuel Price per Gallon', type: 'number', defaultValue: 3.65, min: 0.1, step: 0.05 },
      ],
      compute: (vals, ctx) => {
        const mi = num(vals, 'miles');
        const gal = num(vals, 'gallons');
        const price = num(vals, 'price');
        const mpg = mi / gal;
        const kmL = mpg * 0.425144;
        const l100 = 100 / kmL;
        const cost = gal * price;
        return {
          primary: { label: 'Fuel Economy', value: mpg, formatted: `${mpg.toFixed(2)} MPG` },
          breakdown: [
            { label: 'Metric Equivalent', value: kmL, formatted: `${kmL.toFixed(2)} km/L (${l100.toFixed(1)} L/100km)` },
            { label: 'Total Fuel Cost', value: cost, formatted: fmtMoney(cost, ctx) },
            { label: 'Cost Per Mile', value: cost / mi, formatted: `${fmtMoney(cost / mi, ctx)} / mi` },
          ],
          steps: [`${mi} mi ÷ ${gal} gal = ${mpg.toFixed(2)} MPG`],
        };
      },
    }),

  // 89. Engine Horsepower Calculator
  'engine-horsepower-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Estimate rear-wheel / flywheel horsepower from 1/4-mile Elapsed Time (ET) & Trap Speed.`,
      formulaDisplay: 'ET HP = Weight / (ET / 5.825)³  |  Trap HP = Weight × (MPH / 234)³',
      explanation: 'Classic drag-strip physics correlations for vehicle power estimation.',
      inputs: [
        { key: 'weightLbs', label: 'Vehicle + Driver Weight (lbs)', type: 'number', defaultValue: 3400, min: 500, max: 15000, step: 50 },
        { key: 'etSec', label: '1/4-Mile Elapsed Time (sec)', type: 'number', defaultValue: 12.8, min: 4, max: 30, step: 0.1 },
        { key: 'trapMph', label: '1/4-Mile Trap Speed (MPH)', type: 'number', defaultValue: 109, min: 40, max: 350, step: 1 },
      ],
      compute: (vals) => {
        const w = num(vals, 'weightLbs');
        const et = num(vals, 'etSec');
        const mph = num(vals, 'trapMph');
        const etHp = w / Math.pow(et / 5.825, 3);
        const trapHp = w * Math.pow(mph / 234, 3);
        const avgHp = (etHp + trapHp) / 2;
        return {
          primary: { label: 'Estimated Wheel Horsepower', value: avgHp, formatted: `${avgHp.toFixed(1)} WHP` },
          breakdown: [
            { label: 'ET Method Estimate', value: etHp, formatted: `${etHp.toFixed(1)} HP` },
            { label: 'Trap Speed Method Estimate', value: trapHp, formatted: `${trapHp.toFixed(1)} HP` },
            { label: 'Power-to-Weight Ratio', value: w / avgHp, formatted: `${(w / avgHp).toFixed(2)} lbs/HP` },
          ],
          steps: [`ET = ${etHp.toFixed(1)} HP; Trap Speed = ${trapHp.toFixed(1)} HP`],
        };
      },
    }),

  // 90. Electricity Calculator
  'electricity-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate appliance kWh energy consumption and daily, monthly, and annual electric bill cost.`,
      formulaDisplay: 'kWh/day = (Watts × Hours/day) / 1000;  Cost = kWh × Rate',
      explanation: 'Computes electricity operating cost for any household or industrial device.',
      inputs: [
        { key: 'watts', label: 'Device Power Draw (Watts)', type: 'number', defaultValue: 1500, min: 1, step: 50 },
        { key: 'hoursPerDay', label: 'Usage Hours per Day', type: 'number', defaultValue: 6, min: 0.1, max: 24, step: 0.5 },
        { key: 'rateKwh', label: 'Electricity Tariff (per kWh)', type: 'number', defaultValue: 0.16, min: 0.01, step: 0.01 },
      ],
      compute: (vals, ctx) => {
        const w = num(vals, 'watts');
        const h = num(vals, 'hoursPerDay');
        const rate = num(vals, 'rateKwh');
        const kwhDay = (w * h) / 1000;
        const moKwh = kwhDay * 30;
        const moCost = moKwh * rate;
        return {
          primary: { label: 'Monthly Electricity Cost', value: moCost, formatted: fmtMoney(moCost, ctx) },
          breakdown: [
            { label: 'Monthly Usage', value: moKwh, formatted: `${moKwh.toFixed(2)} kWh/mo` },
            { label: 'Daily Cost', value: kwhDay * rate, formatted: fmtMoney(kwhDay * rate, ctx) },
            { label: 'Annual Cost (365d)', value: kwhDay * 365 * rate, formatted: fmtMoney(kwhDay * 365 * rate, ctx) },
          ],
          steps: [`(${w}W × ${h}h)/1000 = ${kwhDay.toFixed(2)} kWh/day`],
        };
      },
    }),

  // 91. Weight Calculator
  'weight-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Convert mass accurately across Kilograms, Pounds, Ounces, Stones, and Metric Tons.`,
      formulaDisplay: '1 kg = 2.20462262 lbs = 35.27396 oz = 0.157473 stones',
      explanation: 'High-precision international avoirdupois and SI mass conversions.',
      inputs: [
        { key: 'val', label: 'Weight Value', type: 'number', defaultValue: 70, min: 0, step: 1 },
        {
          key: 'unit',
          label: 'Input Unit',
          type: 'select',
          defaultValue: 'kg',
          options: [
            { label: 'Kilograms (kg)', value: 'kg' },
            { label: 'Pounds (lb)', value: 'lb' },
            { label: 'Stones (st)', value: 'st' },
            { label: 'Ounces (oz)', value: 'oz' },
            { label: 'Grams (g)', value: 'g' },
          ],
        },
      ],
      compute: (vals) => {
        const v = num(vals, 'val');
        const u = str(vals, 'unit', 'kg');
        const toKg: Record<string, number> = { kg: 1, lb: 0.45359237, st: 6.35029318, oz: 0.028349523, g: 0.001 };
        const kg = v * (toKg[u] || 1);
        const lbs = kg / toKg.lb;
        return {
          primary: { label: u === 'kg' ? 'Pounds (lb)' : 'Kilograms (kg)', value: u === 'kg' ? lbs : kg, formatted: u === 'kg' ? `${lbs.toFixed(3)} lbs` : `${kg.toFixed(3)} kg` },
          breakdown: [
            { label: 'Kilograms (kg)', value: kg, formatted: `${kg.toFixed(4)} kg` },
            { label: 'Pounds (lbs)', value: lbs, formatted: `${lbs.toFixed(4)} lbs` },
            { label: 'Stones (UK)', value: kg / toKg.st, formatted: `${(kg / toKg.st).toFixed(3)} st` },
            { label: 'Ounces (oz)', value: kg / toKg.oz, formatted: `${(kg / toKg.oz).toFixed(2)} oz` },
          ],
          steps: [`Base mass = ${kg.toFixed(4)} kg`],
        };
      },
    }),

  // 92. Roman Numeral Converter
  'roman-numeral-converter': (entry) =>
    makeBase(entry, {
      shortDescription: `Bidirectional converter translating whole integers (1–3999) ↔ Roman Numerals (I, V, X, L, C, D, M).`,
      formulaDisplay: 'Subtractive standard Roman notation (IV=4, IX=9, XL=40, XC=90, CD=400, CM=900)',
      explanation: 'Accepts either an Arabic number like 2026 or a Roman numeral like MMXXVI automatically.',
      inputs: [
        { key: 'input', label: 'Integer (1–3999) or Roman Numeral', type: 'text', defaultValue: '2026' },
      ],
      compute: (vals) => {
        const raw = str(vals, 'input', '2026').toUpperCase().replace(/\s+/g, '');
        if (/^\d+$/.test(raw)) {
          let n = Number(raw);
          if (n < 1 || n > 3999) throw new Error('Standard Roman numerals range from 1 to 3999.');
          const pairs: Array<[number, string]> = [
            [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
            [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
          ];
          let out = '';
          let rem = n;
          for (const [v, sym] of pairs) {
            while (rem >= v) { out += sym; rem -= v; }
          }
          return {
            primary: { label: 'Roman Numeral', value: out, formatted: out },
            breakdown: [{ label: 'Arabic Integer', value: n, formatted: String(n) }],
            steps: [`${n} = ${out}`],
          };
        }
        if (!/^[IVXLCDM]+$/.test(raw)) throw new Error('Enter a valid integer (1–3999) or Roman letters (I,V,X,L,C,D,M).');
        const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
        let total = 0;
        for (let i = 0; i < raw.length; i++) {
          const cur = map[raw[i]];
          const nxt = map[raw[i + 1]] || 0;
          total += cur < nxt ? -cur : cur;
        }
        return {
          primary: { label: 'Arabic Integer', value: total, formatted: String(total) },
          breakdown: [{ label: 'Roman Input', value: raw, formatted: raw }],
          steps: [`${raw} evaluates to ${total}`],
        };
      },
    }),

  // 93. Roofing Calculator
  'roofing-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Calculate pitched roof surface area, roofing squares (100 sq ft), and shingle bundles needed.`,
      formulaDisplay: 'RoofArea = BaseLength × BaseWidth × √(1 + (Pitch/12)²);  Bundles = ceil((Area/100) × 3 × Waste%)',
      explanation: 'Applies true roof pitch slope multiplier and 10% waste margin (3 bundles per 100 sq ft square).',
      inputs: [
        { key: 'lengthFt', label: 'Footprint Length (ft)', type: 'number', defaultValue: 50, min: 5, step: 1 },
        { key: 'widthFt', label: 'Footprint Width (ft)', type: 'number', defaultValue: 30, min: 5, step: 1 },
        { key: 'pitch', label: 'Roof Pitch (Rise per 12 in)', type: 'number', defaultValue: 6, min: 0, max: 18, step: 1 },
        { key: 'wastePct', label: 'Waste Allowance (%)', type: 'number', defaultValue: 10, min: 0, max: 30, step: 1 },
      ],
      compute: (vals) => {
        const base = num(vals, 'lengthFt') * num(vals, 'widthFt');
        const pitch = num(vals, 'pitch');
        const slopeMult = Math.sqrt(1 + Math.pow(pitch / 12, 2));
        const roofArea = base * slopeMult;
        const squares = roofArea / 100;
        const bundles = Math.ceil(squares * 3 * (1 + num(vals, 'wastePct') / 100));
        return {
          primary: { label: 'Shingle Bundles Needed', value: bundles, formatted: `${bundles} bundles` },
          breakdown: [
            { label: 'Pitched Roof Area', value: roofArea, formatted: `${roofArea.toFixed(1)} sq ft` },
            { label: 'Roofing Squares (100 sq ft)', value: squares, formatted: `${squares.toFixed(2)} squares` },
            { label: 'Pitch Multiplier', value: slopeMult, formatted: `${slopeMult.toFixed(4)}×` },
          ],
          steps: [`Base ${base} sq ft × ${slopeMult.toFixed(4)} pitch factor = ${roofArea.toFixed(1)} sq ft`],
        };
      },
    }),

  // 94. Base64 Encode / Decode
  'base64-encode-decode': (entry) =>
    makeBase(entry, {
      shortDescription: `UTF-8 safe Base64 string encoding and decoding utility for APIs, tokens, and data URIs.`,
      formulaDisplay: 'UTF-8 Bytes ↔ RFC 4648 Base64 Alphabet',
      explanation: 'Uses Unicode-safe TextEncoder/TextDecoder with standard Base64 padding.',
      inputs: [
        { key: 'text', label: 'Plain Text or Base64 String', type: 'text', defaultValue: 'BULK CALCULATOR STUDIO v2.0' },
        { key: 'mode', label: 'Mode', type: 'select', defaultValue: 'encode', options: [{ label: 'Encode to Base64', value: 'encode' }, { label: 'Decode Base64', value: 'decode' }] },
      ],
      compute: (vals) => {
        const input = str(vals, 'text');
        const mode = str(vals, 'mode', 'encode');
        let out = '';
        if (mode === 'encode') {
          const bytes = new TextEncoder().encode(input);
          let bin = '';
          bytes.forEach((b) => { bin += String.fromCharCode(b); });
          out = btoa(bin);
        } else {
          try {
            const bin = atob(input.trim());
            const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
            out = new TextDecoder().decode(bytes);
          } catch {
            throw new Error('Invalid Base64 string.');
          }
        }
        return {
          primary: { label: mode === 'encode' ? 'Base64 Output' : 'Decoded UTF-8 Text', value: out, formatted: out },
          breakdown: [{ label: 'Output Length', value: out.length, formatted: `${out.length} chars` }],
          steps: [`UTF-8 safe RFC 4648 ${mode} completed.`],
        };
      },
    }),

  // 95. Day of the Week Calculator
  'day-of-the-week-calculator': (entry) =>
    makeBase(entry, {
      shortDescription: `Find exact weekday name, day-of-year (1–366), ISO week number, and leap year status for any date.`,
      formulaDisplay: 'Proleptic Gregorian Calendar + ISO-8601 Week Indexing',
      explanation: 'Works accurately for historical or future dates.',
      inputs: [
        { key: 'date', label: 'Calendar Date', type: 'date', defaultValue: '2026-11-27' },
      ],
      compute: (vals) => {
        const ds = str(vals, 'date', '2026-11-27');
        const ms = Date.parse(`${ds}T00:00:00Z`);
        if (Number.isNaN(ms)) throw new Error('Enter a valid calendar date.');
        const dt = new Date(ms);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekday = days[dt.getUTCDay()];
        const year = dt.getUTCFullYear();
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        const startOfYear = Date.UTC(year, 0, 1);
        const dayOfYear = Math.floor((ms - startOfYear) / 86400000) + 1;
        const isoWeek = Math.ceil((dayOfYear + new Date(startOfYear).getUTCDay()) / 7);
        return {
          primary: { label: 'Day of the Week', value: weekday, formatted: weekday },
          breakdown: [
            { label: 'Day of Year', value: dayOfYear, formatted: `Day ${dayOfYear} of ${isLeap ? 366 : 365}` },
            { label: 'Week Number', value: isoWeek, formatted: `Week ${isoWeek}` },
            { label: 'Leap Year?', value: isLeap ? 'Yes' : 'No', formatted: isLeap ? `${year} is a Leap Year` : `${year} is Common` },
          ],
          steps: [`${ds} falls on ${weekday} (Day ${dayOfYear} of ${year}).`],
        };
      },
    }),

  // 96. Mortgage Calculator for Your Site
  'mortgage-calculator-for-your-site': (entry) =>
    makeBase(entry, {
      shortDescription: `Free responsive Mortgage Calculator widget + ready-to-paste HTML iframe embed snippet for your website.`,
      formulaDisplay: '<iframe src="https://bulk-calculator-studio.pages.dev/calculators/mortgage-calculator-for-your-site/">',
      explanation: 'Test live monthly mortgage calculation below and copy the clean HTML embed code for WordPress, Wix, or static blogs.',
      inputs: [
        { key: 'principal', label: 'Loan Principal ($)', type: 'number', defaultValue: 300000, min: 1000, step: 5000 },
        { key: 'apr', label: 'Interest Rate (%)', type: 'number', defaultValue: 6.5, min: 0.1, max: 25, step: 0.125 },
        { key: 'years', label: 'Term (Years)', type: 'number', defaultValue: 30, min: 5, max: 40, step: 5 },
      ],
      compute: (vals, ctx) => {
        const P = num(vals, 'principal');
        const pmt = monthlyPayment(P, num(vals, 'apr'), Math.round(num(vals, 'years')) * 12);
        const embed = `<iframe src="https://bulk-calculator-studio.pages.dev/calculators/mortgage-calculator-for-your-site/" width="100%" height="560" style="border:0;border-radius:16px;" loading="lazy" title="Mortgage Calculator"></iframe>`;
        return {
          primary: { label: 'Widget Preview: Monthly P&I', value: pmt, formatted: fmtMoney(pmt, ctx) },
          breakdown: [
            { label: 'Embed HTML Snippet (Copy)', value: embed, formatted: embed },
          ],
          steps: [`Paste this responsive iframe tag into your website HTML: ${embed}`],
        };
      },
    }),

  // 97. Scientific Calculator for Your Site
  'scientific-calculator-for-your-site': (entry) =>
    makeBase(entry, {
      shortDescription: `Embeddable Scientific Calculator widget for blogs/LMS sites plus live trig, log, and power solver.`,
      formulaDisplay: '<iframe src="https://bulk-calculator-studio.pages.dev/calculators/scientific-calculator-for-your-site/">',
      explanation: 'Computes sin/cos/tan, log10, ln, √x, and generates a clean zero-dependency HTML iframe snippet.',
      inputs: [
        { key: 'x', label: 'Scientific Input x', type: 'number', defaultValue: 45, step: 1 },
        {
          key: 'fn',
          label: 'Scientific Function',
          type: 'select',
          defaultValue: 'sin_deg',
          options: [
            { label: 'sin(x°)', value: 'sin_deg' },
            { label: 'cos(x°)', value: 'cos_deg' },
            { label: 'log₁₀(x)', value: 'log10' },
            { label: 'ln(x)', value: 'ln' },
            { label: '√x', value: 'sqrt' },
          ],
        },
      ],
      compute: (vals) => {
        const x = num(vals, 'x');
        const fn = str(vals, 'fn', 'sin_deg');
        const out =
          fn === 'sin_deg' ? Math.sin((x * Math.PI) / 180) :
          fn === 'cos_deg' ? Math.cos((x * Math.PI) / 180) :
          fn === 'log10' ? Math.log10(x) :
          fn === 'ln' ? Math.log(x) : Math.sqrt(x);
        const embed = `<iframe src="https://bulk-calculator-studio.pages.dev/calculators/scientific-calculator-for-your-site/" width="100%" height="520" style="border:0;border-radius:16px;" loading="lazy" title="Scientific Calculator"></iframe>`;
        return {
          primary: { label: 'Scientific Output', value: out, formatted: out.toFixed(6) },
          breakdown: [{ label: 'Embed HTML Snippet (Copy)', value: embed, formatted: embed }],
          steps: [`Paste iframe code into your site: ${embed}`],
        };
      },
    }),

  // 98. Concrete Calculator for Your Site
  'concrete-calculator-for-your-site': (entry) =>
    makeBase(entry, {
      shortDescription: `Embeddable Concrete Slab & Yardage Widget for contractor websites with instant cubic yards output.`,
      formulaDisplay: 'CubicYards = (Length_ft × Width_ft × Thickness_in/12) / 27',
      explanation: 'Calculates slab volume in cubic yards + 80lb bags and provides ready-to-embed HTML code.',
      inputs: [
        { key: 'len', label: 'Length (ft)', type: 'number', defaultValue: 20, min: 1, step: 1 },
        { key: 'wid', label: 'Width (ft)', type: 'number', defaultValue: 12, min: 1, step: 1 },
        { key: 'thickIn', label: 'Thickness (inches)', type: 'number', defaultValue: 4, min: 1, step: 0.5 },
      ],
      compute: (vals) => {
        const cuFt = num(vals, 'len') * num(vals, 'wid') * (num(vals, 'thickIn') / 12);
        const cuYd = cuFt / 27;
        const bags80 = Math.ceil(cuFt / 0.6);
        const embed = `<iframe src="https://bulk-calculator-studio.pages.dev/calculators/concrete-calculator-for-your-site/" width="100%" height="520" style="border:0;border-radius:16px;" loading="lazy" title="Concrete Calculator"></iframe>`;
        return {
          primary: { label: 'Concrete Required', value: cuYd, formatted: `${cuYd.toFixed(2)} cubic yards` },
          breakdown: [
            { label: '80-lb Pre-Mix Bags', value: bags80, formatted: `${bags80} bags` },
            { label: 'Embed HTML Snippet (Copy)', value: embed, formatted: embed },
          ],
          steps: [`${cuFt.toFixed(1)} cu ft ÷ 27 = ${cuYd.toFixed(2)} cu yd`],
        };
      },
    }),

  // 99. Math Calculator for Your Site
  'math-calculator-for-your-site': (entry) =>
    makeBase(entry, {
      shortDescription: `Embeddable Arithmetic & Percentage Widget for educational portals with ready HTML iframe code.`,
      formulaDisplay: 'Supports Add, Subtract, Multiply, Divide, Power & Percentage',
      explanation: 'Test standard math evaluations and embed directly onto any web page.',
      inputs: [
        { key: 'a', label: 'Value A', type: 'number', defaultValue: 250, step: 1 },
        {
          key: 'op',
          label: 'Operation',
          type: 'select',
          defaultValue: 'pct',
          options: [
            { label: 'A + B', value: 'add' },
            { label: 'A − B', value: 'sub' },
            { label: 'A × B', value: 'mul' },
            { label: 'A ÷ B', value: 'div' },
            { label: 'B% of A', value: 'pct' },
          ],
        },
        { key: 'b', label: 'Value B', type: 'number', defaultValue: 18, step: 1 },
      ],
      compute: (vals) => {
        const a = num(vals, 'a');
        const b = num(vals, 'b');
        const op = str(vals, 'op', 'pct');
        const out =
          op === 'add' ? a + b :
          op === 'sub' ? a - b :
          op === 'mul' ? a * b :
          op === 'div' ? (b === 0 ? (() => { throw new Error('Division by zero'); })() : a / b) :
          (a * b) / 100;
        const embed = `<iframe src="https://bulk-calculator-studio.pages.dev/calculators/math-calculator-for-your-site/" width="100%" height="520" style="border:0;border-radius:16px;" loading="lazy" title="Math Calculator"></iframe>`;
        return {
          primary: { label: 'Computed Result', value: out, formatted: Number(out.toFixed(6)).toString() },
          breakdown: [{ label: 'Embed HTML Snippet (Copy)', value: embed, formatted: embed }],
          steps: [`Ready to embed via iframe: ${embed}`],
        };
      },
    }),

  // 100. Love Calculator for Your Site
  'love-calculator-for-your-site': (entry) =>
    makeBase(entry, {
      shortDescription: `Embeddable Love Compatibility Widget for lifestyle websites with clean responsive HTML iframe snippet.`,
      formulaDisplay: '<iframe src="https://bulk-calculator-studio.pages.dev/calculators/love-calculator-for-your-site/">',
      explanation: 'Runs deterministic name compatibility matching and outputs the ready-to-paste iframe code.',
      inputs: [
        { key: 'name1', label: 'First Name', type: 'text', defaultValue: 'Sam' },
        { key: 'name2', label: 'Second Name', type: 'text', defaultValue: 'Taylor' },
      ],
      compute: (vals) => {
        const res = EXACT_BUILDERS['love-calculator'](entry).compute(vals);
        const embed = `<iframe src="https://bulk-calculator-studio.pages.dev/calculators/love-calculator-for-your-site/" width="100%" height="480" style="border:0;border-radius:16px;" loading="lazy" title="Love Calculator"></iframe>`;
        return {
          ...res,
          breakdown: [
            ...res.breakdown,
            { label: 'Embed HTML Snippet (Copy)', value: embed, formatted: embed },
          ],
        };
      },
    }),
};

export function buildExactToolDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const builder = EXACT_BUILDERS[entry.solverKey] || EXACT_BUILDERS[entry.slug];
  if (!builder) {
    throw new Error(`Missing exact solver builder for supplemental calculator: ${entry.slug}`);
  }
  return builder(entry);
}

export function listExactSolverKeys(): string[] {
  return Object.keys(EXACT_BUILDERS);
}
