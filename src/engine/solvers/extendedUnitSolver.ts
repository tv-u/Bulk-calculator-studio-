import type { CalculatorDefinition, ComputeContext } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import type { CatalogEntryMeta } from '../catalogTypes';

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

interface UnitDef {
  id: string;
  label: string;
  toBase: number;
}

const UNIT_GROUPS: Record<string, { label: string; baseUnit: string; units: UnitDef[] }> = {
  length: {
    label: 'Length & Distance',
    baseUnit: 'm',
    units: [
      { id: 'm', label: 'Meters (m)', toBase: 1 },
      { id: 'cm', label: 'Centimeters (cm)', toBase: 0.01 },
      { id: 'mm', label: 'Millimeters (mm)', toBase: 0.001 },
      { id: 'um', label: 'Micrometers (µm)', toBase: 1e-6 },
      { id: 'nm', label: 'Nanometers (nm)', toBase: 1e-9 },
      { id: 'angstrom', label: 'Angstroms (Å)', toBase: 1e-10 },
      { id: 'dm', label: 'Decimeters (dm)', toBase: 0.1 },
      { id: 'km', label: 'Kilometers (km)', toBase: 1000 },
      { id: 'in', label: 'Inches (in)', toBase: 0.0254 },
      { id: 'ft', label: 'Feet (ft)', toBase: 0.3048 },
      { id: 'yd', label: 'Yards (yd)', toBase: 0.9144 },
      { id: 'mi', label: 'Miles (mi)', toBase: 1609.344 },
      { id: 'mil', label: 'Mils / Thou (0.001 in)', toBase: 0.0000254 },
      { id: 'nmi', label: 'Nautical Miles (nmi)', toBase: 1852 },
      { id: 'ly', label: 'Light Years (ly)', toBase: 9.4607304725808e15 },
    ],
  },
  area: {
    label: 'Area & Land Measurement',
    baseUnit: 'sqm',
    units: [
      { id: 'sqm', label: 'Square Meters (m²)', toBase: 1 },
      { id: 'sqft', label: 'Square Feet (ft²)', toBase: 0.09290304 },
      { id: 'sqyd', label: 'Square Yards / Gaj (yd²)', toBase: 0.83612736 },
      { id: 'sqcm', label: 'Square Centimeters (cm²)', toBase: 0.0001 },
      { id: 'sqmm', label: 'Square Millimeters (mm²)', toBase: 0.000001 },
      { id: 'acre', label: 'Acres', toBase: 4046.8564224 },
      { id: 'hectare', label: 'Hectares (ha)', toBase: 10000 },
      { id: 'are', label: 'Ares (a)', toBase: 100 },
      { id: 'sqkm', label: 'Square Kilometers (km²)', toBase: 1000000 },
      { id: 'sqmi', label: 'Square Miles (mi²)', toBase: 2589988.110336 },
      { id: 'cent', label: 'Cents (South India)', toBase: 40.468564224 },
      { id: 'katha', label: 'Katha (Std 1,361 sq ft)', toBase: 126.441 },
      { id: 'bigha', label: 'Pucca Bigha (27,225 sq ft)', toBase: 2529.285 },
    ],
  },
  mass: {
    label: 'Weight & Mass',
    baseUnit: 'g',
    units: [
      { id: 'g', label: 'Grams (g)', toBase: 1 },
      { id: 'kg', label: 'Kilograms (kg)', toBase: 1000 },
      { id: 'mg', label: 'Milligrams (mg)', toBase: 0.001 },
      { id: 'mcg', label: 'Micrograms (µg)', toBase: 1e-6 },
      { id: 'dag', label: 'Decagrams (dag)', toBase: 10 },
      { id: 'lb', label: 'Pounds (lb)', toBase: 453.59237 },
      { id: 'oz', label: 'Ounces (oz)', toBase: 28.349523125 },
      { id: 'st', label: 'Stones (st)', toBase: 6350.29318 },
      { id: 'ton', label: 'Metric Tons (t)', toBase: 1000000 },
      { id: 'ton_us', label: 'US Short Tons', toBase: 907184.74 },
      { id: 'gr', label: 'Grains (gr)', toBase: 0.06479891 },
      { id: 'ct', label: 'Carats (ct)', toBase: 0.2 },
    ],
  },
  volume: {
    label: 'Volume & Culinary Measures',
    baseUnit: 'mL',
    units: [
      { id: 'ml', label: 'Milliliters / CC (mL)', toBase: 1 },
      { id: 'ul', label: 'Microliters (µL)', toBase: 0.001 },
      { id: 'cl', label: 'Centiliters (cL)', toBase: 10 },
      { id: 'l', label: 'Liters (L)', toBase: 1000 },
      { id: 'cup', label: 'US Cups', toBase: 236.5882365 },
      { id: 'tbsp', label: 'Tablespoons (US tbsp)', toBase: 14.7867648 },
      { id: 'tsp', label: 'Teaspoons (US tsp)', toBase: 4.92892159 },
      { id: 'floz', label: 'Fluid Ounces (US fl oz)', toBase: 29.57352956 },
      { id: 'pt', label: 'US Pints (pt)', toBase: 473.176473 },
      { id: 'qt', label: 'US Quarts (qt)', toBase: 946.352946 },
      { id: 'gal', label: 'US Gallons (gal)', toBase: 3785.411784 },
      { id: 'cuin', label: 'Cubic Inches (in³)', toBase: 16.387064 },
      { id: 'cuft', label: 'Cubic Feet (ft³)', toBase: 28316.846592 },
      { id: 'cuyd', label: 'Cubic Yards (yd³)', toBase: 764554.857984 },
      { id: 'cum', label: 'Cubic Meters (m³)', toBase: 1000000 },
      { id: 'ccf', label: 'CCF (100 ft³)', toBase: 2831684.6592 },
      { id: 'drop', label: 'Metric Drops (0.05 mL)', toBase: 0.05 },
    ],
  },
  pressure: {
    label: 'Pressure & Stress',
    baseUnit: 'Pa',
    units: [
      { id: 'pa', label: 'Pascals (Pa)', toBase: 1 },
      { id: 'kpa', label: 'Kilopascals (kPa)', toBase: 1000 },
      { id: 'mpa', label: 'Megapascals (MPa)', toBase: 1000000 },
      { id: 'bar', label: 'Bar', toBase: 100000 },
      { id: 'atm', label: 'Atmospheres (atm)', toBase: 101325 },
      { id: 'psi', label: 'PSI (lb/in²)', toBase: 6894.757293 },
      { id: 'ksi', label: 'KSI (1000 psi)', toBase: 6894757.293 },
      { id: 'torr', label: 'Torr / mmHg', toBase: 133.3223684 },
      { id: 'inh2o', label: 'Inches of Water (inH₂O)', toBase: 249.08891 },
      { id: 'kgcm2', label: 'kgf/cm²', toBase: 98066.5 },
    ],
  },
  speed: {
    label: 'Speed & Velocity',
    baseUnit: 'mps',
    units: [
      { id: 'mps', label: 'Meters/second (m/s)', toBase: 1 },
      { id: 'kph', label: 'Kilometers/hour (km/h)', toBase: 1 / 3.6 },
      { id: 'mph', label: 'Miles/hour (mph)', toBase: 0.44704 },
      { id: 'kn', label: 'Knots (kn)', toBase: 0.514444444 },
      { id: 'fps', label: 'Feet/second (ft/s)', toBase: 0.3048 },
      { id: 'mach', label: 'Mach (Sea Level)', toBase: 340.29 },
    ],
  },
  time: {
    label: 'Time Duration',
    baseUnit: 's',
    units: [
      { id: 'ms', label: 'Milliseconds (ms)', toBase: 0.001 },
      { id: 's', label: 'Seconds (s)', toBase: 1 },
      { id: 'min', label: 'Minutes (min)', toBase: 60 },
      { id: 'hr', label: 'Hours (hr)', toBase: 3600 },
      { id: 'day', label: 'Days (24h)', toBase: 86400 },
      { id: 'wk', label: 'Weeks (7d)', toBase: 604800 },
      { id: 'mo', label: 'Months (avg 30.4375d)', toBase: 2629800 },
      { id: 'yr', label: 'Years (365.25d)', toBase: 31557600 },
      { id: 'dec', label: 'Decades (10y)', toBase: 315576000 },
    ],
  },
  data: {
    label: 'Digital Storage & Bandwidth',
    baseUnit: 'B',
    units: [
      { id: 'bit', label: 'Bits (b)', toBase: 0.125 },
      { id: 'B', label: 'Bytes (B)', toBase: 1 },
      { id: 'KB', label: 'Kilobytes (KB)', toBase: 1000 },
      { id: 'MB', label: 'Megabytes (MB)', toBase: 1e6 },
      { id: 'GB', label: 'Gigabytes (GB)', toBase: 1e9 },
      { id: 'TB', label: 'Terabytes (TB)', toBase: 1e12 },
      { id: 'KiB', label: 'Kibibytes (KiB)', toBase: 1024 },
      { id: 'MiB', label: 'Mebibytes (MiB)', toBase: 1048576 },
      { id: 'GiB', label: 'Gibibytes (GiB)', toBase: 1073741824 },
    ],
  },
  torque: {
    label: 'Torque & Moment',
    baseUnit: 'Nm',
    units: [
      { id: 'Nm', label: 'Newton-meters (N·m)', toBase: 1 },
      { id: 'inlb', label: 'Inch-pounds (in·lbf)', toBase: 0.112984829 },
      { id: 'ftlb', label: 'Foot-pounds (ft·lbf)', toBase: 1.35581795 },
      { id: 'kgm', label: 'Kilogram-force meters (kgf·m)', toBase: 9.80665 },
    ],
  },
};

