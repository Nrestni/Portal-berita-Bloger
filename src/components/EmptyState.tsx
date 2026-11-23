/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  searchQuery: string;
  category: string;
  onReset: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ searchQuery, category, onReset }) => {
  const displayCat = category.startsWith('tema:') ? category.replace('tema:', '') : category;

  return (
    <div className="py-16 text-center max-w-md mx-auto px-4">
      <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
        <SearchX className="w-7 h-7" />
      </div>

      <h3 className="text-lg font-serif-editorial font-bold text-slate-900 dark:text-slate-100 mb-1.5">
        Tidak Ada Artikel yang Cocok
      </h3>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
        {searchQuery ? (
          <>
            Tidak ditemukan artikel dengan kata kunci{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">"{searchQuery}"</strong>
            {category !== 'all' && (
              <>
                {' '}pada kategori <strong className="text-slate-800 dark:text-slate-200">"{displayCat}"</strong>
              </>
            )}
            .
          </>
        ) : (
          <>
            Belum ada artikel yang cocok dengan filter kategori atau rentang tanggal yang dipilih.
          </>
        )}
      </p>

      <button
        type="button"
        onClick={onReset}
        className="min-h-[40px] inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Atur Ulang Pencarian & Filter</span>
      </button>
    </div>
  );
};
