import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calculator, Clock, Search, Sparkles, X } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { searchRegistry, type SearchMatch } from '../../engine/searchEngine';
import { PremiumSearchReveal } from '../motion/MotionLibrary';

interface SmartSearchProps {
  variant?: 'hero' | 'header' | 'dashboard' | 'mobile';
  placeholder?: string;
  onSelect?: () => void;
  autoFocus?: boolean;
  enableSlashShortcut?: boolean;
}

const SUGGESTED_QUERIES = [
  'EMI',
  'SIP',
  'Black-Scholes',
  'Byaj',
  'Kist',
  'Concrete',
  'IP Subnet',
  'Cricket Run Rate',
  'DNS Lookup',
  'Bulk CSV',
];

function HighlightedText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-blue-500/25 px-0.5 text-inherit font-semibold">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export const SmartSearch: React.FC<SmartSearchProps> = ({
  variant = 'hero',
  placeholder,
  onSelect,
  autoFocus = false,
  enableSlashShortcut = false,
}) => {
  const navigate = useNavigate();
  const { searchIndex, recentSearches, addRecentSearch, clearRecentSearches, t } = useStudio();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const effectivePlaceholder =
    placeholder ||
    t('search.placeholder', 'Search 2,600 calculators, formulas, Hindi terms (byaj, kist)...');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 80);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Optional '/' shortcut focus when on Home hero
  useEffect(() => {
    if (!enableSlashShortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enableSlashShortcut]);

  const matches: SearchMatch[] = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return searchRegistry(debouncedQuery, searchIndex, 12);
  }, [debouncedQuery, searchIndex]);

  useEffect(() => {
    setActiveIndex(0);
  }, [matches.length, debouncedQuery]);

  const openResult = (match: SearchMatch) => {
    addRecentSearch(query.trim() || match.item.name);
    setIsOpen(false);
    setQuery('');
    navigate(match.item.route);
    onSelect?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!isOpen) setIsOpen(true);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (matches.length > 0) setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (matches.length > 0) setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      if (matches[activeIndex]) {
        e.preventDefault();
        openResult(matches[activeIndex]);
      }
    }
  };

  const isHero = variant === 'hero';

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`liquid-glass card-3d flex items-center gap-2.5 transition-all ${
          isHero ? 'rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5' : 'rounded-xl px-3 py-2'
        } focus-within:ring-2 focus-within:ring-blue-500/60`}
      >
        <Search className={`${isHero ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 text-slate-400`} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          autoFocus={autoFocus}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={effectivePlaceholder}
          aria-label="Search 2,600 calculators and studio tools"
          aria-expanded={isOpen}
          className={`w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 ${
            isHero ? 'text-sm sm:text-base' : 'text-sm'
          }`}
        />
        {enableSlashShortcut && !query && (
          <kbd className="hidden sm:inline-flex items-center rounded border border-slate-300/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-700">
            /
          </kbd>
        )}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setDebouncedQuery('');
              inputRef.current?.focus();
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <PremiumSearchReveal className="liquid-glass absolute left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl p-3 shadow-2xl">
          {debouncedQuery.trim() ? (
            <>
              <div className="mb-2 flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {matches.length} {matches.length === 1 ? 'result' : 'results'} across 2,600+ tools
                </span>
                <span>Use ↑↓ and Enter</span>
              </div>
              {matches.length > 0 ? (
                <ul role="listbox" className="space-y-1">
                  {matches.map((m, idx) => {
                    const active = idx === activeIndex;
                    return (
                      <li key={m.item.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => openResult(m)}
                          className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-start transition ${
                            active
                              ? 'bg-blue-500/15 text-slate-900 dark:text-white'
                              : 'text-slate-800 hover:bg-slate-200/40 dark:text-slate-200 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-xs font-mono font-bold"
                              style={{ background: 'var(--page-gradient)' }}
                            >
                              {m.item.kind === 'studio' ? (
                                <Sparkles className="h-4 w-4" />
                              ) : m.item.catalogNumber ? (
                                `#${m.item.catalogNumber}`
                              ) : (
                                <Calculator className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">
                                <HighlightedText text={m.item.name} query={debouncedQuery} />
                              </div>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {m.item.shortDescription}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{m.item.categoryLabel}</span>
                                {m.matchedKeyword && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-blue-600 dark:text-blue-400">
                                      Matched: {m.matchedKeyword}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-3 py-6 text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    No matching calculators found for &ldquo;{debouncedQuery}&rdquo;.
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Try searching EMI, Black-Scholes, Concrete, Byaj, #42, or open Custom Builder.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4 p-1">
              {recentSearches.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5" /> Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-xs hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {recentSearches.map((rs) => (
                      <button
                        key={rs}
                        type="button"
                        onClick={() => setQuery(rs)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {rs}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="mb-1.5 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Popular Across 2,600+ Calculators
                </div>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {SUGGESTED_QUERIES.map((sq) => (
                    <button
                      key={sq}
                      type="button"
                      onClick={() => setQuery(sq)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </PremiumSearchReveal>
      )}
    </div>
  );
};
