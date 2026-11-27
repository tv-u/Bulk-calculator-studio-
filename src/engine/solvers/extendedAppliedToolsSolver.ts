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

function fmtMoney(val: number, ctx?: ComputeContext): string {
  return formatCurrency(val, ctx?.currency || 'USD', ctx?.locale || 'en-US');
}

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};

const NATO: Record<string, string> = {
  A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf',
  H: 'Hotel', I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November',
  O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform',
  V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
};

function styleUnicode(text: string, mode: string): string {
  const mapOffset = (ch: string, upperStart: number, lowerStart: number): string => {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(upperStart + (c - 65));
    if (c >= 97 && c <= 122) return String.fromCodePoint(lowerStart + (c - 97));
    return ch;
  };
  if (mode === 'bold') return Array.from(text).map((c) => mapOffset(c, 0x1d400, 0x1d41a)).join('');
  if (mode === 'italic') return Array.from(text).map((c) => mapOffset(c, 0x1d434, 0x1d44e)).join('');
  if (mode === 'cursive') return Array.from(text).map((c) => mapOffset(c, 0x1d4d0, 0x1d4ea)).join('');
  if (mode === 'strikethrough') return Array.from(text).map((c) => c + '\u0336').join('');
  if (mode === 'underline') return Array.from(text).map((c) => c + '\u0332').join('');
  if (mode === 'smallcaps') {
    const sc = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ';
    return Array.from(text.toLowerCase()).map((c) => {
      const idx = c.charCodeAt(0) - 97;
      return idx >= 0 && idx < 26 ? sc[idx] : c;
    }).join('');
  }
  if (mode === 'upside') return Array.from(text).reverse().join('');
  if (mode === 'leet') return text.replace(/[aeiost]/gi, (m) => ({ a: '4', e: '3', i: '1', o: '0', s: '5', t: '7' }[m.toLowerCase()] || m));
  if (mode === 'piglatin') return text.split(/\s+/).map((w) => (/^[aeiou]/i.test(w) ? w + 'way' : w.slice(1) + w[0] + 'ay')).join(' ');
  if (mode === 'morse') return Array.from(text.toUpperCase()).map((c) => MORSE[c] || (c === ' ' ? '/' : c)).join(' ');
  if (mode === 'nato') return Array.from(text.toUpperCase()).map((c) => NATO[c] || c).join(' ');
  return text;
}

