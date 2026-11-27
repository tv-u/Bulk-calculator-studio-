import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Compass,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  GitBranch,
  Globe,
  HelpCircle,
  Home,
  LayoutDashboard,
  Menu,
  Moon,
  Palette,
  Ruler,
  Search,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Sun,
  Wrench,
  X,
} from 'lucide-react';
import { THEME_PRESETS, useStudio } from '../../context/StudioContext';
import { resolvePageTheme } from '../../theme/pageThemes';
import { SUPPORTED_LANGUAGES, isSupportedLanguage } from '../../i18n/languages';
import { CATALOG_2500, CATALOG_CATEGORIES, resolveCatalogEntryMeta } from '../../engine/calculators';
import { BrandLogoMark } from '../brand/BrandLogo';
import { CosmicBackground } from '../background/CosmicBackground';
import { CrystalModal } from '../motion/MotionLibrary';
import { LightControlStudioPanel } from '../studio/LightControlStudioPanel';
import { SmartSearch } from '../search/SmartSearch';
import { OfflineIndicator, PWAInstallButton } from '../pwa/PWAComponents';
import { MonetagAdSlot } from '../ads/MonetagAdSlot';

const VALID_CATEGORY_IDS = new Set<string>(CATALOG_CATEGORIES.map((c) => c.id));

