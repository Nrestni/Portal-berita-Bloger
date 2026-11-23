/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowRight,
  Bookmark,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Heart,
  Eye,
  MessageSquare,
} from 'lucide-react';
import { NewsArticle, ThematicCategory } from '../types/blogger';
import { EconomyIndicatorsResponse, StockQuotesResponse } from '../types/market';
import {
  ALL_THEMATIC_CATEGORIES,
  RecommendationResult,
} from '../services/recommendationEngine';
import { ImageWithFallback } from './ImageWithFallback';
import { HottestNewsCard } from './HottestNewsCard';
import { formatFinancialNumber } from './PriceChart';
import { NavTab } from './BottomNav';
import { useEngagement } from '../contexts/EngagementContext';

interface DashboardViewProps {
  articles: NewsArticle[];
  blogName?: string;
  lastNewsSyncAt?: string;
  isFromOfflineCache?: boolean;
  recommendations: RecommendationResult;
  preferredTopics: ThematicCategory[];
  onTogglePreferredTopic: (topic: ThematicCategory) => void;
  quotesData: StockQuotesResponse | null;
  economyData: EconomyIndicatorsResponse | null;
  isLoadingNews: boolean;
  isLoadingMarket: boolean;
  onRefreshAll: () => void;
  onSelectArticle: (article: NewsArticle) => void;
  onNavigateTab: (tab: NavTab) => void;
  onSelectCategoryInFeed: (category: string) => void;
  bookmarkIds: string[];
  onToggleBookmark: (id: string, article?: NewsArticle) => void;
  onOpenShare: (article: NewsArticle) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  articles,
  blogName,
  lastNewsSyncAt,
  isFromOfflineCache,
  recommendations,
  preferredTopics,
  onTogglePreferredTopic,
  quotesData,
  economyData,
  isLoadingNews,
  isLoadingMarket,
  onRefreshAll,
  onSelectArticle,
  onNavigateTab,
  onSelectCategoryInFeed,
  bookmarkIds,
  onToggleBookmark,
  onOpenShare,
}) => {
  const { getStats, toggleLike } = useEngagement();
  const heroArticle = articles[0] || null;
  const heroStats = heroArticle ? getStats(heroArticle.id) : null;
  const latestSecondary = articles.slice(1, 4);

  const techHighlights = articles
    .filter((a) => a.thematicCategories.includes('Teknologi'))
    .slice(0, 3);

  const marketSummaryQuotes = (quotesData?.quotes || []).slice(0, 5);
  const fx = economyData?.exchangeRates || null;
  const topMacros = (economyData?.macroIndicators || []).slice(0, 3);

  const formatSyncTime = (iso?: string) => {
    if (!iso) return 'Menunggu pembaruan';
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Thematic Categories Filter Shortcuts */}
      <section aria-label="Kategori Utama" className="-mx-4 sm:mx-0 flex items-center gap-2 overflow-x-auto no-scrollbar px-4 sm:px-0 py-0.5 snap-x snap-mandatory">
        {ALL_THEMATIC_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onSelectCategoryInFeed(`tema:${cat}`)}
            className="min-h-[40px] px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 snap-start shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            {cat}
          </button>
        ))}
      </section>

      {/* 1. Hero & Artikel Terbaru dari Blogger */}
      {heroArticle && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
          {/* Dominant Focal Anchor: Lead Blogger Story */}
          <article
            onClick={() => onSelectArticle(heroArticle)}
            className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-[1.6rem] overflow-hidden flex flex-col justify-between cursor-pointer group shadow-[0_8px_28px_-20px_rgba(15,23,42,0.3)] active:scale-[0.995] transition-all"
          >
            <div className="w-full shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
              <ImageWithFallback
                src={heroArticle.thumbnail}
                alt={heroArticle.title}
                aspectRatioClass="aspect-[16/9] sm:aspect-[2/1]"
                imgClassName="group-hover:scale-[1.015] transition-transform duration-200"
                category={heroArticle.primaryCategory}
              />
            </div>

            <div className="p-4 sm:p-6 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {heroArticle.primaryCategory}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{heroArticle.publishedFormatted}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{heroArticle.readingTime} mnt baca</span>
                  {heroStats && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{heroStats.views.toLocaleString('id-ID')} dilihat</span>
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors [text-wrap:balance]">
                  {heroArticle.title}
                </h2>

                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {heroArticle.plainTextExcerpt}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 gap-2">
                <span className="truncate">Oleh {heroArticle.author.displayName}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {heroStats && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(heroArticle.id, heroArticle.title);
                        }}
                        className={`min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer tabular-nums ${
                          heroStats.likedByMe
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 font-semibold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            heroStats.likedByMe ? 'fill-rose-600 dark:fill-rose-400' : ''
                          }`}
                        />
                        <span>
                          {heroStats.likes > 0 ? heroStats.likes.toLocaleString('id-ID') : 'Suka'}
                        </span>
                      </button>

                      <span className="min-h-[36px] inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 tabular-nums">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{heroStats.commentCount.toLocaleString('id-ID')}</span>
                      </span>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(heroArticle.id, heroArticle);
                    }}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${
                        bookmarkIds.includes(heroArticle.id)
                          ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400'
                          : ''
                      }`}
                    />
                    <span>{bookmarkIds.includes(heroArticle.id) ? 'Tersimpan' : 'Simpan'}</span>
                  </button>
                </div>
              </div>
            </div>
          </article>

          {/* Secondary Latest Articles Column */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[1.6rem] p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-[0_8px_28px_-20px_rgba(15,23,42,0.3)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Artikel Terbaru
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigateTab('feed')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Semua Berita</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {latestSecondary.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => onSelectArticle(art)}
                    className="py-3.5 first:pt-1 last:pb-1 flex items-start gap-3.5 cursor-pointer group"
                  >
                    {art.thumbnail && (
                      <img
                        src={art.thumbnail}
                        alt={art.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-20 h-20 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 truncate">
                          {art.primaryCategory}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="shrink-0">{art.publishedRelative || art.publishedFormatted}</span>
                      </div>
                      <h3 className="text-sm font-serif-editorial font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {art.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums flex items-center gap-1.5">
                        <span>{art.readingTime} mnt baca</span>
                        <span aria-hidden="true">·</span>
                        <span>{getStats(art.id).views.toLocaleString('id-ID')} dilihat</span>
                        {getStats(art.id).likes > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{getStats(art.id).likes.toLocaleString('id-ID')} suka</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('feed')}
              className="w-full min-h-[42px] py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Jelajahi Seluruh Indeks Artikel ({articles.length})
            </button>
          </div>
        </section>
      )}

      {/* 2. Rekomendasi Untukmu (Personal Recommendations) */}
      {recommendations.items.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
                Rekomendasi Untukmu
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {recommendations.summaryNote}
              </p>
            </div>

            {/* Topic Personalization Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 inline-flex items-center gap-1 mr-1 shrink-0">
                <SlidersHorizontal className="w-3 h-3" />
                <span>Minat:</span>
              </span>
              {ALL_THEMATIC_CATEGORIES.map((topic) => {
                const selected = preferredTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => onTogglePreferredTopic(topic)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {recommendations.items.map(({ article, reason }) => (
              <HottestNewsCard
                key={article.id}
                article={article}
                onSelect={onSelectArticle}
                isBookmarked={bookmarkIds.includes(article.id)}
                onToggleBookmark={onToggleBookmark}
                onOpenShare={onOpenShare}
                recommendationReason={reason}
              />
            ))}
          </div>
        </section>
      )}

      {/* 3. Market & Economy Snapshot Grid (2 Columns on Desktop) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        {/* Ringkasan Pasar Saham */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[1.6rem] p-4 sm:p-6 flex flex-col justify-between gap-4 shadow-[0_8px_28px_-20px_rgba(15,23,42,0.3)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Ringkasan Pasar Saham
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  IHSG & saham utama BEI · Kuotasi bursa tertunda / penutupan
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('stocks')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Buka Pasar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {marketSummaryQuotes.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                {isLoadingMarket
                  ? 'Memuat kuotasi pasar saham...'
                  : 'Data pasar saham sedang tidak tersedia saat ini.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {marketSummaryQuotes.map((q) => {
                  const isUp = q.change >= 0;
                  return (
                    <div
                      key={q.symbol}
                      onClick={() => onNavigateTab('stocks')}
                      className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
                          {q.displaySymbol}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {q.name}
                        </p>
                      </div>
                      <div className="text-right font-mono-tabular shrink-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {q.currency === 'IDR' && q.market === 'IDX' ? 'Rp ' : ''}
                          {formatFinancialNumber(q.price, q.currency)}
                        </p>
                        <p
                          className={`text-xs font-medium inline-flex items-center gap-0.5 ${
                            isUp
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isUp ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          <span>
                            {isUp ? '+' : ''}
                            {q.changePercent.toFixed(2)}%
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {quotesData?.fetchedAt && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono-tabular pt-2 border-t border-slate-100 dark:border-slate-800">
              Sumber: Yahoo Finance · Diperbarui {formatSyncTime(quotesData.fetchedAt)}
            </p>
          )}
        </div>

        {/* Indikator Ekonomi Pilihan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[1.6rem] p-4 sm:p-6 flex flex-col justify-between gap-4 shadow-[0_8px_28px_-20px_rgba(15,23,42,0.3)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Indikator Ekonomi Pilihan
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kurs Rupiah (ECB) & realisasi makro Indonesia (Bank Dunia)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('economy')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Detail Ekonomi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!fx && topMacros.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                {isLoadingMarket
                  ? 'Memuat indikator ekonomi resmi...'
                  : 'Indikator ekonomi sedang tidak dapat dimuat.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {fx && (
                  <div
                    onClick={() => onNavigateTab('economy')}
                    className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        Nilai Tukar USD/IDR
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Data Aktual · Referensi {fx.referenceDate}
                      </p>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Rp {formatFinancialNumber(fx.usdIdr, 'IDR')}
                      </p>
                      <p className="text-[11px] text-slate-400">per 1 USD</p>
                    </div>
                  </div>
                )}

                {topMacros.map((ind) => (
                  <div
                    key={ind.id}
                    onClick={() => onNavigateTab('economy')}
                    className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {ind.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Data {ind.dataType} · {ind.period}
                      </p>
                    </div>
                    <div className="text-right font-mono-tabular shrink-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {ind.value.toLocaleString('id-ID', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        %
                      </p>
                      <p className="text-[11px] text-slate-400">{ind.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {economyData?.fetchedAt && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono-tabular pt-2 border-t border-slate-100 dark:border-slate-800">
              Sumber: ECB & World Bank Open Data · Diperbarui {formatSyncTime(economyData.fetchedAt)}
            </p>
          )}
        </div>
      </section>

      {/* 4. Berita Teknologi & Tren Digital Terbaru */}
      {techHighlights.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
                Sorotan Teknologi & Dunia Digital
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI, keamanan siber, privasi data, dan transformasi digital dari Blogger.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('tech')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Kanal Teknologi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {techHighlights.map((art) => (
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
        </section>
      )}
    </div>
  );
};
