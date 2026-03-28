import { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getItemHistory } from '../services/api';
import type { PriceHistory, PriceSnapshot } from '../types/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface ItemDetailProps {
  productId: string;
  onBack: () => void;
  onUpdated?: (d: Date) => void;
}

type TimeRange = '24h' | '7d' | '30d' | 'all';

const RANGE_OPTS: { value: TimeRange; label: string; title: string }[] = [
  { value: '24h', label: '24h', title: 'Last 24 hours' },
  { value: '7d',  label: '7d',  title: 'Last 7 days' },
  { value: '30d', label: '30d', title: 'Last 30 days' },
];

const CHART_FONT = '"Space Grotesk", sans-serif';
const MONO_FONT  = '"JetBrains Mono", ui-monospace, monospace';

function parseTs(iso: string): Date {
  const t = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(t)) return new Date(`${t}Z`);
  return new Date(t);
}

function fmtDate(ts: string) {
  return parseTs(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtPrice(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fmtFull(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function StatCard({
  label, value, sub, valueClass = 'text-on-surface',
}: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="bg-surface-container p-4">
      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">{label}</p>
      <p className={`text-xl font-headline font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-stone-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function ItemDetail({ productId, onBack, onUpdated }: ItemDetailProps) {
  const [history, setHistory]   = useState<PriceHistory | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        let start: string | undefined;
        if (timeRange === '24h') start = new Date(now.getTime() - 24*3600_000).toISOString();
        else if (timeRange === '7d') start = new Date(now.getTime() - 7*24*3600_000).toISOString();
        else if (timeRange === '30d') start = new Date(now.getTime() - 30*24*3600_000).toISOString();
        const data = await getItemHistory(productId, start);
        if (!alive) return;
        setHistory(data);
        if (data.snapshots.length) {
          onUpdated?.(parseTs(data.snapshots[data.snapshots.length - 1].timestamp));
        }
      } catch {
        if (alive) setError('Failed to load price history');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [productId, timeRange]);

  const ordered = useMemo<PriceSnapshot[]>(() => {
    if (!history?.snapshots.length) return [];
    return [...history.snapshots].sort((a, b) => parseTs(a.timestamp).getTime() - parseTs(b.timestamp).getTime());
  }, [history]);

  const latest = useMemo(() => {
    if (!ordered.length) return null;
    const s = ordered[ordered.length - 1];
    const s24 = ordered.find(x => parseTs(x.timestamp).getTime() >= (parseTs(s.timestamp).getTime() - 24*3600_000));
    const change24 = s24 && s24.buyPrice > 0 ? ((s.buyPrice - s24.buyPrice) / s24.buyPrice) * 100 : null;
    const spread = s.buyPrice - s.sellPrice;
    const spreadPct = s.sellPrice > 0 ? (spread / s.sellPrice) * 100 : 0;
    return { ...s, change24, spread, spreadPct };
  }, [ordered]);

  const spanDays = useMemo(() => {
    if (ordered.length < 2) return 0;
    return (parseTs(ordered[ordered.length - 1].timestamp).getTime() - parseTs(ordered[0].timestamp).getTime()) / 86_400_000;
  }, [ordered]);

  const chartData = useMemo(() => {
    if (!ordered.length) return null;
    return {
      datasets: [
        {
          label: 'Instant Buy',
          data: ordered.map(s => ({ x: parseTs(s.timestamp).getTime(), y: s.buyPrice })),
          borderColor: '#ffb952',
          backgroundColor: 'rgba(255,185,82,0.06)',
          fill: true, tension: 0.35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5,
          pointHoverBackgroundColor: '#ffb952', pointHoverBorderColor: '#201f1f', pointHoverBorderWidth: 2,
        },
        {
          label: 'Instant Sell',
          data: ordered.map(s => ({ x: parseTs(s.timestamp).getTime(), y: s.sellPrice })),
          borderColor: '#c1c1ff',
          backgroundColor: 'rgba(193,193,255,0.04)',
          fill: true, tension: 0.35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5,
          pointHoverBackgroundColor: '#c1c1ff', pointHoverBorderColor: '#201f1f', pointHoverBorderWidth: 2,
        },
      ],
    };
  }, [ordered]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: '#c6c4d9',
          font: { family: CHART_FONT, size: 11 },
          usePointStyle: true, boxWidth: 6, padding: 14,
        },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: '#0e0e0e',
        titleColor: '#e5e2e1',
        bodyColor: '#e5e2e1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12, cornerRadius: 2,
        titleFont: { family: CHART_FONT, size: 11, weight: 600 as const },
        bodyFont: { family: MONO_FONT, size: 12 },
        callbacks: {
          title: (items: any[]) => {
            const x = items[0]?.parsed?.x;
            return typeof x === 'number' ? fmtDate(new Date(x).toISOString()) : '';
          },
          label: (ctx: any) => {
            const v = typeof ctx.raw === 'number' ? ctx.raw : ctx.raw?.y;
            return `  ${ctx.dataset.label}: ${fmtFull(v)} coins`;
          },
          afterBody: (items: any[]) => {
            if (items.length < 2) return [];
            const buy  = (items.find(i => i.dataset.label === 'Instant Buy')?.raw as any)?.y;
            const sell = (items.find(i => i.dataset.label === 'Instant Sell')?.raw as any)?.y;
            if (buy && sell) return [`  Spread: ${fmtFull(buy - sell)} coins`];
            return [];
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        offset: false,
        bounds: 'data' as const,
        min: ordered.length ? parseTs(ordered[0].timestamp).getTime() : undefined,
        max: ordered.length ? parseTs(ordered[ordered.length - 1].timestamp).getTime() : undefined,
        ticks: {
          color: '#464556',
          maxTicksLimit: spanDays > 30 ? 12 : 8,
          autoSkip: true,
          font: { family: CHART_FONT, size: 10 },
          callback: (v: string | number) => {
            const d = new Date(Number(v));
            if (spanDays > 45) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          },
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: {
          color: '#464556',
          font: { family: MONO_FONT, size: 10 },
          callback: (v: string | number) => fmtPrice(Number(v)),
        },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
  }), [ordered, spanDays]);

  const recentSnapshots = useMemo(() => [...ordered].reverse().slice(0, 10), [ordered]);
  const supplyDensity = latest
    ? (latest.sellVolume > 1_000_000 ? 'High' : latest.sellVolume > 100_000 ? 'Medium' : 'Low')
    : '—';
  const demandTrend = latest && latest.buyVolume > 0 && latest.sellVolume > 0
    ? (latest.buyVolume / latest.sellVolume > 1.2 ? 'Rising' : latest.buyVolume / latest.sellVolume < 0.8 ? 'Falling' : 'Stable')
    : '—';

  return (
    <div className="p-8">
      {/* Page title */}
      <header className="h-12 flex items-center mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-stone-500 hover:text-primary transition-colors text-[10px] uppercase tracking-widest font-bold mr-6"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden>arrow_back</span>
          Items
        </button>
        <h2 className="text-xl font-bold text-primary tracking-tighter font-headline">
          {history?.productName || productId}
        </h2>
        <span className="ml-3 text-stone-600 font-mono text-xs">{productId}</span>
      </header>

      {/* ── Main metric + stat cards ─────────────────────── */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        {/* Hero price */}
        <div className="col-span-12 md:col-span-4 bg-surface-container p-6 flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-label font-bold mb-1">
              Current Bazaar Price
            </p>
            {loading ? (
              <>
                <div className="sk h-10 w-40 mb-3" />
                <div className="sk h-4 w-20" />
              </>
            ) : latest ? (
              <>
                <h3 className="text-4xl font-headline font-bold text-primary tracking-tighter">
                  {fmtPrice(latest.buyPrice)}
                </h3>
                {latest.change24 !== null && (
                  <div className={`flex items-center text-xs mt-2 font-bold ${latest.change24 >= 0 ? 'text-tertiary' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-sm mr-1" aria-hidden>
                      {latest.change24 >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {latest.change24 >= 0 ? '+' : ''}{latest.change24.toFixed(1)}% (24h)
                  </div>
                )}
              </>
            ) : (
              <p className="text-stone-600 text-sm">No data available</p>
            )}
          </div>
          <div className="mt-8 flex space-x-2">
            <div className="flex-1 bg-surface-container-highest py-2 text-center text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">
              Set Alert
            </div>
            <div className="flex-1 bg-surface-container-highest py-2 text-center text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">
              Compare
            </div>
          </div>
        </div>

        {/* 6 stat cards */}
        <div className="col-span-12 md:col-span-8 grid grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-container p-4">
                <div className="sk h-2.5 w-20 mb-2" />
                <div className="sk h-6 w-16 mb-1.5" />
                <div className="sk h-2 w-24" />
              </div>
            ))
          ) : latest ? (
            <>
              <StatCard
                label="Buy Volume"
                value={fmt(latest.buyVolume)}
                sub="Units per week"
              />
              <StatCard
                label="Sell Volume"
                value={fmt(latest.sellVolume)}
                sub="Units per week"
              />
              <StatCard
                label="Profit Margin"
                value={`${latest.spreadPct.toFixed(1)}%`}
                sub="Estimated Flipping"
                valueClass={latest.spreadPct >= 2 ? 'text-secondary' : 'text-on-surface-variant'}
              />
              <StatCard
                label="Supply Density"
                value={supplyDensity}
                sub="Market Saturation"
              />
              <StatCard
                label="Demand Trend"
                value={demandTrend}
                sub="Volume Analysis"
                valueClass={demandTrend === 'Rising' ? 'text-tertiary' : demandTrend === 'Falling' ? 'text-error' : 'text-on-surface'}
              />
              <StatCard
                label="Bid–Ask Spread"
                value={fmt(latest.spread)}
                sub={`${latest.spreadPct.toFixed(2)}% spread`}
                valueClass="text-primary"
              />
            </>
          ) : (
            <div className="col-span-3 flex items-center justify-center text-stone-600 text-xs uppercase tracking-widest">
              No data
            </div>
          )}
        </div>
      </div>

      {/* ── Price History Chart ────────────────────────── */}
      <div className="bg-surface-container p-6 mb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-6">
            <h4 className="font-headline font-bold text-sm uppercase tracking-widest">Price History</h4>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-[10px] uppercase font-bold tracking-tighter">
                <span className="w-3 h-0.5 bg-primary mr-2 inline-block" />
                Instant Buy
              </div>
              <div className="flex items-center text-[10px] uppercase font-bold tracking-tighter">
                <span className="w-3 h-0.5 bg-secondary mr-2 inline-block" />
                Instant Sell
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex bg-surface-container-lowest p-1 rounded-sm">
              {RANGE_OPTS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimeRange(opt.value)}
                  className={`px-3 py-1 text-[10px] uppercase font-bold tracking-widest transition-colors ${
                    timeRange === opt.value
                      ? 'bg-surface-container-highest text-primary'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1 text-[10px] uppercase font-bold tracking-widest transition-colors ${
                  timeRange === 'all'
                    ? 'bg-surface-container-highest text-primary'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Chart */}
        {loading ? (
          <div className="h-64 flex items-center justify-center gap-3 text-stone-500 text-sm">
            <div className="w-5 h-5 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
            Loading history…
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-error text-sm">{error}</div>
        ) : !ordered.length ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4 text-stone-600">
            <span className="material-symbols-outlined text-4xl opacity-25" aria-hidden>bar_chart</span>
            <p className="text-xs uppercase tracking-widest">
              {timeRange !== 'all' ? 'No data in this time range — try "All"' : 'No history recorded yet'}
            </p>
            {timeRange !== 'all' && (
              <button type="button" onClick={() => setTimeRange('all')}
                className="text-[10px] uppercase tracking-widest text-primary hover:text-primary/80 font-bold">
                View All History
              </button>
            )}
          </div>
        ) : (
          <div className="relative h-64 w-full">
            {chartData && <Line data={chartData} options={chartOptions} />}
            {/* X-axis labels */}
            {ordered.length >= 2 && (
              <div className="absolute -bottom-6 flex justify-between w-full text-[8px] text-stone-600 font-bold uppercase">
                <span>{ordered.length > 0 ? fmtDate(ordered[0].timestamp) : ''}</span>
                <span>NOW</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Recent Snapshots ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buy prices (recent) */}
        <div className="bg-surface-container">
          <div className="px-6 py-4 flex items-center justify-between">
            <h5 className="font-headline font-bold text-xs uppercase tracking-widest flex items-center">
              <span className="w-2 h-2 bg-tertiary rounded-full mr-2" />
              Buy Price (Demand)
            </h5>
            <span className="text-[10px] text-stone-500 font-bold">10 Most Recent</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest">
                  <th className="px-6 py-2 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">Timestamp</th>
                  <th className="px-6 py-2 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant text-right">Price / Unit</th>
                  <th className="px-6 py-2 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-outline-variant/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-2.5"><div className="sk h-3 w-28" /></td>
                      <td className="px-6 py-2.5 text-right"><div className="sk h-3 w-20 ml-auto" /></td>
                      <td className="px-6 py-2.5 text-right"><div className="sk h-3 w-14 ml-auto" /></td>
                    </tr>
                  ))
                ) : recentSnapshots.map((s, i) => (
                  <tr key={i} className={`hover:bg-surface-container-highest transition-colors ${i % 2 ? 'bg-surface-container-low/30' : ''}`}>
                    <td className="px-6 py-2.5 text-stone-500 font-mono text-[10px]">{fmtDate(s.timestamp)}</td>
                    <td className="px-6 py-2.5 text-right font-bold text-tertiary font-mono">{fmtFull(s.buyPrice)}</td>
                    <td className="px-6 py-2.5 text-right text-stone-400 font-mono">{fmt(s.buyVolume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sell prices (recent) */}
        <div className="bg-surface-container">
          <div className="px-6 py-4 flex items-center justify-between">
            <h5 className="font-headline font-bold text-xs uppercase tracking-widest flex items-center">
              <span className="w-2 h-2 bg-error rounded-full mr-2" />
              Sell Price (Supply)
            </h5>
            <span className="text-[10px] text-stone-500 font-bold">10 Most Recent</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest">
                  <th className="px-6 py-2 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">Timestamp</th>
                  <th className="px-6 py-2 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant text-right">Price / Unit</th>
                  <th className="px-6 py-2 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-outline-variant/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-2.5"><div className="sk h-3 w-28" /></td>
                      <td className="px-6 py-2.5 text-right"><div className="sk h-3 w-20 ml-auto" /></td>
                      <td className="px-6 py-2.5 text-right"><div className="sk h-3 w-14 ml-auto" /></td>
                    </tr>
                  ))
                ) : recentSnapshots.map((s, i) => (
                  <tr key={i} className={`hover:bg-surface-container-highest transition-colors ${i % 2 ? 'bg-surface-container-low/30' : ''}`}>
                    <td className="px-6 py-2.5 text-stone-500 font-mono text-[10px]">{fmtDate(s.timestamp)}</td>
                    <td className="px-6 py-2.5 text-right font-bold text-error font-mono">{fmtFull(s.sellPrice)}</td>
                    <td className="px-6 py-2.5 text-right text-stone-400 font-mono">{fmt(s.sellVolume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer cluster info */}
      <div className="mt-6 flex justify-end items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-tertiary inline-block" />
        <span className="text-[10px] font-headline uppercase tracking-widest text-tertiary">
          {ordered.length} snapshots · {productId}
        </span>
      </div>
    </div>
  );
}
