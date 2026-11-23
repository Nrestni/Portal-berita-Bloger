/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ExternalLink, Cpu } from 'lucide-react';
import { NewsArticle } from '../types/blogger';
import { ExternalTechArticle } from '../types/market';
import { HottestNewsCard } from './HottestNewsCard';

interface TechNewsPageProps {
  articles: NewsArticle[];
  externalTech: ExternalTechArticle[];
  bookmarkIds: string[];
  onSelectArticle: (article: NewsArticle) => void;
  onToggleBookmark: (id: string, article?: NewsArticle) => void;
  onOpenShare: (article: NewsArticle) => void;
}

type TechSubFilter = 'all' | 'ai' | 'cyber' | 'digital';

export const TechNewsPage: React.FC<TechNewsPageProps> = ({
  articles,
  externalTech,
  bookmarkIds,
  onSelectArticle,
  onToggleBookmark,
  onOpenShare,
}) => {
  const [subFilter, setSubFilter] = useState<TechSubFilter>('all');

  const techBloggerArticles = useMemo(() => {
    const base = articles.filter((art) => {
      const text = `${art.title} ${art.labels.join(' ')} ${art.plainTextExcerpt}`.toLowerCase();
      return (
        art.thematicCategories.includes('Teknologi') ||
        text.includes('digital') ||
        text.includes('ai') ||
        text.includes('cyber') ||
        text.includes('internet') ||
        text.includes('privasi') ||
        text.includes('teknologi')
      );
    });

    if (subFilter === 'all') return base;
    if (subFilter === 'ai') {
      return base.filter((a) => {
        const t = `${a.title} ${a.labels.join(' ')} ${a.plainTextExcerpt}`.toLowerCase();
        return t.includes('ai') || t.includes('masa depan') || t.includes('pintar') || t.includes('algoritma');
      });
    }
    if (subFilter === 'cyber') {
      return base.filter((a) => {
        const t = `${a.title} ${a.labels.join(' ')} ${a.plainTextExcerpt}`.toLowerCase();
        return (
          t.includes('cyber') ||
          t.includes('siber') ||
          t.includes('privasi') ||
          t.includes('penipuan') ||
          t.includes('jejak digital') ||
          t.includes('keamanan')
        );
      });
    }
    return base.filter((a) => {
      const t = `${a.title} ${a.labels.join(' ')} ${a.plainTextExcerpt}`.toLowerCase();
      return (
        t.includes('internet') ||
        t.includes('media sosial') ||
        t.includes('kesehatan digital') ||
        t.includes('aplikasi') ||
        t.includes('gadget')
      );
    });
  }, [articles, subFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Teknologi & Tren Digital
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Perkembangan kecerdasan buatan (AI), keamanan siber, privasi data, aplikasi, dan budaya digital.
          </p>
        </div>

        {/* Sub-topic Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {[
            { id: 'all', label: 'Semua Topik Digital' },
            { id: 'ai', label: 'AI & Masa Depan' },
            { id: 'cyber', label: 'Keamanan Siber & Privasi' },
            { id: 'digital', label: 'Internet, Aplikasi & Budaya Digital' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubFilter(tab.id as TechSubFilter)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                subFilter === tab.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Section: Blogger Tech Articles */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Liputan Utama Redaksi Blogger
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {techBloggerArticles.length} artikel
          </span>
        </div>

        {techBloggerArticles.length === 0 ? (
          <div className="p-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-2">
            <Cpu className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Belum ada artikel pada sub-topik ini
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih filter "Semua Topik Digital" untuk melihat seluruh liputan teknologi dari Blogger.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {techBloggerArticles.map((art) => (
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
      </section>

      {/* Secondary Section: Legal External Tech Community References (Links Only, No Copied Body) */}
      {externalTech.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Referensi Komunitas Pengembang & Teknologi Global
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tautan resmi ke artikel komunitas terbuka (DEV Community Public API). Membuka situs sumber asli.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {externalTech.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-4 flex items-start justify-between gap-4 transition-colors group"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.authorName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{item.readingTimeMinutes} mnt baca</span>
                    {item.tags.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>#{item.tags[0]}</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-1" />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
