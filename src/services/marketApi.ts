/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ChartRange,
  EconomyIndicatorsResponse,
  ServerSourceStatus,
  StockChartResponse,
  StockQuotesResponse,
  StockSearchResponse,
  TechTrendsResponse,
} from '../types/market';
import { apiUrl } from './apiBase';

const WATCHLIST_STORAGE_KEY = 'newsapp_stock_watchlist';
const DEFAULT_WATCHLIST = ['BBCA.JK', 'BBRI.JK', 'TLKM.JK', 'GOTO.JK'];

export function getStockWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return DEFAULT_WATCHLIST;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
    }
    return DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

export function toggleStockWatchlist(symbol: string): string[] {
  const clean = symbol.trim().toUpperCase();
  const current = getStockWatchlist();
  const exists = current.includes(clean);
  const updated = exists ? current.filter((s) => s !== clean) : [clean, ...current];
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export async function fetchStockQuotes(extraSymbols: string[] = []): Promise<StockQuotesResponse> {
  const baseSymbols = [
    '^JKSE',
    'BBCA.JK',
    'BBRI.JK',
    'BMRI.JK',
    'BBNI.JK',
    'TLKM.JK',
    'ASII.JK',
    'GOTO.JK',
    'ICBP.JK',
    'KLBF.JK',
    'ANTM.JK',
    '^GSPC',
    '^IXIC',
    '^N225',
    '^STI',
    ...extraSymbols,
  ];
  const unique = Array.from(new Set(baseSymbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
  const resp = await fetch(apiUrl(`/api/stocks/quotes?symbols=${encodeURIComponent(unique.join(','))}`));
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.message || `Gagal memuat data pasar saham (HTTP ${resp.status}).`);
  }
  return resp.json();
}

export async function fetchStockChart(symbol: string, range: ChartRange): Promise<StockChartResponse> {
  const resp = await fetch(
    apiUrl(`/api/stocks/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`)
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.message || `Grafik historis belum tersedia untuk ${symbol}.`);
  }
  return resp.json();
}

export async function searchStocksAndMarketNews(query: string): Promise<StockSearchResponse> {
  const q = query.trim();
  if (!q) return { quotes: [], news: [] };
  const resp = await fetch(apiUrl(`/api/stocks/search?q=${encodeURIComponent(q)}`));
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.message || 'Gagal melakukan pencarian kode saham.');
  }
  return resp.json();
}

export async function fetchEconomyIndicators(forceRefresh = false): Promise<EconomyIndicatorsResponse> {
  const url = forceRefresh ? apiUrl('/api/economy/indicators?refresh=1') : apiUrl('/api/economy/indicators');
  const resp = await fetch(url);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.message || 'Indikator ekonomi resmi belum berhasil dimuat.');
  }
  return resp.json();
}

export async function fetchTechTrends(): Promise<TechTrendsResponse> {
  const resp = await fetch(apiUrl('/api/tech-trends'));
  if (!resp.ok) {
    return { items: [], provider: 'DEV Community Public API', available: false };
  }
  return resp.json();
}

export async function fetchServerSourceStatus(): Promise<ServerSourceStatus> {
  const resp = await fetch(apiUrl('/api/status'));
  if (!resp.ok) {
    throw new Error('Gagal memeriksa status sumber data server.');
  }
  return resp.json();
}
