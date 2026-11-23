/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DynamicCategory } from '../types/blogger';

interface CategoryBarProps {
  categories: DynamicCategory[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  totalArticles: number;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  totalArticles,
}) => {
  return (
    <div className="bg-white py-3 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {/* "Top news" (All) tab */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-5 py-2 text-xs font-semibold rounded-full whitespace-nowrap shrink-0 transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Top news
          </button>

          {/* Dynamic categories extracted directly from Blogger labels */}
          {categories.map((cat) => {
            const isActive = activeCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.name}
                onClick={() => onSelectCategory(cat.name)}
                className={`px-5 py-2 text-xs font-semibold rounded-full whitespace-nowrap shrink-0 transition-all duration-200 ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
