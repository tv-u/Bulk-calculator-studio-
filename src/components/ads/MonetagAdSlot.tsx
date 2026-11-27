import React, { useMemo } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

export type MonetagPlacement =
  | 'headerBanner'
  | 'homeSponsoredCard'
  | 'resultPromoCta'
  | 'dashboardBanner'
  | 'contentPageCard'
  | 'footerSponsored';

interface MonetagAdSlotProps {
  placement: MonetagPlacement;
  variant?: 'card' | 'banner' | 'compact' | 'strip';
  className?: string;
}

const COPY_BY_PLACEMENT: Record<
  MonetagPlacement,
  { heading: string; body: string; cta: string }
> = {
  headerBanner: {
    heading: 'Featured Partner Offer',
    body: 'Keep 5,729+ deterministic calculators 100% free via our verified Monetag partner spotlight.',
    cta: 'Explore Partner',
  },
  homeSponsoredCard: {
    heading: 'Featured Partner Offer',
    body: 'Explore curated tools and partner offers while keeping all 5,729 calculators free.',
    cta: 'View Partner Offer',
  },
  resultPromoCta: {
    heading: 'Partner Resource',
    body: 'Support free precision computation across 5,729 calculators, PDF exports & Bulk Studio.',
    cta: 'Open Sponsored Link',
  },
  dashboardBanner: {
    heading: 'Sponsored Partner Spotlight',
    body: 'Discover recommended utilities and financial resources via our verified Monetag partner link.',
    cta: 'Visit Sponsor',
  },
  contentPageCard: {
    heading: 'Sponsored Recommendation',
    body: 'Optional partner offer — opens safely in a new tab without interrupting your work.',
    cta: 'Explore Offer',
  },
  footerSponsored: {
    heading: 'Sponsored Partner Network',
    body: 'Verified Monetag Smart Link supporting free access across 50 languages.',
    cta: 'Visit Partner',
  },
};

export const MonetagAdSlot: React.FC<MonetagAdSlotProps> = ({
  placement,
  variant = 'card',
  className = '',
}) => {
  const { adConfig, t } = useStudio();

  const isEnabled = useMemo(() => {
    if (!adConfig.enabled) return false;
    if (!adConfig.directLink || !adConfig.directLink.startsWith('https://')) return false;
    return adConfig.placements[placement] ?? true;
  }, [adConfig, placement]);

  if (!isEnabled) return null;

  const copy = COPY_BY_PLACEMENT[placement];

  const handleIntentionalClick = () => {
    try {
      const capMs = (adConfig.frequencyCapMinutes || 0) * 60 * 1000;
      const key = `bcs_ad_last_${placement}`;
      const last = Number(sessionStorage.getItem(key) || '0');
      if (capMs === 0 || Date.now() - last >= Math.min(capMs, 5000)) {
        sessionStorage.setItem(key, String(Date.now()));
      }
    } catch {
      // Ignore storage errors
    }

    fetch('/api/ads/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placement }),
      keepalive: true,
    }).catch(() => undefined);
  };

  if (variant === 'strip') {
    return (
      <aside
        aria-label="Sponsored Advertisement"
        className={`liquid-glass rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border border-amber-500/30 ${className}`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300 shrink-0">
            <Sparkles className="h-3 w-3" />
            Sponsored
          </span>
          <p className="truncate text-xs text-slate-700 dark:text-slate-200">
            <strong className="font-semibold">{copy.heading}:</strong> {copy.body}
          </p>
        </div>
        <a
          href={adConfig.directLink}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleIntentionalClick}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-500/25 dark:text-amber-200 whitespace-nowrap shrink-0 transition"
        >
          <span>{copy.cta}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </aside>
    );
  }

  if (variant === 'compact') {
    return (
      <aside
        aria-label="Sponsored Advertisement"
        className={`liquid-glass card-3d rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
      >
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {t('ad.sponsored', 'Sponsored · Advertisement')}
          </div>
          <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">
            {copy.heading}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{copy.body}</p>
        </div>
        <a
          href={adConfig.directLink}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleIntentionalClick}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-500/25 dark:text-amber-300 whitespace-nowrap shrink-0 transition"
        >
          <span>{copy.cta}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Sponsored Advertisement"
      className={`liquid-glass card-3d rounded-2xl p-5 flex flex-col justify-between gap-4 ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-amber-600 dark:text-amber-400">Sponsored</span>
          <span aria-hidden="true">·</span>
          <span>{t('ad.partnerLink', 'Monetag Partner Link')}</span>
        </div>
        <h3 className="mt-1.5 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          {copy.heading}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.body}</p>
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Opens safely in a new tab
        </span>
        <a
          href={adConfig.directLink}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleIntentionalClick}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-500/25 dark:text-amber-200 whitespace-nowrap shrink-0 transition"
        >
          <span>{copy.cta}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </aside>
  );
};
