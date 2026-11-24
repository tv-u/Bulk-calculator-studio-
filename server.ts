import crypto from 'node:crypto';
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import tls from 'node:tls';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, '.studio-data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_MONETAG_URL = 'https://uplcm.com/4/12282219';

interface AdPlacements {
  headerBanner: boolean;
  homeSponsoredCard: boolean;
  resultPromoCta: boolean;
  dashboardBanner: boolean;
  contentPageCard: boolean;
  footerSponsored: boolean;
}

interface ImportedCalculatorRecord {
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  formula: string;
  defaultInputA: number;
  defaultInputB: number;
  labelA: string;
  labelB: string;
  unit?: string;
  importedAt: string;
}

interface AdminStore {
  adminSalt: string | null;
  adminHash: string | null;
  unpublishedCalculators: string[];
  importedCalculators: ImportedCalculatorRecord[];
  importSnapshots: Array<{ id: string; timestamp: string; count: number; items: ImportedCalculatorRecord[] }>;
  ads: {
    enabled: boolean;
    directLink: string;
    frequencyCapMinutes: number;
    placements: AdPlacements;
    clicksByPlacement: Record<string, number>;
    totalClicks: number;
  };
  auditLog: Array<{ timestamp: string; action: string; detail: string }>;
}

const DEFAULT_STORE: AdminStore = {
  adminSalt: null,
  adminHash: null,
  unpublishedCalculators: [],
  importedCalculators: [],
  importSnapshots: [],
  ads: {
    enabled: true,
    directLink: DEFAULT_MONETAG_URL,
    frequencyCapMinutes: 15,
    placements: {
      headerBanner: true,
      homeSponsoredCard: true,
      resultPromoCta: true,
      dashboardBanner: true,
      contentPageCard: true,
      footerSponsored: true,
    },
    clicksByPlacement: {},
    totalClicks: 0,
  },
  auditLog: [],
};

function loadStore(): AdminStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AdminStore>;
      return {
        ...DEFAULT_STORE,
        ...parsed,
        ads: {
          ...DEFAULT_STORE.ads,
          ...(parsed.ads || {}),
          placements: {
            ...DEFAULT_STORE.ads.placements,
            ...(parsed.ads?.placements || {}),
          },
          clicksByPlacement: parsed.ads?.clicksByPlacement || {},
        },
        unpublishedCalculators: Array.isArray(parsed.unpublishedCalculators)
          ? parsed.unpublishedCalculators
          : [],
        importedCalculators: Array.isArray(parsed.importedCalculators)
          ? parsed.importedCalculators
          : [],
        importSnapshots: Array.isArray(parsed.importSnapshots)
          ? parsed.importSnapshots.slice(0, 10)
          : [],
        auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog.slice(0, 100) : [],
      };
    }
  } catch {
    // Fallback to default store if corrupt or unreadable
  }
  return structuredClone(DEFAULT_STORE);
}

let store: AdminStore = loadStore();

function saveStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // Non-fatal in read-only environments
  }
}

function appendAudit(action: string, detail: string): void {
  store.auditLog.unshift({
    timestamp: new Date().toISOString(),
    action,
    detail,
  });
  if (store.auditLog.length > 100) {
    store.auditLog = store.auditLog.slice(0, 100);
  }
}

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

function hashPasscode(passcode: string, saltHex: string): string {
  return crypto.scryptSync(passcode, Buffer.from(saltHex, 'hex'), 64).toString('hex');
}

function verifyPasscode(passcode: string): boolean {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    const a = crypto.createHash('sha256').update(passcode).digest();
    const b = crypto.createHash('sha256').update(envPasscode).digest();
    return crypto.timingSafeEqual(a, b);
  }
  if (!store.adminSalt || !store.adminHash) return false;
  const candidate = hashPasscode(passcode, store.adminSalt);
  return crypto.timingSafeEqual(
    Buffer.from(candidate, 'hex'),
    Buffer.from(store.adminHash, 'hex')
  );
}

function signAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      exp: Date.now() + 1000 * 60 * 60 * 8,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  if (sig.length !== expectedSig.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return data.role === 'admin' && typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  const token = auth.slice(7).trim();
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Invalid or expired admin session.' });
    return;
  }
  next();
}

function isValidHttpsUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Exchange rate cache (1 hour TTL)
const ALLOWED_CURRENCIES = new Set([
  'USD',
  'INR',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'SGD',
  'AED',
  'CHF',
  'CNY',
  'HKD',
  'NZD',
  'SAR',
  'KRW',
]);

