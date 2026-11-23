/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCw, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { EconomyIndicatorsResponse } from '../types/market';
import { NewsArticle } from '../types/blogger';
import { PriceChart, formatFinancialNumber } from './PriceChart';
import { HottestNewsCard } from './HottestNewsCard';

interface EconomyPageProps {
  economyData: EconomyIndicatorsResponse | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  articles: NewsArticle[];
  bookmarkIds: string[];
  onSelectArticle: (article: NewsArticle) => void;
  onToggleBookmark: (id: string, article?: NewsArticle) => void;
  onOpenShare: (article: NewsArticle) => void;
}

export const EconomyPage: React.FC<EconomyPageProps> = ({
  economyData,
  isLoading,
  error,
  onRefresh,
  articles,
  bookmarkIds,
  onSelectArticle,
  onToggleBookmark,
  onOpenShare,
}) => {
  const fx = economyData?.exchangeRates || null;
  const macros = economyData?.macroIndicators || [];
  const policies = economyData?.policyReferences || [];

  const economyArticles = articles.filter(
    (a) =>
      a.thematicCategories.includes('Ekonomi') ||
      a.thematicCategories.includes('Bisnis') ||
      a.thematicCategories.includes('Nasional')
  );

  const formatDateId = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Informasi Ekonomi & Moneter
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Nilai tukar Rupiah, inflasi, pertumbuhan PDB, dan indikator suku bunga dari lembaga data resmi.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="min-h-[40px] self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Perbarui Indikator</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading && !economyData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && !economyData && (
        <div className="p-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Indikator Ekonomi Belum Berhasil Dimuat
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {error} Aplikasi hanya menampilkan indikator yang berhasil diverifikasi dari sumber resmi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Section 1: Nilai Tukar Rupiah (FX) */}
      {fx && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* USD/IDR Chart Card */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Data {fx.dataType}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Periode Harian ({formatDateId(fx.referenceDate)})</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  Nilai Tukar Dolar AS terhadap Rupiah (USD/IDR)
                </h2>
              </div>

              <div className="text-left sm:text-right font-mono-tabular">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Rp {formatFinancialNumber(fx.usdIdr, 'IDR')}
                </p>
                <p
                  className={`text-xs font-semibold inline-flex items-center gap-0.5 ${
                    fx.usdChange <= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {fx.usdChange >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {fx.usdChange >= 0 ? '+' : ''}
                    {formatFinancialNumber(fx.usdChange, 'IDR')} ({fx.usdChange >= 0 ? '+' : ''}
                    {fx.usdChangePct.toFixed(2)}%)
                  </span>
                </p>
              </div>
            </div>

            {fx.usdIdrHistory.length >= 2 && (
              <PriceChart
                points={fx.usdIdrHistory}
                currency="IDR"
                valuePrefix="Rp "
                height={190}
              />
            )}

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
              <span>Sumber: {fx.source}</span>
              <span aria-hidden="true">·</span>
              <span>Satuan: Rupiah per 1 USD</span>
              <span aria-hidden="true">·</span>
              <span>Pembaruan Referensi: {formatDateId(fx.referenceDate)}</span>
            </div>
          </div>

          {/* Foreign Currency Cross-Rates Table */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Kurs Mata Uang Utama terhadap Rupiah
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data Aktual · Kurs tengah referensi harian ECB ({formatDateId(fx.referenceDate)})
              </p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {fx.pairs.map((item) => (
                <div key={item.pair} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs sm:text-sm font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
                      {item.pair}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Rp {formatFinancialNumber(item.rateIdr, 'IDR')}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section 2: Official Macroeconomic Indicators (World Bank IDN) & Policy Target */}
      {(macros.length > 0 || policies.length > 0) && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
              Indikator Makroekonomi Indonesia
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Membedakan secara tegas realisasi <strong>Data Aktual</strong> dengan <strong>Target Kebijakan</strong> resmi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {macros.map((ind) => {
              const maxHist = Math.max(...ind.history.map((h) => Math.abs(h.value)), 1);
              return (
                <div
                  key={ind.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Data {ind.dataType}
                      </span>
                      <span className="font-mono-tabular">{ind.period}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {ind.name}
                    </h3>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
                        {ind.value.toLocaleString('id-ID', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        %
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{ind.unit}</span>
                    </div>

                    {ind.previousValue !== null && ind.previousPeriod && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                        Periode sebelumnya ({ind.previousPeriod}):{' '}
                        {ind.previousValue.toLocaleString('id-ID', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        %
                      </p>
                    )}

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {ind.description}
                    </p>
                  </div>

                  {/* Multi-year Historical Bars */}
                  {ind.history.length > 1 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Riwayat Tahunan ({ind.history[0].period}–{ind.history[ind.history.length - 1].period})
                      </p>
                      <div className="grid grid-cols-7 gap-1.5 items-end h-14 pt-1">
                        {ind.history.map((h) => {
                          const heightPct = Math.max(14, Math.round((Math.abs(h.value) / maxHist) * 100));
                          return (
                            <div key={h.period} className="flex flex-col items-center gap-1 h-full justify-end">
                              <div
                                style={{ height: `${heightPct}%` }}
                                title={`${h.period}: ${h.value.toFixed(2)}%`}
                                className="w-full rounded-sm bg-blue-600/80 dark:bg-blue-500/80"
                              />
                              <span className="text-[9px] font-mono-tabular text-slate-400">
                                '{h.period.slice(-2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Source & Update Metadata */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 space-y-0.5">
                    <p>Sumber: {ind.source}</p>
                    {ind.updatedAt && <p>Pembaruan Katalog: {formatDateId(ind.updatedAt)}</p>}
                  </div>
                </div>
              );
            })}

            {/* Policy Target Reference Card (Distinctly marked as 'Target Kebijakan') */}
            {policies.map((pol) => (
              <div
                key={pol.id}
                className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {pol.dataType}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{pol.period}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {pol.name}
                  </h3>

                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
                      {pol.valueDisplay}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {pol.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  <p>Satuan: {pol.unit}</p>
                  <p>Sumber: {pol.source}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Artikel Ekonomi & Kebijakan Publik dari Blogger */}
      {economyArticles.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h2 className="text-xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
              Ulasan Ekonomi & Kebijakan Publik
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Artikel relevan dari sumber utama Blogger NewsApp.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {economyArticles.map((art) => (
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
