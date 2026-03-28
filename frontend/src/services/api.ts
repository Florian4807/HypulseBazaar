import axios from 'axios';
import type { BazaarItem, PriceHistory, FlipsResponse, FlipRecommendation } from '../types/api';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function getBazaar(): Promise<BazaarItem[]> {
  const response = await api.get<BazaarItem[]>('/api/bazaar');
  return response.data;
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
  const url = `/api/bazaar/${productId}/history${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get<PriceHistory>(url);
  return response.data;
}

export async function getTopFlips(
  count: number = 50,
  minProfitPercent: number = 1.0
): Promise<FlipsResponse> {
  const response = await api.get<FlipsResponse>('/api/flips', {
    params: { count, minProfitPercent },
  });
  return response.data;
}

export async function getFlipForItem(productId: string): Promise<FlipRecommendation> {
  const response = await api.get<FlipRecommendation>(`/api/flips/${productId}`);
  return response.data;
}

export default api;
