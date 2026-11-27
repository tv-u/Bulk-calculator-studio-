import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_FILE = path.join(ROOT, 'public/assets/aistudio/Paste_November_24__2026_-_4_30PM_215b2877');

const raw = fs.readFileSync(SRC_FILE, 'utf8');
const lines = raw.split(/\r?\n/);

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 15 domain categories matching Section 8 themes
const PART_TO_CATEGORY = (partNum, partTitle, nameLower) => {
  if (
    nameLower.includes('legal') ||
    nameLower.includes('notice period') ||
    nameLower.includes('severance') ||
    nameLower.includes('stamp duty') ||
    nameLower.includes('customs duty') ||
    nameLower.includes('import duty')
  ) {
    return partNum === 12 || partNum === 13 || partNum === 49 || partNum === 50
      ? partNum === 50
        ? 'business'
        : 'legal'
      : 'finance';
  }
  switch (partNum) {
    case 1:
    case 11:
    case 12:
    case 13:
    case 21:
    case 22:
    case 23:
      return 'finance';
    case 2:
    case 3:
    case 14:
    case 15:
    case 31:
    case 32:
    case 33:
    case 34:
      return 'mathematics';
    case 4:
    case 24:
    case 36:
      return 'health';
    case 25:
      return 'sports';
    case 37:
      return 'food';
    case 5:
    case 16:
    case 29:
    case 40:
    case 41:
    case 42:
    case 43:
    case 44:
    case 46:
      return 'engineering';
    case 6:
    case 28:
      return 'construction';
    case 7:
    case 47:
    case 48:
    case 49:
    case 50:
      return 'business';
    case 8:
      return 'education';
    case 9:
    case 17:
    case 35:
    case 38:
    case 39:
      return 'science';
    case 10:
      if (
        /(date|age|time|days|business days|countdown|world clock|fuel|mileage|trip|travel|tip|split bill|discount|unit)/.test(
          nameLower
        )
      ) {
        return 'daily-life';
      }
      return 'technology';
    case 18:
    case 19:
    case 30:
      return 'technology';
    case 20:
      return 'daily-life';
    case 26:
    case 45:
      return 'automotive';
    case 27:
      return 'agriculture';
    default:
      return 'mathematics';
  }
};

const CATEGORY_LABELS = {
  finance: 'Finance & Banking',
  mathematics: 'Mathematics & Statistics',
  health: 'Health & Medical',
  engineering: 'Engineering & Physics',
  construction: 'Construction & Architecture',
  business: 'Business, Marketing & HR',
  education: 'Education & Students',
  science: 'Science, Chemistry & Climate',
  technology: 'Technology, IT & Media',
  'daily-life': 'Daily Life & Converters',
  automotive: 'Automotive & Motorsports',
  agriculture: 'Agriculture & Farming',
  legal: 'Legal, Tax & Compliance',
  sports: 'Sports & Athletics',
  food: 'Nutrition, Food & Culinary',
};

