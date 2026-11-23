/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, Bell, Sun, Moon, UserCircle } from 'lucide-react';
import { NavTab } from './BottomNav';
import { useEngagement } from '../contexts/EngagementContext';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNotifications: () => void;
  onQuickSearch: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  savedCount: number;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenNotifications,
  onQuickSearch,
  isDarkMode,
  onToggleTheme,
  savedCount,
}) => {
  const { isAdmin } = useEngagement();

  const navLinks: Array<{ id: NavTab; label: string }> = [
    { id: 'dashboard', label: 'Ringkasan' },
    { id: 'feed', label: 'Berita' },
    { id: 'stocks', label: 'Saham' },
    { id: 'economy', label: 'Ekonomi' },
    { id: 'tech', label: 'Teknologi' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 shadow-[0_4px_18px_-14px_rgba(15,23,42,0.3)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single Wordmark */}
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className="text-xl font-serif-editorial font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer text-left active:scale-[0.98] transition-transform"
        >
          NewsApp
        </button>

        {/* Zone 2: Clean Single-Line Text Navigation Links (Desktop & Tablet) */}
        <nav aria-label="Navigasi Utama" className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onTabChange(link.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-blue-600 text-slate-900 dark:text-slate-100 font-semibold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Compact Contextual Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onQuickSearch}
            className="min-w-[38px] min-h-[38px] rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
            title="Cari Berita atau Saham"
            aria-label="Cari Berita"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="min-w-[38px] min-h-[38px] rounded-xl text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
            title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            aria-label="Ubah Tema Terang atau Gelap"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenNotifications}
            className="min-w-[38px] min-h-[38px] rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
            title="Pembaruan Berita Terbaru"
            aria-label="Pembaruan Berita"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onTabChange('saved')}
            className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'saved' || activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>Disimpan{savedCount > 0 ? ` (${savedCount})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('account')}
            title={isAdmin ? 'Akun (Sesi Admin Aktif)' : 'Akun, Pengaturan & Masuk Admin'}
            aria-label="Akun"
            className={`min-h-[40px] relative inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'account' || activeTab === 'admin' || activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : isAdmin
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <UserCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Akun</span>
            {isAdmin && activeTab !== 'account' && activeTab !== 'admin' && activeTab !== 'settings' && (
              <span
                className="w-2 h-2 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
