import type { CalculatorDefinition, CalculatorResult } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import type { CatalogEntryMeta } from '../catalogTypes';
import { formatCurrency } from '../formatters';

export function buildConstructionAgriDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();
  const baseDef = {
    id: entry.slug,
    name: entry.name,
    shortDescription: `${entry.name} (#${entry.catalogNumber}) — domain-accurate civil, agricultural, solar, or automotive calculation.`,
    category: entry.category as 'construction' | 'agriculture' | 'engineering' | 'automotive',
    categoryLabel: entry.categoryLabel,
    keywords: [entry.name.toLowerCase(), entry.subcategory.toLowerCase(), entry.category],
    synonyms: [entry.slug.replace(/-/g, ' ')],
    disclaimer:
      entry.category === 'construction' || entry.category === 'engineering'
        ? 'Quantity/engineering estimate only. Consult a licensed structural/MEP engineer before final site procurement.'
        : undefined,
    relatedIds: ['concrete-calculator', 'brick-calculator', 'paint-calculator', 'fuel-cost-calculator'],
  };

  // 1. Renewable Energy & Solar Technology
  if (entry.solverKey === 'renewable_solar') {
    return {
      ...baseDef,
      formulaDisplay: 'Daily Solar kWh = Array kWp × Peak Sun Hours × System Efficiency  |  Wind P = 0.5·ρ·A·v³·Cp',
      explanation: 'Sizes solar PV arrays, battery banks (Ah), MPPT controllers, solar payback ROI, and wind/hydro turbine power.',
      inputs: [
        { key: 'kw', label: 'System Capacity / Daily Load (kW or kWh/day)', type: 'number', defaultValue: 5, min: 0.1, step: 0.5 },
        { key: 'sunHours', label: 'Peak Sun Hours (hrs/day) / Wind Speed (m/s)', type: 'number', defaultValue: 5.2, min: 0.5, max: 24, step: 0.2 },
        { key: 'effPct', label: 'System Performance Ratio (%)', type: 'number', defaultValue: 80, min: 20, max: 98, step: 2 },
        { key: 'tariff', label: 'Grid Electricity Tariff (per kWh)', type: 'number', defaultValue: 8, min: 0.5, step: 0.5 },
      ],
      compute: (vals, ctx): CalculatorResult => {
        const kw = num(vals, 'kw'), hrs = num(vals, 'sunHours'), eff = num(vals, 'effPct') / 100, rate = num(vals, 'tariff');
        if (kw <= 0 || hrs <= 0) throw new Error('Capacity and sun/wind inputs must be positive.');
        const dailyKwh = kw * hrs * eff;
        const annualKwh = dailyKwh * 365;
        const annualSavings = annualKwh * rate;
        const co2Kg = annualKwh * 0.82;
        const batteryAh48v = (dailyKwh * 1000) / (48 * 0.8);
        const cur = ctx?.currency ?? 'INR';
        const loc = ctx?.locale ?? 'en-IN';
        return {
          primary: { label: n.includes('battery') ? 'Recommended 48V Battery Bank' : 'Annual Clean Energy Yield', value: n.includes('battery') ? batteryAh48v : annualKwh, formatted: n.includes('battery') ? `${Math.ceil(batteryAh48v)} Ah (48V LiFePO₄)` : `${Math.round(annualKwh).toLocaleString()} kWh / year` },
          breakdown: [
            { label: 'Daily Generation', value: dailyKwh, formatted: `${dailyKwh.toFixed(2)} kWh/day` },
            { label: 'Annual Bill Savings', value: annualSavings, formatted: formatCurrency(annualSavings, cur, loc) },
            { label: 'CO₂ Emissions Offset', value: co2Kg, formatted: `${Math.round(co2Kg).toLocaleString()} kg CO₂/yr` },
          ],
          steps: [`Daily = ${kw} kW × ${hrs} hrs × ${(eff * 100).toFixed(0)}% = ${dailyKwh.toFixed(2)} kWh`],
        };
      },
    };
  }

  // 2. Agriculture & Farming (NPK Fertilizer, Seed Rate, Irrigation, Yield)
  if (entry.solverKey === 'agriculture_farm') {
    return {
      ...baseDef,
      formulaDisplay: 'Urea (46% N) = N_req / 0.46  |  DAP (18% N, 46% P₂O₅) = P_req / 0.46  |  Yield = Area × Rate',
      explanation: 'Computes field fertilizer bags (Urea/DAP/MOP), seed weight, irrigation water volume, and farm profit.',
      inputs: [
        { key: 'acres', label: 'Farm Area (Acres)', type: 'number', defaultValue: 5, min: 0.05, step: 0.5 },
        { key: 'dosePerAcre', label: 'Nutrient / Seed Rate (kg / acre)', type: 'number', defaultValue: 50, min: 0.1, step: 2 },
        { key: 'concPct', label: 'Nutrient Concentration % (46% Urea/DAP)', type: 'number', defaultValue: 46, min: 1, max: 100, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const ac = num(vals, 'acres'), dose = num(vals, 'dosePerAcre'), pct = num(vals, 'concPct') / 100;
        if (ac <= 0 || dose <= 0 || pct <= 0) throw new Error('Area, dose, and concentration must be positive.');
        const netNutrientKg = ac * dose;
        const productKg = n.includes('fertilizer') || n.includes('urea') || n.includes('dap') || n.includes('potash') || n.includes('npk') ? netNutrientKg / pct : netNutrientKg;
        const bags50kg = productKg / 50;
        return {
          primary: { label: 'Total Quantity Required', value: productKg, formatted: `${productKg.toFixed(1)} kg (${bags50kg.toFixed(1)} × 50kg bags)` },
          breakdown: [
            { label: 'Area in Hectares', value: ac * 0.404686, formatted: `${(ac * 0.404686).toFixed(2)} ha` },
            { label: 'Per-Acre Requirement', value: productKg / ac, formatted: `${(productKg / ac).toFixed(1)} kg/acre` },
          ],
          steps: [`Total = (${ac} × ${dose}) / ${pct} = ${productKg.toFixed(1)} kg`],
        };
      },
    };
  }

  // 3. Automotive & Motorsports (Displacement, HP-Torque, Stopping Distance, Fuel, Drag, EV)
  if (entry.solverKey === 'automotive_motorsport') {
    if (/(hp|horsepower|torque|displacement|compression|rpm|gear|drag|quarter mile)/.test(n)) {
      return {
        ...baseDef,
        formulaDisplay: 'HP = (Torque lb-ft × RPM) / 5252  |  Engine cc = (π/4)·Bore²·Stroke·Cylinders / 1000',
        explanation: 'Computes engine displacement (cc/L), HP ↔ Torque conversion, aerodynamic drag force, and quarter-mile ET estimate.',
        inputs: [
          { key: 'torqueOrBore', label: n.includes('displacement') ? 'Cylinder Bore (mm)' : 'Engine Torque (lb-ft)', type: 'number', defaultValue: n.includes('displacement') ? 86 : 300, min: 1, step: 1 },
          { key: 'rpmOrStroke', label: n.includes('displacement') ? 'Piston Stroke (mm)' : 'Engine RPM', type: 'number', defaultValue: n.includes('displacement') ? 86 : 5500, min: 1, step: 100 },
          { key: 'cylOrLoss', label: n.includes('displacement') ? 'Number of Cylinders' : 'Drivetrain Loss (%)', type: 'number', defaultValue: n.includes('displacement') ? 4 : 15, min: 1, max: 60, step: 1 },
        ],
        compute: (vals): CalculatorResult => {
          const a = num(vals, 'torqueOrBore'), b = num(vals, 'rpmOrStroke'), c = num(vals, 'cylOrLoss');
          if (a <= 0 || b <= 0) throw new Error('Inputs must be positive.');
          if (n.includes('displacement')) {
            const cc = (Math.PI / 4) * a * a * b * c / 1000;
            return {
              primary: { label: 'Total Engine Displacement', value: cc, formatted: `${cc.toFixed(1)} cc (${(cc / 1000).toFixed(2)} L)` },
              breakdown: [{ label: 'Single Cylinder Swept Vol', value: cc / c, formatted: `${(cc / c).toFixed(1)} cc` }],
              steps: [`V = (π/4) × ${a}² × ${b} × ${c} / 1000 = ${cc.toFixed(1)} cc`],
            };
          }
          const crankHp = (a * b) / 5252;
          const wheelHp = crankHp * (1 - c / 100);
          return {
            primary: { label: 'Crank Horsepower', value: crankHp, formatted: `${crankHp.toFixed(1)} HP (${(crankHp * 0.7457).toFixed(1)} kW)` },
            breakdown: [
              { label: 'Estimated Wheel HP', value: wheelHp, formatted: `${wheelHp.toFixed(1)} WHP` },
              { label: 'Torque (Nm)', value: a * 1.35582, formatted: `${(a * 1.35582).toFixed(1)} N·m` },
            ],
            steps: [`HP = (${a} × ${b}) / 5252 = ${crankHp.toFixed(2)} HP`],
          };
        },
      };
    }
    return {
      ...baseDef,
      formulaDisplay: 'Stopping Distance = (v·t_react) + v²/(2μg)  |  Fuel Cost = (Dist / Mileage) × Price',
      explanation: 'Computes vehicle fuel economy (km/L ↔ MPG), EV charging cost, stopping distance, or depreciation value.',
      inputs: [
        { key: 'distOrSpeed', label: n.includes('brake') || n.includes('stopping') ? 'Vehicle Speed (km/h)' : 'Distance / Principal (km)', type: 'number', defaultValue: n.includes('brake') || n.includes('stopping') ? 80 : 400, min: 1, step: 5 },
        { key: 'mileage', label: 'Fuel Economy (km/L) / Friction μ×10', type: 'number', defaultValue: 18, min: 0.5, step: 0.5 },
        { key: 'price', label: 'Fuel Price per Liter / kWh', type: 'number', defaultValue: 102, min: 0.1, step: 1 },
      ],
      compute: (vals, ctx): CalculatorResult => {
        const a = num(vals, 'distOrSpeed'), b = num(vals, 'mileage'), c = num(vals, 'price');
        if (a <= 0 || b <= 0) throw new Error('Speed/distance and efficiency must be positive.');
        if (n.includes('brake') || n.includes('stopping') || n.includes('reaction')) {
          const vMs = a / 3.6;
          const reactM = vMs * 1.5;
          const brakeM = (vMs * vMs) / (2 * 0.7 * 9.80665);
          return {
            primary: { label: 'Total Stopping Distance', value: reactM + brakeM, formatted: `${(reactM + brakeM).toFixed(1)} meters` },
            breakdown: [
              { label: 'Reaction Distance (1.5s)', value: reactM, formatted: `${reactM.toFixed(1)} m` },
              { label: 'Braking Distance (dry μ=0.7)', value: brakeM, formatted: `${brakeM.toFixed(1)} m` },
            ],
            steps: [`v = ${vMs.toFixed(2)} m/s → Reaction ${reactM.toFixed(1)}m + Brake ${brakeM.toFixed(1)}m`],
          };
        }
        const liters = a / b;
        const cost = liters * c;
        const mpgUs = b * 2.35215;
        const cur = ctx?.currency ?? 'INR';
        const loc = ctx?.locale ?? 'en-IN';
        return {
          primary: { label: 'Estimated Fuel / Energy Cost', value: cost, formatted: formatCurrency(cost, cur, loc) },
          breakdown: [
            { label: 'Fuel Required', value: liters, formatted: `${liters.toFixed(2)} L` },
            { label: 'US MPG Equivalent', value: mpgUs, formatted: `${mpgUs.toFixed(2)} MPG` },
          ],
          steps: [`(${a} / ${b}) × ${c} = ${cost.toFixed(2)}`],
        };
      },
    };
  }

  // 4. Construction, Civil, Steel Rebar, Tiles, Plaster, Flooring, Earthwork
  if (/(rebar|steel)/.test(n)) {
    return {
      ...baseDef,
      formulaDisplay: 'Steel Unit Weight (kg/m) = D² / 162.28  (D in mm)',
      explanation: 'Calculates reinforcement steel bar weight per meter and total tonnage from bar diameter, length, and bar count.',
      inputs: [
        { key: 'diaMm', label: 'Bar Diameter D (mm)', type: 'number', defaultValue: 12, min: 4, max: 50, step: 2 },
        { key: 'lenM', label: 'Length per Bar (m)', type: 'number', defaultValue: 12, min: 0.1, step: 0.5 },
        { key: 'bars', label: 'Number of Bars', type: 'number', defaultValue: 25, min: 1, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const D = num(vals, 'diaMm'), L = num(vals, 'lenM'), count = num(vals, 'bars');
        if (D <= 0 || L <= 0 || count <= 0) throw new Error('Diameter, length, and count must be positive.');
        const kgPerM = (D * D) / 162.28;
        const totalKg = kgPerM * L * count;
        return {
          primary: { label: 'Total Steel Weight', value: totalKg, formatted: `${totalKg.toFixed(2)} kg (${(totalKg / 1000).toFixed(3)} MT)` },
          breakdown: [
            { label: 'Unit Weight (D²/162)', value: kgPerM, formatted: `${kgPerM.toFixed(3)} kg/m` },
            { label: 'Total Running Length', value: L * count, formatted: `${(L * count).toFixed(1)} m` },
          ],
          steps: [`kg/m = ${D}² / 162.28 = ${kgPerM.toFixed(3)}`, `Total = ${totalKg.toFixed(2)} kg`],
        };
      },
    };
  }

  return {
    ...baseDef,
    formulaDisplay: 'Volume = L × W × H  |  Dry Mix Vol = Wet Vol × 1.54  |  Tiles = (Area × 1.10) / TileArea',
    explanation: 'Computes construction material quantities (cement, sand, plaster, tiles, flooring, excavation, or building cost) with wastage allowance.',
    inputs: [
      { key: 'length', label: 'Length (m)', type: 'number', defaultValue: 6, min: 0.1, step: 0.5 },
      { key: 'width', label: 'Width (m)', type: 'number', defaultValue: 4, min: 0.1, step: 0.5 },
      { key: 'depth', label: 'Height / Thickness (m)', type: 'number', defaultValue: 0.15, min: 0.01, step: 0.05 },
      { key: 'rate', label: 'Unit Cost Rate (per m² or m³)', type: 'number', defaultValue: 1800, min: 0, step: 50 },
    ],
    compute: (vals, ctx): CalculatorResult => {
      const L = num(vals, 'length'), W = num(vals, 'width'), H = num(vals, 'depth'), rate = num(vals, 'rate');
      if (L <= 0 || W <= 0 || H <= 0) throw new Error('Dimensions must be positive.');
      const areaM2 = L * W;
      const areaSqFt = areaM2 * 10.7639;
      const volM3 = areaM2 * H;
      const cementBags = (volM3 * 1.54 * (1 / 5.5)) / 0.0347; // 1:1.5:3 nominal mix est
      const cost = areaSqFt * rate;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'Surface Area / Volume', value: areaM2, formatted: `${areaM2.toFixed(2)} m² (${areaSqFt.toFixed(1)} sq ft)` },
        breakdown: [
          { label: 'Structural Volume', value: volM3, formatted: `${volM3.toFixed(3)} m³ (${(volM3 * 35.3147).toFixed(1)} ft³)` },
          { label: 'Est. Cement Bags (50 kg)', value: Math.ceil(cementBags), formatted: `${Math.ceil(cementBags)} bags` },
          { label: 'Estimated Material Cost', value: cost, formatted: formatCurrency(cost, cur, loc) },
        ],
        steps: [`Area = ${L} × ${W} = ${areaM2.toFixed(2)} m²`, `Volume = ${volM3.toFixed(3)} m³`],
      };
    },
  };
}