// Map exact catalog entry to a specific deterministic solverId + domain family
function classifySolver(name, partNum, category) {
  const n = name.toLowerCase();

  // Live external network / domain tools
  if (
    /(dns lookup|dns propagation|reverse dns|whois lookup|ssl certificate|ssl expiry|tls configuration|domain age|domain expiry|mac address lookup|ping time)/.test(
      n
    )
  ) {
    return { toolKind: 'live-tool', solverFamily: 'techNet', solverKey: 'live_network_tool' };
  }

  // Flagship direct IDs already present in our 60 core calculators (prefer exact flagship ID when matched cleanly)
  const EXACT_FLAGSHIP = {
    'emi calculator': 'flagship:emi',
    'sip calculator': 'flagship:sip',
    'compound interest calculator': 'flagship:compound-interest',
    'simple interest calculator': 'flagship:simple-interest',
    'fd calculator': 'flagship:fd',
    'rd calculator': 'flagship:rd',
    'gst calculator': 'flagship:gst',
    'income tax calculator': 'flagship:income-tax',
    'indian income tax calculator': 'flagship:income-tax',
    'cagr calculator': 'flagship:cagr',
    'roi calculator': 'flagship:roi',
    'retirement calculator': 'flagship:retirement',
    'loan eligibility calculator': 'flagship:loan-eligibility',
    'discount calculator': 'flagship:discount',
    'percentage calculator': 'flagship:percentage',
    'scientific calculator': 'flagship:scientific',
    'fraction calculator': 'flagship:fraction',
    'ratio calculator': 'flagship:ratio',
    'quadratic equation calculator': 'flagship:equation-solver',
    'equation solver': 'flagship:equation-solver',
    'matrix calculator': 'flagship:matrix',
    'standard deviation calculator': 'flagship:statistics',
    'probability calculator': 'flagship:probability',
    'calculus calculator': 'flagship:calculus',
    'bmi calculator': 'flagship:bmi',
    'bmr calculator': 'flagship:bmr',
    'tdee calculator': 'flagship:tdee',
    'calorie calculator': 'flagship:calorie',
    'ideal weight calculator': 'flagship:ideal-weight',
    'protein calculator': 'flagship:protein',
    'water intake calculator': 'flagship:water-intake',
    'age calculator': 'flagship:age',
    'exact age calculator': 'flagship:age',
    "ohm's law calculator": 'flagship:ohms-law',
    'voltage calculator': 'flagship:voltage',
    'current calculator': 'flagship:current',
    'resistance calculator': 'flagship:resistance',
    'power calculator': 'flagship:power',
    'pressure calculator': 'flagship:pressure',
    'force calculator': 'flagship:force',
    'velocity calculator': 'flagship:velocity',
    'density calculator': 'flagship:density',
    'area calculator': 'flagship:area',
    'volume calculator': 'flagship:volume',
    'gpa calculator': 'flagship:gpa',
    'cgpa calculator': 'flagship:cgpa',
    'cgpa to percentage calculator': 'flagship:cgpa',
    'marks percentage calculator': 'flagship:marks-percentage',
    'grade calculator': 'flagship:grade',
    'attendance calculator': 'flagship:attendance',
    'study time calculator': 'flagship:study-time',
    'date difference calculator': 'flagship:date-difference',
    'fuel cost calculator': 'flagship:fuel-cost',
    'electricity bill calculator': 'flagship:electricity-bill',
    'land area calculator': 'flagship:land-measurement',
    'paint calculator': 'flagship:paint',
    'concrete calculator': 'flagship:concrete',
    'brick calculator': 'flagship:bricks',
    'data storage converter': 'flagship:storage-converter',
    'bandwidth calculator': 'flagship:bandwidth',
  };
  if (EXACT_FLAGSHIP[n] && !(n === 'power calculator' && partNum === 2)) {
    return { toolKind: 'calculator', solverFamily: 'flagship', solverKey: EXACT_FLAGSHIP[n] };
  }

  // Unit Converter variants
  if (
    /(length converter|weight converter|temperature converter|celsius to fahrenheit|fahrenheit to celsius|kelvin converter|area converter|volume converter|speed converter|pressure converter|energy converter|power converter|force converter|data unit converter|fuel unit converter|unit converter|unit conversion|acre to hectare|square footage|square meter|degree to radian|radian to degree|ohm to siemens|awg to mm)/.test(
      n
    )
  ) {
    return { toolKind: 'converter', solverFamily: 'unit', solverKey: 'unit_converter_variant' };
  }

  // Domain family classification
  // 1. Finance, Banking, Stock, Crypto, Insurance, Tax
  if (category === 'finance' || category === 'legal') {
    if (/(black scholes|option|delta|gamma|theta|vega|rho)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'finance', solverKey: 'options_black_scholes' };
    }
    if (/(brokerage|stt|stamp duty|intraday|delivery trading|futures trading|margin trading|leverage)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'finance', solverKey: 'trading_charges' };
    }
    if (/(forex|pip|currency pair|swap rate)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'finance', solverKey: 'forex_pip' };
    }
    if (/(impermanent loss|liquidity pool|defi|staking|crypto|bitcoin|ethereum|mining|halving|hashrate|gas fee|nft|token conversion)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'finance', solverKey: 'crypto_defi' };
    }
    if (/(sharpe|sortino|treynor|alpha|beta|information ratio|volatility|drawdown|rebalancing|asset allocation|portfolio|wacc|cost of equity|cost of debt|dcf|discounted cash|intrinsic value|gordon|dividend discount|p\/e|price earnings|price to book|price to sales|enterprise value|ebitda|free cash flow|operating cash|book value|earnings per share|earnings yield|stock)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'finance', solverKey: 'equity_valuation' };
    }
    if (/(tax|tds|vat|sales tax|hra|gratuity|pf|epf|eps|vpf|leave encashment|salary|ctc|wage|bonus|overtime|arrears|pay commission|da |dearness|pension|sukanya|atal|kisan|subsidy|ration|bpl|scholarship|capital gains|tax loss)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'finance', solverKey: 'tax_payroll' };
    }
    if (/(insurance|premium|claim|ncb|no claim|deductible|co-payment|surrender|endowment|money back|ulip|human life value|annuity|liability coverage|risk exposure|expected loss)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'finance', solverKey: 'insurance_risk' };
    }
    if (/(emi|loan|mortgage|refinance|pre-emi|credit card|debt|down payment|rent vs buy|affordability|balloon|deferred|grace period|ltv|dscr|interest coverage|current ratio|quick ratio|working capital)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'finance', solverKey: 'loan_credit' };
    }
    return { toolKind: 'calculator', solverFamily: 'finance', solverKey: 'investment_compounding' };
  }

  // 2. Mathematics, Geometry, Calculus, Number Theory, Statistics
  if (category === 'mathematics' || category === 'education') {
    if (category === 'education') {
      return { toolKind: 'calculator', solverFamily: 'math', solverKey: 'education_metrics' };
    }
    if (/(matrix|determinant|inverse matrix|eigenvalue|lu decomposition|qr decomposition|gaussian|gauss jordan|cramer|hessian|jacobian)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'math', solverKey: 'matrix_linear' };
    }
    if (/(vector|dot product|cross product|direction cosine|direction ratio|cartesian|polar|cylindrical|spherical|3d distance|2d distance|coordinate|midpoint|slope|line equation|plane|intersection)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'math', solverKey: 'vector_coordinate' };
    }
    if (/(derivative|integral|limit|l'hopital|taylor|maclaurin|fourier|laplace|z transform|differential|euler method|runge kutta|adams bashforth|newton raphson|bisection|secant|fixed point|interpolation|finite difference|gradient|divergence|curl|convolution|root finder|optimization)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'math', solverKey: 'calculus_numerical' };
    }
    if (/(prime|fibonacci|lucas|catalan|bell|stirling|partition|collatz|totient|carmichael|divisor|perfect number|amicable|abundant|deficient|modulo|modular|continued fraction|pell|diophantine|chinese remainder|euclidean|gcd|lcm|greatest common|least common|factorial)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'math', solverKey: 'number_theory' };
    }
    if (/(variance|standard deviation|mean|median|mode|range|average|z-score|quantile|percentile|quartile|interquartile|box plot|five number|outlier|tukey|skewness|kurtosis|moment|covariance|correlation|regression|r squared|standard error|margin of error|confidence|hypothesis|t test|z test|chi square|anova|f test|p value|significance|distribution|bayes|probability|permutation|combination|expected value|sample size|sampling|confusion matrix|accuracy|precision|recall|f1|specificity|sensitivity|roc auc|kappa|entropy|information gain|gini|k means|cosine similarity|jaccard|normalization|standardization|mae|mse|rmse|mape)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'math', solverKey: 'stats_probability' };
    }
    if (/(circle|circumference|diameter|radius|triangle|pythagorean|hypotenuse|heron|rectangle|square|parallelogram|rhombus|trapezoid|pentagon|hexagon|polygon|ellipse|sector|arc|chord|cone|cylinder|sphere|hemisphere|pyramid|prism|frustum|cube|cuboid|diagonal|surface area|perimeter|tetrahedron|octahedron|dodecahedron|icosahedron|polyhedron|circumcenter|incenter|orthocenter|centroid|parabola|hyperbola|conic|angle|sine|cosine|tangent|trigonometry|cosines)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'math', solverKey: 'geometry_trig' };
    }
    return { toolKind: 'calculator', solverFamily: 'math', solverKey: 'algebra_arithmetic' };
  }

  // 3. Health, Clinical, Sports, Food
  if (category === 'health' || category === 'sports' || category === 'food') {
    if (category === 'sports') {
      return { toolKind: 'calculator', solverFamily: 'health', solverKey: 'sports_athletics' };
    }
    if (category === 'food') {
      return { toolKind: 'calculator', solverFamily: 'health', solverKey: 'nutrition_culinary' };
    }
    if (/(gfr|creatinine|sodium|potassium|magnesium|phosphate|calcium|anion gap|osmolar|osmolality|blood volume|arterial pressure|pulse pressure|qtc|cha2ds2|has bled|wells|cardiac|apache|sofa|glasgow|curb 65|meld|child pugh|nih stroke|framingham|ascvd|chads2|shock index|ejection fraction|oxygen delivery|alveolar|dose|infusion|drip|fluid maintenance|free water|urine|proteinuria|albumin|pediatric|fractional excretion|bsa|body surface)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'health', solverKey: 'clinical_medical' };
    }
    if (/(pregnancy|due date|ovulation|period|conception|gestational|baby growth)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'health', solverKey: 'pregnancy_cycle' };
    }
    return { toolKind: 'calculator', solverFamily: 'health', solverKey: 'fitness_body' };
  }

  // 4. Construction, Agriculture, Automotive
  if (category === 'construction') {
    return { toolKind: 'calculator', solverFamily: 'constructionAgri', solverKey: 'construction_arch' };
  }
  if (category === 'agriculture') {
    return { toolKind: 'calculator', solverFamily: 'constructionAgri', solverKey: 'agriculture_farm' };
  }
  if (category === 'automotive') {
    return { toolKind: 'calculator', solverFamily: 'constructionAgri', solverKey: 'automotive_motorsport' };
  }

  // 5. Engineering & Physics (Parts 5, 16, 29, 40, 41, 42, 43, 44, 46)
  if (category === 'engineering') {
    if (partNum === 46 || /(solar|wind turbine|hydropower|hydro turbine|biomass|biogas|hydrogen|fuel cell|clean energy|renewable)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'constructionAgri', solverKey: 'renewable_solar' };
    }
    if (partNum === 40 || /(oee|overall equipment|takt|cycle time|lead time|throughput|wip|work in progress|cp |cpk|pp |ppk|eoq|reorder|safety stock|fifo|lifo|mrp|cnc|spindle|machining|milling|turning|drilling|lathe|welding|sheet metal|scrap|defect|yield|production|capacity utilization)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'businessHr', solverKey: 'manufacturing_ops' };
    }
    if (partNum === 29 || /(ohm|volt|current|resistor|resistance|capacitor|inductor|watt|power factor|phase|rms|inverter|ups|generator|breaker|fuse|wire|pcb|led|diode|transistor|op amp|rc |rl |lc |rlc|resonant|cutoff|reactance|impedance|admittance|transformer|motor|earthing|conduit|battery|frequency|wavelength)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'physicsEng', solverKey: 'electrical_circuits' };
    }
    if (partNum === 44 || /(hvac|btu|tonage|tonnage|air conditioner|refrigerat|cooling load|heating|duct|airflow|cfm|exhaust|ventilation|chiller|boiler|steam|condensate|cop|plumbing|pipe|septic|soak pit|sprinkler|geyser|heater|water tank|pump)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'physicsEng', solverKey: 'hvac_plumbing' };
    }
    if (partNum === 42 || /(rcc|beam|column|slab|footing|foundation|retaining wall|pile|earth pressure|bearing capacity|compaction|proctor|cbr|settlement|slope stability|earthwork|cut and fill|camber|pavement|asphalt|bitumen|superelevation|curve radius|surveying|leveling|traverse|base shear|seismic|dead load|live load)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'constructionAgri', solverKey: 'construction_arch' };
    }
    if (partNum === 43 || /(distillation|mccabe|reflux|absorption|stripping|extraction|evaporator|drying|crystallization|filtration|membrane|reverse osmosis|ro plant|cooling tower|heat exchanger|lmtd|fouling|npsh|cstr|pfr|reactor|mass balance|energy balance|residence time|darcy)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'chemBio', solverKey: 'chemical_process' };
    }
    return { toolKind: 'calculator', solverFamily: 'physicsEng', solverKey: 'mechanics_physics' };
  }

  // 6. Science, Chemistry, Biology, Astronomy, Weather
  if (category === 'science') {
    if (partNum === 38 || /(astronom|light year|parsec|star|stellar|magnitude|telescope|planet|orbital|kepler|satellite|geostationary|rocket|delta v|hohmann|moon|lunar|eclipse|sunrise|sunset|daylight|twilight|sidereal|julian|equatorial|galactic|celestial|meteor|exoplanet)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'dailyAstro', solverKey: 'astronomy_space' };
    }
    if (partNum === 39 || /(wind|humidity|dew point|wet bulb|heat index|humide?x|cloud|barometric|air density|lapse rate|rainfall|stormwater|watershed|evaporation|evapotranspiration|solar radiation|uv index|degree days|frost|climate|carbon|greenhouse|methane|co2|flood|drought|water balance|snow)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'dailyAstro', solverKey: 'weather_climate' };
    }
    if (partNum === 35 || /(dna|rna|gc content|at content|melting temp|primer|pcr|protein|amino|peptide|isoelectric|enzyme|michaelis|km |vmax|cell |bacterial|microbial|colony|dilution plate|population growth|logistic|allele|hardy weinberg|genetic|mendelian|punnett|pedigree|heterozygosity|species|shannon|simpson|biodiversity|ecological|biomass|oxygen demand|carrying capacity)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'chemBio', solverKey: 'biology_genetics' };
    }
    return { toolKind: 'calculator', solverFamily: 'chemBio', solverKey: 'chemistry_thermodynamics' };
  }

  // 7. Business, Marketing, E-commerce, SEO, HR, Logistics
  if (category === 'business') {
    if (partNum === 49 || /(employee|ctc|payroll|turnover|retention|attrition|absenteeism|workforce|manpower|staffing|headcount|fte|full time equivalent|overtime|shift|leave|maternity|paternity|notice|severance|bonus|recruitment|hire|time to fill|training|compa ratio|promotion|retirement age|pension)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'businessHr', solverKey: 'hr_workforce' };
    }
    if (partNum === 50 || /(shipping|freight|container|pallet|truck|axle|fleet|delivery|route|vehicle routing|cargo|volumetric|dimensional|air freight|sea freight|rail freight|courier|customs|import duty|export cost|landed cost|incoterms|warehouse|picking|packing|distribution|reverse logistics|order cycle|on time|perfect order|demand forecasting|logistics)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'businessHr', solverKey: 'logistics_supply' };
    }
    if (partNum === 48 || /(seo|keyword|serp|ctr|bounce rate|exit rate|page load|core web|largest contentful|cumulative layout|first input|interaction to next|backlink|domain authority|adsense|ad impression|fill rate|viewability|rpm|ecpm|publisher|popunder|cpm|cpc|affiliate|youtube|instagram|facebook|tiktok|influencer|email marketing)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'businessHr', solverKey: 'seo_ads_marketing' };
    }
    return { toolKind: 'calculator', solverFamily: 'businessHr', solverKey: 'ecommerce_business' };
  }

  // 8. Technology, CS, Networking, Media
  if (category === 'technology') {
    if (/(ip|cidr|subnet|vlsm|supernet|wildcard|mac address|port|throughput|latency|packet loss|jitter|wifi|wireless|poe|router|server capacity|cloud storage|data center|cdn|bandwidth|download|upload|data transfer)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'techNet', solverKey: 'networking_subnet' };
    }
    if (partNum === 30 || /(video|audio|mp3|wav|podcast|voiceover|speech|subtitle|srt|dubbing|frame|fps|slow motion|time lapse|camera|shutter|aperture|iso|depth of field|hyperfocal|focal length|crop factor|dpi|pixel|resolution|aspect ratio|image|gif|animation|media production)/.test(n)) {
      return { toolKind: 'calculator', solverFamily: 'techNet', solverKey: 'media_av_photo' };
    }
    return { toolKind: 'calculator', solverFamily: 'techNet', solverKey: 'cs_developer' };
  }

  // 9. Daily Life & Travel
  return { toolKind: 'calculator', solverFamily: 'dailyAstro', solverKey: 'daily_datetime_travel' };
}

