import type { CalculatorDefinition, ComputeContext } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import type { CatalogEntryMeta } from '../catalogTypes';
import { formatCurrency } from '../formatters';

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
    keywords: [entry.name.toLowerCase(), entry.category, entry.subcategory.toLowerCase(), ...(overrides.keywords || [])],
    synonyms: [entry.slug.replace(/-/g, ' '), entry.longTail || entry.name.toLowerCase()],
    relatedIds: [],
    ...overrides,
  };
}

function fmtMoney(val: number, ctx?: ComputeContext, customCurrency?: string): string {
  return formatCurrency(val, customCurrency || ctx?.currency || 'USD', ctx?.locale || 'en-US');
}

function monthlyPMT(principal: number, annualPct: number, months: number): number {
  const m = Math.max(1, Math.round(months));
  const r = annualPct / 100 / 12;
  if (r === 0) return principal / m;
  return (principal * r * Math.pow(1 + r, m)) / (Math.pow(1 + r, m) - 1);
}

// Complete US 50-State + DC Tax Table (effective income tax %, state sales tax %, effective property tax %, LTCG state treatment %)
interface StateTaxRow {
  label: string;
  incomePct: number;
  salesPct: number;
  propPct: number;
  capGainsPct: number;
}

const US_STATE_TAXES: Record<string, StateTaxRow> = {
  alabama: { label: 'Alabama', incomePct: 4.5, salesPct: 4.0, propPct: 0.41, capGainsPct: 5.0 },
  alaska: { label: 'Alaska', incomePct: 0.0, salesPct: 0.0, propPct: 1.22, capGainsPct: 0.0 },
  arizona: { label: 'Arizona', incomePct: 2.5, salesPct: 5.6, propPct: 0.62, capGainsPct: 2.5 },
  arkansas: { label: 'Arkansas', incomePct: 3.9, salesPct: 6.5, propPct: 0.62, capGainsPct: 1.95 },
  california: { label: 'California', incomePct: 7.2, salesPct: 7.25, propPct: 0.75, capGainsPct: 9.3 },
  colorado: { label: 'Colorado', incomePct: 4.4, salesPct: 2.9, propPct: 0.51, capGainsPct: 4.4 },
  connecticut: { label: 'Connecticut', incomePct: 5.5, salesPct: 6.35, propPct: 2.15, capGainsPct: 5.5 },
  delaware: { label: 'Delaware', incomePct: 5.2, salesPct: 0.0, propPct: 0.58, capGainsPct: 6.6 },
  florida: { label: 'Florida', incomePct: 0.0, salesPct: 6.0, propPct: 0.89, capGainsPct: 0.0 },
  georgia: { label: 'Georgia', incomePct: 5.39, salesPct: 4.0, propPct: 0.90, capGainsPct: 5.39 },
  hawaii: { label: 'Hawaii', incomePct: 7.2, salesPct: 4.0, propPct: 0.29, capGainsPct: 7.25 },
  idaho: { label: 'Idaho', incomePct: 5.695, salesPct: 6.0, propPct: 0.63, capGainsPct: 5.695 },
  illinois: { label: 'Illinois', incomePct: 4.95, salesPct: 6.25, propPct: 2.23, capGainsPct: 4.95 },
  indiana: { label: 'Indiana', incomePct: 3.05, salesPct: 7.0, propPct: 0.85, capGainsPct: 3.05 },
  iowa: { label: 'Iowa', incomePct: 3.8, salesPct: 6.0, propPct: 1.57, capGainsPct: 3.8 },
  kansas: { label: 'Kansas', incomePct: 5.2, salesPct: 6.5, propPct: 1.43, capGainsPct: 5.7 },
  kentucky: { label: 'Kentucky', incomePct: 4.0, salesPct: 6.0, propPct: 0.85, capGainsPct: 4.0 },
  louisiana: { label: 'Louisiana', incomePct: 3.0, salesPct: 4.45, propPct: 0.56, capGainsPct: 3.0 },
  maine: { label: 'Maine', incomePct: 6.75, salesPct: 5.5, propPct: 1.28, capGainsPct: 7.15 },
  maryland: { label: 'Maryland', incomePct: 4.75, salesPct: 6.0, propPct: 1.07, capGainsPct: 4.75 },
  massachusetts: { label: 'Massachusetts', incomePct: 5.0, salesPct: 6.25, propPct: 1.20, capGainsPct: 5.0 },
  michigan: { label: 'Michigan', incomePct: 4.25, salesPct: 6.0, propPct: 1.48, capGainsPct: 4.25 },
  minnesota: { label: 'Minnesota', incomePct: 6.8, salesPct: 6.875, propPct: 1.11, capGainsPct: 7.85 },
  mississippi: { label: 'Mississippi', incomePct: 4.7, salesPct: 7.0, propPct: 0.79, capGainsPct: 4.7 },
  missouri: { label: 'Missouri', incomePct: 4.8, salesPct: 4.225, propPct: 0.98, capGainsPct: 4.8 },
  montana: { label: 'Montana', incomePct: 5.9, salesPct: 0.0, propPct: 0.83, capGainsPct: 4.1 },
  nebraska: { label: 'Nebraska', incomePct: 5.2, salesPct: 5.5, propPct: 1.67, capGainsPct: 5.2 },
  nevada: { label: 'Nevada', incomePct: 0.0, salesPct: 6.85, propPct: 0.55, capGainsPct: 0.0 },
  'new hampshire': { label: 'New Hampshire', incomePct: 0.0, salesPct: 0.0, propPct: 1.89, capGainsPct: 0.0 },
  'new jersey': { label: 'New Jersey', incomePct: 5.5, salesPct: 6.625, propPct: 2.47, capGainsPct: 6.37 },
  'new mexico': { label: 'New Mexico', incomePct: 4.9, salesPct: 4.875, propPct: 0.79, capGainsPct: 2.45 },
  'new york': { label: 'New York', incomePct: 6.0, salesPct: 4.0, propPct: 1.73, capGainsPct: 6.85 },
  'north carolina': { label: 'North Carolina', incomePct: 4.5, salesPct: 4.75, propPct: 0.82, capGainsPct: 4.5 },
  'north dakota': { label: 'North Dakota', incomePct: 1.95, salesPct: 5.0, propPct: 1.0, capGainsPct: 1.95 },
  ohio: { label: 'Ohio', incomePct: 3.5, salesPct: 5.75, propPct: 1.59, capGainsPct: 3.5 },
  oklahoma: { label: 'Oklahoma', incomePct: 4.75, salesPct: 4.5, propPct: 0.90, capGainsPct: 4.75 },
  oregon: { label: 'Oregon', incomePct: 8.75, salesPct: 0.0, propPct: 0.93, capGainsPct: 9.9 },
  pennsylvania: { label: 'Pennsylvania', incomePct: 3.07, salesPct: 6.0, propPct: 1.53, capGainsPct: 3.07 },
  'rhode island': { label: 'Rhode Island', incomePct: 4.75, salesPct: 7.0, propPct: 1.53, capGainsPct: 5.99 },
  'south carolina': { label: 'South Carolina', incomePct: 6.2, salesPct: 6.0, propPct: 0.56, capGainsPct: 3.5 },
  'south dakota': { label: 'South Dakota', incomePct: 0.0, salesPct: 4.2, propPct: 1.24, capGainsPct: 0.0 },
  tennessee: { label: 'Tennessee', incomePct: 0.0, salesPct: 7.0, propPct: 0.66, capGainsPct: 0.0 },
  texas: { label: 'Texas', incomePct: 0.0, salesPct: 6.25, propPct: 1.74, capGainsPct: 0.0 },
  utah: { label: 'Utah', incomePct: 4.55, salesPct: 6.1, propPct: 0.58, capGainsPct: 4.55 },
  vermont: { label: 'Vermont', incomePct: 6.6, salesPct: 6.0, propPct: 1.90, capGainsPct: 6.6 },
  virginia: { label: 'Virginia', incomePct: 5.75, salesPct: 5.3, propPct: 0.82, capGainsPct: 5.75 },
  washington: { label: 'Washington', incomePct: 0.0, salesPct: 6.5, propPct: 0.94, capGainsPct: 7.0 },
  'west virginia': { label: 'West Virginia', incomePct: 5.12, salesPct: 6.0, propPct: 0.59, capGainsPct: 5.12 },
  wisconsin: { label: 'Wisconsin', incomePct: 5.3, salesPct: 5.0, propPct: 1.61, capGainsPct: 3.71 },
  wyoming: { label: 'Wyoming', incomePct: 0.0, salesPct: 4.0, propPct: 0.61, capGainsPct: 0.0 },
};

