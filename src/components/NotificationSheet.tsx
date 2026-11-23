/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Bell, RotateCw, BookOpen } from 'lucide-react';
import { NewsArticle } from '../types/blogger';

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const NotificationSheet: React.FC<NotificationSheetProps> = ({
  isOpen,
  onClose,
  articles,
  onSelectArticle,
  onRefresh,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs transition-opacity px-0 sm:px-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-b-3xl border-x border-b border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Notifikasi & Pembaruan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kiriman artikel terbaru dari Blogger API v3.0
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel notifikasi"
            className="min-w-[38px] min-h-[38px] rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="min-h-[42px] w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>{isLoading ? 'Memeriksa Artikel Terbaru...' : 'Sinkronkan Berita Sekarang'}</span>
        </button>

        {/* List of recent headlines with thumbnails */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
            Artikel Terbaru Masuk
          </p>

          {articles.slice(0, 6).map((art) => (
            <div
              key={art.id}
              onClick={() => {
                onSelectArticle(art);
                onClose();
              }}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 cursor-pointer transition-colors flex items-center gap-3.5 group"
            >
              {art.thumbnail ? (
                <img
                  src={art.thumbnail}
                  alt={art.title}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-200 dark:bg-slate-700"
                  loading="lazy"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
              )}

              <div className="min-w-0 flex-1 py-0.5 space-y-1">
                <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {art.primaryCategory || 'Berita'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{art.publishedRelative || art.publishedFormatted}</span>
                </div>
                <h4 className="text-xs sm:text-sm font-serif-editorial font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                  {art.title}
                </h4>
              </div>
            </div>
          ))}

          {articles.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              Belum ada pemberitahuan artikel baru.
            </div>
          )}
        </div>

        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto -mb-1 mt-1" />
      </div>
    </div>
  );
};
