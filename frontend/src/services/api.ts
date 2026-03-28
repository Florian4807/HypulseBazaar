import axios from 'axios';
import type { BazaarItem, PriceHistory, FlipsResponse, FlipRecommendation } from '../types/api';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const responseCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const BAZAAR_TTL_MS = 30_000;
const FLIPS_TTL_MS = 30_000;

function getCachedValue<T>(cacheKey: string): T | undefined {
  const cached = responseCache.get(cacheKey);
  if (!cached) return undefined;
  if (Date.now() >= cached.expiresAt) return undefined;
  return cached.value as T;
}

async function getOrFetch<T>(
  cacheKey: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  forceRefresh: boolean
): Promise<T> {
  if (!forceRefresh) {
    const cached = getCachedValue<T>(cacheKey);
    if (cached !== undefined) return cached;
  }

  const existingInflight = inflight.get(cacheKey) as Promise<T> | undefined;
  if (existingInflight) return existingInflight;

  const request = fetcher()
    .then((value) => {
      responseCache.set(cacheKey, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, request);
  return request;
}

export function peekBazaarCache(): BazaarItem[] | undefined {
  return getCachedValue<BazaarItem[]>('bazaar');
}

export function peekTopFlipsCache(count: number = 50, minProfitPercent: number = 1.0): FlipsResponse | undefined {
  return getCachedValue<FlipsResponse>(`flips:${count}:${minProfitPercent}`);
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toTitleCaseFromProductId(productId: string): string {
  return productId
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeProductName(productId: string, rawName?: string): string {
  if (!productId) return rawName?.trim() || 'Unknown Item';

  // Hypixel essence IDs are ESSENCE_<TYPE>; preferred display is "<Type> Essence".
  if (productId.startsWith('ESSENCE_')) {
    const essenceType = productId.replace('ESSENCE_', '');
    const typed = toTitleCaseFromProductId(essenceType);
    return typed ? `${typed} Essence` : 'Essence';
  }

  const trimmed = rawName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : toTitleCaseFromProductId(productId);
}

function normalizeFlip(raw: Partial<FlipRecommendation>): FlipRecommendation {
  const productId = raw.productId ?? '';
  const buyPrice = toNumber(raw.buyPrice);
  const sellPrice = toNumber(raw.sellPrice);
  const margin = toNumber(raw.profitMargin, buyPrice - sellPrice);
  const buyVol = toNumber(raw.buyVolume);
  const sellVol = toNumber(raw.sellVolume);

  // Hypixel quick_status volumes are rolling 24h totals.
  const derivedBuysPerHour = buyVol / 24;
  const derivedSellsPerHour = sellVol / 24;
  const oneHourInstabuys = toNumber(raw.oneHourInstabuys, derivedBuysPerHour);
  const oneHourInstasells = toNumber(raw.oneHourInstasells, derivedSellsPerHour);
  const tradablePerHour = toNumber(raw.tradablePerHour, Math.min(oneHourInstabuys, oneHourInstasells));
  const coinsPerHour = toNumber(raw.coinsPerHour, margin * tradablePerHour);

  return {
    productId,
    productName: normalizeProductName(productId, raw.productName),
    buyPrice,
    sellPrice,
    profitMargin: margin,
    profitPercentage: toNumber(raw.profitPercentage),
    volumeScore: toNumber(raw.volumeScore),
    oneHourInstabuys,
    oneHourInstasells,
    tradablePerHour,
    coinsPerHour,
    recommendationScore: toNumber(raw.recommendationScore),
    buyVolume: buyVol,
    sellVolume: sellVol,
    lastUpdated: raw.lastUpdated ?? new Date(0).toISOString(),
  };
}

export async function getBazaar(forceRefresh = false): Promise<BazaarItem[]> {
  return getOrFetch(
    'bazaar',
    BAZAAR_TTL_MS,
    async () => {
      const response = await api.get<BazaarItem[]>('/bazaar');
      return response.data;
    },
    forceRefresh
  );
}

export async function getItemHistory(
  productId: string,
  start?: string,
  end?: string
): Promise<PriceHistory> {
  const params = new URLSearchParams();
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  
  const queryString = params.toString();
  const safeProductId = encodeURIComponent(productId);
  const url = `/bazaar/${safeProductId}/history${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get<PriceHistory>(url);
  return response.data;
}

export async function getTopFlips(
  count: number = 50,
  minProfitPercent: number = 1.0,
  forceRefresh = false
): Promise<FlipsResponse> {
  const cacheKey = `flips:${count}:${minProfitPercent}`;
  return getOrFetch(
    cacheKey,
    FLIPS_TTL_MS,
    async () => {
      const response = await api.get<FlipsResponse>('/flips', {
        params: { count, minProfitPercent },
      });
      return {
        ...response.data,
        flips: (response.data.flips ?? []).map(normalizeFlip),
      };
    },
    forceRefresh
  );
}

export async function getFlipForItem(productId: string): Promise<FlipRecommendation> {
  const safeProductId = encodeURIComponent(productId);
  const response = await api.get<FlipRecommendation>(`/flips/${safeProductId}`);
  return response.data;
}

export default api;
