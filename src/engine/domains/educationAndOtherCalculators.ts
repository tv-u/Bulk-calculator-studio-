import type { CalculatorDefinition } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import { formatCurrency } from '../formatters';

export const EDUCATION_AND_OTHER_CALCULATORS: CalculatorDefinition[] = [
  // EDUCATION (6)
  {
    id: 'gpa',
    name: 'Semester GPA Calculator',
    shortDescription: 'Calculate weighted Grade Point Average across course grades and credit hours.',
    category: 'education',
    categoryLabel: 'Education',
    keywords: ['gpa', 'grade point', 'college', 'credits', 'semester'],
    synonyms: ['sgpa calculator', 'college gpa'],
    formulaDisplay: 'GPA = Σ(Grade Point × Credits) / Σ(Credits)',
    explanation: 'Enter comma-separated grade points and credit weights to compute exact weighted GPA.',
    inputs: [
      { key: 'grades', label: 'Grade Points (comma-separated, e.g. 9, 8, 10, 8.5)', type: 'text', defaultValue: '9, 8, 10, 8.5, 9' },
      { key: 'credits', label: 'Credits per Course (comma-separated)', type: 'text', defaultValue: '4, 3, 4, 3, 2' },
    ],
    relatedIds: ['cgpa', 'marks-percentage', 'grade'],
    compute: (values) => {
      const gList = str(values, 'grades').split(/[\s,;]+/).filter(Boolean).map(Number);
      const cList = str(values, 'credits').split(/[\s,;]+/).filter(Boolean).map(Number);
      if (gList.length === 0 || gList.length !== cList.length || gList.some(isNaN) || cList.some((c) => isNaN(c) || c <= 0)) {
        throw new Error('Grades and positive credits lists must have matching lengths.');
      }
      const totalCredits = cList.reduce((s, c) => s + c, 0);
      const weighted = gList.reduce((s, g, i) => s + g * cList[i], 0);
      const gpa = weighted / totalCredits;
      return {
        primary: { label: 'Weighted GPA', value: gpa, formatted: gpa.toFixed(3) },
        breakdown: [
          { label: 'Total Credits', value: totalCredits, formatted: String(totalCredits) },
          { label: 'Total Quality Points', value: weighted, formatted: weighted.toFixed(2) },
        ],
        steps: [`${weighted.toFixed(2)} / ${totalCredits} = ${gpa.toFixed(3)}`],
      };
    },
  },
  {
    id: 'cgpa',
    name: 'CGPA to Percentage Converter',
    shortDescription: 'Convert 10-point CGPA to Percentage using CBSE (9.5×), VTU/UGC, or custom multipliers.',
    category: 'education',
    categoryLabel: 'Education',
    keywords: ['cgpa', 'percentage', 'cbse', 'ugc', 'university', 'marks'],
    synonyms: ['cgpa to percentage', 'sgpa to percentage'],
    formulaDisplay: 'Percentage = CGPA × Scale Multiplier (e.g., 9.5 for CBSE)',
    explanation: 'Supports Indian university and board conversion scales.',
    inputs: [
      { key: 'cgpa', label: 'CGPA Score', type: 'number', defaultValue: 8.6, min: 0, max: 10, step: 0.05 },
      { key: 'multiplier', label: 'Conversion Multiplier', type: 'number', defaultValue: 9.5, min: 1, max: 25, step: 0.1 },
    ],
    relatedIds: ['gpa', 'marks-percentage', 'grade'],
    compute: (values) => {
      const cgpa = num(values, 'cgpa');
      const mult = num(values, 'multiplier', 9.5);
      const pct = Math.min(100, cgpa * mult);
      return {
        primary: { label: 'Equivalent Percentage', value: pct, formatted: `${pct.toFixed(2)}%` },
        breakdown: [
          { label: 'CGPA Entered', value: cgpa, formatted: `${cgpa.toFixed(2)} / 10` },
          { label: '4.0 Scale Approx.', value: (cgpa / 10) * 4, formatted: `${((cgpa / 10) * 4).toFixed(2)} / 4.0` },
        ],
        steps: [`${cgpa} × ${mult} = ${pct.toFixed(2)}%`],
      };
    },
  },
  {
    id: 'marks-percentage',
    name: 'Exam Marks & Percentage Calculator',
    shortDescription: 'Calculate total marks obtained, percentage, and division classification.',
    category: 'education',
    categoryLabel: 'Education',
    keywords: ['marks', 'exam', 'percentage', 'score', 'result'],
    synonyms: ['exam percentage', 'marks percentage'],
    formulaDisplay: 'Percentage = (Marks Obtained / Maximum Marks) × 100',
    explanation: 'Determines exact score percentage and academic division.',
    inputs: [
      { key: 'obtained', label: 'Marks Obtained', type: 'number', defaultValue: 448, min: 0, step: 0.5 },
      { key: 'total', label: 'Maximum Total Marks', type: 'number', defaultValue: 500, min: 1, step: 1 },
    ],
    relatedIds: ['grade', 'cgpa', 'percentage'],
    compute: (values) => {
      const obt = num(values, 'obtained');
      const tot = num(values, 'total');
      if (tot <= 0) throw new Error('Total marks must be > 0.');
      const pct = (obt / tot) * 100;
      const division = pct >= 75 ? 'Distinction' : pct >= 60 ? 'First Division' : pct >= 45 ? 'Second Division' : pct >= 33 ? 'Pass' : 'Needs Improvement';
      return {
        primary: { label: 'Marks Percentage', value: pct, formatted: `${pct.toFixed(2)}% (${division})` },
        breakdown: [
          { label: 'Marks Lost', value: Math.max(0, tot - obt), formatted: `${Math.max(0, tot - obt)}` },
          { label: 'Equivalent 10-Point Grade', value: pct / 9.5, formatted: `${Math.min(10, pct / 9.5).toFixed(2)} / 10` },
        ],
        steps: [`(${obt} / ${tot}) × 100 = ${pct.toFixed(2)}%`],
      };
    },
  },
  {
    id: 'grade',
    name: 'Letter Grade & Required Final Score',
    shortDescription: 'Convert score to letter grade and compute required final exam marks to reach target.',
    category: 'education',
    categoryLabel: 'Education',
    keywords: ['grade', 'final exam', 'letter grade', 'target score'],
    synonyms: ['what do i need on the final', 'grade calculator'],
    formulaDisplay: 'Required Final = (Target - Current × (1 - W)) / W',
    explanation: 'Computes both current letter grade and exact score needed in final exam.',
    inputs: [
      { key: 'current', label: 'Current Course Score (%)', type: 'number', defaultValue: 82, min: 0, max: 100, step: 0.5 },
      { key: 'finalWeight', label: 'Final Exam Weight (%)', type: 'number', defaultValue: 30, min: 1, max: 99, step: 1 },
      { key: 'target', label: 'Target Overall Grade (%)', type: 'number', defaultValue: 88, min: 0, max: 100, step: 0.5 },
    ],
    relatedIds: ['marks-percentage', 'gpa', 'attendance'],
    compute: (values) => {
      const cur = num(values, 'current');
      const w = num(values, 'finalWeight') / 100;
      const target = num(values, 'target');
      const req = (target - cur * (1 - w)) / w;
      const letter = cur >= 90 ? 'A+' : cur >= 80 ? 'A' : cur >= 70 ? 'B' : cur >= 60 ? 'C' : cur >= 50 ? 'D' : 'F';
      return {
        primary: { label: 'Required Final Exam Score', value: req, formatted: `${req.toFixed(2)}%` },
        breakdown: [
          { label: 'Current Letter Grade', value: letter, formatted: letter },
          { label: 'Feasibility', value: req <= 100 ? 'Achievable' : 'Exceeds 100%', formatted: req <= 100 ? 'Achievable without extra credit' : 'Requires >100%' },
        ],
        steps: [`(${target} - ${cur}×${(1 - w).toFixed(2)}) / ${w.toFixed(2)} = ${req.toFixed(2)}%`],
      };
    },
  },
  {
    id: 'attendance',
    name: 'Attendance Percentage & Bunk Planner',
    shortDescription: 'Track current attendance %, classes needed to reach 75%, or safe classes you can miss.',
    category: 'education',
    categoryLabel: 'Education',
    keywords: ['attendance', 'bunk', '75 percent', 'college classes'],
    synonyms: ['attendance tracker', 'bunk calculator'],
    formulaDisplay: 'Attendance % = (Attended / Total) × 100',
    explanation: 'Calculates exact classes required to meet your target threshold or safe margin above target.',
    inputs: [
      { key: 'attended', label: 'Classes Attended', type: 'number', defaultValue: 42, min: 0, step: 1 },
      { key: 'total', label: 'Total Classes Held', type: 'number', defaultValue: 60, min: 1, step: 1 },
      { key: 'targetPct', label: 'Minimum Target (%)', type: 'number', defaultValue: 75, min: 1, max: 99, step: 1 },
    ],
    relatedIds: ['study-time', 'marks-percentage', 'gpa'],
    compute: (values) => {
      const a = Math.trunc(num(values, 'attended'));
      const t = Math.trunc(num(values, 'total'));
      const p = num(values, 'targetPct') / 100;
      if (t <= 0 || a > t) throw new Error('Attended classes must be ≤ total classes held.');
      const curPct = (a / t) * 100;
      let actionLabel = 'Status';
      let actionValue = 'On Target';
      if (a / t < p) {
        const needed = Math.ceil((p * t - a) / (1 - p));
        actionLabel = 'Must Attend Next';
        actionValue = `${needed} consecutive classes`;
      } else {
        const canMiss = Math.floor((a - p * t) / p);
        actionLabel = 'Safe Buffer to Miss';
        actionValue = `${canMiss} classes`;
      }
      return {
        primary: { label: 'Current Attendance', value: curPct, formatted: `${curPct.toFixed(2)}%` },
        breakdown: [{ label: actionLabel, value: actionValue, formatted: actionValue }],
        steps: [`(${a} / ${t}) × 100 = ${curPct.toFixed(2)}% against ${p * 100}% target`],
      };
    },
  },
  {
    id: 'study-time',
    name: 'Study Time & Pomodoro Session Planner',
    shortDescription: 'Plan total study blocks, Pomodoro intervals, and days needed to cover chapters.',
    category: 'education',
    categoryLabel: 'Education',
    keywords: ['study', 'pomodoro', 'schedule', 'revision', 'exam prep'],
    synonyms: ['study planner', 'pomodoro calculator'],
    formulaDisplay: 'Sessions = Total Minutes / Focus Block  |  Days = Total Hours / Daily Hours',
    explanation: 'Breaks syllabus workload into structured focus blocks with scheduled breaks.',
    inputs: [
      { key: 'chapters', label: 'Chapters / Topics Remaining', type: 'number', defaultValue: 14, min: 1, step: 1 },
      { key: 'hoursPerChapter', label: 'Hours per Chapter', type: 'number', defaultValue: 2.5, min: 0.25, step: 0.25 },
      { key: 'dailyHours', label: 'Daily Study Hours Available', type: 'number', defaultValue: 4, min: 0.5, step: 0.5 },
    ],
    relatedIds: ['attendance', 'grade', 'date-difference'],
    compute: (values) => {
      const ch = num(values, 'chapters');
      const hpc = num(values, 'hoursPerChapter');
      const daily = num(values, 'dailyHours');
      const totalHours = ch * hpc;
      const daysNeeded = Math.ceil(totalHours / daily);
      const pomodoros = Math.ceil((totalHours * 60) / 25);
      return {
        primary: { label: 'Estimated Days Needed', value: daysNeeded, formatted: `${daysNeeded} days` },
        breakdown: [
          { label: 'Total Study Hours', value: totalHours, formatted: `${totalHours.toFixed(1)} hrs` },
          { label: '25-min Pomodoro Blocks', value: pomodoros, formatted: `${pomodoros} sessions` },
        ],
        steps: [`Total = ${ch} × ${hpc} = ${totalHours} hrs / ${daily} hrs/day = ${daysNeeded} days`],
      };
    },
  },

  // DATE & EVERYDAY & CONSTRUCTION & TECH (14)
  {
    id: 'date-difference',
    name: 'Date Difference & Business Days Calculator',
    shortDescription: 'Calculate exact days, weeks, months, and weekday business days between two dates.',
    category: 'date-time',
    categoryLabel: 'Date & Time',
    keywords: ['date', 'days between', 'business days', 'duration', 'calendar'],
    synonyms: ['day counter', 'working days calculator'],
    formulaDisplay: 'ΔDays = (End Date - Start Date) / 86,400,000 ms',
    explanation: 'Counts total calendar days, weeks, and Mon–Fri weekdays.',
    inputs: [
      { key: 'startDate', label: 'Start Date', type: 'date', defaultValue: '2026-01-01' },
      { key: 'endDate', label: 'End Date', type: 'date', defaultValue: '2026-11-24' },
    ],
    relatedIds: ['age', 'study-time'],
    compute: (values) => {
      const d1 = new Date(str(values, 'startDate'));
      const d2 = new Date(str(values, 'endDate'));
      if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) throw new Error('Invalid dates.');
      const diffMs = Math.abs(d2.getTime() - d1.getTime());
      const days = Math.round(diffMs / 86400000);
      let weekdays = 0;
      const cur = new Date(Math.min(d1.getTime(), d2.getTime()));
      const end = new Date(Math.max(d1.getTime(), d2.getTime()));
      while (cur < end) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) weekdays++;
        cur.setDate(cur.getDate() + 1);
      }
      return {
        primary: { label: 'Calendar Days Difference', value: days, formatted: `${days.toLocaleString('en-US')} days` },
        breakdown: [
          { label: 'Weeks + Remainder', value: `${Math.floor(days / 7)}w ${days % 7}d`, formatted: `${Math.floor(days / 7)} weeks, ${days % 7} days` },
          { label: 'Mon–Fri Business Days', value: weekdays, formatted: `${weekdays} weekdays` },
        ],
        steps: [`Exact span: ${days} calendar days (${weekdays} Mon–Fri days)`],
      };
    },
  },
  {
    id: 'fuel-cost',
    name: 'Fuel Cost & Trip Mileage Estimator',
    shortDescription: 'Estimate trip fuel consumption, total cost, and cost per kilometer.',
    category: 'everyday',
    categoryLabel: 'Everyday Life',
    keywords: ['fuel', 'petrol', 'diesel', 'mileage', 'trip cost', 'car'],
    synonyms: ['gas cost calculator', 'trip fuel estimator'],
    formulaDisplay: 'Fuel = Distance / Mileage  |  Cost = Fuel × Price per Liter',
    explanation: 'Computes trip fuel expense from distance, vehicle mileage, and fuel price.',
    inputs: [
      { key: 'distance', label: 'Trip Distance (km)', type: 'number', defaultValue: 350, min: 0, step: 1 },
      { key: 'mileage', label: 'Vehicle Mileage (km/L)', type: 'number', defaultValue: 18, min: 0.1, step: 0.5 },
      { key: 'price', label: 'Fuel Price per Liter', type: 'number', defaultValue: 102, min: 0, step: 0.5 },
    ],
    relatedIds: ['electricity-bill', 'velocity', 'discount'],
    compute: (values, ctx) => {
      const d = num(values, 'distance');
      const m = num(values, 'mileage');
      const p = num(values, 'price');
      if (m <= 0) throw new Error('Mileage must be > 0.');
      const liters = d / m;
      const cost = liters * p;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'Total Fuel Cost', value: cost, formatted: formatCurrency(cost, cur, loc) },
        breakdown: [
          { label: 'Fuel Required', value: liters, formatted: `${liters.toFixed(2)} Liters` },
          { label: 'Cost per km', value: d > 0 ? cost / d : 0, formatted: formatCurrency(d > 0 ? cost / d : 0, cur, loc) },
        ],
        steps: [`${d} km / ${m} km/L = ${liters.toFixed(2)} L × ${p} = ${formatCurrency(cost, cur, loc)}`],
      };
    },
  },
  {
    id: 'electricity-bill',
    name: 'Electricity Bill & kWh Energy Estimator',
    shortDescription: 'Calculate appliance energy consumption (kWh / units) and monthly electricity bill.',
    category: 'everyday',
    categoryLabel: 'Everyday Life',
    keywords: ['electricity', 'bill', 'kwh', 'power', 'watts', 'tariff', 'units'],
    synonyms: ['power bill calculator', 'appliance kwh'],
    formulaDisplay: 'Monthly Units (kWh) = (Watts × Hours/Day × Days) / 1000',
    explanation: 'Estimates electricity units consumed and total tariff cost.',
    inputs: [
      { key: 'watts', label: 'Appliance Power Rating (Watts)', type: 'number', defaultValue: 1500, min: 1, step: 50 },
      { key: 'hoursPerDay', label: 'Usage (Hours / Day)', type: 'number', defaultValue: 6, min: 0, max: 24, step: 0.5 },
      { key: 'days', label: 'Billing Days', type: 'number', defaultValue: 30, min: 1, max: 365, step: 1 },
      { key: 'ratePerUnit', label: 'Tariff Rate per kWh', type: 'number', defaultValue: 7.5, min: 0, step: 0.1 },
    ],
    relatedIds: ['power', 'current', 'fuel-cost'],
    compute: (values, ctx) => {
      const w = num(values, 'watts');
      const h = num(values, 'hoursPerDay');
      const d = num(values, 'days');
      const rate = num(values, 'ratePerUnit');
      const kwh = (w * h * d) / 1000;
      const bill = kwh * rate;
      const cur = ctx?.currency ?? 'INR';
      const loc = ctx?.locale ?? 'en-IN';
      return {
        primary: { label: 'Estimated Electricity Cost', value: bill, formatted: formatCurrency(bill, cur, loc) },
        breakdown: [
          { label: 'Energy Consumed', value: kwh, formatted: `${kwh.toFixed(2)} kWh (Units)` },
          { label: 'Daily Cost', value: bill / d, formatted: formatCurrency(bill / d, cur, loc) },
        ],
        steps: [`(${w}W × ${h}h × ${d}d) / 1000 = ${kwh.toFixed(2)} kWh`],
      };
    },
  },
  {
    id: 'land-measurement',
    name: 'Land Measurement & Plot Area Converter',
    shortDescription: 'Convert Square Feet, Square Meters, Gaj, Acre, Hectare, Guntha, and Standard Bigha.',
    category: 'construction',
    categoryLabel: 'Construction & Property',
    keywords: ['land', 'plot', 'acre', 'hectare', 'sqft', 'bigha', 'guntha', 'gaj', 'property'],
    synonyms: ['plot area converter', 'bigha to sqft', 'acre to sqft'],
    formulaDisplay: 'All regional units normalized via exact Square Meters (m²)',
    explanation: 'Converts Indian and international land measurement units accurately.',
    assumptions: 'Standard Bigha modeled at 2,500 m² (varies regionally across Indian states).',
    inputs: [
      { key: 'value', label: 'Area Value', type: 'number', defaultValue: 1, min: 0, step: 0.1 },
      {
        key: 'unit',
        label: 'Input Unit',
        type: 'select',
        defaultValue: 'acre',
        options: [
          { label: 'Acre', value: 'acre' },
          { label: 'Square Feet (sq ft)', value: 'sqft' },
          { label: 'Square Meter (sq m)', value: 'sqm' },
          { label: 'Square Yard / Gaj', value: 'sqyd' },
          { label: 'Hectare', value: 'hectare' },
          { label: 'Guntha', value: 'guntha' },
          { label: 'Bigha (2500 m²)', value: 'bigha' },
        ],
      },
    ],
    relatedIds: ['area', 'concrete', 'bricks'],
    compute: (values) => {
      const val = num(values, 'value');
      const unit = str(values, 'unit', 'acre');
      const factors: Record<string, number> = {
        sqm: 1,
        sqft: 0.09290304,
        sqyd: 0.83612736,
        acre: 4046.8564224,
        hectare: 10000,
        guntha: 101.17,
        bigha: 2500,
      };
      const sqm = val * (factors[unit] ?? 1);
      return {
        primary: { label: 'Square Feet (sq ft)', value: sqm / factors.sqft, formatted: `${(sqm / factors.sqft).toLocaleString('en-IN', { maximumFractionDigits: 2 })} sq ft` },
        breakdown: [
          { label: 'Square Meters (m²)', value: sqm, formatted: `${sqm.toLocaleString('en-IN', { maximumFractionDigits: 2 })} m²` },
          { label: 'Square Yards / Gaj', value: sqm / factors.sqyd, formatted: `${(sqm / factors.sqyd).toFixed(2)} Gaj` },
          { label: 'Acres', value: sqm / factors.acre, formatted: `${(sqm / factors.acre).toFixed(4)} Acres` },
          { label: 'Hectares', value: sqm / factors.hectare, formatted: `${(sqm / factors.hectare).toFixed(4)} ha` },
          { label: 'Guntha / Bigha', value: sqm / factors.guntha, formatted: `${(sqm / factors.guntha).toFixed(2)} Guntha · ${(sqm / factors.bigha).toFixed(3)} Bigha` },
        ],
        steps: [`Normalized ${val} ${unit} = ${sqm.toFixed(2)} m²`],
      };
    },
  },
  {
    id: 'paint',
    name: 'Wall Paint Quantity Estimator',
    shortDescription: 'Calculate paint liters required based on wall dimensions, doors/windows deduction, and coats.',
    category: 'construction',
    categoryLabel: 'Construction & Property',
    keywords: ['paint', 'wall', 'liters', 'coats', 'interior', 'construction'],
    synonyms: ['paint coverage calculator', 'how much paint'],
    formulaDisplay: 'Paint (L) = ((Wall Area - Openings) × Coats) / Coverage (sq ft/L)',
    explanation: 'Subtracts standard door/window openings and accounts for multi-coat coverage.',
    inputs: [
      { key: 'areaSqFt', label: 'Total Wall Area (sq ft)', type: 'number', defaultValue: 1200, min: 1, step: 10 },
      { key: 'deduction', label: 'Doors & Windows Area (sq ft)', type: 'number', defaultValue: 140, min: 0, step: 5 },
      { key: 'coats', label: 'Number of Coats', type: 'number', defaultValue: 2, min: 1, max: 5, step: 1 },
      { key: 'coverage', label: 'Coverage per Liter (sq ft/L)', type: 'number', defaultValue: 110, min: 20, max: 300, step: 5 },
    ],
    relatedIds: ['area', 'bricks', 'concrete'],
    compute: (values) => {
      const netArea = Math.max(0, num(values, 'areaSqFt') - num(values, 'deduction'));
      const coats = num(values, 'coats');
      const cov = num(values, 'coverage');
      const liters = (netArea * coats) / cov;
      return {
        primary: { label: 'Paint Required', value: liters, formatted: `${liters.toFixed(2)} Liters` },
        breakdown: [
          { label: 'Net Paintable Area', value: netArea, formatted: `${netArea.toFixed(1)} sq ft` },
          { label: 'Total Coat Area', value: netArea * coats, formatted: `${(netArea * coats).toFixed(1)} sq ft` },
        ],
        steps: [`(${netArea} sq ft × ${coats} coats) / ${cov} sq ft/L = ${liters.toFixed(2)} L`],
      };
    },
  },
  {
    id: 'concrete',
    name: 'Concrete Mix & Cement Bag Calculator',
    shortDescription: 'Estimate wet/dry concrete volume, 50 kg cement bags, sand, and aggregate for M20/M15.',
    category: 'construction',
    categoryLabel: 'Construction & Property',
    keywords: ['concrete', 'cement', 'sand', 'aggregate', 'm20', 'slab', 'construction'],
    synonyms: ['cement bag calculator', 'concrete volume'],
    formulaDisplay: 'Dry Volume = 1.54 × Wet Volume  |  M20 (1 : 1.5 : 3)',
    explanation: 'Uses 1.54 dry volume bulking factor and standard 50 kg cement bag volume (0.0347 m³).',
    inputs: [
      { key: 'length', label: 'Length (meters)', type: 'number', defaultValue: 5, min: 0.1, step: 0.1 },
      { key: 'width', label: 'Width (meters)', type: 'number', defaultValue: 4, min: 0.1, step: 0.1 },
      { key: 'thickness', label: 'Thickness / Depth (meters)', type: 'number', defaultValue: 0.15, min: 0.01, step: 0.01 },
      {
        key: 'grade',
        label: 'Concrete Grade Ratio',
        type: 'select',
        defaultValue: 'm20',
        options: [
          { label: 'M15 (1 : 2 : 4)', value: 'm15' },
          { label: 'M20 (1 : 1.5 : 3)', value: 'm20' },
          { label: 'M25 (1 : 1 : 2)', value: 'm25' },
        ],
      },
    ],
    relatedIds: ['bricks', 'volume', 'paint'],
    compute: (values) => {
      const wetVol = num(values, 'length') * num(values, 'width') * num(values, 'thickness');
      const dryVol = wetVol * 1.54;
      const grade = str(values, 'grade', 'm20');
      const ratios: Record<string, [number, number, number]> = {
        m15: [1, 2, 4],
        m20: [1, 1.5, 3],
        m25: [1, 1, 2],
      };
      const [c, s, a] = ratios[grade] || ratios.m20;
      const sumPart = c + s + a;
      const cementVol = (c / sumPart) * dryVol;
      const cementBags = Math.ceil(cementVol / 0.0347);
      const sandVol = (s / sumPart) * dryVol;
      const aggVol = (a / sumPart) * dryVol;
      return {
        primary: { label: 'Cement Bags (50 kg)', value: cementBags, formatted: `${cementBags} Bags` },
        breakdown: [
          { label: 'Wet Concrete Volume', value: wetVol, formatted: `${wetVol.toFixed(3)} m³` },
          { label: 'Sand Volume', value: sandVol, formatted: `${sandVol.toFixed(3)} m³ (${(sandVol * 35.3147).toFixed(1)} cu ft)` },
          { label: 'Coarse Aggregate Volume', value: aggVol, formatted: `${aggVol.toFixed(3)} m³` },
        ],
        steps: [`Wet = ${wetVol.toFixed(3)} m³ → Dry (×1.54) = ${dryVol.toFixed(3)} m³`, `Ratio ${c}:${s}:${a} → ${cementBags} bags`],
      };
    },
  },
  {
    id: 'bricks',
    name: 'Brick Wall Masonry Estimator',
    shortDescription: 'Calculate total bricks and mortar volume required for a brick wall.',
    category: 'construction',
    categoryLabel: 'Construction & Property',
    keywords: ['bricks', 'masonry', 'wall', 'mortar', 'construction'],
    synonyms: ['brick calculator', 'wall bricks'],
    formulaDisplay: 'Bricks = Wall Volume / Modular Brick Volume with Mortar',
    explanation: 'Uses standard modular brick with mortar (20cm × 10cm × 10cm = 0.002 m³) plus 5% wastage option.',
    inputs: [
      { key: 'length', label: 'Wall Length (meters)', type: 'number', defaultValue: 6, min: 0.1, step: 0.1 },
      { key: 'height', label: 'Wall Height (meters)', type: 'number', defaultValue: 3, min: 0.1, step: 0.1 },
      { key: 'thickness', label: 'Wall Thickness (meters, e.g. 0.23)', type: 'number', defaultValue: 0.23, min: 0.05, step: 0.01 },
    ],
    relatedIds: ['concrete', 'paint', 'land-measurement'],
    compute: (values) => {
      const vol = num(values, 'length') * num(values, 'height') * num(values, 'thickness');
      const bricksExact = vol / 0.002;
      const withWastage = Math.ceil(bricksExact * 1.05);
      return {
        primary: { label: 'Estimated Bricks (incl. 5% wastage)', value: withWastage, formatted: `${withWastage.toLocaleString('en-US')} Bricks` },
        breakdown: [
          { label: 'Wall Volume', value: vol, formatted: `${vol.toFixed(3)} m³` },
          { label: 'Net Bricks (no wastage)', value: Math.ceil(bricksExact), formatted: `${Math.ceil(bricksExact).toLocaleString('en-US')}` },
        ],
        steps: [`Wall volume ${vol.toFixed(3)} m³ / 0.002 m³ per brick × 1.05 = ${withWastage}`],
      };
    },
  },
  {
    id: 'storage-converter',
    name: 'Digital Storage Converter',
    shortDescription: 'Convert between Bits, Bytes, KB, MB, GB, TB, KiB, MiB, and GiB.',
    category: 'technology',
    categoryLabel: 'Technology & Dev',
    keywords: ['storage', 'bytes', 'gb', 'mb', 'tb', 'kib', 'gib', 'data'],
    synonyms: ['mb to gb', 'data size converter'],
    formulaDisplay: 'Decimal (10³) vs Binary IEC (2¹⁰ = 1024)',
    explanation: 'Converts accurately between SI decimal storage and binary IEC memory units.',
    inputs: [
      { key: 'amount', label: 'Size Value', type: 'number', defaultValue: 512, min: 0, step: 1 },
      {
        key: 'unit',
        label: 'From Unit',
        type: 'select',
        defaultValue: 'GB',
        options: [
          { label: 'MB (10⁶ B)', value: 'MB' },
          { label: 'GB (10⁹ B)', value: 'GB' },
          { label: 'TB (10¹² B)', value: 'TB' },
          { label: 'MiB (1024² B)', value: 'MiB' },
          { label: 'GiB (1024³ B)', value: 'GiB' },
        ],
      },
    ],
    relatedIds: ['bandwidth', 'binary-converter', 'unit-converter'],
    compute: (values) => {
      const val = num(values, 'amount');
      const unit = str(values, 'unit', 'GB');
      const mult: Record<string, number> = {
        MB: 1e6,
        GB: 1e9,
        TB: 1e12,
        MiB: 1048576,
        GiB: 1073741824,
      };
      const bytes = val * (mult[unit] ?? 1e9);
      return {
        primary: { label: 'Gigabytes (GB, decimal)', value: bytes / 1e9, formatted: `${(bytes / 1e9).toFixed(4)} GB` },
        breakdown: [
          { label: 'Gibibytes (GiB, binary)', value: bytes / 1073741824, formatted: `${(bytes / 1073741824).toFixed(4)} GiB` },
          { label: 'Megabytes (MB)', value: bytes / 1e6, formatted: `${(bytes / 1e6).toLocaleString('en-US')} MB` },
          { label: 'Terabytes (TB)', value: bytes / 1e12, formatted: `${(bytes / 1e12).toFixed(6)} TB` },
        ],
        steps: [`${val} ${unit} = ${bytes.toLocaleString('en-US')} Bytes`],
      };
    },
  },
  {
    id: 'bandwidth',
    name: 'Network Bandwidth & Download Time Calculator',
    shortDescription: 'Calculate exact file transfer duration from file size (GB/MB) and link speed (Mbps/Gbps).',
    category: 'technology',
    categoryLabel: 'Technology & Dev',
    keywords: ['bandwidth', 'download time', 'mbps', 'gbps', 'transfer', 'internet speed'],
    synonyms: ['download time calculator', 'mbps to mb/s'],
    formulaDisplay: 'Time (s) = (File Size in Megabits) / Speed (Mbps)',
    explanation: 'Converts Bytes to bits (1 Byte = 8 bits) and computes real transfer duration.',
    inputs: [
      { key: 'fileGb', label: 'File Size (GB)', type: 'number', defaultValue: 25, min: 0.001, step: 0.5 },
      { key: 'speedMbps', label: 'Connection Speed (Mbps)', type: 'number', defaultValue: 100, min: 0.1, step: 5 },
      { key: 'efficiency', label: 'Protocol Efficiency (%)', type: 'number', defaultValue: 90, min: 10, max: 100, step: 1 },
    ],
    relatedIds: ['storage-converter', 'binary-converter', 'power'],
    compute: (values) => {
      const gb = num(values, 'fileGb');
      const mbps = num(values, 'speedMbps');
      const eff = num(values, 'efficiency', 90) / 100;
      const megabits = gb * 8000;
      const effectiveMbps = mbps * eff;
      const sec = megabits / effectiveMbps;
      const mins = Math.floor(sec / 60);
      const remSec = Math.round(sec % 60);
      return {
        primary: { label: 'Estimated Transfer Time', value: sec, formatted: `${mins}m ${remSec}s (${sec.toFixed(1)} s)` },
        breakdown: [
          { label: 'Effective Throughput', value: effectiveMbps / 8, formatted: `${(effectiveMbps / 8).toFixed(2)} MB/s` },
          { label: 'Total Megabits', value: megabits, formatted: `${megabits.toLocaleString('en-US')} Mb` },
        ],
        steps: [`${gb} GB = ${megabits} Mb`, `Effective speed = ${effectiveMbps.toFixed(1)} Mbps → ${sec.toFixed(1)} s`],
      };
    },
  },
  {
    id: 'binary-converter',
    name: 'Binary / Octal / Decimal / Hex Converter',
    shortDescription: 'Convert integers seamlessly between Binary (Base 2), Octal (Base 8), Decimal (Base 10), and Hex (Base 16).',
    category: 'technology',
    categoryLabel: 'Technology & Dev',
    keywords: ['binary', 'hex', 'hexadecimal', 'octal', 'decimal', 'radix', 'base'],
    synonyms: ['hex to decimal', 'binary to decimal', 'base converter'],
    formulaDisplay: 'Positional Radix Conversion: Σ dᵢ · baseⁱ',
    explanation: 'Supports arbitrary non-negative integer conversion across programming bases 2, 8, 10, and 16.',
    inputs: [
      { key: 'inputVal', label: 'Input Number', type: 'text', defaultValue: '255' },
      {
        key: 'fromBase',
        label: 'Input Base',
        type: 'select',
        defaultValue: '10',
        options: [
          { label: 'Decimal (Base 10)', value: '10' },
          { label: 'Binary (Base 2)', value: '2' },
          { label: 'Octal (Base 8)', value: '8' },
          { label: 'Hexadecimal (Base 16)', value: '16' },
        ],
      },
    ],
    relatedIds: ['storage-converter', 'bandwidth', 'scientific'],
    compute: (values) => {
      const raw = str(values, 'inputVal').replace(/^0[bxo]/i, '');
      const base = Number(str(values, 'fromBase', '10'));
      const validators: Record<number, RegExp> = {
        2: /^[01]+$/,
        8: /^[0-7]+$/,
        10: /^[0-9]+$/,
        16: /^[0-9a-fA-F]+$/,
      };
      if (!validators[base]?.test(raw)) {
        throw new Error(`Invalid Base-${base} value "${raw}".`);
      }
      const dec = parseInt(raw, base);
      if (!Number.isSafeInteger(dec)) throw new Error('Number exceeds safe integer precision.');
      return {
        primary: { label: 'Binary (Base 2)', value: dec.toString(2), formatted: dec.toString(2) },
        breakdown: [
          { label: 'Decimal (Base 10)', value: dec, formatted: String(dec) },
          { label: 'Hexadecimal (Base 16)', value: dec.toString(16).toUpperCase(), formatted: `0x${dec.toString(16).toUpperCase()}` },
          { label: 'Octal (Base 8)', value: dec.toString(8), formatted: `0o${dec.toString(8)}` },
        ],
        steps: [`Parsed "${raw}" in Base ${base} = ${dec}₁₀`],
      };
    },
  },
];
