import { useState, useEffect, useMemo } from 'react';
import { getBazaar } from '../services/api';
import type { BazaarItem } from '../types/api';
import './ItemsList.css';

interface ItemsListProps {
  onItemSelect: (productId: string) => void;
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toString();
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ItemsList({ onItemSelect }: ItemsListProps) {
  const [items, setItems] = useState<BazaarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
    const interval = setInterval(fetchItems, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.productId.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  if (loading) {
    return (
      <div className="items-list-container">
        <div className="loading">Loading bazaar items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="items-list-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="items-list-container">
      <div className="items-header">
        <h2>Bazaar Items</h2>
        <span className="items-count">{items.length} items</span>
      </div>
      <input
        type="text"
        className="search-input"
        placeholder="Search items by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="items-table-wrapper">
        <table className="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Buy</th>
              <th>Sell</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-message">
                  No items match your search
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.productId}
                  onClick={() => onItemSelect(item.productId)}
                  className="item-row"
                >
                  <td className="item-name">{item.name}</td>
                  <td className="item-price">{formatPrice(item.currentBuyPrice)}</td>
                  <td className="item-price">{formatPrice(item.currentSellPrice)}</td>
                  <td className="item-volume">{formatVolume(item.buyVolume)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ItemsList;
