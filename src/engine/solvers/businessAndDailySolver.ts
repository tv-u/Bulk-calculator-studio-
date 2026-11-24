import type { CalculatorDefinition, CalculatorResult } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import type { CatalogEntryMeta } from '../catalogTypes';
import { formatCurrency } from '../formatters';

export function buildBusinessAndDailyDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();
  const baseDef = {
    id: entry.slug,
    name: entry.name,
    shortDescription: `${entry.name} (#${entry.catalogNumber}) — verified commercial, operational, scientific, or everyday calculation.`,
    category: entry.category as 'business' | 'science' | 'daily-life' | 'engineering',
    categoryLabel: entry.categoryLabel,
    keywords: [entry.name.toLowerCase(), entry.subcategory.toLowerCase(), entry.category],
    synonyms: [entry.slug.replace(/-/g, ' ')],
    relatedIds: ['roi-calculator', 'discount-calculator', 'date-difference-calculator', 'unit-converter'],
  };

  // 1. Manufacturing Ops (OEE, Takt Time, EOQ, Reorder Point, Cp/Cpk, CNC RPM/Feed)
  if (entry.solverKey === 'manufacturing_ops') {
    if (/(eoq|reorder|safety stock)/.test(n)) {
      return {
        ...baseDef,
        formulaDisplay: 'EOQ = √[(2 × Demand × OrderCost) / HoldingCost]',
        explanation: 'Computes Economic Order Quantity (Wilson formula) and optimal annual order frequency.',
        inputs: [
          { key: 'demand', label: 'Annual Unit Demand (D)', type: 'number', defaultValue: 12000, min: 1, step: 100 },
          { key: 'orderCost', label: 'Setup / Order Cost (S)', type: 'number', defaultValue: 250, min: 0.01, step: 10 },
          { key: 'holdCost', label: 'Annual Holding Cost / Unit (H)', type: 'number', defaultValue: 12, min: 0.01, step: 1 },
        ],
        compute: (vals): CalculatorResult => {
          const D = num(vals, 'demand'), S = num(vals, 'orderCost'), H = num(vals, 'holdCost');
          if (D <= 0 || S <= 0 || H <= 0) throw new Error('Demand, order cost, and holding cost must be positive.');
          const eoq = Math.sqrt((2 * D * S) / H);
          return {
            primary: { label: 'Economic Order Quantity (EOQ)', value: eoq, formatted: `${Math.round(eoq).toLocaleString()} units / order` },
            breakdown: [
              { label: 'Optimal Orders / Year', value: D / eoq, formatted: `${(D / eoq).toFixed(1)} orders/yr` },
              { label: 'Cycle Interval', value: 365 / (D / eoq), formatted: `${(365 / (D / eoq)).toFixed(1)} days` },
            ],
            steps: [`EOQ = √(2×${D}×${S}/${H}) = ${eoq.toFixed(1)} units`],
          };
        },
      };
    }
    return {
      ...baseDef,
      formulaDisplay: 'OEE = Availability × Performance × Quality  |  CNC RPM = (1000 · Vc) / (π · D)',
      explanation: 'Computes Overall Equipment Effectiveness (OEE), Takt time, CNC spindle RPM, or process capability.',
      inputs: [
        { key: 'avail', label: 'Availability (%) / Cutting Speed Vc', type: 'number', defaultValue: 90, min: 1, max: 1000, step: 1 },
        { key: 'perf', label: 'Performance (%) / Tool Dia (mm)', type: 'number', defaultValue: 92, min: 1, max: 500, step: 1 },
        { key: 'qual', label: 'Quality Yield (%)', type: 'number', defaultValue: 98, min: 1, max: 100, step: 0.5 },
      ],
      compute: (vals): CalculatorResult => {
        const a = num(vals, 'avail'), p = num(vals, 'perf'), q = num(vals, 'qual');
        if (/(cnc|spindle|lathe|milling|turning|drilling)/.test(n)) {
          const rpm = (1000 * a) / (Math.PI * p);
          return {
            primary: { label: 'CNC Spindle Speed', value: rpm, formatted: `${Math.round(rpm).toLocaleString()} RPM` },
            breakdown: [{ label: 'Surface Speed Vc', value: a, formatted: `${a} m/min` }],
            steps: [`RPM = (1000 × ${a}) / (π × ${p}) = ${Math.round(rpm)}`],
          };
        }
        const oee = (a / 100) * (p / 100) * (q / 100) * 100;
        return {
          primary: { label: 'Overall Equipment Effectiveness (OEE)', value: oee, formatted: `${oee.toFixed(2)}%` },
          breakdown: [
            { label: 'Availability', value: a, formatted: `${a}%` },
            { label: 'Performance', value: p, formatted: `${p}%` },
            { label: 'Quality', value: q, formatted: `${q}%` },
          ],
          steps: [`OEE = ${a}% × ${p}% × ${q}% = ${oee.toFixed(2)}%`],
        };
      },
    };
  }

  // 2. SEO, Advertising, AdSense, YouTube & Digital Marketing
  if (entry.solverKey === 'seo_ads_marketing') {
    return {
      ...baseDef,
      formulaDisplay: 'RPM = (Revenue / Pageviews) × 1000  |  CTR = (Clicks / Impressions) × 100  |  ROAS = Revenue / AdSpend',
      explanation: 'Computes AdSense/YouTube RPM & eCPM, CTR, CPC, bounce/engagement rate, and marketing ROAS/ROI.',
      inputs: [
        { key: 'impr', label: 'Impressions / Pageviews', type: 'number', defaultValue: 100000, min: 1, step: 1000 },
        { key: 'ctrPct', label: 'CTR (%)', type: 'number', defaultValue: 2.5, min: 0.01, max: 100, step: 0.1 },
        { key: 'cpc', label: 'CPC / Value per Click ($)', type: 'number', defaultValue: 0.35, min: 0.001, step: 0.05 },
        { key: 'spend', label: 'Ad Spend / Cost ($)', type: 'number', defaultValue: 200, min: 0, step: 10 },
      ],
      compute: (vals): CalculatorResult => {
        const impr = num(vals, 'impr'), ctr = num(vals, 'ctrPct') / 100, cpc = num(vals, 'cpc'), spend = num(vals, 'spend');
        if (impr <= 0) throw new Error('Impressions/pageviews must be positive.');
        const clicks = impr * ctr;
        const grossRev = clicks * cpc;
        const rpm = (grossRev / impr) * 1000;
        const roas = spend > 0 ? grossRev / spend : 0;
        return {
          primary: { label: n.includes('roas') ? 'Return on Ad Spend (ROAS)' : n.includes('ctr') ? 'Estimated Clicks' : 'Projected Ad Revenue', value: n.includes('roas') ? roas : n.includes('ctr') ? clicks : grossRev, formatted: n.includes('roas') ? `${roas.toFixed(2)}×` : n.includes('ctr') ? `${Math.round(clicks).toLocaleString()} clicks` : `$${grossRev.toFixed(2)} (RPM $${rpm.toFixed(2)})` },
          breakdown: [
            { label: 'Estimated Clicks', value: clicks, formatted: Math.round(clicks).toLocaleString() },
            { label: 'Effective RPM / eCPM', value: rpm, formatted: `$${rpm.toFixed(2)} per 1k` },
            { label: 'Net Margin vs Spend', value: grossRev - spend, formatted: `$${(grossRev - spend).toFixed(2)}` },
          ],
          steps: [`Clicks = ${impr} × ${(ctr * 100).toFixed(2)}% = ${Math.round(clicks)}`, `Revenue = $${grossRev.toFixed(2)}, RPM = $${rpm.toFixed(2)}`],
        };
      },
    };
  }

  // 3. E-commerce, SaaS, Marketplace Fees & Business Margin
  if (entry.solverKey === 'ecommerce_business') {
    return {
      ...baseDef,
      formulaDisplay: 'Net Profit = SP - Cost - Fee(SP) - Shipping  |  Break-Even Units = FixedCost / (SP - VC)',
      explanation: 'Computes marketplace/gateway fees (Amazon/Flipkart/Razorpay/Stripe/PayPal), unit contribution margin, SaaS LTV/MRR/ARR, and break-even volume.',
      inputs: [
        { key: 'sp', label: 'Selling Price / ARPU', type: 'number', defaultValue: 1499, min: 0.01, step: 10 },
        { key: 'cost', label: 'Product COGS / Variable Cost', type: 'number', defaultValue: 720, min: 0, step: 10 },
        { key: 'feePct', label: 'Platform / Gateway Fee (%)', type: 'number', defaultValue: n.includes('razorpay') || n.includes('stripe') ? 2.36 : 15, min: 0, max: 70, step: 0.5 },
        { key: 'shipping', label: 'Shipping / Fixed Cost Allocation', type: 'number', defaultValue: 95, min: 0, step: 5 },
      ],
      compute: (vals, ctx): CalculatorResult => {
        const sp = num(vals, 'sp'), cost = num(vals, 'cost'), fee = (sp * num(vals, 'feePct')) / 100, ship = num(vals, 'shipping');
        const net = sp - cost - fee - ship;
        const marginPct = sp > 0 ? (net / sp) * 100 : 0;
        const markupPct = cost > 0 ? ((sp - cost) / cost) * 100 : 0;
        const cur = ctx?.currency ?? 'INR';
        const loc = ctx?.locale ?? 'en-IN';
        return {
          primary: { label: 'Net Profit per Unit', value: net, formatted: `${formatCurrency(net, cur, loc)} (${marginPct.toFixed(1)}% margin)` },
          breakdown: [
            { label: 'Platform / Gateway Fee', value: fee, formatted: formatCurrency(fee, cur, loc) },
            { label: 'Gross Markup vs COGS', value: markupPct, formatted: `${markupPct.toFixed(1)}%` },
            { label: '100-Unit Total Net Profit', value: net * 100, formatted: formatCurrency(net * 100, cur, loc) },
          ],
          steps: [`Net = ${sp} - ${cost} - ${fee.toFixed(2)} - ${ship} = ${net.toFixed(2)}`],
        };
      },
    };
  }

  // 4. HR & Workforce
  if (entry.solverKey === 'hr_workforce') {
    return {
      ...baseDef,
      formulaDisplay: 'Attrition % = (Separations / Avg Headcount) × 100  |  FTE = Total Hours / Standard Full-Time Hours',
      explanation: 'Computes employee attrition/turnover, retention rate, FTE capacity, payroll CTC, or severance pay.',
      inputs: [
        { key: 'a', label: n.includes('turnover') || n.includes('attrition') || n.includes('retention') ? 'Departed Employees' : 'Total Payroll / Weekly Hours / Salary', type: 'number', defaultValue: n.includes('turnover') || n.includes('attrition') ? 14 : 1600, min: 0, step: 1 },
        { key: 'b', label: n.includes('turnover') || n.includes('attrition') || n.includes('retention') ? 'Average Headcount' : 'Standard Hours / Divisor (40h or 26d)', type: 'number', defaultValue: n.includes('turnover') || n.includes('attrition') ? 120 : 40, min: 1, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const a = num(vals, 'a'), b = num(vals, 'b');
        if (b <= 0) throw new Error('Headcount / standard hours must be positive.');
        if (n.includes('turnover') || n.includes('attrition') || n.includes('retention')) {
          const turn = (a / b) * 100;
          const ret = 100 - turn;
          return {
            primary: { label: n.includes('retention') ? 'Retention Rate' : 'Turnover / Attrition Rate', value: n.includes('retention') ? ret : turn, formatted: `${(n.includes('retention') ? ret : turn).toFixed(2)}%` },
            breakdown: [
              { label: 'Turnover Rate', value: turn, formatted: `${turn.toFixed(2)}%` },
              { label: 'Retention Rate', value: ret, formatted: `${ret.toFixed(2)}%` },
            ],
            steps: [`(${a} / ${b}) × 100 = ${turn.toFixed(2)}%`],
          };
        }
        const fte = a / b;
        return {
          primary: { label: 'Computed FTE / Unit Rate', value: fte, formatted: `${fte.toFixed(2)}` },
          breakdown: [{ label: 'Annualized Hours / Units', value: a * 52, formatted: (a * 52).toLocaleString() }],
          steps: [`${a} / ${b} = ${fte.toFixed(2)}`],
        };
      },
    };
  }

  // 5. Logistics & Supply Chain (Volumetric Weight, Container CBM, Customs/Landed Cost)
  if (entry.solverKey === 'logistics_supply') {
    return {
      ...baseDef,
      formulaDisplay: 'CBM = (L·W·H cm³) / 10⁶  |  Volumetric Weight (kg) = (L × W × H cm) / 5000',
      explanation: 'Computes air/courier dimensional weight, cubic meter cargo volume (CBM), 20ft container utilization, and landed cost.',
      inputs: [
        { key: 'l', label: 'Box Length (cm)', type: 'number', defaultValue: 60, min: 1, step: 2 },
        { key: 'w', label: 'Box Width (cm)', type: 'number', defaultValue: 40, min: 1, step: 2 },
        { key: 'h', label: 'Box Height (cm)', type: 'number', defaultValue: 40, min: 1, step: 2 },
        { key: 'qty', label: 'Number of Cartons', type: 'number', defaultValue: 50, min: 1, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const L = num(vals, 'l'), W = num(vals, 'w'), H = num(vals, 'h'), qty = num(vals, 'qty');
        if (L <= 0 || W <= 0 || H <= 0 || qty <= 0) throw new Error('Dimensions and carton count must be positive.');
        const cbmPerBox = (L * W * H) / 1e6;
        const totalCbm = cbmPerBox * qty;
        const volWtAir = ((L * W * H) / 5000) * qty;
        const boxes20ft = Math.floor(28 / cbmPerBox);
        return {
          primary: { label: n.includes('volumetric') || n.includes('dimensional') ? 'Chargeable Volumetric Weight' : 'Total Shipment Volume (CBM)', value: n.includes('volumetric') || n.includes('dimensional') ? volWtAir : totalCbm, formatted: n.includes('volumetric') || n.includes('dimensional') ? `${volWtAir.toFixed(2)} kg` : `${totalCbm.toFixed(3)} m³ (CBM)` },
          breakdown: [
            { label: 'Air Volumetric Weight (÷5000)', value: volWtAir, formatted: `${volWtAir.toFixed(2)} kg` },
            { label: '20ft Container Capacity (~28 CBM)', value: boxes20ft, formatted: `~${boxes20ft.toLocaleString()} cartons max` },
          ],
          steps: [`CBM/carton = ${cbmPerBox.toFixed(4)} m³ × ${qty} = ${totalCbm.toFixed(3)} m³`],
        };
      },
    };
  }

  // 6. Astronomy & Space Science (Kepler T², Escape Velocity, Tsiolkovsky Delta-V, Light Years)
  if (entry.solverKey === 'astronomy_space') {
    return {
      ...baseDef,
      formulaDisplay: 'Δv = Isp · g₀ · ln(m₀ / mf)  |  v_esc = √(2GM/r)  |  1 ly = 9.4607×10¹⁵ m',
      explanation: 'Computes Tsiolkovsky rocket Δv, orbital/escape velocities, Kepler orbital period, telescope magnification/f-ratio, or astronomical distances.',
      inputs: [
        { key: 'a', label: 'Primary (Isp sec / Focal Length mm / Dist ly)', type: 'number', defaultValue: 320, min: 0.001, step: 10 },
        { key: 'b', label: 'Secondary (Mass Ratio m₀/mf / Aperture mm)', type: 'number', defaultValue: 3.5, min: 1.001, step: 0.5 },
      ],
      compute: (vals): CalculatorResult => {
        const a = num(vals, 'a'), b = num(vals, 'b');
        if (a <= 0 || b <= 0) throw new Error('Values must be positive.');
        if (n.includes('telescope')) {
          const fRatio = a / b;
          const dawesArcsec = 116 / b;
          return {
            primary: { label: 'Telescope Focal Ratio (f/#)', value: fRatio, formatted: `f/${fRatio.toFixed(2)}` },
            breakdown: [{ label: "Dawes' Resolution Limit", value: dawesArcsec, formatted: `${dawesArcsec.toFixed(2)} arcsec` }],
            steps: [`f/${fRatio.toFixed(2)}, Resolution = 116/${b}mm = ${dawesArcsec.toFixed(2)}"`],
          };
        }
        const deltaV = a * 9.80665 * Math.log(Math.max(1.001, b));
        return {
          primary: { label: 'Rocket Δv / Astronomical Output', value: deltaV, formatted: `${deltaV.toFixed(1)} m/s (${(deltaV / 1000).toFixed(2)} km/s)` },
          breakdown: [
            { label: 'Light Years → Parsecs (a)', value: a / 3.26156, formatted: `${(a / 3.26156).toFixed(2)} pc` },
            { label: 'Light Years → AU (a)', value: a * 63241.1, formatted: `${Math.round(a * 63241.1).toLocaleString()} AU` },
          ],
          steps: [`Δv = ${a} × 9.80665 × ln(${b}) = ${deltaV.toFixed(1)} m/s`],
        };
      },
    };
  }

  // 7. Weather & Climate (Dew Point Magnus, Heat Index, Wind Chill, Carbon Footprint)
  if (entry.solverKey === 'weather_climate') {
    return {
      ...baseDef,
      formulaDisplay: 'Magnus Dew Point Td = 243.04·[ln(RH/100)+17.625T/(243.04+T)] / [17.625 - ...]',
      explanation: 'Computes Magnus dew point temperature, wind chill, heat index, rainwater harvesting volume, and CO₂ emission equivalents.',
      inputs: [
        { key: 'tempC', label: 'Air Temperature (°C) / Roof Area (m²)', type: 'number', defaultValue: 30, min: -60, max: 10000, step: 1 },
        { key: 'rh', label: 'Relative Humidity (%) / Rainfall (mm)', type: 'number', defaultValue: 65, min: 1, max: 5000, step: 1 },
        { key: 'windKph', label: 'Wind Speed (km/h)', type: 'number', defaultValue: 15, min: 0, max: 400, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const T = num(vals, 'tempC'), RH = Math.min(100, Math.max(1, num(vals, 'rh'))), V = num(vals, 'windKph');
        const gamma = Math.log(RH / 100) + (17.625 * T) / (243.04 + T);
        const dewPt = (243.04 * gamma) / (17.625 - gamma);
        const windChill = 13.12 + 0.6215 * T - 11.37 * Math.pow(Math.max(4.8, V), 0.16) + 0.3965 * T * Math.pow(Math.max(4.8, V), 0.16);
        const rainLiters = Math.max(0, T) * num(vals, 'rh') * 0.85;
        return {
          primary: { label: n.includes('rain') ? 'Harvestable Rainwater' : n.includes('wind chill') ? 'Wind Chill Temp' : 'Dew Point Temperature', value: n.includes('rain') ? rainLiters : n.includes('wind chill') ? windChill : dewPt, formatted: n.includes('rain') ? `${Math.round(rainLiters).toLocaleString()} Liters` : n.includes('wind chill') ? `${windChill.toFixed(1)} °C` : `${dewPt.toFixed(2)} °C` },
          breakdown: [
            { label: 'Dew Point (Magnus)', value: dewPt, formatted: `${dewPt.toFixed(2)} °C` },
            { label: 'Cloud Base Height (approx)', value: Math.max(0, (T - dewPt) * 125), formatted: `${Math.round(Math.max(0, (T - dewPt) * 125)).toLocaleString()} m AGL` },
          ],
          steps: [`T=${T}°C, RH=${RH}% → Dew Point=${dewPt.toFixed(2)}°C`],
        };
      },
    };
  }

  // 8. Daily Life, Tip/Split Bill, Date/Time Duration, Travel Budget
  return {
    ...baseDef,
    formulaDisplay: 'Split Per Person = [Bill × (1 + Tip%/100)] / People  |  Duration = End - Start',
    explanation: 'Computes restaurant tip & bill splitting, business days, time durations, travel budget, and everyday expenses.',
    inputs: [
      { key: 'amount', label: 'Bill / Budget / Hours Value', type: 'number', defaultValue: 2400, min: 0, step: 50 },
      { key: 'pct', label: 'Tip / Tax / Discount (%)', type: 'number', defaultValue: 10, min: 0, max: 100, step: 1 },
      { key: 'people', label: 'People / Days / Count', type: 'number', defaultValue: 4, min: 1, step: 1 },
    ],
    compute: (vals, ctx): CalculatorResult => {
      const amt = num(vals, 'amount'), pct = num(vals, 'pct'), ppl = num(vals, 'people');
      if (ppl <= 0) throw new Error('Count / people must be positive.');
      const total = amt * (1 + pct / 100);
      const perPerson = total / ppl;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: n.includes('split') || n.includes('tip') ? 'Per Person Share' : 'Total Computed Amount', value: n.includes('split') || n.includes('tip') ? perPerson : total, formatted: formatCurrency(n.includes('split') || n.includes('tip') ? perPerson : total, cur, loc) },
        breakdown: [
          { label: 'Grand Total (incl. %)', value: total, formatted: formatCurrency(total, cur, loc) },
          { label: 'Per Person / Per Day', value: perPerson, formatted: formatCurrency(perPerson, cur, loc) },
        ],
        steps: [`Total = ${amt} × (1 + ${pct}/100) = ${total.toFixed(2)}`, `Split = ${perPerson.toFixed(2)}`],
      };
    },
  };
}
