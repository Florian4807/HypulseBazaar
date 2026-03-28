import { useState, useEffect } from 'react';
import { getTopFlips } from '../services/api';
import type { FlipRecommendation } from '../types/api';
import './TopFlips.css';

interface TopFlipsProps {
  onFlipSelect: (productId: string) => void;
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatProfit(profit: number): string {
  return `+${profit.toFixed(2)}`;
}

function formatProfitPercent(percent: number): string {
  return `+${percent.toFixed(2)}%`;
}

function getScoreColor(score: number): string {
  if (score >= 7) return 'score-high';
  if (score >= 4) return 'score-medium';
  return 'score-low';
}

function TopFlips({ onFlipSelect }: TopFlipsProps) {
  const [flips, setFlips] = useState<FlipRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
    const interval = setInterval(fetchFlips, 60000);
    return () => clearInterval(interval);
  }, []);

  const sortedFlips = [...flips].sort(
    (a, b) => b.recommendationScore - a.recommendationScore
  );

  if (loading && flips.length === 0) {
    return (
      <div className="top-flips-container">
        <div className="loading">Loading flip recommendations...</div>
      </div>
    );
  }

  if (error && flips.length === 0) {
    return (
      <div className="top-flips-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="top-flips-container">
      <div className="flips-header">
        <div className="flips-title-section">
          <h2>Top Flips</h2>
          {lastUpdated && (
            <span className="last-updated">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button className="refresh-btn" onClick={fetchFlips} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="flips-list">
        {sortedFlips.length === 0 ? (
          <div className="empty-state">No flip opportunities found</div>
        ) : (
          sortedFlips.map((flip, index) => (
            <div
              key={flip.productId}
              className="flip-card"
              onClick={() => onFlipSelect(flip.productId)}
            >
              <div className="flip-rank">#{index + 1}</div>
              <div className="flip-details">
                <div className="flip-name">{flip.productName}</div>
                <div className="flip-prices">
                  <span className="price-label">Buy:</span>
                  <span className="buy-price">{formatPrice(flip.buyPrice)}</span>
                  <span className="arrow">→</span>
                  <span className="price-label">Sell:</span>
                  <span className="sell-price">{formatPrice(flip.sellPrice)}</span>
                </div>
                <div className="flip-profit">
                  <span className="profit-margin">
                    {formatProfit(flip.profitMargin)} coins
                  </span>
                  <span className="profit-percent">
                    {formatProfitPercent(flip.profitPercentage)}
                  </span>
                </div>
              </div>
              <div className={`flip-score ${getScoreColor(flip.recommendationScore)}`}>
                {flip.recommendationScore.toFixed(1)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TopFlips;
