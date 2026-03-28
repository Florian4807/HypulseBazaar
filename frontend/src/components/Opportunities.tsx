import { useState, useEffect, useMemo } from 'react';
import { getTopFlips, peekTopFlipsCache } from '../services/api';
import type { FlipRecommendation } from '../types/api';

interface OpportunitiesProps {
  onItemSelect: (productId: string) => void;
  searchQuery?: string;
  onUpdated?: (d: Date) => void;
}

type SortKey =
  | 'name'
  | 'coinsPerHour'
  | 'buyPrice'
  | 'oneHourInstabuys'
  | 'sellPrice'
  | 'oneHourInstasells'
  | 'profitMargin'
  | 'profitPercentage';
type SortDir = 'asc' | 'desc';

function fmtCoins(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function itemIcon(name?: string): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('cookie')) return 'cookie';
  if (n.includes('diamond') || n.includes('gem')) return 'diamond';
  if (n.includes('enchant')) return 'auto_fix_high';
  if (n.includes('snow') || n.includes('ice')) return 'ac_unit';
  if (n.includes('wheat') || n.includes('seed')) return 'grass';
  if (n.includes('coal') || n.includes('charcoal')) return 'dark_mode';
  if (n.includes('sword')) return 'swords';
  if (n.includes('slime')) return 'bubble_chart';
  if (n.includes('fish')) return 'set_meal';
  return 'inventory_2';
}

const TIER_CLASSES = {
  high: 'text-tertiary bg-tertiary/10 border border-tertiary/25',
  med:  'text-primary bg-primary/10 border border-primary/25',
  low:  'text-on-surface-variant bg-white/5 border border-white/10',
};

const RANK_CLASSES = ['text-primary bg-primary/10', 'text-on-surface-variant/70 bg-white/5', 'text-on-surface-variant/50 bg-white/5'];
const OPPORTUNITIES_FETCH_COUNT = 5000;
const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'coinsPerHour', label: 'Coins per Hour' },
  { value: 'buyPrice', label: 'Buy Price' },
  { value: 'oneHourInstabuys', label: 'One-Hour Instabuys' },
  { value: 'sellPrice', label: 'Sell Price' },
  { value: 'oneHourInstasells', label: 'One-Hour Instasells' },
  { value: 'profitMargin', label: 'Margin (coins)' },
  { value: 'profitPercentage', label: 'Margin (%)' },
];

export default function Opportunities({ onItemSelect, searchQuery = '', onUpdated }: OpportunitiesProps) {
  const cached = peekTopFlipsCache(OPPORTUNITIES_FETCH_COUNT, 0);
  const [flips, setFlips]     = useState<FlipRecommendation[]>(cached?.flips ?? []);
  const [loading, setLoading] = useState(!cached);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    cached ? new Date(cached.generatedAt) : null
  );
  const [sortKey, setSortKey] = useState<SortKey>('coinsPerHour');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const minTradablePerHour = 0.5;

  const primaryOrder: SortKey[] = [
    'coinsPerHour',
    'buyPrice',
    'oneHourInstabuys',
    'sellPrice',
    'oneHourInstasells',
    'profitMargin',
    'profitPercentage',
  ];

  async function load(forceRefresh = false) {
    if (forceRefresh) setLoading(true);
    try {
      const res = await getTopFlips(OPPORTUNITIES_FETCH_COUNT, 0, forceRefresh);
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

  const sorted = useMemo(() => {
    let src = flips.filter(f => f.tradablePerHour >= minTradablePerHour && f.coinsPerHour > 0);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      src = flips.filter(f => (f.productName ?? '').toLowerCase().includes(q) || f.productId.toLowerCase().includes(q));
      src = src.filter(f => f.tradablePerHour >= minTradablePerHour && f.coinsPerHour > 0);
    }

    const orderedKeys: SortKey[] = sortKey === 'name'
      ? ['name', ...primaryOrder.filter(k => k !== 'name')]
      : [sortKey, ...primaryOrder.filter(k => k !== sortKey)];

    const getValue = (flip: FlipRecommendation, key: SortKey): number | string => {
      switch (key) {
        case 'name': return flip.productName;
        case 'coinsPerHour': return flip.coinsPerHour;
        case 'buyPrice': return flip.buyPrice;
        case 'oneHourInstabuys': return flip.oneHourInstabuys;
        case 'sellPrice': return flip.sellPrice;
        case 'oneHourInstasells': return flip.oneHourInstasells;
        case 'profitMargin': return flip.profitMargin;
        case 'profitPercentage': return flip.profitPercentage;
      }
    };

    return [...src].sort((a, b) => {
      for (const key of orderedKeys) {
        const av = getValue(a, key);
        const bv = getValue(b, key);
        const direction: SortDir = key === sortKey ? sortDir : 'desc';

        if (typeof av === 'string' && typeof bv === 'string') {
          const cmp = av.localeCompare(bv);
          if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
          continue;
        }

        const na = Number(av);
        const nb = Number(bv);
        if (na === nb) continue;
        return direction === 'asc' ? na - nb : nb - na;
      }

      return 0;
    });
  }, [flips, searchQuery, sortKey, sortDir]);

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
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Sort Key</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs px-2 py-1 rounded-sm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
              className="bg-surface-container-high border border-outline-variant/20 hover:border-primary/30 text-on-surface px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-all"
              title="Toggle sort direction"
            >
              {sortDir === 'asc' ? 'ASC' : 'DESC'}
            </button>
          </div>
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
        <table className="w-full border-collapse text-sm min-w-[1150px]">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant w-12">#</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Item</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Buy Price</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">One-Hour Instabuys</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Sell Price</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">One-Hour Instasells</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Margin</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Coins per Hour</th>
            </tr>
          </thead>
          <tbody>
            {loading && flips.length === 0 ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-t border-outline-variant/5">
                  {[40, 200, 90, 90, 90, 90, 90, 100].map((w, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="sk h-3" style={{ width: w }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-stone-600 text-xs uppercase tracking-widest">
                  No opportunities found
                </td>
              </tr>
            ) : sorted.map((flip, idx) => {
              const scoreClass = flip.coinsPerHour >= 50_000_000 ? TIER_CLASSES.high : flip.coinsPerHour >= 10_000_000 ? TIER_CLASSES.med : TIER_CLASSES.low;
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
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-surface-container-lowest border border-outline-variant/20 rounded-sm flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-lg" aria-hidden>{itemIcon(flip.productName)}</span>
                      </div>
                      <div>
                        <div className="font-bold text-on-surface group-hover:text-primary transition-colors">
                          {flip.productName || flip.productId}
                        </div>
                        <div className="text-[10px] text-stone-600 font-mono mt-0.5">{flip.productId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-primary">{fmtCoins(flip.buyPrice)}</td>
                  <td className="px-4 py-3 text-right font-mono text-on-surface">{flip.oneHourInstabuys.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-mono text-secondary">{fmtCoins(flip.sellPrice)}</td>
                  <td className="px-4 py-3 text-right font-mono text-on-surface">{flip.oneHourInstasells.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-mono text-on-surface">+{fmtCoins(flip.profitMargin)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm ${scoreClass}`}>
                      {fmtCoins(flip.coinsPerHour)}
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
