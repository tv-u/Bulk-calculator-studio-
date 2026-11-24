export type UnitCategoryId =
  | 'length'
  | 'weight'
  | 'area'
  | 'volume'
  | 'temperature'
  | 'speed'
  | 'time'
  | 'pressure'
  | 'energy'
  | 'power'
  | 'data'
  | 'force'
  | 'density';

export interface UnitDefinition {
  id: string;
  label: string;
  symbol: string;
  // Factor relative to category base unit (not used for temperature)
  factorToBase: number;
}

export interface UnitCategory {
  id: UnitCategoryId;
  name: string;
  baseUnit: string;
  units: UnitDefinition[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: 'Length',
    baseUnit: 'm',
    units: [
      { id: 'mm', label: 'Millimeter', symbol: 'mm', factorToBase: 0.001 },
      { id: 'cm', label: 'Centimeter', symbol: 'cm', factorToBase: 0.01 },
      { id: 'm', label: 'Meter', symbol: 'm', factorToBase: 1 },
      { id: 'km', label: 'Kilometer', symbol: 'km', factorToBase: 1000 },
      { id: 'in', label: 'Inch', symbol: 'in', factorToBase: 0.0254 },
      { id: 'ft', label: 'Foot', symbol: 'ft', factorToBase: 0.3048 },
      { id: 'yd', label: 'Yard', symbol: 'yd', factorToBase: 0.9144 },
      { id: 'mi', label: 'Mile', symbol: 'mi', factorToBase: 1609.344 },
      { id: 'nmi', label: 'Nautical Mile', symbol: 'nmi', factorToBase: 1852 },
    ],
  },
  {
    id: 'weight',
    name: 'Weight / Mass',
    baseUnit: 'kg',
    units: [
      { id: 'mg', label: 'Milligram', symbol: 'mg', factorToBase: 1e-6 },
      { id: 'g', label: 'Gram', symbol: 'g', factorToBase: 0.001 },
      { id: 'kg', label: 'Kilogram', symbol: 'kg', factorToBase: 1 },
      { id: 't', label: 'Metric Tonne', symbol: 't', factorToBase: 1000 },
      { id: 'oz', label: 'Ounce', symbol: 'oz', factorToBase: 0.028349523125 },
      { id: 'lb', label: 'Pound', symbol: 'lb', factorToBase: 0.45359237 },
      { id: 'quintal', label: 'Quintal (India)', symbol: 'q', factorToBase: 100 },
    ],
  },
  {
    id: 'area',
    name: 'Area & Land',
    baseUnit: 'm2',
    units: [
      { id: 'sqft', label: 'Square Foot', symbol: 'sq ft', factorToBase: 0.09290304 },
      { id: 'sqm', label: 'Square Meter', symbol: 'sq m', factorToBase: 1 },
      { id: 'sqyd', label: 'Square Yard (Gaj)', symbol: 'sq yd', factorToBase: 0.83612736 },
      { id: 'acre', label: 'Acre', symbol: 'acre', factorToBase: 4046.8564224 },
      { id: 'hectare', label: 'Hectare', symbol: 'ha', factorToBase: 10000 },
      { id: 'sqkm', label: 'Square Kilometer', symbol: 'sq km', factorToBase: 1e6 },
      { id: 'guntha', label: 'Guntha', symbol: 'guntha', factorToBase: 101.17 },
      { id: 'bigha_std', label: 'Bigha (Standard 2500 sq m)', symbol: 'bigha', factorToBase: 2500 },
    ],
  },
  {
    id: 'volume',
    name: 'Volume',
    baseUnit: 'L',
    units: [
      { id: 'ml', label: 'Milliliter', symbol: 'mL', factorToBase: 0.001 },
      { id: 'L', label: 'Liter', symbol: 'L', factorToBase: 1 },
      { id: 'm3', label: 'Cubic Meter', symbol: 'm³', factorToBase: 1000 },
      { id: 'ft3', label: 'Cubic Foot', symbol: 'ft³', factorToBase: 28.3168466 },
      { id: 'gal_us', label: 'US Gallon', symbol: 'gal', factorToBase: 3.785411784 },
      { id: 'gal_uk', label: 'Imperial Gallon', symbol: 'imp gal', factorToBase: 4.54609 },
    ],
  },
  {
    id: 'temperature',
    name: 'Temperature',
    baseUnit: 'C',
    units: [
      { id: 'C', label: 'Celsius', symbol: '°C', factorToBase: 1 },
      { id: 'F', label: 'Fahrenheit', symbol: '°F', factorToBase: 1 },
      { id: 'K', label: 'Kelvin', symbol: 'K', factorToBase: 1 },
    ],
  },
  {
    id: 'speed',
    name: 'Speed',
    baseUnit: 'mps',
    units: [
      { id: 'mps', label: 'Meters / second', symbol: 'm/s', factorToBase: 1 },
      { id: 'kph', label: 'Kilometers / hour', symbol: 'km/h', factorToBase: 1 / 3.6 },
      { id: 'mph', label: 'Miles / hour', symbol: 'mph', factorToBase: 0.44704 },
      { id: 'knot', label: 'Knot', symbol: 'kn', factorToBase: 0.514444 },
    ],
  },
  {
    id: 'time',
    name: 'Time',
    baseUnit: 's',
    units: [
      { id: 'ms', label: 'Millisecond', symbol: 'ms', factorToBase: 0.001 },
      { id: 's', label: 'Second', symbol: 's', factorToBase: 1 },
      { id: 'min', label: 'Minute', symbol: 'min', factorToBase: 60 },
      { id: 'hr', label: 'Hour', symbol: 'hr', factorToBase: 3600 },
      { id: 'day', label: 'Day', symbol: 'd', factorToBase: 86400 },
      { id: 'wk', label: 'Week', symbol: 'wk', factorToBase: 604800 },
      { id: 'yr', label: 'Year (365d)', symbol: 'yr', factorToBase: 31536000 },
    ],
  },
  {
    id: 'pressure',
    name: 'Pressure',
    baseUnit: 'Pa',
    units: [
      { id: 'Pa', label: 'Pascal', symbol: 'Pa', factorToBase: 1 },
      { id: 'kPa', label: 'Kilopascal', symbol: 'kPa', factorToBase: 1000 },
      { id: 'bar', label: 'Bar', symbol: 'bar', factorToBase: 100000 },
      { id: 'atm', label: 'Atmosphere', symbol: 'atm', factorToBase: 101325 },
      { id: 'psi', label: 'PSI', symbol: 'psi', factorToBase: 6894.75729 },
    ],
  },
  {
    id: 'energy',
    name: 'Energy',
    baseUnit: 'J',
    units: [
      { id: 'J', label: 'Joule', symbol: 'J', factorToBase: 1 },
      { id: 'kJ', label: 'Kilojoule', symbol: 'kJ', factorToBase: 1000 },
      { id: 'cal', label: 'Calorie (th)', symbol: 'cal', factorToBase: 4.184 },
      { id: 'kcal', label: 'Kilocalorie', symbol: 'kcal', factorToBase: 4184 },
      { id: 'Wh', label: 'Watt-hour', symbol: 'Wh', factorToBase: 3600 },
      { id: 'kWh', label: 'Kilowatt-hour', symbol: 'kWh', factorToBase: 3.6e6 },
    ],
  },
  {
    id: 'power',
    name: 'Power',
    baseUnit: 'W',
    units: [
      { id: 'W', label: 'Watt', symbol: 'W', factorToBase: 1 },
      { id: 'kW', label: 'Kilowatt', symbol: 'kW', factorToBase: 1000 },
      { id: 'MW', label: 'Megawatt', symbol: 'MW', factorToBase: 1e6 },
      { id: 'hp', label: 'Mechanical Horsepower', symbol: 'hp', factorToBase: 745.699872 },
    ],
  },
  {
    id: 'data',
    name: 'Digital Data Storage',
    baseUnit: 'B',
    units: [
      { id: 'bit', label: 'Bit', symbol: 'b', factorToBase: 0.125 },
      { id: 'B', label: 'Byte', symbol: 'B', factorToBase: 1 },
      { id: 'KB', label: 'Kilobyte (1000 B)', symbol: 'KB', factorToBase: 1000 },
      { id: 'KiB', label: 'Kibibyte (1024 B)', symbol: 'KiB', factorToBase: 1024 },
      { id: 'MB', label: 'Megabyte (10⁶ B)', symbol: 'MB', factorToBase: 1e6 },
      { id: 'MiB', label: 'Mebibyte (1024² B)', symbol: 'MiB', factorToBase: 1048576 },
      { id: 'GB', label: 'Gigabyte (10⁹ B)', symbol: 'GB', factorToBase: 1e9 },
      { id: 'GiB', label: 'Gibibyte (1024³ B)', symbol: 'GiB', factorToBase: 1073741824 },
      { id: 'TB', label: 'Terabyte (10¹² B)', symbol: 'TB', factorToBase: 1e12 },
    ],
  },
  {
    id: 'force',
    name: 'Force',
    baseUnit: 'N',
    units: [
      { id: 'N', label: 'Newton', symbol: 'N', factorToBase: 1 },
      { id: 'kN', label: 'Kilonewton', symbol: 'kN', factorToBase: 1000 },
      { id: 'lbf', label: 'Pound-force', symbol: 'lbf', factorToBase: 4.448221615 },
      { id: 'kgf', label: 'Kilogram-force', symbol: 'kgf', factorToBase: 9.80665 },
    ],
  },
  {
    id: 'density',
    name: 'Density',
    baseUnit: 'kgm3',
    units: [
      { id: 'kgm3', label: 'kg/m³', symbol: 'kg/m³', factorToBase: 1 },
      { id: 'gcm3', label: 'g/cm³', symbol: 'g/cm³', factorToBase: 1000 },
      { id: 'lbft3', label: 'lb/ft³', symbol: 'lb/ft³', factorToBase: 16.018463 },
    ],
  },
];

export function convertUnit(
  value: number,
  categoryId: UnitCategoryId,
  fromUnitId: string,
  toUnitId: string
): number {
  if (!Number.isFinite(value)) throw new Error('Input value must be a finite number.');
  const cat = UNIT_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) throw new Error(`Unknown unit category: ${categoryId}`);

  if (categoryId === 'temperature') {
    let celsius = value;
    if (fromUnitId === 'F') celsius = ((value - 32) * 5) / 9;
    else if (fromUnitId === 'K') celsius = value - 273.15;
    else if (fromUnitId !== 'C') throw new Error(`Unknown temperature unit: ${fromUnitId}`);

    if (toUnitId === 'C') return celsius;
    if (toUnitId === 'F') return (celsius * 9) / 5 + 32;
    if (toUnitId === 'K') return celsius + 273.15;
    throw new Error(`Unknown temperature unit: ${toUnitId}`);
  }

  const from = cat.units.find((u) => u.id === fromUnitId);
  const to = cat.units.find((u) => u.id === toUnitId);
  if (!from || !to) throw new Error('Invalid unit selection.');

  const baseValue = value * from.factorToBase;
  return baseValue / to.factorToBase;
}
