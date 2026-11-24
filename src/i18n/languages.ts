export interface LanguageSpec {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  numberLocale: 'en-US' | 'en-IN';
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageSpec[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', numberLocale: 'en-US', region: 'Global' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', numberLocale: 'en-IN', region: 'India' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr', numberLocale: 'en-IN', region: 'India / Bangladesh' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr', numberLocale: 'en-IN', region: 'India' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr', numberLocale: 'en-IN', region: 'India' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr', numberLocale: 'en-IN', region: 'India' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl', numberLocale: 'en-IN', region: 'South Asia' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr', numberLocale: 'en-IN', region: 'India' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr', numberLocale: 'en-IN', region: 'India' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr', numberLocale: 'en-IN', region: 'India' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr', numberLocale: 'en-IN', region: 'India' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', dir: 'ltr', numberLocale: 'en-IN', region: 'India' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', dir: 'ltr', numberLocale: 'en-IN', region: 'India' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', dir: 'ltr', numberLocale: 'en-IN', region: 'Nepal / India' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', dir: 'ltr', numberLocale: 'en-US', region: 'Sri Lanka' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr', numberLocale: 'en-US', region: 'China' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', dir: 'ltr', numberLocale: 'en-US', region: 'Taiwan / HK' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr', numberLocale: 'en-US', region: 'Japan' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr', numberLocale: 'en-US', region: 'Korea' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr', numberLocale: 'en-US', region: 'Vietnam' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', dir: 'ltr', numberLocale: 'en-US', region: 'Thailand' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr', numberLocale: 'en-US', region: 'Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr', numberLocale: 'en-US', region: 'Malaysia' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', dir: 'ltr', numberLocale: 'en-US', region: 'Philippines' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', numberLocale: 'en-US', region: 'MENA' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', dir: 'rtl', numberLocale: 'en-US', region: 'Iran' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', dir: 'rtl', numberLocale: 'en-US', region: 'Israel' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', numberLocale: 'en-US', region: 'Turkey' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', numberLocale: 'en-US', region: 'Global' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr', numberLocale: 'en-US', region: 'Global' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr', numberLocale: 'en-US', region: 'DACH' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr', numberLocale: 'en-US', region: 'Brazil / PT' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr', numberLocale: 'en-US', region: 'Italy' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr', numberLocale: 'en-US', region: 'NL / BE' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr', numberLocale: 'en-US', region: 'Poland' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr', numberLocale: 'en-US', region: 'Eastern Europe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr', numberLocale: 'en-US', region: 'Ukraine' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', dir: 'ltr', numberLocale: 'en-US', region: 'Sweden' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', dir: 'ltr', numberLocale: 'en-US', region: 'Norway' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', dir: 'ltr', numberLocale: 'en-US', region: 'Denmark' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', dir: 'ltr', numberLocale: 'en-US', region: 'Finland' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', dir: 'ltr', numberLocale: 'en-US', region: 'Greece' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', dir: 'ltr', numberLocale: 'en-US', region: 'Czechia' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', dir: 'ltr', numberLocale: 'en-US', region: 'Romania' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', dir: 'ltr', numberLocale: 'en-US', region: 'Hungary' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', dir: 'ltr', numberLocale: 'en-US', region: 'Bulgaria' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', dir: 'ltr', numberLocale: 'en-US', region: 'Serbia' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', dir: 'ltr', numberLocale: 'en-US', region: 'Croatia' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', dir: 'ltr', numberLocale: 'en-US', region: 'Slovakia' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr', numberLocale: 'en-US', region: 'East Africa' },
];

export const LANGUAGE_BY_CODE = new Map<string, LanguageSpec>(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l])
);

export const RTL_LANGUAGE_CODES = new Set(['ar', 'ur', 'he', 'fa']);

export function isSupportedLanguage(code: string): boolean {
  return LANGUAGE_BY_CODE.has(code);
}