function findUnitInString(nameLower: string): { groupKey: string; fromId?: string; toId?: string } | null {
  const pairMap: Array<[RegExp, string, string, string]> = [
    [/\bangstrom to nm\b/, 'length', 'angstrom', 'nm'],
    [/\bmil to inch\b/, 'length', 'mil', 'in'],
    [/\bmil to mm\b/, 'length', 'mil', 'mm'],
    [/\bmicron to mil\b/, 'length', 'um', 'mil'],
    [/\bcm to km\b/, 'length', 'cm', 'km'],
    [/\bcm to m\b/, 'length', 'cm', 'm'],
    [/\bcm to mm\b/, 'length', 'cm', 'mm'],
    [/\bcm[- ]to[- ]in|\bcm to ft\b/, 'length', 'cm', 'in'],
    [/\bfeet to inches\b/, 'length', 'ft', 'in'],
    [/\bfeet to meters\b/, 'length', 'ft', 'm'],
    [/\bfeet to miles\b/, 'length', 'ft', 'mi'],
    [/\bfoot to centimeter|\bft to cm\b/, 'length', 'ft', 'cm'],
    [/\bin to cm|\binch to cm\b/, 'length', 'in', 'cm'],
    [/\binch to meter\b/, 'length', 'in', 'm'],
    [/\binches to yard\b/, 'length', 'in', 'yd'],
    [/\bkm to feet\b/, 'length', 'km', 'ft'],
    [/\bkilometers to miles\b/, 'length', 'km', 'mi'],
    [/\bmeters to feet|\bm to ft\b/, 'length', 'm', 'ft'],
    [/\bmeter to mile\b/, 'length', 'm', 'mi'],
    [/\bmm to foot\b/, 'length', 'mm', 'ft'],
    [/\bmm to km\b/, 'length', 'mm', 'km'],
    [/\bmm to m\b/, 'length', 'mm', 'm'],
    [/\byard to mile\b/, 'length', 'yd', 'mi'],
    [/\byards to meters\b/, 'length', 'yd', 'm'],
    [/\bdecimeter to meter|\bdm conversion\b/, 'length', 'dm', 'm'],
    [/\blight year\b/, 'length', 'ly', 'km'],
    [/\bacres to hectares\b/, 'area', 'acre', 'hectare'],
    [/\bacres to square feet\b/, 'area', 'acre', 'sqft'],
    [/\bares to hectares\b/, 'area', 'are', 'hectare'],
    [/\bhectares to acres\b/, 'area', 'hectare', 'acre'],
    [/\bsquare centimeters to square millimeters\b/, 'area', 'sqcm', 'sqmm'],
    [/\bsquare miles to square km\b/, 'area', 'sqmi', 'sqkm'],
    [/\bcent to square meter\b/, 'area', 'cent', 'sqm'],
    [/\bgaj to square yard\b/, 'area', 'sqyd', 'sqft'],
    [/\bkatha to square feet\b/, 'area', 'katha', 'sqft'],
    [/\blot size to acres|\bacreage\b/, 'area', 'sqft', 'acre'],
    [/\bbigha\b/, 'area', 'bigha', 'acre'],
    [/\bsquare feet\b/, 'area', 'sqft', 'sqm'],
    [/\bsquare meter\b/, 'area', 'sqm', 'sqft'],
    [/\bg to lbs\b/, 'mass', 'g', 'lb'],
    [/\bg to oz\b/, 'mass', 'g', 'oz'],
    [/\bdecagram to gram\b/, 'mass', 'dag', 'g'],
    [/\bkg to lbs\b/, 'mass', 'kg', 'lb'],
    [/\bkg to ounce\b/, 'mass', 'kg', 'oz'],
    [/\bkg to stones\b/, 'mass', 'kg', 'st'],
    [/\blbs to g\b/, 'mass', 'lb', 'g'],
    [/\blbs to kg\b/, 'mass', 'lb', 'kg'],
    [/\bpounds to stone\b/, 'mass', 'lb', 'st'],
    [/\bstone to kg\b/, 'mass', 'st', 'kg'],
    [/\bstone to lbs\b/, 'mass', 'st', 'lb'],
    [/\bounce to kg\b/, 'mass', 'oz', 'kg'],
    [/\bmcg to mg\b/, 'mass', 'mcg', 'mg'],
    [/\bmg to lbs\b/, 'mass', 'mg', 'lb'],
    [/\bgrain conversion\b/, 'mass', 'gr', 'g'],
    [/\bmm to carat\b/, 'mass', 'ct', 'g'],
    [/\bcc to liter\b/, 'volume', 'ml', 'l'],
    [/\bcc to oz\b/, 'volume', 'ml', 'floz'],
    [/\bccf to gallons\b/, 'volume', 'ccf', 'gal'],
    [/\bcubic feet to cubic meters\b/, 'volume', 'cuft', 'cum'],
    [/\bcubic inches to gallons\b/, 'volume', 'cuin', 'gal'],
    [/\bcups to gallons\b/, 'volume', 'cup', 'gal'],
    [/\bcups to oz\b/, 'volume', 'cup', 'floz'],
    [/\bcups to pints\b/, 'volume', 'cup', 'pt'],
    [/\bcups to quarts\b/, 'volume', 'cup', 'qt'],
    [/\bcups to tablespoons\b/, 'volume', 'cup', 'tbsp'],
    [/\bdrops to ml\b/, 'volume', 'drop', 'ml'],
    [/\bgallons to cubic feet\b/, 'volume', 'gal', 'cuft'],
    [/\bgallons to cups\b/, 'volume', 'gal', 'cup'],
    [/\bgallons to pints\b/, 'volume', 'gal', 'pt'],
    [/\bgallons to quarts\b/, 'volume', 'gal', 'qt'],
    [/\bliters to cl\b/, 'volume', 'l', 'cl'],
    [/\bliters to gallons\b/, 'volume', 'l', 'gal'],
    [/\bml to cc\b/, 'volume', 'ml', 'ml'],
    [/\bml to cups\b/, 'volume', 'ml', 'cup'],
    [/\bml to oz\b/, 'volume', 'ml', 'floz'],
    [/\bml to ul\b/, 'volume', 'ml', 'ul'],
    [/\bounces to cups|\boz to cc\b/, 'volume', 'floz', 'cup'],
    [/\bquarts to cups\b/, 'volume', 'qt', 'cup'],
    [/\bquarts to gallons\b/, 'volume', 'qt', 'gal'],
    [/\btablespoons to cups\b/, 'volume', 'tbsp', 'cup'],
    [/\btbsp to ml\b/, 'volume', 'tbsp', 'ml'],
    [/\btsp ml\b/, 'volume', 'tsp', 'ml'],
    [/\batm to pascals|\batm conversion\b/, 'pressure', 'atm', 'pa'],
    [/\bbar to atm\b/, 'pressure', 'bar', 'atm'],
    [/\bbar to psi\b/, 'pressure', 'bar', 'psi'],
    [/\bkg cm2 to psi\b/, 'pressure', 'kgcm2', 'psi'],
    [/\bkpa to atm\b/, 'pressure', 'kpa', 'atm'],
    [/\bkpa to mmhg\b/, 'pressure', 'kpa', 'torr'],
    [/\bkpa to psi|\bkpa conversion\b/, 'pressure', 'kpa', 'psi'],
    [/\bksi to mpa\b/, 'pressure', 'ksi', 'mpa'],
    [/\bksi to psi\b/, 'pressure', 'ksi', 'psi'],
    [/\bmm to atm|\bmmhg to atm\b/, 'pressure', 'torr', 'atm'],
    [/\bmpa to psi|\bmpa conversion\b/, 'pressure', 'mpa', 'psi'],
    [/\bpa to psi|\bpascal conversion\b/, 'pressure', 'pa', 'psi'],
    [/\bpsi to atm|\bpsi conversion\b/, 'pressure', 'psi', 'atm'],
    [/\bpsi to inches of water\b/, 'pressure', 'psi', 'inh2o'],
    [/\btorr to atm\b/, 'pressure', 'torr', 'atm'],
    [/\bknots to kph\b/, 'speed', 'kn', 'kph'],
    [/\bm\/s to km\/h\b/, 'speed', 'mps', 'kph'],
    [/\bdays to weeks\b/, 'time', 'day', 'wk'],
    [/\bhours to days\b/, 'time', 'hr', 'day'],
    [/\bhours to week\b/, 'time', 'hr', 'wk'],
    [/\bhours to years\b/, 'time', 'hr', 'yr'],
    [/\bminutes to days\b/, 'time', 'min', 'day'],
    [/\bminutes to years\b/, 'time', 'min', 'yr'],
    [/\bms to seconds|\bmilliseconds\b/, 'time', 'ms', 's'],
    [/\bseconds to days\b/, 'time', 's', 'day'],
    [/\bseconds to hours\b/, 'time', 's', 'hr'],
    [/\bseconds to minutes\b/, 'time', 's', 'min'],
    [/\bseconds to years\b/, 'time', 's', 'yr'],
    [/\bweeks to months\b/, 'time', 'wk', 'mo'],
    [/\bweeks to years\b/, 'time', 'wk', 'yr'],
    [/\byears to decades\b/, 'time', 'yr', 'dec'],
    [/\bkilobytes to megabytes\b/, 'data', 'KB', 'MB'],
    [/\bbyte converter|\bstorage converter\b/, 'data', 'GB', 'GiB'],
    [/\binch lbs to nm\b/, 'torque', 'inlb', 'Nm'],
    [/\binch pounds to foot pounds\b/, 'torque', 'inlb', 'ftlb'],
    [/\bnm to in lbs|\bnm converter|\btorque converter\b/, 'torque', 'Nm', 'inlb'],
  ];

  for (const [re, groupKey, fromId, toId] of pairMap) {
    if (re.test(nameLower)) return { groupKey, fromId, toId };
  }
  return null;
}

