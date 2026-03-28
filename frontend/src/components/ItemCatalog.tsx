import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { getBazaar, getTopFlips, peekBazaarCache, peekTopFlipsCache } from '../services/api';
import type { BazaarItem, FlipRecommendation } from '../types/api';

interface ItemCatalogProps {
  onItemSelect: (productId: string) => void;
  searchQuery: string;
  onUpdated?: (d: Date) => void;
}

const INITIAL_GRID_ITEMS = 80;
const INITIAL_LIST_ITEMS = 120;
const LOAD_MORE_GRID_ITEMS = 80;
const LOAD_MORE_LIST_ITEMS = 120;

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function itemIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('cookie'))                           return 'cookie';
  if (n.includes('diamond'))                         return 'diamond';
  if (n.includes('enchant'))                         return 'auto_fix_high';
  if (n.includes('snow') || n.includes('ice'))       return 'ac_unit';
  if (n.includes('wheat'))                           return 'grass';
  if (n.includes('coal'))                            return 'dark_mode';
  if (n.includes('sword'))                           return 'swords';
  if (n.includes('ruby') || n.includes('gem'))       return 'circle';
  if (n.includes('leather'))                         return 'content_cut';
  if (n.includes('slime'))                           return 'bubble_chart';
  if (n.includes('feather'))                         return 'feather';
  if (n.includes('iron'))                            return 'hardware';
  if (n.includes('gold'))                            return 'toll';
  if (n.includes('quartz'))                          return 'hexagon';
  if (n.includes('stock'))                           return 'trending_up';
  if (n.includes('compactor'))                       return 'compress';
  if (n.includes('eye'))                             return 'visibility';
  if (n.includes('titanium'))                        return 'inbox';
  if (n.includes('core') || n.includes('judgement')) return 'skull';
  return 'inventory_2';
}

function SkeletonCard() {
  return (
    <div className="bg-surface-container flex flex-col p-4">
      <div className="flex justify-between items-start mb-4">
        <div className="sk w-12 h-12 rounded-sm" />
        <div className="sk h-2.5 w-20" />
      </div>
      <div className="sk h-5 w-3/4 mb-4" />
      <div className="grid grid-cols-2 gap-y-4 mb-4">
        <div><div className="sk h-2.5 w-16 mb-1.5" /><div className="sk h-4 w-20" /></div>
        <div className="text-right"><div className="sk h-2.5 w-16 mb-1.5 ml-auto" /><div className="sk h-4 w-20 ml-auto" /></div>
        <div><div className="sk h-2.5 w-12 mb-1.5" /><div className="sk h-3 w-16" /></div>
        <div className="text-right"><div className="sk h-2.5 w-12 mb-1.5 ml-auto" /><div className="sk h-3 w-16 ml-auto" /></div>
      </div>
    </div>
  );
}

