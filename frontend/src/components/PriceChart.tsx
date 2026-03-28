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
  Legend
);

interface PriceChartProps {
  productId: string;
}

type TimeRange = '24h' | '7d' | '30d' | 'all';

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PriceChart({ productId }: PriceChartProps) {
  const [history, setHistory] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

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

  const chartData = useMemo(() => {
    if (!history?.snapshots.length) return null;

    return {
      labels: history.snapshots.map((s) => formatDate(s.timestamp)),
      datasets: [
        {
          label: 'Buy Price',
          data: history.snapshots.map((s) => s.buyPrice),
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          tension: 0.3,
        },
        {
          label: 'Sell Price',
          data: history.snapshots.map((s) => s.sellPrice),
          borderColor: '#4ecdc4',
          backgroundColor: 'rgba(78, 205, 196, 0.1)',
          tension: 0.3,
        },
      ],
    };
  }, [history]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e0e0e0',
        },
      },
      title: {
        display: true,
        text: history ? `${history.productName} - Price History` : 'Price History',
        color: '#e0e0e0',
        font: {
          size: 16,
        },
      },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleColor: '#e0e0e0',
        bodyColor: '#e0e0e0',
        borderColor: '#2d2d4a',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatPrice(context.raw)} coins`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#888',
          maxTicksLimit: 10,
        },
        grid: {
          color: '#2d2d4a',
        },
      },
      y: {
        ticks: {
          color: '#888',
          callback: (value: any) => formatPrice(value),
        },
        grid: {
          color: '#2d2d4a',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="price-chart-container">
        <div className="loading">Loading price history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="price-chart-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!history?.snapshots.length) {
    return (
      <div className="price-chart-container">
        <div className="empty-state">No price history available for this item</div>
      </div>
    );
  }

  return (
    <div className="price-chart-container">
      <div className="chart-header">
        <div className="time-range-selector">
          {(['24h', '7d', '30d', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-wrapper">
        {chartData && <Line data={chartData} options={options} />}
      </div>
    </div>
  );
}

export default PriceChart;
