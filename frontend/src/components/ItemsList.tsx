import { useState, useEffect, useMemo } from 'react';
import { getBazaar } from '../services/api';
import type { BazaarItem } from '../types/api';
import './ItemsList.css';

interface ItemsListProps {
  onItemSelect: (productId: string, name: string) => void;
}

type SortKey = 'name' | 'buyPrice' | 'sellPrice' | 'spread' | 'volume';
type SortDir = 'asc' | 'desc';

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

const SKELETON_ROWS = 10;

function SkeletonRow() {
  return (
    <tr className="skeleton-row">
      <td><div className="sk sk-name" /></td>
      <td><div className="sk sk-price" /></td>
      <td><div className="sk sk-price" /></td>
      <td><div className="sk sk-spread" /></td>
      <td><div className="sk sk-vol" /></td>
    </tr>
  );
}

function SortChevron({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <span className="sort-icon idle" aria-hidden>⇅</span>;
  return <span className="sort-icon active" aria-hidden>{sortDir === 'asc' ? '▲' : '▼'}</span>;
}

function ItemsList({ onItemSelect }: ItemsListProps) {
  const [items, setItems] = useState<BazaarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('volume');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    async function fetchItems() {
      try {
        const data = await getBazaar();
        setItems(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch bazaar items');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
    const interval = setInterval(fetchItems, 30_000);
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

  const filteredAndSorted = useMemo(() => {
    let result = items;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = items.filter(
        (item) =>
          (item.name ?? '').toLowerCase().includes(term) ||
          item.productId.toLowerCase().includes(term)
      );
    }
    return [...result].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case 'name':
          av = a.name ?? a.productId;
          bv = b.name ?? b.productId;
          break;
        case 'buyPrice':
          av = a.currentBuyPrice;
          bv = b.currentBuyPrice;
          break;
        case 'sellPrice':
          av = a.currentSellPrice;
          bv = b.currentSellPrice;
          break;
        case 'spread':
          av = a.currentBuyPrice - a.currentSellPrice;
          bv = b.currentBuyPrice - b.currentSellPrice;
          break;
        case 'volume':
          av = a.buyVolume;
          bv = b.buyVolume;
          break;
        default:
          return 0;
      }
      if (typeof av === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      }
      return sortDir === 'asc' ? av - (bv as number) : (bv as number) - av;
    });
  }, [items, searchTerm, sortKey, sortDir]);

  function ColHeader({ col, label, title, align }: { col: SortKey; label: string; title?: string; align?: 'right' }) {
    const active = sortKey === col;
    return (
      <th
        className={`col-sortable ${active ? 'sort-active' : ''} ${align === 'right' ? 'text-right' : ''}`}
        onClick={() => handleSort(col)}
        title={title}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      >
        {label}
        <SortChevron col={col} sortKey={sortKey} sortDir={sortDir} />
      </th>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="items-list-container">
        <div className="items-error-state">
          <span className="items-error-icon">⚠</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="items-list-container">
      <div className="items-header">
        <div>
          <h2 className="items-heading">Market Directory</h2>
          <p className="items-subheading">
            {loading && items.length === 0
              ? 'Loading…'
              : `${items.length.toLocaleString()} items tracked`}
          </p>
        </div>
      </div>

      <div className="search-wrap">
        <svg className="search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          className="search-input"
          placeholder="Search by name or product ID…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {searchTerm && (
          <span className="search-count">
            {filteredAndSorted.length} result{filteredAndSorted.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="items-table-wrapper">
        <table className="items-table">
          <thead>
            <tr>
              <ColHeader
                col="name"
                label="Item"
              />
              <ColHeader
                col="buyPrice"
                label="Instant Buy"
                title="Coins to buy one now (matches sell offers)"
                align="right"
              />
              <ColHeader
                col="sellPrice"
                label="Instant Sell"
                title="Coins received selling one now (matches buy orders)"
                align="right"
              />
              <ColHeader
                col="spread"
                label="Spread"
                title="Buy − Sell margin per unit"
                align="right"
              />
              <ColHeader
                col="volume"
                label="Volume"
                title="Buy volume (units/day)"
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => <SkeletonRow key={i} />)
            ) : filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="items-empty-cell">
                  <div className="items-empty-msg">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>No items match <strong>"{searchTerm}"</strong></span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((item) => {
                const spread = item.currentBuyPrice - item.currentSellPrice;
                return (
                  <tr
                    key={item.productId}
                    onClick={() => onItemSelect(item.productId, item.name ?? item.productId)}
                    className="item-row"
                    title={`View price history for ${item.name ?? item.productId}`}
                  >
                    <td className="item-name-cell">
                      <span className="item-name">{item.name ?? item.productId}</span>
                      {item.name && item.name !== item.productId && (
                        <span className="item-id">{item.productId}</span>
                      )}
                    </td>
                    <td className="item-price item-buy text-right">{formatPrice(item.currentBuyPrice)}</td>
                    <td className="item-price item-sell text-right">{formatPrice(item.currentSellPrice)}</td>
                    <td className="item-price item-spread text-right">{formatPrice(spread)}</td>
                    <td className="item-volume text-right">{formatVolume(item.buyVolume)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredAndSorted.length > 0 && (
        <div className="items-footer">
          Showing {filteredAndSorted.length.toLocaleString()} of {items.length.toLocaleString()} items
          · Click any row for price history
        </div>
      )}
    </div>
  );
}

export default ItemsList;
