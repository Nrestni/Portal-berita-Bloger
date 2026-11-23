/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, Bookmark, ExternalLink } from 'lucide-react';
import { NewsArticle } from '../types/blogger';
import { ImageWithFallback } from './ImageWithFallback';

interface ArticleCardProps {
  article: NewsArticle;
  onSelect: (article: NewsArticle) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (e: React.MouseEvent, id: string) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onSelect,
  isBookmarked = false,
  onToggleBookmark,
}) => {
  return (
    <article
      onClick={() => onSelect(article)}
      className="group cursor-pointer bg-white rounded-2xl border border-slate-100 p-3 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-3.5 active:scale-[0.99]"
    >
      {/* Square/Landscape Thumbnail on the left with rounded-2xl */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-slate-100 relative">
        <ImageWithFallback
          src={article.thumbnail}
          alt={article.title}
          aspectRatioClass="w-full h-full"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          category={article.primaryCategory}
        />
      </div>

      {/* Title & Metadata on the right */}
      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block mb-1">
            {article.primaryCategory}
          </span>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2 leading-snug">
            {article.title}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{article.publishedRelative || article.publishedFormatted}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Interactive Bookmark Button */}
            {onToggleBookmark && (
              <button
                onClick={(e) => onToggleBookmark(e, article.id)}
                title={isBookmarked ? 'Hapus dari Tersimpan' : 'Simpan Berita'}
                className={`p-1.5 rounded-full transition-all active:scale-75 ${
                  isBookmarked
                    ? 'text-red-600 bg-red-50'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-red-600' : ''}`} />
              </button>
            )}

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Buka di Blogger Asli"
              className="p-1.5 text-slate-400 hover:text-slate-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};
