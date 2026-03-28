import { useState, useEffect, useMemo } from 'react';
import { getTopFlips } from '../services/api';
import type { FlipRecommendation } from '../types/api';
import './TopFlips.css';

interface TopFlipsProps {
  onFlipSelect: (productId: string, name: string) => void;
}

type SortKey = 'name' | 'buyPrice' | 'sellPrice' | 'profitMargin' | 'profitPercentage' | 'volumeScore' | 'recommendationScore';
type SortDir = 'asc' | 'desc';

function formatCoins(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function getSpreadTier(pct: number): 'high' | 'med' | 'low' {
  if (pct >= 5) return 'high';
  if (pct >= 2) return 'med';
  return 'low';
}

const SKELETON_ROWS = 8;

function TopFlips({ onFlipSelect }: TopFlipsProps) {
  const [flips, setFlips] = useState<FlipRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('profitPercentage');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  async function fetchFlips() {
    setLoading(true);
    setError(null);
    try {
      const response = await getTopFlips(50, 1.0);
      setFlips(response.flips);
      setLastUpdated(new Date(response.generatedAt));
    } catch (err) {
      setError('Failed to fetch flip recommendations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFlips();
    const interval = setInterval(fetchFlips, 60_000);
    return () => clearInterval(interval);
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  const sortedFlips = useMemo(() => {
    return [...flips].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case 'name': av = a.productName; bv = b.productName; break;
        case 'buyPrice': av = a.buyPrice; bv = b.buyPrice; break;
        case 'sellPrice': av = a.sellPrice; bv = b.sellPrice; break;
        case 'profitMargin': av = a.profitMargin; bv = b.profitMargin; break;
        case 'profitPercentage': av = a.profitPercentage; bv = b.profitPercentage; break;
        case 'volumeScore': av = a.volumeScore; bv = b.volumeScore; break;
        case 'recommendationScore': av = a.recommendationScore; bv = b.recommendationScore; break;
        default: av = 0; bv = 0;
      }
      if (typeof av === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      }
      return sortDir === 'asc' ? av - (bv as number) : (bv as number) - av;
    });
  }, [flips, sortKey, sortDir]);

  function ColHeader({
    col, label, title, align,
  }: { col: SortKey; label: string; title?: string; align?: 'right' }) {
    const active = sortKey === col;
    return (
      <th
        className={`col-sortable ${active ? 'sort-active' : ''} ${align === 'right' ? 'text-right' : ''}`}
        onClick={() => handleSort(col)}
        title={title}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      >
        {label}
        <span className={`sort-icon ${active ? 'icon-active' : 'icon-idle'}`} aria-hidden>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </th>
    );
  }

  const isInitialLoad = loading && flips.length === 0;

  if (error && flips.length === 0) {
    return (
      <div className="top-flips-container">
        <div className="flips-status-row">
          <h2 className="flips-title">Spread Opportunities</h2>
        </div>
        <div className="flips-error-state">
          <span className="error-glyph">⚠</span>
          <p>{error}</p>
          <button type="button" className="refresh-btn" onClick={fetchFlips}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="top-flips-container">
      <div className="flips-status-row">
        <div>
          <h2 className="flips-title">Spread Opportunities</h2>
          <p className="flips-subtitle">
            Bid–ask spread · Instant Buy − Instant Sell · Click any row to view full price history
          </p>
        </div>
        <div className="flips-controls">
          {lastUpdated && (
            <span className="last-updated">
              <span className="live-dot" aria-hidden />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button type="button" className="refresh-btn" onClick={fetchFlips} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <div className="flips-table-wrapper">
        <table className="flips-table" aria-label="Spread opportunities">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <ColHeader col="name" label="Item" />
              <ColHeader
                col="buyPrice"
                label="Instant Buy"
                title="Cost to buy one unit now (matches sell offers)"
                align="right"
              />
              <ColHeader
                col="sellPrice"
                label="Instant Sell"
                title="Coins received selling one unit now (matches buy orders)"
                align="right"
              />
              <ColHeader
                col="profitMargin"
                label="Spread"
                title="Raw coin margin per unit (Instant Buy − Instant Sell)"
                align="right"
              />
              <ColHeader
                col="profitPercentage"
                label="Spread %"
                title="Spread as a percentage of Instant Sell price — higher is better"
                align="right"
              />
              <ColHeader
                col="recommendationScore"
                label="Score"
                title="Recommendation score combining spread size, volume, and consistency"
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {isInitialLoad ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td><div className="sk sk-rank" /></td>
                  <td><div className="sk sk-name" /></td>
                  <td><div className="sk sk-num" /></td>
                  <td><div className="sk sk-num" /></td>
                  <td><div className="sk sk-num" /></td>
                  <td><div className="sk sk-badge" /></td>
                  <td><div className="sk sk-badge" /></td>
                </tr>
              ))
            ) : sortedFlips.length === 0 ? (
              <tr>
                <td colSpan={7} className="flips-empty-cell">
                  No items meet the minimum spread threshold
                </td>
              </tr>
            ) : (
              sortedFlips.map((flip, idx) => {
                const tier = getSpreadTier(flip.profitPercentage);
                const rankClass = idx === 0 ? 'rank-gold' : idx === 1 ? 'rank-silver' : idx === 2 ? 'rank-bronze' : '';
                const scoreClass = flip.recommendationScore >= 7 ? 'score-high' : flip.recommendationScore >= 4 ? 'score-med' : 'score-low';
                return (
                  <tr
                    key={flip.productId}
                    className="flip-row"
                    onClick={() => onFlipSelect(flip.productId, flip.productName)}
                    title={`View price history for ${flip.productName}`}
                  >
                    <td className="col-rank">
                      <span className={`rank-num ${rankClass}`}>{idx + 1}</span>
                    </td>
                    <td className="flip-name-cell">
                      <span className="flip-item-name">{flip.productName}</span>
                      <span className="flip-item-id">{flip.productId}</span>
                    </td>
                    <td className="price-mono price-buy text-right">{formatCoins(flip.buyPrice)}</td>
                    <td className="price-mono price-sell text-right">{formatCoins(flip.sellPrice)}</td>
                    <td className="price-mono price-spread text-right">+{formatCoins(flip.profitMargin)}</td>
                    <td className="text-right">
                      <span className={`spread-badge spread-${tier}`}>
                        +{flip.profitPercentage.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right">
                      <span className={`score-badge ${scoreClass}`}>
                        {flip.recommendationScore.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isInitialLoad && sortedFlips.length > 0 && (
        <div className="flips-footer">
          {sortedFlips.length} opportunities · click any row to view price history
        </div>
      )}
    </div>
  );
}

export default TopFlips;
