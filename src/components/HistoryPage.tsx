/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { History, Trash2, BookOpen, Bookmark } from 'lucide-react';
import { NewsArticle } from '../types/blogger';
import { NavTab } from './BottomNav';
import { useEngagement } from '../contexts/EngagementContext';

interface HistoryPageProps {
  historyArticles: NewsArticle[];
  savedCount: number;
  onSelectArticle: (article: NewsArticle) => void;
  onRemoveHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  onSwitchTab: (tab: NavTab) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  historyArticles,
  savedCount,
  onSelectArticle,
  onRemoveHistoryItem,
  onClearHistory,
  onSwitchTab,
}) => {
  const { getStats } = useEngagement();
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Library Sub-Navigation (Switch between Tersimpan & Riwayat) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
            Riwayat Bacaan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Daftar riwayat bacaan dan artikel favorit yang tersimpan di perangkat ini.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onSwitchTab('saved')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Disimpan ({savedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchTab('history')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Riwayat ({historyArticles.length})</span>
          </button>
        </div>
      </div>

      {/* Action Bar & In-UI Confirmation Dialog */}
      {historyArticles.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Menampilkan {historyArticles.length} artikel yang pernah Anda buka.
          </p>

          {!confirmClearAll ? (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Seluruh Riwayat</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-2 rounded-xl text-xs">
              <span className="font-medium text-rose-800 dark:text-rose-200">
                Yakin hapus semua riwayat?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setConfirmClearAll(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer"
              >
                Ya, Hapus
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      )}

      {/* History List */}
      {historyArticles.length > 0 ? (
        <div className="space-y-3">
          {historyArticles.map((art) => (
            <div
              key={art.id}
              onClick={() => onSelectArticle(art)}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {art.thumbnail ? (
                  <img
                    src={art.thumbnail}
                    alt={art.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-20 h-20 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {art.primaryCategory || 'Berita'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{art.publishedFormatted}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {getStats(art.id).views.toLocaleString('id-ID')} dilihat
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-serif-editorial font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveHistoryItem(art.id);
                }}
                title="Hapus item ini dari riwayat"
                aria-label="Hapus item dari riwayat"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-6 space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <p className="font-bold text-base text-slate-800 dark:text-slate-200">
            Belum Ada Riwayat Bacaan
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Artikel yang pernah Anda buka akan tersimpan otomatis di sini dan digunakan untuk menyusun rekomendasi personal.
          </p>
        </div>
      )}
    </div>
  );
};
