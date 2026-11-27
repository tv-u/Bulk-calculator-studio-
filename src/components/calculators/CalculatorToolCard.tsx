import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Radio, Star, Zap } from 'lucide-react';
import { resolveCategoryTheme } from '../../theme/pageThemes';

export interface CalculatorCardItem {
  id?: string;
  slug: string;
  name: string;
  catalogNumber?: number;
  category: string;
  categoryLabel: string;
  subcategory?: string;
  toolKind?: string;
  shortDescription?: string;
}

interface CalculatorToolCardProps {
  item: CalculatorCardItem;
  activeLang: string;
  isFavorite?: boolean;
  onToggleFavorite?: (slugOrId: string) => void;
}

// Vibrant accent palettes matching the screenshot card + glowing 3D button style
const CARD_PALETTES = [
  {
    accent: '#22d3ee',
    titleDark: '#22d3ee',
    titleLight: '#0284c7',
    buttonGradient: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 55%, #0284c7 100%)',
    buttonShadow: '0 8px 20px -4px rgba(6, 182, 212, 0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
  },
  {
    accent: '#ec4899',
    titleDark: '#f472b6',
    titleLight: '#db2777',
    buttonGradient: 'linear-gradient(135deg, #f43f8f 0%, #ec4899 55%, #db2777 100%)',
    buttonShadow: '0 8px 20px -4px rgba(236, 72, 153, 0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
  },
  {
    accent: '#10b981',
    titleDark: '#34d399',
    titleLight: '#059669',
    buttonGradient: 'linear-gradient(135deg, #34d399 0%, #10b981 55%, #059669 100%)',
    buttonShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.52), inset 0 1px 0 rgba(255,255,255,0.35)',
  },
  {
    accent: '#8b5cf6',
    titleDark: '#a78bfa',
    titleLight: '#7c3aed',
    buttonGradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 55%, #6d28d9 100%)',
    buttonShadow: '0 8px 20px -4px rgba(139, 92, 246, 0.52), inset 0 1px 0 rgba(255,255,255,0.35)',
  },
  {
    accent: '#f97316',
    titleDark: '#fb923c',
    titleLight: '#ea580c',
    buttonGradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 55%, #ea580c 100%)',
    buttonShadow: '0 8px 20px -4px rgba(249, 115, 22, 0.52), inset 0 1px 0 rgba(255,255,255,0.35)',
  },
  {
    accent: '#3b82f6',
    titleDark: '#60a5fa',
    titleLight: '#2563eb',
    buttonGradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 55%, #2563eb 100%)',
    buttonShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.52), inset 0 1px 0 rgba(255,255,255,0.35)',
  },
];

const CATEGORY_PALETTE_INDEX: Record<string, number> = {
  finance: 2,
  mathematics: 0,
  health: 1,
  engineering: 0,
  construction: 4,
  business: 3,
  education: 5,
  science: 0,
  technology: 2,
  'daily-life': 5,
  automotive: 4,
  agriculture: 2,
  sports: 1,
  food: 4,
  legal: 3,
};

export const CalculatorToolCard: React.FC<CalculatorToolCardProps> = ({
  item,
  activeLang,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const catTheme = resolveCategoryTheme(item.category);
  const baseIdx = CATEGORY_PALETTE_INDEX[item.category] ?? 0;
  // Subtle alternation when catalogNumber is odd/even so consecutive cards pop cleanly like the reference
  const paletteIdx =
    item.catalogNumber !== undefined
      ? (baseIdx + (item.catalogNumber % 2 === 0 ? 1 : 0)) % CARD_PALETTES.length
      : baseIdx;
  const palette = CARD_PALETTES[paletteIdx];

  const slug = item.slug || item.id || '';
  const url = activeLang === 'en' ? `/calculators/${slug}/` : `/${activeLang}/${item.category}/${slug}`;
  const formattedNumber =
    item.catalogNumber !== undefined
      ? `#${String(item.catalogNumber).padStart(4, '0')}`
      : '#TOOL';

  const description =
    item.shortDescription ||
    `Professional ${item.name}. High-precision deterministic ${
      item.subcategory || item.categoryLabel
    } engine with instant breakdown, CSV & PDF export.`;

  return (
    <article className="card-3d group flex flex-col justify-between rounded-2xl border border-slate-200/85 bg-white/95 p-5 shadow-xl transition dark:border-white/10 dark:bg-[#0d111a]/95">
      <div>
        {/* Top Row: Icon + Category Badge on left, #Number + Star Button cleanly aligned on right */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
              style={{
                backgroundColor: `${palette.accent}1f`,
                borderColor: `${palette.accent}55`,
                color: palette.accent,
              }}
            >
              {item.toolKind === 'live-tool' ? (
                <Radio className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </span>

            <span
              className="truncate rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${palette.accent}1a`,
                borderColor: `${palette.accent}45`,
                color: palette.titleDark,
              }}
            >
              {item.categoryLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="rounded-full border border-amber-400/25 bg-slate-900 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-400 tabular-nums dark:bg-black/65">
              {formattedNumber}
            </span>
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(slug);
                }}
                aria-label={isFavorite ? `Remove ${item.name} from favorites` : `Favorite ${item.name}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                  isFavorite
                    ? 'border-amber-400/60 bg-amber-400/15 text-amber-400'
                    : 'border-slate-300 bg-slate-100 text-slate-500 hover:border-amber-400/50 hover:text-amber-400 dark:border-white/15 dark:bg-black/55 dark:text-slate-300'
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Vibrant Title & 2-Line Description */}
        <Link to={url} className="mt-4 block">
          <h3
            className="font-display text-lg font-bold tracking-tight transition-opacity group-hover:opacity-90"
            style={{ color: palette.titleDark }}
          >
            {item.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {description}
          </p>
        </Link>
      </div>

      {/* Divider + Bottom Row: Monospace Slug Pill + Glowing 3D LAUNCH TOOL Button */}
      <div className="mt-4 border-t border-slate-200/80 pt-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-2.5">
          <span
            title={`/${slug}`}
            className="min-w-0 truncate rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-[11px] text-slate-600 dark:border-white/10 dark:bg-black/55 dark:text-slate-300"
          >
            /{slug}
          </span>

          <Link
            to={url}
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            style={{
              background: palette.buttonGradient || catTheme.gradient,
              boxShadow: palette.buttonShadow,
            }}
          >
            <span>Launch Tool</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};
