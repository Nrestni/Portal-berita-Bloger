/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Bookmark, Trash2 } from 'lucide-react';
import { NewsArticle } from '../types/blogger';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  articles: NewsArticle[];
  bookmarkIds: string[];
  onSelectArticle: (article: NewsArticle) => void;
  onRemoveBookmark: (id: string) => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  articles,
  bookmarkIds,
  onSelectArticle,
  onRemoveBookmark,
}) => {
  if (!isOpen) return null;

  const savedArticles = articles.filter((a) => bookmarkIds.includes(a.id));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200 text-slate-900 dark:text-slate-100">
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto -mt-1 sm:hidden" />

        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Bookmark className="w-4 h-4 fill-blue-600 dark:fill-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Berita Tersimpan</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{savedArticles.length} artikel dibookmark</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of saved articles */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
          {savedArticles.length > 0 ? (
            savedArticles.map((art) => (
              <div
                key={art.id}
                onClick={() => {
                  onSelectArticle(art);
                  onClose();
                }}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50/40 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                    {art.primaryCategory}
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {art.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    {art.publishedFormatted}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBookmark(art.id);
                  }}
                  title="Hapus bookmark"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Bookmark className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-600 dark:text-slate-300">Belum ada berita yang disimpan</p>
              <p className="text-[11px]">Ketuk ikon simpan pada artikel untuk membacanya nanti.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
