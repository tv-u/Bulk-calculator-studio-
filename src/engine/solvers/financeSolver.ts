import Decimal from 'decimal.js';
import type { CalculatorDefinition, CalculatorField, CalculatorResult } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import type { CatalogEntryMeta } from '../catalogTypes';
import { formatCurrency, formatNumber } from '../formatters';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const FINANCIAL_DISCLAIMER =
  'Financial estimate for planning purposes only (Jurisdiction configurable: India INR & Global). Verify statutory tax slabs, lender processing fees, and market risk before decisions.';

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - prob : prob;
}

function normalPDF(x: number): number {
  return 0.3989422804014327 * Math.exp((-x * x) / 2);
}

function calcEmiDecimal(P: Decimal, annualRatePct: Decimal, months: number): Decimal {
  if (months <= 0) throw new Error('Tenure months must be positive.');
  if (annualRatePct.eq(0)) return P.div(months);
  const r = annualRatePct.div(1200);
  const onePlusR = r.plus(1);
  const pow = onePlusR.pow(months);
  return P.times(r).times(pow).div(pow.minus(1));
}

export function buildFinanceDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();
  const baseDef = {
    id: entry.slug,
    name: entry.name,
    shortDescription: `${entry.name} (#${entry.catalogNumber}) — high-precision decimal calculation with formula steps and assumptions.`,
    category: 'finance' as const,
    categoryLabel: entry.categoryLabel,
    keywords: [entry.name.toLowerCase(), entry.subcategory.toLowerCase(), 'finance', 'decimal precision'],
    synonyms: [entry.slug.replace(/-/g, ' ')],
    disclaimer: FINANCIAL_DISCLAIMER,
    relatedIds: ['emi-calculator', 'sip-calculator', 'gst-calculator', 'income-tax-calculator'],
  };

  // 1. Options & Black-Scholes Greeks
  if (entry.solverKey === 'options_black_scholes') {
    const isPut = n.includes('put');
    const isBreakeven = n.includes('breakeven');
    if (isBreakeven) {
      return {
        ...baseDef,
        formulaDisplay: 'Call Breakeven = Strike + Premium  |  Put Breakeven = Strike - Premium',
        explanation: 'Computes exact options breakeven price and net payoff at expiry.',
        assumptions: 'European/American expiry payoff excluding brokerage taxes; single lot contract.',
        inputs: [
          { key: 'type', label: 'Option Type', type: 'select', defaultValue: isPut ? 'put' : 'call', options: [{ label: 'Call (CE)', value: 'call' }, { label: 'Put (PE)', value: 'put' }] },
          { key: 'strike', label: 'Strike Price', type: 'number', defaultValue: 24000, min: 0.01, step: 50 },
          { key: 'premium', label: 'Option Premium Paid', type: 'number', defaultValue: 220, min: 0, step: 1 },
          { key: 'spotExpiry', label: 'Expected Expiry Spot', type: 'number', defaultValue: 24500, min: 0, step: 50 },
          { key: 'qty', label: 'Lot Quantity', type: 'number', defaultValue: 50, min: 1, step: 1 },
        ],
        compute: (values, ctx): CalculatorResult => {
          const type = str(values, 'type', 'call');
          const K = num(values, 'strike');
          const prem = num(values, 'premium');
          const spot = num(values, 'spotExpiry');
          const qty = num(values, 'qty');
          if (K <= 0 || qty <= 0) throw new Error('Strike and quantity must be positive.');
          const be = type === 'call' ? K + prem : K - prem;
          const intrinsic = type === 'call' ? Math.max(0, spot - K) : Math.max(0, K - spot);
          const pnl = (intrinsic - prem) * qty;
          const cur = ctx?.currency ?? 'INR';
          const loc = ctx?.locale ?? 'en-IN';
          return {
            primary: { label: 'Breakeven Price', value: be, formatted: formatCurrency(be, cur, loc) },
            breakdown: [
              { label: 'Net P&L at Expiry', value: pnl, formatted: formatCurrency(pnl, cur, loc) },
              { label: 'Intrinsic Value / Unit', value: intrinsic, formatted: formatCurrency(intrinsic, cur, loc) },
              { label: 'Max Risk (Capital)', value: prem * qty, formatted: formatCurrency(prem * qty, cur, loc) },
            ],
            steps: [`Breakeven = ${K} ${type === 'call' ? '+' : '-'} ${prem} = ${be}`, `Payoff = (${intrinsic} - ${prem}) × ${qty} = ${pnl.toFixed(2)}`],
          };
        },
      };
    }
    return {
      ...baseDef,
      formulaDisplay: 'C = S·N(d₁) - K·e^(-rT)·N(d₂),  d₁ = [ln(S/K) + (r + σ²/2)T] / (σ√T)',
      explanation: 'Computes European option theoretical price and all 5 Greeks (Delta, Gamma, Theta, Vega, Rho) using Black-Scholes-Merton.',
      assumptions: 'Continuous compounding risk-free rate r, constant annualized volatility σ, zero dividends.',
      inputs: [
        { key: 'type', label: 'Option Type', type: 'select', defaultValue: isPut ? 'put' : 'call', options: [{ label: 'Call Option', value: 'call' }, { label: 'Put Option', value: 'put' }] },
        { key: 'spot', label: 'Spot Price (S)', type: 'number', defaultValue: 100, min: 0.01, step: 1 },
        { key: 'strike', label: 'Strike Price (K)', type: 'number', defaultValue: 100, min: 0.01, step: 1 },
        { key: 'rate', label: 'Risk-Free Rate (%)', type: 'number', defaultValue: 6.5, min: 0, max: 50, step: 0.1 },
        { key: 'vol', label: 'Implied Volatility σ (%)', type: 'number', defaultValue: 20, min: 0.1, max: 300, step: 0.5 },
        { key: 'days', label: 'Days to Expiry', type: 'number', defaultValue: 30, min: 1, max: 3650, step: 1 },
      ],
      compute: (values): CalculatorResult => {
        const type = str(values, 'type', 'call');
        const S = num(values, 'spot');
        const K = num(values, 'strike');
        const r = num(values, 'rate') / 100;
        const sigma = num(values, 'vol') / 100;
        const T = num(values, 'days') / 365;
        if (S <= 0 || K <= 0 || sigma <= 0 || T <= 0) throw new Error('Spot, strike, volatility, and days must be positive.');
        const sqrtT = Math.sqrt(T);
        const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
        const d2 = d1 - sigma * sqrtT;
        const disc = Math.exp(-r * T);
        const price =
          type === 'call'
            ? S * normalCDF(d1) - K * disc * normalCDF(d2)
            : K * disc * normalCDF(-d2) - S * normalCDF(-d1);
        const delta = type === 'call' ? normalCDF(d1) : normalCDF(d1) - 1;
        const gamma = normalPDF(d1) / (S * sigma * sqrtT);
        const vega = (S * normalPDF(d1) * sqrtT) / 100;
        const thetaAnnual =
          type === 'call'
            ? -(S * normalPDF(d1) * sigma) / (2 * sqrtT) - r * K * disc * normalCDF(d2)
            : -(S * normalPDF(d1) * sigma) / (2 * sqrtT) + r * K * disc * normalCDF(-d2);
        const thetaDaily = thetaAnnual / 365;
        const rho =
          type === 'call'
            ? (K * T * disc * normalCDF(d2)) / 100
            : (-K * T * disc * normalCDF(-d2)) / 100;

        let primaryLabel = `${type.toUpperCase()} Theoretical Price`;
        let primaryVal = price;
        if (n.includes('delta')) { primaryLabel = 'Delta (Δ)'; primaryVal = delta; }
        else if (n.includes('gamma')) { primaryLabel = 'Gamma (Γ)'; primaryVal = gamma; }
        else if (n.includes('theta')) { primaryLabel = 'Daily Theta (Θ)'; primaryVal = thetaDaily; }
        else if (n.includes('vega')) { primaryLabel = 'Vega (ν per 1% vol)'; primaryVal = vega; }
        else if (n.includes('rho')) { primaryLabel = 'Rho (ρ per 1% rate)'; primaryVal = rho; }

        return {
          primary: { label: primaryLabel, value: primaryVal, formatted: primaryVal.toFixed(4) },
          breakdown: [
            { label: `${type.toUpperCase()} Fair Value`, value: price, formatted: price.toFixed(4) },
            { label: 'Delta (Δ)', value: delta, formatted: delta.toFixed(4) },
            { label: 'Gamma (Γ)', value: gamma, formatted: gamma.toFixed(5) },
            { label: 'Daily Theta (Θ)', value: thetaDaily, formatted: thetaDaily.toFixed(4) },
            { label: 'Vega (ν)', value: vega, formatted: vega.toFixed(4) },
            { label: 'Rho (ρ)', value: rho, formatted: rho.toFixed(4) },
          ],
          steps: [`d₁ = ${d1.toFixed(4)}, d₂ = ${d2.toFixed(4)}`, `Black-Scholes Price = ${price.toFixed(4)}`],
        };
      },
    };
  }

  // 2. Trading Charges, Brokerage, STT, Stamp Duty & Margin
  if (entry.solverKey === 'trading_charges') {
    return {
      ...baseDef,
      formulaDisplay: 'Net P&L = Gross P&L - (Brokerage + STT + Exchange Txn + Stamp Duty + SEBI + 18% GST)',
      explanation: 'Calculates exact net trading profit, statutory charges (Indian equity intraday/delivery/F&O convention), and breakeven points.',
      assumptions: 'Indian equity delivery STT 0.1%, intraday sell-side STT 0.025%, GST 18% on brokerage + exchange fees.',
      inputs: [
        { key: 'segment', label: 'Segment', type: 'select', defaultValue: n.includes('delivery') ? 'delivery' : 'intraday', options: [{ label: 'Equity Intraday', value: 'intraday' }, { label: 'Equity Delivery', value: 'delivery' }, { label: 'Futures', value: 'futures' }] },
        { key: 'buyPrice', label: 'Buy Price', type: 'number', defaultValue: 500, min: 0.01, step: 1 },
        { key: 'sellPrice', label: 'Sell Price', type: 'number', defaultValue: 525, min: 0.01, step: 1 },
        { key: 'qty', label: 'Quantity', type: 'number', defaultValue: 200, min: 1, step: 1 },
        { key: 'brokeragePct', label: 'Brokerage Rate (%)', type: 'number', defaultValue: 0.03, min: 0, max: 2, step: 0.01 },
      ],
      compute: (values, ctx): CalculatorResult => {
        const seg = str(values, 'segment', 'intraday');
        const buy = new Decimal(num(values, 'buyPrice'));
        const sell = new Decimal(num(values, 'sellPrice'));
        const qty = new Decimal(num(values, 'qty'));
        const bRate = new Decimal(num(values, 'brokeragePct')).div(100);
        if (buy.lte(0) || sell.lte(0) || qty.lte(0)) throw new Error('Prices and quantity must be positive.');
        const buyVal = buy.times(qty);
        const sellVal = sell.times(qty);
        const turnover = buyVal.plus(sellVal);
        const gross = sellVal.minus(buyVal);
        const brokerage = Decimal.min(turnover.times(bRate), new Decimal(40)); // max ₹20 per leg typical discount broker
        const sttRate = seg === 'delivery' ? 0.001 : seg === 'intraday' ? 0.00025 : 0.0002;
        const stt = seg === 'delivery' ? turnover.times(sttRate) : sellVal.times(sttRate);
        const exchangeFee = turnover.times(0.0000325);
        const stamp = buyVal.times(seg === 'delivery' ? 0.00015 : 0.00003);
        const sebi = turnover.times(0.000001);
        const gst = brokerage.plus(exchangeFee).times(0.18);
        const totalCharges = brokerage.plus(stt).plus(exchangeFee).plus(stamp).plus(sebi).plus(gst);
        const net = gross.minus(totalCharges);
        const cur = ctx?.currency ?? 'INR';
        const loc = ctx?.locale ?? 'en-IN';
        return {
          primary: { label: 'Net Profit / Loss', value: net.toNumber(), formatted: formatCurrency(net.toNumber(), cur, loc) },
          breakdown: [
            { label: 'Gross P&L', value: gross.toNumber(), formatted: formatCurrency(gross.toNumber(), cur, loc) },
            { label: 'Total Charges & Taxes', value: totalCharges.toNumber(), formatted: formatCurrency(totalCharges.toNumber(), cur, loc) },
            { label: 'STT + Stamp Duty', value: stt.plus(stamp).toNumber(), formatted: formatCurrency(stt.plus(stamp).toNumber(), cur, loc) },
            { label: 'Points to Breakeven', value: totalCharges.div(qty).toNumber(), formatted: totalCharges.div(qty).toFixed(4) },
          ],
          steps: [`Turnover = ${formatCurrency(turnover.toNumber(), cur, loc)}`, `Total Deductions = ${formatCurrency(totalCharges.toNumber(), cur, loc)}`, `Net P&L = ${formatCurrency(net.toNumber(), cur, loc)}`],
        };
      },
    };
  }

  // 3. Forex Pip & Position Sizing
  if (entry.solverKey === 'forex_pip') {
    return {
      ...baseDef,
      formulaDisplay: 'Position Units = (Account × Risk%) / (StopLoss Pips × Pip Value)',
      explanation: 'Determines risk-controlled forex position lot size, pip value, and expected trade profit.',
      assumptions: 'Standard 1 Lot = 100,000 units; 1 pip = 0.0001 (non-JPY pairs).',
      inputs: [
        { key: 'account', label: 'Account Balance ($)', type: 'number', defaultValue: 10000, min: 1, step: 100 },
        { key: 'riskPct', label: 'Risk per Trade (%)', type: 'number', defaultValue: 1, min: 0.05, max: 20, step: 0.25 },
        { key: 'stopPips', label: 'Stop Loss (Pips)', type: 'number', defaultValue: 25, min: 1, step: 1 },
        { key: 'targetPips', label: 'Take Profit (Pips)', type: 'number', defaultValue: 60, min: 1, step: 1 },
      ],
      compute: (values): CalculatorResult => {
        const acc = num(values, 'account');
        const risk = num(values, 'riskPct') / 100;
        const sl = num(values, 'stopPips');
        const tp = num(values, 'targetPips');
        if (acc <= 0 || sl <= 0) throw new Error('Account balance and Stop Loss pips must be positive.');
        const riskMoney = acc * risk;
        const pipValuePerStdLot = 10;
        const lots = riskMoney / (sl * pipValuePerStdLot);
        const potentialProfit = lots * tp * pipValuePerStdLot;
        return {
          primary: { label: 'Recommended Lot Size', value: lots, formatted: `${lots.toFixed(3)} Std Lots (${Math.round(lots * 100000).toLocaleString()} units)` },
          breakdown: [
            { label: 'Dollar Risk Amount', value: riskMoney, formatted: `$${riskMoney.toFixed(2)}` },
            { label: 'Target Profit at TP', value: potentialProfit, formatted: `$${potentialProfit.toFixed(2)}` },
            { label: 'Reward-to-Risk Ratio', value: tp / sl, formatted: `${(tp / sl).toFixed(2)} : 1` },
          ],
          steps: [`Risk = $${acc} × ${(risk * 100).toFixed(2)}% = $${riskMoney.toFixed(2)}`, `Lots = $${riskMoney.toFixed(2)} / (${sl} × $10) = ${lots.toFixed(3)}`],
        };
      },
    };
  }

  // 4. Crypto, Mining, Staking & DeFi Impermanent Loss
  if (entry.solverKey === 'crypto_defi') {
    if (n.includes('impermanent') || n.includes('liquidity')) {
      return {
        ...baseDef,
        formulaDisplay: 'IL = 2·√r / (1 + r) - 1,  where r = Final Price / Initial Price',
        explanation: 'Calculates exact Constant-Product AMM (Uniswap v2 x·y=k) impermanent loss vs HODLing.',
        assumptions: '50/50 dual-asset AMM pool excluding earned LP swap fees.',
        inputs: [
          { key: 'depositUsd', label: 'Initial Pool Deposit ($)', type: 'number', defaultValue: 10000, min: 1, step: 100 },
          { key: 'priceRatioPct', label: 'Token Price Change (%)', type: 'number', defaultValue: 100, min: -99, max: 5000, step: 5 },
        ],
        compute: (values): CalculatorResult => {
          const dep = num(values, 'depositUsd');
          const chg = num(values, 'priceRatioPct');
          if (dep <= 0 || chg <= -100) throw new Error('Deposit must be positive and price change > -100%.');
          const r = 1 + chg / 100;
          const ilFactor = (2 * Math.sqrt(r)) / (1 + r) - 1;
          const hodlValue = dep * (0.5 * r + 0.5);
          const lpValue = hodlValue * (1 + ilFactor);
          const ilUsd = lpValue - hodlValue;
          return {
            primary: { label: 'Impermanent Loss (%)', value: ilFactor * 100, formatted: `${(ilFactor * 100).toFixed(3)}%` },
            breakdown: [
              { label: 'HODL Portfolio Value', value: hodlValue, formatted: `$${hodlValue.toFixed(2)}` },
              { label: 'AMM LP Value (ex-fees)', value: lpValue, formatted: `$${lpValue.toFixed(2)}` },
              { label: 'Dollar Divergence', value: ilUsd, formatted: `$${ilUsd.toFixed(2)}` },
            ],
            steps: [`Price Ratio r = ${r.toFixed(3)}`, `IL = 2√${r.toFixed(3)} / (1 + ${r.toFixed(3)}) - 1 = ${(ilFactor * 100).toFixed(3)}%`],
          };
        },
      };
    }
    return {
      ...baseDef,
      formulaDisplay: 'Net Return = Final Value - Initial Investment - Network/Tax Costs  |  APY = (1 + APR/n)^n - 1',
      explanation: 'Computes crypto ROI, staking APY compounding, mining revenue, or net post-tax gain.',
      assumptions: 'Constant staking APY or fixed tax slab as entered.',
      inputs: [
        { key: 'invested', label: 'Initial Capital / Hash Value ($)', type: 'number', defaultValue: 5000, min: 0.01, step: 50 },
        { key: 'ratePct', label: 'Return / Staking APR (%)', type: 'number', defaultValue: 18, min: -99, max: 2000, step: 0.5 },
        { key: 'months', label: 'Duration (Months)', type: 'number', defaultValue: 12, min: 1, max: 240, step: 1 },
        { key: 'feePct', label: 'Gas / Pool Fee & Tax (%)', type: 'number', defaultValue: 2, min: 0, max: 60, step: 0.5 },
      ],
      compute: (values): CalculatorResult => {
        const cap = num(values, 'invested');
        const apr = num(values, 'ratePct') / 100;
        const m = num(values, 'months');
        const fee = num(values, 'feePct') / 100;
        if (cap <= 0 || m <= 0) throw new Error('Capital and duration must be positive.');
        const apy = Math.pow(1 + apr / 365, 365) - 1;
        const grossEnd = cap * Math.pow(1 + apr / 12, m);
        const grossGain = grossEnd - cap;
        const fees = grossGain > 0 ? grossGain * fee : 0;
        const netEnd = grossEnd - fees;
        return {
          primary: { label: 'Projected Net Value', value: netEnd, formatted: `$${netEnd.toFixed(2)}` },
          breakdown: [
            { label: 'Net Gain / Loss', value: netEnd - cap, formatted: `$${(netEnd - cap).toFixed(2)}` },
            { label: 'Effective APY (Daily Comp.)', value: apy * 100, formatted: `${(apy * 100).toFixed(2)}%` },
            { label: 'Estimated Fees / Tax', value: fees, formatted: `$${fees.toFixed(2)}` },
          ],
          steps: [`Gross Value = $${cap} × (1 + ${(apr * 100).toFixed(2)}%/12)^${m} = $${grossEnd.toFixed(2)}`, `Net after ${(fee * 100).toFixed(1)}% fees = $${netEnd.toFixed(2)}`],
        };
      },
    };
  }

  // 5. Equity Valuation, Ratios, Portfolio & DCF
  if (entry.solverKey === 'equity_valuation') {
    if (n.includes('stock average') || n.includes('weighted stock') || n.includes('break even stock')) {
      return {
        ...baseDef,
        formulaDisplay: 'Average Price = (Q₁·P₁ + Q₂·P₂) / (Q₁ + Q₂)',
        explanation: 'Calculates weighted average buy price when averaging down or adding shares.',
        inputs: [
          { key: 'q1', label: 'Existing Shares (Q₁)', type: 'number', defaultValue: 100, min: 1, step: 1 },
          { key: 'p1', label: 'Existing Avg Price (P₁)', type: 'number', defaultValue: 450, min: 0.01, step: 1 },
          { key: 'q2', label: 'New Shares Added (Q₂)', type: 'number', defaultValue: 150, min: 0, step: 1 },
          { key: 'p2', label: 'New Buy Price (P₂)', type: 'number', defaultValue: 320, min: 0.01, step: 1 },
        ],
        compute: (values, ctx): CalculatorResult => {
          const q1 = new Decimal(num(values, 'q1'));
          const p1 = new Decimal(num(values, 'p1'));
          const q2 = new Decimal(num(values, 'q2'));
          const p2 = new Decimal(num(values, 'p2'));
          const totalQ = q1.plus(q2);
          if (totalQ.lte(0)) throw new Error('Total shares must be positive.');
          const totalCost = q1.times(p1).plus(q2.times(p2));
          const avg = totalCost.div(totalQ);
          const cur = ctx?.currency ?? 'INR';
          const loc = ctx?.locale ?? 'en-IN';
          return {
            primary: { label: 'New Weighted Avg Price', value: avg.toNumber(), formatted: formatCurrency(avg.toNumber(), cur, loc) },
            breakdown: [
              { label: 'Total Shares', value: totalQ.toNumber(), formatted: totalQ.toFixed(0) },
              { label: 'Total Capital Invested', value: totalCost.toNumber(), formatted: formatCurrency(totalCost.toNumber(), cur, loc) },
              { label: 'Avg Reduction vs P₁', value: p1.minus(avg).toNumber(), formatted: formatCurrency(p1.minus(avg).toNumber(), cur, loc) },
            ],
            steps: [`Total Cost = ${totalCost.toFixed(2)}`, `Average = ${totalCost.toFixed(2)} / ${totalQ.toFixed(0)} = ${avg.toFixed(2)}`],
          };
        },
      };
    }
    return {
      ...baseDef,
      formulaDisplay: n.includes('sharpe')
        ? 'Sharpe = (Rp - Rf) / σp'
        : n.includes('wacc')
        ? 'WACC = (E/V)·Re + (D/V)·Rd·(1 - Tc)'
        : 'DCF Intrinsic Value = Σ FCF·(1+g)^t / (1+WACC)^t + Terminal Value',
      explanation: 'Computes equity fundamental valuation, risk-adjusted Sharpe ratio, or discounted cash flow (DCF) intrinsic value.',
      assumptions: 'Constant growth & discount rates over projection window.',
      inputs: [
        { key: 'cashflowOrRet', label: n.includes('sharpe') || n.includes('alpha') || n.includes('beta') ? 'Portfolio Return (%)' : 'Annual Cash Flow / Earnings', type: 'number', defaultValue: n.includes('sharpe') ? 16 : 1000000, step: 0.5 },
        { key: 'benchOrRf', label: n.includes('sharpe') ? 'Risk-Free Rate (%)' : 'Discount / WACC Rate (%)', type: 'number', defaultValue: n.includes('sharpe') ? 6.5 : 11, min: 0.1, max: 60, step: 0.5 },
        { key: 'volOrGrowth', label: n.includes('sharpe') ? 'Portfolio Volatility σ (%)' : 'Growth Rate (%)', type: 'number', defaultValue: n.includes('sharpe') ? 14 : 6, min: 0.1, max: 100, step: 0.5 },
        { key: 'years', label: 'Horizon / Shares Multiplier (Years)', type: 'number', defaultValue: 5, min: 1, max: 30, step: 1 },
      ],
      compute: (values, ctx): CalculatorResult => {
        const a = num(values, 'cashflowOrRet');
        const b = num(values, 'benchOrRf');
        const c = num(values, 'volOrGrowth');
        const yrs = num(values, 'years');
        if (n.includes('sharpe') || n.includes('sortino') || n.includes('treynor') || n.includes('alpha')) {
          if (c <= 0) throw new Error('Volatility / Beta must be positive.');
          const ratio = (a - b) / c;
          return {
            primary: { label: 'Risk-Adjusted Metric', value: ratio, formatted: ratio.toFixed(3) },
            breakdown: [
              { label: 'Excess Return (Rp - Rf)', value: a - b, formatted: `${(a - b).toFixed(2)}%` },
              { label: 'Risk Denominator', value: c, formatted: `${c.toFixed(2)}%` },
            ],
            steps: [`(${a} - ${b}) / ${c} = ${ratio.toFixed(4)}`],
          };
        }
        const r = b / 100;
        const g = c / 100;
        if (r <= g) throw new Error('Discount rate must exceed terminal growth rate.');
        let pvSum = 0;
        let lastFcf = a;
        for (let t = 1; t <= yrs; t++) {
          lastFcf = a * Math.pow(1 + g, t);
          pvSum += lastFcf / Math.pow(1 + r, t);
        }
        const tv = (lastFcf * (1 + g)) / (r - g);
        const pvTv = tv / Math.pow(1 + r, yrs);
        const total = pvSum + pvTv;
        const cur = ctx?.currency ?? 'INR';
        const loc = ctx?.locale ?? 'en-IN';
        return {
          primary: { label: 'Intrinsic / DCF Valuation', value: total, formatted: formatCurrency(total, cur, loc) },
          breakdown: [
            { label: 'PV of Explicit Cash Flows', value: pvSum, formatted: formatCurrency(pvSum, cur, loc) },
            { label: 'PV of Terminal Value', value: pvTv, formatted: formatCurrency(pvTv, cur, loc) },
            { label: 'Implied Earnings Multiple', value: a > 0 ? total / a : 0, formatted: `${(a > 0 ? total / a : 0).toFixed(2)}x` },
          ],
          steps: [`PV(${yrs}y flows) = ${formatCurrency(pvSum, cur, loc)}`, `Terminal PV = ${formatCurrency(pvTv, cur, loc)}`, `Total = ${formatCurrency(total, cur, loc)}`],
        };
      },
    };
  }

  // 6. Tax, Salary, Payroll, Gratuity, HRA, PF
  if (entry.solverKey === 'tax_payroll') {
    if (n.includes('gratuity')) {
      return {
        ...baseDef,
        formulaDisplay: 'Gratuity = (15 × Last Drawn Basic + DA × Completed Years) / 26',
        explanation: 'Computes Indian Payment of Gratuity Act (1972) eligibility and payout.',
        inputs: [
          { key: 'salary', label: 'Last Drawn Monthly Basic + DA', type: 'number', defaultValue: 65000, min: 1, step: 500 },
          { key: 'years', label: 'Years of Continuous Service', type: 'number', defaultValue: 8, min: 1, max: 50, step: 1 },
        ],
        compute: (values, ctx): CalculatorResult => {
          const sal = new Decimal(num(values, 'salary'));
          const yrs = new Decimal(num(values, 'years'));
          if (sal.lte(0) || yrs.lte(0)) throw new Error('Salary and years must be positive.');
          const grat = new Decimal(15).times(sal).times(yrs).div(26);
          const cur = ctx?.currency ?? 'INR';
          const loc = ctx?.locale ?? 'en-IN';
          return {
            primary: { label: 'Estimated Gratuity Amount', value: grat.toNumber(), formatted: formatCurrency(grat.toNumber(), cur, loc) },
            breakdown: [
              { label: 'Statutory 5-Year Eligibility', value: yrs.gte(5) ? 'Eligible' : 'Below 5 yrs', formatted: yrs.gte(5) ? 'Eligible (≥5 yrs)' : 'Not Yet Eligible (<5 yrs)' },
              { label: 'Tax-Exempt Cap (India)', value: 2000000, formatted: formatCurrency(2000000, cur, loc) },
            ],
            steps: [`(15 × ${sal.toFixed(0)} × ${yrs.toFixed(0)}) / 26 = ${grat.toFixed(2)}`],
          };
        },
      };
    }
    return {
      ...baseDef,
      formulaDisplay: 'Net Pay = Gross Income - (Tax / Statutory Deductions + PF)',
      explanation: 'Computes tax/TDS liability, take-home salary, PF contribution, or wage rate with configurable deduction percentages.',
      assumptions: 'FY 2025-26 standard deduction conventions; verify exact employer salary breakup.',
      inputs: [
        { key: 'gross', label: 'Annual / Monthly Gross Amount', type: 'number', defaultValue: 1200000, min: 0, step: 5000 },
        { key: 'taxPct', label: 'Effective Tax / TDS Rate (%)', type: 'number', defaultValue: 10, min: 0, max: 55, step: 0.5 },
        { key: 'pfPct', label: 'PF / Benefits Deduction (%)', type: 'number', defaultValue: 12, min: 0, max: 35, step: 0.5 },
        { key: 'exempt', label: 'Exemptions / HRA / Deductions', type: 'number', defaultValue: 75000, min: 0, step: 1000 },
      ],
      compute: (values, ctx): CalculatorResult => {
        const gross = new Decimal(num(values, 'gross'));
        const taxR = new Decimal(num(values, 'taxPct')).div(100);
        const pfR = new Decimal(num(values, 'pfPct')).div(100);
        const ex = new Decimal(num(values, 'exempt'));
        const taxable = Decimal.max(0, gross.minus(ex));
        const tax = taxable.times(taxR);
        const pf = gross.times(pfR);
        const net = gross.minus(tax).minus(pf);
        const cur = ctx?.currency ?? 'INR';
        const loc = ctx?.locale ?? 'en-IN';
        return {
          primary: { label: n.includes('tax') || n.includes('tds') || n.includes('vat') ? 'Calculated Tax / Deduction' : 'Net Take-Home Amount', value: (n.includes('tax') || n.includes('tds') || n.includes('vat') ? tax : net).toNumber(), formatted: formatCurrency((n.includes('tax') || n.includes('tds') || n.includes('vat') ? tax : net).toNumber(), cur, loc) },
          breakdown: [
            { label: 'Taxable Base', value: taxable.toNumber(), formatted: formatCurrency(taxable.toNumber(), cur, loc) },
            { label: 'Tax / TDS Amount', value: tax.toNumber(), formatted: formatCurrency(tax.toNumber(), cur, loc) },
            { label: 'PF / Statutory Contribution', value: pf.toNumber(), formatted: formatCurrency(pf.toNumber(), cur, loc) },
            { label: 'Monthly Net Equivalent', value: net.div(12).toNumber(), formatted: formatCurrency(net.div(12).toNumber(), cur, loc) },
          ],
          steps: [`Taxable = max(0, ${gross.toFixed(0)} - ${ex.toFixed(0)}) = ${taxable.toFixed(0)}`, `Tax = ${tax.toFixed(2)}, Net = ${net.toFixed(2)}`],
        };
      },
    };
  }

  // 7. Insurance & Risk Management
  if (entry.solverKey === 'insurance_risk') {
    return {
      ...baseDef,
      formulaDisplay: 'Recommended Cover = Annual Income × Replacement Multiplier + Liabilities - Existing Assets',
      explanation: 'Estimates Human Life Value / insurance cover requirement, net claim settlement after deductible & co-pay, and annualized premium efficiency.',
      inputs: [
        { key: 'incomeOrClaim', label: n.includes('claim') || n.includes('deductible') || n.includes('co-pay') ? 'Claimed Bill Amount' : 'Annual Income / Asset Value', type: 'number', defaultValue: 1200000, min: 1, step: 10000 },
        { key: 'multOrCopay', label: n.includes('claim') || n.includes('deductible') || n.includes('co-pay') ? 'Co-Pay (%)' : 'Income Multiplier (Years)', type: 'number', defaultValue: n.includes('claim') ? 10 : 15, min: 0, max: 50, step: 1 },
        { key: 'liabOrDeduct', label: n.includes('claim') ? 'Policy Deductible' : 'Outstanding Loans / Liabilities', type: 'number', defaultValue: 500000, min: 0, step: 5000 },
        { key: 'premiumRate', label: 'Annual Premium Rate (% of Cover)', type: 'number', defaultValue: 0.15, min: 0.01, max: 25, step: 0.05 },
      ],
      compute: (values, ctx): CalculatorResult => {
        const a = num(values, 'incomeOrClaim');
        const b = num(values, 'multOrCopay');
        const c = num(values, 'liabOrDeduct');
        const pRate = num(values, 'premiumRate') / 100;
        const cur = ctx?.currency ?? 'INR';
        const loc = ctx?.locale ?? 'en-IN';
        if (n.includes('claim') || n.includes('deductible') || n.includes('co-pay')) {
          const afterDed = Math.max(0, a - c);
          const insurerPays = afterDed * (1 - b / 100);
          return {
            primary: { label: 'Net Insurer Payout', value: insurerPays, formatted: formatCurrency(insurerPays, cur, loc) },
            breakdown: [
              { label: 'Out-of-Pocket Share', value: a - insurerPays, formatted: formatCurrency(a - insurerPays, cur, loc) },
              { label: 'Deductible Applied', value: Math.min(a, c), formatted: formatCurrency(Math.min(a, c), cur, loc) },
            ],
            steps: [`Eligible after deductible = ${afterDed}`, `Insurer pays ${100 - b}% = ${formatCurrency(insurerPays, cur, loc)}`],
          };
        }
        const cover = a * b + c;
        const annualPrem = cover * pRate;
        return {
          primary: { label: 'Recommended Coverage', value: cover, formatted: formatCurrency(cover, cur, loc) },
          breakdown: [
            { label: 'Estimated Annual Premium', value: annualPrem, formatted: formatCurrency(annualPrem, cur, loc) },
            { label: 'Monthly Premium Equivalent', value: annualPrem / 12, formatted: formatCurrency(annualPrem / 12, cur, loc) },
          ],
          steps: [`Cover = (${a} × ${b}) + ${c} = ${formatCurrency(cover, cur, loc)}`],
        };
      },
    };
  }

  // 8. Loans, Credit Cards, DSCR, LTV, Prepayment & Amortization
  if (entry.solverKey === 'loan_credit') {
    const isPrepay = n.includes('prepayment') || n.includes('savings') || n.includes('balance transfer');
    return {
      ...baseDef,
      formulaDisplay: isPrepay
        ? 'Interest Saved = Original Total Interest - Accelerated Total Interest'
        : 'EMI = [P × r × (1+r)^n] / [(1+r)^n - 1]',
      explanation: 'High-precision Decimal.js loan amortization, credit payoff, or interest savings simulator.',
      inputs: [
        { key: 'principal', label: 'Loan / Debt Principal', type: 'number', defaultValue: 1500000, min: 1, step: 10000 },
        { key: 'rate', label: 'Annual Interest Rate (%)', type: 'number', defaultValue: 9.25, min: 0, max: 60, step: 0.1 },
        { key: 'years', label: 'Tenure (Years)', type: 'number', defaultValue: 15, min: 0.5, max: 40, step: 0.5 },
        { key: 'extraMonthly', label: isPrepay ? 'Extra Monthly Prepayment' : 'Down Payment / Offset', type: 'number', defaultValue: isPrepay ? 5000 : 0, min: 0, step: 500 },
      ] as CalculatorField[],
      compute: (values, ctx): CalculatorResult => {
        const rawP = new Decimal(num(values, 'principal'));
        const rate = new Decimal(num(values, 'rate'));
        const years = num(values, 'years');
        const extra = new Decimal(num(values, 'extraMonthly'));
        if (rawP.lte(0) || years <= 0) throw new Error('Principal and tenure must be positive.');
        const months = Math.round(years * 12);
        const P = isPrepay ? rawP : Decimal.max(1, rawP.minus(extra));
        const emi = calcEmiDecimal(P, rate, months);
        const totalPay = emi.times(months);
        const totalInt = totalPay.minus(P);

        const cur = ctx?.currency ?? 'INR';
        const loc = ctx?.locale ?? 'en-IN';

        if (isPrepay && extra.gt(0)) {
          let bal = P;
          const rM = rate.div(1200);
          let actualMonths = 0;
          let actualInt = new Decimal(0);
          while (bal.gt(0.01) && actualMonths < months * 2) {
            const intPart = bal.times(rM);
            const prinPart = Decimal.min(bal, emi.plus(extra).minus(intPart));
            if (prinPart.lte(0)) break;
            actualInt = actualInt.plus(intPart);
            bal = bal.minus(prinPart);
            actualMonths++;
          }
          const saved = Decimal.max(0, totalInt.minus(actualInt));
          return {
            primary: { label: 'Total Interest Saved', value: saved.toNumber(), formatted: formatCurrency(saved.toNumber(), cur, loc) },
            breakdown: [
              { label: 'Base Monthly EMI', value: emi.toNumber(), formatted: formatCurrency(emi.toNumber(), cur, loc) },
              { label: 'Months Saved', value: Math.max(0, months - actualMonths), formatted: `${Math.max(0, months - actualMonths)} months` },
              { label: 'New Effective Payoff', value: actualMonths, formatted: `${actualMonths} months` },
            ],
            steps: [`Original Interest = ${formatCurrency(totalInt.toNumber(), cur, loc)}`, `Accelerated Interest = ${formatCurrency(actualInt.toNumber(), cur, loc)}`],
          };
        }

        return {
          primary: { label: 'Monthly Payment (EMI)', value: emi.toNumber(), formatted: formatCurrency(emi.toNumber(), cur, loc) },
          breakdown: [
            { label: 'Financed Principal', value: P.toNumber(), formatted: formatCurrency(P.toNumber(), cur, loc) },
            { label: 'Total Interest Payable', value: totalInt.toNumber(), formatted: formatCurrency(totalInt.toNumber(), cur, loc) },
            { label: 'Total Repayment', value: totalPay.toNumber(), formatted: formatCurrency(totalPay.toNumber(), cur, loc) },
          ],
          steps: [`Months = ${months}, Monthly Rate = ${rate.div(12).toFixed(4)}%`, `EMI = ${formatCurrency(emi.toNumber(), cur, loc)}`],
        };
      },
    };
  }

  // 9. Investment, PPF, EPF, NPS, SWP, Annuity, PV/FV, NPV/IRR, Inflation
  const isInflation = n.includes('inflation');
  const isPv = n.includes('present value');
  return {
    ...baseDef,
    formulaDisplay: isInflation
      ? 'Future Cost = Current Cost × (1 + i)^t  |  Purchasing Power = Amount / (1 + i)^t'
      : isPv
      ? 'PV = FV / (1 + r)^t'
      : 'FV = P·(1 + r/n)^(nt) + PMT · [((1 + r/n)^(nt) - 1) / (r/n)]',
    explanation: 'Computes precision investment compounding, retirement scheme corpus (PPF/EPF/NPS/SSY), inflation purchasing power, or present/future value.',
    inputs: [
      { key: 'initial', label: isPv ? 'Target Future Value (FV)' : 'Initial Lump Sum / Current Cost', type: 'number', defaultValue: 100000, min: 0, step: 1000 },
      { key: 'monthly', label: isInflation || isPv ? 'Additional Monthly Contribution' : 'Monthly Contribution (PMT)', type: 'number', defaultValue: isInflation || isPv ? 0 : 10000, min: 0, step: 500 },
      { key: 'rate', label: isInflation ? 'Annual Inflation Rate (%)' : 'Annual Return / Discount Rate (%)', type: 'number', defaultValue: isInflation ? 6 : 8.5, min: 0, max: 50, step: 0.1 },
      { key: 'years', label: 'Time Horizon (Years)', type: 'number', defaultValue: 15, min: 0.5, max: 60, step: 0.5 },
    ],
    compute: (values, ctx): CalculatorResult => {
      const p0 = new Decimal(num(values, 'initial'));
      const pmt = new Decimal(num(values, 'monthly'));
      const rate = new Decimal(num(values, 'rate')).div(100);
      const yrs = num(values, 'years');
      if (yrs <= 0) throw new Error('Time horizon must be positive.');
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';

      if (isPv) {
        const pv = p0.div(rate.plus(1).pow(yrs));
        return {
          primary: { label: 'Present Value (PV)', value: pv.toNumber(), formatted: formatCurrency(pv.toNumber(), cur, loc) },
          breakdown: [
            { label: 'Discount Factor', value: rate.plus(1).pow(yrs).toNumber(), formatted: rate.plus(1).pow(yrs).toFixed(4) },
            { label: 'Discounted Amount', value: p0.minus(pv).toNumber(), formatted: formatCurrency(p0.minus(pv).toNumber(), cur, loc) },
          ],
          steps: [`PV = ${p0.toFixed(2)} / (1 + ${rate.toFixed(4)})^${yrs} = ${pv.toFixed(2)}`],
        };
      }

      const months = Math.round(yrs * 12);
      const rM = rate.div(12);
      const fvLump = p0.times(rM.plus(1).pow(months));
      const fvSip = rM.gt(0) ? pmt.times(rM.plus(1).pow(months).minus(1).div(rM)) : pmt.times(months);
      const total = fvLump.plus(fvSip);
      const invested = p0.plus(pmt.times(months));
      const wealthGain = total.minus(invested);
      const realPower = p0.div(new Decimal(1.06).pow(yrs));

      return {
        primary: { label: isInflation ? 'Inflation-Adjusted Future Cost' : 'Projected Maturity Value', value: total.toNumber(), formatted: formatCurrency(total.toNumber(), cur, loc) },
        breakdown: [
          { label: 'Total Principal Contributed', value: invested.toNumber(), formatted: formatCurrency(invested.toNumber(), cur, loc) },
          { label: isInflation ? 'Price Increase' : 'Total Wealth Gain', value: wealthGain.toNumber(), formatted: formatCurrency(wealthGain.toNumber(), cur, loc) },
          { label: 'Purchasing Power Today (6% inf)', value: realPower.toNumber(), formatted: formatCurrency(realPower.toNumber(), cur, loc) },
        ],
        steps: [`Compounded ${months} months @ ${(rate.toNumber() * 100).toFixed(2)}% p.a.`, `Final Value = ${formatCurrency(total.toNumber(), cur, loc)}`],
      };
    },
  };
}
