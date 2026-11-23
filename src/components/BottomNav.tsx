/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LayoutGrid, Newspaper, TrendingUp, Landmark, Bookmark } from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'feed'
  | 'stocks'
  | 'economy'
  | 'tech'
  | 'saved'
  | 'history'
  | 'account'
  | 'admin'
  | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  savedCount: number;
  historyCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  savedCount,
  historyCount,
}) => {
  const isLibraryActive = activeTab === 'saved' || activeTab === 'history';
  const totalLibraryCount = savedCount + historyCount;

  const items: Array<{
    id: NavTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    isActive: boolean;
    badge?: number;
  }> = [
    {
      id: 'dashboard',
      label: 'Ringkasan',
      icon: LayoutGrid,
      isActive: activeTab === 'dashboard',
    },
    {
      id: 'feed',
      label: 'Berita',
      icon: Newspaper,
      isActive: activeTab === 'feed' || activeTab === 'tech',
    },
    {
      id: 'stocks',
      label: 'Saham',
      icon: TrendingUp,
      isActive: activeTab === 'stocks',
    },
    {
      id: 'economy',
      label: 'Ekonomi',
      icon: Landmark,
      isActive: activeTab === 'economy',
    },
    {
      id: 'saved',
      label: 'Disimpan',
      icon: Bookmark,
      isActive: isLibraryActive,
      badge: savedCount > 0 ? savedCount : historyCount > 0 ? historyCount : undefined,
    },
  ];

  return (
    <nav
      aria-label="Navigasi Utama Seluler"
      className="md:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-40 mx-auto max-w-md rounded-[1.4rem] bg-white/94 dark:bg-slate-900/94 backdrop-blur-2xl border border-white dark:border-slate-700/80 shadow-[0_16px_40px_-10px_rgba(15,23,42,0.24),0_4px_12px_-4px_rgba(15,23,42,0.08)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.7)] transition-colors"
    >
      <div className="px-1.5 py-1.5 grid grid-cols-5 items-center gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`min-h-[52px] flex flex-col items-center justify-center rounded-xl py-1 px-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
                item.isActive
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'
              }`}
              aria-label={item.label}
              title={
                item.id === 'saved' && totalLibraryCount > 0
                  ? `Disimpan (${savedCount} disimpan, ${historyCount} riwayat)`
                  : item.label
              }
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${item.isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-blue-600 text-white rounded-full text-[9px] font-mono-tabular font-semibold flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
