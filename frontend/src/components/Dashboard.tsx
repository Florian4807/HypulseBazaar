import { useState, useEffect, useMemo } from 'react';
import { getBazaar, getTopFlips, peekBazaarCache, peekTopFlipsCache } from '../services/api';
import type { BazaarItem, FlipRecommendation } from '../types/api';

interface DashboardProps {
  onItemSelect: (productId: string) => void;
  onUpdated?: (d: Date) => void;
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function itemIcon(name?: string): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('cookie'))                           return 'cookie';
  if (n.includes('diamond') || n.includes('gem'))    return 'diamond';
  if (n.includes('enchant'))                         return 'auto_fix_high';
  if (n.includes('snow') || n.includes('ice'))       return 'ac_unit';
  if (n.includes('wheat') || n.includes('hay'))      return 'grass';
  if (n.includes('coal') || n.includes('charcoal'))  return 'charcoal';
  if (n.includes('sword') || n.includes('blade'))    return 'swords';
  if (n.includes('compactor'))                       return 'compress';
  if (n.includes('eye'))                             return 'visibility';
  if (n.includes('ruby') || n.includes('gemstone'))  return 'circle';
  if (n.includes('leather') || n.includes('hide'))   return 'content_cut';
  if (n.includes('slime'))                           return 'bubble';
  return 'inventory_2';
}

function PanelHeader({ title, icon, borderColor }: { title: string; icon: string; borderColor: string }) {
  return (
    <div className={`px-5 py-4 border-l-4 ${borderColor} flex justify-between items-center bg-surface-container-high`}>
      <h3 className={`font-headline font-bold text-xs uppercase tracking-widest ${
        borderColor.includes('primary') ? 'text-primary' :
        borderColor.includes('secondary') ? 'text-secondary' :
        borderColor.includes('tertiary') ? 'text-tertiary' : 'text-on-surface-variant'
      }`}>{title}</h3>
      <span className="material-symbols-outlined text-stone-500 text-sm" aria-hidden>{icon}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between p-4 bg-surface-container-low">
      <div className="flex items-center space-x-3">
        <div className="sk w-8 h-8 rounded-sm" />
        <div className="space-y-1">
          <div className="sk h-3 w-28" />
          <div className="sk h-2.5 w-16" />
        </div>
      </div>
      <div className="sk h-4 w-12" />
    </div>
  );
}