export function getLanguageSpec(code: string): LanguageSpec {
  return LANGUAGE_BY_CODE.get(code) || SUPPORTED_LANGUAGES[0];
}

export const EN_BASE_MESSAGES: Record<string, string> = {
  'brand.name': 'BULK CALCULATOR STUDIO',
  'brand.tagline': 'One Studio. Unlimited Calculations. Real Results.',
  'nav.home': 'Home',
  'nav.calculators': 'Calculators',
  'nav.bulk': 'Bulk Studio',
  'nav.labs': 'Labs & Tools',
  'nav.dashboard': 'Dashboard',
  'nav.categories': 'Categories',
  'nav.search': 'Search',
  'nav.lightStudio': 'Light Studio',
  'nav.admin': 'Admin Console',
  'hero.badge': '2,500+ Verified Calculators · 50 Languages',
  'hero.title': 'Every Formula. Real Precision. Instant Bulk Scale.',
  'hero.subtitle': 'Explore 2,500 deterministic calculators across 15 domains with high-precision financial math, bulk CSV computation, live network diagnostics, and instant PDF reports.',
  'hero.exploreAll': 'Explore 2,500 Calculators',
  'hero.openBulk': 'Open Bulk Studio',
  'search.placeholder': 'Search 2,500 calculators, formulas, Hindi terms (byaj, kist)...',
  'calc.calculate': 'Calculate',
  'calc.reset': 'Reset Defaults',
  'calc.downloadPdf': 'Download PDF Report',
  'calc.save': 'Save Result',
  'calc.copy': 'Copy Summary',
  'calc.share': 'Share',
  'calc.formula': 'Mathematical Formula',
  'calc.explanation': 'How This Works',
  'calc.assumptions': 'Assumptions & Scope',
  'calc.disclaimer': 'Important Disclaimer',
  'calc.related': 'Related Calculators',
  'calc.liveRun': 'Run Live Network Diagnostic',
  'ad.sponsored': 'Sponsored · Advertisement',
  'ad.partnerLink': 'Monetag Partner Link',
};

// Hinglish / Hindi / Global transliteration aliases mapped to canonical calculator slugs
export const TRANSLITERATION_ALIASES: Record<string, string[]> = {
  byaj: ['emi-calculator', 'compound-interest-calculator', 'simple-interest-calculator'],
  kist: ['emi-calculator', 'home-loan-calculator', 'car-loan-calculator'],
  karz: ['loan-calculator', 'debt-payoff-calculator', 'loan-eligibility-calculator'],
  nivesh: ['sip-calculator', 'mutual-fund-calculator', 'ppf-calculator'],
  munafa: ['profit-and-loss-calculator', 'roi-calculator'],
  chhoot: ['discount-calculator'],
  pratishat: ['percentage-calculator', 'marks-percentage-calculator'],
  vajan: ['bmi-calculator', 'ideal-weight-calculator'],
  umr: ['age-calculator', 'exact-age-calculator'],
  bijli: ['electricity-bill-calculator', 'ohms-law-calculator'],
  zameen: ['land-area-calculator', 'square-footage-calculator'],
  kheti: ['fertilizer-calculator', 'seed-rate-calculator', 'irrigation-calculator'],
  tankhwa: ['salary-calculator', 'take-home-salary-calculator', 'income-tax-calculator'],
  hisab: ['basic-calculator', 'scientific-calculator'],
  ganit: ['scientific-calculator', 'quadratic-equation-calculator', 'matrix-calculator'],
  tarikh: ['date-difference-calculator', 'age-calculator'],
  petrol: ['fuel-cost-calculator', 'mileage-calculator'],
  dawa: ['dosage-calculator', 'creatinine-clearance-calculator'],
  khel: ['net-run-rate-calculator', 'marathon-pace-calculator'],
  khana: ['recipe-scaling-calculator', 'calorie-calculator'],
};
