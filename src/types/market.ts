/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MarketGroup = 'INDEKS_IDX' | 'IDX' | 'GLOBAL';
export type ChartRange = '5d' | '1mo' | '3mo' | '6mo' | '1y';

export interface StockQuote {
  symbol: string;
  displaySymbol: string;
  name: string;
  sector: string;
  market: MarketGroup;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  sparkline: number[];
  updatedAt: string;
  statusLabel: 'Data Tertunda Bursa' | 'Data Penutupan Pasar';
  delayNote: string;
  source: string;
}

export interface StockQuotesResponse {
  quotes: StockQuote[];
  failedSymbols: string[];
  fetchedAt: string;
  provider: string;
  disclaimer: string;
}

export interface ChartPoint {
  timestamp: number;
  isoDate: string;
  close: number;
  high: number;
  low: number;
  volume: number | null;
}

export interface StockChartResponse {
  symbol: string;
  name: string;
  currency: string;
  range: ChartRange;
  points: ChartPoint[];
  statusLabel: 'Data Tertunda Bursa' | 'Data Penutupan Pasar';
  delayNote: string;
  updatedAt: string;
  source: string;
}

export interface StockSearchQuote {
  symbol: string;
  displaySymbol: string;
  name: string;
  exchange: string;
  quoteType: string;
  isIndonesia: boolean;
}

export interface MarketNewsLink {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  relatedTickers: string[];
}

export interface StockSearchResponse {
  quotes: StockSearchQuote[];
  news: MarketNewsLink[];
}

export interface FxPairRate {
  pair: string;
  label: string;
  multiplier: number;
  rateIdr: number;
  unit: string;
}

export interface ExchangeRatesData {
  usdIdr: number;
  usdChange: number;
  usdChangePct: number;
  referenceDate: string;
  dataType: 'Aktual';
  source: string;
  pairs: FxPairRate[];
  usdIdrHistory: ChartPoint[];
}

export interface MacroIndicator {
  id: string;
  code: string;
  name: string;
  description: string;
  value: number;
  unit: string;
  period: string;
  previousValue: number | null;
  previousPeriod: string | null;
  dataType: 'Aktual' | 'Perkiraan' | 'Target Kebijakan';
  source: string;
  updatedAt: string | null;
  history: Array<{ period: string; value: number }>;
}

export interface PolicyReference {
  id: string;
  name: string;
  valueDisplay: string;
  unit: string;
  period: string;
  dataType: 'Target Kebijakan';
  source: string;
  description: string;
}

export interface EconomyIndicatorsResponse {
  fetchedAt: string;
  exchangeRates: ExchangeRatesData | null;
  macroIndicators: MacroIndicator[];
  policyReferences: PolicyReference[];
  _cachedAt?: string;
}

export interface ExternalTechArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  readingTimeMinutes: number;
  authorName: string;
  tags: string[];
  coverImage: string | null;
  sourceName: string;
}

export interface TechTrendsResponse {
  items: ExternalTechArticle[];
  provider: string;
  available: boolean;
  fetchedAt?: string;
}

export interface ServerSourceStatus {
  timestamp: string;
  blogger: {
    configured: boolean;
    blogId: string;
    provider: string;
  };
  stocks: {
    configured: boolean;
    provider: string;
    note: string;
  };
  economy: {
    configured: boolean;
    providers: string[];
  };
  techTrends: {
    configured: boolean;
    providers: string[];
  };
}
