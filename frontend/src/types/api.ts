/** currentBuyPrice = Hypixel instant buy; currentSellPrice = Hypixel instant sell */
export interface BazaarItem {
  productId: string;
  name: string;
  currentBuyPrice: number;
  currentSellPrice: number;
  buyVolume: number;
  sellVolume: number;
  lastUpdated: string;
}

/** buyPrice / sellPrice = Hypixel quick_status (instant buy / instant sell) */
export interface PriceSnapshot {
  timestamp: string;
  buyPrice: number;
  sellPrice: number;
  buyVolume: number;
  sellVolume: number;
}

export interface PriceHistory {
  productId: string;
  productName: string;
  snapshots: PriceSnapshot[];
}

/** profitMargin = bid–ask spread; profitPercentage = spread / instant sell × 100 */
export interface FlipRecommendation {
  productId: string;
  productName: string;
  buyPrice: number;
  sellPrice: number;
  profitMargin: number;
  profitPercentage: number;
  volumeScore: number;
  recommendationScore: number;
}

export interface FlipsResponse {
  flips: FlipRecommendation[];
  generatedAt: string;
  totalItemsAnalyzed: number;
}
