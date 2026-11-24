const ALLOWED = new Set([
  'USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD',
  'AED', 'CHF', 'CNY', 'HKD', 'NZD', 'SAR', 'KRW',
]);

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url);
  const base = (url.searchParams.get('base') || 'USD').toUpperCase();
  if (!ALLOWED.has(base)) {
    return Response.json({ status: 'error', error: 'Unsupported base currency code.' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      result?: string;
      time_last_update_utc?: string;
      rates?: Record<string, number>;
    };
    if (data.result !== 'success' || !data.rates) {
      throw new Error('Malformed provider response');
    }
    const filtered: Record<string, number> = {};
    for (const code of ALLOWED) {
      if (typeof data.rates[code] === 'number') {
        filtered[code] = data.rates[code];
      }
    }
    return Response.json({
      status: 'live',
      base,
      rates: filtered,
      source: 'open.er-api.com (Cloudflare Edge)',
      timestamp: data.time_last_update_utc || new Date().toUTCString(),
      cachedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        status: 'unavailable',
        error: err instanceof Error ? err.message : 'Live currency provider unavailable.',
      },
      { status: 503 }
    );
  }
}
