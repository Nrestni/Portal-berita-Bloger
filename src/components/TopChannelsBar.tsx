/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { DynamicCategory } from '../types/blogger';
import { ALL_THEMATIC_CATEGORIES } from '../services/recommendationEngine';

export type DateFilterOption = 'all' | '7d' | '30d' | 'year';
export type ContentTypeFilter = 'all' | 'short' | 'deep' | 'illustrated';

interface TopChannelsBarProps {
  categories: DynamicCategory[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  dateFilter: DateFilterOption;
  onDateFilterChange: (d: DateFilterOption) => void;
  contentTypeFilter: ContentTypeFilter;
  onContentTypeFilterChange: (t: ContentTypeFilter) => void;
  onResetAll: () => void;
}

export const TopChannelsBar: React.FC<TopChannelsBarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  contentTypeFilter,
  onContentTypeFilterChange,
  onResetAll,
}) => {
  const hasActiveFilter =
    activeCategory !== 'all' ||
    Boolean(searchQuery.trim()) ||
    dateFilter !== 'all' ||
    contentTypeFilter !== 'all';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[1.4rem] p-4 sm:p-5 space-y-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.28)]">
      {/* Row 1: Full-Text Search (Title & Article Content) + Date & Content Type Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari judul, isi artikel, atau topik..."
            className="w-full min-h-[44px] pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Hapus kata kunci"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="md:col-span-3">
          <select
            aria-label="Filter Rentang Tanggal"
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value as DateFilterOption)}
            className="w-full h-full min-h-[40px] px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="all">Semua Tanggal</option>
            <option value="7d">7 Hari Terakhir</option>
            <option value="30d">30 Hari Terakhir</option>
            <option value="year">Tahun Ini</option>
          </select>
        </div>

        {/* Content Type Filter */}
        <div className="md:col-span-3">
          <select
            aria-label="Filter Jenis Konten"
            value={contentTypeFilter}
            onChange={(e) => onContentTypeFilterChange(e.target.value as ContentTypeFilter)}
            className="w-full h-full min-h-[40px] px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="all">Semua Jenis Konten</option>
            <option value="short">Bacaan Singkat (≤ 3 mnt)</option>
            <option value="deep">Ulasan Mendalam (&gt; 3 mnt)</option>
            <option value="illustrated">Artikel Bergambar</option>
          </select>
        </div>
      </div>

      {/* Row 2: Thematic Categories */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Kategori Utama & Label Blogger
          </span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Atur Ulang Filter</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Semua Berita
          </button>

          {ALL_THEMATIC_CATEGORIES.map((tema) => {
            const key = `tema:${tema}`;
            const isSelected = activeCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectCategory(key)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tema}
              </button>
            );
          })}

          {categories.map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => onSelectCategory(cat.name)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
