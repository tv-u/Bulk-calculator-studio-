import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  Lock,
  Play,
  RotateCcw,
  Search,
  Shield,
  Upload,
} from 'lucide-react';
import { CATALOG_2500 } from '../engine/catalogResolver';
import { evaluateSafeFormula } from '../engine/safeMath';
import { useStudio } from '../context/StudioContext';
import { DocumentHead } from '../components/seo/DocumentHead';
import { LiquidGlassReveal, MagneticButton } from '../components/motion/MotionLibrary';
import { MonetagAdSlot } from '../components/ads/MonetagAdSlot';

interface AdminOverview {
  unpublishedCalculators: string[];
  importedCalculators: Array<{ slug: string; name: string; category: string; formula: string }>;
  importSnapshots: Array<{ id: string; timestamp: string; count: number }>;
  ads: {
    enabled: boolean;
    directLink: string;
    frequencyCapMinutes: number;
    placements: {
      headerBanner: boolean;
      homeSponsoredCard: boolean;
      resultPromoCta: boolean;
      dashboardBanner: boolean;
      contentPageCard: boolean;
      footerSponsored: boolean;
    };
    clicksByPlacement: Record<string, number>;
    totalClicks: number;
  };
  auditLog: Array<{ timestamp: string; action: string; detail: string }>;
  systemHealth: {
    uptimeSeconds: number;
    aiConfigured: boolean;
    rateCacheEntries: number;
    nodeVersion: string;
  };
}

interface AuditData {
  categories?: Record<string, number>;
  i18n?: {
    generatedAt: string;
    languages: Array<{
      code: string;
      totalKeys: number;
      localizedKeys: number;
      fallbackEnglishKeys: number;
      coveragePct: number;
    }>;
  };
  duplicatesCsv?: string;
}

type AdminTab = 'monetag' | 'catalog' | 'importer' | 'i18n' | 'tests';

const SAMPLE_IMPORT_JSON = JSON.stringify(
  [
    {
      name: 'SaaS Quick Ratio Calculator',
      category: 'business',
      categoryLabel: 'Business & SaaS',
      formula: 'a / b',
      labelA: 'New + Expansion MRR ($)',
      labelB: 'Churned + Contraction MRR ($)',
      defaultInputA: 24000,
      defaultInputB: 6000,
      unit: 'x',
    },
  ],
  null,
  2
);

