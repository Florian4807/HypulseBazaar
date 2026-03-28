import { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getItemHistory } from '../services/api';
import type { PriceHistory } from '../types/api';
import './PriceChart.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface PriceChartProps {
  productId: string;
  onBack?: () => void;
}

type TimeRange = '24h' | '7d' | '30d' | 'all';

const RANGE_OPTIONS: { value: TimeRange; label: string; title: string }[] = [
  { value: '24h', label: '24h', title: 'Last 24 hours' },
  { value: '7d', label: '7d', title: 'Last 7 days' },
  { value: '30d', label: '30d', title: 'Last 30 days' },
  { value: 'all', label: 'All', title: 'All stored history' },
];

const CHART_FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const MONO_FONT = "'JetBrains Mono', ui-monospace, monospace";

function parseTimestamp(iso: string): Date {
  const t = iso.trim();
  if (!t) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(t)) return new Date(`${t}Z`);
  return new Date(t);
}

function formatDate(timestamp: string): string {
  return parseTimestamp(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatAxisLabelFromMs(ms: number, spanDays: number): string {
  const d = new Date(ms);
  if (spanDays > 400) return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  if (spanDays > 45) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatPriceFull(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({
  label, value, colorClass, hint,
}: { label: string; value: string; colorClass: string; hint?: string }) {
  return (
    <div className={`stat-card stat-card--${colorClass}`}>
      <div className="stat-label" title={hint}>{label}</div>
      <div className={`stat-value stat-value--${colorClass}`}>{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

function PriceChart({ productId, onBack }: PriceChartProps) {
  const [history, setHistory] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        let start: string | undefined;
        switch (timeRange) {
          case '24h': start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); break;
          case '7d': start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); break;
          case '30d': start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); break;
          case 'all': start = undefined; break;
        }
        const data = await getItemHistory(productId, start);
        setHistory(data);
      } catch (err) {
        setError('Failed to fetch price history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [productId, timeRange]);

  const orderedSnapshots = useMemo(() => {
    if (!history?.snapshots.length) return [];
    return [...history.snapshots].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );
  }, [history]);

  const latestStats = useMemo(() => {
    if (!orderedSnapshots.length) return null;
    const last = orderedSnapshots[orderedSnapshots.length - 1];
    const spread = last.buyPrice - last.sellPrice;
    const spreadPct = last.sellPrice > 0 ? (spread / last.sellPrice) * 100 : 0;
    return { buy: last.buyPrice, sell: last.sellPrice, spread, spreadPct };
  }, [orderedSnapshots]);

  const spanDays = useMemo(() => {
    if (orderedSnapshots.length < 2) return 0;
    const t0 = parseTimestamp(orderedSnapshots[0].timestamp).getTime();
    const t1 = parseTimestamp(orderedSnapshots[orderedSnapshots.length - 1].timestamp).getTime();
    return (t1 - t0) / (24 * 60 * 60 * 1000);
  }, [orderedSnapshots]);

  const xDomain = useMemo(() => {
    if (!orderedSnapshots.length) return null;
    const min = parseTimestamp(orderedSnapshots[0].timestamp).getTime();
    const max = parseTimestamp(orderedSnapshots[orderedSnapshots.length - 1].timestamp).getTime();
    return { min, max };
  }, [orderedSnapshots]);

  const chartData = useMemo(() => {
    if (!orderedSnapshots.length) return null;
    return {
      datasets: [
        {
          label: 'Instant Buy',
          data: orderedSnapshots.map((s) => ({ x: parseTimestamp(s.timestamp).getTime(), y: s.buyPrice })),
          borderColor: '#f87171',
          backgroundColor: 'rgba(248, 113, 113, 0.07)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#f87171',
          pointHoverBorderColor: '#141824',
          pointHoverBorderWidth: 2,
        },
        {
          label: 'Instant Sell',
          data: orderedSnapshots.map((s) => ({ x: parseTimestamp(s.timestamp).getTime(), y: s.sellPrice })),
          borderColor: '#5eead4',
          backgroundColor: 'rgba(94, 234, 212, 0.05)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#5eead4',
          pointHoverBorderColor: '#141824',
          pointHoverBorderWidth: 2,
        },
      ],
    };
  }, [orderedSnapshots]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: '#8b92a5',
          font: { family: CHART_FONT, size: 12 },
          usePointStyle: true,
          boxWidth: 8,
          padding: 16,
        },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: '#0f1118',
        titleColor: '#e8eaef',
        bodyColor: '#e8eaef',
        borderColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 10,
        titleFont: { family: CHART_FONT, size: 12, weight: 600 as const },
        bodyFont: { family: MONO_FONT, size: 13 },
        callbacks: {
          title: (items: any[]) => {
            if (!items.length) return '';
            const x = items[0]?.parsed?.x;
            if (typeof x === 'number') return formatDate(new Date(x).toISOString());
            if (!orderedSnapshots.length) return '';
            const snap = orderedSnapshots[items[0].dataIndex];
            return snap ? formatDate(snap.timestamp) : '';
          },
          label: (ctx: { dataset: { label?: string }; raw: unknown }) => {
            const raw = ctx.raw as { y?: number } | number;
            const v = typeof raw === 'number' ? raw : Number((raw as { y?: number })?.y);
            return `  ${ctx.dataset.label ?? ''}: ${formatPriceFull(v)} coins`;
          },
          afterBody: (items: any[]) => {
            if (items.length < 2) return [];
            const buyRaw = items.find(i => i.dataset.label === 'Instant Buy')?.raw as { y?: number } | undefined;
            const sellRaw = items.find(i => i.dataset.label === 'Instant Sell')?.raw as { y?: number } | undefined;
            if (!buyRaw || !sellRaw) return [];
            const spread = Number(buyRaw.y) - Number(sellRaw.y);
            return [`  Spread: ${formatPriceFull(spread)} coins`];
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        offset: false,
        bounds: 'data' as const,
        min: xDomain?.min,
        max: xDomain?.max,
        ticks: {
          color: '#5c6375',
          maxTicksLimit: timeRange === 'all' ? 18 : 8,
          maxRotation: timeRange === 'all' ? 45 : 0,
          autoSkip: true,
          font: { family: CHART_FONT, size: 11 },
          callback: (value: string | number) => {
            const ms = Number(value);
            if (!Number.isFinite(ms)) return '';
            return formatAxisLabelFromMs(ms, spanDays);
          },
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: {
          color: '#5c6375',
          font: { family: MONO_FONT, size: 11 },
          callback: (value: string | number) => formatPrice(Number(value)),
        },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
  }), [orderedSnapshots, timeRange, spanDays, xDomain]);

  const activeRange = RANGE_OPTIONS.find((r) => r.value === timeRange);

  const hasData = history && history.snapshots.length > 0;
  const isSparse = hasData && orderedSnapshots.length < 3;

  return (
    <div className="price-chart-container">
      {/* Header */}
      <div className="chart-header">
        <div className="chart-title-block">
          {onBack && (
            <button type="button" className="chart-back-btn" onClick={onBack} aria-label="Back to items">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Items
            </button>
          )}
          {loading && !history ? (
            <div className="chart-title-skeleton">
              <div className="sk sk-title" />
              <div className="sk sk-id" />
            </div>
          ) : (
            <>
              <h2 className="chart-product-name">{history?.productName || productId}</h2>
              <span className="chart-product-id">{productId}</span>
            </>
          )}
        </div>
        <div className="time-range-selector" role="group" aria-label="Time range">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`time-range-btn ${timeRange === opt.value ? 'active' : ''}`}
              onClick={() => setTimeRange(opt.value)}
              title={opt.title}
              disabled={loading}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      {latestStats && !loading ? (
        <div className="stat-cards-grid">
          <StatCard
            label="Instant Buy"
            value={`${formatPriceFull(latestStats.buy)} ¢`}
            colorClass="buy"
            hint="Cost to buy one unit now (matches sell offers)"
          />
          <StatCard
            label="Instant Sell"
            value={`${formatPriceFull(latestStats.sell)} ¢`}
            colorClass="sell"
            hint="Coins received selling one unit now (matches buy orders)"
          />
          <StatCard
            label="Bid–Ask Spread"
            value={`${formatPriceFull(latestStats.spread)} ¢`}
            colorClass="spread"
            hint={`${latestStats.spreadPct.toFixed(2)}% of Instant Sell — wider spread = larger flip window`}
          />
        </div>
      ) : loading && !history ? (
        <div className="stat-cards-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="stat-card stat-card--skeleton">
              <div className="sk sk-stat-label" />
              <div className="sk sk-stat-value" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Chart area */}
      <div className="chart-area">
        {loading ? (
          <div className="chart-loading-state">
            <div className="chart-spinner" />
            <span>Loading {activeRange?.title.toLowerCase()}…</span>
          </div>
        ) : error ? (
          <div className="chart-error-state">
            <span className="chart-error-glyph">⚠</span>
            <p>{error}</p>
            <button
              type="button"
              className="refresh-btn"
              onClick={() => setTimeRange(timeRange)}
            >
              Retry
            </button>
          </div>
        ) : !hasData ? (
          <div className="chart-empty-state">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
              <rect x="4" y="36" width="8" height="8" rx="2" fill="currentColor" opacity="0.15" />
              <rect x="14" y="28" width="8" height="16" rx="2" fill="currentColor" opacity="0.25" />
              <rect x="24" y="20" width="8" height="24" rx="2" fill="currentColor" opacity="0.35" />
              <rect x="34" y="12" width="8" height="32" rx="2" fill="currentColor" opacity="0.15" />
              <path d="M6 10L20 6L32 14L44 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
            </svg>
            <h3>No price data yet</h3>
            <p>
              {timeRange !== 'all'
                ? `No snapshots in the last ${activeRange?.title.toLowerCase()}. Try selecting "All" to see any stored data.`
                : `This item hasn't been recorded yet. Data backfills as the app polls Hypixel — check back shortly.`}
            </p>
            {timeRange !== 'all' && (
              <button
                type="button"
                className="empty-cta-btn"
                onClick={() => setTimeRange('all')}
              >
                View All History
              </button>
            )}
          </div>
        ) : isSparse ? (
          <div className="chart-sparse-state">
            <p className="sparse-note">
              Only {orderedSnapshots.length} snapshot{orderedSnapshots.length !== 1 ? 's' : ''} stored —
              the chart will fill in as the app polls Hypixel every 30 seconds.
            </p>
            {chartData && <div className="chart-wrapper"><Line data={chartData} options={chartOptions} /></div>}
          </div>
        ) : (
          <div className="chart-wrapper">
            {chartData && <Line data={chartData} options={chartOptions} />}
          </div>
        )}
      </div>

      {/* Footer meta */}
      {hasData && !loading && orderedSnapshots.length >= 2 && (
        <div className="chart-footnote">
          <span className="chart-range-label">
            {formatDate(orderedSnapshots[0].timestamp)} → {formatDate(orderedSnapshots[orderedSnapshots.length - 1].timestamp)}
          </span>
          <span className="chart-point-count">{orderedSnapshots.length} snapshots</span>
        </div>
      )}
    </div>
  );
}

export default PriceChart;
