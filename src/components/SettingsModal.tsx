/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Sliders, Sun, Moon, RotateCw, ShieldCheck } from 'lucide-react';
import { BloggerConfig, ThematicCategory } from '../types/blogger';
import { ServerSourceStatus } from '../types/market';
import { DEFAULT_BLOGGER_ID, saveStoredBloggerConfig } from '../services/bloggerApi';
import { fetchServerSourceStatus } from '../services/marketApi';
import { ALL_THEMATIC_CATEGORIES } from '../services/recommendationEngine';
import { useEngagement } from '../contexts/EngagementContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BloggerConfig;
  onSaveConfig: (newConfig: BloggerConfig) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  preferredTopics: ThematicCategory[];
  onTogglePreferredTopic: (topic: ThematicCategory) => void;
  onOpenAdmin?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  isDarkMode,
  onToggleTheme,
  preferredTopics,
  onTogglePreferredTopic,
  onOpenAdmin,
}) => {
  const { isAdmin } = useEngagement();
  const [blogId, setBlogId] = useState(config.blogId || DEFAULT_BLOGGER_ID);
  const [status, setStatus] = useState<ServerSourceStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const loadServerStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const data = await fetchServerSourceStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setBlogId(config.blogId || DEFAULT_BLOGGER_ID);
      loadServerStatus();
    }
  }, [isOpen, config.blogId]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = blogId.trim() || DEFAULT_BLOGGER_ID;
    const newConfig: BloggerConfig = { blogId: cleanId };
    saveStoredBloggerConfig(newConfig);
    onSaveConfig(newConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100 no-scrollbar space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup pengaturan"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
              Preferensi & Status Sumber Data
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kredensial rahasia dilindungi di sisi server. Atur tampilan dan minat bacaan Anda.
            </p>
          </div>
        </div>

        {/* Display Theme Switch */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Tema Tampilan Aplikasi
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Saat ini menggunakan {isDarkMode ? 'Mode Gelap' : 'Mode Terang'}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[38px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            <span>{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
          </button>
        </div>

        {/* Admin Panel Access */}
        {onOpenAdmin && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Pengelolaan Komentar, Like & Statistik Berita
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAdmin
                  ? 'Sesi Admin aktif — buka dasbor moderasi komentar & statistik'
                  : 'Khusus pengelola portal untuk memoderasi diskusi pembaca'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Buka Panel Admin' : 'Masuk Admin'}</span>
            </button>
          </div>
        )}

        {/* Topic Personalization */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Topik Favorit untuk "Rekomendasi Untukmu"
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_THEMATIC_CATEGORIES.map((topic) => {
              const active = preferredTopics.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => onTogglePreferredTopic(topic)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>

        {/* Server Integration Status */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Status Koneksi API Server
            </span>
            <button
              type="button"
              onClick={loadServerStatus}
              disabled={isCheckingStatus}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 cursor-pointer"
            >
              <RotateCw className={`w-3 h-3 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              <span>Periksa</span>
            </button>
          </div>

          {status ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300">Blogger API v3.0</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    status.blogger.configured
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {status.blogger.configured ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Terkonfigurasi di Server</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Perlu BLOGGER_API_KEY di .env</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300">Data Pasar Saham (IDX & Global)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Aktif (Publik)</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300">Ekonomi (ECB & Bank Dunia)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Aktif (Resmi)</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Memeriksa status layanan backend...
            </p>
          )}
        </div>

        {/* Blogger Blog ID Selector (No Secret Key Exposed) */}
        <form onSubmit={handleSave} className="space-y-4 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ID Blog Blogger Sumber Berita
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={blogId}
                onChange={(e) => setBlogId(e.target.value)}
                placeholder={DEFAULT_BLOGGER_ID}
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-tabular text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              />
              {blogId !== DEFAULT_BLOGGER_ID && (
                <button
                  type="button"
                  onClick={() => setBlogId(DEFAULT_BLOGGER_ID)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Default
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              ID Blog utama proyek: <span className="font-mono-tabular">{DEFAULT_BLOGGER_ID}</span>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
            >
              Simpan Preferensi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