let currentPartNum = 0;
let currentPartTitle = '';
const catalog = [];
const slugCounts = new Map();
const nameToIndices = new Map();

for (const line of lines) {
  const pm = line.match(/^### Part\s+(\d+)(?:\/\d+)?\s+—\s+(.+?)(?:\s*\(.*\))?$/);
  if (pm) {
    currentPartNum = Number(pm[1]);
    currentPartTitle = pm[2].trim();
    continue;
  }
  const m = line.match(/^\*\s+(.+?)\s*$/);
  if (m && !m[1].startsWith('[')) {
    const name = m[1].trim();
    const num = catalog.length + 1;
    const baseSlug = slugify(name);
    const seen = slugCounts.get(baseSlug) || 0;
    slugCounts.set(baseSlug, seen + 1);
    const slug = seen === 0 ? baseSlug : `${baseSlug}-${num}`;
    const category = PART_TO_CATEGORY(currentPartNum, currentPartTitle, name.toLowerCase());
    const { toolKind, solverFamily, solverKey } = classifySolver(name, currentPartNum, category);

    const nLow = name.toLowerCase();
    const existingCanonical = nameToIndices.get(nLow);
    if (!existingCanonical) {
      nameToIndices.set(nLow, slug);
    }

    const safetyClass =
      solverKey === 'clinical_medical' || (category === 'health' && /(gfr|creatinine|dose|score|anion|sodium|qt|cardiac)/.test(nLow))
        ? 'clinical'
        : category === 'finance' || category === 'legal'
        ? 'financial'
        : category === 'engineering' || category === 'construction'
        ? 'engineering'
        : 'standard';

    catalog.push({
      catalogNumber: num,
      id: slug,
      slug,
      name,
      partNumber: currentPartNum,
      subcategory: currentPartTitle,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      toolKind,
      safetyClass,
      solverFamily,
      solverKey,
      canonicalSlug: existingCanonical || slug,
      isDuplicateName: Boolean(existingCanonical),
      status: 'validated',
    });
  }
}

if (catalog.length !== 2500) {
  throw new Error(`Expected exactly 2500 base catalog items, got ${catalog.length}`);
}

const SUPP_FILE = path.join(ROOT, 'scripts/supplemental-100.json');
const supplemental = JSON.parse(fs.readFileSync(SUPP_FILE, 'utf8'));

for (const item of supplemental) {
  const num = catalog.length + 1;
  const slug = item.slug || slugify(item.name);
  if (slugCounts.has(slug)) {
    throw new Error(`Supplemental slug collision detected: ${slug}`);
  }
  if (nameToIndices.has(item.name.toLowerCase())) {
    throw new Error(`Supplemental duplicate name detected: ${item.name}`);
  }
  slugCounts.set(slug, 1);
  nameToIndices.set(item.name.toLowerCase(), slug);

  catalog.push({
    catalogNumber: num,
    id: slug,
    slug,
    name: item.name,
    partNumber: 51,
    subcategory: item.subcategory,
    category: item.category,
    categoryLabel: CATEGORY_LABELS[item.category] || item.category,
    toolKind: item.toolKind || 'calculator',
    safetyClass: item.safetyClass || 'standard',
    solverFamily: 'exact',
    solverKey: slug,
    canonicalSlug: slug,
    isDuplicateName: false,
    status: 'validated',
    longTail: item.longTail || undefined,
  });
}

if (catalog.length !== 2600) {
  throw new Error(`Expected exactly 2600 total catalog items, got ${catalog.length}`);
}

fs.mkdirSync(path.join(ROOT, 'public/reports'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'src/engine/generated'), { recursive: true });

// 1. catalog-master.json
fs.writeFileSync(
  path.join(ROOT, 'public/reports/catalog-master.json'),
  JSON.stringify(catalog, null, 2)
);

// 2. catalogIndex.json (compact for client bundle)
fs.writeFileSync(
  path.join(ROOT, 'src/engine/generated/catalogIndex.json'),
  JSON.stringify(catalog)
);

// 3. catalog-audit.csv
const csvHeader = 'catalogNumber,id,name,partNumber,subcategory,category,toolKind,safetyClass,solverFamily,solverKey,canonicalSlug,isDuplicateName,status\n';
const csvRows = catalog
  .map((c) =>
    [
      c.catalogNumber,
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      c.partNumber,
      `"${c.subcategory.replace(/"/g, '""')}"`,
      c.category,
      c.toolKind,
      c.safetyClass,
      c.solverFamily,
      c.solverKey,
      c.canonicalSlug,
      c.isDuplicateName,
      c.status,
    ].join(',')
  )
  .join('\n');
fs.writeFileSync(path.join(ROOT, 'public/reports/catalog-audit.csv'), csvHeader + csvRows);

// 4. duplicate-report.csv
const dupRows = catalog
  .filter((c) => c.isDuplicateName)
  .map((c) => `${c.catalogNumber},"${c.name.replace(/"/g, '""')}",${c.slug},${c.canonicalSlug}`)
  .join('\n');
fs.writeFileSync(
  path.join(ROOT, 'public/reports/duplicate-report.csv'),
  'catalogNumber,name,slug,canonicalSlug\n' + dupRows
);

// 5. category-index.json
const catSummary = {};
const solverSummary = {};
for (const c of catalog) {
  catSummary[c.category] = (catSummary[c.category] || 0) + 1;
  solverSummary[`${c.solverFamily}:${c.solverKey}`] =
    (solverSummary[`${c.solverFamily}:${c.solverKey}`] || 0) + 1;
}
fs.writeFileSync(
  path.join(ROOT, 'public/reports/category-index.json'),
  JSON.stringify({ total: catalog.length, categories: catSummary, solvers: solverSummary }, null, 2)
);

console.log(`Generated ${catalog.length} catalog successfully!`);
console.log('Categories:', catSummary);
