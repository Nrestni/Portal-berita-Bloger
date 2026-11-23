/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bookmark, Share2, ExternalLink, Heart, Eye, MessageSquare } from 'lucide-react';
import { NewsArticle } from '../types/blogger';
import { ImageWithFallback } from './ImageWithFallback';
import { useEngagement } from '../contexts/EngagementContext';

interface HottestNewsCardProps {
  article: NewsArticle;
  onSelect: (article: NewsArticle) => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string, article?: NewsArticle) => void;
  onOpenShare: (article: NewsArticle) => void;
  recommendationReason?: string;
}

export const HottestNewsCard: React.FC<HottestNewsCardProps> = ({
  article,
  onSelect,
  isBookmarked,
  onToggleBookmark,
  onOpenShare,
  recommendationReason,
}) => {
  const { getStats, toggleLike } = useEngagement();
  const stats = getStats(article.id);

  return (
    <article
      onClick={() => onSelect(article)}
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 p-4 sm:p-5 flex flex-col justify-between gap-3.5 cursor-pointer group rounded-[1.4rem] shadow-[0_8px_24px_-20px_rgba(15,23,42,0.28)] active:scale-[0.99]"
    >
      <div className="space-y-3">
        {/* Media Image: Clean 16:9 */}
        <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
          <ImageWithFallback
            src={article.thumbnail}
            alt={article.title}
            aspectRatioClass="aspect-video"
            imgClassName="group-hover:scale-[1.015] transition-transform duration-200"
            category={article.primaryCategory}
          />
        </div>

        {/* Clean Unboxed Metadata (Zero-Pill Discipline) */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {article.primaryCategory}
          </span>
          <span aria-hidden="true">·</span>
          <span>{article.publishedRelative || article.publishedFormatted}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{article.readingTime} mnt baca</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 tabular-nums" title="Jumlah pembaca yang telah melihat berita ini">
            <Eye className="w-3.5 h-3.5" />
            <span>{stats.views.toLocaleString('id-ID')} dilihat</span>
          </span>
        </div>

        {/* Recommendation Reason (if rendered inside Rekomendasi Untukmu) */}
        {recommendationReason && (
          <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            {recommendationReason}
          </p>
        )}

        {/* Article Headline */}
        <h3 className="text-base sm:text-lg font-serif-editorial font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 [text-wrap:balance]">
          {article.title}
        </h3>

        {/* Excerpt */}
        {article.plainTextExcerpt && (
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
            {article.plainTextExcerpt}
          </p>
        )}
      </div>

      {/* Authentic Engagement & Actions Row */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 font-medium gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(article.id, article.title);
            }}
            className={`min-h-[36px] inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
              stats.likedByMe
                ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 font-semibold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title={stats.likedByMe ? 'Batalkan Suka' : 'Sukai Berita Ini'}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                stats.likedByMe ? 'fill-rose-600 dark:fill-rose-400' : ''
              }`}
            />
            <span>{stats.likes > 0 ? stats.likes.toLocaleString('id-ID') : 'Suka'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(article);
            }}
            className="min-h-[36px] inline-flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
            title="Baca & Tulis Komentar"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{stats.commentCount.toLocaleString('id-ID')}</span>
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(article.id, article);
            }}
            className={`min-h-[36px] flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isBookmarked
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 font-semibold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title={isBookmarked ? 'Hapus dari Disimpan' : 'Simpan Artikel'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-blue-600 dark:fill-blue-400' : ''}`} />
            <span className="hidden sm:inline">{isBookmarked ? 'Tersimpan' : 'Simpan'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenShare(article);
            }}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer shrink-0"
            title="Bagikan Artikel"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Buka di Situs Blogger Asli"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
};

