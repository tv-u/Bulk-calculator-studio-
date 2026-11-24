import type { CalculatorDefinition } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import { formatCurrency, formatIndianCompact, formatNumber } from '../formatters';

export const FINANCE_CALCULATORS: CalculatorDefinition[] = [
  {
    id: 'emi',
    name: 'EMI & Loan Amortization Calculator',
    shortDescription: 'Calculate monthly EMI, total interest payable, and year-by-year amortization schedule.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['emi', 'loan', 'home loan', 'car loan', 'mortgage', 'installment', 'amortization'],
    synonyms: ['monthly payment', 'home loan emi', 'personal loan', 'auto loan'],
    formulaDisplay: 'EMI = P × r × (1 + r)ⁿ / ((1 + r)ⁿ - 1)',
    explanation: 'Calculates Equated Monthly Installment using reducing-balance monthly compounding and builds an annual principal vs interest schedule.',
    inputs: [
      { key: 'principal', label: 'Loan Principal Amount', type: 'number', defaultValue: 2500000, min: 1, step: 1000, unit: '₹/$' },
      { key: 'rate', label: 'Annual Interest Rate', type: 'number', defaultValue: 8.5, min: 0, max: 60, step: 0.1, unit: '% p.a.' },
      { key: 'years', label: 'Loan Tenure', type: 'number', defaultValue: 20, min: 1, max: 40, step: 1, unit: 'Years' },
    ],
    relatedIds: ['loan-eligibility', 'compound-interest', 'simple-interest', 'sip'],
    compute: (values, ctx) => {
      const P = num(values, 'principal');
      const annualRate = num(values, 'rate');
      const years = num(values, 'years');
      if (P <= 0 || years <= 0 || annualRate < 0) throw new Error('Principal & tenure must be > 0, rate >= 0.');
      const n = Math.round(years * 12);
      const r = annualRate / 12 / 100;
      const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const totalPayment = emi * n;
      const totalInterest = totalPayment - P;

      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';

      // Build annual amortization table & chart
      let balance = P;
      const tableRows: Array<Array<string | number>> = [];
      const chartData: Array<{ label: string; value: number; secondary: number }> = [];
      const totalYears = Math.ceil(n / 12);
      for (let yr = 1; yr <= totalYears; yr++) {
        let yrPrincipal = 0;
        let yrInterest = 0;
        for (let m = 0; m < 12 && (yr - 1) * 12 + m < n; m++) {
          const interestM = balance * r;
          const principalM = Math.min(balance, emi - interestM);
          yrInterest += interestM;
          yrPrincipal += principalM;
          balance = Math.max(0, balance - principalM);
        }
        chartData.push({ label: `Y${yr}`, value: Math.round(yrPrincipal), secondary: Math.round(yrInterest) });
        tableRows.push([
          `Year ${yr}`,
          formatCurrency(yrPrincipal, cur, loc),
          formatCurrency(yrInterest, cur, loc),
          formatCurrency(balance, cur, loc),
        ]);
      }

      return {
        primary: { label: 'Monthly EMI', value: emi, formatted: formatCurrency(emi, cur, loc) },
        breakdown: [
          { label: 'Total Interest Payable', value: totalInterest, formatted: formatCurrency(totalInterest, cur, loc) },
          { label: 'Total Payment (P + I)', value: totalPayment, formatted: formatCurrency(totalPayment, cur, loc) },
          { label: 'Compact Total (India)', value: totalPayment, formatted: formatIndianCompact(totalPayment) },
          { label: 'Interest Ratio', value: (totalInterest / totalPayment) * 100, formatted: `${((totalInterest / totalPayment) * 100).toFixed(2)}%` },
        ],
        steps: [
          `Monthly rate r = ${annualRate}% / 12 = ${(r * 100).toFixed(4)}%, n = ${n} months`,
          `Monthly EMI = ${formatCurrency(emi, cur, loc)}`,
        ],
        chartData,
        chartLabels: { primary: 'Principal Paid', secondary: 'Interest Paid' },
        tableHeaders: ['Year', 'Principal Paid', 'Interest Paid', 'Ending Balance'],
        tableRows,
      };
    },
  },
  {
    id: 'loan-eligibility',
    name: 'Loan Affordability & Eligibility Calculator',
    shortDescription: 'Estimate maximum loan amount eligible based on net monthly income and FOIR.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['loan', 'eligibility', 'affordability', 'foir', 'borrowing power'],
    synonyms: ['max loan amount', 'how much loan can i get'],
    formulaDisplay: 'Max EMI = Income × FOIR% - Existing EMIs  ⇒  Max Loan = PV(Max EMI, r, n)',
    explanation: 'Computes borrowing capacity using standard Fixed Obligation to Income Ratio (FOIR).',
    inputs: [
      { key: 'income', label: 'Net Monthly Income', type: 'number', defaultValue: 100000, min: 1, step: 1000 },
      { key: 'existingEmi', label: 'Existing Monthly EMIs', type: 'number', defaultValue: 10000, min: 0, step: 500 },
      { key: 'foir', label: 'Max FOIR Ratio (%)', type: 'number', defaultValue: 50, min: 10, max: 80, step: 1, unit: '%' },
      { key: 'rate', label: 'Interest Rate (% p.a.)', type: 'number', defaultValue: 8.75, min: 0, max: 40, step: 0.1, unit: '%' },
      { key: 'years', label: 'Tenure (Years)', type: 'number', defaultValue: 20, min: 1, max: 40, step: 1 },
    ],
    relatedIds: ['emi', 'compound-interest', 'gst'],
    compute: (values, ctx) => {
      const income = num(values, 'income');
      const existing = num(values, 'existingEmi');
      const foir = num(values, 'foir');
      const rate = num(values, 'rate');
      const years = num(values, 'years');
      const maxEmi = Math.max(0, income * (foir / 100) - existing);
      const n = Math.round(years * 12);
      const r = rate / 12 / 100;
      const maxLoan = r === 0 ? maxEmi * n : (maxEmi * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'Maximum Eligible Loan', value: maxLoan, formatted: formatCurrency(maxLoan, cur, loc) },
        breakdown: [
          { label: 'Affordable Monthly EMI', value: maxEmi, formatted: formatCurrency(maxEmi, cur, loc) },
          { label: 'Compact Estimate', value: maxLoan, formatted: formatIndianCompact(maxLoan) },
        ],
        steps: [`Affordable EMI = (${income} × ${foir}%) - ${existing} = ${maxEmi}`, `PV over ${n} months at ${rate}% = ${formatCurrency(maxLoan, cur, loc)}`],
      };
    },
  },
  {
    id: 'compound-interest',
    name: 'Compound Interest Calculator',
    shortDescription: 'Calculate compounded growth across yearly, half-yearly, quarterly, or monthly intervals.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['compound interest', 'ci', 'compounding', 'growth', 'wealth'],
    synonyms: ['interest compounding', 'ci calculator'],
    formulaDisplay: 'A = P × (1 + r / n)^(n × t)',
    explanation: 'Computes future value and earned compound interest across configurable compounding frequencies.',
    inputs: [
      { key: 'principal', label: 'Principal (P)', type: 'number', defaultValue: 100000, min: 0, step: 1000 },
      { key: 'rate', label: 'Annual Interest Rate (r)', type: 'number', defaultValue: 10, min: 0, max: 100, step: 0.1, unit: '%' },
      { key: 'years', label: 'Time Period (t)', type: 'number', defaultValue: 10, min: 1, max: 60, step: 1, unit: 'Years' },
      {
        key: 'freq',
        label: 'Compounding Frequency (n)',
        type: 'select',
        defaultValue: '4',
        options: [
          { label: 'Yearly (1/yr)', value: '1' },
          { label: 'Half-Yearly (2/yr)', value: '2' },
          { label: 'Quarterly (4/yr)', value: '4' },
          { label: 'Monthly (12/yr)', value: '12' },
        ],
      },
    ],
    relatedIds: ['simple-interest', 'fd', 'sip', 'cagr'],
    compute: (values, ctx) => {
      const P = num(values, 'principal');
      const rPct = num(values, 'rate');
      const t = num(values, 'years');
      const n = Number(str(values, 'freq', '4'));
      const r = rPct / 100;
      const amount = P * Math.pow(1 + r / n, n * t);
      const interest = amount - P;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      const chartData = Array.from({ length: Math.min(30, Math.ceil(t)) }, (_, i) => {
        const yr = i + 1;
        const val = P * Math.pow(1 + r / n, n * yr);
        return { label: `Y${yr}`, value: Math.round(P), secondary: Math.round(val - P) };
      });
      return {
        primary: { label: 'Maturity Amount (A)', value: amount, formatted: formatCurrency(amount, cur, loc) },
        breakdown: [
          { label: 'Total Compound Interest', value: interest, formatted: formatCurrency(interest, cur, loc) },
          { label: 'Effective Annual Yield (EAR)', value: (Math.pow(1 + r / n, n) - 1) * 100, formatted: `${((Math.pow(1 + r / n, n) - 1) * 100).toFixed(3)}%` },
        ],
        steps: [`A = ${P} × (1 + ${r}/${n})^(${n}×${t}) = ${formatCurrency(amount, cur, loc)}`],
        chartData,
        chartLabels: { primary: 'Principal', secondary: 'Compound Interest' },
      };
    },
  },
  {
    id: 'simple-interest',
    name: 'Simple Interest Calculator',
    shortDescription: 'Calculate linear simple interest and total maturity value over days, months, or years.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['simple interest', 'si', 'interest', 'loan'],
    synonyms: ['si calculator', 'flat interest'],
    formulaDisplay: 'SI = (P × R × T) / 100',
    explanation: 'Computes non-compounding simple interest on principal.',
    inputs: [
      { key: 'principal', label: 'Principal (P)', type: 'number', defaultValue: 50000, min: 0, step: 500 },
      { key: 'rate', label: 'Annual Rate (R %)', type: 'number', defaultValue: 8, min: 0, max: 100, step: 0.1 },
      { key: 'years', label: 'Duration (Years)', type: 'number', defaultValue: 3, min: 0, max: 100, step: 0.25 },
    ],
    relatedIds: ['compound-interest', 'emi', 'fd'],
    compute: (values, ctx) => {
      const P = num(values, 'principal');
      const R = num(values, 'rate');
      const T = num(values, 'years');
      const si = (P * R * T) / 100;
      const total = P + si;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'Simple Interest (SI)', value: si, formatted: formatCurrency(si, cur, loc) },
        breakdown: [
          { label: 'Total Amount (P + SI)', value: total, formatted: formatCurrency(total, cur, loc) },
          { label: 'Monthly Equivalent Interest', value: T > 0 ? si / (T * 12) : 0, formatted: formatCurrency(T > 0 ? si / (T * 12) : 0, cur, loc) },
        ],
        steps: [`SI = (${P} × ${R} × ${T}) / 100 = ${formatCurrency(si, cur, loc)}`],
      };
    },
  },
  {
    id: 'sip',
    name: 'SIP Investment Calculator',
    shortDescription: 'Project Systematic Investment Plan wealth accumulation with monthly compounding and step-up.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['sip', 'mutual fund', 'investment', 'systematic', 'wealth', 'step up'],
    synonyms: ['monthly investment', 'mutual fund sip'],
    formulaDisplay: 'FV = P × [((1 + i)ⁿ - 1) / i] × (1 + i)',
    explanation: 'Models regular monthly investments at an assumed annualized return rate, with optional annual step-up.',
    disclaimer: 'Projections assume a constant mathematical rate of return for illustration only; actual market returns vary and are not guaranteed.',
    inputs: [
      { key: 'monthly', label: 'Monthly Investment (SIP)', type: 'number', defaultValue: 10000, min: 100, step: 500 },
      { key: 'rate', label: 'Expected Annual Return (%)', type: 'number', defaultValue: 12, min: 0, max: 50, step: 0.5 },
      { key: 'years', label: 'Investment Horizon (Years)', type: 'number', defaultValue: 15, min: 1, max: 50, step: 1 },
      { key: 'stepUp', label: 'Annual Step-Up (%)', type: 'number', defaultValue: 0, min: 0, max: 50, step: 1 },
    ],
    relatedIds: ['compound-interest', 'cagr', 'retirement', 'rd'],
    compute: (values, ctx) => {
      let monthly = num(values, 'monthly');
      const annualRate = num(values, 'rate');
      const years = Math.round(num(values, 'years'));
      const stepUp = num(values, 'stepUp', 0);
      if (monthly <= 0 || years <= 0) throw new Error('Monthly amount and years must be > 0.');
      const i = annualRate / 12 / 100;

      let totalInvested = 0;
      let corpus = 0;
      const chartData: Array<{ label: string; value: number; secondary: number }> = [];

      for (let yr = 1; yr <= years; yr++) {
        for (let m = 0; m < 12; m++) {
          totalInvested += monthly;
          corpus = (corpus + monthly) * (1 + i);
        }
        chartData.push({
          label: `Y${yr}`,
          value: Math.round(totalInvested),
          secondary: Math.round(corpus - totalInvested),
        });
        monthly *= 1 + stepUp / 100;
      }

      const gains = corpus - totalInvested;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'Projected Future Value', value: corpus, formatted: formatCurrency(corpus, cur, loc) },
        breakdown: [
          { label: 'Total Invested Capital', value: totalInvested, formatted: formatCurrency(totalInvested, cur, loc) },
          { label: 'Estimated Wealth Gain', value: gains, formatted: formatCurrency(gains, cur, loc) },
          { label: 'Compact Corpus (India)', value: corpus, formatted: formatIndianCompact(corpus) },
        ],
        steps: [`Simulated ${years * 12} monthly installments at ${(i * 100).toFixed(3)}%/mo with ${stepUp}% annual step-up.`],
        chartData,
        chartLabels: { primary: 'Invested', secondary: 'Est. Returns' },
      };
    },
  },
  {
    id: 'fd',
    name: 'FD (Fixed Deposit) Calculator',
    shortDescription: 'Calculate bank Fixed Deposit maturity using Indian quarterly compounding standard.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['fd', 'fixed deposit', 'bank deposit', 'term deposit'],
    synonyms: ['fdr calculator', 'bank fd maturity'],
    formulaDisplay: 'A = P × (1 + r / 4)^(4 × t)',
    explanation: 'Indian commercial banks generally compound Fixed Deposits quarterly.',
    inputs: [
      { key: 'principal', label: 'Deposit Amount', type: 'number', defaultValue: 500000, min: 100, step: 1000 },
      { key: 'rate', label: 'FD Interest Rate (% p.a.)', type: 'number', defaultValue: 7.25, min: 0, max: 25, step: 0.05 },
      { key: 'years', label: 'Tenure (Years)', type: 'number', defaultValue: 5, min: 0.25, max: 30, step: 0.25 },
    ],
    relatedIds: ['rd', 'compound-interest', 'simple-interest'],
    compute: (values, ctx) => {
      const P = num(values, 'principal');
      const rate = num(values, 'rate') / 100;
      const t = num(values, 'years');
      const maturity = P * Math.pow(1 + rate / 4, 4 * t);
      const interest = maturity - P;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'FD Maturity Value', value: maturity, formatted: formatCurrency(maturity, cur, loc) },
        breakdown: [
          { label: 'Interest Earned', value: interest, formatted: formatCurrency(interest, cur, loc) },
          { label: 'Effective Annual Yield', value: (Math.pow(1 + rate / 4, 4) - 1) * 100, formatted: `${((Math.pow(1 + rate / 4, 4) - 1) * 100).toFixed(2)}%` },
        ],
        steps: [`Quarterly compounding (n = 4): ${P} × (1 + ${rate}/4)^(${4 * t}) = ${formatCurrency(maturity, cur, loc)}`],
      };
    },
  },
  {
    id: 'rd',
    name: 'RD (Recurring Deposit) Calculator',
    shortDescription: 'Calculate Recurring Deposit maturity with quarterly compounding on monthly deposits.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['rd', 'recurring deposit', 'post office rd', 'bank rd'],
    synonyms: ['recurring deposit maturity'],
    formulaDisplay: 'M = Σ Monthly Installment × (1 + r/4)^(4 × months_remaining/12)',
    explanation: 'Applies Indian banking quarterly compounding across each monthly installment.',
    inputs: [
      { key: 'monthly', label: 'Monthly RD Deposit', type: 'number', defaultValue: 5000, min: 100, step: 100 },
      { key: 'rate', label: 'Interest Rate (% p.a.)', type: 'number', defaultValue: 6.8, min: 0, max: 25, step: 0.1 },
      { key: 'months', label: 'Tenure (Months)', type: 'number', defaultValue: 36, min: 3, max: 120, step: 3 },
    ],
    relatedIds: ['fd', 'sip', 'compound-interest'],
    compute: (values, ctx) => {
      const mAmt = num(values, 'monthly');
      const r = num(values, 'rate') / 100;
      const months = Math.round(num(values, 'months'));
      let maturity = 0;
      for (let k = 0; k < months; k++) {
        const remYears = (months - k) / 12;
        maturity += mAmt * Math.pow(1 + r / 4, 4 * remYears);
      }
      const invested = mAmt * months;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'RD Maturity Value', value: maturity, formatted: formatCurrency(maturity, cur, loc) },
        breakdown: [
          { label: 'Total Deposited', value: invested, formatted: formatCurrency(invested, cur, loc) },
          { label: 'Interest Earned', value: maturity - invested, formatted: formatCurrency(maturity - invested, cur, loc) },
        ],
        steps: [`Summed ${months} monthly deposits compounded quarterly at ${num(values, 'rate')}% p.a.`],
      };
    },
  },
  {
    id: 'cagr',
    name: 'CAGR Calculator',
    shortDescription: 'Measure Compound Annual Growth Rate from initial value, final value, and years.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['cagr', 'growth rate', 'annualized return', 'investment'],
    synonyms: ['compound annual growth rate', 'annualized growth'],
    formulaDisplay: 'CAGR = (Ending Value / Beginning Value)^(1 / Years) - 1',
    explanation: 'Computes the smoothed geometric annual rate of return over multi-year periods.',
    inputs: [
      { key: 'startVal', label: 'Initial Investment Value', type: 'number', defaultValue: 100000, min: 0.01, step: 100 },
      { key: 'endVal', label: 'Final Value', type: 'number', defaultValue: 225000, min: 0.01, step: 100 },
      { key: 'years', label: 'Duration (Years)', type: 'number', defaultValue: 5, min: 0.1, step: 0.5 },
    ],
    relatedIds: ['roi', 'sip', 'compound-interest'],
    compute: (values, ctx) => {
      const s = num(values, 'startVal');
      const e = num(values, 'endVal');
      const y = num(values, 'years');
      if (s <= 0 || e <= 0 || y <= 0) throw new Error('All CAGR inputs must be positive.');
      const cagr = (Math.pow(e / s, 1 / y) - 1) * 100;
      const absRet = ((e - s) / s) * 100;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'CAGR (% p.a.)', value: cagr, formatted: `${cagr.toFixed(2)}%`, unit: '%' },
        breakdown: [
          { label: 'Absolute Return', value: absRet, formatted: `${absRet.toFixed(2)}%` },
          { label: 'Net Gain', value: e - s, formatted: formatCurrency(e - s, cur, loc) },
        ],
        steps: [`((${e} / ${s})^(1/${y}) - 1) × 100 = ${cagr.toFixed(4)}%`],
      };
    },
  },
  {
    id: 'roi',
    name: 'ROI (Return on Investment) Calculator',
    shortDescription: 'Calculate net profit, ROI percentage, and annualized ROI.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['roi', 'return on investment', 'profit', 'investment'],
    synonyms: ['investment return', 'payback'],
    formulaDisplay: 'ROI = ((Returned - Cost) / Cost) × 100',
    explanation: 'Evaluates efficiency of an investment relative to its cost.',
    inputs: [
      { key: 'cost', label: 'Amount Invested (Cost)', type: 'number', defaultValue: 150000, min: 0.01, step: 100 },
      { key: 'returned', label: 'Final Amount Returned', type: 'number', defaultValue: 210000, min: 0, step: 100 },
    ],
    relatedIds: ['cagr', 'profit-loss', 'break-even' in {} ? 'cagr' : 'discount'],
    compute: (values, ctx) => {
      const cost = num(values, 'cost');
      const ret = num(values, 'returned');
      if (cost <= 0) throw new Error('Invested cost must be > 0.');
      const profit = ret - cost;
      const roi = (profit / cost) * 100;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'Return on Investment (ROI)', value: roi, formatted: `${roi.toFixed(2)}%` },
        breakdown: [
          { label: 'Net Gain / Loss', value: profit, formatted: formatCurrency(profit, cur, loc) },
          { label: 'Return Multiple', value: ret / cost, formatted: `${(ret / cost).toFixed(2)}x` },
        ],
        steps: [`((${ret} - ${cost}) / ${cost}) × 100 = ${roi.toFixed(2)}%`],
      };
    },
  },
  {
    id: 'gst',
    name: 'GST Calculator (India)',
    shortDescription: 'Calculate GST exclusive or inclusive prices with CGST/SGST and IGST split.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['gst', 'tax', 'cgst', 'sgst', 'igst', 'india tax', 'invoice'],
    synonyms: ['goods and services tax', 'gst inclusive', 'gst exclusive'],
    formulaDisplay: 'Exclusive: Total = Base × (1 + r/100)  |  Inclusive: Base = Total / (1 + r/100)',
    explanation: 'Supports standard Indian GST slabs (5%, 12%, 18%, 28%) and splits Intra-State CGST + SGST evenly.',
    assumptions: 'Jurisdiction: India GST Act. Standard slabs shown; verify HSN/SAC classification for exact statutory rates.',
    inputs: [
      { key: 'amount', label: 'Amount', type: 'number', defaultValue: 10000, min: 0, step: 10 },
      {
        key: 'slab',
        label: 'GST Rate (%)',
        type: 'select',
        defaultValue: '18',
        options: [
          { label: '5% GST', value: '5' },
          { label: '12% GST', value: '12' },
          { label: '18% GST (Standard)', value: '18' },
          { label: '28% GST', value: '28' },
        ],
      },
      {
        key: 'mode',
        label: 'Calculation Type',
        type: 'select',
        defaultValue: 'exclusive',
        options: [
          { label: 'Add GST (GST Exclusive)', value: 'exclusive' },
          { label: 'Remove GST (GST Inclusive)', value: 'inclusive' },
        ],
      },
    ],
    relatedIds: ['profit-loss', 'discount', 'income-tax', 'percentage'],
    compute: (values, ctx) => {
      const amount = num(values, 'amount');
      const slab = Number(str(values, 'slab', '18'));
      const mode = str(values, 'mode', 'exclusive');
      let base = amount;
      let gst = 0;
      let total = amount;

      if (mode === 'exclusive') {
        gst = (amount * slab) / 100;
        total = amount + gst;
      } else {
        base = amount / (1 + slab / 100);
        gst = amount - base;
        total = amount;
      }

      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'Total Invoice Amount', value: total, formatted: formatCurrency(total, cur, loc) },
        breakdown: [
          { label: 'Pre-Tax Base Price', value: base, formatted: formatCurrency(base, cur, loc) },
          { label: `Total GST (${slab}%)`, value: gst, formatted: formatCurrency(gst, cur, loc) },
          { label: `CGST (${slab / 2}%) + SGST (${slab / 2}%)`, value: gst / 2, formatted: `${formatCurrency(gst / 2, cur, loc)} each` },
        ],
        steps: [
          mode === 'exclusive'
            ? `GST = ${amount} × ${slab}% = ${formatCurrency(gst, cur, loc)}`
            : `Base = ${amount} / ${(1 + slab / 100).toFixed(2)} = ${formatCurrency(base, cur, loc)}`,
        ],
      };
    },
  },
  {
    id: 'income-tax',
    name: 'Income Tax Estimator (India FY 2025-26)',
    shortDescription: 'Compare New Regime vs Old Regime estimated Indian Income Tax with 4% Cess.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['tax', 'income tax', 'salary', 'new regime', 'old regime', '80c', 'india'],
    synonyms: ['salary tax calculator', 'india income tax', 'tax estimator'],
    formulaDisplay: 'Slab Tax + 4% Health & Education Cess (minus Section 87A rebate where eligible)',
    explanation: 'Compares estimated tax liability under India New Tax Regime (with ₹75,000 standard deduction) vs Old Regime (with ₹50,000 standard deduction + 80C/80D).',
    assumptions: 'Jurisdiction: India · Assessment Year 2026-27 (FY 2025-26 salaried individual < 60 yrs). Excludes surcharge above ₹50 Lakh; informational estimate only.',
    inputs: [
      { key: 'income', label: 'Annual Gross Salary / Income (₹)', type: 'number', defaultValue: 1400000, min: 0, step: 10000 },
      { key: 'deductions', label: 'Old Regime Deductions (80C + 80D + HRA)', type: 'number', defaultValue: 200000, min: 0, step: 5000 },
    ],
    relatedIds: ['gst', 'emi', 'sip', 'retirement'],
    compute: (values) => {
      const gross = num(values, 'income');
      const oldDed = num(values, 'deductions');

      // New Regime FY 2025-26 (Budget 2025 slabs): Std Ded ₹75,000
      const newTaxable = Math.max(0, gross - 75000);
      let newSlabTax = 0;
      const newSlabs: Array<[number, number]> = [
        [400000, 0],
        [400000, 0.05],
        [400000, 0.1],
        [400000, 0.15],
        [400000, 0.2],
        [400000, 0.25],
        [Infinity, 0.3],
      ];
      let rem = newTaxable;
      for (const [limit, rate] of newSlabs) {
        if (rem <= 0) break;
        const slice = Math.min(rem, limit);
        newSlabTax += slice * rate;
        rem -= slice;
      }
      if (newTaxable <= 1200000) newSlabTax = 0; // Sec 87A rebate up to ₹12L taxable
      const newTotalTax = newSlabTax * 1.04;

      // Old Regime: Std Ded ₹50,000 + user deductions
      const oldTaxable = Math.max(0, gross - 50000 - oldDed);
      let oldSlabTax = 0;
      if (oldTaxable > 250000) {
        oldSlabTax += Math.min(oldTaxable - 250000, 250000) * 0.05;
      }
      if (oldTaxable > 500000) {
        oldSlabTax += Math.min(oldTaxable - 500000, 500000) * 0.2;
      }
      if (oldTaxable > 1000000) {
        oldSlabTax += (oldTaxable - 1000000) * 0.3;
      }
      if (oldTaxable <= 500000) oldSlabTax = 0;
      const oldTotalTax = oldSlabTax * 1.04;

      const better = newTotalTax <= oldTotalTax ? 'New Regime' : 'Old Regime';
      const savings = Math.abs(newTotalTax - oldTotalTax);

      return {
        primary: { label: `Recommended (${better})`, value: Math.min(newTotalTax, oldTotalTax), formatted: `${formatCurrency(Math.min(newTotalTax, oldTotalTax), 'INR', 'en-IN')} (${better})` },
        breakdown: [
          { label: 'New Regime Tax (incl. 4% Cess)', value: newTotalTax, formatted: formatCurrency(newTotalTax, 'INR', 'en-IN') },
          { label: 'Old Regime Tax (incl. 4% Cess)', value: oldTotalTax, formatted: formatCurrency(oldTotalTax, 'INR', 'en-IN') },
          { label: 'Estimated Tax Savings', value: savings, formatted: formatCurrency(savings, 'INR', 'en-IN') },
          { label: 'New Regime Net In-Hand / Yr', value: gross - newTotalTax, formatted: formatCurrency(gross - newTotalTax, 'INR', 'en-IN') },
        ],
        steps: [
          `New Regime taxable income = ${formatCurrency(newTaxable, 'INR', 'en-IN')} → Tax = ${formatCurrency(newTotalTax, 'INR', 'en-IN')}`,
          `Old Regime taxable income = ${formatCurrency(oldTaxable, 'INR', 'en-IN')} → Tax = ${formatCurrency(oldTotalTax, 'INR', 'en-IN')}`,
        ],
      };
    },
  },
  {
    id: 'profit-loss',
    name: 'Profit, Loss & Margin Calculator',
    shortDescription: 'Calculate net profit, markup %, and gross profit margin from cost and selling price.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['profit', 'loss', 'margin', 'markup', 'cost price', 'selling price', 'business'],
    synonyms: ['gross margin', 'profit percentage', 'markup calculator'],
    formulaDisplay: 'Profit = SP - CP  |  Margin% = (Profit/SP)×100  |  Markup% = (Profit/CP)×100',
    explanation: 'Distinguishes markup (profit over cost) from gross margin (profit over revenue).',
    inputs: [
      { key: 'cp', label: 'Cost Price (CP)', type: 'number', defaultValue: 800, min: 0.01, step: 1 },
      { key: 'sp', label: 'Selling Price (SP)', type: 'number', defaultValue: 1000, min: 0, step: 1 },
      { key: 'qty', label: 'Units / Quantity', type: 'number', defaultValue: 50, min: 1, step: 1 },
    ],
    relatedIds: ['discount', 'gst', 'roi', 'percentage'],
    compute: (values, ctx) => {
      const cp = num(values, 'cp');
      const sp = num(values, 'sp');
      const qty = num(values, 'qty', 1);
      if (cp <= 0) throw new Error('Cost price must be > 0.');
      const unitProfit = sp - cp;
      const totalProfit = unitProfit * qty;
      const markup = (unitProfit / cp) * 100;
      const margin = sp > 0 ? (unitProfit / sp) * 100 : 0;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: unitProfit >= 0 ? 'Total Net Profit' : 'Total Net Loss', value: totalProfit, formatted: formatCurrency(totalProfit, cur, loc) },
        breakdown: [
          { label: 'Profit per Unit', value: unitProfit, formatted: formatCurrency(unitProfit, cur, loc) },
          { label: 'Markup % (on Cost)', value: markup, formatted: `${markup.toFixed(2)}%` },
          { label: 'Gross Margin % (on Sales)', value: margin, formatted: `${margin.toFixed(2)}%` },
        ],
        steps: [`Unit P/L = ${sp} - ${cp} = ${unitProfit} × ${qty} units = ${totalProfit}`],
      };
    },
  },
  {
    id: 'discount',
    name: 'Discount & Sale Price Calculator',
    shortDescription: 'Compute final sale price and total savings with stacked or single discount percentages.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['discount', 'sale', 'offer', 'coupon', 'savings', 'price'],
    synonyms: ['percent off', 'sale price calculator'],
    formulaDisplay: 'Final = Price × (1 - d₁/100) × (1 - d₂/100)',
    explanation: 'Supports primary discount plus optional extra coupon discount.',
    inputs: [
      { key: 'price', label: 'Original MRP / Price', type: 'number', defaultValue: 2999, min: 0, step: 1 },
      { key: 'd1', label: 'Primary Discount (%)', type: 'number', defaultValue: 25, min: 0, max: 100, step: 0.5 },
      { key: 'd2', label: 'Extra Coupon Discount (%)', type: 'number', defaultValue: 10, min: 0, max: 100, step: 0.5 },
    ],
    relatedIds: ['percentage', 'gst', 'profit-loss'],
    compute: (values, ctx) => {
      const price = num(values, 'price');
      const d1 = num(values, 'd1');
      const d2 = num(values, 'd2', 0);
      const after1 = price * (1 - d1 / 100);
      const finalPrice = after1 * (1 - d2 / 100);
      const saved = price - finalPrice;
      const effPct = price > 0 ? (saved / price) * 100 : 0;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'Final Payable Price', value: finalPrice, formatted: formatCurrency(finalPrice, cur, loc) },
        breakdown: [
          { label: 'Total Money Saved', value: saved, formatted: formatCurrency(saved, cur, loc) },
          { label: 'Effective Combined Discount', value: effPct, formatted: `${effPct.toFixed(2)}%` },
        ],
        steps: [`After ${d1}%: ${formatCurrency(after1, cur, loc)}`, `After extra ${d2}%: ${formatCurrency(finalPrice, cur, loc)}`],
      };
    },
  },
  {
    id: 'retirement',
    name: 'Retirement Corpus & Inflation Planner',
    shortDescription: 'Estimate inflation-adjusted target retirement corpus and required monthly SIP.',
    category: 'finance',
    categoryLabel: 'Finance',
    keywords: ['retirement', 'pension', 'corpus', 'inflation', 'fire', 'savings'],
    synonyms: ['fire calculator', 'retirement planning'],
    formulaDisplay: 'Future Monthly Expense = Current × (1 + inf)ⁿ  |  Corpus = Real Annuity PV',
    explanation: 'Projects future living expenses adjusted for inflation and estimates the retirement corpus needed.',
    disclaimer: 'Planning simulation based on user-supplied inflation and return assumptions; not personalized financial advice.',
    inputs: [
      { key: 'currentAge', label: 'Current Age', type: 'number', defaultValue: 30, min: 18, max: 75, step: 1 },
      { key: 'retireAge', label: 'Target Retirement Age', type: 'number', defaultValue: 60, min: 25, max: 85, step: 1 },
      { key: 'monthlyExpense', label: 'Current Monthly Expenses', type: 'number', defaultValue: 60000, min: 1000, step: 1000 },
      { key: 'inflation', label: 'Assumed Inflation (% p.a.)', type: 'number', defaultValue: 6, min: 0, max: 20, step: 0.5 },
      { key: 'postReturn', label: 'Post-Retirement Return (% p.a.)', type: 'number', defaultValue: 8, min: 1, max: 20, step: 0.5 },
      { key: 'yearsInRetire', label: 'Years in Retirement', type: 'number', defaultValue: 25, min: 5, max: 50, step: 1 },
    ],
    relatedIds: ['sip', 'compound-interest', 'income-tax'],
    compute: (values, ctx) => {
      const cAge = num(values, 'currentAge');
      const rAge = num(values, 'retireAge');
      if (rAge <= cAge) throw new Error('Retirement age must be greater than current age.');
      const exp = num(values, 'monthlyExpense');
      const inf = num(values, 'inflation') / 100;
      const postRet = num(values, 'postReturn') / 100;
      const yrsRet = num(values, 'yearsInRetire');

      const yrsToRet = rAge - cAge;
      const futureMonthlyExp = exp * Math.pow(1 + inf, yrsToRet);
      const realRate = (1 + postRet) / (1 + inf) - 1;
      const monthlyReal = realRate / 12;
      const monthsRet = yrsRet * 12;
      const corpus =
        Math.abs(monthlyReal) < 1e-8
          ? futureMonthlyExp * monthsRet
          : (futureMonthlyExp * (1 - Math.pow(1 + monthlyReal, -monthsRet))) / monthlyReal;

      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: `Target Corpus at Age ${rAge}`, value: corpus, formatted: formatCurrency(corpus, cur, loc) },
        breakdown: [
          { label: 'Compact Corpus (India)', value: corpus, formatted: formatIndianCompact(corpus) },
          { label: `Projected Monthly Expense at ${rAge}`, value: futureMonthlyExp, formatted: formatCurrency(futureMonthlyExp, cur, loc) },
          { label: 'Real Post-Retirement Return', value: realRate * 100, formatted: `${(realRate * 100).toFixed(2)}% p.a.` },
        ],
        steps: [`In ${yrsToRet} yrs at ${(inf * 100).toFixed(1)}% inflation, monthly expense grows to ${formatCurrency(futureMonthlyExp, cur, loc)}.`],
      };
    },
  },
];