const SIDEBAR_GROUPS = [
  {
    title: 'Core Workspace',
    items: [
      { to: '/', labelKey: 'nav.home', label: 'Home', icon: Home },
      { to: '/dashboard', labelKey: 'nav.dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/calculators', labelKey: 'nav.calculators', label: 'All 5,729 Calculators', icon: Calculator },
      { to: '/categories', labelKey: 'nav.categories', label: '15 Categories', icon: Compass },
    ],
  },
  {
    title: 'Studios & Builders',
    items: [
      { to: '/bulk-calculator', labelKey: 'nav.bulk', label: 'Bulk Studio', icon: FileSpreadsheet },
      { to: '/custom-calculator-builder', labelKey: 'nav.custom', label: 'Custom Builder', icon: Wrench },
      { to: '/workflow-builder', labelKey: 'nav.workflow', label: 'Workflow Builder', icon: GitBranch },
      { to: '/data-analysis', labelKey: 'nav.analysis', label: 'Data Analysis', icon: BarChart3 },
    ],
  },
  {
    title: 'Domain Labs & Tools',
    items: [
      { to: '/math-lab', labelKey: 'nav.mathLab', label: 'Mathematics Lab', icon: FlaskConical },
      { to: '/finance-lab', labelKey: 'nav.financeLab', label: 'Finance Lab', icon: Activity },
      { to: '/unit-converter', labelKey: 'nav.unitConverter', label: 'Unit Converter', icon: Ruler },
      { to: '/currency-converter', labelKey: 'nav.currencyConverter', label: 'Currency Converter', icon: Coins },
      { to: '/ai-assistant', labelKey: 'nav.ai', label: 'AI Assistant', icon: Bot },
      { to: '/formula-library', labelKey: 'nav.formulas', label: 'Formula Library', icon: BookOpen },
    ],
  },
  {
    title: 'Records & System',
    items: [
      { to: '/reports', labelKey: 'nav.reports', label: 'Reports Center', icon: FileText },
      { to: '/saved', labelKey: 'nav.saved', label: 'Saved & Compare', icon: Sparkles },
      { to: '/settings', labelKey: 'nav.settings', label: 'Settings', icon: Settings },
      { to: '/help', labelKey: 'nav.help', label: 'Help Center', icon: HelpCircle },
      { to: '/admin', labelKey: 'nav.admin', label: 'Admin Console', icon: Shield },
    ],
  },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pageTheme = resolvePageTheme(location.pathname);
  const {
    light,
    applyThemePreset,
    isLightStudioOpen,
    setLightStudioOpen,
    language,
    setLanguage,
    t,
    toasts,
  } = useStudio();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);

  const isDark = THEME_PRESETS[light.theme]?.isDark ?? true;

  const isCalculatorDetailView = React.useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 2 && parts[0] === 'calculators') return true;
    if (parts.length === 3 && isSupportedLanguage(parts[0])) return true;
    if (parts.length === 2 && VALID_CATEGORY_IDS.has(parts[0]) && Boolean(resolveCatalogEntryMeta(parts[1]))) {
      return true;
    }
    if (parts.length === 1 && !isSupportedLanguage(parts[0]) && Boolean(resolveCatalogEntryMeta(parts[0]))) {
      return true;
    }
    return false;
  }, [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--page-accent', pageTheme.primary);
    root.style.setProperty('--page-accent-2', pageTheme.secondary);
    root.style.setProperty('--page-gradient', pageTheme.gradient);
  }, [pageTheme]);

  // Sync URL /:lang prefix if user navigated directly to a localized URL
  useEffect(() => {
    const first = location.pathname.split('/').filter(Boolean)[0];
    if (first && isSupportedLanguage(first) && first !== language) {
      setLanguage(first);
    }
  }, [location.pathname, language, setLanguage]);

  useEffect(() => {
    setMobileDrawerOpen(false);
    setToolsMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  const handleLanguageChange = (nextLang: string) => {
    setLanguage(nextLang);
    const segs = location.pathname.split('/').filter(Boolean);
    if (segs.length > 0 && isSupportedLanguage(segs[0])) {
      segs[0] = nextLang;
      navigate(`/${segs.join('/')}${location.search}`);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors ${
      isActive
        ? 'text-slate-950 dark:text-white underline decoration-2 underline-offset-8'
        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
    }`;

  return (
    <div
      className="min-h-screen flex flex-col text-slate-900 dark:text-slate-100"
      style={{ filter: `brightness(${light.ambientBrightness})` }}
    >
      <CosmicBackground
        primaryAccent={pageTheme.primary}
        secondaryAccent={pageTheme.secondary}
      />

      {!isCalculatorDetailView && (
        <>
          {/* Sticky 3-Zone Header */}
          <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
            <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:gap-6">
              {/* Zone 1: Brand Wordmark */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-200/60 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <Link
                  to="/"
                  className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
                >
                  <BrandLogoMark className="h-8 w-8 shrink-0" />
                  <span className="font-display text-sm font-bold tracking-tight sm:text-base">
                    BULK CALCULATOR STUDIO
                  </span>
                </Link>
              </div>

              {/* Zone 2: Concise Single-Line Nav Links */}
              <nav className="hidden lg:flex items-center gap-5" aria-label="Main navigation">
                <NavLink to="/" end className={navLinkClass}>
                  {t('nav.home', 'Home')}
                </NavLink>
                <NavLink to="/calculators" className={navLinkClass}>
                  {t('nav.calculators', 'Calculators')}
                </NavLink>
                <NavLink to="/bulk-calculator" className={navLinkClass}>
                  {t('nav.bulk', 'Bulk Studio')}
                </NavLink>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setToolsMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    <span>{t('nav.labs', 'Labs & Tools')}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {toolsMenuOpen && (
                    <div
                      className="liquid-glass absolute start-0 top-9 z-50 grid w-64 grid-cols-1 gap-1 rounded-2xl p-2 shadow-2xl"
                      onMouseLeave={() => setToolsMenuOpen(false)}
                    >
                      {[
                        { to: '/categories', label: '15 Calculator Categories' },
                        { to: '/custom-calculator-builder', label: 'Custom Calculator Builder' },
                        { to: '/workflow-builder', label: 'Visual Workflow Builder' },
                        { to: '/math-lab', label: 'Mathematics Lab' },
                        { to: '/finance-lab', label: 'Financial Simulation Lab' },
                        { to: '/data-analysis', label: 'Data Analysis Studio' },
                        { to: '/unit-converter', label: 'Universal Unit Converter' },
                        { to: '/currency-converter', label: 'Currency Converter' },
                        { to: '/formula-library', label: 'Formula Library' },
                        { to: '/ai-assistant', label: 'AI Calculation Assistant' },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className="rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-500/10 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <NavLink to="/dashboard" className={navLinkClass}>
                  {t('nav.dashboard', 'Dashboard')}
                </NavLink>
              </nav>

              {/* Zone 3: Search + 50-Language Switcher + Theme + Light Studio */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(true)}
                  className="flex h-10 items-center gap-2 rounded-xl border border-slate-200/80 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  aria-label="Global search"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('nav.search', 'Search')}</span>
                </button>

                <label className="hidden md:inline-flex items-center gap-1 rounded-xl border border-slate-200/80 px-2 h-10 text-xs dark:border-slate-700/80">
                  <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <select
                    aria-label="Select interface language"
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none dark:text-slate-200 max-w-[105px]"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code} className="bg-white dark:bg-slate-900">
                        {l.nativeName} ({l.code})
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => applyThemePreset(isDark ? 'premium-light' : 'cosmic')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 text-slate-600 hover:bg-slate-100 dark:border-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-800 shrink-0"
                  aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Cosmic Dark Theme'}
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Cosmic Dark Mode'}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLightStudioOpen(true)}
                  className="btn-3d flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition hover:opacity-95"
                  style={{ background: 'var(--page-gradient)' }}
                  aria-label="Open Light Control Studio"
                >
                  <Palette className="h-4 w-4" />
                  <span className="hidden xl:inline">{t('nav.lightStudio', 'Light Studio')}</span>
                </button>

                <div className="hidden sm:block">
                  <PWAInstallButton compact />
                </div>
              </div>
            </div>
          </header>

          {/* Non-intrusive Header Monetag Smart Link Strip */}
          <div className="mx-auto w-full max-w-[1440px] px-4 pt-3 sm:px-6">
            <MonetagAdSlot placement="headerBanner" variant="strip" />
          </div>
        </>
      )}

      {/* Main Body with Collapsible Desktop Sidebar */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 gap-6 px-4 py-4 pb-20 sm:px-6 lg:pb-8">
        {!isCalculatorDetailView && (
          <aside
            className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 ${
              sidebarCollapsed ? 'w-16' : 'w-60'
            }`}
            aria-label="Sidebar navigation"
          >
            <div className="liquid-glass sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col rounded-2xl p-2.5">
              <div className="mb-2 flex items-center justify-between px-2 py-1">
                {!sidebarCollapsed && (
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Navigation
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((c) => !c)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pe-0.5">
                {SIDEBAR_GROUPS.map((grp) => (
                  <div key={grp.title}>
                    {!sidebarCollapsed && (
                      <div className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {grp.title}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {grp.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            title={item.label}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition ${
                                isActive
                                  ? 'text-white shadow-sm'
                                  : 'text-slate-700 hover:bg-slate-200/50 dark:text-slate-300 dark:hover:bg-slate-800/70'
                              }`
                            }
                            style={({ isActive }) =>
                              isActive ? { background: 'var(--page-gradient)' } : undefined
                            }
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!sidebarCollapsed && (
                              <span className="truncate">{t(item.labelKey, item.label)}</span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Viewport */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Professional Footer + Active Monetag Footer Strip */}
      {!isCalculatorDetailView && (
        <footer className="border-t border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/75 pb-20 lg:pb-8">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 space-y-8">
            <MonetagAdSlot placement="footerSponsored" variant="strip" />

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center gap-2.5">
                  <BrandLogoMark className="h-8 w-8" />
                  <span className="font-display text-base font-bold">BULK CALCULATOR STUDIO</span>
                </div>
                <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">
                  {CATALOG_2500.length.toLocaleString()} verified calculators across 15 domains and 50 languages. Precision math, finance, engineering, live network tools, and bulk CSV automation.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <PWAInstallButton />
                  <select
                    aria-label="Footer language selector"
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white/80 px-2.5 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-900"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.nativeName} — {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Popular Calculators
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li><Link to={language === 'en' ? '/calculators/emi-calculator/' : `/${language}/finance/emi-calculator`} className="hover:underline">EMI Calculator</Link></li>
                  <li><Link to={language === 'en' ? '/calculators/amortization-calculator/' : `/${language}/finance/amortization-calculator`} className="hover:underline">Amortization Calculator</Link></li>
                  <li><Link to={language === 'en' ? '/calculators/auto-loan-calculator/' : `/${language}/finance/auto-loan-calculator`} className="hover:underline">Auto Loan Calculator</Link></li>
                  <li><Link to={language === 'en' ? '/calculators/bmi-calculator/' : `/${language}/health/bmi-calculator`} className="hover:underline">BMI Calculator</Link></li>
                  <li><Link to={language === 'en' ? '/calculators/percentage-calculator/' : `/${language}/mathematics/percentage-calculator`} className="hover:underline">Percentage Calculator</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Studios &amp; Labs
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li><Link to="/bulk-calculator" className="hover:underline">Bulk Calculation Studio</Link></li>
                  <li><Link to="/custom-calculator-builder" className="hover:underline">Custom Builder</Link></li>
                  <li><Link to="/workflow-builder" className="hover:underline">Workflow Builder</Link></li>
                  <li><Link to="/math-lab" className="hover:underline">Mathematics Lab</Link></li>
                  <li><Link to="/finance-lab" className="hover:underline">Finance Lab</Link></li>
                  <li><Link to="/data-analysis" className="hover:underline">Data Analysis Studio</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Company &amp; Legal
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li><Link to="/developer" className="hover:underline">Developer / API Docs</Link></li>
                  <li><Link to="/about" className="hover:underline">About Us</Link></li>
                  <li><Link to="/help" className="hover:underline">Help Center</Link></li>
                  <li><Link to="/contact" className="hover:underline">Contact Us</Link></li>
                  <li><Link to="/privacy" className="hover:underline">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="hover:underline">Terms &amp; Conditions</Link></li>
                  <li><Link to="/disclaimer" className="hover:underline">Disclaimer</Link></li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-200/70 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center">
              <p>© {new Date().getFullYear()} BULK CALCULATOR STUDIO. All {CATALOG_2500.length.toLocaleString()} deterministic engines verified.</p>
              <div className="flex items-center gap-4">
                <Link to="/categories" className="hover:underline">Categories</Link>
                <Link to="/formula-library" className="hover:underline">Formula Library</Link>
                <Link to="/reports" className="hover:underline">Reports</Link>
                <Link to="/settings" className="hover:underline">Settings</Link>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Android-like Mobile Bottom Navigation Bar */}
      {!isCalculatorDetailView && (
        <nav
          aria-label="Mobile quick navigation"
          className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 border-t border-slate-200/80 bg-white/95 backdrop-blur-md pb-safe dark:border-slate-800/80 dark:bg-slate-950/95 lg:hidden"
        >
          {[
            { to: '/', label: t('nav.home', 'Home'), icon: Home },
            { to: '/calculators', label: CATALOG_2500.length.toLocaleString(), icon: Calculator },
            { to: '/bulk-calculator', label: t('nav.bulk', 'Bulk'), icon: FileSpreadsheet },
            { to: '/dashboard', label: t('nav.dashboard', 'Dash'), icon: LayoutDashboard },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-transform active:scale-95 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                        isActive ? 'bg-blue-500/15 dark:bg-blue-500/25' : ''
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="truncate max-w-[64px]">{tab.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setLightStudioOpen(true)}
            className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-500 active:scale-95 transition-transform dark:text-slate-400"
          >
            <span className="flex h-7 w-11 items-center justify-center rounded-full">
              <Sliders className="h-4 w-4" />
            </span>
            <span className="truncate max-w-[64px]">{t('nav.lightStudio', 'Theme')}</span>
          </button>
        </nav>
      )}

      {/* Mobile Touch Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="liquid-glass relative z-10 flex h-full w-72 max-w-[82vw] flex-col p-4 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200/60 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BrandLogoMark className="h-7 w-7" />
                <span className="font-display text-sm font-bold">BULK CALCULATOR</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Language (50)
              </label>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-4">
              {SIDEBAR_GROUPS.map((grp) => (
                <div key={grp.title}>
                  <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {grp.title}
                  </div>
                  <div className="space-y-0.5">
                    {grp.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === '/'}
                          className={({ isActive }) =>
                            `flex min-h-[42px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
                              isActive
                                ? 'text-white'
                                : 'text-slate-700 hover:bg-slate-200/50 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`
                          }
                          style={({ isActive }) =>
                            isActive ? { background: 'var(--page-gradient)' } : undefined
                          }
                        >
                          <Icon className="h-4 w-4" />
                          <span>{t(item.labelKey, item.label)}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      <CrystalModal
        open={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
        title={`Smart ${CATALOG_2500.length.toLocaleString()}-Calculator Search`}
        maxWidth="max-w-2xl"
      >
        <div className="min-h-[320px]">
          <SmartSearch
            variant="header"
            autoFocus
            onSelect={() => setMobileSearchOpen(false)}
          />
        </div>
      </CrystalModal>

      {/* Global Light Control Studio Modal */}
      <CrystalModal
        open={isLightStudioOpen}
        onClose={() => setLightStudioOpen(false)}
        title="LIGHT CONTROL STUDIO"
        maxWidth="max-w-4xl"
      >
        <LightControlStudioPanel />
      </CrystalModal>

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Toast Stack */}
      <div className="fixed end-4 bottom-16 z-50 flex flex-col gap-2 md:bottom-4" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`liquid-glass rounded-xl px-4 py-2.5 text-xs font-medium shadow-lg ${
              toast.kind === 'error'
                ? 'border-rose-500/50 text-rose-700 dark:text-rose-300'
                : toast.kind === 'success'
                ? 'border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
};