function ItemCard({ item, flip, onClick }: { item: BazaarItem; flip?: FlipRecommendation; onClick: () => void }) {
  const spreadPct = item.currentSellPrice > 0
    ? ((item.currentBuyPrice - item.currentSellPrice) / item.currentSellPrice) * 100
    : 0;

  const instabuyHr  = Math.round(item.buyVolume  / 168);
  const instasellHr = Math.round(item.sellVolume / 168);

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-surface-container hover:bg-surface-container-highest transition-all group flex flex-col p-4 relative overflow-hidden text-left w-full"
    >
      {/* Subtle corner gradient */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-surface-container-lowest flex items-center justify-center border border-outline-variant/10 group-hover:border-primary/30 transition-colors rounded-sm">
          <span className="material-symbols-outlined text-primary text-3xl" aria-hidden
            style={{ fontVariationSettings: "'FILL' 1" }}>
            {itemIcon(item.name ?? item.productId)}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-stone-500 font-bold uppercase mt-1 truncate max-w-[100px]">
            ID: {item.productId}
          </p>
          {spreadPct > 0 && (
            <p className="text-[9px] font-mono font-bold mt-0.5" style={{ color: spreadPct >= 5 ? '#33e43d' : spreadPct >= 2 ? '#ffb952' : '#c6c4d9' }}>
              +{spreadPct.toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 className="text-lg font-headline font-bold text-on-surface mb-4 group-hover:text-primary transition-colors leading-tight truncate">
        {item.name ?? item.productId}
      </h3>

      {/* Prices + volume grid */}
      <div className="grid grid-cols-2 gap-y-3 mb-4 flex-1">
        <div>
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-tighter">Buy Price</p>
          <p className="font-headline font-bold text-on-surface text-sm">
            {fmt(item.currentBuyPrice)} <span className="text-xs text-primary">●</span>
          </p>
        </div>
        <div className="text-right border-l border-outline-variant/10 pl-2">
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-tighter">Sell Price</p>
          <p className="font-headline font-bold text-on-surface text-sm">
            {fmt(item.currentSellPrice)} <span className="text-xs text-stone-600">●</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-tighter">Supply</p>
          <p className="font-body font-medium text-on-surface-variant text-xs">{fmtVol(item.sellVolume)}</p>
        </div>
        <div className="text-right border-l border-outline-variant/10 pl-2">
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-tighter">Demand</p>
          <p className="font-body font-medium text-tertiary-fixed-dim text-xs">{fmtVol(item.buyVolume)}</p>
        </div>
      </div>

      {/* Footer: instabuys / instasells */}
      <div className="flex justify-between items-center pt-3 border-t border-outline-variant/10">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-bold text-stone-600">Instabuys</span>
          <span className="text-xs font-mono font-medium">{fmtVol(instabuyHr)}/hr</span>
        </div>
        {flip && (
          <span className="text-[10px] font-mono font-bold text-tertiary">+{flip.profitPercentage.toFixed(1)}%</span>
        )}
        <div className="flex flex-col text-right">
          <span className="text-[9px] uppercase font-bold text-stone-600">Instasells</span>
          <span className="text-xs font-mono font-medium">{fmtVol(instasellHr)}/hr</span>
        </div>
      </div>
    </button>
  );
}

export default function ItemCatalog({ onItemSelect, searchQuery, onUpdated }: ItemCatalogProps) {
  const cachedBazaar = peekBazaarCache();
  const cachedFlips = peekTopFlipsCache(200, 0);
  const [items, setItems]   = useState<BazaarItem[]>(cachedBazaar ?? []);
  const [flips, setFlips]   = useState<FlipRecommendation[]>(cachedFlips?.flips ?? []);
  const [loading, setLoading] = useState(!(cachedBazaar && cachedFlips));
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState(INITIAL_GRID_ITEMS);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    let alive = true;
    async function load(forceRefresh = false) {
      try {
        const [bazaar, flipsRes] = await Promise.all([
          getBazaar(forceRefresh),
          getTopFlips(200, 0, forceRefresh),
        ]);
        if (!alive) return;
        setItems(bazaar);
        setFlips(flipsRes.flips);
        onUpdated?.(new Date(flipsRes.generatedAt));
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load(false);
    const id = setInterval(() => void load(true), 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const flipsMap = useMemo(() => {
    const m = new Map<string, FlipRecommendation>();
    flips.forEach(f => m.set(f.productId, f));
    return m;
  }, [flips]);

  const filtered = useMemo(() => {
    if (!deferredSearchQuery) return items;
    const q = deferredSearchQuery.toLowerCase();
    return items.filter(
      item => (item.name ?? '').toLowerCase().includes(q) || item.productId.toLowerCase().includes(q)
    );
  }, [items, deferredSearchQuery]);

  useEffect(() => {
    setVisibleCount(viewMode === 'grid' ? INITIAL_GRID_ITEMS : INITIAL_LIST_ITEMS);
  }, [viewMode, deferredSearchQuery]);

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const canLoadMore = visibleCount < filtered.length;
  const loadMoreStep = viewMode === 'grid' ? LOAD_MORE_GRID_ITEMS : LOAD_MORE_LIST_ITEMS;

  function handleLoadMore() {
    setVisibleCount((current) => Math.min(current + loadMoreStep, filtered.length));
  }

  const totalVolume = useMemo(
    () => items.reduce((sum, i) => sum + i.buyVolume, 0),
    [items]
  );

  const topInsight = useMemo(
    () => [...flips].sort((a, b) => b.coinsPerHour - a.coinsPerHour)[0],
    [flips]
  );
  const netVol = useMemo(() => {
    if (items.length === 0) return null;
    const avgBuy  = items.reduce((s, i) => s + i.currentBuyPrice,  0) / items.length;
    const avgSell = items.reduce((s, i) => s + i.currentSellPrice, 0) / items.length;
    return ((avgSell - avgBuy) / avgBuy) * 100;
  }, [items]);

  return (
    <div className="p-8">
      {/* Page header */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight mb-1">Item Catalog</h1>
          <p className="text-on-surface-variant font-label text-xs uppercase tracking-[0.3em]">Real-time Bazaar Aggregator</p>
        </div>
        <div className="flex gap-4 items-center">
          {/* Grid / List toggle */}
          <div className="flex bg-surface-container-lowest p-1 rounded-sm border border-outline-variant/10">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-[10px] uppercase font-bold rounded-sm transition-colors ${
                viewMode === 'grid' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >Grid</button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-[10px] uppercase font-bold rounded-sm transition-colors ${
                viewMode === 'list' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >List</button>
          </div>
          <div className="h-10 w-px bg-outline-variant/20" />
          <div className="text-right">
            <p className="text-[10px] uppercase text-stone-500 font-bold tracking-widest">Global Volume</p>
            <p className="text-lg font-headline font-bold text-tertiary">
              {fmt(totalVolume)} <span className="text-xs font-normal text-on-surface-variant">/ wk</span>
            </p>
          </div>
        </div>
      </header>

      {/* Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : visibleItems.map(item => (
              <ItemCard
                key={item.productId}
                item={item}
                flip={flipsMap.get(item.productId)}
                onClick={() => onItemSelect(item.productId)}
              />
            ))
          }
          {!loading && filtered.length === 0 && (
            <div className="col-span-4 py-20 text-center text-stone-600 text-xs uppercase tracking-widest">
              No items match "{searchQuery}"
            </div>
          )}
        </div>
      ) : (
        /* List mode */
        <div className="bg-surface-container">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-container-high text-[10px] text-on-surface-variant uppercase tracking-widest">
                <th className="px-4 py-3 text-left font-bold">Item</th>
                <th className="px-4 py-3 text-right font-bold">Buy Price</th>
                <th className="px-4 py-3 text-right font-bold">Sell Price</th>
                <th className="px-4 py-3 text-right font-bold">Spread %</th>
                <th className="px-4 py-3 text-right font-bold">Volume/wk</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-t border-outline-variant/10">
                    {[140, 80, 80, 60, 60].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className={`sk h-3`} style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visibleItems.map(item => {
                const spreadPct = item.currentSellPrice > 0
                  ? ((item.currentBuyPrice - item.currentSellPrice) / item.currentSellPrice) * 100 : 0;
                return (
                  <tr
                    key={item.productId}
                    className="border-t border-outline-variant/10 hover:bg-surface-container-highest transition-colors cursor-pointer"
                    onClick={() => onItemSelect(item.productId)}
                  >
                    <td className="px-4 py-3 font-bold font-headline">{item.name ?? item.productId}</td>
                    <td className="px-4 py-3 text-right font-mono text-primary">{fmt(item.currentBuyPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono text-secondary">{fmt(item.currentSellPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={spreadPct >= 5 ? 'text-tertiary' : spreadPct >= 2 ? 'text-primary' : 'text-on-surface-variant'}>
                        +{spreadPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-on-surface-variant">{fmtVol(item.buyVolume)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center text-stone-600 text-xs uppercase tracking-widest">
              No items match "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-stone-600">
            Showing {visibleItems.length} of {filtered.length} items
          </p>
          {canLoadMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              className="bg-surface-container-high border border-outline-variant/20 hover:border-primary/30 text-on-surface px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
            >
              Load More
            </button>
          )}
        </div>
      )}

      {/* Market Insight + Volatility */}
      {!loading && topInsight && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-stone-900 to-stone-950 p-6 flex flex-col justify-between border-l-4 border-primary">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Market Insight</span>
              <h2 className="text-2xl font-headline font-bold mt-2">Bazaar Flipping Opportunity</h2>
              <p className="text-on-surface-variant text-sm mt-2 max-w-md">
                <strong className="text-on-surface">{topInsight.productName}</strong> is currently estimated at{' '}
                <span className="text-tertiary font-bold">{fmt(topInsight.coinsPerHour)} coins/hour</span>{' '}
                based on a conservative fill rate of{' '}
                <span className="text-on-surface font-mono">{topInsight.tradablePerHour.toFixed(1)}/hr</span>.
                Buy at{' '}
                <span className="text-on-surface font-mono">{fmt(topInsight.buyPrice)}</span>, sell at{' '}
                <span className="text-on-surface font-mono">{fmt(topInsight.sellPrice)}</span>{' '}
                for <span className="text-primary font-mono font-bold">{fmt(topInsight.profitMargin)}</span> coins/unit.
              </p>
            </div>
            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={() => onItemSelect(topInsight.productId)}
                className="bg-primary text-on-primary px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
              >
                View Analytics
              </button>
            </div>
          </div>
          <div className="bg-surface-container-high p-6 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-primary mb-2" aria-hidden>monitoring</span>
            <p className="text-[10px] uppercase font-bold text-stone-500 tracking-[0.2em]">Net Volatility</p>
            {netVol !== null && (
              <p className={`text-3xl font-headline font-bold mt-1 ${netVol < 0 ? 'text-error' : 'text-tertiary'}`}>
                {netVol > 0 ? '+' : ''}{netVol.toFixed(1)}%
              </p>
            )}
            <p className="text-[10px] text-stone-600 mt-2 uppercase">Avg spread across all tracked items</p>
          </div>
        </div>
      )}
    </div>
  );
}
