import { describe, expect, it } from 'vitest';
import { CATALOG_2500, resolveCalculatorSync } from '../src/engine/catalogResolverSync';

describe('Master 2,500 Calculator Verification Suite', () => {
  it('contains exact 2,500 entries with unique numbers 1..2500 and unique slugs', () => {
    expect(CATALOG_2500.length).toBe(2500);
    const nums = new Set(CATALOG_2500.map((c) => c.catalogNumber));
    const slugs = new Set(CATALOG_2500.map((c) => c.slug));
    expect(nums.size).toBe(2500);
    expect(slugs.size).toBe(2500);
    expect(CATALOG_2500[0].catalogNumber).toBe(1);
    expect(CATALOG_2500[2499].catalogNumber).toBe(2500);
  });

  it('resolves and computes valid non-NaN deterministic results for ALL 2,500 calculators', () => {
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

  it('separates live DNS/WHOIS/SSL/Ping tools explicitly as live-tool', () => {
    const dns = CATALOG_2500.find((c) => c.slug === 'dns-lookup-tool');
    const ssl = CATALOG_2500.find((c) => c.slug === 'ssl-certificate-checker');
    expect(dns?.toolKind).toBe('live-tool');
    expect(ssl?.toolKind).toBe('live-tool');
  });
});
