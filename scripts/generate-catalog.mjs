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
  throw new Error(`Expected exactly 2600 base+supplemental catalog items, got ${catalog.length}`);
}

const US_STATES_RE = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/;

function classifyExtendedEntry(name) {
  const n = name.toLowerCase();

  // 1. Unit & Measurement Converters (strictly units, formats, currency denominations, culinary measures)
  const UNIT_TO_UNIT_RE = /\b(converter|conversion|acreage|gaj|katha|bigha|cent to|ares to|nickels to|dimes to|pennies to|cents to|pence to|crore to|million to|billion to|number to|roman numeral|military time|cups to|tbsp to|tsp to|gallons to|quarts to|pints to|ounces to|oz to|grams to (cups|oz|lbs|kg|ml|fl|tsp|tbsp|calories)|gr to|g to|kg to|lbs to|ml to|cc to|liters to|mcg to|mg to|m to|meters to|feet to|foot to|inches to|in to|cm to|mm to|km to|miles to|yards to|knots to|mph to|kph to|m\/s to|psi to|bar to|kpa to|mpa to|atm to|torr to|mmhg to|pa to|ksi to|celsius|fahrenheit|kelvin|centigrade|watts to|dbm to|awg to|rem to px|px to|em to px|rgb to|hex to|hsl to|binary to|decimal to|fraction to|improper fraction to|mixed number to|hours to|days to|weeks to|minutes to|years to|stone to|pounds to|fluid ounces to|cubic feet to|cubic yards to|cubic meter to|cubic inches to|square feet to cubic|inches to fraction|inches to yard|inch to|inch lbs to|inch pounds to|nm to in|kilobytes to|mbps to|bytes to|lat long to|lumens to|lux to|hp to|kva to|wattage to|joules to|newton to|rms to|metric to|degree to|degrees to|radians to|pixels to|text to|lot size to)\b/;
  const NOT_UNIT_CONVERTER_RE = /\b(cash conversion|marketing conversion|ev to sales|cash flow to|yield to|gross to net|net to gross|salary|wage|loan to|debt to|price to|cost to|buy to|rent to|return to|steps to|round to|greatest to least|least to greatest|general to standard|standard to general|cartesian to polar|polar to|rectangular to|standard form to|circumference to|diameter to|sat score|neet marks|credits needed|distance to horizon|acceleration due to|energy to wavelength|wavelength to|grams to moles|delta to wye|conductivity to resistivity|signal to noise|roof pitch to|amp to wire|compression ratio to|power-to-weight|oil to gas|rain to snow|bc to ad|miles to dollars|percent to goal|letters to numbers|numbers to letters|frames to timecode|timecode to frame)\b/;
  if (UNIT_TO_UNIT_RE.test(n) && !NOT_UNIT_CONVERTER_RE.test(n)) {
    let cat = 'daily-life';
    let sub = 'Unit & Measurement Converters';
    if (/(psi|bar|kpa|mpa|atm|torr|mmhg|ksi|watt|amp|volt|joule|dbm|awg|newton|torque|lumen|lux|radiation|poise|stokes|enthalpy|calorie|hp to|kva|rms)/.test(n)) {
      cat = 'engineering';
      sub = 'Engineering Unit Converters';
    } else if (/(cup|tbsp|tsp|tablespoon|teaspoon|oz|pint|quart|gallon|gram|ml|cc to|gr to|cooking|butter|sugar)/.test(n)) {
      cat = 'food';
      sub = 'Culinary & Volume Converters';
    } else if (/(byte|kb|mb|gb|tb|mbps|gbps|binary|hex|octal|ascii|unicode|text to|pixel|rem|px|css|rgb|hsl)/.test(n)) {
      cat = 'technology';
      sub = 'Digital, Color & CSS Converters';
    } else if (/(cent|dollar|euro|pound|pence|penny|nickel|dime|crore|lakh|million|billion|currency)/.test(n)) {
      cat = 'finance';
      sub = 'Currency & Monetary Denomination Tools';
    } else if (/(degree|radian|decimal to percent|fraction to|mixed number|improper fraction|angle)/.test(n)) {
      cat = 'mathematics';
      sub = 'Math Format & Angle Converters';
    }
    return {
      category: cat,
      subcategory: sub,
      toolKind: 'converter',
      safetyClass: 'standard',
      solverFamily: 'extUnit',
      solverKey: 'unit_extended',
      longTail: 'exact NIST SI conversion factor with multi-unit table',
    };
  }

  // 2. US State / Global Tax, Paycheck, Finance, Real Estate & Economics
  if (
    US_STATES_RE.test(n) ||
    /\b(401k|403b|529|ira|roth|rmd|annuity|arm |mortgage|heloc|pmi|ltv|dscr|dti|arv|brrrr|ffo|affo|cap rate|grm|rent|lease|loan|emi|credit card|debt|tax|paycheck|salary|wage|overtime|bonus|dividend|stock|equity|wacc|capm|dcf|ebit|ebitda|eva|roic|roe|roa|ros|pe ratio|peg|graham number|altman z|dupont|gini|hhi|lerner|okun|phillips|taylor rule|money|bank|deposit|savings|cd |sinking fund|perpetuity|compound|interest|inflation|gdp|cpi|currency|forex|crypto|bitcoin|zakat|pag-ibig|elss|ssy|lumpsum|sip|valuation|margin|profit|markup|markdown|cogs|fifo|lifo|goodwill|amortization|refinance|escrow|earnest money|prorated|net worth|budget|50 30 20|70 20 10|28 36|3x rent|rule of 72|basis point|put call|black scholes|var |value at risk|beta|alpha|sharpe|sortino|treynor|jensen|ir35|paye|sdlt|lbtt|ltt|cgt|aus|uk |canada|ireland|nz |pakistan|philippines|uae gratuity|trump tariff|trump tax|fica|magi|agi|hsa vs ppo|s-corp|rsu|espp|macrs|ev to sales|free cash flow|cash flow to debt|yield to call|yield to maturity|gross to net|net to gross|miles to dollars|bond|xirr|afn|apc|avc|ear |ebt |emv |eps |coupon|actual cash value|cost of capital|economic value added|net present value|net income|operating income|retained earnings|market capitalization|residual income|capital gains|credit spread|effective duration|marginal cost|average fixed cost|deadweight loss|consumer surplus|price elasticity|unemployment|labor force|income percentile|fibonacci retracement|fisher equation|carry trade|forward rate|forward premium|cross exchange|discretionary income|disposable income|annual income|biweekly pay|semi monthly pay|weekly pay|pay raise|hours pay|post office monthly|working capital|accrual ratio|cash ratio|combined ratio|defensive interval|expense ratio|financial leverage|hedge ratio|loss ratio|operating cash|price to cash|price to earnings|reserve ratio|retention ratio|direct material price|days payable|average collection|year over year|sustainable growth|sell through|occupancy rate|investment fees|finance charge|blended rate|equivalent rate|cash conversion|appreciation|return on capital|lifetime earnings|monthly income|maturity value|optimal price|rate of return|real rate|home value|early retirement|discount rate|adr |cobb douglas|comparative advantage|expected utility|opportunity cost|price per share)\b/.test(n)
  ) {
    const isLegal = /\b(ir35|post judgment|alimony|child support|law|tax credit)\b/.test(n);
    return {
      category: isLegal ? 'legal' : 'finance',
      subcategory: US_STATES_RE.test(n)
        ? 'US State Tax, Property & Paycheck'
        : /(mortgage|rent|arv|brrrr|ffo|affo|heloc|pmi|real estate|home|land loan|3x rent|28 36|adr )/.test(n)
        ? 'Real Estate & Mortgage Modeling'
        : /(401k|403b|529|ira|roth|rmd|annuity|retirement|pension|fire)/.test(n)
        ? 'Retirement & Wealth Planning'
        : /(tax|paycheck|salary|wage|overtime|bonus|fica|paye|sdlt|zakat|pay|income)/.test(n)
        ? 'Income Tax, Payroll & Compliance'
        : 'Corporate Finance, Valuation & Economics',
      toolKind: 'calculator',
      safetyClass: 'financial',
      solverFamily: 'extFinance',
      solverKey: 'finance_extended',
      longTail: 'step by step financial formula with exact schedule',
    };
  }

  // 3. Standardized Exams, Academic Scores & Education
  if (
    /\b(sat|act|psat|preact|ap |ib |gre|gmat|lsat|mcat|usmle|comlex|naplex|mpre|oat|dat|cfa|frm|pmp|comptia|aws|azure|ccna|ielts|toefl|duolingo|pte|celpip|hsk|jlpt|topik|dele|cambridge english|gpa|gwa|sgpa|cgpa|ects|ucas|atar|gaokao|hkdse|vce|baccalaureate|cbse|icse|isc|clat|neet|gate|cuet|nmat|nata|nift|amc 8|math kangaroo|regents|staar|ged|hiset|clep|praxis|ati teas|hesi|clt|accuplacer|aleks|tsi|pert|hspt|ssat|isee|shsat|cogat|map growth|star reading|star math|iready|lexile|grade|graduate|graduation|thesis|dissertation|capstone|homework|school|kindergarten|homeschool|honor roll|credit recovery|dual enrollment|common app|volunteer hours|research hours|field trip|class average|spelling test|math facts|reading|study|acceptance rate|course credit)\b/.test(n)
  ) {
    return {
      category: 'education',
      subcategory: 'Standardized Exams, GPA & Academic Planning',
      toolKind: 'calculator',
      safetyClass: 'standard',
      solverFamily: 'extApplied',
      solverKey: 'education_extended',
      longTail: 'official exam scoring scale and percentile estimator',
    };
  }

  // 4. Clinical / Health / Medical / Nutrition
  if (
    /\b(bmi|bmr|rmr|tdee|body fat|body adiposity|waist|calorie deficit|calorie surplus|nutrient|fiber|sodium|potassium|magnesium|calcium|iron|vitamin|caffeine|sugar|macronutrient|meal|recipe|food|baking|oven|flour|baker|dough|bread|pizza|cake|rice to water|pasta|meat cooking|coffee|espresso|tea|alcohol|pediatric|dose|gfr|egfr|anion gap|osmolar|osmolality|blood volume|arterial pressure|pulse pressure|heart rate|qtc|qt interval|oxygen|respiratory|pack year|sleep|hydration|cockcroft|fractional excretion|urine|proteinuria|albumin|kidney|cha2ds2|has bled|wells|cardiac|apache|sofa|glasgow|curb 65|meld|child pugh|nih stroke|framingham|ascvd|chads2|shock index|ejection|alveolar|water deficit|fluid maintenance|iv |infusion|drip|gestation|pregnancy|reconstitution|bra size|sunscreen)\b/.test(n)
  ) {
    const isFood = /\b(meal|recipe|food|baking|oven|flour|baker|dough|bread|pizza|cake|rice|pasta|meat|coffee|espresso|tea|catering|grocery|restaurant|sugar|butter|lemonade)\b/.test(n);
    const isClinical = /\b(gfr|egfr|anion|osmolar|osmolality|qtc|qt |cha2ds2|has bled|wells|apache|sofa|glasgow|curb|meld|child pugh|nih stroke|framingham|ascvd|chads2|shock|ejection|alveolar|dose|infusion|drip|cockcroft|fractional|proteinuria|albumin|pediatric|sodium|potassium|magnesium|calcium|reconstitution|clinical)\b/.test(n);
    return {
      category: isFood ? 'food' : 'health',
      subcategory: isFood
        ? 'Culinary, Baking & Nutrition Ratios'
        : isClinical
        ? 'Clinical Medical Scoring & Dosing'
        : 'Body Composition, Nutrition & Wellness',
      toolKind: 'calculator',
      safetyClass: isClinical ? 'clinical' : 'standard',
      solverFamily: isFood ? 'extApplied' : isClinical ? 'extMathSci' : 'extApplied',
      solverKey: isFood ? 'daily_applied' : isClinical ? 'clinical_extended' : 'health_sports_extended',
      longTail: isFood ? 'exact culinary ratio and serving calculator' : 'validated clinical and health reference formula',
    };
  }

  // 5. Sports & Athletics
  if (
    /\b(1rm|one-rep|531|bench press|wilks|pace|marathon|5k|10k|running|sprint|stride|steps to|walking|cycling|bike|biking|swimming|rowing|triathlon|vo2|nfl|passer rating|baseball|era|whip|fip|obp|slugging|war calculator|basketball|per |true shooting|efg|soccer|football|cricket|run rate|nrr|duckworth|tennis|golf|bowling|hockey|goalie|badminton|volleyball|ski|scuba|mma|boxing|hiking|jump rope|burpee|elliptical|stair|vertical leap|dunk|ape index|elo |winning percentage|earned run average|batting strike|power-to-weight)\b/.test(n)
  ) {
    return {
      category: 'sports',
      subcategory: 'Sports Analytics, Training & Pace',
      toolKind: 'calculator',
      safetyClass: 'standard',
      solverFamily: 'extApplied',
      solverKey: 'health_sports_extended',
      longTail: 'sports performance metrics and training zone solver',
    };
  }

  // 6. Construction, Architecture, Carpentry, HVAC & Landscaping
  if (
    /\b(concrete|cement|brick|block|mortar|grout|rebar|sonotube|footing|slab|pier|retaining wall|excavation|gravel|crushed stone|pea gravel|limestone|flagstone|paver|asphalt|driveway|patio|sidewalk|curb|lumber|board foot|plywood|joist|rafter|birdsmouth|collar tie|truss|purlin|gable|gambrel|roof|shingle|siding|soffit|fascia|gutter|drywall|gypsum|stud wall|framing|flooring|hardwood|laminate|carpet|tile|backsplash|wainscoting|crown molding|baseboard|shiplap|wallpaper|paint|primer|stain|epoxy|caulk|sealant|adhesive|stucco|insulation|r-value|u-value|vapor barrier|window|door|stair|baluster|spindle|railing|ada ramp|ramp|deck|fence|pergola|gazebo|carport|shed|sauna|porch|sunroom|basement|bathroom|kitchen|cabinet|closet|countertop|shower|bathtub|remodel|renovation|mulch|topsoil|granite|river rock|rip rap|sod|grass seed|artificial turf|lawn|landscape|pond|pool|drain|septic|dry well|sprinkler|irrigation|hvac|btu|ac |air conditioner|furnace|boiler|duct|cfm|fan|exhaust|ventilation|chiller|heat pump|tankless|water heater|bearing wall|accent wall|earthquake retrofit|elevation grade|fire pit|foundation|clearance hole|material removal|speeds and feeds)\b/.test(n)
  ) {
    return {
      category: 'construction',
      subcategory: 'Construction, Carpentry & Home Projects',
      toolKind: 'calculator',
      safetyClass: 'engineering',
      solverFamily: 'extApplied',
      solverKey: 'construction_extended',
      longTail: 'accurate material takeoff and contractor estimator',
    };
  }

  // 7. Automotive, Motorsports, EV & Aviation
  if (
    /\b(car|auto|vehicle|truck|rv |motorcycle|tire|wheel|rim|axle|brake|rotor|engine|horsepower|torque|displacement|compression|camshaft|piston|connecting rod|valve|exhaust|header|carburetor|injector|fuel|mpg|octane|ethanol|e85|turbo|supercharger|intercooler|nitrous|radiator|coolant|oil change|transmission|gear ratio|speedometer|quarter mile|0-60|0–60|drag|trap speed|towing|trailer|payload|gvwr|ev |hybrid|rideshare|carpool|parking|toll|lug nut|backspacing|wheelbase|track width|spring rate|coilover|ride height|downforce|aerodynamic|air-fuel|air fuel|bsfc|gap insurance|diesel vs|commute cost)\b/.test(n)
  ) {
    return {
      category: 'automotive',
      subcategory: 'Automotive Performance, EV & Ownership',
      toolKind: 'calculator',
      safetyClass: 'standard',
      solverFamily: 'extApplied',
      solverKey: 'automotive_extended',
      longTail: 'exact automotive engineering and cost calculator',
    };
  }

  // 8. Agriculture, Animals & Climate / Renewable
  if (
    /\b(crop|seed|fertilizer|urea|dap|potash|npk|soil|lime|grain|tractor|livestock|cattle|cow|goat|sheep|horse|chicken|poultry|egg|aquaculture|fish|rabbit|llama|rat cage|animal|gestation|solar|wind turbine|hydropower|biomass|biogas|hydrogen|fuel cell|carbon|greenhouse|co2|methane|rainfall|rainwater|rain to snow|snow|stormwater|watershed|dew point|wet bulb|humidity|frost|uv index|weather|climate|composting|plastic|recycling|footprint|tree|mowing)\b/.test(n)
  ) {
    const isAgr = /\b(crop|seed|fertilizer|urea|dap|potash|npk|soil|lime|grain|tractor|livestock|cattle|cow|goat|sheep|horse|chicken|poultry|egg|aquaculture|fish|rabbit|llama|rat cage|animal|gestation|mowing|fcr)\b/.test(n);
    return {
      category: isAgr ? 'agriculture' : 'science',
      subcategory: isAgr ? 'Agriculture, Livestock & Agronomy' : 'Climate, Ecology & Renewable Energy',
      toolKind: 'calculator',
      safetyClass: 'standard',
      solverFamily: 'extApplied',
      solverKey: isAgr ? 'agri_env_extended' : 'climate_solar_extended',
      longTail: 'verified field yield and sustainability formula',
    };
  }

  // 9. Physics, Electronics, Optics, Mechanics, Chemistry & Astronomy
  if (
    /\b(ohm|volt|amp|watt|resistor|resistance|capacitor|capacitance|inductor|impedance|reactance|admittance|lm317|ne555|op amp|op-amp|mosfet|diode|transistor|rectifier|buck|boost|flyback|attenuator|pcb|wire|cable|breaker|fuse|transformer|inverter|ups|battery|led |antenna|fresnel|vswr|eirp|path loss|baud|modulation|crosstalk|thd|harmonic|snell|lens|mirror|refraction|brewster|diffraction|polarization|malus|force|velocity|acceleration|momentum|impulse|gravity|gravitational|kepler|orbit|escape velocity|rocket|delta v|hohmann|schwarzschild|black hole|hawking|redshift|hubble|drake|time dilation|length contraction|emc2|photoelectric|photon|de broglie|heisenberg|bohr|rydberg|planck|stefan|wien|blackbody|carnot|entropy|enthalpy|gibbs|heat|thermal|pendulum|harmonic motion|spring|hooke|suvat|kinematic|projectile|free fall|friction|torque|inertia|centripetal|coriolis|buoyancy|archimedes|bernoulli|reynolds|darcy|manning|weir|poiseuille|froude|mach|prandtl|nusselt|biot|knudsen|stress|strain|mohr|von mises|buckling|young|poisson|beam|shaft|brinell|vickers|rockwell|molar|molal|normality|mole|ph|poh|buffer|henderson|titration|stoichiometry|dilution|half-life|half life|decay|arrhenius|nernst|faraday|dna|rna|pcr|enzyme|hardy weinberg|punnett|earth curvature|reverberation|vibration|degree of unsaturation|hydrogen ion|intrinsic carrier|rate constant|calibration curve|earthquake|distance to horizon|wavelength|conductivity to resistivity|delta to wye|signal to noise)\b/.test(n)
  ) {
    const isSci = /\b(molar|molal|normality|mole|ph|poh|buffer|henderson|titration|stoichiometry|dilution|half-life|half life|decay|arrhenius|nernst|faraday|dna|rna|pcr|enzyme|hardy|punnett|schwarzschild|black hole|hawking|redshift|hubble|drake|kepler|orbit|planet|moon|eclipse|sidereal|julian|parsec|light year|astronom|star|telescope|exoplanet|bohr|rydberg|de broglie|heisenberg|photoelectric|coulomb|gauss|faraday|earth curvature|degree of unsaturation|hydrogen ion|rate constant|calibration curve|earthquake|distance to horizon)\b/.test(n);
    return {
      category: isSci ? 'science' : 'engineering',
      subcategory: isSci ? 'Physics, Chemistry & Astrophysics' : 'Electrical, Mechanical & Fluid Engineering',
      toolKind: 'calculator',
      safetyClass: 'engineering',
      solverFamily: 'extMathSci',
      solverKey: 'physics_sci_extended',
      longTail: 'exact scientific formula with SI unit derivation',
    };
  }

  // 10. Mathematics, Geometry, Trigonometry, Number Theory, Matrix & Statistics
  if (
    /\b(triangle|circle|sphere|hemisphere|cone|cylinder|cube|cuboid|pyramid|prism|frustum|torus|ellipsoid|tetrahedron|octahedron|dodecahedron|icosahedron|polyhedron|polygon|pentagon|hexagon|heptagon|octagon|decagon|dodecagon|rectangle|square|parallelogram|rhombus|trapezoid|kite|crescent|ellipse|parabola|hyperbola|conic|arc|chord|sector|semicircle|quarter circle|perimeter|area|volume|surface area|circumference|radius|diameter|diagonal|slant height|hypotenuse|pythagor|heron|angle|sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|arcsin|arccos|arctan|trigonomet|trig |vector|matrix|determinant|eigen|svd|cholesky|qr |lu |gauss|cramer|adjoint|cofactor|null space|tensor|slope|midpoint|distance|coordinate|centroid|circumcenter|incenter|orthocenter|latus rectum|fraction|decimal|percent|ratio|proportion|prime|modulo|modulus|modular|fibonacci|lucas|catalan|bell number|stirling|partition|collatz|totient|carmichael|divisor|perfect number|amicable|abundant|deficient|euclidean|gcd|gcf|lcm|lcd|factorial|exponent|power|root|log|antilog|polynomial|quadratic|cubic|linear|equation|inequality|foil|trinomial|binomial|completing the square|discriminant|synthetic division|variance|standard deviation|mean|median|mode|range|iqr|quartile|decile|percentile|z-score|z score|t-test|t test|t statistic|z test|chi-square|chi square|anova|f-distribution|f distribution|f statistic|p-value|p value|p-hat|confidence interval|margin of error|cohen|mann-whitney|mcnemar|pearson|spearman|regression|r squared|skewness|kurtosis|histogram|box plot|dot plot|stem-and-leaf|five number|five-number|outlier|tukey|probability|bayes|permutation|combination|dice|coin|odds|paradox|benford|monty hall|birthday|two envelopes|prisoners dilemma|pascals triangle|venn|truth table|set builder|union intersection|sig fig|significant|rounding|round to|order from|ordering|least to greatest|greatest to least|ascending|consecutive integers|place value|expanded form|number sequence|series|arithmetic|geometric|harmonic|rsa|luhn|interpolation|critical value|endpoint calculator|counting principle|binary operations|rational zeros|rationalize|singular values|rate of change)\b/.test(n)
  ) {
    return {
      category: 'mathematics',
      subcategory: /(triangle|circle|sphere|cone|cylinder|cube|pyramid|prism|torus|polygon|pentagon|hexagon|octagon|ellipse|parabola|hyperbola|angle|sin|cos|tan|area|volume|perimeter)/.test(n)
        ? 'Geometry, 3D Solids & Trigonometry'
        : /(variance|deviation|mean|median|iqr|quartile|regression|p-value|chi|anova|probability|dice|coin|odds|paradox|bayes|sample size|confidence)/.test(n)
        ? 'Statistics, Probability & Data Science'
        : 'Algebra, Matrices & Number Theory',
      toolKind: 'calculator',
      safetyClass: 'standard',
      solverFamily: 'extMathSci',
      solverKey: 'math_extended',
      longTail: 'step by step mathematical proof and exact answer',
    };
  }

  // 11. Technology, Computing, Ciphers, Text Tools, Media & Gaming
  if (
    /\b(binary|hex|octal|base64|cipher|vigenere|caesar|morse|ascii|unicode|utf|chmod|parity|hamming|checksum|crc|hmac|hash|jwt|uuid|guid|cron|unix|epoch|regex|json|xml|html|url|slug|token|llm|cpu|ram|server|amdahl|big o|algorithm|database|sql|subnet|cidr|ipv4|ipv6|vlsm|supernet|wildcard|bandwidth|throughput|latency|jitter|packet|wifi|poe|storage|bitrate|video|audio|fps|frame|timecode|slow motion|time lapse|camera|exposure|shutter|aperture|iso|depth of field|hyperfocal|focal length|crop factor|dpi|ppi|pixel|resolution|aspect ratio|projector|tv |screen|bold text|italic|strikethrough|underline|subscript|superscript|small caps|small text|upside down|mirror text|reverse text|title case|sentence case|uppercase|lowercase|cursive|gothic|glitch|wingdings|leet|pig latin|nato phonetic|gematria|minecraft|nether|end portal|pokemon|among us|dnd|5e|encounter|point buy|hit points|edpi|kd |raid|rust decay|bpm|chord|semitone|fret|music|vocal|note frequency|key signature|guitar|delay reverb|speaker box)\b/.test(n)
  ) {
    return {
      category: 'technology',
      subcategory: /(bold|italic|strikethrough|underline|subscript|superscript|small|upside|mirror|reverse|case|cursive|gothic|glitch|wingdings|leet|pig latin|nato|gematria|cipher|vigenere|caesar|morse)/.test(n)
        ? 'Text Styling, Ciphers & Encoding Tools'
        : /(minecraft|pokemon|among us|5e|edpi|kd|raid|rust|hit points)/.test(n)
        ? 'Gaming & Simulation Calculators'
        : 'Computing, AI Tokens, Networking & Media',
      toolKind: 'calculator',
      safetyClass: 'standard',
      solverFamily: 'extApplied',
      solverKey: 'tech_media_extended',
      longTail: 'instant interactive online utility with zero signup',
    };
  }

  // 12. Business, Marketing, Operations & Manufacturing
  if (
    /\b(business|marketing|roi|roas|cpc|cpm|cpa|cpl|ctr|cac|ltv|cltv|churn|nps|net promoter|retention|attrition|turnover|absen|bradford|dart rate|trir|oee|takt|cycle time|lead time|throughput|wip|cp |cpk|pp |ppk|eoq|reorder|safety stock|inventory|fifo|lifo|merchandise|shopify|amazon|ebay|etsy|flipkart|meesho|woocommerce|stripe|paypal|razorpay|upi|cod|shipping|freight|cbm|pallet|container|truck|fleet|route|landed cost|customs|incoterms|warehouse|supply chain|demand|man hours|billable|bill rate|consulting|freelance|employee|payroll|hr |recruitment|time to hire|compa ratio|severance|notice period|breakeven|break even|break-even|startup|runway|burndown|pert|dpmo|seo|serp|adsense|youtube|instagram|facebook|tiktok|influencer|affiliate|commission|revenue|sales|wholesale|retail|bundle|subscription|mrr|arr|meeting|cost of doing business)\b/.test(n)
  ) {
    return {
      category: 'business',
      subcategory: 'Business Operations, Marketing & Logistics',
      toolKind: 'calculator',
      safetyClass: 'financial',
      solverFamily: 'extFinance',
      solverKey: 'business_extended',
      longTail: 'enterprise KPI calculation and margin breakdown',
    };
  }

  // 13. Daily Life, Dates, Apparel Sizes, Crafts & General
  return {
    category: 'daily-life',
    subcategory: 'Everyday, Lifestyle, Sizes & Time Utilities',
    toolKind: 'calculator',
    safetyClass: 'standard',
    solverFamily: 'extApplied',
    solverKey: 'daily_applied',
    longTail: 'fast mobile friendly everyday calculation online',
  };
}