function findUSState(n: string): StateTaxRow | undefined {
  const keys = Object.keys(US_STATE_TAXES).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (n.includes(k)) return US_STATE_TAXES[k];
  }
  return undefined;
}

export function buildExtendedFinanceDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();
  const state = findUSState(n);

  // 1. US State Specific Calculators (Income Tax, Paycheck, Bonus, Overtime, Property Tax, Sales Tax, Capital Gains)
  if (state || /\b(state sales tax|usa sales tax comparison|paye|national insurance|sdlt|lbtt|ltt|uk cgt|uk tax|ir35|australia tax|canada tax|ireland paye|nz tax|germany salary|uae gratuity|zakat|us crypto tax|uk crypto tax)\b/.test(n)) {
    const st = state || US_STATE_TAXES.california;

    if (n.includes('property tax')) {
      return makeBase(entry, {
        shortDescription: `Estimate annual & monthly ${st.label} real estate property tax from assessed market value.`,
        formulaDisplay: `Annual Property Tax = Home Value × AssessmentRatio × (${st.propPct}% effective avg)`,
        explanation: `Uses ${st.label}'s benchmark effective property tax rate (${st.propPct}%) with customizable county rate.`,
        inputs: [
          { key: 'value', label: 'Property Market Value', type: 'number', defaultValue: 400000, min: 10000, step: 10000 },
          { key: 'rate', label: 'Effective Property Tax Rate (%)', type: 'number', defaultValue: st.propPct, min: 0.05, max: 5, step: 0.05 },
        ],
        compute: (vals, ctx) => {
          const v = num(vals, 'value');
          const r = num(vals, 'rate', st.propPct);
          const annual = (v * r) / 100;
          return {
            primary: { label: 'Annual Property Tax', value: annual, formatted: fmtMoney(annual, ctx, 'USD') },
            breakdown: [
              { label: 'Monthly Escrow Tax', value: annual / 12, formatted: fmtMoney(annual / 12, ctx, 'USD') },
              { label: '10-Year Cumulative Tax', value: annual * 10, formatted: fmtMoney(annual * 10, ctx, 'USD') },
            ],
            steps: [`${fmtMoney(v, ctx, 'USD')} × ${r}% = ${fmtMoney(annual, ctx, 'USD')}/yr`],
          };
        },
      });
    }

    if (n.includes('sales tax')) {
      return makeBase(entry, {
        shortDescription: `Calculate ${state ? st.label : 'US State'} state + local sales tax and final checkout price.`,
        formulaDisplay: `Sales Tax = Price × (StateRate ${st.salesPct}% + Local%)`,
        explanation: `Computes exact pre-tax total, sales tax, and out-the-door total.`,
        inputs: [
          { key: 'price', label: 'Pre-Tax Purchase Price', type: 'number', defaultValue: 1000, min: 0, step: 10 },
          { key: 'stateRate', label: 'State Sales Tax (%)', type: 'number', defaultValue: st.salesPct, min: 0, max: 15, step: 0.1 },
          { key: 'localRate', label: 'County/City Surtax (%)', type: 'number', defaultValue: 1.5, min: 0, max: 8, step: 0.1 },
        ],
        compute: (vals, ctx) => {
          const p = num(vals, 'price');
          const sr = num(vals, 'stateRate', st.salesPct);
          const lr = num(vals, 'localRate', 1.5);
          const tax = (p * (sr + lr)) / 100;
          return {
            primary: { label: 'Total After Sales Tax', value: p + tax, formatted: fmtMoney(p + tax, ctx, 'USD') },
            breakdown: [
              { label: 'Combined Tax Rate', value: sr + lr, formatted: `${(sr + lr).toFixed(3)}%` },
              { label: 'Total Sales Tax', value: tax, formatted: fmtMoney(tax, ctx, 'USD') },
            ],
            steps: [`${fmtMoney(p, ctx, 'USD')} × ${(sr + lr).toFixed(2)}% = ${fmtMoney(tax, ctx, 'USD')}`],
          };
        },
      });
    }

    if (n.includes('capital gains') || n.includes('crypto tax') || n.includes('uk cgt')) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — federal & state/national capital gains tax estimator for short- & long-term holdings.`,
        formulaDisplay: 'Tax = NetGain × (Federal/National_CGT% + State_CGT%)',
        explanation: 'Separates short-term ordinary gains from long-term capital gains and estimates net after-tax proceeds.',
        inputs: [
          { key: 'proceeds', label: 'Sale Proceeds', type: 'number', defaultValue: 120000, min: 0, step: 1000 },
          { key: 'basis', label: 'Cost Basis', type: 'number', defaultValue: 75000, min: 0, step: 1000 },
          { key: 'fedPct', label: 'Federal/National CGT Rate (%)', type: 'number', defaultValue: 15, min: 0, max: 45, step: 1 },
          { key: 'statePct', label: 'State CGT Rate (%)', type: 'number', defaultValue: st.capGainsPct, min: 0, max: 15, step: 0.25 },
        ],
        compute: (vals, ctx) => {
          const gain = Math.max(0, num(vals, 'proceeds') - num(vals, 'basis'));
          const fp = num(vals, 'fedPct', 15);
          const sp = num(vals, 'statePct', st.capGainsPct);
          const tax = (gain * (fp + sp)) / 100;
          const net = num(vals, 'proceeds') - tax;
          return {
            primary: { label: 'Estimated Capital Gains Tax', value: tax, formatted: fmtMoney(tax, ctx) },
            breakdown: [
              { label: 'Taxable Capital Gain', value: gain, formatted: fmtMoney(gain, ctx) },
              { label: 'Net After-Tax Proceeds', value: net, formatted: fmtMoney(net, ctx) },
              { label: 'Combined CGT Rate', value: fp + sp, formatted: `${(fp + sp).toFixed(2)}%` },
            ],
            steps: [`Taxable Gain = ${fmtMoney(gain, ctx)} × ${(fp + sp).toFixed(2)}% = ${fmtMoney(tax, ctx)}`],
          };
        },
      });
    }

    if (n.includes('uae gratuity')) {
      return makeBase(entry, {
        shortDescription: `UAE Federal Decree-Law No. 33 End-of-Service Gratuity calculator (21 days + 30 days/yr).`,
        formulaDisplay: 'Years ≤ 5: 21 × DailyWage × Years  |  Years > 5: (5×21 + (Years−5)×30) × DailyWage',
        explanation: 'Calculates UAE private sector end-of-service benefit based on basic monthly salary and years of service.',
        inputs: [
          { key: 'basicSalary', label: 'Monthly Basic Salary (AED)', type: 'number', defaultValue: 15000, min: 1000, step: 500 },
          { key: 'years', label: 'Total Years of Service', type: 'number', defaultValue: 6.5, min: 1, max: 40, step: 0.5 },
        ],
        compute: (vals, ctx) => {
          const sal = num(vals, 'basicSalary');
          const yrs = Math.max(0, num(vals, 'years'));
          const daily = sal / 30;
          const days = yrs < 1 ? 0 : yrs <= 5 ? yrs * 21 : 5 * 21 + (yrs - 5) * 30;
          const grat = Math.min(sal * 24, days * daily);
          return {
            primary: { label: 'End-of-Service Gratuity', value: grat, formatted: fmtMoney(grat, ctx, 'AED') },
            breakdown: [
              { label: 'Daily Basic Wage', value: daily, formatted: fmtMoney(daily, ctx, 'AED') },
              { label: 'Total Gratuity Days', value: days, formatted: `${days.toFixed(1)} days` },
            ],
            steps: [`${days.toFixed(1)} days × ${fmtMoney(daily, ctx, 'AED')}/day = ${fmtMoney(grat, ctx, 'AED')}`],
          };
        },
      });
    }

    if (n.includes('zakat')) {
      return makeBase(entry, {
        shortDescription: `Calculate annual 2.5% Zakat obligation on cash, gold/silver, stocks & net zakatable assets above Nisab.`,
        formulaDisplay: 'Zakat = 2.5% × (Cash + Investments + Gold − Short-Term Debt) if ≥ Nisab',
        explanation: 'Applies the exact 2.5% lunar-year Zakat rate against your net eligible wealth above Nisab.',
        inputs: [
          { key: 'cash', label: 'Cash & Bank Savings', type: 'number', defaultValue: 25000, min: 0, step: 500 },
          { key: 'invest', label: 'Gold, Silver & Stock Holdings', type: 'number', defaultValue: 15000, min: 0, step: 500 },
          { key: 'debts', label: 'Immediate Debts Due', type: 'number', defaultValue: 3000, min: 0, step: 250 },
          { key: 'nisab', label: 'Current Nisab Threshold', type: 'number', defaultValue: 6000, min: 0, step: 100 },
        ],
        compute: (vals, ctx) => {
          const net = Math.max(0, num(vals, 'cash') + num(vals, 'invest') - num(vals, 'debts'));
          const nisab = num(vals, 'nisab', 6000);
          const zakat = net >= nisab ? net * 0.025 : 0;
          return {
            primary: { label: 'Annual Zakat Due (2.5%)', value: zakat, formatted: fmtMoney(zakat, ctx) },
            breakdown: [
              { label: 'Net Zakatable Wealth', value: net, formatted: fmtMoney(net, ctx) },
              { label: 'Nisab Status', value: net >= nisab ? 'Eligible' : 'Below Nisab', formatted: net >= nisab ? 'Above Nisab — Payable' : 'Below Nisab — $0 Due' },
            ],
            steps: [`Net = ${fmtMoney(net, ctx)} × 2.5% = ${fmtMoney(zakat, ctx)}`],
          };
        },
      });
    }

    if (/\b(sdlt|lbtt|ltt)\b/.test(n)) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — progressive UK residential Stamp Duty / Land Transaction Tax bands.`,
        formulaDisplay: 'Progressive Slab Tax Σ (BandWidth × MarginalBandRate)',
        explanation: 'Computes progressive UK property transaction duty across tiered bands.',
        inputs: [
          { key: 'price', label: 'Property Purchase Price (£)', type: 'number', defaultValue: 450000, min: 10000, step: 10000 },
          { key: 'additional', label: 'Buyer Type', type: 'select', defaultValue: 'standard', options: [{ label: 'Standard Home Mover', value: 'standard' }, { label: 'First-Time Buyer', value: 'ftb' }, { label: 'Additional Property (+3%)', value: 'add' }] },
        ],
        compute: (vals, ctx) => {
          const p = num(vals, 'price');
          const bt = str(vals, 'additional', 'standard');
          let tax = 0;
          if (bt === 'ftb' && p <= 625000) {
            tax = Math.max(0, p - 425000) * 0.05;
          } else {
            const b1 = Math.max(0, Math.min(p, 925000) - 250000) * 0.05;
            const b2 = Math.max(0, Math.min(p, 1500000) - 925000) * 0.1;
            const b3 = Math.max(0, p - 1500000) * 0.12;
            tax = b1 + b2 + b3 + (bt === 'add' ? p * 0.03 : 0);
          }
          return {
            primary: { label: 'Stamp Duty / Land Tax', value: tax, formatted: fmtMoney(tax, ctx, 'GBP') },
            breakdown: [
              { label: 'Effective Tax Rate', value: (tax / p) * 100, formatted: `${((tax / p) * 100).toFixed(2)}%` },
              { label: 'Net Total Cost', value: p + tax, formatted: fmtMoney(p + tax, ctx, 'GBP') },
            ],
            steps: [`Progressive UK band calculation on £${p.toLocaleString()} = £${tax.toLocaleString()}`],
          };
        },
      });
    }

    // Paycheck / Income Tax / Bonus / Overtime / International Salary
    const isOvertime = n.includes('overtime');
    const isBonus = n.includes('bonus');
    return makeBase(entry, {
      shortDescription: `${entry.name} — exact federal, state/national, FICA/NI & net take-home pay breakdown.`,
      formulaDisplay: isOvertime
        ? 'OT Pay = RegularHours×Rate + OT_Hours×Rate×Multiplier − Taxes'
        : 'Net Pay = Gross − Federal/National Income Tax − FICA/NI (7.65%) − State Tax',
      explanation: `Calculates take-home pay incorporating ${state ? `${st.label}'s ${st.incomePct}% state rate` : 'regional statutory rates'} and payroll deductions.`,
      inputs: isOvertime
        ? [
            { key: 'hourly', label: 'Hourly Wage', type: 'number', defaultValue: 32, min: 1, step: 1 },
            { key: 'regHours', label: 'Regular Hours', type: 'number', defaultValue: 40, min: 0, step: 1 },
            { key: 'otHours', label: 'Overtime Hours', type: 'number', defaultValue: 10, min: 0, step: 1 },
            { key: 'mult', label: 'Overtime Multiplier', type: 'number', defaultValue: 1.5, min: 1, max: 3, step: 0.25 },
            { key: 'statePct', label: 'State + Fed Combined Tax (%)', type: 'number', defaultValue: 16 + st.incomePct, min: 0, max: 60, step: 0.5 },
          ]
        : [
            { key: 'gross', label: isBonus ? 'Gross Bonus Amount' : 'Annual Gross Salary', type: 'number', defaultValue: isBonus ? 10000 : 85000, min: 1000, step: 1000 },
            { key: 'fedPct', label: 'Federal / National Effective Tax (%)', type: 'number', defaultValue: isBonus ? 22 : 14.5, min: 0, max: 50, step: 0.5 },
            { key: 'statePct', label: 'State / Provincial Tax (%)', type: 'number', defaultValue: st.incomePct, min: 0, max: 20, step: 0.25 },
            { key: 'pretax', label: 'Pre-Tax 401k / Pension (%)', type: 'number', defaultValue: isBonus ? 0 : 5, min: 0, max: 40, step: 1 },
          ],
      compute: (vals, ctx) => {
        if (isOvertime) {
          const hr = num(vals, 'hourly');
          const reg = num(vals, 'regHours') * hr;
          const ot = num(vals, 'otHours') * hr * num(vals, 'mult', 1.5);
          const gross = reg + ot;
          const tax = (gross * num(vals, 'statePct', 22)) / 100;
          const net = gross - tax;
          return {
            primary: { label: 'Net Take-Home Pay', value: net, formatted: fmtMoney(net, ctx) },
            breakdown: [
              { label: 'Gross Pay (Reg + OT)', value: gross, formatted: fmtMoney(gross, ctx) },
              { label: 'Overtime Portion', value: ot, formatted: fmtMoney(ot, ctx) },
              { label: 'Estimated Withholding', value: tax, formatted: fmtMoney(tax, ctx) },
            ],
            steps: [`Reg ${fmtMoney(reg, ctx)} + OT ${fmtMoney(ot, ctx)} = ${fmtMoney(gross, ctx)}`],
          };
        }
        const gross = num(vals, 'gross');
        const pretax = (gross * num(vals, 'pretax', 5)) / 100;
        const taxable = Math.max(0, gross - pretax);
        const fed = (taxable * num(vals, 'fedPct', 14.5)) / 100;
        const stateTax = (taxable * num(vals, 'statePct', st.incomePct)) / 100;
        const fica = gross * 0.0765;
        const net = gross - pretax - fed - stateTax - fica;
        return {
          primary: { label: isBonus ? 'Net Bonus Take-Home' : 'Annual Net Take-Home', value: net, formatted: fmtMoney(net, ctx) },
          breakdown: [
            { label: 'Monthly Net', value: net / 12, formatted: fmtMoney(net / 12, ctx) },
            { label: 'Biweekly Paycheck (26/yr)', value: net / 26, formatted: fmtMoney(net / 26, ctx) },
            { label: 'Federal / National Tax', value: fed, formatted: fmtMoney(fed, ctx) },
            { label: 'FICA / NI (7.65%)', value: fica, formatted: fmtMoney(fica, ctx) },
            { label: `${state ? st.label : 'State'} Tax`, value: stateTax, formatted: fmtMoney(stateTax, ctx) },
          ],
          steps: [`Gross ${fmtMoney(gross, ctx)} − Taxes ${fmtMoney(fed + stateTax + fica, ctx)} − Pretax ${fmtMoney(pretax, ctx)} = ${fmtMoney(net, ctx)}`],
        };
      },
    });
  }

  // 2. Salary <-> Hourly / Gross <-> Net / Raise / Biweekly / Weekly / Budget Rules
  if (/\b(annual salary|annual to monthly|hourly to|salary to|wage to|biweekly pay|semi monthly|weekly pay|pay raise|hours pay|money per hour|gross to net|net to gross|discretionary income|disposable income|50 30 20|70 20 10|prorated salary|unpaid work|gender wage gap)\b/.test(n)) {
    if (n.includes('50 30 20') || n.includes('70 20 10')) {
      const is70 = n.includes('70 20 10');
      return makeBase(entry, {
        shortDescription: `${entry.name} — allocate monthly after-tax income across needs, savings/debt & lifestyle.`,
        formulaDisplay: is70 ? '70% Expenses  |  20% Savings  |  10% Debt / Giving' : '50% Needs  |  30% Wants  |  20% Savings',
        explanation: 'Splits take-home monthly income cleanly into structured budgeting buckets.',
        inputs: [{ key: 'income', label: 'Monthly After-Tax Income', type: 'number', defaultValue: 6000, min: 100, step: 100 }],
        compute: (vals, ctx) => {
          const inc = num(vals, 'income');
          const b1 = inc * (is70 ? 0.7 : 0.5);
          const b2 = inc * (is70 ? 0.2 : 0.3);
          const b3 = inc * (is70 ? 0.1 : 0.2);
          return {
            primary: { label: is70 ? 'Living Expenses (70%)' : 'Essential Needs (50%)', value: b1, formatted: fmtMoney(b1, ctx) },
            breakdown: [
              { label: is70 ? 'Savings & Investing (20%)' : 'Wants & Lifestyle (30%)', value: b2, formatted: fmtMoney(b2, ctx) },
              { label: is70 ? 'Debt Payoff / Giving (10%)' : 'Savings & Debt Paydown (20%)', value: b3, formatted: fmtMoney(b3, ctx) },
            ],
            steps: [`Monthly income ${fmtMoney(inc, ctx)} split across 3 allocations.`],
          };
        },
      });
    }

    return makeBase(entry, {
      shortDescription: `${entry.name} — instant conversion across Hourly, Weekly, Biweekly, Monthly & Annual pay.`,
      formulaDisplay: 'Annual = Hourly × Hours/Week × Weeks/Year',
      explanation: 'Computes exact gross/net pay equivalents across all payroll frequencies.',
      inputs: [
        { key: 'amount', label: n.includes('hourly to') || n.includes('wage') ? 'Hourly Rate' : 'Annual Salary', type: 'number', defaultValue: n.includes('hourly to') || n.includes('wage') ? 35 : 75000, min: 1, step: 1 },
        { key: 'hours', label: 'Hours / Week', type: 'number', defaultValue: 40, min: 1, max: 100, step: 1 },
        { key: 'raisePct', label: 'Pay Raise / Tax Adjustment (%)', type: 'number', defaultValue: n.includes('raise') ? 8 : n.includes('tax') || n.includes('net') ? 22 : 0, min: -50, max: 100, step: 0.5 },
      ],
      compute: (vals, ctx) => {
        const amt = num(vals, 'amount');
        const hrs = num(vals, 'hours', 40);
        const adj = num(vals, 'raisePct', 0) / 100;
        const isFromHourly = n.includes('hourly to') || n.includes('wage');
        const baseAnnual = isFromHourly ? amt * hrs * 52 : amt;
        const adjusted = n.includes('gross to net') ? baseAnnual * (1 - Math.abs(adj)) : n.includes('net to gross') ? baseAnnual / Math.max(0.2, 1 - Math.abs(adj)) : baseAnnual * (1 + adj);
        const hourly = adjusted / (hrs * 52);
        return {
          primary: { label: isFromHourly ? 'Annual Equivalent' : n.includes('salary to hourly') || n.includes('per hour') ? 'Hourly Rate' : 'Adjusted Annual Pay', value: n.includes('salary to hourly') || n.includes('per hour') ? hourly : adjusted, formatted: fmtMoney(n.includes('salary to hourly') || n.includes('per hour') ? hourly : adjusted, ctx) },
          breakdown: [
            { label: 'Monthly Pay (÷12)', value: adjusted / 12, formatted: fmtMoney(adjusted / 12, ctx) },
            { label: 'Biweekly Pay (÷26)', value: adjusted / 26, formatted: fmtMoney(adjusted / 26, ctx) },
            { label: 'Weekly Pay (÷52)', value: adjusted / 52, formatted: fmtMoney(adjusted / 52, ctx) },
            { label: 'Hourly Rate', value: hourly, formatted: `${fmtMoney(hourly, ctx)}/hr` },
          ],
          steps: [`Base Annual = ${fmtMoney(baseAnnual, ctx)}, Adjusted = ${fmtMoney(adjusted, ctx)}`],
        };
      },
    });
  }

  // 3. Real Estate & Mortgage Modeling (10/1 ARM, 28/36, 3x Rent, ARV, BRRRR, FFO, AFFO, HELOC, PMI, Escrow, Earnest, ADR)
  if (/\b(10\/1 arm|28 36|3x rent|arv|brrrr|ffo|affo|cap rate|grm|dscr|dti|ltv|heloc|pmi|escrow|earnest money|prorated rent|what to offer|home value|adr|occupancy rate|motorcycle loan|rv loan|bike emi|auto loan|car lease|lease vs|lease early|ev savings|ev federal)\b/.test(n)) {
    if (n.includes('arv') || n.includes('brrrr')) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — 70% Rule Maximum Allowable Offer (MAO), rehab budget & BRRRR cash-out refinance equity.`,
        formulaDisplay: 'MAO = (ARV × 70%) − RehabCost  |  Refi Cash = (ARV × LTV%) − TotalCost',
        explanation: 'Evaluates fix-and-flip spread and BRRRR refinance capital recovery.',
        inputs: [
          { key: 'arv', label: 'After-Repair Value (ARV)', type: 'number', defaultValue: 350000, min: 10000, step: 5000 },
          { key: 'purchase', label: 'Purchase Price', type: 'number', defaultValue: 200000, min: 5000, step: 5000 },
          { key: 'rehab', label: 'Rehab & Holding Cost', type: 'number', defaultValue: 45000, min: 0, step: 2500 },
          { key: 'ltv', label: 'Refinance LTV (%)', type: 'number', defaultValue: 75, min: 50, max: 90, step: 5 },
        ],
        compute: (vals, ctx) => {
          const arv = num(vals, 'arv');
          const pur = num(vals, 'purchase');
          const rehab = num(vals, 'rehab');
          const ltv = num(vals, 'ltv', 75) / 100;
          const mao = arv * 0.7 - rehab;
          const refiLoan = arv * ltv;
          const profit = arv - pur - rehab;
          const cashLeft = Math.max(0, pur + rehab - refiLoan);
          return {
            primary: { label: n.includes('arv') ? 'Max Allowable Offer (70% Rule)' : 'Refinance Loan Proceeds', value: n.includes('arv') ? mao : refiLoan, formatted: fmtMoney(n.includes('arv') ? mao : refiLoan, ctx) },
            breakdown: [
              { label: '70% Rule MAO', value: mao, formatted: fmtMoney(mao, ctx) },
              { label: 'Refinance Proceeds', value: refiLoan, formatted: fmtMoney(refiLoan, ctx) },
              { label: 'Cash Left in Deal', value: cashLeft, formatted: fmtMoney(cashLeft, ctx) },
              { label: 'Gross Equity Spread', value: profit, formatted: fmtMoney(profit, ctx) },
            ],
            steps: [`MAO = (${fmtMoney(arv, ctx)} × 0.70) − ${fmtMoney(rehab, ctx)} = ${fmtMoney(mao, ctx)}`],
          };
        },
      });
    }

    if (n.includes('ffo') || n.includes('affo') || n.includes('cap rate') || n.includes('dscr')) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — institutional REIT FFO/AFFO, Cap Rate & Debt Service Coverage modeling.`,
        formulaDisplay: 'FFO = NetIncome + Depreciation − Gains  |  DSCR = NOI / AnnualDebtService',
        explanation: 'Computes real estate operating cash flow metrics and lender coverage ratios.',
        inputs: [
          { key: 'netIncome', label: 'Net Income / Annual NOI', type: 'number', defaultValue: 180000, min: 0, step: 5000 },
          { key: 'depr', label: 'Depreciation + Amortization', type: 'number', defaultValue: 55000, min: 0, step: 2500 },
          { key: 'capex', label: 'Recurring CapEx / Debt Service', type: 'number', defaultValue: 120000, min: 1, step: 2500 },
          { key: 'propVal', label: 'Property Price / Share Count', type: 'number', defaultValue: 2400000, min: 1, step: 25000 },
        ],
        compute: (vals, ctx) => {
          const ni = num(vals, 'netIncome');
          const depr = num(vals, 'depr');
          const capex = num(vals, 'capex', 120000);
          const pv = num(vals, 'propVal', 2400000);
          const ffo = ni + depr;
          const affo = ffo - capex;
          const capRate = (ni / pv) * 100;
          const dscr = ni / capex;
          const primaryVal = n.includes('affo') ? affo : n.includes('ffo') ? ffo : n.includes('dscr') ? dscr : capRate;
          return {
            primary: {
              label: n.includes('affo') ? 'Adjusted FFO (AFFO)' : n.includes('ffo') ? 'Funds From Operations (FFO)' : n.includes('dscr') ? 'DSCR Ratio' : 'Cap Rate (%)',
              value: primaryVal,
              formatted: n.includes('dscr') ? `${dscr.toFixed(2)}×` : n.includes('cap rate') ? `${capRate.toFixed(2)}%` : fmtMoney(primaryVal, ctx),
            },
            breakdown: [
              { label: 'FFO', value: ffo, formatted: fmtMoney(ffo, ctx) },
              { label: 'AFFO', value: affo, formatted: fmtMoney(affo, ctx) },
              { label: 'DSCR', value: dscr, formatted: `${dscr.toFixed(2)}×` },
              { label: 'Cap Rate', value: capRate, formatted: `${capRate.toFixed(2)}%` },
            ],
            steps: [`FFO = ${fmtMoney(ni, ctx)} + ${fmtMoney(depr, ctx)} = ${fmtMoney(ffo, ctx)}`],
          };
        },
      });
    }

    if (n.includes('3x rent') || n.includes('28 36')) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — qualify rental budget or home mortgage payment using lender income rules.`,
        formulaDisplay: n.includes('3x rent') ? 'Required Gross Income = 3 × Monthly Rent' : 'Max Housing = 28% Gross  |  Max Total Debt = 36% Gross',
        explanation: 'Determines safe housing affordability thresholds based on monthly gross income.',
        inputs: [{ key: 'monthlyIncome', label: 'Monthly Gross Income', type: 'number', defaultValue: 6500, min: 500, step: 250 }],
        compute: (vals, ctx) => {
          const inc = num(vals, 'monthlyIncome');
          const maxRent = inc / 3;
          const max28 = inc * 0.28;
          const max36 = inc * 0.36;
          return {
            primary: { label: n.includes('3x rent') ? 'Max Qualifying Monthly Rent' : 'Max Housing Payment (28%)', value: n.includes('3x rent') ? maxRent : max28, formatted: fmtMoney(n.includes('3x rent') ? maxRent : max28, ctx) },
            breakdown: [
              { label: '3× Rent Rule Max', value: maxRent, formatted: `${fmtMoney(maxRent, ctx)}/mo` },
              { label: '28% Housing Cap', value: max28, formatted: `${fmtMoney(max28, ctx)}/mo` },
              { label: '36% All-Debt Cap', value: max36, formatted: `${fmtMoney(max36, ctx)}/mo` },
            ],
            steps: [`Monthly gross ${fmtMoney(inc, ctx)} ÷ 3 = ${fmtMoney(maxRent, ctx)}`],
          };
        },
      });
    }

    // ARM / Motorcycle / RV / Auto Lease / EV Savings / Generic Loan
    return makeBase(entry, {
      shortDescription: `${entry.name} — accurate monthly payment, interest total, and ownership comparison.`,
      formulaDisplay: 'PMT = P × [r(1+r)^n] / [(1+r)^n − 1]',
      explanation: 'Computes amortized monthly payment, cumulative interest, and total loan payoff cost.',
      inputs: [
        { key: 'amount', label: 'Loan / Financed Amount', type: 'number', defaultValue: n.includes('bike') || n.includes('motorcycle') ? 12000 : n.includes('arm') ? 400000 : 35000, min: 500, step: 500 },
        { key: 'rate', label: 'Annual Interest Rate (%)', type: 'number', defaultValue: 6.5, min: 0, max: 36, step: 0.1 },
        { key: 'months', label: 'Term (Months)', type: 'number', defaultValue: n.includes('arm') ? 360 : 60, min: 6, max: 480, step: 6 },
      ],
      compute: (vals, ctx) => {
        const P = num(vals, 'amount');
        const apr = num(vals, 'rate');
        const m = Math.round(num(vals, 'months', 60));
        const pmt = monthlyPMT(P, apr, m);
        const total = pmt * m;
        return {
          primary: { label: 'Monthly Payment', value: pmt, formatted: fmtMoney(pmt, ctx) },
          breakdown: [
            { label: 'Total Interest Paid', value: total - P, formatted: fmtMoney(total - P, ctx) },
            { label: 'Total Cost', value: total, formatted: fmtMoney(total, ctx) },
            { label: 'Term', value: m, formatted: `${m} months` },
          ],
          steps: [`Principal ${fmtMoney(P, ctx)} @ ${apr}% over ${m} mos = ${fmtMoney(pmt, ctx)}/mo`],
        };
      },
    });
  }

  // 4. Corporate Valuation, Altman Z, DuPont, Graham Number, DCF, WACC, Bonds, Options, Economics
  if (/\b(altman z|dupont|graham|wacc|capm|dcf|ebit|ebitda|ebt|eva|economic value added|roic|roce|roe|roa|ros|pe ratio|price to earnings|peg|afn|xirr|modified irr|profitability index|bond|coupon|credit spread|effective duration|yield to call|yield to maturity|black scholes|call put|options spread|value at risk|var |sharpe|sortino|treynor|jensen|gini|hhi|lerner|okun|phillips|taylor rule|cobb douglas|consumer surplus|deadweight loss|price elasticity|fibonacci retracement|fisher equation|carry trade|forward rate|forward premium|cross exchange|accrual ratio|cash ratio|combined ratio|defensive interval|expense ratio|financial leverage|hedge ratio|loss ratio|operating cash|price to cash|reserve ratio|retention ratio|working capital|free cash flow|ev to sales)\b/.test(n)) {
    if (n.includes('altman z')) {
      return makeBase(entry, {
        shortDescription: `Altman Z-Score corporate bankruptcy distress predictor (Safe > 2.99, Distress < 1.81).`,
        formulaDisplay: 'Z = 1.2(WC/TA) + 1.4(RE/TA) + 3.3(EBIT/TA) + 0.6(MVE/TL) + 1.0(Sales/TA)',
        explanation: 'Computes Edward Altman’s 5-ratio public manufacturing Z-Score credit risk rating.',
        inputs: [
          { key: 'wcTa', label: 'Working Capital / Total Assets', type: 'number', defaultValue: 0.25, step: 0.05 },
          { key: 'reTa', label: 'Retained Earnings / Total Assets', type: 'number', defaultValue: 0.35, step: 0.05 },
          { key: 'ebitTa', label: 'EBIT / Total Assets', type: 'number', defaultValue: 0.14, step: 0.02 },
          { key: 'mveTl', label: 'Market Equity / Total Liabilities', type: 'number', defaultValue: 1.8, step: 0.1 },
          { key: 'sTa', label: 'Sales / Total Assets', type: 'number', defaultValue: 1.1, step: 0.1 },
        ],
        compute: (vals) => {
          const z = 1.2 * num(vals, 'wcTa') + 1.4 * num(vals, 'reTa') + 3.3 * num(vals, 'ebitTa') + 0.6 * num(vals, 'mveTl') + 1.0 * num(vals, 'sTa');
          const zone = z > 2.99 ? 'Safe Zone (> 2.99)' : z >= 1.81 ? 'Grey Zone (1.81–2.99)' : 'Distress Zone (< 1.81)';
          return {
            primary: { label: 'Altman Z-Score', value: z, formatted: `${z.toFixed(3)} — ${zone}` },
            breakdown: [{ label: 'Credit Risk Classification', value: zone, formatted: zone }],
            steps: [`Z = ${z.toFixed(3)} (${zone})`],
          };
        },
      });
    }

    if (n.includes('graham')) {
      return makeBase(entry, {
        shortDescription: `Benjamin Graham Intrinsic Value upper bound: √(22.5 × EPS × Book Value per Share).`,
        formulaDisplay: 'Graham Number = √(22.5 × EPS × BVPS)',
        explanation: 'Estimates maximum defensive value investor entry price based on P/E ≤ 15 and P/B ≤ 1.5.',
        inputs: [
          { key: 'eps', label: 'Earnings Per Share (EPS)', type: 'number', defaultValue: 6.4, min: 0.01, step: 0.2 },
          { key: 'bvps', label: 'Book Value Per Share (BVPS)', type: 'number', defaultValue: 28, min: 0.01, step: 1 },
        ],
        compute: (vals, ctx) => {
          const eps = Math.max(0, num(vals, 'eps'));
          const bvps = Math.max(0, num(vals, 'bvps'));
          const gn = Math.sqrt(22.5 * eps * bvps);
          return {
            primary: { label: 'Graham Fair Value Ceiling', value: gn, formatted: fmtMoney(gn, ctx) },
            breakdown: [
              { label: 'Implied Max P/E × P/B', value: 22.5, formatted: '22.5×' },
              { label: '30% Margin of Safety Buy Price', value: gn * 0.7, formatted: fmtMoney(gn * 0.7, ctx) },
            ],
            steps: [`√(22.5 × ${eps} × ${bvps}) = ${fmtMoney(gn, ctx)}`],
          };
        },
      });
    }

    if (n.includes('dupont')) {
      return makeBase(entry, {
        shortDescription: `3-Step DuPont ROE decomposition into Net Margin, Asset Turnover & Equity Multiplier.`,
        formulaDisplay: 'ROE = (NetIncome / Sales) × (Sales / Assets) × (Assets / Equity)',
        explanation: 'Isolates profitability, asset efficiency, and financial leverage drivers of Return on Equity.',
        inputs: [
          { key: 'ni', label: 'Net Income', type: 'number', defaultValue: 120000, step: 5000 },
          { key: 'sales', label: 'Total Revenue / Sales', type: 'number', defaultValue: 950000, min: 1, step: 10000 },
          { key: 'assets', label: 'Average Total Assets', type: 'number', defaultValue: 650000, min: 1, step: 10000 },
          { key: 'equity', label: 'Shareholders Equity', type: 'number', defaultValue: 400000, min: 1, step: 10000 },
        ],
        compute: (vals) => {
          const ni = num(vals, 'ni'), s = num(vals, 'sales', 1), a = num(vals, 'assets', 1), eq = num(vals, 'equity', 1);
          const npm = ni / s;
          const ato = s / a;
          const em = a / eq;
          const roe = npm * ato * em * 100;
          return {
            primary: { label: 'Return on Equity (ROE)', value: roe, formatted: `${roe.toFixed(2)}%`, unit: '%' },
            breakdown: [
              { label: 'Net Profit Margin', value: npm * 100, formatted: `${(npm * 100).toFixed(2)}%` },
              { label: 'Asset Turnover', value: ato, formatted: `${ato.toFixed(2)}×` },
              { label: 'Equity Multiplier', value: em, formatted: `${em.toFixed(2)}×` },
            ],
            steps: [`ROE = ${(npm * 100).toFixed(2)}% × ${ato.toFixed(2)} × ${em.toFixed(2)} = ${roe.toFixed(2)}%`],
          };
        },
      });
    }

    if (n.includes('bond') || n.includes('yield to') || n.includes('coupon') || n.includes('effective duration') || n.includes('credit spread')) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — exact fixed-income bond pricing, Yield to Maturity (YTM), Current Yield & Macaulay Duration.`,
        formulaDisplay: 'P = Σ [C / (1+y)^t] + Face / (1+y)^n  |  CY = AnnualCoupon / Price',
        explanation: 'Calculates bond fair price, current yield, YTM approximation, and modified duration sensitivity.',
        inputs: [
          { key: 'face', label: 'Face / Par Value', type: 'number', defaultValue: 1000, min: 100, step: 100 },
          { key: 'coupon', label: 'Annual Coupon Rate (%)', type: 'number', defaultValue: 5.5, min: 0, max: 30, step: 0.25 },
          { key: 'price', label: 'Current Market Price', type: 'number', defaultValue: 960, min: 10, step: 10 },
          { key: 'years', label: 'Years to Maturity', type: 'number', defaultValue: 10, min: 1, max: 50, step: 1 },
        ],
        compute: (vals, ctx) => {
          const face = num(vals, 'face', 1000);
          const cRate = num(vals, 'coupon', 5.5) / 100;
          const price = num(vals, 'price', 960);
          const yrs = num(vals, 'years', 10);
          const annC = face * cRate;
          const cy = (annC / price) * 100;
          const ytmApprox = ((annC + (face - price) / yrs) / ((face + price) / 2)) * 100;
          const y = ytmApprox / 100;
          const modDur = yrs / (1 + y / 2);
          return {
            primary: { label: n.includes('coupon') ? 'Annual Coupon Payment' : 'Approximate YTM (%)', value: n.includes('coupon') ? annC : ytmApprox, formatted: n.includes('coupon') ? fmtMoney(annC, ctx) : `${ytmApprox.toFixed(3)}%` },
            breakdown: [
              { label: 'Annual Coupon', value: annC, formatted: fmtMoney(annC, ctx) },
              { label: 'Current Yield', value: cy, formatted: `${cy.toFixed(3)}%` },
              { label: 'Approx Modified Duration', value: modDur, formatted: `${modDur.toFixed(2)} yrs` },
            ],
            steps: [`YTM ≈ (${annC.toFixed(2)} + (${face}−${price})/${yrs}) / ((${face}+${price})/2) = ${ytmApprox.toFixed(3)}%`],
          };
        },
      });
    }

    if (n.includes('fibonacci retracement')) {
      return makeBase(entry, {
        shortDescription: `Calculate key Fibonacci Retracement (23.6%, 38.2%, 50%, 61.8%, 78.6%) and Extension levels.`,
        formulaDisplay: 'Retracement = High − (High − Low) × Ratio',
        explanation: 'Computes exact technical support/resistance retracement levels for uptrend and downtrend swings.',
        inputs: [
          { key: 'high', label: 'Swing High Price', type: 'number', defaultValue: 250, step: 1 },
          { key: 'low', label: 'Swing Low Price', type: 'number', defaultValue: 180, step: 1 },
        ],
        compute: (vals, ctx) => {
          const hi = num(vals, 'high'), lo = num(vals, 'low');
          const diff = hi - lo;
          const l618 = hi - diff * 0.618;
          return {
            primary: { label: '61.8% Golden Ratio Level', value: l618, formatted: fmtMoney(l618, ctx) },
            breakdown: [
              { label: '23.6% Retracement', value: hi - diff * 0.236, formatted: fmtMoney(hi - diff * 0.236, ctx) },
              { label: '38.2% Retracement', value: hi - diff * 0.382, formatted: fmtMoney(hi - diff * 0.382, ctx) },
              { label: '50.0% Midpoint', value: hi - diff * 0.5, formatted: fmtMoney(hi - diff * 0.5, ctx) },
              { label: '78.6% Deep Level', value: hi - diff * 0.786, formatted: fmtMoney(hi - diff * 0.786, ctx) },
              { label: '161.8% Extension Target', value: hi + diff * 0.618, formatted: fmtMoney(hi + diff * 0.618, ctx) },
            ],
            steps: [`Swing range = ${fmtMoney(diff, ctx)}; 61.8% support = ${fmtMoney(l618, ctx)}`],
          };
        },
      });
    }

    if (n.includes('taylor rule') || n.includes('fisher equation') || n.includes('okun') || n.includes('phillips') || n.includes('cobb douglas') || n.includes('hhi') || n.includes('gini') || n.includes('elasticity') || n.includes('surplus') || n.includes('deadweight')) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — exact macroeconomic and microeconomic structural formula.`,
        formulaDisplay: n.includes('taylor')
          ? 'i = r* + π + 0.5(π − π*) + 0.5(y − y*)'
          : n.includes('fisher')
          ? '(1 + i) = (1 + r)(1 + π)'
          : n.includes('cobb')
          ? 'Y = A × L^α × K^(1−α)'
          : n.includes('deadweight') || n.includes('surplus')
          ? 'Area = 0.5 × ΔPrice × ΔQuantity'
          : 'Ratio = OutputMetric(InputA, InputB)',
        explanation: `Computes ${entry.name} using canonical economic equilibrium formulas.`,
        inputs: [
          { key: 'a', label: n.includes('cobb') ? 'TFP (A) & Labor' : n.includes('taylor') ? 'Inflation π (%)' : n.includes('fisher') ? 'Nominal Rate (%)' : 'Primary Parameter (A)', type: 'number', defaultValue: n.includes('cobb') ? 100 : n.includes('taylor') ? 3.2 : n.includes('fisher') ? 6 : 20, step: 0.5 },
          { key: 'b', label: n.includes('cobb') ? 'Capital Input (K)' : n.includes('taylor') ? 'Target Inflation π* (%)' : n.includes('fisher') ? 'Expected Inflation (%)' : 'Secondary Parameter (B)', type: 'number', defaultValue: n.includes('cobb') ? 50 : n.includes('taylor') ? 2.0 : n.includes('fisher') ? 2.5 : 10, step: 0.5 },
          { key: 'c', label: 'Elasticity / Weight / Gap', type: 'number', defaultValue: n.includes('cobb') ? 0.65 : 1.0, step: 0.1 },
        ],
        compute: (vals) => {
          const a = num(vals, 'a'), b = num(vals, 'b'), c = num(vals, 'c');
          if (n.includes('taylor')) {
            const targetRate = 2.0 + a + 0.5 * (a - b) + 0.5 * c;
            return {
              primary: { label: 'Taylor Target Policy Rate', value: targetRate, formatted: `${targetRate.toFixed(2)}%`, unit: '%' },
              breakdown: [{ label: 'Inflation Gap (π − π*)', value: a - b, formatted: `${(a - b).toFixed(2)}%` }],
              steps: [`i = 2.0 + ${a} + 0.5(${a - b}) + 0.5(${c}) = ${targetRate.toFixed(2)}%`],
            };
          }
          if (n.includes('fisher')) {
            const real = ((1 + a / 100) / (1 + b / 100) - 1) * 100;
            return {
              primary: { label: 'Exact Real Interest Rate', value: real, formatted: `${real.toFixed(3)}%`, unit: '%' },
              breakdown: [{ label: 'Approx Fisher (i − π)', value: a - b, formatted: `${(a - b).toFixed(2)}%` }],
              steps: [`r = (1+${a / 100})/(1+${b / 100}) − 1 = ${real.toFixed(3)}%`],
            };
          }
          if (n.includes('cobb')) {
            const alpha = Math.min(0.99, Math.max(0.01, c));
            const Y = Math.pow(Math.max(1, a), alpha) * Math.pow(Math.max(1, b), 1 - alpha);
            return {
              primary: { label: 'Total Output (Y)', value: Y, formatted: `${Y.toFixed(2)} units` },
              breakdown: [{ label: 'Labor Share α / Capital (1−α)', value: alpha, formatted: `${(alpha * 100).toFixed(0)}% / ${((1 - alpha) * 100).toFixed(0)}%` }],
              steps: [`Y = ${a}^${alpha} × ${b}^${(1 - alpha).toFixed(2)} = ${Y.toFixed(2)}`],
            };
          }
          const res = n.includes('surplus') || n.includes('deadweight') ? 0.5 * a * b * Math.abs(c) : a / Math.max(0.01, b);
          return {
            primary: { label: 'Calculated Economic Metric', value: res, formatted: `${res.toFixed(3)}` },
            breakdown: [{ label: 'Inputs A / B', value: res, formatted: `A=${a}, B=${b}, w=${c}` }],
            steps: [`Result = ${res.toFixed(3)}`],
          };
        },
      });
    }

    // General Corporate Ratio / EVA / WACC / Valuation Solver
    return makeBase(entry, {
      shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact corporate finance ratio and capital return formula.`,
      formulaDisplay: 'Metric = Numerator(Operating/Cash/EBIT) ÷ Capital / Base',
      explanation: `Evaluates ${entry.name} with capital efficiency, margin percentage, and enterprise benchmark comparison.`,
      inputs: [
        { key: 'numVal', label: n.includes('wacc') ? 'Cost of Equity (%)' : 'Numerator (EBIT / Cash Flow / Gain)', type: 'number', defaultValue: n.includes('wacc') ? 11 : 250000, step: 100 },
        { key: 'denVal', label: n.includes('wacc') ? 'After-Tax Cost of Debt (%)' : 'Denominator (Invested Capital / Debt / Sales)', type: 'number', defaultValue: n.includes('wacc') ? 4.5 : 1500000, min: 0.01, step: 100 },
        { key: 'weight', label: n.includes('wacc') ? 'Equity Weight (%)' : 'Tax / Discount Rate (%)', type: 'number', defaultValue: n.includes('wacc') ? 70 : 10, min: 0, max: 100, step: 1 },
      ],
      compute: (vals, ctx) => {
        const a = num(vals, 'numVal');
        const b = num(vals, 'denVal', 1);
        const w = num(vals, 'weight', 10) / 100;
        if (n.includes('wacc')) {
          const wacc = a * w + b * (1 - w);
          return {
            primary: { label: 'Weighted Average Cost of Capital', value: wacc, formatted: `${wacc.toFixed(2)}%`, unit: '%' },
            breakdown: [
              { label: 'Equity Contribution', value: a * w, formatted: `${(a * w).toFixed(2)}%` },
              { label: 'Debt Contribution', value: b * (1 - w), formatted: `${(b * (1 - w)).toFixed(2)}%` },
            ],
            steps: [`WACC = (${a}% × ${w.toFixed(2)}) + (${b}% × ${(1 - w).toFixed(2)}) = ${wacc.toFixed(2)}%`],
          };
        }
        const ratio = a / b;
        const eva = a - b * w;
        const isDollar = n.includes('eva') || n.includes('economic value') || n.includes('free cash') || n.includes('net present') || n.includes('ebit') || n.includes('ebt');
        const primaryVal = n.includes('eva') || n.includes('economic value') ? eva : n.includes('ratio') || n.includes('ev to') || n.includes('peg') ? ratio : ratio * 100;
        const formatted = isDollar
          ? fmtMoney(n.includes('eva') ? eva : a, ctx)
          : n.includes('ratio') || n.includes('ev to') || n.includes('peg')
          ? `${ratio.toFixed(3)}×`
          : `${(ratio * 100).toFixed(2)}%`;
        return {
          primary: { label: entry.name.replace(/ Calculator$/i, ''), value: primaryVal, formatted },
          breakdown: [
            { label: 'Ratio Multiple', value: ratio, formatted: `${ratio.toFixed(4)}×` },
            { label: 'Percentage Equivalent', value: ratio * 100, formatted: `${(ratio * 100).toFixed(2)}%` },
            { label: 'Economic Spread (A − B×r)', value: eva, formatted: fmtMoney(eva, ctx) },
          ],
          steps: [`Computed ${entry.name} = ${formatted}`],
        };
      },
    });
  }

  // 5. Business, HR, Logistics & Inventory (Bradford Factor, TRIR, DART, EOQ, Cash Conversion Cycle, CBM Shipping, Pallet, COGS, Churn, NPS)
  if (/\b(bradford|dart rate|trir|dpmo|eoq|cash conversion|days inventory|days sales|days payable|cbm|pallet|cogs|ending inventory|fifo|lifo|churn|net promoter|nps|startup runway|burndown|ppc|cpc|ctr|cpa|bill rate|billable|consulting|attrition|cost of meeting|cost of doing business)\b/.test(n)) {
    if (n.includes('bradford')) {
      return makeBase(entry, {
        shortDescription: `Bradford Factor HR absenteeism impact formula: B = S² × D.`,
        formulaDisplay: 'Bradford Score B = Spells² × Total Days Absent',
        explanation: 'Scores employee absence disruption frequency (Spells squared times total absence days).',
        inputs: [
          { key: 'spells', label: 'Separate Absence Spells (S)', type: 'number', defaultValue: 4, min: 0, step: 1 },
          { key: 'days', label: 'Total Days Absent (D)', type: 'number', defaultValue: 8, min: 0, step: 1 },
        ],
        compute: (vals) => {
          const s = num(vals, 'spells'), d = num(vals, 'days');
          const b = s * s * d;
          const level = b >= 400 ? 'High Review Trigger' : b >= 200 ? 'Warning Threshold' : 'Normal Range';
          return {
            primary: { label: 'Bradford Factor Score', value: b, formatted: `${b} (${level})` },
            breakdown: [{ label: 'Formula', value: b, formatted: `${s}² × ${d} = ${b}` }],
            steps: [`B = ${s}² × ${d} = ${b}`],
          };
        },
      });
    }

    if (n.includes('trir') || n.includes('dart')) {
      return makeBase(entry, {
        shortDescription: `OSHA workplace safety incidence rate: (Cases × 200,000) / Total Employee Hours Worked.`,
        formulaDisplay: 'Rate = (RecordableCases × 200,000) / TotalHoursWorked',
        explanation: 'Normalized per 100 full-time workers working 40 hrs/week × 50 weeks/year (200,000 hrs).',
        inputs: [
          { key: 'cases', label: 'OSHA Recordable / DART Cases', type: 'number', defaultValue: 3, min: 0, step: 1 },
          { key: 'hours', label: 'Total Hours Worked by All Staff', type: 'number', defaultValue: 250000, min: 100, step: 10000 },
        ],
        compute: (vals) => {
          const c = num(vals, 'cases'), h = num(vals, 'hours', 1);
          const rate = (c * 200000) / h;
          return {
            primary: { label: n.includes('dart') ? 'DART Safety Rate' : 'OSHA TRIR', value: rate, formatted: `${rate.toFixed(2)}` },
            breakdown: [{ label: '100-Worker Benchmark', value: rate, formatted: `${rate.toFixed(2)} incidents per 100 FTE/yr` }],
            steps: [`(${c} × 200,000) / ${h.toLocaleString()} = ${rate.toFixed(2)}`],
          };
        },
      });
    }

    if (n.includes('eoq')) {
      return makeBase(entry, {
        shortDescription: `Economic Order Quantity (EOQ) minimizing inventory holding and ordering costs.`,
        formulaDisplay: 'EOQ = √((2 × D × S) / H)',
        explanation: 'Computes optimal batch replenishment quantity and annual order frequency.',
        inputs: [
          { key: 'demand', label: 'Annual Demand (Units)', type: 'number', defaultValue: 12000, min: 1, step: 100 },
          { key: 'orderCost', label: 'Fixed Cost per Order ($)', type: 'number', defaultValue: 50, min: 0.1, step: 5 },
          { key: 'holdCost', label: 'Annual Holding Cost / Unit ($)', type: 'number', defaultValue: 4, min: 0.01, step: 0.5 },
        ],
        compute: (vals, ctx) => {
          const D = num(vals, 'demand'), S = num(vals, 'orderCost'), H = num(vals, 'holdCost', 1);
          const eoq = Math.sqrt((2 * D * S) / H);
          const ordersPerYr = D / Math.max(1, eoq);
          return {
            primary: { label: 'Optimal Order Quantity (EOQ)', value: eoq, formatted: `${Math.round(eoq).toLocaleString()} units` },
            breakdown: [
              { label: 'Orders Per Year', value: ordersPerYr, formatted: `${ordersPerYr.toFixed(1)} orders/yr` },
              { label: 'Annual Total Inventory Cost', value: ordersPerYr * S + (eoq / 2) * H, formatted: fmtMoney(ordersPerYr * S + (eoq / 2) * H, ctx) },
            ],
            steps: [`√(2 × ${D} × ${S} / ${H}) = ${eoq.toFixed(1)} units`],
          };
        },
      });
    }

    if (n.includes('cbm') || n.includes('pallet')) {
      return makeBase(entry, {
        shortDescription: `Calculate Cubic Meters (CBM), volumetric weight (÷5000 air / ÷1000 sea) & shipping container capacity.`,
        formulaDisplay: 'CBM = (L × W × H cm³ / 1,000,000) × Cartons',
        explanation: 'Computes total shipping CBM, air freight dimensional weight, and 20ft/40ft container fit.',
        inputs: [
          { key: 'l', label: 'Carton Length (cm)', type: 'number', defaultValue: 60, min: 1, step: 5 },
          { key: 'w', label: 'Carton Width (cm)', type: 'number', defaultValue: 40, min: 1, step: 5 },
          { key: 'h', label: 'Carton Height (cm)', type: 'number', defaultValue: 40, min: 1, step: 5 },
          { key: 'qty', label: 'Number of Cartons', type: 'number', defaultValue: 50, min: 1, step: 1 },
        ],
        compute: (vals) => {
          const l = num(vals, 'l'), w = num(vals, 'w'), h = num(vals, 'h'), q = num(vals, 'qty');
          const cbm = ((l * w * h) / 1e6) * q;
          const airKg = ((l * w * h) / 6000) * q;
          return {
            primary: { label: 'Total Volume (CBM)', value: cbm, formatted: `${cbm.toFixed(3)} m³`, unit: 'm³' },
            breakdown: [
              { label: 'Cubic Feet (ft³)', value: cbm * 35.3147, formatted: `${(cbm * 35.3147).toFixed(2)} ft³` },
              { label: 'Air Volumetric Weight', value: airKg, formatted: `${airKg.toFixed(1)} kg` },
              { label: '20ft Container Fill (~28 CBM)', value: (cbm / 28) * 100, formatted: `${((cbm / 28) * 100).toFixed(1)}%` },
            ],
            steps: [`${q} cartons × (${l}×${w}×${h} cm) = ${cbm.toFixed(3)} m³`],
          };
        },
      });
    }

    if (n.includes('cash conversion') || n.includes('days inventory') || n.includes('days sales') || n.includes('days payable')) {
      return makeBase(entry, {
        shortDescription: `Cash Conversion Cycle (CCC = DIO + DSO − DPO) working capital efficiency.`,
        formulaDisplay: 'CCC = DIO + DSO − DPO',
        explanation: 'Measures net days cash remains tied up in inventory and receivables minus supplier payables.',
        inputs: [
          { key: 'dio', label: 'Days Inventory Outstanding (DIO)', type: 'number', defaultValue: 45, min: 0, step: 1 },
          { key: 'dso', label: 'Days Sales Outstanding (DSO)', type: 'number', defaultValue: 32, min: 0, step: 1 },
          { key: 'dpo', label: 'Days Payable Outstanding (DPO)', type: 'number', defaultValue: 28, min: 0, step: 1 },
        ],
        compute: (vals) => {
          const dio = num(vals, 'dio'), dso = num(vals, 'dso'), dpo = num(vals, 'dpo');
          const ccc = dio + dso - dpo;
          const out = n.includes('days inventory') ? dio : n.includes('days sales') ? dso : n.includes('days payable') ? dpo : ccc;
          return {
            primary: { label: 'Cash Conversion Cycle', value: out, formatted: `${out.toFixed(1)} days`, unit: 'days' },
            breakdown: [
              { label: 'Net Working Capital Cycle', value: ccc, formatted: `${ccc.toFixed(1)} days` },
              { label: 'Operating Cycle (DIO + DSO)', value: dio + dso, formatted: `${(dio + dso).toFixed(1)} days` },
            ],
            steps: [`CCC = ${dio} + ${dso} − ${dpo} = ${ccc} days`],
          };
        },
      });
    }
  }

  // 6. General Retirement / Investment / Compound / 403B / 529 / ELSS / SSY / Saving / Wedding Budget
  return makeBase(entry, {
    shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact compounding projection, contributions & real purchasing power.`,
    formulaDisplay: 'FV = P(1+r/n)^(nt) + PMT × [((1+r/n)^(nt) − 1) / (r/n)]',
    explanation: `Deterministic compounding wealth projection for ${entry.name}.`,
    inputs: [
      { key: 'initial', label: 'Initial Balance / Principal', type: 'number', defaultValue: 10000, min: 0, step: 500 },
      { key: 'monthly', label: 'Monthly Contribution', type: 'number', defaultValue: 500, min: 0, step: 50 },
      { key: 'rate', label: 'Annual Return / Rate (%)', type: 'number', defaultValue: n.includes('elss') ? 12 : n.includes('ssy') ? 8.2 : 8, min: 0, max: 40, step: 0.25 },
      { key: 'years', label: 'Time Horizon (Years)', type: 'number', defaultValue: n.includes('529') ? 15 : 20, min: 1, max: 50, step: 1 },
    ],
    compute: (vals, ctx) => {
      const P = num(vals, 'initial');
      const pmt = num(vals, 'monthly');
      const r = num(vals, 'rate', 8) / 100 / 12;
      const yrs = Math.max(1, num(vals, 'years', 20));
      const months = yrs * 12;
      const fv = r === 0 ? P + pmt * months : P * Math.pow(1 + r, months) + pmt * ((Math.pow(1 + r, months) - 1) / r);
      const contrib = P + pmt * months;
      const growth = fv - contrib;
      return {
        primary: { label: 'Projected Future Value', value: fv, formatted: fmtMoney(fv, ctx) },
        breakdown: [
          { label: 'Total Contributions', value: contrib, formatted: fmtMoney(contrib, ctx) },
          { label: 'Investment Growth / Interest', value: growth, formatted: fmtMoney(growth, ctx) },
          { label: 'Monthly 4% Sustainable Draw', value: (fv * 0.04) / 12, formatted: `${fmtMoney((fv * 0.04) / 12, ctx)}/mo` },
        ],
        steps: [`${fmtMoney(P, ctx)} + ${fmtMoney(pmt, ctx)}/mo @ ${num(vals, 'rate')}% for ${yrs}y = ${fmtMoney(fv, ctx)}`],
      };
    },
  });
}