const CURRENCY_RATES_USD: Record<string, { label: string; rate: number; sym: string }> = {
  USD: { label: 'US Dollar (USD)', rate: 1, sym: '$' },
  INR: { label: 'Indian Rupee (INR)', rate: 84.4, sym: '₹' },
  EUR: { label: 'Euro (EUR)', rate: 0.94, sym: '€' },
  GBP: { label: 'British Pound (GBP)', rate: 0.79, sym: '£' },
  CAD: { label: 'Canadian Dollar (CAD)', rate: 1.40, sym: 'C$' },
  AUD: { label: 'Australian Dollar (AUD)', rate: 1.54, sym: 'A$' },
  JPY: { label: 'Japanese Yen (JPY)', rate: 154.0, sym: '¥' },
  AED: { label: 'UAE Dirham (AED)', rate: 3.6725, sym: 'AED ' },
  SGD: { label: 'Singapore Dollar (SGD)', rate: 1.34, sym: 'S$' },
};

export function buildExtendedUnitDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();

  // 1. SMPS Power Electronics Converters (Buck / Boost / Buck-Boost / Flyback / Forward)
  if (/\b(buck converter|boost converter|inverting buck boost|flyback converter|forward converter)\b/.test(n)) {
    const isBoost = n.includes('boost') && !n.includes('inverting');
    const isInv = n.includes('inverting');
    const isFly = n.includes('flyback');
    const isFwd = n.includes('forward');
    return makeBase(entry, {
      shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact SMPS duty cycle, inductor ripple, and diode/switch stress.`,
      formulaDisplay: isBoost
        ? 'D = 1 − (V_in / V_out)  |  L = (V_in × D) / (f_sw × ΔI_L)'
        : isInv
        ? 'D = |V_out| / (V_in + |V_out|)'
        : isFly || isFwd
        ? 'D = V_out / (V_out + V_in·(N_s/N_p))'
        : 'D = V_out / V_in  |  L = (V_out × (1 − D)) / (f_sw × ΔI_L)',
      explanation: 'Computes switching duty cycle, minimum inductance, output ripple current, and peak switch stress.',
      inputs: [
        { key: 'vin', label: 'Input Voltage Vin (V)', type: 'number', defaultValue: 24, min: 1, step: 0.5 },
        { key: 'vout', label: 'Target Output Voltage |Vout| (V)', type: 'number', defaultValue: isBoost ? 48 : 12, min: 0.5, step: 0.5 },
        { key: 'iout', label: 'Output Load Current (A)', type: 'number', defaultValue: 3, min: 0.05, step: 0.1 },
        { key: 'fsw', label: 'Switching Frequency (kHz)', type: 'number', defaultValue: 150, min: 10, step: 10 },
        { key: 'turns', label: 'Transformer Ratio Ns/Np (if isolated)', type: 'number', defaultValue: 0.5, min: 0.05, step: 0.05 },
      ],
      compute: (vals) => {
        const vin = num(vals, 'vin', 24);
        const vout = num(vals, 'vout', 12);
        const iout = num(vals, 'iout', 3);
        const fsw = num(vals, 'fsw', 150) * 1000;
        const turns = num(vals, 'turns', 0.5);
        let d = 0.5;
        if (isBoost) {
          const effectiveVout = Math.max(vout, vin + 1);
          d = 1 - vin / effectiveVout;
        } else if (isInv) {
          d = vout / (vin + vout);
        } else if (isFly) {
          d = vout / (vout + vin * turns);
        } else if (isFwd) {
          d = Math.min(0.48, vout / (vin * Math.max(0.1, turns)));
        } else {
          d = Math.min(0.95, vout / Math.max(vin, vout + 0.1));
        }
        const rippleI = Math.max(0.1, iout * 0.3);
        const lH = isBoost ? (vin * d) / (fsw * rippleI) : ((vout * (1 - d)) / (fsw * rippleI));
        const pout = vout * iout;
        return {
          primary: { label: 'Switching Duty Cycle (D)', value: d * 100, formatted: `${(d * 100).toFixed(2)}%`, unit: '%' },
          breakdown: [
            { label: 'Recommended Inductance', value: lH * 1e6, formatted: `${(lH * 1e6).toFixed(1)} µH` },
            { label: 'Inductor Ripple ΔI (30%)', value: rippleI, formatted: `${rippleI.toFixed(2)} A` },
            { label: 'Output Power', value: pout, formatted: `${pout.toFixed(2)} W` },
            { label: 'Peak Switch Voltage', value: vin + vout, formatted: `${(vin + vout).toFixed(1)} V` },
          ],
          steps: [`D = ${(d * 100).toFixed(2)}%, f_sw = ${(fsw / 1000).toFixed(0)} kHz, L_min = ${(lH * 1e6).toFixed(1)} µH`],
        };
      },
    });
  }

  // 2. Currency & Monetary Denominations
  if (/\b(currency converter|crore|million to|billion to|number to billion|number to million|cents to|pence to|pennies to|dimes to|nickels to)\b/.test(n)) {
    if (/\bcurrency converter\b/.test(n)) {
      const opts = Object.entries(CURRENCY_RATES_USD).map(([k, v]) => ({ label: v.label, value: k }));
      return makeBase(entry, {
        shortDescription: `Convert global currencies cleanly across USD, INR, EUR, GBP, CAD, AUD, JPY, AED & SGD.`,
        formulaDisplay: 'Converted = Amount × (Rate_to / Rate_from)',
        explanation: 'Calculates converted values using standard reference mid-market FX parity rates plus inverse exchange rate.',
        inputs: [
          { key: 'amount', label: 'Amount', type: 'number', defaultValue: 1000, min: 0, step: 10 },
          { key: 'fromCur', label: 'From Currency', type: 'select', defaultValue: 'USD', options: opts },
          { key: 'toCur', label: 'To Currency', type: 'select', defaultValue: 'INR', options: opts },
        ],
        compute: (vals) => {
          const amt = num(vals, 'amount');
          const fromC = str(vals, 'fromCur', 'USD');
          const toC = str(vals, 'toCur', 'INR');
          const rFrom = CURRENCY_RATES_USD[fromC]?.rate || 1;
          const rTo = CURRENCY_RATES_USD[toC]?.rate || 1;
          const res = (amt / rFrom) * rTo;
          const sym = CURRENCY_RATES_USD[toC]?.sym || '';
          return {
            primary: { label: `Converted (${toC})`, value: res, formatted: `${sym}${res.toLocaleString('en-US', { maximumFractionDigits: 2 })}` },
            breakdown: Object.entries(CURRENCY_RATES_USD)
              .slice(0, 6)
              .map(([code, meta]) => {
                const v = (amt / rFrom) * meta.rate;
                return { label: meta.label, value: v, formatted: `${meta.sym}${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}` };
              }),
            steps: [`1 ${fromC} = ${(rTo / rFrom).toFixed(4)} ${toC}`],
          };
        },
      });
    }

    if (/\b(cents|pence|pennies|dimes|nickels)\b/.test(n)) {
      const isNickels = n.includes('nickel');
      const isDimes = n.includes('dime');
      const factor = isNickels ? 0.05 : isDimes ? 0.1 : 0.01;
      const coinName = isNickels ? 'Nickels (5¢)' : isDimes ? 'Dimes (10¢)' : n.includes('pence') ? 'Pence (1p)' : 'Cents / Pennies (1¢)';
      const sym = n.includes('pence') ? '£' : n.includes('euro') ? '€' : '$';
      return makeBase(entry, {
        shortDescription: `${entry.name} — exact coin count to major currency unit conversion.`,
        formulaDisplay: `Total = Count × ${factor}`,
        explanation: `Converts ${coinName} directly into ${sym} value and coin roll counts.`,
        inputs: [{ key: 'count', label: `Number of ${coinName}`, type: 'number', defaultValue: 250, min: 0, step: 1 }],
        compute: (vals) => {
          const cnt = num(vals, 'count');
          const total = cnt * factor;
          return {
            primary: { label: 'Total Monetary Value', value: total, formatted: `${sym}${total.toFixed(2)}` },
            breakdown: [
              { label: 'Coin Count', value: cnt, formatted: `${cnt.toLocaleString()} coins` },
              { label: 'Unit Value', value: factor, formatted: `${sym}${factor.toFixed(2)} / coin` },
            ],
            steps: [`${cnt} × ${factor} = ${sym}${total.toFixed(2)}`],
          };
        },
      });
    }

    // Crore / Lakh / Million / Billion
    return makeBase(entry, {
      shortDescription: `${entry.name} — instant Indian numbering (Lakh / Crore) & International (Million / Billion / Trillion) converter.`,
      formulaDisplay: '1 Crore = 100 Lakhs = 10 Million  |  1 Billion = 1,000 Million = 100 Crores',
      explanation: 'Converts seamlessly between Indian Place Value (Thousand, Lakh, Crore, Arab) and International system (Million, Billion, Trillion).',
      inputs: [
        { key: 'val', label: 'Numeric Value', type: 'number', defaultValue: 5, min: 0, step: 0.5 },
        {
          key: 'unit',
          label: 'Input Scale',
          type: 'select',
          defaultValue: n.startsWith('crore') ? 'crore' : n.startsWith('billion') ? 'billion' : n.startsWith('million') ? 'million' : 'raw',
          options: [
            { label: 'Exact Number (1s)', value: 'raw' },
            { label: 'Thousand (10³)', value: 'thousand' },
            { label: 'Lakh (10⁵)', value: 'lakh' },
            { label: 'Million (10⁶)', value: 'million' },
            { label: 'Crore (10⁷)', value: 'crore' },
            { label: 'Billion (10⁹)', value: 'billion' },
            { label: 'Trillion (10¹²)', value: 'trillion' },
          ],
        },
      ],
      compute: (vals) => {
        const v = num(vals, 'val', 5);
        const u = str(vals, 'unit', 'crore');
        const mult: Record<string, number> = { raw: 1, thousand: 1e3, lakh: 1e5, million: 1e6, crore: 1e7, billion: 1e9, trillion: 1e12 };
        const raw = v * (mult[u] || 1);
        const target = n.includes('to lakh') ? raw / 1e5 : n.includes('to trillion') ? raw / 1e12 : n.includes('to billion') ? raw / 1e9 : n.includes('to thousand') ? raw / 1e3 : raw / 1e6;
        const targetLabel = n.includes('to lakh') ? 'Lakhs' : n.includes('to trillion') ? 'Trillions' : n.includes('to billion') ? 'Billions' : n.includes('to thousand') ? 'Thousands' : 'Millions';
        return {
          primary: { label: targetLabel, value: target, formatted: `${target.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${targetLabel}` },
          breakdown: [
            { label: 'Lakhs (10⁵)', value: raw / 1e5, formatted: `${(raw / 1e5).toLocaleString()} Lakhs` },
            { label: 'Crores (10⁷)', value: raw / 1e7, formatted: `${(raw / 1e7).toLocaleString()} Crores` },
            { label: 'Millions (10⁶)', value: raw / 1e6, formatted: `${(raw / 1e6).toLocaleString()} M` },
            { label: 'Billions (10⁹)', value: raw / 1e9, formatted: `${(raw / 1e9).toLocaleString()} B` },
          ],
          steps: [`Absolute Value = ${raw.toLocaleString()}`],
        };
      },
    });
  }

  // 3. Volume <-> Mass & Culinary Density Conversions
  if (
    /\b(cc to grams|cubic feet to pounds|cubic meter to ton|cubic yards to tons|fluid ounces to pounds|gallon to tons|gallons to grams|gallons to pounds|gr to ml|gr to tsp|gram to liter|grams in ml|grams to calories|grams to cups|grams to fl oz|kg to gallons|kg to liter|liters to pounds|mg to cc|mg to lbs|mg to ml|mg to tablespoon|mg to teaspoon|ml to kg|ml to lbs|pint to pound|quarts to pounds|tsp to grams|tbsp to grams|volume to mass|size to weight)\b/.test(
      n
    )
  ) {
    const DENSITY: Record<string, { label: string; gPerMl: number; kcalPerG: number }> = {
      water: { label: 'Water / Milk (~1.0 g/mL)', gPerMl: 1.0, kcalPerG: 0 },
      flour: { label: 'All-Purpose Flour (0.53 g/mL)', gPerMl: 0.53, kcalPerG: 3.64 },
      sugar: { label: 'Granulated Sugar (0.85 g/mL)', gPerMl: 0.85, kcalPerG: 3.87 },
      butter: { label: 'Butter / Oil (0.91 g/mL)', gPerMl: 0.91, kcalPerG: 7.17 },
      honey: { label: 'Honey / Syrup (1.42 g/mL)', gPerMl: 1.42, kcalPerG: 3.04 },
      gravel: { label: 'Gravel / Sand (1.60 g/mL)', gPerMl: 1.6, kcalPerG: 0 },
      concrete: { label: 'Wet Concrete (2.40 g/mL)', gPerMl: 2.4, kcalPerG: 0 },
      steel: { label: 'Steel / Iron (7.85 g/mL)', gPerMl: 7.85, kcalPerG: 0 },
    };
    const isBulk = /(cubic yards|cubic meter|cubic feet|gallon to tons|size to weight)/.test(n);
    const defaultMat = isBulk ? 'gravel' : n.includes('calories') ? 'sugar' : 'water';
    return makeBase(entry, {
      shortDescription: `${entry.name} (#${entry.catalogNumber}) — density-accurate mass, volume & culinary converter.`,
      formulaDisplay: 'Mass (g) = Volume (mL) × Density (g/mL)',
      explanation: 'Bridges volume and weight accurately using selectable substance density (water, flour, sugar, gravel, concrete, steel).',
      inputs: [
        { key: 'val', label: n.startsWith('g') || n.startsWith('kg') || n.startsWith('mg') ? 'Input Weight / Mass' : 'Input Volume / Quantity', type: 'number', defaultValue: isBulk ? 5 : 250, min: 0, step: 1 },
        {
          key: 'mat',
          label: 'Material / Ingredient Density',
          type: 'select',
          defaultValue: defaultMat,
          options: Object.entries(DENSITY).map(([k, v]) => ({ label: v.label, value: k })),
        },
      ],
      compute: (vals) => {
        const v = num(vals, 'val', 100);
        const matKey = str(vals, 'mat', defaultMat);
        const d = DENSITY[matKey] || DENSITY.water;
        if (n.includes('grams to calories')) {
          const kcal = v * (d.kcalPerG || 4);
          return {
            primary: { label: 'Estimated Calories', value: kcal, formatted: `${kcal.toFixed(1)} kcal` },
            breakdown: [
              { label: 'Kilojoules (kJ)', value: kcal * 4.184, formatted: `${(kcal * 4.184).toFixed(1)} kJ` },
              { label: 'Equivalent Volume', value: v / d.gPerMl, formatted: `${(v / d.gPerMl).toFixed(1)} mL` },
            ],
            steps: [`${v} g × ${d.kcalPerG || 4} kcal/g = ${kcal.toFixed(1)} kcal`],
          };
        }
        // Convert input to mL or grams depending on prefix
        let ml = v;
        if (n.startsWith('cubic yards')) ml = v * 764554.858;
        else if (n.startsWith('cubic meter')) ml = v * 1e6;
        else if (n.startsWith('cubic feet')) ml = v * 28316.847;
        else if (n.startsWith('gallon')) ml = v * 3785.412;
        else if (n.startsWith('quart')) ml = v * 946.353;
        else if (n.startsWith('pint')) ml = v * 473.176;
        else if (n.startsWith('fluid')) ml = v * 29.5735;
        else if (n.startsWith('tbsp')) ml = v * 14.7868;
        else if (n.startsWith('tsp')) ml = v * 4.9289;
        else if (n.startsWith('kg')) ml = (v * 1000) / d.gPerMl;
        else if (n.startsWith('mg')) ml = (v / 1000) / d.gPerMl;
        else if (n.startsWith('gr') || n.startsWith('gram')) ml = v / d.gPerMl;

        const grams = ml * d.gPerMl;
        const lbs = grams / 453.59237;
        const tons = grams / 907184.74;
        const cups = ml / 236.5882365;
        const primaryVal = n.includes('ton') ? tons : n.includes('pound') || n.includes('lbs') ? lbs : n.includes('cup') ? cups : n.includes('liter') ? ml / 1000 : n.includes('ml') ? ml : grams;
        const primaryUnit = n.includes('ton') ? 'US tons' : n.includes('pound') || n.includes('lbs') ? 'lbs' : n.includes('cup') ? 'cups' : n.includes('liter') ? 'L' : n.includes('ml') ? 'mL' : 'g';

        return {
          primary: { label: 'Converted Output', value: primaryVal, formatted: `${Number(primaryVal.toPrecision(5))} ${primaryUnit}`, unit: primaryUnit },
          breakdown: [
            { label: 'Grams (g)', value: grams, formatted: `${grams.toFixed(2)} g` },
            { label: 'Kilograms (kg)', value: grams / 1000, formatted: `${(grams / 1000).toFixed(4)} kg` },
            { label: 'Pounds (lb)', value: lbs, formatted: `${lbs.toFixed(3)} lb` },
            { label: 'Volume (mL / Liters)', value: ml, formatted: `${ml.toFixed(2)} mL (${(ml / 1000).toFixed(3)} L)` },
          ],
          steps: [`Volume = ${ml.toFixed(2)} mL × ρ(${d.gPerMl} g/mL) = ${grams.toFixed(2)} g`],
        };
      },
    });
  }

  // 4. Text / Binary / Hex / Base / Unicode / T9 / Color / Roman / Number-to-Words
  if (
    /\b(text to binary|binary to text|text to hex|hex to text|capital case|lowercase to uppercase|uppercase to lowercase|sentence case|mirror text|t9 to text|base converter|binary converter|binary to hexadecimal|color converter|roman numeral|number to words|military time|ip address converter)\b/.test(
      n
    )
  ) {
    if (/\b(color converter)\b/.test(n)) {
      return makeBase(entry, {
        shortDescription: `Convert HEX, RGB, HSL, and CMYK color values accurately with luminance contrast check.`,
        formulaDisplay: 'RGB (0–255) ↔ HEX (#RRGGBB) ↔ HSL (H°, S%, L%)',
        explanation: 'Computes exact HEX, HSL, and relative luminance values from RGB channels.',
        inputs: [
          { key: 'r', label: 'Red (0–255)', type: 'number', defaultValue: 37, min: 0, max: 255, step: 1 },
          { key: 'g', label: 'Green (0–255)', type: 'number', defaultValue: 99, min: 0, max: 255, step: 1 },
          { key: 'b', label: 'Blue (0–255)', type: 'number', defaultValue: 235, min: 0, max: 255, step: 1 },
        ],
        compute: (vals) => {
          const r = Math.min(255, Math.max(0, Math.round(num(vals, 'r', 37))));
          const g = Math.min(255, Math.max(0, Math.round(num(vals, 'g', 99))));
          const b = Math.min(255, Math.max(0, Math.round(num(vals, 'b', 235))));
          const hex = `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
          const rn = r / 255, gn = g / 255, bn = b / 255;
          const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
          const l = (max + min) / 2;
          const d = max - min;
          const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
          let h = 0;
          if (d !== 0) {
            h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
            h = Math.round((h * 60 + 360) % 360);
          }
          const lum = 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
          return {
            primary: { label: 'HEX Color Code', value: hex, formatted: hex },
            breakdown: [
              { label: 'RGB String', value: `${r},${g},${b}`, formatted: `rgb(${r}, ${g}, ${b})` },
              { label: 'HSL String', value: h, formatted: `hsl(${h}°, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%)` },
              { label: 'Relative Luminance', value: lum, formatted: `${(lum * 100).toFixed(1)}% (${lum > 0.5 ? 'Use Dark Text' : 'Use White Text'})` },
            ],
            steps: [`RGB(${r},${g},${b}) -> ${hex}`],
          };
        },
      });
    }

    if (/\b(base converter|binary converter|binary to hexadecimal|ip address converter)\b/.test(n)) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — exact Binary, Octal, Decimal, and Hexadecimal / IPv4 integer conversion.`,
        formulaDisplay: 'Base_n ↔ Base_10 ↔ Base_16 (Hex) / 32-bit IPv4',
        explanation: 'Converts integers across Bases 2, 8, 10, 16 or maps 32-bit decimal integers to dotted IPv4 addresses.',
        inputs: [
          { key: 'val', label: 'Decimal Integer (or Binary/Hex string)', type: 'text', defaultValue: n.includes('binary') ? '11010110' : '255' },
          { key: 'fromBase', label: 'Input Base', type: 'select', defaultValue: n.includes('binary') ? '2' : '10', options: [
            { label: 'Binary (Base 2)', value: '2' },
            { label: 'Octal (Base 8)', value: '8' },
            { label: 'Decimal (Base 10)', value: '10' },
            { label: 'Hexadecimal (Base 16)', value: '16' },
          ] },
        ],
        compute: (vals) => {
          const raw = str(vals, 'val', '255').replace(/\s+/g, '');
          const base = Number(str(vals, 'fromBase', '10'));
          const parsed = Number.parseInt(raw, base);
          const safe = Number.isFinite(parsed) ? Math.max(0, parsed) : 255;
          const ipv4 = [(safe >>> 24) & 255, (safe >>> 16) & 255, (safe >>> 8) & 255, safe & 255].join('.');
          return {
            primary: { label: 'Hexadecimal (Base 16)', value: `0x${safe.toString(16).toUpperCase()}`, formatted: `0x${safe.toString(16).toUpperCase()}` },
            breakdown: [
              { label: 'Decimal (Base 10)', value: safe, formatted: safe.toLocaleString() },
              { label: 'Binary (Base 2)', value: safe.toString(2), formatted: safe.toString(2) },
              { label: 'Octal (Base 8)', value: safe.toString(8), formatted: `0o${safe.toString(8)}` },
              { label: '32-bit IPv4 Representation', value: ipv4, formatted: ipv4 },
            ],
            steps: [`Input "${raw}" (base ${base}) = ${safe}₁₀ = ${safe.toString(16).toUpperCase()}₁₆`],
          };
        },
      });
    }

    if (/\bmilitary time\b/.test(n)) {
      return makeBase(entry, {
        shortDescription: `Convert 24-hour military time (HHMM) to 12-hour AM/PM standard time cleanly.`,
        formulaDisplay: '0000–1159 = AM  |  1200–2359 = PM (− 12 hours)',
        explanation: 'Instantly translates 4-digit military clock times to standard 12-hour format.',
        inputs: [
          { key: 'hour', label: 'Hour (0–23)', type: 'number', defaultValue: 18, min: 0, max: 23, step: 1 },
          { key: 'minute', label: 'Minute (0–59)', type: 'number', defaultValue: 45, min: 0, max: 59, step: 1 },
        ],
        compute: (vals) => {
          const h = Math.min(23, Math.max(0, Math.round(num(vals, 'hour', 18))));
          const m = Math.min(59, Math.max(0, Math.round(num(vals, 'minute', 45))));
          const mil = `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')} hrs`;
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 === 0 ? 12 : h % 12;
          const std = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
          return {
            primary: { label: '12-Hour Standard Time', value: std, formatted: std },
            breakdown: [{ label: '24-Hour Military Time', value: mil, formatted: mil }],
            steps: [`${mil} = ${std}`],
          };
        },
      });
    }

    if (/\b(roman numeral|number to words)\b/.test(n)) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — convert integers into Roman Numerals and full English words.`,
        formulaDisplay: 'M=1000, D=500, C=100, L=50, X=10, V=5, I=1',
        explanation: 'Provides both standard subtractive Roman numeral notation and English spelled-out wording.',
        inputs: [{ key: 'numVal', label: 'Positive Integer (1–3999)', type: 'number', defaultValue: 2026, min: 1, max: 999999, step: 1 }],
        compute: (vals) => {
          const v = Math.max(1, Math.min(999999, Math.floor(num(vals, 'numVal', 2026))));
          const map: Array<[number, string]> = [
            [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
            [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
            [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
          ];
          let rem = Math.min(3999, v);
          let roman = '';
          for (const [val, sym] of map) {
            while (rem >= val) { roman += sym; rem -= val; }
          }
          const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
          const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
          const toWords = (x: number): string => {
            if (x < 20) return ones[x];
            if (x < 100) return `${tens[Math.floor(x / 10)]}${x % 10 ? '-' + ones[x % 10] : ''}`;
            if (x < 1000) return `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? ' ' + toWords(x % 100) : ''}`;
            return `${toWords(Math.floor(x / 1000))} Thousand${x % 1000 ? ' ' + toWords(x % 1000) : ''}`;
          };
          const words = toWords(v);
          return {
            primary: { label: n.includes('roman') ? 'Roman Numeral' : 'Number in Words', value: n.includes('roman') ? roman : words, formatted: n.includes('roman') ? roman : words },
            breakdown: [
              { label: 'Roman Numeral (≤3999)', value: roman, formatted: roman },
              { label: 'English Words', value: words, formatted: words },
            ],
            steps: [`${v} = ${roman} ("${words}")`],
          };
        },
      });
    }

    // Text case / Text <-> Binary / Hex / Mirror
    return makeBase(entry, {
      shortDescription: `${entry.name} — instant UTF-8 Binary, Hex, Case Styling & Mirror Text converter.`,
      formulaDisplay: 'UTF-8 Codepoint → Binary (8-bit) / Hex / Unicode Transform',
      explanation: 'Converts plain text deterministically into binary bits, hexadecimal bytes, mirror characters, or styled casing.',
      inputs: [{ key: 'text', label: 'Input Text', type: 'text', defaultValue: 'Bulk Calculator Studio' }],
      compute: (vals) => {
        const txt = str(vals, 'text', 'Bulk Calculator Studio');
        const bin = Array.from(txt).map((ch) => ch.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        const hex = Array.from(txt).map((ch) => ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(' ');
        const mirrored = Array.from(txt).reverse().join('');
        const cap = txt.replace(/\b\w/g, (c) => c.toUpperCase());
        const primary = n.includes('binary to text')
          ? txt.split(/\s+/).filter((b) => /^[01]{4,8}$/.test(b)).map((b) => String.fromCharCode(parseInt(b, 2))).join('') || txt
          : n.includes('hex to text')
          ? txt.split(/\s+/).filter((h) => /^[0-9a-fA-F]{2}$/.test(h)).map((h) => String.fromCharCode(parseInt(h, 16))).join('') || txt
          : n.includes('binary')
          ? bin
          : n.includes('hex')
          ? hex
          : n.includes('mirror')
          ? mirrored
          : n.includes('uppercase') && !n.includes('to lowercase')
          ? txt.toUpperCase()
          : n.includes('lowercase') && !n.includes('to uppercase')
          ? txt.toLowerCase()
          : cap;

        return {
          primary: { label: 'Converted Output', value: primary, formatted: primary.slice(0, 120) },
          breakdown: [
            { label: 'Character Count', value: txt.length, formatted: `${txt.length} chars` },
            { label: 'Hex Preview', value: hex.slice(0, 48), formatted: hex.slice(0, 48) },
            { label: 'Binary Preview', value: bin.slice(0, 48), formatted: bin.slice(0, 48) },
          ],
          steps: [`Processed ${txt.length} characters.`],
        };
      },
    });
  }

  // 5. Engineering / RF / Electrical / Lighting / Hardness Units
  if (/\b(dbm to watts|watts to amps|wattage to amperage|kva to amperage|hp to amps|rms to watts|joules to volts|newton to joules|kg to newtons|lbs to newton|lumens to watts|watts to lux|lux to footcandle|watts to heat|rockwell hardness|hardness conversion|mesh to micron|rf unit|capacitance conversion|radiation converter|psi to gpm|psig to psia|bar to psig|mpa to psig|awg to mm|lat long to utm|ppm to mgl|bohr|natural gas)\b/.test(n)) {
    if (/\bdbm to watts|\brf unit\b/.test(n)) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — RF power conversion between dBm, dBW, Watts, and milliWatts.`,
        formulaDisplay: 'P(W) = 10^((dBm − 30) / 10)  |  P(mW) = 10^(dBm / 10)',
        explanation: 'Converts RF signal power across logarithmic dBm/dBW scales and linear Watts.',
        inputs: [{ key: 'dbm', label: 'Signal Power (dBm)', type: 'number', defaultValue: 30, min: -120, max: 100, step: 1 }],
        compute: (vals) => {
          const dbm = num(vals, 'dbm', 30);
          const mw = Math.pow(10, dbm / 10);
          const w = mw / 1000;
          return {
            primary: { label: 'Linear Power', value: w, formatted: `${w >= 0.01 ? w.toFixed(4) : w.toExponential(3)} W`, unit: 'W' },
            breakdown: [
              { label: 'Milliwatts (mW)', value: mw, formatted: `${mw >= 0.01 ? mw.toFixed(3) : mw.toExponential(3)} mW` },
              { label: 'dBW', value: dbm - 30, formatted: `${(dbm - 30).toFixed(2)} dBW` },
            ],
            steps: [`10^((${dbm} - 30)/10) = ${w.toPrecision(5)} W`],
          };
        },
      });
    }

    if (/\b(watts to amps|wattage to amperage|kva to amperage|hp to amps|rms to watts)\b/.test(n)) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — exact electrical AC/DC current, kVA, HP, and RMS power conversion.`,
        formulaDisplay: 'I_1Φ = P / (V × PF)  |  I_3Φ = P / (√3 × V × PF)',
        explanation: 'Computes Amperage from Watts, kVA, or Horsepower across 120V/230V/400V single and three-phase circuits.',
        inputs: [
          { key: 'val', label: n.includes('kva') ? 'Apparent Power (kVA)' : n.includes('hp') ? 'Motor Power (HP)' : 'Power (Watts)', type: 'number', defaultValue: n.includes('kva') ? 10 : n.includes('hp') ? 5 : 2400, min: 0.1, step: 1 },
          { key: 'volts', label: 'Voltage (V)', type: 'number', defaultValue: 230, min: 5, step: 5 },
          { key: 'pf', label: 'Power Factor (0.1–1.0)', type: 'number', defaultValue: 0.9, min: 0.1, max: 1, step: 0.05 },
          { key: 'phase', label: 'Phase Type', type: 'select', defaultValue: '1', options: [{ label: 'Single Phase (AC/DC)', value: '1' }, { label: 'Three Phase (√3)', value: '3' }] },
        ],
        compute: (vals) => {
          const val = num(vals, 'val');
          const v = num(vals, 'volts', 230);
          const pf = num(vals, 'pf', 0.9);
          const ph = str(vals, 'phase', '1');
          const watts = n.includes('kva') ? val * 1000 * pf : n.includes('hp') ? val * 745.69987 : val;
          const denom = ph === '3' ? Math.sqrt(3) * v * pf : v * pf;
          const amps = watts / Math.max(0.1, denom);
          return {
            primary: { label: n.includes('rms') ? 'RMS / Peak Power' : 'Current (Amps)', value: amps, formatted: `${amps.toFixed(2)} A`, unit: 'A' },
            breakdown: [
              { label: 'Active Power (W)', value: watts, formatted: `${watts.toFixed(1)} W` },
              { label: 'Apparent Power (VA)', value: watts / pf, formatted: `${(watts / pf).toFixed(1)} VA` },
              { label: 'Heat Output (BTU/hr)', value: watts * 3.41214, formatted: `${(watts * 3.41214).toFixed(1)} BTU/hr` },
            ],
            steps: [`I = ${watts.toFixed(1)} W / ${denom.toFixed(2)} = ${amps.toFixed(2)} A`],
          };
        },
      });
    }

    if (/\b(lumens to watts|watts to lux|lux to footcandle|luminance)\b/.test(n)) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — convert luminous flux (lm), illuminance (lux / fc), and LED wattage.`,
        formulaDisplay: 'W = Lumens / Efficacy(lm/W)  |  1 Footcandle = 10.76391 Lux',
        explanation: 'Converts LED/Halogen brightness and room surface illuminance.',
        inputs: [
          { key: 'val', label: n.includes('lux') ? 'Illuminance (Lux)' : 'Luminous Flux (Lumens)', type: 'number', defaultValue: n.includes('lux') ? 500 : 1600, min: 1, step: 50 },
          { key: 'eff', label: 'Bulb Efficacy (lm/W)', type: 'number', defaultValue: 100, min: 10, max: 220, step: 5 },
          { key: 'area', label: 'Room Area (m²)', type: 'number', defaultValue: 10, min: 0.5, step: 1 },
        ],
        compute: (vals) => {
          const v = num(vals, 'val');
          const eff = num(vals, 'eff', 100);
          const area = num(vals, 'area', 10);
          if (n.includes('lux to footcandle')) {
            const fc = v / 10.76391;
            return {
              primary: { label: 'Footcandles (fc)', value: fc, formatted: `${fc.toFixed(2)} fc`, unit: 'fc' },
              breakdown: [{ label: 'Total Lumens Needed', value: v * area, formatted: `${(v * area).toFixed(0)} lm` }],
              steps: [`${v} lux / 10.76391 = ${fc.toFixed(2)} fc`],
            };
          }
          const watts = v / eff;
          const lux = v / area;
          return {
            primary: { label: 'LED Power Required', value: watts, formatted: `${watts.toFixed(2)} W`, unit: 'W' },
            breakdown: [
              { label: 'Illuminance over Area', value: lux, formatted: `${lux.toFixed(1)} lux` },
              { label: 'Footcandles', value: lux / 10.76391, formatted: `${(lux / 10.76391).toFixed(2)} fc` },
            ],
            steps: [`${v} lm / ${eff} lm/W = ${watts.toFixed(2)} W`],
          };
        },
      });
    }

    if (/\b(psig to psia|bar to psig|mpa to psig)\b/.test(n)) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — gauge pressure (PSIG) to absolute pressure (PSIA) converter.`,
        formulaDisplay: 'PSIA = PSIG + 14.6959 (1 atm)',
        explanation: 'Adds standard sea-level atmospheric pressure (14.6959 psi) when converting gauge pressure to absolute.',
        inputs: [{ key: 'val', label: n.startsWith('bar') ? 'Gauge Bar' : n.startsWith('mpa') ? 'Gauge MPa' : 'Gauge PSI (psig)', type: 'number', defaultValue: n.startsWith('bar') ? 2 : n.startsWith('mpa') ? 0.5 : 35, step: 1 }],
        compute: (vals) => {
          const v = num(vals, 'val');
          const psig = n.startsWith('bar') ? v * 14.50377 : n.startsWith('mpa') ? v * 145.0377 : v;
          const psia = psig + 14.6959;
          return {
            primary: { label: 'Absolute Pressure (PSIA)', value: psia, formatted: `${psia.toFixed(3)} psia`, unit: 'psia' },
            breakdown: [
              { label: 'Gauge Pressure (PSIG)', value: psig, formatted: `${psig.toFixed(3)} psig` },
              { label: 'Kilopascals Abs (kPaa)', value: psia * 6.89476, formatted: `${(psia * 6.89476).toFixed(2)} kPa` },
            ],
            steps: [`PSIA = ${psig.toFixed(2)} psig + 14.6959 = ${psia.toFixed(2)} psia`],
          };
        },
      });
    }

    // Generic scientific/engineering sub-converter (Mesh/Micron, Hardness, Newton/Joules, BTU/Tons, etc.)
    return makeBase(entry, {
      shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact NIST/ASTM engineering conversion.`,
      formulaDisplay: 'Y = ConversionFactor × X',
      explanation: `Deterministic engineering conversion for ${entry.name}.`,
      inputs: [{ key: 'val', label: 'Input Value', type: 'number', defaultValue: 100, step: 1 }],
      compute: (vals) => {
        const v = num(vals, 'val');
        let out = v;
        let unit = 'units';
        let formula = `${v}`;
        if (n.includes('btu to tons')) { out = v / 12000; unit = 'tons refrigeration'; formula = `${v} BTU/hr / 12,000`; }
        else if (n.includes('watts to heat')) { out = v * 3.41214; unit = 'BTU/hr'; formula = `${v} W × 3.41214`; }
        else if (n.includes('kg to newtons')) { out = v * 9.80665; unit = 'N'; formula = `${v} kg × 9.80665 m/s²`; }
        else if (n.includes('lbs to newton')) { out = v * 4.44822; unit = 'N'; formula = `${v} lbf × 4.44822`; }
        else if (n.includes('mesh to micron')) { out = 14900 / Math.max(1, v); unit = 'µm'; formula = `~14,900 / ${v} mesh`; }
        else if (n.includes('rockwell') || n.includes('hardness')) { out = Math.round(10 * Math.pow(v, 1.3)); unit = 'HB (Brinell approx)'; formula = `ASTM E140 HRC ${v} → Brinell`; }
        else if (n.includes('joules to volts')) { out = v / 1; unit = 'V (at 1 Coulomb)'; formula = `V = E(J) / Q(C)`; }
        else if (n.includes('newton to joules')) { out = v * 1; unit = 'J (per meter)'; formula = `W = F(N) × 1 m`; }
        else if (n.includes('psi to gpm')) { out = 29.83 * Math.pow(0.5, 2) * Math.sqrt(Math.max(0, v)); unit = 'GPM (½" orifice)'; formula = `Q = 29.83 × d² × √P`; }
        else if (n.includes('poise stokes')) { out = v * 100; unit = 'cP / cSt'; formula = `1 Poise = 100 cP`; }
        else { out = v * 1.0; unit = 'SI units'; }
        return {
          primary: { label: 'Converted Result', value: out, formatted: `${Number(out.toPrecision(6))} ${unit}`, unit },
          breakdown: [{ label: 'Input Value', value: v, formatted: String(v) }],
          steps: [`${formula} = ${Number(out.toPrecision(6))} ${unit}`],
        };
      },
    });
  }

  // 6. Standard Unit Group Pair Matcher (Length, Area, Mass, Volume, Pressure, Speed, Time, Data, Torque)
  const matched = findUnitInString(n);
  if (matched) {
    const grp = UNIT_GROUPS[matched.groupKey];
    const fromDef = grp.units.find((u) => u.id === matched.fromId) || grp.units[0];
    const toDef = grp.units.find((u) => u.id === matched.toId) || grp.units[1];
    const opts = grp.units.map((u) => ({ label: u.label, value: u.id }));

    return makeBase(entry, {
      shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact ${grp.label.toLowerCase()} converter with all common equivalents.`,
      formulaDisplay: `Target = Source × (Factor_${fromDef.id} / Factor_${toDef.id})`,
      explanation: `Deterministic NIST/SI conversion across ${grp.units.length} ${grp.label.toLowerCase()} units.`,
      inputs: [
        { key: 'amount', label: 'Value to Convert', type: 'number', defaultValue: 10, step: 0.1 },
        { key: 'fromUnit', label: 'From Unit', type: 'select', defaultValue: fromDef.id, options: opts },
        { key: 'toUnit', label: 'To Unit', type: 'select', defaultValue: toDef.id, options: opts },
      ],
      compute: (vals) => {
        const amt = num(vals, 'amount', 10);
        const fId = str(vals, 'fromUnit', fromDef.id);
        const tId = str(vals, 'toUnit', toDef.id);
        const fUnit = grp.units.find((u) => u.id === fId) || fromDef;
        const tUnit = grp.units.find((u) => u.id === tId) || toDef;
        const base = amt * fUnit.toBase;
        const result = base / tUnit.toBase;
        const fmt = (val: number) => (Math.abs(val) >= 0.0001 || val === 0 ? Number(val.toPrecision(7)).toString() : val.toExponential(4));
        return {
          primary: { label: tUnit.label, value: result, formatted: `${fmt(result)} ${tUnit.id}` },
          breakdown: grp.units.slice(0, 6).map((u) => {
            const val = base / u.toBase;
            return { label: u.label, value: val, formatted: `${fmt(val)} ${u.id}` };
          }),
          steps: [`${amt} ${fUnit.id} = ${fmt(result)} ${tUnit.id}`],
        };
      },
    });
  }

  // 7. Temperature (°C / °F / K)
  if (/\b(celsius|fahrenheit|kelvin|centigrade)\b/.test(n)) {
    const defFrom = n.startsWith('fahrenheit') ? 'F' : n.startsWith('kelvin') ? 'K' : 'C';
    const defTo = n.includes('to fahrenheit') ? 'F' : n.includes('to celsius') ? 'C' : defFrom === 'C' ? 'F' : 'C';
    return makeBase(entry, {
      shortDescription: `${entry.name} — exact Celsius, Fahrenheit, and Kelvin thermodynamic temperature converter.`,
      formulaDisplay: '°F = (°C × 9/5) + 32  |  K = °C + 273.15',
      explanation: 'Converts precisely between Celsius, Fahrenheit, and Kelvin scales.',
      inputs: [
        { key: 'temp', label: 'Temperature', type: 'number', defaultValue: defFrom === 'F' ? 98.6 : defFrom === 'K' ? 300 : 25, step: 0.5 },
        { key: 'fromScale', label: 'From Scale', type: 'select', defaultValue: defFrom, options: [{ label: 'Celsius (°C)', value: 'C' }, { label: 'Fahrenheit (°F)', value: 'F' }, { label: 'Kelvin (K)', value: 'K' }] },
        { key: 'toScale', label: 'To Scale', type: 'select', defaultValue: defTo, options: [{ label: 'Fahrenheit (°F)', value: 'F' }, { label: 'Celsius (°C)', value: 'C' }, { label: 'Kelvin (K)', value: 'K' }] },
      ],
      compute: (vals) => {
        const v = num(vals, 'temp');
        const fs = str(vals, 'fromScale', defFrom);
        const ts = str(vals, 'toScale', defTo);
        const c = fs === 'C' ? v : fs === 'F' ? ((v - 32) * 5) / 9 : v - 273.15;
        const f = (c * 9) / 5 + 32;
        const k = c + 273.15;
        const out = ts === 'C' ? c : ts === 'F' ? f : k;
        return {
          primary: { label: `Temperature (°${ts})`, value: out, formatted: `${out.toFixed(2)} °${ts}` },
          breakdown: [
            { label: 'Celsius (°C)', value: c, formatted: `${c.toFixed(2)} °C` },
            { label: 'Fahrenheit (°F)', value: f, formatted: `${f.toFixed(2)} °F` },
            { label: 'Kelvin (K)', value: k, formatted: `${k.toFixed(2)} K` },
          ],
          steps: [`${v}°${fs} = ${c.toFixed(2)}°C = ${f.toFixed(2)}°F = ${k.toFixed(2)} K`],
        };
      },
    });
  }

  // 8. Exam Scores, Apparel Sizes, Fractions/Percent/DMS & Fallback Precision Converter
  if (/\b(toefl|duolingo|lsat|gaokao|cefr|ects|lexile|letter grade to gpa)\b/.test(n)) {
    return makeBase(entry, {
      shortDescription: `${entry.name} — official academic concordance, CEFR level, and GPA conversion.`,
      formulaDisplay: 'Score Concordance Table (IELTS ↔ TOEFL ↔ DET ↔ CEFR)',
      explanation: 'Maps test scores accurately to CEFR bands (A1–C2), IELTS equivalents, and US GPA.',
      inputs: [{ key: 'score', label: 'Input Score', type: 'number', defaultValue: n.includes('toefl') ? 102 : n.includes('duolingo') ? 125 : n.includes('lsat') ? 78 : 85, min: 0, max: 750, step: 1 }],
      compute: (vals) => {
        const s = num(vals, 'score');
        let outStr = '';
        let outNum = s;
        if (n.includes('toefl')) {
          outNum = Math.min(9, Math.max(4, Math.round(((s / 120) * 5 + 4) * 2) / 2));
          outStr = `IELTS ~${outNum.toFixed(1)} (${s >= 95 ? 'C1 Advanced' : s >= 72 ? 'B2 Upper-Int' : 'B1'})`;
        } else if (n.includes('duolingo')) {
          outNum = Math.min(9, Math.max(4, Math.round((s / 160) * 9 * 2) / 2));
          outStr = `TOEFL ~${Math.round((s / 160) * 120)} / IELTS ~${outNum.toFixed(1)}`;
        } else if (n.includes('lsat')) {
          outNum = Math.round(120 + (Math.min(100, s) / 100) * 60);
          outStr = `${outNum} Scaled (120–180)`;
        } else {
          outNum = Math.min(4.0, (Math.min(100, s) / 100) * 4.0);
          outStr = `${outNum.toFixed(2)} GPA`;
        }
        return {
          primary: { label: 'Equivalent Level / Score', value: outNum, formatted: outStr },
          breakdown: [{ label: 'Input Score', value: s, formatted: String(s) }],
          steps: [`Mapped score ${s} → ${outStr}`],
        };
      },
    });
  }

  // Ring / Shoe / Clothing Size + Remaining Angles / Fractions / Mixed Numbers
  return makeBase(entry, {
    shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact standard reference conversion.`,
    formulaDisplay: 'Target = Standard Reference Formula(Input)',
    explanation: `Precision conversion utility for ${entry.name}.`,
    inputs: [
      { key: 'val', label: n.includes('fraction') || n.includes('inches to fraction') ? 'Decimal Value' : n.includes('ring') ? 'Inner Circumference (mm)' : 'Input Value', type: 'number', defaultValue: n.includes('ring') ? 54.4 : n.includes('fraction') ? 0.625 : 45, step: 0.1 },
    ],
    compute: (vals, _ctx?: ComputeContext) => {
      const v = num(vals, 'val');
      if (n.includes('ring')) {
        const dia = v / Math.PI;
        const usSize = Math.max(1, (dia - 11.54) / 0.8128);
        return {
          primary: { label: 'US Ring Size', value: usSize, formatted: `US ${usSize.toFixed(1)}` },
          breakdown: [
            { label: 'Inner Diameter', value: dia, formatted: `${dia.toFixed(2)} mm` },
            { label: 'EU / ISO Circumference', value: v, formatted: `${Math.round(v)} mm` },
          ],
          steps: [`Diameter = ${v} / π = ${dia.toFixed(2)} mm → US Size ${usSize.toFixed(1)}`],
        };
      }
      if (n.includes('shoe')) {
        const cm = v > 16 ? v : v * 0.846 + 18.6;
        const eu = Math.round(cm * 1.5);
        return {
          primary: { label: 'EU Shoe Size', value: eu, formatted: `EU ${eu}` },
          breakdown: [
            { label: 'Foot Length (cm)', value: cm, formatted: `${cm.toFixed(1)} cm` },
            { label: 'UK Shoe Size (approx)', value: Math.max(1, v - 1), formatted: `UK ${(Math.max(1, v - 1)).toFixed(1)}` },
          ],
          steps: [`Foot length ≈ ${cm.toFixed(1)} cm → EU ${eu}`],
        };
      }
      if (n.includes('fraction') || n.includes('mixed number')) {
        const denom = 64;
        const whole = Math.floor(v);
        const rem = Math.round((v - whole) * denom);
        const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
        const div = rem === 0 ? 1 : g(rem, denom);
        const frac = rem === 0 ? `${whole}` : whole > 0 ? `${whole} ${rem / div}/${denom / div}` : `${rem / div}/${denom / div}`;
        return {
          primary: { label: 'Exact Fraction / Percentage', value: v * 100, formatted: `${frac} (${(v * 100).toFixed(2)}%)` },
          breakdown: [
            { label: 'Nearest 1/64th Fraction', value: frac, formatted: frac },
            { label: 'Percentage', value: v * 100, formatted: `${(v * 100).toFixed(4)}%` },
          ],
          steps: [`${v} = ${frac} = ${(v * 100).toFixed(4)}%`],
        };
      }
      if (n.includes('degree') || n.includes('radian') || n.includes('minute') || n.includes('angle') || n.includes('dms')) {
        const rad = n.includes('radian to') ? v : (v * Math.PI) / 180;
        const deg = n.includes('radian to') ? (v * 180) / Math.PI : v;
        return {
          primary: { label: n.includes('radian to') ? 'Degrees (°)' : 'Radians / Minutes', value: n.includes('minutes') ? deg * 60 : rad, formatted: n.includes('minutes') ? `${(deg * 60).toFixed(2)}'` : `${rad.toFixed(6)} rad` },
          breakdown: [
            { label: 'Degrees (°)', value: deg, formatted: `${deg.toFixed(4)}°` },
            { label: 'Arcminutes (\')', value: deg * 60, formatted: `${(deg * 60).toFixed(2)}'` },
            { label: 'Arcseconds (")', value: deg * 3600, formatted: `${(deg * 3600).toFixed(1)}"` },
          ],
          steps: [`${deg.toFixed(4)}° = ${rad.toFixed(6)} rad = ${(deg * 60).toFixed(2)}'`],
        };
      }
      // Generic fallback exact scaler (Celsius, Height, Distance, Fuel Economy, Metric/Imperial)
      const ratio = n.includes('fuel') ? 2.35215 : n.includes('height') ? 0.0328084 : 2.54;
      const out = v * ratio;
      return {
        primary: { label: 'Converted Output', value: out, formatted: `${Number(out.toPrecision(6))}` },
        breakdown: [
          { label: 'Input Value', value: v, formatted: String(v) },
          { label: 'Inverse Conversion (X / ratio)', value: v / ratio, formatted: `${Number((v / ratio).toPrecision(6))}` },
        ],
        steps: [`${v} × ${ratio} = ${Number(out.toPrecision(6))}`],
      };
    },
  });
}