export default function Dashboard({ onItemSelect, onUpdated }: DashboardProps) {
  const cachedBazaar = peekBazaarCache();
  const cachedFlips = peekTopFlipsCache(50, 0);
  const [flips, setFlips]   = useState<FlipRecommendation[]>(cachedFlips?.flips ?? []);
  const [items, setItems]   = useState<BazaarItem[]>(cachedBazaar ?? []);
  const [loading, setLoading] = useState(!(cachedBazaar && cachedFlips));

  useEffect(() => {
    let alive = true;
    async function load(forceRefresh = false) {
      try {
        const [flipsRes, bazaarRes] = await Promise.all([
          getTopFlips(50, 0, forceRefresh),
          getBazaar(forceRefresh),
        ]);
        if (!alive) return;
        setFlips(flipsRes.flips);
        setItems(bazaarRes);
        onUpdated?.(new Date(flipsRes.generatedAt));
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load(false);
    const id = setInterval(() => void load(true), 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const byCoinsHour = useMemo(() => [...flips].sort((a, b) => b.coinsPerHour - a.coinsPerHour).slice(0, 3), [flips]);
  const byMargin    = useMemo(() => [...flips].sort((a, b) => b.profitMargin      - a.profitMargin).slice(0, 3),     [flips]);
  const bySpreadPct = useMemo(() => [...flips].sort((a, b) => b.profitPercentage - a.profitPercentage).slice(0, 3), [flips]);
  const byVolume    = useMemo(() => [...items].sort((a, b) => b.buyVolume         - a.buyVolume).slice(0, 3),         [items]);
  const marketFavs  = useMemo(() => [...items].sort((a, b) => b.buyVolume         - a.buyVolume).slice(0, 5),         [items]);
  const maxVol      = useMemo(() => marketFavs[0]?.buyVolume || 1, [marketFavs]);

  return (
    <div className="p-8 flex-1">
      {/* Top row: 3 panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Top Crafts (by coins/hr) ─────────────────── */}
        <div className="lg:col-span-4 bg-surface-container p-1 flex flex-col">
          <PanelHeader title="Top Crafts (Coins/Hr)" icon="construction" borderColor="border-secondary" />
          <div className="space-y-px mt-1">
            {loading ? (
              [0, 1, 2].map(i => <SkeletonRow key={i} />)
            ) : byCoinsHour.length === 0 ? (
              <div className="p-8 text-center text-stone-600 text-xs uppercase tracking-widest">No data</div>
            ) : byCoinsHour.map(flip => (
              <button
                key={flip.productId}
                type="button"
                onClick={() => onItemSelect(flip.productId)}
                className="w-full flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-container-highest transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-stone-800 flex items-center justify-center rounded-sm">
                    <span className="material-symbols-outlined text-primary text-base" aria-hidden>
                      {itemIcon(flip.productName)}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-on-surface truncate max-w-[140px]">
                      {flip.productName || flip.productId}
                    </p>
                    <p className="text-[10px] text-stone-500 font-mono">
                      Fill: {flip.tradablePerHour.toFixed(1)}/hr
                    </p>
                  </div>
                </div>
                <span className="text-tertiary font-mono text-xs font-bold">{fmt(flip.coinsPerHour)}/hr</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Smart Margins (coins) ────────────────────── */}
        <div className="lg:col-span-4 bg-surface-container p-1 flex flex-col">
          <PanelHeader title="Smart Margins (Coins)" icon="payments" borderColor="border-primary" />
          <div className="space-y-px mt-1">
            {loading ? (
              [0, 1, 2].map(i => <SkeletonRow key={i} />)
            ) : byMargin.length === 0 ? (
              <div className="p-8 text-center text-stone-600 text-xs uppercase tracking-widest">No data</div>
            ) : byMargin.map(flip => (
              <button
                key={flip.productId}
                type="button"
                onClick={() => onItemSelect(flip.productId)}
                className="w-full flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-container-highest transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-on-surface truncate max-w-[200px]">
                    {flip.productName || flip.productId}
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Buy: {fmt(flip.buyPrice)} | Sell: {fmt(flip.sellPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-primary font-mono text-sm font-bold">{fmt(flip.profitMargin)}</p>
                  <p className="text-[9px] text-stone-600 uppercase">Per Unit</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Top Margins (%) ──────────────────────────── */}
        <div className="lg:col-span-4 bg-surface-container p-1 flex flex-col">
          <PanelHeader title="Top Margins (%)" icon="percent" borderColor="border-tertiary" />
          <div className="space-y-px mt-1">
            {loading ? (
              [0, 1, 2].map(i => <SkeletonRow key={i} />)
            ) : bySpreadPct.length === 0 ? (
              <div className="p-8 text-center text-stone-600 text-xs uppercase tracking-widest">No data</div>
            ) : bySpreadPct.map(flip => (
              <button
                key={flip.productId}
                type="button"
                onClick={() => onItemSelect(flip.productId)}
                className="w-full flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-container-highest transition-colors"
              >
                <p className="text-sm font-bold text-on-surface truncate max-w-[180px] text-left">
                  {flip.productName || flip.productId}
                </p>
                <span className="text-tertiary font-mono text-xl font-bold">
                  {flip.profitPercentage.toFixed(1)}%
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Volume Intensity ──────────────────────────── */}
        <div className="lg:col-span-6 bg-surface-container p-1 flex flex-col">
          <PanelHeader title="Volume Intensity" icon="waves" borderColor="border-outline-variant" />
          <div className="p-4 grid grid-cols-3 gap-4 bg-surface-container-low mt-1">
            {loading ? (
              [0, 1, 2].map(i => (
                <div key={i} className="relative overflow-hidden">
                  <div className="sk w-full h-24 rounded-sm" />
                </div>
              ))
            ) : byVolume.map(item => (
              <button
                key={item.productId}
                type="button"
                onClick={() => onItemSelect(item.productId)}
                className="relative overflow-hidden group bg-surface-container-high hover:bg-surface-container-highest transition-colors"
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-primary text-6xl" aria-hidden>
                    {itemIcon(item.name)}
                  </span>
                </div>
                <div className="relative p-3 h-24 flex flex-col justify-end">
                  <p className="text-[10px] font-black uppercase text-secondary truncate">{item.name}</p>
                  <p className="text-xs font-mono font-bold">{fmt(item.buyVolume)} vol/wk</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Market Favorites ──────────────────────────── */}
        <div className="lg:col-span-6 bg-surface-container p-1 flex flex-col">
          <PanelHeader title="Market Favorites" icon="star" borderColor="border-primary-container" />
          <div className="flex-1 bg-surface-container-low mt-1 p-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-stone-600 uppercase tracking-widest">
                  <th className="pb-3 font-normal">Asset</th>
                  <th className="pb-3 font-normal">Activity Score</th>
                  <th className="pb-3 font-normal text-right">Buy Price</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {loading ? (
                  [0, 1, 2, 3, 4].map(i => (
                    <tr key={i}>
                      <td className="py-2.5"><div className="sk h-3 w-24" /></td>
                      <td className="py-2.5"><div className="sk h-2 w-24" /></td>
                      <td className="py-2.5"><div className="sk h-3 w-14 ml-auto" /></td>
                    </tr>
                  ))
                ) : marketFavs.map(item => {
                  const pct = Math.round((item.buyVolume / maxVol) * 100);
                  return (
                    <tr
                      key={item.productId}
                      className="hover:bg-surface-container-highest transition-colors cursor-pointer group"
                      onClick={() => onItemSelect(item.productId)}
                    >
                      <td className="py-2.5 font-bold truncate max-w-[120px]">{item.name}</td>
                      <td className="py-2.5">
                        <div className="w-24 h-1 bg-stone-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-mono">{fmt(item.currentBuyPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