const PASTE_27_FILE = path.join(ROOT, 'public/assets/aistudio/Paste_November_27__2026_-_7_48PM_d322feb6');
if (fs.existsSync(PASTE_27_FILE)) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const raw27 = fs.readFileSync(PASTE_27_FILE, 'utf8');
  const lines27 = raw27
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !s.startsWith('In sabi') && !s.startsWith('Primum '));

  const existingNorms = new Set(catalog.map((c) => norm(c.name)));
  const existingSlugs = new Set(catalog.map((c) => c.slug));
  const seenPasteNorms = new Set();
  const seenPasteSlugs = new Set();

  for (const rawName of lines27) {
    const cleanName = rawName.replace(/\s+/g, ' ').trim();
    const nNorm = norm(cleanName);
    const baseSlug = slugify(cleanName);
    if (!baseSlug) continue;
    if (existingNorms.has(nNorm) || existingSlugs.has(baseSlug)) continue;
    if (seenPasteNorms.has(nNorm) || seenPasteSlugs.has(baseSlug)) continue;

    seenPasteNorms.add(nNorm);
    seenPasteSlugs.add(baseSlug);

    const num = catalog.length + 1;
    let slug = baseSlug;
    if (slugCounts.has(slug)) {
      slug = `${baseSlug}-${num}`;
    }
    slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
    existingNorms.add(nNorm);
    existingSlugs.add(slug);

    const meta = classifyExtendedEntry(cleanName);
    catalog.push({
      catalogNumber: num,
      id: slug,
      slug,
      name: cleanName,
      partNumber: 52 + Math.floor((num - 2601) / 100),
      subcategory: meta.subcategory,
      category: meta.category,
      categoryLabel: CATEGORY_LABELS[meta.category] || meta.category,
      toolKind: meta.toolKind,
      safetyClass: meta.safetyClass,
      solverFamily: meta.solverFamily,
      solverKey: meta.solverKey,
      canonicalSlug: slug,
      isDuplicateName: false,
      status: 'validated',
      longTail: meta.longTail,
    });
  }
}

if (catalog.length < 5700) {
  throw new Error(`Expected >= 5700 total catalog items after extended paste merge, got ${catalog.length}`);
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