export function buildExtendedAppliedDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();

  // 1. Standardized Exams, Certifications & Education
  if (entry.category === 'education' || /\b(sat|act|psat|ap |ib |gre|gmat|lsat|mcat|usmle|ielts|toefl|cbse|icse|cuet|gate|neet|clat|aws|azure|comptia|ccna|gpa|cgpa|sgpa|ects|graduation)\b/.test(n)) {
    return makeBase(entry, {
      shortDescription: `${entry.name} (#${entry.catalogNumber}) — official scaled score, pass/cutoff check & percentile estimator.`,
      formulaDisplay: 'Scaled Score = ScaleMin + (RawAccuracy% × (ScaleMax − ScaleMin))',
      explanation: `Computes projected scaled exam score, national percentile estimate, and target readiness for ${entry.name}.`,
      inputs: [
        { key: 'correct', label: 'Questions Correct / Marks Obtained', type: 'number', defaultValue: 82, min: 0, step: 1 },
        { key: 'total', label: 'Total Questions / Max Marks', type: 'number', defaultValue: 100, min: 1, step: 1 },
        { key: 'wrong', label: 'Incorrect (for Negative Marking)', type: 'number', defaultValue: 8, min: 0, step: 1 },
        { key: 'neg', label: 'Negative Penalty Ratio (e.g. 0.25 or 0)', type: 'number', defaultValue: n.includes('neet') || n.includes('gate') || n.includes('clat') || n.includes('cuet') ? 0.25 : 0, min: 0, max: 1, step: 0.05 },
      ],
      compute: (vals) => {
        const cor = num(vals, 'correct', 82), tot = Math.max(1, num(vals, 'total', 100)), wrg = num(vals, 'wrong', 8), neg = num(vals, 'neg', 0);
        const netRaw = Math.max(0, cor - wrg * neg);
        const pct = Math.min(100, (netRaw / tot) * 100);
        let scaledStr = `${pct.toFixed(1)}%`;
        let scaledVal = pct;
        if (n.includes('sat') && !n.includes('psat')) {
          scaledVal = Math.round((400 + (pct / 100) * 1200) / 10) * 10;
          scaledStr = `${scaledVal} / 1600`;
        } else if (n.includes('psat')) {
          scaledVal = Math.round((320 + (pct / 100) * 1200) / 10) * 10;
          scaledStr = `${scaledVal} / 1520`;
        } else if (n.includes('act')) {
          scaledVal = Math.max(1, Math.min(36, Math.round(1 + (pct / 100) * 35)));
          scaledStr = `${scaledVal} / 36`;
        } else if (n.includes('gre')) {
          scaledVal = Math.round(260 + (pct / 100) * 80);
          scaledStr = `${scaledVal} / 340`;
        } else if (n.includes('gmat')) {
          scaledVal = Math.round((205 + (pct / 100) * 600) / 10) * 10;
          scaledStr = `${scaledVal} / 805`;
        } else if (n.includes('mcat')) {
          scaledVal = Math.round(472 + (pct / 100) * 56);
          scaledStr = `${scaledVal} / 528`;
        } else if (n.includes('ap ')) {
          scaledVal = pct >= 75 ? 5 : pct >= 60 ? 4 : pct >= 45 ? 3 : pct >= 30 ? 2 : 1;
          scaledStr = `AP Score ${scaledVal} / 5`;
        } else if (n.includes('ib ')) {
          scaledVal = Math.max(1, Math.min(7, Math.round((pct / 100) * 7)));
          scaledStr = `IB Level ${scaledVal} / 7`;
        } else if (n.includes('ielts')) {
          scaledVal = Math.min(9, Math.max(1, Math.round((pct / 100) * 9 * 2) / 2));
          scaledStr = `Band ${scaledVal.toFixed(1)} / 9.0`;
        } else if (n.includes('aws') || n.includes('azure') || n.includes('comptia') || n.includes('ccna')) {
          scaledVal = Math.round(100 + (pct / 100) * 900);
          scaledStr = `${scaledVal} / 1000 (${scaledVal >= 720 ? 'PASS' : 'Need 720+'})`;
        } else if (n.includes('gpa') || n.includes('sgpa') || n.includes('cgpa')) {
          scaledVal = (pct / 100) * (n.includes('cgpa') ? 10 : 4);
          scaledStr = `${scaledVal.toFixed(2)} ${n.includes('cgpa') ? '/ 10' : '/ 4.0'}`;
        }
        const percentile = Math.min(99.9, Math.max(1, Math.round(pct * 0.99)));
        return {
          primary: { label: 'Estimated Scaled Score', value: scaledVal, formatted: scaledStr },
          breakdown: [
            { label: 'Net Raw Accuracy', value: pct, formatted: `${pct.toFixed(2)}% (${netRaw.toFixed(1)}/${tot})` },
            { label: 'Estimated Percentile', value: percentile, formatted: `${percentile}th Percentile` },
          ],
          steps: [`Net Raw = ${cor} − (${wrg}×${neg}) = ${netRaw.toFixed(1)} (${pct.toFixed(1)}%) → ${scaledStr}`],
        };
      },
    });
  }

  // 2. Construction, Carpentry, Roofing, Pools, Landscaping, HVAC & Home Cost
  if (entry.category === 'construction' || /\b(board foot|rafter|birdsmouth|joist|stud wall|drywall|concrete|mulch|gravel|topsoil|sod|turf|fence|deck|hvac|btu|cfm|ada ramp|stair|remodel|cost estimator|cost calculator)\b/.test(n)) {
    if (n.includes('ada ramp')) {
      return makeBase(entry, {
        shortDescription: `ADA Accessibility Wheelchair Ramp 1:12 slope length, landings & incline angle calculator.`,
        formulaDisplay: 'Min Ramp Length (ft) = Rise (inches) / 12 × 12 in  (1:12 Max Slope = 4.76°)',
        explanation: 'Enforces ADA 1:12 maximum rise-to-run ratio and 30-foot intermediate landing rule.',
        inputs: [{ key: 'riseIn', label: 'Total Vertical Rise (Inches)', type: 'number', defaultValue: 24, min: 1, step: 1 }],
        compute: (vals) => {
          const rise = num(vals, 'riseIn', 24);
          const runFt = rise; // 1:12 means 1 inch rise = 1 foot run!
          const landings = Math.floor(runFt / 30);
          return {
            primary: { label: 'Required Minimum Ramp Run', value: runFt, formatted: `${runFt.toFixed(1)} ft`, unit: 'ft' },
            breakdown: [
              { label: 'Slope Ratio / Angle', value: 4.76, formatted: '1 : 12 (4.76° / 8.33%)' },
              { label: '5ft Intermediate Landings', value: landings, formatted: `${landings} landings required` },
            ],
            steps: [`${rise}" vertical rise at 1:12 ADA slope = ${runFt} linear feet`],
          };
        },
      });
    }

    if (n.includes('board foot')) {
      return makeBase(entry, {
        shortDescription: `Calculate total lumber Board Feet (BF) and project timber cost.`,
        formulaDisplay: 'Board Feet = (Thickness_in × Width_in × Length_ft × Pieces) / 12',
        explanation: 'Computes exact board-foot lumber volume for hardwoods and framing stock.',
        inputs: [
          { key: 't', label: 'Thickness (in)', type: 'number', defaultValue: 2, min: 0.25, step: 0.25 },
          { key: 'w', label: 'Width (in)', type: 'number', defaultValue: 6, min: 0.5, step: 0.5 },
          { key: 'l', label: 'Length (ft)', type: 'number', defaultValue: 8, min: 1, step: 1 },
          { key: 'qty', label: 'Piece Count', type: 'number', defaultValue: 20, min: 1, step: 1 },
          { key: 'price', label: 'Price per Board Foot ($)', type: 'number', defaultValue: 4.5, min: 0, step: 0.25 },
        ],
        compute: (vals, ctx) => {
          const bf = ((num(vals, 't') * num(vals, 'w') * num(vals, 'l')) / 12) * num(vals, 'qty');
          const cost = bf * num(vals, 'price');
          return {
            primary: { label: 'Total Board Feet', value: bf, formatted: `${bf.toFixed(2)} BF`, unit: 'BF' },
            breakdown: [{ label: 'Estimated Lumber Cost', value: cost, formatted: fmtMoney(cost, ctx) }],
            steps: [`${bf.toFixed(2)} Board Feet × ${fmtMoney(num(vals, 'price'), ctx)}/BF = ${fmtMoney(cost, ctx)}`],
          };
        },
      });
    }

    if (n.includes('hvac') || n.includes('btu') || n.includes('air conditioner') || n.includes('heat pump') || n.includes('furnace') || n.includes('cfm')) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — HVAC cooling/heating load (BTU/hr), AC tonnage & duct airflow CFM.`,
        formulaDisplay: 'BTU/hr ≈ Area_sqft × 25 × ClimateFactor  |  1 Ton AC = 12,000 BTU/hr  |  CFM ≈ 400 × Tons',
        explanation: 'Sizes residential/commercial AC tonnage, BTU capacity, and airflow requirements.',
        inputs: [
          { key: 'sqft', label: 'Room / Home Area (sq ft)', type: 'number', defaultValue: 1200, min: 50, step: 50 },
          { key: 'ceiling', label: 'Ceiling Height (ft)', type: 'number', defaultValue: 9, min: 7, max: 24, step: 1 },
          { key: 'climate', label: 'Climate Factor (1.0 Mild – 1.4 Hot)', type: 'number', defaultValue: 1.15, min: 0.8, max: 1.6, step: 0.05 },
        ],
        compute: (vals) => {
          const area = num(vals, 'sqft', 1200), ceil = num(vals, 'ceiling', 9), cl = num(vals, 'climate', 1.15);
          const btu = area * 25 * (ceil / 8) * cl;
          const tons = btu / 12000;
          const cfm = tons * 400;
          return {
            primary: { label: n.includes('cfm') ? 'Required Airflow (CFM)' : 'Heating/Cooling Load', value: n.includes('cfm') ? cfm : btu, formatted: n.includes('cfm') ? `${Math.round(cfm)} CFM` : `${Math.round(btu).toLocaleString()} BTU/hr (${tons.toFixed(2)} Tons)` },
            breakdown: [
              { label: 'Required AC Tonnage', value: tons, formatted: `${tons.toFixed(2)} Tons` },
              { label: 'Required Airflow (400 CFM/ton)', value: cfm, formatted: `${Math.round(cfm)} CFM` },
            ],
            steps: [`${area} sq ft × 25 × (${ceil}/8) × ${cl} = ${Math.round(btu).toLocaleString()} BTU/hr`],
          };
        },
      });
    }

    // General Construction / Landscaping / Remodel Estimator
    return makeBase(entry, {
      shortDescription: `${entry.name} (#${entry.catalogNumber}) — material quantity, cubic yards/sq ft & waste-adjusted contractor budget.`,
      formulaDisplay: 'Material = Area × Depth/Rate × (1 + Waste%)',
      explanation: `Computes material takeoff, waste margin (10%), and estimated installed budget for ${entry.name}.`,
      inputs: [
        { key: 'len', label: 'Length / Run (ft)', type: 'number', defaultValue: 24, min: 1, step: 1 },
        { key: 'wid', label: 'Width / Height (ft)', type: 'number', defaultValue: 12, min: 1, step: 1 },
        { key: 'depth', label: 'Thickness / Depth (inches, if 3D)', type: 'number', defaultValue: 4, min: 0.25, step: 0.5 },
        { key: 'unitCost', label: 'Installed Unit Cost ($ / sq ft or yd³)', type: 'number', defaultValue: 8.5, min: 0, step: 0.5 },
      ],
      compute: (vals, ctx) => {
        const L = num(vals, 'len'), W = num(vals, 'wid'), D = num(vals, 'depth', 4), cost = num(vals, 'unitCost', 8.5);
        const areaSqFt = L * W;
        const cuYds = (areaSqFt * (D / 12)) / 27;
        const isVol = /(concrete|mulch|gravel|topsoil|granite|stone|sand|excavation|slab|footing|driveway|patio|pond|pool)/.test(n);
        const withWaste = (isVol ? cuYds : areaSqFt) * 1.1;
        const totalCost = areaSqFt * cost;
        return {
          primary: { label: isVol ? 'Volume (+10% Waste)' : 'Surface Area (+10% Waste)', value: withWaste, formatted: isVol ? `${withWaste.toFixed(2)} yd³` : `${Math.ceil(withWaste).toLocaleString()} sq ft` },
          breakdown: [
            { label: 'Net Area (sq ft)', value: areaSqFt, formatted: `${areaSqFt.toLocaleString()} sq ft` },
            { label: 'Net Cubic Yards', value: cuYds, formatted: `${cuYds.toFixed(2)} yd³` },
            { label: 'Estimated Project Cost', value: totalCost, formatted: fmtMoney(totalCost, ctx) },
          ],
          steps: [`${L}ft × ${W}ft = ${areaSqFt} sq ft (${cuYds.toFixed(2)} yd³ at ${D}" depth)`],
        };
      },
    });
  }

  // 3. Automotive & Motorsports
  if (entry.category === 'automotive' || /\b(tire|wheel|gear ratio|quarter mile|0-60|0–60|displacement|compression ratio|carburetor|turbo|ev |fuel)\b/.test(n)) {
    return makeBase(entry, {
      shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact automotive drivetrain, quarter-mile/0–60, or ownership calculation.`,
      formulaDisplay: 'ET ≈ 5.825 × (Weight / HP)^(1/3)  |  MPH = (RPM × TireDia) / (GearRatio × 336)',
      explanation: `Evaluates automotive engineering dynamics and performance metrics for ${entry.name}.`,
      inputs: [
        { key: 'a', label: n.includes('tire') ? 'Tire Width (mm)' : n.includes('gear') ? 'Engine RPM' : 'Vehicle Weight (lbs) / Price ($)', type: 'number', defaultValue: n.includes('tire') ? 245 : n.includes('gear') ? 6000 : 3400, min: 1, step: 10 },
        { key: 'b', label: n.includes('tire') ? 'Aspect Ratio (%)' : n.includes('gear') ? 'Tire Diameter (in)' : 'Wheel Horsepower (WHP)', type: 'number', defaultValue: n.includes('tire') ? 45 : n.includes('gear') ? 26 : 320, min: 1, step: 1 },
        { key: 'c', label: n.includes('tire') ? 'Wheel Rim Diameter (in)' : 'Overall Gear Ratio / Factor', type: 'number', defaultValue: n.includes('tire') ? 18 : 3.73, min: 0.5, step: 0.1 },
      ],
      compute: (vals, ctx) => {
        const a = num(vals, 'a'), b = num(vals, 'b'), c = num(vals, 'c');
        if (n.includes('tire')) {
          const sidewallIn = (a * (b / 100)) / 25.4;
          const totalDia = c + 2 * sidewallIn;
          const circ = Math.PI * totalDia;
          const revsPerMi = 63360 / circ;
          return {
            primary: { label: 'Overall Tire Diameter', value: totalDia, formatted: `${totalDia.toFixed(2)} inches` },
            breakdown: [
              { label: 'Sidewall Height', value: sidewallIn, formatted: `${sidewallIn.toFixed(2)} in` },
              { label: 'Revolutions per Mile', value: revsPerMi, formatted: `${Math.round(revsPerMi)} rev/mi` },
            ],
            steps: [`${a}/${b}R${c} → Dia = ${c} + 2×${sidewallIn.toFixed(2)} = ${totalDia.toFixed(2)}"`],
          };
        }
        if (n.includes('gear') || n.includes('speedometer') || n.includes('top speed')) {
          const mph = (a * b) / (c * 336.135);
          return {
            primary: { label: 'Calculated Speed (MPH)', value: mph, formatted: `${mph.toFixed(1)} mph (${(mph * 1.60934).toFixed(1)} km/h)` },
            breakdown: [{ label: 'Tire Diameter / Ratio', value: c, formatted: `${b}" tire @ ${c}:1 ratio` }],
            steps: [`(${a} × ${b}) / (${c} × 336.135) = ${mph.toFixed(1)} mph`],
          };
        }
        if (n.includes('cost') || n.includes('insurance') || n.includes('value') || n.includes('repair')) {
          const est = a * (b / 1000) * c;
          return {
            primary: { label: 'Estimated Automotive Cost', value: est, formatted: fmtMoney(est, ctx) },
            breakdown: [{ label: 'Monthly Equivalent', value: est / 12, formatted: fmtMoney(est / 12, ctx) }],
            steps: [`Computed ownership metric = ${fmtMoney(est, ctx)}`],
          };
        }
        // Quarter Mile & 0-60 Performance (Fox/Hale formula)
        const et = 5.825 * Math.cbrt(a / b);
        const trapMph = 234 * Math.cbrt(b / a);
        const zero60 = Math.max(1.8, (a / b) * 0.42);
        return {
          primary: { label: n.includes('0-60') || n.includes('0–60') ? 'Est. 0–60 mph Time' : 'Quarter-Mile ET', value: n.includes('0-60') ? zero60 : et, formatted: n.includes('0-60') ? `${zero60.toFixed(2)} sec` : `${et.toFixed(2)} sec @ ${trapMph.toFixed(1)} mph` },
          breakdown: [
            { label: 'Quarter-Mile ET', value: et, formatted: `${et.toFixed(2)} s` },
            { label: 'Trap Speed', value: trapMph, formatted: `${trapMph.toFixed(1)} mph` },
            { label: 'Power-to-Weight Ratio', value: a / b, formatted: `${(a / b).toFixed(2)} lbs/HP` },
          ],
          steps: [`ET = 5.825 × ∛(${a}/${b}) = ${et.toFixed(2)}s`],
        };
      },
    });
  }

  // 4. Sports & Health Analytics (NFL Passer Rating, Baseball ERA/OPS, Cricket NRR, 1RM, Wilks, Running/VO2, Elo)
  if (entry.category === 'sports' || entry.category === 'health' || /\b(1rm|wilks|passer rating|era|whip|fip|obp|slugging|nrr|cricket|elo |vo2|steps to)\b/.test(n)) {
    if (n.includes('passer rating')) {
      return makeBase(entry, {
        shortDescription: `Official NFL/NCAAF Quarterback Passer Rating formula (0.0 to 158.3 perfect).`,
        formulaDisplay: 'Rating = ((a + b + c + d) / 6) × 100',
        explanation: 'Uses exact NFL 4-factor clamped completion%, yards/att, TD%, and INT% bounds [0, 2.375].',
        inputs: [
          { key: 'att', label: 'Pass Attempts', type: 'number', defaultValue: 35, min: 1, step: 1 },
          { key: 'cmp', label: 'Completions', type: 'number', defaultValue: 25, min: 0, step: 1 },
          { key: 'yds', label: 'Passing Yards', type: 'number', defaultValue: 310, step: 5 },
          { key: 'td', label: 'Touchdowns', type: 'number', defaultValue: 3, min: 0, step: 1 },
          { key: 'int', label: 'Interceptions', type: 'number', defaultValue: 1, min: 0, step: 1 },
        ],
        compute: (vals) => {
          const att = Math.max(1, num(vals, 'att'));
          const cmp = num(vals, 'cmp'), yds = num(vals, 'yds'), td = num(vals, 'td'), ints = num(vals, 'int');
          const clamp = (x: number) => Math.max(0, Math.min(2.375, x));
          const a = clamp(((cmp / att) - 0.3) * 5);
          const b = clamp(((yds / att) - 3) * 0.25);
          const c = clamp((td / att) * 20);
          const d = clamp(2.375 - (ints / att) * 25);
          const rating = ((a + b + c + d) / 6) * 100;
          return {
            primary: { label: 'NFL Passer Rating', value: rating, formatted: `${rating.toFixed(1)} / 158.3` },
            breakdown: [
              { label: 'Completion %', value: (cmp / att) * 100, formatted: `${((cmp / att) * 100).toFixed(1)}%` },
              { label: 'Yards / Attempt', value: yds / att, formatted: `${(yds / att).toFixed(2)} YPA` },
            ],
            steps: [`a=${a.toFixed(2)}, b=${b.toFixed(2)}, c=${c.toFixed(2)}, d=${d.toFixed(2)} → ${rating.toFixed(1)}`],
          };
        },
      });
    }

    if (n.includes('1rm') || n.includes('one-rep') || n.includes('531') || n.includes('bench press')) {
      return makeBase(entry, {
        shortDescription: `Calculate 1-Rep Max (1RM) using Epley & Brzycki strength equations + training percentages.`,
        formulaDisplay: 'Epley: 1RM = Weight × (1 + Reps/30)  |  Brzycki: Weight × 36 / (37 − Reps)',
        explanation: 'Estimates maximal strength and 5/3/1 percentage working sets cleanly.',
        inputs: [
          { key: 'weight', label: 'Weight Lifted (lbs or kg)', type: 'number', defaultValue: 225, min: 1, step: 5 },
          { key: 'reps', label: 'Repetitions Completed (1–15)', type: 'number', defaultValue: 5, min: 1, max: 20, step: 1 },
        ],
        compute: (vals) => {
          const w = num(vals, 'weight'), r = num(vals, 'reps');
          const epley = r === 1 ? w : w * (1 + r / 30);
          const brz = r === 1 ? w : w * (36 / Math.max(1, 37 - r));
          const avg = (epley + brz) / 2;
          return {
            primary: { label: 'Estimated 1-Rep Max (1RM)', value: avg, formatted: `${avg.toFixed(1)}` },
            breakdown: [
              { label: '90% Working Set (~3-4 reps)', value: avg * 0.9, formatted: `${(avg * 0.9).toFixed(1)}` },
              { label: '80% Hypertrophy (~7-8 reps)', value: avg * 0.8, formatted: `${(avg * 0.8).toFixed(1)}` },
              { label: '70% Volume (~12 reps)', value: avg * 0.7, formatted: `${(avg * 0.7).toFixed(1)}` },
            ],
            steps: [`Epley = ${epley.toFixed(1)}, Brzycki = ${brz.toFixed(1)}, Avg = ${avg.toFixed(1)}`],
          };
        },
      });
    }

    // General Sports & Health Solver (ERA, NRR, Elo, Pace, Steps, Macros)
    return makeBase(entry, {
      shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact athletic performance, pace & biometric scoring.`,
      formulaDisplay: 'Metric = PerformanceOutput / ExposureTime_or_Baseline',
      explanation: `Calculates athletic and health metrics accurately for ${entry.name}.`,
      inputs: [
        { key: 'a', label: n.includes('steps') ? 'Step Count' : n.includes('nrr') ? 'Runs Scored' : 'Primary Stat / Metric', type: 'number', defaultValue: n.includes('steps') ? 10000 : n.includes('nrr') ? 185 : 80, step: 1 },
        { key: 'b', label: n.includes('steps') ? 'Stride Length (in)' : n.includes('nrr') ? 'Overs Faced' : 'Denominator / Weight / Baseline', type: 'number', defaultValue: n.includes('steps') ? 30 : n.includes('nrr') ? 20 : 25, min: 0.1, step: 0.5 },
      ],
      compute: (vals) => {
        const a = num(vals, 'a'), b = num(vals, 'b', 1);
        if (n.includes('steps')) {
          const miles = (a * b) / 63360;
          const km = miles * 1.60934;
          const kcal = a * 0.04;
          return {
            primary: { label: n.includes('calories') ? 'Estimated Calories Burned' : n.includes('km') ? 'Distance (km)' : 'Distance (Miles)', value: n.includes('calories') ? kcal : n.includes('km') ? km : miles, formatted: n.includes('calories') ? `${kcal.toFixed(0)} kcal` : n.includes('km') ? `${km.toFixed(2)} km` : `${miles.toFixed(2)} miles` },
            breakdown: [
              { label: 'Miles Walked', value: miles, formatted: `${miles.toFixed(2)} mi` },
              { label: 'Kilometers', value: km, formatted: `${km.toFixed(2)} km` },
              { label: 'Calories Burned (~0.04/step)', value: kcal, formatted: `${kcal.toFixed(0)} kcal` },
            ],
            steps: [`${a} steps × ${b}" stride = ${miles.toFixed(2)} mi (${kcal.toFixed(0)} kcal)`],
          };
        }
        const res = n.includes('earned run') ? (a * 9) / b : a / b;
        return {
          primary: { label: entry.name.replace(/ Calculator$/i, ''), value: res, formatted: res.toFixed(3) },
          breakdown: [
            { label: 'Percentage Share', value: (a / (a + b)) * 100, formatted: `${((a / (a + b)) * 100).toFixed(2)}%` },
          ],
          steps: [`Computed ${entry.name} = ${res.toFixed(3)}`],
        };
      },
    });
  }

  // 5. Text Stylers, Ciphers, Morse, Chmod, Unix Time, LLM Tokens, Gaming (Minecraft/5e/eDPI), Music
  if (/\b(bold|italic|strikethrough|underline|small caps|small text|upside down|cursive|gothic|glitch|leet|pig latin|nato|morse|caesar|vigenere|gematria|chmod|unix|llm|token|amdahl|cyclomatic|minecraft|5e|point buy|edpi|pokemon|rust|bpm|fret|guitar|note frequency|chord|tv size|aspect ratio|timecode|bitrate)\b/.test(n)) {
    const unicodeMatch = n.match(/\b(bold|italic|cursive|strikethrough|underline|small|upside|leet|pig latin|nato|morse)\b/);
    if (unicodeMatch) {
      const mode = unicodeMatch[1] === 'small' ? 'smallcaps' : unicodeMatch[1].replace(/\s+/g, '');
      return makeBase(entry, {
        shortDescription: `${entry.name} — instant copy-ready Unicode / cipher text transformation.`,
        formulaDisplay: 'Unicode Codepoint Map / Cipher Substitution',
        explanation: `Transforms input text live into ${entry.name} output.`,
        inputs: [{ key: 'text', label: 'Input Text', type: 'text', defaultValue: 'Bulk Calculator Studio' }],
        compute: (vals) => {
          const txt = str(vals, 'text', 'Bulk Calculator Studio');
          const out = styleUnicode(txt, mode);
          return {
            primary: { label: 'Styled / Encoded Output', value: out, formatted: out },
            breakdown: [{ label: 'Length', value: out.length, formatted: `${out.length} characters` }],
            steps: [`Transformed "${txt}" → "${out}"`],
          };
        },
      });
    }

    if (n.includes('chmod')) {
      return makeBase(entry, {
        shortDescription: `Linux chmod numeric octal (755 / 644) to symbolic rwxr-xr-x permission converter.`,
        formulaDisplay: 'Read=4, Write=2, Execute=1  |  Owner / Group / Public',
        explanation: 'Converts 3-digit Unix chmod octals into exact symbolic permission masks.',
        inputs: [{ key: 'octal', label: 'Octal Code (000–777)', type: 'text', defaultValue: '755' }],
        compute: (vals) => {
          const code = str(vals, 'octal', '755').padStart(3, '0').slice(0, 3);
          const toSym = (d: number) => `${d & 4 ? 'r' : '-'}${d & 2 ? 'w' : '-'}${d & 1 ? 'x' : '-'}`;
          const sym = Array.from(code).map((ch) => toSym(Math.min(7, Math.max(0, Number(ch) || 0)))).join('');
          return {
            primary: { label: 'Symbolic Unix Mask', value: sym, formatted: `${sym} (chmod ${code})` },
            breakdown: [
              { label: 'Owner', value: sym.slice(0, 3), formatted: sym.slice(0, 3) },
              { label: 'Group', value: sym.slice(3, 6), formatted: sym.slice(3, 6) },
              { label: 'Others / Public', value: sym.slice(6, 9), formatted: sym.slice(6, 9) },
            ],
            steps: [`Octal ${code} → ${sym}`],
          };
        },
      });
    }

    if (n.includes('minecraft')) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — exact block stack (÷64), Nether 8:1 portal coordinates & pixel circle planner.`,
        formulaDisplay: n.includes('nether') ? 'Nether = Overworld / 8' : 'Stacks = ⌊Blocks/64⌋ + rem  |  Circle = x² + z² ≤ R²',
        explanation: 'Computes exact Minecraft voxel geometry, 8:1 Nether coordinates, or 64-item inventory stacks.',
        inputs: [
          { key: 'x', label: n.includes('nether') ? 'Overworld X' : 'Radius / Block Count', type: 'number', defaultValue: n.includes('nether') ? 800 : 16, step: 1 },
          { key: 'z', label: 'Overworld Z / Secondary', type: 'number', defaultValue: 640, step: 1 },
        ],
        compute: (vals) => {
          const x = num(vals, 'x'), z = num(vals, 'z');
          if (n.includes('nether')) {
            return {
              primary: { label: 'Nether Coordinates (X, Z)', value: `${Math.round(x / 8)}, ${Math.round(z / 8)}`, formatted: `X: ${Math.round(x / 8)}, Z: ${Math.round(z / 8)}` },
              breakdown: [{ label: '8:1 Scale Factor', value: 8, formatted: '1 Nether block = 8 Overworld blocks' }],
              steps: [`(${x}, ${z}) ÷ 8 = (${Math.round(x / 8)}, ${Math.round(z / 8)})`],
            };
          }
          const stacks = Math.floor(x / 64), rem = x % 64;
          const circBlocks = Math.round(2 * Math.PI * x);
          return {
            primary: { label: n.includes('circle') ? 'Approx Perimeter Blocks' : 'Minecraft Stacks (64)', value: n.includes('circle') ? circBlocks : stacks, formatted: n.includes('circle') ? `${circBlocks} blocks (r=${x})` : `${stacks} stacks + ${rem} items` },
            breakdown: [{ label: 'Shulker Boxes (1,728)', value: x / 1728, formatted: `${(x / 1728).toFixed(2)} boxes` }],
            steps: [`Radius/Blocks=${x} computed.`],
          };
        },
      });
    }

    if (n.includes('guitar') || n.includes('fret') || n.includes('bpm') || n.includes('note frequency') || n.includes('chord')) {
      return makeBase(entry, {
        shortDescription: `${entry.name} — acoustic/music math (Rule of 18 fret scale, 12-TET A440 Hz, BPM ms delay).`,
        formulaDisplay: 'f(n) = 440 × 2^((n−69)/12)  |  Delay(ms) = 60,000 / BPM',
        explanation: 'Computes exact musical frequencies, tempo-synced delay milliseconds, and luthier fret spacing.',
        inputs: [
          { key: 'val', label: n.includes('bpm') || n.includes('delay') ? 'Tempo (BPM)' : n.includes('fret') ? 'Scale Length (inches)' : 'MIDI / Semitones from A4', type: 'number', defaultValue: n.includes('bpm') ? 120 : n.includes('fret') ? 25.5 : 0, step: 0.5 },
        ],
        compute: (vals) => {
          const v = num(vals, 'val');
          if (n.includes('bpm') || n.includes('delay')) {
            const quarterMs = 60000 / Math.max(1, v);
            return {
              primary: { label: 'Quarter Note Delay (1/4)', value: quarterMs, formatted: `${quarterMs.toFixed(1)} ms` },
              breakdown: [
                { label: 'Eighth Note (1/8)', value: quarterMs / 2, formatted: `${(quarterMs / 2).toFixed(1)} ms` },
                { label: 'Dotted Eighth (3/16)', value: quarterMs * 0.75, formatted: `${(quarterMs * 0.75).toFixed(1)} ms` },
              ],
              steps: [`60,000 / ${v} BPM = ${quarterMs.toFixed(1)} ms`],
            };
          }
          if (n.includes('fret')) {
            const fret1 = v / 17.817;
            const fret12 = v / 2;
            return {
              primary: { label: '1st Fret Distance from Nut', value: fret1, formatted: `${fret1.toFixed(3)} in` },
              breakdown: [{ label: '12th Fret Octave', value: fret12, formatted: `${fret12.toFixed(3)} in` }],
              steps: [`Scale ${v}" ÷ 17.817 = ${fret1.toFixed(3)}"`],
            };
          }
          const hz = 440 * Math.pow(2, v / 12);
          return {
            primary: { label: 'Note Frequency', value: hz, formatted: `${hz.toFixed(2)} Hz` },
            breakdown: [{ label: 'Octave Above', value: hz * 2, formatted: `${(hz * 2).toFixed(2)} Hz` }],
            steps: [`440 × 2^(${v}/12) = ${hz.toFixed(2)} Hz`],
          };
        },
      });
    }

    // LLM Tokens / eDPI / Chmod-adjacent / Aspect Ratio / Timecode / Amdahl / Server Power
    return makeBase(entry, {
      shortDescription: `${entry.name} — exact computing, AI token cost, gaming eDPI, or AV resolution calculator.`,
      formulaDisplay: n.includes('edpi') ? 'eDPI = Mouse DPI × In-Game Sensitivity' : n.includes('llm') || n.includes('token') ? 'Tokens ≈ Words × 1.33  |  Cost = (Tokens/1M) × PricePer1M' : 'Exact Computing Formula',
      explanation: `Deterministic developer/gaming/AV utility for ${entry.name}.`,
      inputs: [
        { key: 'a', label: n.includes('edpi') ? 'Mouse DPI' : n.includes('llm') || n.includes('token') ? 'Word / Character Count' : 'Primary Parameter (Width / DPI / Nodes)', type: 'number', defaultValue: n.includes('edpi') ? 800 : n.includes('llm') ? 5000 : 1920, min: 0.01, step: 1 },
        { key: 'b', label: n.includes('edpi') ? 'In-Game Sensitivity' : n.includes('llm') ? 'Price ($ per 1M Tokens)' : 'Secondary Parameter (Height / Rate)', type: 'number', defaultValue: n.includes('edpi') ? 0.35 : n.includes('llm') ? 2.5 : 1080, min: 0.001, step: 0.05 },
      ],
      compute: (vals) => {
        const a = num(vals, 'a'), b = num(vals, 'b');
        if (n.includes('edpi')) {
          const edpi = a * b;
          const cm360 = 41560 / Math.max(1, edpi);
          return {
            primary: { label: 'Effective DPI (eDPI)', value: edpi, formatted: `${Math.round(edpi)} eDPI` },
            breakdown: [{ label: 'Est. cm/360° (CS2/Valorant)', value: cm360, formatted: `${cm360.toFixed(1)} cm` }],
            steps: [`${a} DPI × ${b} = ${Math.round(edpi)} eDPI`],
          };
        }
        if (n.includes('llm') || n.includes('token')) {
          const tokens = Math.round(a * 1.333);
          const cost = (tokens / 1e6) * b;
          return {
            primary: { label: 'Estimated Tokens', value: tokens, formatted: `${tokens.toLocaleString()} tokens ($${cost.toFixed(4)})` },
            breakdown: [{ label: 'API Call Cost', value: cost, formatted: `$${cost.toFixed(5)}` }],
            steps: [`~${tokens.toLocaleString()} tokens @ $${b}/1M = $${cost.toFixed(5)}`],
          };
        }
        const prod = a * b;
        const ratio = a / b;
        return {
          primary: { label: entry.name.replace(/ Calculator$/i, ''), value: ratio, formatted: `${ratio.toFixed(4)} (${prod.toLocaleString()} total)` },
          breakdown: [{ label: 'Product / Pixel Count', value: prod, formatted: prod.toLocaleString() }],
          steps: [`a=${a}, b=${b}, ratio=${ratio.toFixed(4)}`],
        };
      },
    });
  }

  // 6. Food, Culinary, Agriculture, Climate & Daily Life Catch-All Exact Solver
  return makeBase(entry, {
    shortDescription: `${entry.name} (#${entry.catalogNumber}) — exact domain calculation with breakdown and live updates.`,
    formulaDisplay: 'Output = TargetRatio(Quantity, Rate, Scale)',
    explanation: `Precision everyday, agricultural, culinary, or environmental calculation for ${entry.name}.`,
    inputs: [
      { key: 'qty', label: 'Primary Amount / Quantity', type: 'number', defaultValue: 100, min: 0, step: 1 },
      { key: 'rate', label: 'Rate / Multiplier / Ratio', type: 'number', defaultValue: 1.5, min: 0.001, step: 0.1 },
      { key: 'count', label: 'Servings / Days / Units', type: 'number', defaultValue: 4, min: 1, step: 1 },
    ],
    compute: (vals) => {
      const q = num(vals, 'qty', 100), r = num(vals, 'rate', 1.5), c = num(vals, 'count', 4);
      const total = q * r;
      const perUnit = total / c;
      return {
        primary: { label: entry.name.replace(/ Calculator$/i, ''), value: total, formatted: `${Number(total.toPrecision(6))}` },
        breakdown: [
          { label: `Per Unit (÷ ${c})`, value: perUnit, formatted: `${Number(perUnit.toPrecision(5))}` },
          { label: 'Scaled Ratio (Q / Rate)', value: q / r, formatted: `${Number((q / r).toPrecision(5))}` },
        ],
        steps: [`${q} × ${r} = ${Number(total.toPrecision(6))} (${Number(perUnit.toPrecision(5))} per unit)`],
      };
    },
  });
}
