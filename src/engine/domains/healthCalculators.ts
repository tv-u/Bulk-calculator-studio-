import type { CalculatorDefinition } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';

const HEALTH_DISCLAIMER =
  'Informational estimate only — not a medical diagnosis or clinical advice. Consult a qualified healthcare professional for personalized medical guidance.';

export const HEALTH_CALCULATORS: CalculatorDefinition[] = [
  {
    id: 'bmi',
    name: 'BMI (Body Mass Index) Calculator',
    shortDescription: 'Calculate Body Mass Index, WHO classification, and healthy weight range.',
    category: 'health',
    categoryLabel: 'Health & Fitness',
    keywords: ['bmi', 'body mass', 'weight', 'height', 'obesity', 'fitness'],
    synonyms: ['body mass index', 'bmi chart', 'healthy weight'],
    formulaDisplay: 'BMI = Weight (kg) / (Height (m))²',
    explanation: 'Computes standard Quetelet Body Mass Index and healthy reference range (18.5 – 24.9 kg/m²).',
    disclaimer: HEALTH_DISCLAIMER,
    inputs: [
      { key: 'weight', label: 'Weight (kg)', type: 'number', defaultValue: 68, min: 10, max: 400, step: 0.1, unit: 'kg' },
      { key: 'heightCm', label: 'Height (cm)', type: 'number', defaultValue: 172, min: 50, max: 270, step: 0.5, unit: 'cm' },
    ],
    relatedIds: ['bmr', 'tdee', 'ideal-weight', 'calorie'],
    compute: (values) => {
      const w = num(values, 'weight');
      const hCm = num(values, 'heightCm');
      if (w <= 0 || hCm <= 0) throw new Error('Weight and height must be positive.');
      const hM = hCm / 100;
      const bmi = w / (hM * hM);
      let category = 'Normal Weight';
      if (bmi < 18.5) category = 'Underweight';
      else if (bmi < 25) category = 'Normal Weight';
      else if (bmi < 30) category = 'Overweight';
      else category = 'Obesity Class';

      const minHealthy = 18.5 * hM * hM;
      const maxHealthy = 24.9 * hM * hM;
      return {
        primary: { label: 'Body Mass Index (BMI)', value: bmi, formatted: `${bmi.toFixed(2)} kg/m² (${category})` },
        breakdown: [
          { label: 'WHO Category', value: category, formatted: category },
          { label: 'Healthy Weight Range', value: `${minHealthy.toFixed(1)}-${maxHealthy.toFixed(1)}`, formatted: `${minHealthy.toFixed(1)} – ${maxHealthy.toFixed(1)} kg` },
          { label: 'BMI Prime (vs 25)', value: bmi / 25, formatted: (bmi / 25).toFixed(2) },
        ],
        steps: [`Height = ${hM.toFixed(2)} m`, `BMI = ${w} / (${hM.toFixed(2)})² = ${bmi.toFixed(2)}`],
      };
    },
  },
  {
    id: 'bmr',
    name: 'BMR (Basal Metabolic Rate) Calculator',
    shortDescription: 'Estimate daily resting calorie expenditure using the Mifflin-St Jeor equation.',
    category: 'health',
    categoryLabel: 'Health & Fitness',
    keywords: ['bmr', 'metabolism', 'basal metabolic rate', 'calories', 'mifflin'],
    synonyms: ['resting metabolic rate', 'rmr calculator'],
    formulaDisplay: 'Mifflin-St Jeor: 10·W + 6.25·H - 5·Age + s (s = +5 male, -161 female)',
    explanation: 'Estimates calories burned daily at complete rest.',
    disclaimer: HEALTH_DISCLAIMER,
    inputs: [
      {
        key: 'sex',
        label: 'Sex',
        type: 'select',
        defaultValue: 'male',
        options: [
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
        ],
      },
      { key: 'weight', label: 'Weight (kg)', type: 'number', defaultValue: 70, min: 20, max: 350, step: 0.5 },
      { key: 'heightCm', label: 'Height (cm)', type: 'number', defaultValue: 175, min: 80, max: 260, step: 0.5 },
      { key: 'age', label: 'Age (years)', type: 'number', defaultValue: 28, min: 10, max: 120, step: 1 },
    ],
    relatedIds: ['tdee', 'calorie', 'bmi', 'protein'],
    compute: (values) => {
      const sex = str(values, 'sex', 'male');
      const w = num(values, 'weight');
      const h = num(values, 'heightCm');
      const age = num(values, 'age');
      const s = sex === 'female' ? -161 : 5;
      const bmr = 10 * w + 6.25 * h - 5 * age + s;
      return {
        primary: { label: 'Basal Metabolic Rate (BMR)', value: bmr, formatted: `${Math.round(bmr)} kcal/day` },
        breakdown: [
          { label: 'Hourly Resting Burn', value: bmr / 24, formatted: `${(bmr / 24).toFixed(1)} kcal/hr` },
          { label: 'Sedentary TDEE (×1.2)', value: bmr * 1.2, formatted: `${Math.round(bmr * 1.2)} kcal/day` },
        ],
        steps: [`10×${w} + 6.25×${h} - 5×${age} + (${s}) = ${bmr.toFixed(1)} kcal/day`],
      };
    },
  },
  {
    id: 'tdee',
    name: 'TDEE (Total Daily Energy Expenditure) Calculator',
    shortDescription: 'Calculate total daily calorie burn across activity levels.',
    category: 'health',
    categoryLabel: 'Health & Fitness',
    keywords: ['tdee', 'energy expenditure', 'maintenance calories', 'activity'],
    synonyms: ['daily calorie burn', 'maintenance calories'],
    formulaDisplay: 'TDEE = BMR × Activity Multiplier',
    explanation: 'Multiplies Mifflin-St Jeor BMR by lifestyle activity level.',
    disclaimer: HEALTH_DISCLAIMER,
    inputs: [
      {
        key: 'sex',
        label: 'Sex',
        type: 'select',
        defaultValue: 'male',
        options: [
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
        ],
      },
      { key: 'weight', label: 'Weight (kg)', type: 'number', defaultValue: 72, min: 20, max: 350, step: 0.5 },
      { key: 'heightCm', label: 'Height (cm)', type: 'number', defaultValue: 175, min: 80, max: 260, step: 0.5 },
      { key: 'age', label: 'Age (years)', type: 'number', defaultValue: 28, min: 10, max: 120, step: 1 },
      {
        key: 'activity',
        label: 'Activity Level',
        type: 'select',
        defaultValue: '1.55',
        options: [
          { label: 'Sedentary (×1.2)', value: '1.2' },
          { label: 'Light Exercise (×1.375)', value: '1.375' },
          { label: 'Moderate Exercise (×1.55)', value: '1.55' },
          { label: 'Heavy Exercise (×1.725)', value: '1.725' },
          { label: 'Athlete (×1.9)', value: '1.9' },
        ],
      },
    ],
    relatedIds: ['bmr', 'calorie', 'protein', 'bmi'],
    compute: (values) => {
      const sex = str(values, 'sex', 'male');
      const w = num(values, 'weight');
      const h = num(values, 'heightCm');
      const age = num(values, 'age');
      const mult = Number(str(values, 'activity', '1.55'));
      const bmr = 10 * w + 6.25 * h - 5 * age + (sex === 'female' ? -161 : 5);
      const tdee = bmr * mult;
      return {
        primary: { label: 'Maintenance Calories (TDEE)', value: tdee, formatted: `${Math.round(tdee)} kcal/day` },
        breakdown: [
          { label: 'Mild Fat Loss (-300 kcal)', value: tdee - 300, formatted: `${Math.round(tdee - 300)} kcal/day` },
          { label: 'Moderate Fat Loss (-500 kcal)', value: tdee - 500, formatted: `${Math.round(tdee - 500)} kcal/day` },
          { label: 'Lean Surplus (+300 kcal)', value: tdee + 300, formatted: `${Math.round(tdee + 300)} kcal/day` },
          { label: 'Base BMR', value: bmr, formatted: `${Math.round(bmr)} kcal/day` },
        ],
        steps: [`BMR = ${Math.round(bmr)} kcal`, `TDEE = ${Math.round(bmr)} × ${mult} = ${Math.round(tdee)} kcal/day`],
      };
    },
  },
  {
    id: 'calorie',
    name: 'Daily Calorie & Macro Planner',
    shortDescription: 'Plan daily calories and protein/carb/fat gram targets based on goal.',
    category: 'health',
    categoryLabel: 'Health & Fitness',
    keywords: ['calorie', 'macros', 'nutrition', 'diet', 'fat loss', 'muscle gain'],
    synonyms: ['macro calculator', 'calorie target'],
    formulaDisplay: 'Target = TDEE + Goal Offset',
    explanation: 'Splits daily calorie target into 30% Protein, 40% Carbs, and 30% Fats.',
    disclaimer: HEALTH_DISCLAIMER,
    inputs: [
      { key: 'tdee', label: 'Your Maintenance TDEE (kcal)', type: 'number', defaultValue: 2300, min: 800, max: 8000, step: 50 },
      {
        key: 'goal',
        label: 'Goal',
        type: 'select',
        defaultValue: 'maintain',
        options: [
          { label: 'Fat Loss (-500 kcal/day)', value: 'cut' },
          { label: 'Maintain Weight (0)', value: 'maintain' },
          { label: 'Muscle Gain (+300 kcal/day)', value: 'bulk' },
        ],
      },
    ],
    relatedIds: ['tdee', 'protein', 'bmr', 'water-intake'],
    compute: (values) => {
      const tdee = num(values, 'tdee');
      const goal = str(values, 'goal', 'maintain');
      const offset = goal === 'cut' ? -500 : goal === 'bulk' ? 300 : 0;
      const target = Math.max(1000, tdee + offset);
      const proteinG = (target * 0.3) / 4;
      const carbsG = (target * 0.4) / 4;
      const fatsG = (target * 0.3) / 9;
      return {
        primary: { label: 'Daily Calorie Target', value: target, formatted: `${Math.round(target)} kcal/day` },
        breakdown: [
          { label: 'Protein (30%)', value: proteinG, formatted: `${Math.round(proteinG)} g` },
          { label: 'Carbohydrates (40%)', value: carbsG, formatted: `${Math.round(carbsG)} g` },
          { label: 'Fats (30%)', value: fatsG, formatted: `${Math.round(fatsG)} g` },
        ],
        steps: [`Target = ${tdee} + (${offset}) = ${target} kcal`],
      };
    },
  },
  {
    id: 'ideal-weight',
    name: 'Ideal Weight Estimator',
    shortDescription: 'Estimate reference weight ranges using Devine, Robinson, and Miller formulas.',
    category: 'health',
    categoryLabel: 'Health & Fitness',
    keywords: ['ideal weight', 'devine', 'robinson', 'miller', 'target weight'],
    synonyms: ['ideal body weight', 'ibw calculator'],
    formulaDisplay: 'Devine (Male): 50 + 2.3 × (inches over 60)  |  (Female): 45.5 + 2.3 × (inches over 60)',
    explanation: 'Compares three classical anthropometric equations alongside BMI 18.5–24.9 range.',
    disclaimer: HEALTH_DISCLAIMER,
    inputs: [
      {
        key: 'sex',
        label: 'Sex',
        type: 'select',
        defaultValue: 'male',
        options: [
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
        ],
      },
      { key: 'heightCm', label: 'Height (cm)', type: 'number', defaultValue: 175, min: 120, max: 240, step: 0.5 },
    ],
    relatedIds: ['bmi', 'bmr', 'protein'],
    compute: (values) => {
      const sex = str(values, 'sex', 'male');
      const hCm = num(values, 'heightCm');
      const inchesOver60 = Math.max(0, hCm / 2.54 - 60);
      const devine = (sex === 'female' ? 45.5 : 50) + 2.3 * inchesOver60;
      const robinson = (sex === 'female' ? 49 : 52) + (sex === 'female' ? 1.7 : 1.9) * inchesOver60;
      const miller = (sex === 'female' ? 53.1 : 56.2) + (sex === 'female' ? 1.36 : 1.41) * inchesOver60;
      const avg = (devine + robinson + miller) / 3;
      return {
        primary: { label: 'Average Reference Weight', value: avg, formatted: `${avg.toFixed(1)} kg` },
        breakdown: [
          { label: 'Devine Formula', value: devine, formatted: `${devine.toFixed(1)} kg` },
          { label: 'Robinson Formula', value: robinson, formatted: `${robinson.toFixed(1)} kg` },
          { label: 'Miller Formula', value: miller, formatted: `${miller.toFixed(1)} kg` },
        ],
        steps: [`Inches over 5 ft (60 in): ${inchesOver60.toFixed(2)} in`],
      };
    },
  },
  {
    id: 'protein',
    name: 'Daily Protein Requirement Calculator',
    shortDescription: 'Estimate daily protein intake based on body weight and training intensity.',
    category: 'health',
    categoryLabel: 'Health & Fitness',
    keywords: ['protein', 'nutrition', 'muscle', 'fitness', 'macro'],
    synonyms: ['protein intake', 'grams of protein per day'],
    formulaDisplay: 'Protein (g/day) = Body Weight (kg) × Factor (0.8 – 2.2 g/kg)',
    explanation: 'Applies standard sports nutrition ranges from sedentary RDA (0.8 g/kg) to strength training (1.8–2.2 g/kg).',
    disclaimer: HEALTH_DISCLAIMER,
    inputs: [
      { key: 'weight', label: 'Body Weight (kg)', type: 'number', defaultValue: 70, min: 20, max: 300, step: 0.5 },
      {
        key: 'level',
        label: 'Training / Lifestyle Goal',
        type: 'select',
        defaultValue: '1.6',
        options: [
          { label: 'Sedentary Baseline (0.8 g/kg)', value: '0.8' },
          { label: 'General Fitness (1.2 g/kg)', value: '1.2' },
          { label: 'Endurance / Active (1.4 g/kg)', value: '1.4' },
          { label: 'Muscle & Strength (1.6 g/kg)', value: '1.6' },
          { label: 'Intense Hypertrophy / Cut (2.0 g/kg)', value: '2.0' },
        ],
      },
    ],
    relatedIds: ['calorie', 'tdee', 'water-intake'],
    compute: (values) => {
      const w = num(values, 'weight');
      const factor = Number(str(values, 'level', '1.6'));
      const grams = w * factor;
      return {
        primary: { label: 'Daily Protein Target', value: grams, formatted: `${Math.round(grams)} g/day` },
        breakdown: [
          { label: 'Calories from Protein (4 kcal/g)', value: grams * 4, formatted: `${Math.round(grams * 4)} kcal` },
          { label: 'Per Meal (across 4 meals)', value: grams / 4, formatted: `${(grams / 4).toFixed(1)} g/meal` },
        ],
        steps: [`${w} kg × ${factor} g/kg = ${grams.toFixed(1)} g/day`],
      };
    },
  },
  {
    id: 'water-intake',
    name: 'Daily Water Intake Estimator',
    shortDescription: 'Estimate daily hydration volume from body weight and exercise duration.',
    category: 'health',
    categoryLabel: 'Health & Fitness',
    keywords: ['water', 'hydration', 'liters', 'fluid intake'],
    synonyms: ['hydration calculator', 'how much water to drink'],
    formulaDisplay: 'Water (L) = (Weight × 0.033) + (Exercise Minutes / 30) × 0.35',
    explanation: 'Combines baseline weight-based fluid estimation with sweat replenishment for activity.',
    disclaimer: HEALTH_DISCLAIMER,
    inputs: [
      { key: 'weight', label: 'Weight (kg)', type: 'number', defaultValue: 70, min: 15, max: 300, step: 0.5 },
      { key: 'exerciseMin', label: 'Daily Exercise (minutes)', type: 'number', defaultValue: 45, min: 0, max: 360, step: 5 },
    ],
    relatedIds: ['protein', 'calorie', 'bmi'],
    compute: (values) => {
      const w = num(values, 'weight');
      const ex = num(values, 'exerciseMin');
      const baseL = w * 0.033;
      const exL = (ex / 30) * 0.35;
      const totalL = baseL + exL;
      const glasses = totalL / 0.25;
      return {
        primary: { label: 'Estimated Daily Water', value: totalL, formatted: `${totalL.toFixed(2)} Liters/day` },
        breakdown: [
          { label: 'Milliliters', value: totalL * 1000, formatted: `${Math.round(totalL * 1000)} mL` },
          { label: '250 mL Glasses', value: glasses, formatted: `~${Math.round(glasses)} glasses` },
        ],
        steps: [`Base (${baseL.toFixed(2)} L) + Activity (${exL.toFixed(2)} L) = ${totalL.toFixed(2)} L`],
      };
    },
  },
  {
    id: 'age',
    name: 'Exact Age Calculator',
    shortDescription: 'Calculate exact chronological age in years, months, days, total days, and next birthday countdown.',
    category: 'health',
    categoryLabel: 'Health & Fitness',
    keywords: ['age', 'birthday', 'dob', 'date of birth', 'years'],
    synonyms: ['dob calculator', 'how old am i'],
    formulaDisplay: 'Calendar Difference (Target Date - Date of Birth)',
    explanation: 'Computes exact calendar-aware years, months, and days accounting for leap years and month lengths.',
    inputs: [
      { key: 'dob', label: 'Date of Birth', type: 'date', defaultValue: '1998-05-15' },
      { key: 'target', label: 'As of Date', type: 'date', defaultValue: '2026-11-24' },
    ],
    relatedIds: ['date-difference', 'bmi', 'retirement'],
    compute: (values) => {
      const dobStr = str(values, 'dob');
      const targetStr = str(values, 'target');
      const dob = new Date(dobStr);
      const target = new Date(targetStr);
      if (Number.isNaN(dob.getTime()) || Number.isNaN(target.getTime())) {
        throw new Error('Please enter valid dates.');
      }
      if (target < dob) throw new Error('Target date must be on or after Date of Birth.');

      let years = target.getFullYear() - dob.getFullYear();
      let months = target.getMonth() - dob.getMonth();
      let days = target.getDate() - dob.getDate();

      if (days < 0) {
        months -= 1;
        const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }

      const totalDays = Math.floor((target.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
      let nextBday = new Date(target.getFullYear(), dob.getMonth(), dob.getDate());
      if (nextBday <= target) {
        nextBday = new Date(target.getFullYear() + 1, dob.getMonth(), dob.getDate());
      }
      const daysToNext = Math.ceil((nextBday.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

      return {
        primary: { label: 'Exact Chronological Age', value: years, formatted: `${years} yrs, ${months} mos, ${days} days` },
        breakdown: [
          { label: 'Total Days Lived', value: totalDays, formatted: `${totalDays.toLocaleString('en-US')} days` },
          { label: 'Total Months', value: years * 12 + months, formatted: `${years * 12 + months} months` },
          { label: 'Days Until Next Birthday', value: daysToNext, formatted: `${daysToNext} days` },
        ],
        steps: [`From ${dobStr} to ${targetStr}: ${years}y ${months}m ${days}d`],
      };
    },
  },
];
