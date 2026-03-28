import { useState, useEffect, useMemo } from 'react';
import { getTopFlips, peekTopFlipsCache } from '../services/api';
import type { FlipRecommendation } from '../types/api';

interface OpportunitiesProps {
  onItemSelect: (productId: string) => void;
  searchQuery?: string;
  onUpdated?: (d: Date) => void;
}

type SortKey = 'name' | 'buyPrice' | 'sellPrice' | 'profitMargin' | 'profitPercentage' | 'recommendationScore';
type SortDir = 'asc' | 'desc';

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function spreadTier(pct: number): 'high' | 'med' | 'low' {
  if (pct >= 5) return 'high';
  if (pct >= 2) return 'med';
  return 'low';
}

const TIER_CLASSES = {
  high: 'text-tertiary bg-tertiary/10 border border-tertiary/25',
  med:  'text-primary bg-primary/10 border border-primary/25',
  low:  'text-on-surface-variant bg-white/5 border border-white/10',
};

const RANK_CLASSES = ['text-primary bg-primary/10', 'text-on-surface-variant/70 bg-white/5', 'text-on-surface-variant/50 bg-white/5'];

export default function Opportunities({ onItemSelect, searchQuery = '', onUpdated }: OpportunitiesProps) {
  const cached = peekTopFlipsCache(100, 0);
  const [flips, setFlips]     = useState<FlipRecommendation[]>(cached?.flips ?? []);
  const [loading, setLoading] = useState(!cached);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    cached ? new Date(cached.generatedAt) : null
  );
  const [sortKey, setSortKey] = useState<SortKey>('profitPercentage');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  async function load(forceRefresh = false) {
    if (forceRefresh) setLoading(true);
    try {
      const res = await getTopFlips(100, 0, forceRefresh);
      setFlips(res.flips);
      const d = new Date(res.generatedAt);
      setLastUpdated(d);
      onUpdated?.(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
    const id = setInterval(() => void load(true), 60_000);
    return () => clearInterval(id);
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  }

  const sorted = useMemo(() => {
    let src = flips;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      src = flips.filter(f => f.productName.toLowerCase().includes(q) || f.productId.toLowerCase().includes(q));
    }
    return [...src].sort((a, b) => {
      let av: number | string, bv: number | string;
      switch (sortKey) {
        case 'name':              av = a.productName;       bv = b.productName;       break;
        case 'buyPrice':          av = a.buyPrice;          bv = b.buyPrice;          break;
        case 'sellPrice':         av = a.sellPrice;         bv = b.sellPrice;         break;
        case 'profitMargin':      av = a.profitMargin;      bv = b.profitMargin;      break;
        case 'profitPercentage':  av = a.profitPercentage;  bv = b.profitPercentage;  break;
        case 'recommendationScore': av = a.recommendationScore; bv = b.recommendationScore; break;
        default: return 0;
      }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? av - (bv as number) : (bv as number) - av;
    });
  }, [flips, searchQuery, sortKey, sortDir]);

  function Th({ col, label, title, right }: { col: SortKey; label: string; title?: string; right?: boolean }) {
    const active = sortKey === col;
    return (
      <th
        className={[
          'px-4 py-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none',
          'transition-colors duration-150',
          right ? 'text-right' : 'text-left',
          active ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface',
        ].join(' ')}
        onClick={() => handleSort(col)}
        title={title}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      >
        {label}
        <span className={`ml-1 text-[0.6em] ${active ? 'opacity-90' : 'opacity-25'}`}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </th>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight mb-1">Opportunities</h1>
          <p className="text-on-surface-variant font-label text-xs uppercase tracking-[0.3em]">
            Bid–ask spread ranking · Instant Buy − Instant Sell
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary inline-block animate-pulse" />
              {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="bg-surface-container-high border border-outline-variant/20 hover:border-primary/30 text-on-surface px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[800px]">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant w-12">#</th>
              <Th col="name"              label="Item"        />
              <Th col="buyPrice"          label="Instant Buy"  title="Cost to buy one unit now"     right />
              <Th col="sellPrice"         label="Instant Sell" title="Coins received selling one unit" right />
              <Th col="profitMargin"      label="Spread"       title="Buy − Sell margin per unit"    right />
              <Th col="profitPercentage"  label="Spread %"     title="Spread as % of Instant Sell"   right />
              <Th col="recommendationScore" label="Score"      title="Overall recommendation score"  right />
            </tr>
          </thead>
          <tbody>
            {loading && flips.length === 0 ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-t border-outline-variant/5">
                  {[40, 160, 80, 80, 80, 70, 50].map((w, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="sk h-3" style={{ width: w }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-stone-600 text-xs uppercase tracking-widest">
                  No opportunities found
                </td>
              </tr>
            ) : sorted.map((flip, idx) => {
              const tier = spreadTier(flip.profitPercentage);
              const scoreClass = flip.recommendationScore >= 7 ? TIER_CLASSES.high : flip.recommendationScore >= 4 ? TIER_CLASSES.med : TIER_CLASSES.low;
              const rankClass = RANK_CLASSES[Math.min(idx, 2)];
              return (
                <tr
                  key={flip.productId}
                  className="border-t border-outline-variant/5 hover:bg-surface-container-highest transition-colors cursor-pointer group"
                  onClick={() => onItemSelect(flip.productId)}
                  title={`View history for ${flip.productName}`}
                >
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-7 h-6 text-[10px] font-mono font-bold rounded-sm ${rankClass}`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-on-surface group-hover:text-primary transition-colors">{flip.productName}</div>
                    <div className="text-[10px] text-stone-600 font-mono mt-0.5">{flip.productId}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-primary">{fmt(flip.buyPrice)}</td>
                  <td className="px-4 py-3 text-right font-mono text-secondary">{fmt(flip.sellPrice)}</td>
                  <td className="px-4 py-3 text-right font-mono text-on-surface">+{fmt(flip.profitMargin)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm ${TIER_CLASSES[tier]}`}>
                      +{flip.profitPercentage.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm ${scoreClass}`}>
                      {flip.recommendationScore.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && sorted.length > 0 && (
        <p className="mt-3 text-right text-[10px] font-mono text-stone-600">
          {sorted.length} opportunities · click any row to view price history
        </p>
      )}
    </div>
  );
}
