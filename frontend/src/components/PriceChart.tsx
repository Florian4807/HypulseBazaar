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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PriceChartProps {
  productId: string;
}

type TimeRange = '24h' | '7d' | '30d' | 'all';

const RANGE_OPTIONS: { value: TimeRange; short: string; title: string }[] = [
  { value: '24h', short: '24h', title: 'Last 24 hours' },
  { value: '7d', short: '7d', title: 'Last 7 days' },
  { value: '30d', short: '30d', title: 'Last 30 days' },
  { value: 'all', short: 'All', title: 'All stored history' },
];

function parseTimestamp(iso: string): Date {
  const t = iso.trim();
  if (!t) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(t)) {
    return new Date(`${t}Z`);
  }
  return new Date(t);
}

function formatDate(timestamp: string): string {
  const date = parseTimestamp(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/** Shorter x-axis labels when the series spans months/years (avoids thousands of unique long strings). */
function formatAxisLabel(iso: string, spanDays: number): string {
  const d = parseTimestamp(iso);
  if (spanDays > 400) {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  if (spanDays > 45) {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return formatDate(iso);
}

/** Same formatter as formatAxisLabel(), but for epoch-millisecond x-axis ticks. */
function formatAxisLabelFromMs(ms: number, spanDays: number): string {
  return formatAxisLabel(new Date(ms).toISOString(), spanDays);
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const CHART_FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

function PriceChart({ productId }: PriceChartProps) {
  const [history, setHistory] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Default to full series so Coflnet imports and long retention are visible without an extra click. Narrow with 24h/7d/30d if needed. */
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        let start: string | undefined;

        switch (timeRange) {
          case '24h':
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            break;
          case '7d':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case '30d':
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'all':
            start = undefined;
            break;
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
    // Bid–ask spread: instant buy (ask) − instant sell (bid); positive in a normal book
    const spread = last.buyPrice - last.sellPrice;
    return { buy: last.buyPrice, sell: last.sellPrice, spread };
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
          label: 'Instant buy (sell offers)',
          data: orderedSnapshots.map((s) => ({
            x: parseTimestamp(s.timestamp).getTime(),
            y: s.buyPrice,
          })),
          borderColor: '#f87171',
          backgroundColor: 'rgba(248, 113, 113, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Instant sell (buy orders)',
          data: orderedSnapshots.map((s) => ({
            x: parseTimestamp(s.timestamp).getTime(),
            y: s.sellPrice,
          })),
          borderColor: '#5eead4',
          backgroundColor: 'rgba(94, 234, 212, 0.06)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [orderedSnapshots, spanDays]);

  const dataSpanHint = useMemo(() => {
    if (!history?.snapshots.length || orderedSnapshots.length < 2) return null;
    const first = parseTimestamp(orderedSnapshots[0].timestamp);
    const last = parseTimestamp(orderedSnapshots[orderedSnapshots.length - 1].timestamp);
    const spanMin = (last.getTime() - first.getTime()) / 60_000;
    if (spanMin <= 0) return null;
    const rounded = Math.max(1, Math.round(spanMin));
    if (spanMin < 24 * 60) {
      return `${history.snapshots.length} snapshots over ~${rounded} min (UTC from Hypixel, shown in your local time). “${RANGE_OPTIONS.find((r) => r.value === timeRange)?.title ?? ''}” only limits the window — a new database only has data since the app started.`;
    }
    return null;
  }, [history, orderedSnapshots, timeRange]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
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
        title: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#141824',
          titleColor: '#e8eaef',
          bodyColor: '#e8eaef',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: { family: CHART_FONT, size: 12, weight: 600 },
          bodyFont: { family: CHART_FONT, size: 13 },
          callbacks: {
            title: (items: any[]) => {
              if (!items.length) return '';
              const x = items[0]?.parsed?.x;
              if (typeof x === 'number') {
                return formatDate(new Date(x).toISOString());
              }
              if (!orderedSnapshots.length) return '';
              const snap = orderedSnapshots[items[0].dataIndex];
              return snap ? formatDate(snap.timestamp) : '';
            },
            label: (ctx: { dataset: { label?: string }; raw: unknown }) => {
              const raw = ctx.raw as { y?: number } | number;
              const v = typeof raw === 'number' ? raw : Number(raw?.y);
              return `${ctx.dataset.label ?? ''}: ${formatPrice(v)} coins`;
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
          grid: {
            color: 'rgba(255,255,255,0.04)',
          },
        },
        y: {
          ticks: {
            color: '#5c6375',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: (value: string | number) => formatPrice(Number(value)),
          },
          grid: {
            color: 'rgba(255,255,255,0.06)',
          },
        },
      },
    }),
    [orderedSnapshots, timeRange, spanDays, xDomain]
  );

  if (loading) {
    return (
      <div className="price-chart-container">
        <div className="chart-loading" role="status">
          Loading price history…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="price-chart-container">
        <div className="chart-error">{error}</div>
      </div>
    );
  }

  if (!history?.snapshots.length) {
    return (
      <div className="price-chart-container">
        <div className="chart-empty">No price history for this item yet.</div>
      </div>
    );
  }

  const activeRange = RANGE_OPTIONS.find((r) => r.value === timeRange);

  return (
    <div className="price-chart-container">
      <div className="price-chart-panel-header">
        <div className="price-chart-title-block">
          <h2 className="price-chart-product">{history.productName || productId}</h2>
          <div className="price-chart-id">{productId}</div>
        </div>
      </div>

      {latestStats && (
        <div className="price-chart-stats" aria-label="Latest snapshot">
          <div className="stat-card">
            <div className="stat-label">
              <abbr title="Coins to buy one now (Hypixel buyPrice; in-game sell offers)">Instant buy</abbr>
            </div>
            <div className="stat-value buy">{formatPrice(latestStats.buy)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">
              <abbr title="Coins when selling one now (Hypixel sellPrice; in-game buy orders)">Instant sell</abbr>
            </div>
            <div className="stat-value sell">{formatPrice(latestStats.sell)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">
              <abbr title="Instant buy minus instant sell (bid–ask width)">Bid–ask spread</abbr>
            </div>
            <div className="stat-value spread">{formatPrice(latestStats.spread)}</div>
          </div>
        </div>
      )}

      <div className="chart-toolbar">
        <span className="chart-toolbar-label">{activeRange?.title ?? 'Range'}</span>
        <div className="time-range-selector" role="group" aria-label="Time range">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`time-range-btn ${timeRange === opt.value ? 'active' : ''}`}
              onClick={() => setTimeRange(opt.value)}
              title={opt.title}
            >
              {opt.short}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrapper">
        {chartData && <Line data={chartData} options={options} />}
      </div>
      {orderedSnapshots.length >= 2 && (
        <p className="chart-range-footnote">
          Range: {formatAxisLabel(orderedSnapshots[0].timestamp, spanDays)} →{' '}
          {formatAxisLabel(orderedSnapshots[orderedSnapshots.length - 1].timestamp, spanDays)} ·{' '}
          {orderedSnapshots.length} points
          {timeRange === 'all' ? (
            <> — full stored history</>
          ) : (
            <>
              {' '}
              — filtered to {activeRange?.title ?? timeRange}; choose All for every snapshot in the database
            </>
          )}
        </p>
      )}
      {timeRange === 'all' && spanDays > 1 && spanDays < 120 && (
        <p className="chart-backfill-hint">
          This is every snapshot in the database for this item. If you expected a multi-year series, run a
          Coflnet history import first so older points are stored here.
        </p>
      )}
      {dataSpanHint && <p className="chart-data-hint">{dataSpanHint}</p>}
    </div>
  );
}

export default PriceChart;
