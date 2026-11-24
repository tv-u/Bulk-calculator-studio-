import React, { useCallback, useEffect, useState } from 'react';
import { Coins, RefreshCw, WifiOff } from 'lucide-react';
import { DocumentHead } from '../components/seo/DocumentHead';
import { CosmicEntrance, LiquidGlassReveal, MagneticButton } from '../components/motion/MotionLibrary';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'AUD', 'CAD', 'SGD', 'CHF', 'CNY', 'SAR'];

interface RatesPayload {
  status: 'live' | 'cached' | 'unavailable' | 'error';
  base?: string;
  rates?: Record<string, number>;
  source?: string;
  timestamp?: string;
  warning?: string;
  error?: string;
}

export const CurrencyConverterPage: React.FC = () => {
  const [base, setBase] = useState('USD');
  const [target, setTarget] = useState('INR');
  const [amount, setAmount] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<RatesPayload | null>(null);

  const fetchRates = useCallback(async (baseCurrency: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rates?base=${encodeURIComponent(baseCurrency)}`);
      const data = (await res.json()) as RatesPayload;
      setPayload(data);
    } catch {
      setPayload({
        status: 'unavailable',
        error: 'Network unreachable. Live currency conversion requires an active internet connection.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRates(base);
  }, [base, fetchRates]);

  const numericAmount = Number(amount);
  const rate = payload?.rates?.[target];
  const converted =
    Number.isFinite(numericAmount) && typeof rate === 'number' ? numericAmount * rate : null;

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Live Currency Converter (INR, USD, EUR, GBP) – BULK CALCULATOR STUDIO"
        description="Real exchange rate currency converter displaying provider source, timestamp, and live vs cached status."
      />

      <CosmicEntrance>
        <LiquidGlassReveal className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Coins className="h-4 w-4 text-emerald-500" />
                <span>Internet-Dependent Tool · Verified Exchange Rate Feed</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Currency Converter</h1>
            </div>
            <MagneticButton variant="outline" onClick={() => void fetchRates(base)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Rates
            </MagneticButton>
          </div>
        </LiquidGlassReveal>
      </CosmicEntrance>

      <LiquidGlassReveal className="p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1.5 text-xs">
            <span className="font-medium">Amount</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-base dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="font-medium">From Currency</span>
            <select
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="font-medium">To Currency</span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        {payload?.status === 'unavailable' || payload?.status === 'error' ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2.5">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>{payload.error || 'Exchange rates currently unavailable. Rates are never invented.'}</span>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/70 p-5 dark:border-slate-800">
            <div className="text-xs text-slate-500">
              {amount} {base} =
            </div>
            <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-emerald-500">
              {converted !== null
                ? `${converted.toLocaleString('en-IN', { maximumFractionDigits: 4 })} ${target}`
                : loading
                ? 'Loading live rates...'
                : '—'}
            </div>
            {payload?.source && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>Status: <strong className="uppercase">{payload.status}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Source: {payload.source}</span>
                <span aria-hidden="true">·</span>
                <span>Updated: {payload.timestamp}</span>
              </div>
            )}
          </div>
        )}
      </LiquidGlassReveal>
    </div>
  );
};
