export interface BazaarItem {
  productId: string;
  name: string;
  currentBuyPrice: number;
  currentSellPrice: number;
  buyVolume: number;
  sellVolume: number;
  lastUpdated: string;
}

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