interface CachedRates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
  providerTimestamp: string;
  source: string;
}

const rateCache = new Map<string, CachedRates>();
const RATE_TTL_MS = 60 * 60 * 1000;

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      uptimeSeconds: Math.round(process.uptime()),
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
      environment: IS_PROD ? 'production' : 'development',
    });
  });

  // Public runtime config (published status + imported calcs + Monetag ad config)
  app.get('/api/config/public', (_req: Request, res: Response) => {
    res.json({
      unpublishedCalculators: store.unpublishedCalculators,
      importedCalculators: store.importedCalculators,
      ads: {
        enabled: store.ads.enabled,
        directLink: store.ads.directLink,
        frequencyCapMinutes: store.ads.frequencyCapMinutes,
        placements: store.ads.placements,
        publisherScriptConfigured: false,
      },
    });
  });

  // Ads.txt transparency endpoint
  app.get('/ads.txt', (_req: Request, res: Response) => {
    const adsTxtPath = path.join(ROOT_DIR, 'public', 'ads.txt');
    res.type('text/plain');
    if (fs.existsSync(adsTxtPath)) {
      res.sendFile(adsTxtPath);
      return;
    }
    res.send('monetag.com, 12282219, DIRECT\n');
  });

  // Dynamic XML Sitemap for 2,500 Catalog Categories & Core Studio Routes
  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const staticRoutes = [
      '/',
      '/calculators',
      '/categories',
      '/bulk-calculator',
      '/custom-calculator-builder',
      '/workflow-builder',
      '/unit-converter',
      '/currency-converter',
      '/math-lab',
      '/finance-lab',
      '/data-analysis',
      '/formula-library',
      '/en',
      '/hi',
      '/ar',
      '/es',
    ];
    let catalogUrls: string[] = [];
    try {
      const catPath = path.join(ROOT_DIR, 'src', 'engine', 'generated', 'catalogIndex.json');
      if (fs.existsSync(catPath)) {
        const list = JSON.parse(fs.readFileSync(catPath, 'utf8')) as Array<{
          slug: string;
          category: string;
        }>;
        catalogUrls = list.slice(0, 500).map((item) => `/en/${item.category}/${item.slug}`);
      }
    } catch {
      // Ignore if file missing
    }
    const urls = [...staticRoutes, ...catalogUrls]
      .map((u) => `  <url><loc>${origin}${u}</loc><changefreq>weekly</changefreq></url>`)
      .join('\n');
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
    );
  });

  // Track real intentional clicks on Monetag placements
  app.post('/api/ads/click', (req: Request, res: Response) => {
    const placementRaw = typeof req.body?.placement === 'string' ? req.body.placement : 'unknown';
    const placement = placementRaw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'unknown';
    store.ads.totalClicks += 1;
    store.ads.clicksByPlacement[placement] = (store.ads.clicksByPlacement[placement] || 0) + 1;
    saveStore();
    res.json({ ok: true, totalClicks: store.ads.totalClicks });
  });

  // Live Network Diagnostics Tool (real DNS, TLS/SSL, RDAP/WHOIS, HTTP Ping; zero mock data)
  app.post('/api/live-tool', async (req: Request, res: Response) => {
    const rawDomain = typeof req.body?.domain === 'string' ? req.body.domain.trim() : '';
    const lookupType = typeof req.body?.lookupType === 'string' ? req.body.lookupType : 'dns';
    const domain = rawDomain.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].toLowerCase();

    if (
      !domain ||
      domain.length > 253 ||
      !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) ||
      domain.endsWith('.local') ||
      domain === 'localhost'
    ) {
      res.status(400).json({ available: false, error: 'Enter a valid public domain name (e.g. example.com).' });
      return;
    }

    try {
      if (lookupType === 'dns') {
        const [aRecords, mxRecords, txtRecords] = await Promise.all([
          dns.promises.resolve4(domain).catch(() => [] as string[]),
          dns.promises.resolveMx(domain).catch(() => [] as Array<{ exchange: string; priority: number }>),
          dns.promises.resolveTxt(domain).catch(() => [] as string[][]),
        ]);
        res.json({
          available: true,
          lookupType: 'dns',
          domain,
          timestamp: new Date().toISOString(),
          summary: `${aRecords.length} A record(s), ${mxRecords.length} MX record(s)`,
          details: {
            aRecords,
            mxRecords: mxRecords.map((m) => `${m.priority} ${m.exchange}`),
            txtRecords: txtRecords.map((chunks) => chunks.join('')),
          },
        });
        return;
      }

      if (lookupType === 'ssl') {
        const cert = await new Promise<{
          subject?: Record<string, string>;
          issuer?: Record<string, string>;
          valid_from?: string;
          valid_to?: string;
          protocol?: string | null;
        }>((resolve, reject) => {
          const socket = tls.connect(
            { host: domain, port: 443, servername: domain, timeout: 6000 },
            () => {
              const peer = socket.getPeerCertificate();
              const protocol = socket.getProtocol();
              socket.end();
              if (!peer || !peer.valid_to) {
                reject(new Error('No peer TLS certificate returned'));
                return;
              }
              resolve({
                subject: peer.subject as unknown as Record<string, string>,
                issuer: peer.issuer as unknown as Record<string, string>,
                valid_from: peer.valid_from,
                valid_to: peer.valid_to,
                protocol,
              });
            }
          );
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('TLS connection timed out'));
          });
          socket.on('error', (err) => reject(err));
        });

        const expiryMs = cert.valid_to ? Date.parse(cert.valid_to) - Date.now() : 0;
        const daysRemaining = Math.floor(expiryMs / 86400000);
        res.json({
          available: true,
          lookupType: 'ssl',
          domain,
          timestamp: new Date().toISOString(),
          summary: `TLS ${cert.protocol || 'HTTPS'} · ${daysRemaining} days until expiry`,
          details: {
            commonName: cert.subject?.CN || domain,
            issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown CA',
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            daysRemaining,
            protocol: cert.protocol,
          },
        });
        return;
      }

      if (lookupType === 'whois') {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const tld = domain.split('.').pop()?.toLowerCase() || '';
          let rdapBaseUrl = '';
          if (tld === 'com' || tld === 'net') {
            rdapBaseUrl = `https://rdap.verisign.com/${tld}/v1/`;
          } else if (tld === 'org') {
            rdapBaseUrl = 'https://rdap.publicinterestregistry.org/rdap/';
          } else {
            const ianaRes = await fetch('https://data.iana.org/rdap/dns.json', {
              signal: controller.signal,
            });
            if (ianaRes.ok) {
              const ianaData = (await ianaRes.json()) as {
                services?: Array<[string[], string[]]>;
              };
              const match = ianaData.services?.find(([tlds]) =>
                tlds.some((item) => item.toLowerCase() === tld)
              );
              if (match && match[1]?.length) {
                rdapBaseUrl = match[1][0].endsWith('/') ? match[1][0] : `${match[1][0]}/`;
              }
            }
          }

          const targetUrl = rdapBaseUrl
            ? `${rdapBaseUrl}domain/${encodeURIComponent(domain)}`
            : `https://rdap.org/domain/${encodeURIComponent(domain)}`;

          const rdapRes = await fetch(targetUrl, {
            headers: { Accept: 'application/rdap+json, application/json' },
            signal: controller.signal,
          });
          if (!rdapRes.ok) {
            throw new Error(`RDAP registry returned HTTP ${rdapRes.status}`);
          }
          const rdap = (await rdapRes.json()) as {
            ldhName?: string;
            status?: string[];
            events?: Array<{ eventAction?: string; eventDate?: string }>;
          };
          const regEvent = rdap.events?.find((e) => e.eventAction === 'registration')?.eventDate;
          const expEvent = rdap.events?.find((e) => e.eventAction === 'expiration')?.eventDate;
          res.json({
            available: true,
            lookupType: 'whois',
            domain,
            timestamp: new Date().toISOString(),
            summary: regEvent ? `Registered: ${regEvent.slice(0, 10)}` : 'RDAP record retrieved',
            details: {
              ldhName: rdap.ldhName || domain,
              status: rdap.status || [],
              registeredOn: regEvent || 'Not disclosed',
              expiresOn: expEvent || 'Not disclosed',
              registryEndpoint: targetUrl,
            },
          });
          return;
        } finally {
          clearTimeout(timer);
        }
      }

      // HTTP Latency / Ping Check
      const start = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const headRes = await fetch(`https://${domain}/`, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timer);
      const rttMs = Math.round(performance.now() - start);
      res.json({
        available: true,
        lookupType: 'ping',
        domain,
        timestamp: new Date().toISOString(),
        summary: `HTTP ${headRes.status} in ${rttMs} ms`,
        details: {
          httpStatus: headRes.status,
          latencyMs: rttMs,
        },
      });
    } catch (err) {
      res.status(503).json({
        available: false,
        error:
          err instanceof Error
            ? `Live tool service unavailable (${err.message}).`
            : 'Live tool service unavailable.',
      });
    }
  });

  // Live Currency Exchange Rates (never invents rates)
  app.get('/api/rates', async (req: Request, res: Response) => {
    const baseParam = String(req.query.base || 'USD').toUpperCase();
    if (!ALLOWED_CURRENCIES.has(baseParam)) {
      res.status(400).json({ status: 'error', error: 'Unsupported base currency code.' });
      return;
    }

    const cached = rateCache.get(baseParam);
    if (cached && Date.now() - cached.fetchedAt < RATE_TTL_MS) {
      res.json({
        status: 'cached',
        base: cached.base,
        rates: cached.rates,
        source: cached.source,
        timestamp: cached.providerTimestamp,
        cachedAt: new Date(cached.fetchedAt).toISOString(),
      });
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const response = await fetch(`https://open.er-api.com/v6/latest/${baseParam}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Provider returned HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        result?: string;
        time_last_update_utc?: string;
        rates?: Record<string, number>;
      };

      if (data.result !== 'success' || !data.rates) {
        throw new Error('Malformed provider response');
      }

      const filteredRates: Record<string, number> = {};
      for (const code of ALLOWED_CURRENCIES) {
        if (typeof data.rates[code] === 'number') {
          filteredRates[code] = data.rates[code];
        }
      }

      const entry: CachedRates = {
        base: baseParam,
        rates: filteredRates,
        fetchedAt: Date.now(),
        providerTimestamp: data.time_last_update_utc || new Date().toUTCString(),
        source: 'open.er-api.com (ExchangeRate-API Open Access)',
      };
      rateCache.set(baseParam, entry);

      res.json({
        status: 'live',
        base: entry.base,
        rates: entry.rates,
        source: entry.source,
        timestamp: entry.providerTimestamp,
        cachedAt: new Date(entry.fetchedAt).toISOString(),
      });
    } catch (err) {
      if (cached) {
        res.json({
          status: 'cached',
          base: cached.base,
          rates: cached.rates,
          source: cached.source,
          timestamp: cached.providerTimestamp,
          cachedAt: new Date(cached.fetchedAt).toISOString(),
          warning: 'Live refresh failed; serving previously cached provider rates.',
        });
        return;
      }
      res.status(503).json({
        status: 'unavailable',
        error:
          err instanceof Error
            ? `Live exchange rate provider unavailable (${err.message}).`
            : 'Live exchange rate provider unavailable.',
      });
    }
  });

  // AI Calculation Assistant (server-side @google/genai, never fabricates AI responses)
  app.post('/api/ai/assist', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        available: false,
        error: 'AI Assistant requires GEMINI_API_KEY to be configured in Settings > Secrets.',
      });
      return;
    }

    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const availableCalculators = Array.isArray(req.body?.calculators)
      ? req.body.calculators.slice(0, 80)
      : [];

    if (!query || query.length > 1500) {
      res.status(400).json({
        available: true,
        error: 'Please enter a valid calculation question (1 to 1500 characters).',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `You are the Calculation Intent & Formula Assistant for BULK CALCULATOR STUDIO.
Your job is to:
1. Identify the best matching calculator ID from the provided catalog list (if one applies).
2. Extract numeric input values from the user's natural language query matching that calculator's input keys.
3. Explain the mathematical or financial formula clearly in plain language.
4. Optionally suggest a safe custom formula (using standard math operators and functions: abs, round, sqrt, pow, min, max) if they asked for a custom calculation.
IMPORTANT: Never invent or guess final computed numbers yourself when a deterministic calculator can compute them; focus on extracting exact input parameters, identifying the right tool, and explaining the formula.`;

      const prompt = `User Request: ${query}

Available Calculators (id | name | inputKeys):
${availableCalculators
  .map((c: { id?: string; name?: string; inputKeys?: string[] }) =>
    `${c.id || ''}: ${c.name || ''} [inputs: ${(c.inputKeys || []).join(', ')}]`
  )
  .join('\n')}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedCalculatorId: {
                type: Type.STRING,
                description: 'Matching calculator ID from the list, or empty string if none matches.',
              },
              extractedInputs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    value: { type: Type.NUMBER },
                  },
                },
                description: 'Numeric input key-value pairs extracted from user query.',
              },
              formulaExplanation: {
                type: Type.STRING,
                description: 'Clear explanation of the formula, variables, and any assumptions.',
              },
              customFormulaSuggestion: {
                type: Type.STRING,
                description: 'Optional safe math expression if user asked to build a custom formula.',
              },
              workflowTip: {
                type: Type.STRING,
                description: 'Optional workflow suggestion linking calculators.',
              },
            },
          },
        },
      });

      const rawText = (response.text || '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json({
        available: true,
        model: 'gemini-4-hydrogen',
        data: parsed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI service request failed';
      res.status(502).json({
        available: false,
        error: `AI Assistant error: ${message}`,
      });
    }
  });

  // Admin auth status
  app.get('/api/admin/status', (_req: Request, res: Response) => {
    const envConfigured = Boolean(process.env.ADMIN_PASSCODE?.trim());
    const claimed = envConfigured || Boolean(store.adminHash && store.adminSalt);
    res.json({
      configured: claimed,
      envOverride: envConfigured,
    });
  });

  // One-time admin claim if ADMIN_PASSCODE is unset and not yet claimed
  app.post('/api/admin/claim', (req: Request, res: Response) => {
    if (process.env.ADMIN_PASSCODE?.trim()) {
      res.status(409).json({ error: 'Admin passcode is managed by environment secrets.' });
      return;
    }
    if (store.adminHash && store.adminSalt) {
      res.status(409).json({ error: 'Admin passcode has already been claimed.' });
      return;
    }
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode.length < 8) {
      res.status(400).json({ error: 'Passcode must be at least 8 characters.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    store.adminSalt = salt;
    store.adminHash = hashPasscode(passcode, salt);
    appendAudit('ADMIN_CLAIM', 'Initial admin passcode claimed.');
    saveStore();
    const token = signAdminToken();
    res.json({ ok: true, token });
  });

  // Admin login
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (!passcode || !verifyPasscode(passcode)) {
      res.status(401).json({ error: 'Invalid admin passcode.' });
      return;
    }
    appendAudit('ADMIN_LOGIN', 'Admin authenticated.');
    saveStore();
    const token = signAdminToken();
    res.json({ ok: true, token });
  });

  // Protected Admin overview
  app.get('/api/admin/overview', requireAdmin, (_req: Request, res: Response) => {
    res.json({
      unpublishedCalculators: store.unpublishedCalculators,
      importedCalculators: store.importedCalculators,
      importSnapshots: store.importSnapshots.map((s) => ({
        id: s.id,
        timestamp: s.timestamp,
        count: s.count,
      })),
      ads: store.ads,
      auditLog: store.auditLog,
      systemHealth: {
        uptimeSeconds: Math.round(process.uptime()),
        aiConfigured: Boolean(process.env.GEMINI_API_KEY),
        rateCacheEntries: rateCache.size,
        nodeVersion: process.version,
      },
    });
  });

  // Protected Catalog & i18n Audit Summary
  app.get('/api/admin/audit', requireAdmin, (_req: Request, res: Response) => {
    try {
      const catPath = path.join(ROOT_DIR, 'public', 'reports', 'category-index.json');
      const i18nPath = path.join(ROOT_DIR, 'public', 'reports', 'i18n-audit.json');
      const dupPath = path.join(ROOT_DIR, 'public', 'reports', 'duplicate-report.csv');
      const categories = fs.existsSync(catPath) ? JSON.parse(fs.readFileSync(catPath, 'utf8')) : null;
      const i18n = fs.existsSync(i18nPath) ? JSON.parse(fs.readFileSync(i18nPath, 'utf8')) : null;
      const duplicatesCsv = fs.existsSync(dupPath) ? fs.readFileSync(dupPath, 'utf8') : '';
      res.json({ ok: true, categories, i18n, duplicatesCsv });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read audit reports.' });
    }
  });

  // Protected Admin Bulk Importer (with snapshot rollback)
  app.post('/api/admin/import', requireAdmin, (req: Request, res: Response) => {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (rawItems.length === 0 || rawItems.length > 500) {
      res.status(400).json({ error: 'Provide 1 to 500 calculator definitions to import.' });
      return;
    }

    const validItems: ImportedCalculatorRecord[] = [];
    for (const item of rawItems) {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      const formula = typeof item?.formula === 'string' ? item.formula.trim() : '';
      if (!name || !formula) continue;
      const slug =
        (typeof item?.slug === 'string' && item.slug.trim()) ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      validItems.push({
        slug,
        name: name.slice(0, 120),
        category: typeof item?.category === 'string' ? item.category : 'business',
        categoryLabel: typeof item?.categoryLabel === 'string' ? item.categoryLabel : 'Custom Imported',
        formula: formula.slice(0, 200),
        defaultInputA: Number(item?.defaultInputA ?? 100) || 100,
        defaultInputB: Number(item?.defaultInputB ?? 10) || 10,
        labelA: typeof item?.labelA === 'string' ? item.labelA : 'Input A (a)',
        labelB: typeof item?.labelB === 'string' ? item.labelB : 'Input B (b)',
        unit: typeof item?.unit === 'string' ? item.unit : '',
        importedAt: new Date().toISOString(),
      });
    }

    if (validItems.length === 0) {
      res.status(400).json({ error: 'No valid rows containing name & formula found.' });
      return;
    }

    // Save rollback snapshot of previous state
    store.importSnapshots.unshift({
      id: `snap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      count: store.importedCalculators.length,
      items: structuredClone(store.importedCalculators),
    });
    store.importSnapshots = store.importSnapshots.slice(0, 10);

    const bySlug = new Map<string, ImportedCalculatorRecord>();
    for (const existing of store.importedCalculators) bySlug.set(existing.slug, existing);
    for (const next of validItems) bySlug.set(next.slug, next);
    store.importedCalculators = Array.from(bySlug.values());

    appendAudit('BULK_IMPORT', `Imported ${validItems.length} calculator(s). Total imported: ${store.importedCalculators.length}.`);
    saveStore();
    res.json({
      ok: true,
      importedCount: validItems.length,
      totalImported: store.importedCalculators.length,
      importedCalculators: store.importedCalculators,
    });
  });

  // Protected Rollback last import
  app.post('/api/admin/rollback', requireAdmin, (_req: Request, res: Response) => {
    const snap = store.importSnapshots.shift();
    if (!snap) {
      res.status(404).json({ error: 'No previous import snapshot available to roll back.' });
      return;
    }
    store.importedCalculators = snap.items;
    appendAudit('IMPORT_ROLLBACK', `Rolled back imported calculators to snapshot ${snap.id} (${snap.count} items).`);
    saveStore();
    res.json({
      ok: true,
      importedCalculators: store.importedCalculators,
      snapshotsRemaining: store.importSnapshots.length,
    });
  });

  // Protected Admin config update
  app.put('/api/admin/config', requireAdmin, (req: Request, res: Response) => {
    const body = req.body as {
      unpublishedCalculators?: unknown;
      ads?: {
        enabled?: unknown;
        directLink?: unknown;
        frequencyCapMinutes?: unknown;
        placements?: Partial<AdPlacements>;
      };
    };

    if (Array.isArray(body.unpublishedCalculators)) {
      store.unpublishedCalculators = body.unpublishedCalculators
        .filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length < 80);
      appendAudit(
        'CALCULATORS_UPDATED',
        `Updated unpublished list (${store.unpublishedCalculators.length} hidden).`
      );
    }

    if (body.ads) {
      if (typeof body.ads.enabled === 'boolean') {
        store.ads.enabled = body.ads.enabled;
      }
      if (typeof body.ads.directLink === 'string') {
        const trimmed = body.ads.directLink.trim();
        if (!isValidHttpsUrl(trimmed)) {
          res.status(400).json({ error: 'Direct link must be a valid https:// URL.' });
          return;
        }
        store.ads.directLink = trimmed;
      }
      if (typeof body.ads.frequencyCapMinutes === 'number') {
        store.ads.frequencyCapMinutes = Math.max(0, Math.min(1440, body.ads.frequencyCapMinutes));
      }
      if (body.ads.placements) {
        for (const key of [
          'headerBanner',
          'homeSponsoredCard',
          'resultPromoCta',
          'dashboardBanner',
          'contentPageCard',
          'footerSponsored',
        ] as const) {
          if (typeof body.ads.placements[key] === 'boolean') {
            store.ads.placements[key] = body.ads.placements[key]!;
          }
        }
      }
      appendAudit('ADS_CONFIG_UPDATED', `Ads enabled=${store.ads.enabled}`);
    }

    saveStore();
    res.json({
      ok: true,
      unpublishedCalculators: store.unpublishedCalculators,
      ads: store.ads,
    });
  });

  // Vite middleware in development, static dist in production
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BULK CALCULATOR STUDIO server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
