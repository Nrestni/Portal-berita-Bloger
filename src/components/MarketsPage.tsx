/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Star,
  RotateCw,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  ChartRange,
  MarketNewsLink,
  StockChartResponse,
  StockQuote,
  StockQuotesResponse,
  StockSearchQuote,
} from '../types/market';
import { NewsArticle } from '../types/blogger';
import {
  fetchStockChart,
  searchStocksAndMarketNews,
} from '../services/marketApi';
import { PriceChart, formatFinancialNumber } from './PriceChart';
import { HottestNewsCard } from './HottestNewsCard';

interface MarketsPageProps {
  quotesData: StockQuotesResponse | null;
  isLoadingQuotes: boolean;
  quotesError: string | null;
  onRefreshQuotes: () => void;
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
  articles: NewsArticle[];
  bookmarkIds: string[];
  onSelectArticle: (article: NewsArticle) => void;
  onToggleBookmark: (id: string, article?: NewsArticle) => void;
  onOpenShare: (article: NewsArticle) => void;
}

export const MarketsPage: React.FC<MarketsPageProps> = ({
  quotesData,
  isLoadingQuotes,
  quotesError,
  onRefreshQuotes,
  watchlist,
  onToggleWatchlist,
  articles,
  bookmarkIds,
  onSelectArticle,
  onToggleBookmark,
  onOpenShare,
}) => {
  const [activeMarketTab, setActiveMarketTab] = useState<'idx' | 'watchlist' | 'global'>('idx');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('^JKSE');
  const [chartRange, setChartRange] = useState<ChartRange>('1mo');
  const [chartData, setChartData] = useState<StockChartResponse | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<StockSearchQuote[]>([]);
  const [marketNews, setMarketNews] = useState<MarketNewsLink[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const allQuotes = quotesData?.quotes || [];

  const ihsgQuote = useMemo(
    () => allQuotes.find((q) => q.symbol === '^JKSE') || null,
    [allQuotes]
  );

  const selectedQuote = useMemo(
    () => allQuotes.find((q) => q.symbol === selectedSymbol) || null,
    [allQuotes, selectedSymbol]
  );

  // Load historical chart whenever selectedSymbol or chartRange changes
  useEffect(() => {
    let active = true;
    const loadChart = async () => {
      setIsLoadingChart(true);
      setChartError(null);
      try {
        const res = await fetchStockChart(selectedSymbol, chartRange);
        if (active) setChartData(res);
      } catch (err: any) {
        if (active) {
          setChartError(err?.message || 'Grafik historis belum berhasil dimuat.');
          setChartData(null);
        }
      } finally {
        if (active) setIsLoadingChart(false);
      }
    };
    loadChart();
    return () => {
      active = false;
    };
  }, [selectedSymbol, chartRange]);

  // Load company/economic news links for selected ticker or general IDX
  useEffect(() => {
    let active = true;
    const queryTerm =
      selectedSymbol === '^JKSE'
        ? 'Indonesia stock market economy IDX'
        : selectedSymbol;
    searchStocksAndMarketNews(queryTerm)
      .then((res) => {
        if (active) setMarketNews(res.news || []);
      })
      .catch(() => {
        if (active) setMarketNews([]);
      });
    return () => {
      active = false;
    };
  }, [selectedSymbol]);

  // Debounced live ticker search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    let active = true;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchStocksAndMarketNews(trimmed);
        if (active) {
          setSearchResults(res.quotes || []);
          if (res.news && res.news.length > 0) {
            setMarketNews(res.news);
          }
        }
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const displayedQuotes = useMemo(() => {
    let list = allQuotes;
    if (activeMarketTab === 'idx') {
      list = allQuotes.filter((q) => q.market === 'IDX' || q.market === 'INDEKS_IDX');
    } else if (activeMarketTab === 'watchlist') {
      list = allQuotes.filter((q) => watchlist.includes(q.symbol));
    } else {
      list = allQuotes.filter((q) => q.market === 'GLOBAL');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.symbol.toLowerCase().includes(q) ||
          item.displaySymbol.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.sector.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allQuotes, activeMarketTab, watchlist, searchQuery]);

  // Relevant Blogger articles on economy/business/technology
  const relevantBloggerArticles = useMemo(() => {
    return articles
      .filter((a) =>
        a.thematicCategories.some((c) => c === 'Ekonomi' || c === 'Bisnis' || c === 'Teknologi')
      )
      .slice(0, 3);
  }, [articles]);

  const formatTimeWIB = (iso?: string) => {
    if (!iso) return '-';
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header & Honest Market Delay Status */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Pasar Saham & Modal
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Pantauan Indeks Harga Saham Gabungan (IHSG), saham Bursa Efek Indonesia (BEI/IDX), dan indeks pasar global.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {quotesData?.fetchedAt && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
              Diperbarui {formatTimeWIB(quotesData.fetchedAt)}
            </span>
          )}
          <button
            type="button"
            onClick={onRefreshQuotes}
            disabled={isLoadingQuotes}
            className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingQuotes ? 'animate-spin text-blue-600' : ''}`} />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* Error State if Market Feed Fails */}
      {quotesError && !isLoadingQuotes && allQuotes.length === 0 && (
        <div className="p-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Data Pasar Sedang Tidak Dapat Dijangkau
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {quotesError} Kuotasi pasar ditampilkan sesuai ketersediaan feed publik bursa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefreshQuotes}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg cursor-pointer"
          >
            Coba Muat Kembali
          </button>
        </div>
      )}

      {/* Main Two-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Top Column (7 cols): Interactive Chart & Selected Instrument Detail */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
          {/* Selected Quote Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-200">
                  {selectedQuote?.symbol || chartData?.symbol || selectedSymbol}
                </span>
                <span aria-hidden="true">·</span>
                <span>{selectedQuote?.statusLabel || chartData?.statusLabel || 'Data Bursa Publik'}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {selectedQuote?.name || chartData?.name || selectedSymbol}
              </h2>
            </div>

            {selectedSymbol !== '^JKSE' && (
              <button
                type="button"
                onClick={() => onToggleWatchlist(selectedSymbol)}
                className={`min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  watchlist.includes(selectedSymbol)
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    watchlist.includes(selectedSymbol) ? 'fill-amber-500 text-amber-500' : ''
                  }`}
                />
                <span>{watchlist.includes(selectedSymbol) ? 'Dipantau' : 'Tambah Pantauan'}</span>
              </button>
            )}
          </div>

          {/* Current Price & Change */}
          {selectedQuote && (
            <div className="flex flex-wrap items-baseline gap-3 pt-1">
              <span className="text-2xl sm:text-3xl font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
                {selectedQuote.currency === 'IDR' && selectedQuote.market === 'IDX' ? 'Rp ' : ''}
                {formatFinancialNumber(selectedQuote.price, selectedQuote.currency)}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-sm font-mono-tabular font-semibold ${
                  selectedQuote.change >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {selectedQuote.change >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>
                  {selectedQuote.change >= 0 ? '+' : ''}
                  {formatFinancialNumber(selectedQuote.change, selectedQuote.currency)} (
                  {selectedQuote.change >= 0 ? '+' : ''}
                  {selectedQuote.changePercent.toFixed(2)}%)
                </span>
              </span>
            </div>
          )}

          {/* Price Chart */}
          {chartError ? (
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
              {chartError}
            </div>
          ) : (
            <PriceChart
              points={chartData?.points || []}
              currency={selectedQuote?.currency || chartData?.currency || 'IDR'}
              valuePrefix={
                (selectedQuote?.market || (selectedSymbol === '^JKSE' ? 'INDEKS_IDX' : 'IDX')) === 'IDX'
                  ? 'Rp '
                  : ''
              }
              range={chartRange}
              onRangeChange={setChartRange}
              isLoading={isLoadingChart}
              height={220}
            />
          )}

          {/* Key Session Metrics */}
          {selectedQuote && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <p className="text-slate-400 dark:text-slate-500">Penutupan Sebelumnya</p>
                <p className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {formatFinancialNumber(selectedQuote.previousClose, selectedQuote.currency)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500">Tertinggi Harian</p>
                <p className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedQuote.dayHigh !== null
                    ? formatFinancialNumber(selectedQuote.dayHigh, selectedQuote.currency)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500">Terendah Harian</p>
                <p className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedQuote.dayLow !== null
                    ? formatFinancialNumber(selectedQuote.dayLow, selectedQuote.currency)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500">Waktu Data Bursa</p>
                <p className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {formatTimeWIB(selectedQuote.updatedAt)}
                </p>
              </div>
            </div>
          )}

          {/* Data Transparency Note */}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed pt-1">
            Keterangan: {selectedQuote?.delayNote || chartData?.delayNote || 'Kuotasi bersumber dari Yahoo Finance Public Market Feed. Data gratis memiliki jeda bursa 15–20 menit atau menampilkan harga penutupan sesi terakhir.'}
          </p>
        </section>

        {/* Right / Bottom Column (5 cols): Search, Watchlist & Ticker Table */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          {/* IHSG Quick Banner */}
          {ihsgQuote && (
            <button
              type="button"
              onClick={() => setSelectedSymbol('^JKSE')}
              className={`w-full p-3.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                selectedSymbol === '^JKSE'
                  ? 'border-blue-600/50 bg-blue-50/40 dark:bg-blue-950/20'
                  : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  IHSG · Bursa Efek Indonesia
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {ihsgQuote.statusLabel}
                </p>
              </div>
              <div className="text-right font-mono-tabular">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {formatFinancialNumber(ihsgQuote.price, 'USD')}
                </p>
                <p
                  className={`text-xs font-semibold ${
                    ihsgQuote.change >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {ihsgQuote.change >= 0 ? '+' : ''}
                  {ihsgQuote.changePercent.toFixed(2)}%
                </p>
              </div>
            </button>
          )}

          {/* Stock Code Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode saham (mis. BBCA, TLKM, BBRI, AAPL)..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Bersihkan pencarian saham"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Live Ticker Search Results Dropdown/Panel */}
          {searchQuery.trim().length >= 2 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {isSearching
                  ? 'Mencari emiten di bursa...'
                  : `Hasil Pencarian Emiten (${searchResults.length})`}
              </p>
              {!isSearching && searchResults.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                  Tidak ditemukan kode saham yang cocok untuk "{searchQuery}".
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-700/60 no-scrollbar">
                  {searchResults.map((sr) => {
                    const inWatchlist = watchlist.includes(sr.symbol);
                    return (
                      <div
                        key={sr.symbol}
                        className="py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSymbol(sr.symbol);
                            setSearchQuery('');
                          }}
                          className="text-left min-w-0 flex-1 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        >
                          <span className="font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
                            {sr.symbol}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 ml-2 truncate">
                            {sr.name}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleWatchlist(sr.symbol)}
                          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer"
                          title={inWatchlist ? 'Hapus dari Pantauan' : 'Tambah ke Pantauan'}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              inWatchlist ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Market Segment Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {[
              { id: 'idx', label: 'Saham IDX / BEI' },
              { id: 'watchlist', label: `Pantauan (${watchlist.length})` },
              { id: 'global', label: 'Indeks Global' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMarketTab(tab.id as any)}
                className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[38px] ${
                  activeMarketTab === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quotes Table / List */}
          {isLoadingQuotes && allQuotes.length === 0 ? (
            <div className="space-y-2.5 py-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : displayedQuotes.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {activeMarketTab === 'watchlist'
                  ? 'Daftar pantauan saham masih kosong'
                  : 'Tidak ada saham yang sesuai filter'}
              </p>
              <p>
                {activeMarketTab === 'watchlist'
                  ? 'Ketuk ikon bintang pada saham IDX atau cari kode emiten untuk menyimpannya di perangkat Anda.'
                  : 'Coba kata kunci kode saham atau nama perusahaan lain.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[440px] overflow-y-auto no-scrollbar">
              {displayedQuotes.map((q) => {
                const isSelected = q.symbol === selectedSymbol;
                const isSaved = watchlist.includes(q.symbol);
                const isUp = q.change >= 0;
                return (
                  <div
                    key={q.symbol}
                    onClick={() => setSelectedSymbol(q.symbol)}
                    className={`py-3 px-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(q.symbol);
                        }}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-500 cursor-pointer shrink-0"
                        title={isSaved ? 'Hapus dari Daftar Pantauan' : 'Simpan ke Daftar Pantauan'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isSaved ? 'fill-amber-500 text-amber-500' : ''
                          }`}
                        />
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono-tabular text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            {q.displaySymbol}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            · {q.currency}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {q.name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono-tabular shrink-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {q.currency === 'IDR' && q.market === 'IDX' ? 'Rp ' : ''}
                        {formatFinancialNumber(q.price, q.currency)}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          isUp
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isUp ? '+' : ''}
                        {q.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Relevant Market & Economic News */}
      <section className="space-y-5 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <h2 className="text-xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
            Berita Ekonomi & Emiten Terkait
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Artikel ekonomi dari Blogger serta rilis berita pasar resmi terkait instrumen yang dipilih.
          </p>
        </div>

        {/* Blogger Economic/Business Articles */}
        {relevantBloggerArticles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relevantBloggerArticles.map((art) => (
              <HottestNewsCard
                key={art.id}
                article={art}
                onSelect={onSelectArticle}
                isBookmarked={bookmarkIds.includes(art.id)}
                onToggleBookmark={onToggleBookmark}
                onOpenShare={onOpenShare}
              />
            ))}
          </div>
        )}

        {/* External Official Market News Links */}
        {marketNews.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tautan Berita Pasar & Perusahaan ({selectedSymbol})
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {marketNews.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 flex items-start justify-between gap-4 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {item.publisher}
                      </span>
                      {item.publishedAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatTimeWIB(item.publishedAt)}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-1" />
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
