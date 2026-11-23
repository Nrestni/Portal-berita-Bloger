/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, History, Trash2, Clock, BookOpen } from 'lucide-react';
import { NewsArticle } from '../types/blogger';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  historyArticles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  historyArticles,
  onSelectArticle,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300 text-slate-900 dark:text-slate-100">
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto -mt-1 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Riwayat Membaca</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">{historyArticles.length} artikel telah dibaca</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {historyArticles.length > 0 && (
              <button
                onClick={onClearHistory}
                title="Hapus semua riwayat"
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of history articles with photo and title */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
          {historyArticles.length > 0 ? (
            historyArticles.map((art) => (
              <div
                key={art.id}
                onClick={() => {
                  onSelectArticle(art);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 cursor-pointer transition-all duration-200 flex items-center gap-4 group shadow-xs hover:shadow-md"
              >
                {art.thumbnail ? (
                  <img
                    src={art.thumbnail}
                    alt={art.title}
                    className="w-20 h-20 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform duration-300 bg-slate-200 dark:bg-slate-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                )}

                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-100/60 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                      {art.primaryCategory || 'Berita'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-400 mt-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{art.publishedFormatted}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 shadow-inner">
                <History className="w-7 h-7" />
              </div>
              <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">Belum ada riwayat membaca</p>
              <p className="text-xs max-w-xs mx-auto">Artikel yang Anda baca akan otomatis tersusun di sini dari atas ke bawah.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
