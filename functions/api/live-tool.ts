function isPrivateIp(ip: string): boolean {
  const clean = ip.toLowerCase().replace(/^::ffff:/, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) {
    const [a, b] = clean.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && (b === 168 || b === 0)) return true;
    if (a >= 224) return true;
    return false;
  }
  return clean === '::' || clean === '::1' || clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('fe8');
}

async function queryDoh(domain: string, type: string): Promise<Array<{ data: string }>> {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
    headers: { Accept: 'application/dns-json' },
  });
  if (!r.ok) return [];
  const data = (await r.json()) as { Answer?: Array<{ data: string }> };
  return data.Answer || [];
}

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  try {
    const body = (await context.request.json()) as { domain?: string; lookupType?: string };
    const rawDomain = typeof body.domain === 'string' ? body.domain.trim() : '';
    const lookupType = typeof body.lookupType === 'string' ? body.lookupType : 'dns';
    const domain = rawDomain.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].toLowerCase();

    if (!['dns', 'ssl', 'whois', 'ping'].includes(lookupType)) {
      return Response.json({ available: false, error: 'Unsupported lookupType.' }, { status: 400 });
    }
    if (
      !domain ||
      domain.length > 253 ||
      !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) ||
      domain.endsWith('.local') ||
      domain.endsWith('.internal') ||
      domain.endsWith('.arpa') ||
      domain === 'localhost'
    ) {
      return Response.json({ available: false, error: 'Enter a valid public domain name.' }, { status: 400 });
    }

    const aAnswers = await queryDoh(domain, 'A');
    if (aAnswers.some((ans) => isPrivateIp(ans.data))) {
      return Response.json(
        { available: false, error: 'Target resolves to a private or restricted IP address.' },
        { status: 403 }
      );
    }

    if (lookupType === 'dns') {
      const [mxAnswers, txtAnswers] = await Promise.all([
        queryDoh(domain, 'MX'),
        queryDoh(domain, 'TXT'),
      ]);
      return Response.json({
        available: true,
        lookupType: 'dns',
        domain,
        timestamp: new Date().toISOString(),
        summary: `${aAnswers.length} A record(s), ${mxAnswers.length} MX record(s)`,
        details: {
          aRecords: aAnswers.map((a) => a.data),
          mxRecords: mxAnswers.map((m) => m.data),
          txtRecords: txtAnswers.map((t) => t.data),
        },
      });
    }

    if (lookupType === 'whois') {
      const tld = domain.split('.').pop() || '';
      const base =
        tld === 'com' || tld === 'net'
          ? `https://rdap.verisign.com/${tld}/v1/`
          : tld === 'org'
          ? 'https://rdap.publicinterestregistry.org/rdap/'
          : 'https://rdap.org/';
      const rdapRes = await fetch(`${base}domain/${encodeURIComponent(domain)}`, {
        headers: { Accept: 'application/rdap+json, application/json' },
      });
      if (!rdapRes.ok) throw new Error(`RDAP HTTP ${rdapRes.status}`);
      const rdap = (await rdapRes.json()) as {
        ldhName?: string;
        status?: string[];
        events?: Array<{ eventAction?: string; eventDate?: string }>;
      };
      const regEvent = rdap.events?.find((e) => e.eventAction === 'registration')?.eventDate;
      const expEvent = rdap.events?.find((e) => e.eventAction === 'expiration')?.eventDate;
      return Response.json({
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
        },
      });
    }

    const start = performance.now();
    const headRes = await fetch(`https://${domain}/`, { method: 'HEAD', redirect: 'manual' });
    const latencyMs = Math.round(performance.now() - start);
    return Response.json({
      available: true,
      lookupType,
      domain,
      timestamp: new Date().toISOString(),
      summary: `HTTP ${headRes.status} in ${latencyMs} ms`,
      details: {
        httpStatus: headRes.status,
        latencyMs,
        note: lookupType === 'ssl' ? 'HTTPS reachability verified at edge' : undefined,
      },
    });
  } catch (err) {
    return Response.json(
      {
        available: false,
        error: err instanceof Error ? err.message : 'Live edge tool unavailable.',
      },
      { status: 503 }
    );
  }
}
