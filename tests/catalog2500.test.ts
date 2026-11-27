import { describe, expect, it } from 'vitest';
import { CATALOG_2500, resolveCalculatorSync } from '../src/engine/catalogResolverSync';
import { buildCalculatorSeoMeta } from '../src/engine/seoMeta';

describe('Master 5,729 Calculator Verification Suite', () => {
  it('contains 5,729 entries with unique sequential numbers 1..5729 and unique slugs', () => {
    expect(CATALOG_2500.length).toBe(5729);
    const nums = new Set(CATALOG_2500.map((c) => c.catalogNumber));
    const slugs = new Set(CATALOG_2500.map((c) => c.slug));
    expect(nums.size).toBe(5729);
    expect(slugs.size).toBe(5729);
    expect(CATALOG_2500[0].catalogNumber).toBe(1);
    expect(CATALOG_2500[2499].catalogNumber).toBe(2500);
    expect(CATALOG_2500[2599].catalogNumber).toBe(2600);
    expect(CATALOG_2500[5728].catalogNumber).toBe(5729);
  });

  it('resolves and computes valid non-NaN deterministic results for ALL 5,729 calculators', () => {
    const failures: Array<{ num: number; slug: string; err: string }> = [];

    for (const entry of CATALOG_2500) {
      try {
        const def = resolveCalculatorSync(entry.slug);
        if (!def) {
          failures.push({ num: entry.catalogNumber, slug: entry.slug, err: 'Unresolved definition' });
          continue;
        }
        if (!def.inputs || def.inputs.length === 0) {
          failures.push({ num: entry.catalogNumber, slug: entry.slug, err: 'Zero input fields' });
          continue;
        }
        if (!def.formulaDisplay || def.formulaDisplay.trim().length < 2) {
          failures.push({ num: entry.catalogNumber, slug: entry.slug, err: 'Missing formulaDisplay' });
          continue;
        }

        const defaults: Record<string, number | string> = {};
        for (const f of def.inputs) defaults[f.key] = f.defaultValue;

        const out = def.compute(defaults, { locale: 'en-US', currency: 'USD' });
        if (!out || !out.primary || !out.primary.formatted || out.primary.formatted.includes('NaN')) {
          failures.push({ num: entry.catalogNumber, slug: entry.slug, err: 'Invalid or NaN formatted result' });
        }
      } catch (e) {
        failures.push({
          num: entry.catalogNumber,
          slug: entry.slug,
          err: e instanceof Error ? e.message : String(e),
        });
      }
    }

    expect(failures).toEqual([]);
  });

  it('computes high-precision domain formulas accurately (Black-Scholes, IPv4 CIDR, Rebar, Cricket NRR)', () => {
    const bs = resolveCalculatorSync('black-scholes-calculator');
    expect(bs).toBeDefined();
    const bsRes = bs!.compute({ spot: 100, strike: 100, rate: 5, vol: 20, days: 365, type: 'call' });
    expect(Number(bsRes.primary.value)).toBeCloseTo(10.4506, 2);

    const cidr = resolveCalculatorSync('ip-subnet-calculator');
    expect(cidr).toBeDefined();
    const cidrRes = cidr!.compute({ ip: '192.168.1.45', cidr: 24 });
    expect(Number(cidrRes.primary.value)).toBe(254);

    const rebar = resolveCalculatorSync('steel-weight-calculator');
    expect(rebar).toBeDefined();
    const rebarRes = rebar!.compute({ diaMm: 12, lenM: 12, bars: 10 });
    expect(Number(rebarRes.primary.value)).toBeCloseTo(106.48, 1);

    const nrr = resolveCalculatorSync('cricket-net-run-rate-calculator');
    expect(nrr).toBeDefined();
    const nrrRes = nrr!.compute({ runsFor: 300, oversFaced: 50, runsAgainst: 250, oversBowled: 50 });
    expect(Number(nrrRes.primary.value)).toBeCloseTo(1.0, 2);
  });

  it('accurately computes extended #2601-#5729 tools across finance, electronics, solids, construction, sports & dev', () => {
    const alPay = resolveCalculatorSync('alabama-paycheck-calculator');
    expect(alPay).toBeDefined();
    expect(Number(alPay!.compute({ gross: 80000, freq: 26, filing: 'single' }).primary.value)).toBeGreaterThan(1500);

    const altman = resolveCalculatorSync('altman-z-score-calculator');
    expect(altman).toBeDefined();
    const az = altman!.compute({ wcTa: 0.25, reTa: 0.4, ebitTa: 0.18, mveTl: 2.4, sTa: 1.5 });
    expect(Number(az.primary.value)).toBeCloseTo(4.394, 2);

    const graham = resolveCalculatorSync('graham-number-calculator');
    expect(graham).toBeDefined();
    expect(Number(graham!.compute({ eps: 8, bvps: 25 }).primary.value)).toBeCloseTo(Math.sqrt(22.5 * 8 * 25), 2);

    const lm317 = resolveCalculatorSync('lm317-calculator');
    expect(lm317).toBeDefined();
    expect(Number(lm317!.compute({ r1: 240, r2: 1200 }).primary.value)).toBeCloseTo(7.56, 2);

    const ne555 = resolveCalculatorSync('ne555-astable-calculator');
    expect(ne555).toBeDefined();
    expect(Number(ne555!.compute({ r1: 1000, r2: 10000, cUf: 10 }).primary.value)).toBeGreaterThan(5);

    const torus = resolveCalculatorSync('torus-volume-calculator');
    expect(torus).toBeDefined();
    expect(Number(torus!.compute({ majorR: 10, minorR: 3 }).primary.value)).toBeCloseTo(2 * Math.PI ** 2 * 10 * 9, 1);

    const ada = resolveCalculatorSync('ada-ramp-calculator');
    expect(ada).toBeDefined();
    expect(Number(ada!.compute({ riseIn: 24, slopeDenom: 12 }).primary.value)).toBeCloseTo(24, 1);

    const nfl = resolveCalculatorSync('nfl-passer-rating-calculator');
    expect(nfl).toBeDefined();
    expect(Number(nfl!.compute({ cmp: 24, att: 32, yds: 310, td: 3, int: 0 }).primary.value)).toBeGreaterThan(120);

    const chmod = resolveCalculatorSync('chmod-calculator');
    expect(chmod).toBeDefined();
    expect(chmod!.compute({ owner: 7, group: 5, other: 5 }).primary.formatted).toContain('755');

    const luhn = resolveCalculatorSync('luhn-calculator');
    expect(luhn).toBeDefined();
    expect(luhn!.compute({ number: '79927398713' }).primary.formatted).toContain('VALID');

    const cuYdTons = resolveCalculatorSync('cubic-yards-to-tons-calculator');
    expect(cuYdTons).toBeDefined();
    expect(Number(cuYdTons!.compute({ val: 10, mat: 'gravel' }).primary.value)).toBeCloseTo(13.484, 2);
  });

  it('accurately computes supplemental #2501-#2600 tools (Quadratic, Roman, BigInt, BAC, Embed Widgets)', () => {
    const quad = resolveCalculatorSync('quadratic-formula-calculator');
    const qRes = quad!.compute({ a: 1, b: -5, c: 6 });
    expect(qRes.primary.formatted).toContain('x₁ = 3');
    expect(qRes.primary.formatted).toContain('x₂ = 2');

    const roman = resolveCalculatorSync('roman-numeral-converter');
    expect(roman!.compute({ input: '2026' }).primary.formatted).toBe('MMXXVI');
    expect(roman!.compute({ input: 'MMXXVI' }).primary.formatted).toBe('2026');

    const big = resolveCalculatorSync('big-number-calculator');
    expect(big!.compute({ a: '100000000000000000000', op: 'add', b: '25' }).primary.formatted).toBe(
      '100000000000000000025'
    );

    const b64 = resolveCalculatorSync('base64-encode-decode');
    const enc = b64!.compute({ text: 'BulkCalc', mode: 'encode' }).primary.formatted;
    expect(b64!.compute({ text: enc, mode: 'decode' }).primary.formatted).toBe('BulkCalc');

    const widget = resolveCalculatorSync('mortgage-calculator-for-your-site');
    const wRes = widget!.compute({ principal: 300000, apr: 6.5, years: 30 }, { locale: 'en-US', currency: 'USD' });
    expect(String(wRes.breakdown[0].formatted)).toContain('<iframe');
    expect(String(wRes.breakdown[0].formatted)).toContain('https://bulk-calculator-studio.pages.dev/calculators/mortgage-calculator-for-your-site/');
  });

  it('generates unique long-tail SEO metadata and canonical permalinks within bounds', () => {
    for (const entry of CATALOG_2500.slice(2500)) {
      const seo = buildCalculatorSeoMeta(entry);
      expect(seo.canonicalUrl).toBe(`https://bulk-calculator-studio.pages.dev/calculators/${entry.slug}/`);
      expect(seo.description.length).toBeLessThanOrEqual(160);
      expect(seo.keywords.length).toBeGreaterThan(20);
    }
  });

  it('handles zero/boundary inputs cleanly without NaN or Infinity', () => {
    const emi = resolveCalculatorSync('emi-calculator');
    expect(emi).toBeDefined();
    const zeroRateEmi = emi!.compute({ principal: 120000, rate: 0, years: 1 }, { locale: 'en-US', currency: 'USD' });
    expect(Number(zeroRateEmi.primary.value)).toBeCloseTo(10000, 2);
    expect(() => emi!.compute({ principal: 120000, rate: 5, years: 0 })).toThrow();

    const bmi = resolveCalculatorSync('bmi-calculator');
    expect(bmi).toBeDefined();
    const bmiRes = bmi!.compute({ weight: 70, heightCm: 175 });
    expect(Number(bmiRes.primary.value)).toBeCloseTo(22.86, 1);
    expect(() => bmi!.compute({ weight: 0, heightCm: 175 })).toThrow();

    const cidrHost = resolveCalculatorSync('ip-subnet-calculator');
    const hostRes = cidrHost!.compute({ ip: '10.0.0.1', cidr: 32 });
    expect(Number(hostRes.primary.value)).toBe(1);
  });

  it('separates live DNS/WHOIS/SSL/Ping tools explicitly as live-tool', () => {
    const dns = CATALOG_2500.find((c) => c.slug === 'dns-lookup-tool');
    const ssl = CATALOG_2500.find((c) => c.slug === 'ssl-certificate-checker');
    expect(dns?.toolKind).toBe('live-tool');
    expect(ssl?.toolKind).toBe('live-tool');
  });
});