export const AdminPage: React.FC = () => {
  const { refreshPublicConfig, showToast } = useStudio();
  const [authStatus, setAuthStatus] = useState<{ configured: boolean; envOverride: boolean } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('monetag');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [saving, setSaving] = useState(false);

  // Catalog filter
  const [catQuery, setCatQuery] = useState('');
  // Bulk importer
  const [importPayload, setImportPayload] = useState(SAMPLE_IMPORT_JSON);
  const [importBusy, setImportBusy] = useState(false);
  // Regression test runner
  const [testResults, setTestResults] = useState<{
    totalChecked: number;
    passed: number;
    failures: Array<{ slug: string; error: string }>;
    durationMs: number;
  } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/status');
      const data = (await res.json()) as { configured: boolean; envOverride: boolean };
      setAuthStatus(data);
    } catch {
      setAuthError('Unable to reach server admin status.');
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const loadOverview = useCallback(async (authToken: string) => {
    const [ovRes, audRes] = await Promise.all([
      fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${authToken}` } }),
      fetch('/api/admin/audit', { headers: { Authorization: `Bearer ${authToken}` } }),
    ]);
    if (!ovRes.ok) {
      setToken(null);
      setAuthError('Session expired. Please sign in again.');
      return;
    }
    setOverview((await ovRes.json()) as AdminOverview);
    if (audRes.ok) {
      setAudit((await audRes.json()) as AuditData);
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const endpoint = authStatus?.configured ? '/api/admin/login' : '/api/admin/claim';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const data = (await res.json()) as { ok?: boolean; token?: string; error?: string };
    if (!res.ok || !data.token) {
      setAuthError(data.error || 'Authentication failed.');
      return;
    }
    setToken(data.token);
    setPasscode('');
    await loadStatus();
    await loadOverview(data.token);
  };

  const handleSaveConfig = async () => {
    if (!token || !overview) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          unpublishedCalculators: overview.unpublishedCalculators,
          ads: {
            enabled: overview.ads.enabled,
            directLink: overview.ads.directLink,
            frequencyCapMinutes: overview.ads.frequencyCapMinutes,
            placements: overview.ads.placements,
          },
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(data.error || 'Failed to save configuration.', 'error');
      } else {
        showToast('Admin configuration saved and synced.', 'success');
        await refreshPublicConfig();
        await loadOverview(token);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleCalcPublish = (slug: string) => {
    if (!overview) return;
    const isHidden = overview.unpublishedCalculators.includes(slug);
    const next = isHidden
      ? overview.unpublishedCalculators.filter((x) => x !== slug)
      : [...overview.unpublishedCalculators, slug];
    setOverview({ ...overview, unpublishedCalculators: next });
  };

  const parsedImportPreview = useMemo(() => {
    const raw = importPayload.trim();
    if (!raw) return { items: [], error: null as string | null };
    try {
      if (raw.startsWith('[') || raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        return { items: arr, error: null };
      }
      // CSV parse: name,category,formula,labelA,labelB,defaultInputA,defaultInputB
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const startIdx = lines[0].toLowerCase().includes('formula') ? 1 : 0;
      const items = lines.slice(startIdx).map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        return {
          name: cols[0] || '',
          category: cols[1] || 'business',
          formula: cols[2] || 'a + b',
          labelA: cols[3] || 'Input A (a)',
          labelB: cols[4] || 'Input B (b)',
          defaultInputA: Number(cols[5] ?? 100) || 100,
          defaultInputB: Number(cols[6] ?? 10) || 10,
        };
      });
      return { items, error: null };
    } catch (err) {
      return { items: [], error: err instanceof Error ? err.message : 'Invalid JSON/CSV format.' };
    }
  }, [importPayload]);

  const handleBulkImport = async () => {
    if (!token || parsedImportPreview.items.length === 0) return;
    setImportBusy(true);
    try {
      for (const item of parsedImportPreview.items) {
        evaluateSafeFormula(String(item.formula || ''), {
          a: Number(item.defaultInputA ?? 100),
          b: Number(item.defaultInputB ?? 10),
        });
      }
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: parsedImportPreview.items }),
      });
      const data = (await res.json()) as { ok?: boolean; importedCount?: number; error?: string };
      if (!res.ok) {
        showToast(data.error || 'Import failed.', 'error');
      } else {
        showToast(`Imported ${data.importedCount} calculator(s) cleanly.`, 'success');
        await refreshPublicConfig();
        await loadOverview(token);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Formula validation failed.', 'error');
    } finally {
      setImportBusy(false);
    }
  };

  const handleRollbackImport = async () => {
    if (!token) return;
    const res = await fetch('/api/admin/rollback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(data.error || 'No rollback snapshot available.', 'error');
      return;
    }
    showToast('Rolled back imported calculators to previous snapshot.', 'success');
    await refreshPublicConfig();
    await loadOverview(token);
  };

  const handleRunRegressionSample = async () => {
    const { resolveCalculatorSync } = await import('../engine/catalogResolverSync');
    const start = performance.now();
    const failures: Array<{ slug: string; error: string }> = [];
    // Run across all 2,500 items deterministically
    let passed = 0;
    for (const entry of CATALOG_2500) {
      try {
        const def = resolveCalculatorSync(entry.slug);
        if (!def) throw new Error('Resolver returned undefined');
        const defaults: Record<string, number | string> = {};
        for (const inp of def.inputs) defaults[inp.key] = inp.defaultValue;
        const out = def.compute(defaults, { locale: 'en-US', currency: 'USD' });
        if (!out.primary || !out.primary.formatted) throw new Error('Missing primary formatted metric');
        passed += 1;
      } catch (err) {
        failures.push({
          slug: entry.slug,
          error: err instanceof Error ? err.message : 'Execution failed',
        });
      }
    }
    setTestResults({
      totalChecked: CATALOG_2500.length,
      passed,
      failures,
      durationMs: Math.round(performance.now() - start),
    });
  };

  const filteredCatalog = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    const list = q
      ? CATALOG_2500.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.slug.includes(q) ||
            c.category.includes(q) ||
            `#${c.catalogNumber}` === q
        )
      : CATALOG_2500;
    return list.slice(0, 60);
  }, [catQuery]);

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Admin Control Center v2.0 – BULK CALCULATOR STUDIO"
        description={`Protected admin management for ${CATALOG_2500.length.toLocaleString()} calculators, Monetag Smart Link ads, Bulk CSV/JSON Importer, 50-language audit, and regression testing.`}
        noIndex
      />

      <LiquidGlassReveal className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield className="h-4 w-4 text-rose-500" />
              <span>Server-Verified Session · v2.0 Enterprise Console</span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold">Admin Control Center</h1>
          </div>
          {token && overview && (
            <MagneticButton variant="primary" onClick={() => void handleSaveConfig()} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Publish Config'}
            </MagneticButton>
          )}
        </div>
      </LiquidGlassReveal>

      {!token ? (
        <LiquidGlassReveal className="mx-auto max-w-md p-6 space-y-4">
          <div className="flex items-center gap-2 font-display text-base font-semibold">
            <Lock className="h-4 w-4 text-rose-500" />
            <span>
              {authStatus?.configured
                ? 'Admin Sign-In'
                : 'Initial Admin Setup (Claim Passcode)'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {authStatus?.configured
              ? `Enter your configured admin passcode to unlock Monetag revenue controls, ${CATALOG_2500.length.toLocaleString()} catalog management, and bulk importer.`
              : 'No ADMIN_PASSCODE environment secret is set yet. Create an admin passcode (min 8 chars) to lock and claim this console.'}
          </p>
          <form onSubmit={(e) => void handleAuthSubmit(e)} className="space-y-3">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter admin passcode..."
              minLength={authStatus?.configured ? 1 : 8}
              required
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            {authError && <p className="text-xs text-rose-500">{authError}</p>}
            <MagneticButton type="submit" variant="primary" className="w-full">
              {authStatus?.configured ? 'Unlock Admin Console' : 'Claim Admin Passcode'}
            </MagneticButton>
          </form>
        </LiquidGlassReveal>
      ) : overview ? (
        <div className="space-y-6">
          {/* Admin Tab Switcher */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['monetag', 'Monetag Revenue & Ads'],
                ['catalog', `${CATALOG_2500.length.toLocaleString()} Catalog (${CATALOG_2500.length - overview.unpublishedCalculators.length} Live)`],
                ['importer', `Bulk Importer (${overview.importedCalculators.length})`],
                ['i18n', '50-Language Coverage'],
                ['tests', `${CATALOG_2500.length.toLocaleString()} Regression Runner`],
              ] as const
            ).map(([tabKey, tabLabel]) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === tabKey
                    ? 'text-white shadow-sm'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                style={activeTab === tabKey ? { background: 'var(--page-gradient)' } : undefined}
              >
                {tabLabel}
              </button>
            ))}
          </div>

          {activeTab === 'monetag' && (
            <LiquidGlassReveal className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold">Monetag Smart Link Revenue Center</h2>
                <p className="text-xs text-slate-500">
                  Direct Smart Link Active: {overview.ads.directLink} · Total Verified Clicks: {overview.ads.totalClicks} · /ads.txt live
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 text-xs">
                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
                    <span className="font-medium">Enable Monetag Smart Link Placements</span>
                    <input
                      type="checkbox"
                      checked={overview.ads.enabled}
                      onChange={(e) =>
                        setOverview({
                          ...overview,
                          ads: { ...overview.ads, enabled: e.target.checked },
                        })
                      }
                      className="h-4 w-4 accent-rose-500"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="font-medium">Active Monetag Smart Link URL</span>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={overview.ads.directLink}
                        onChange={(e) =>
                          setOverview({
                            ...overview,
                            ads: { ...overview.ads, directLink: e.target.value },
                          })
                        }
                        className="min-h-[40px] flex-1 rounded-xl border border-slate-300 bg-white px-3 font-mono dark:border-slate-700 dark:bg-slate-900"
                      />
                      <a
                        href={overview.ads.directLink}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Test <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <span className="font-medium">Frequency Limit (Minutes)</span>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      value={overview.ads.frequencyCapMinutes}
                      onChange={(e) =>
                        setOverview({
                          ...overview,
                          ads: { ...overview.ads, frequencyCapMinutes: Number(e.target.value) },
                        })
                      }
                      className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 font-mono dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-slate-500">All 6 Sponsored Placements ({overview.ads.totalClicks} total clicks)</div>
                  {(
                    [
                      ['headerBanner', 'Top Header Partner Strip'],
                      ['homeSponsoredCard', 'Home Sponsored Card'],
                      ['resultPromoCta', 'Calculator Result Promo CTA'],
                      ['dashboardBanner', 'Dashboard Banner'],
                      ['contentPageCard', 'Directory / Formula Content Card'],
                      ['footerSponsored', 'Footer Partner Strip'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between rounded-xl border border-slate-200/70 p-2.5 dark:border-slate-800">
                      <span>
                        {label} ({overview.ads.clicksByPlacement[key] || 0} clicks)
                      </span>
                      <input
                        type="checkbox"
                        checked={overview.ads.placements[key] ?? true}
                        onChange={(e) =>
                          setOverview({
                            ...overview,
                            ads: {
                              ...overview.ads,
                              placements: {
                                ...overview.ads.placements,
                                [key]: e.target.checked,
                              },
                            },
                          })
                        }
                        className="h-4 w-4 accent-rose-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <div className="mb-2 text-xs font-semibold text-slate-500">Live Placement Preview</div>
                <MonetagAdSlot placement="homeSponsoredCard" variant="compact" />
              </div>
            </LiquidGlassReveal>
          )}

          {activeTab === 'catalog' && (
            <LiquidGlassReveal className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-lg font-bold">
                  {CATALOG_2500.length.toLocaleString()} Master Catalog ({CATALOG_2500.length - overview.unpublishedCalculators.length} / {CATALOG_2500.length} Published)
                </h2>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={catQuery}
                    onChange={(e) => setCatQuery(e.target.value)}
                    placeholder={`Filter ${CATALOG_2500.length.toLocaleString()} tools (showing top 60)...`}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 ps-9 pe-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>
              <div className="grid max-h-96 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 text-xs">
                {filteredCatalog.map((c) => {
                  const published = !overview.unpublishedCalculators.includes(c.slug);
                  return (
                    <label
                      key={c.slug}
                      className="flex items-center justify-between rounded-xl border border-slate-200/70 px-3 py-2 dark:border-slate-800"
                    >
                      <span className="truncate pe-2 font-medium">
                        #{c.catalogNumber} {c.name}
                      </span>
                      <input
                        type="checkbox"
                        checked={published}
                        onChange={() => toggleCalcPublish(c.slug)}
                        className="h-4 w-4 shrink-0 accent-emerald-500"
                      />
                    </label>
                  );
                })}
              </div>
            </LiquidGlassReveal>
          )}

          {activeTab === 'importer' && (
            <LiquidGlassReveal className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">Bulk Calculator CSV / JSON Importer</h2>
                  <p className="text-xs text-slate-500">
                    Validate safe AST formulas (variables a, b), preview records, publish live, or roll back snapshots ({overview.importSnapshots.length} saved).
                  </p>
                </div>
                <MagneticButton
                  variant="outline"
                  onClick={() => void handleRollbackImport()}
                  disabled={overview.importSnapshots.length === 0}
                >
                  <RotateCcw className="h-4 w-4" /> Rollback Last Import
                </MagneticButton>
              </div>

              <textarea
                rows={8}
                value={importPayload}
                onChange={(e) => setImportPayload(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white/90 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              />

              {parsedImportPreview.error ? (
                <p className="text-xs text-rose-500">Parse error: {parsedImportPreview.error}</p>
              ) : (
                <div className="rounded-xl border border-slate-200/70 p-3 text-xs dark:border-slate-800">
                  Preview: <strong>{parsedImportPreview.items.length}</strong> valid item(s) ready (e.g.{' '}
                  {parsedImportPreview.items[0]?.name || '-'})
                </div>
              )}

              <MagneticButton
                variant="primary"
                onClick={() => void handleBulkImport()}
                disabled={importBusy || parsedImportPreview.items.length === 0}
              >
                <Upload className="h-4 w-4" />
                {importBusy ? 'Validating & Importing...' : 'Validate & Import Live'}
              </MagneticButton>
            </LiquidGlassReveal>
          )}

          {activeTab === 'i18n' && (
            <LiquidGlassReveal className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                <h2 className="font-display text-lg font-bold">50-Language Coverage Audit</h2>
              </div>
              {audit?.i18n ? (
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5 text-xs">
                  {audit.i18n.languages.map((lang) => (
                    <div
                      key={lang.code}
                      className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-800"
                    >
                      <div className="font-mono font-bold">{lang.code}</div>
                      <div className="text-slate-500">
                        {lang.localizedKeys}/{lang.totalKeys} keys ({lang.coveragePct}%)
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Loading i18n audit report...</p>
              )}
            </LiquidGlassReveal>
          )}

          {activeTab === 'tests' && (
            <LiquidGlassReveal className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">{CATALOG_2500.length.toLocaleString()}-Calculator Regression Test Runner</h2>
                  <p className="text-xs text-slate-500">
                    Executes resolveCalculatorSync + compute(defaults) against all {CATALOG_2500.length.toLocaleString()} catalog calculators in real time.
                  </p>
                </div>
                <MagneticButton variant="primary" onClick={() => void handleRunRegressionSample()}>
                  <Play className="h-4 w-4" /> Run Full {CATALOG_2500.length.toLocaleString()} Suite Now
                </MagneticButton>
              </div>
              {testResults && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      Passed {testResults.passed} / {testResults.totalChecked} calculators in {testResults.durationMs} ms
                    </span>
                  </div>
                  {testResults.failures.length > 0 && (
                    <pre className="text-rose-500">{JSON.stringify(testResults.failures.slice(0, 10), null, 2)}</pre>
                  )}
                </div>
              )}
            </LiquidGlassReveal>
          )}

          {/* System Health & Audit Log */}
          <div className="grid gap-6 lg:grid-cols-2">
            <LiquidGlassReveal className="p-5 space-y-2 text-xs">
              <h2 className="font-display text-base font-semibold">Server System Health</h2>
              <div>Node Runtime: {overview.systemHealth.nodeVersion}</div>
              <div>Server Uptime: {overview.systemHealth.uptimeSeconds}s</div>
              <div>Gemini AI Secret: {overview.systemHealth.aiConfigured ? 'Configured' : 'Not Configured'}</div>
              <div>Cached Currency Pairs: {overview.systemHealth.rateCacheEntries}</div>
            </LiquidGlassReveal>

            <LiquidGlassReveal className="p-5 space-y-2 text-xs">
              <h2 className="font-display text-base font-semibold">Recent Security Audit Log</h2>
              <div className="max-h-40 space-y-1.5 overflow-y-auto font-mono">
                {overview.auditLog.length === 0 ? (
                  <p className="text-slate-500">No events logged yet.</p>
                ) : (
                  overview.auditLog.map((log, i) => (
                    <div key={i} className="border-b border-slate-200/50 pb-1 dark:border-slate-800/50">
                      [{new Date(log.timestamp).toLocaleTimeString()}] {log.action}: {log.detail}
                    </div>
                  ))
                )}
              </div>
            </LiquidGlassReveal>
          </div>
        </div>
      ) : null}
    </div>
  );
};
