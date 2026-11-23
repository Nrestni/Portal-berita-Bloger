/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  UserCircle,
  Sliders,
  ShieldCheck,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  UserPlus,
  LogIn,
  LogOut,
  Heart,
  MessageSquare,
} from 'lucide-react';
import { BloggerConfig, NewsArticle, ThematicCategory } from '../types/blogger';
import { ServerSourceStatus } from '../types/market';
import { DEFAULT_BLOGGER_ID, saveStoredBloggerConfig } from '../services/bloggerApi';
import { fetchServerSourceStatus } from '../services/marketApi';
import { ALL_THEMATIC_CATEGORIES } from '../services/recommendationEngine';
import { useEngagement } from '../contexts/EngagementContext';
import { AdminPage } from './AdminPage';
import { NavTab } from './BottomNav';

export type AccountSection = 'auth' | 'settings';
export type AuthRole = 'admin' | 'reader';

interface AccountPageProps {
  activeSection: AccountSection;
  onSectionChange: (section: AccountSection) => void;
  activeRole: AuthRole;
  onRoleChange: (role: AuthRole) => void;
  config: BloggerConfig;
  onSaveConfig: (newConfig: BloggerConfig) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  preferredTopics: ThematicCategory[];
  onTogglePreferredTopic: (topic: ThematicCategory) => void;
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  activeSection,
  onSectionChange,
  activeRole,
  onRoleChange,
  config,
  onSaveConfig,
  isDarkMode,
  onToggleTheme,
  preferredTopics,
  onTogglePreferredTopic,
  articles,
  onSelectArticle,
  onNavigateTab,
}) => {
  const {
    isAdmin,
    loggedInAdminEmail,
    adminEmail,
    readerAccount,
    registerReader,
    loginReader,
    logoutReader,
  } = useEngagement();

  // Reader auth state
  const [readerAuthMode, setReaderAuthMode] = useState<'register' | 'login'>('register');
  const [readerNameInput, setReaderNameInput] = useState<string>('');
  const [readerEmailInput, setReaderEmailInput] = useState<string>('');
  const [readerPasswordInput, setReaderPasswordInput] = useState<string>('');
  const [readerAuthError, setReaderAuthError] = useState<string | null>(null);
  const [readerAuthNotice, setReaderAuthNotice] = useState<string | null>(null);
  const [isSubmittingReader, setIsSubmittingReader] = useState<boolean>(false);

  // Settings state
  const [blogId, setBlogId] = useState<string>(config.blogId || DEFAULT_BLOGGER_ID);
  const [status, setStatus] = useState<ServerSourceStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

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
    setBlogId(config.blogId || DEFAULT_BLOGGER_ID);
  }, [config.blogId]);

  useEffect(() => {
    if (activeSection === 'settings') {
      loadServerStatus();
    }
  }, [activeSection]);

  const showTempNotice = (msg: string) => {
    setSaveNotice(msg);
    window.setTimeout(() => {
      setSaveNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleReaderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReaderAuthError(null);
    setReaderAuthNotice(null);
    setIsSubmittingReader(true);

    try {
      if (readerAuthMode === 'register') {
        await registerReader(
          readerNameInput.trim(),
          readerEmailInput.trim(),
          readerPasswordInput
        );
        setReaderAuthNotice(
          'Pendaftaran berhasil dan akun langsung aktif. Anda sekarang dapat menyukai serta mengomentari berita.'
        );
      } else {
        await loginReader(readerEmailInput.trim(), readerPasswordInput);
        setReaderAuthNotice('Berhasil masuk ke akun pembaca.');
      }
      setReaderNameInput('');
      setReaderEmailInput('');
      setReaderPasswordInput('');
    } catch (err: any) {
      if (err?.code === 'EMAIL_EXISTS') {
        setReaderAuthMode('login');
      }
      setReaderAuthError(err?.message || 'Gagal memproses akun pembaca.');
    } finally {
      setIsSubmittingReader(false);
    }
  };

  const handleSaveBlogConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = blogId.trim() || DEFAULT_BLOGGER_ID;
    const newConfig: BloggerConfig = { blogId: cleanId };
    saveStoredBloggerConfig(newConfig);
    onSaveConfig(newConfig);
    showTempNotice('Konfigurasi sumber blog berhasil diperbarui.');
  };

  return (
    <div className="space-y-6">
      {/* Account Summary Header */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              isAdmin
                ? 'bg-blue-600 text-white'
                : readerAccount
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            {isAdmin ? <ShieldCheck className="w-6 h-6" /> : <UserCircle className="w-7 h-7" />}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-xl sm:text-2xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
                {isAdmin
                  ? 'Akun Pengelola (Admin)'
                  : readerAccount
                  ? readerAccount.name
                  : 'Akun Portal NewsApp'}
              </h1>
              {isAdmin && (
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  · Sesi Admin Aktif
                </span>
              )}
              {!isAdmin && readerAccount && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  · Pembaca Terdaftar
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 break-all">
              {isAdmin
                ? `Admin: ${loggedInAdminEmail || adminEmail}`
                : readerAccount
                ? readerAccount.email
                : 'Masuk atau daftar akun dan kelola pengaturan.'}
            </p>
          </div>
        </div>
      </section>

      {/* Account Sub-Navigation Tabs: Akun & Pengaturan */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => onSectionChange('auth')}
          className={`min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeSection === 'auth'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <UserCircle className="w-3.5 h-3.5" />
          <span>Akun</span>
        </button>

        <button
          type="button"
          onClick={() => onSectionChange('settings')}
          className={`min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeSection === 'settings'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Pengaturan</span>
        </button>
      </div>

      {/* SECTION 1: UNIFIED ADMIN & READER ACCOUNT ACCESS */}
      {activeSection === 'auth' && (
        <>
          {isAdmin ? (
            <AdminPage articles={articles} onSelectArticle={onSelectArticle} />
          ) : (
            <div className="max-w-md mx-auto py-4 sm:py-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                {/* Role Switcher: Login Admin vs Daftar/Login Pembaca */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setReaderAuthError(null);
                      onRoleChange('admin');
                    }}
                    className={`min-h-[40px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      activeRole === 'admin'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReaderAuthError(null);
                      onRoleChange('reader');
                    }}
                    className={`min-h-[40px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      activeRole === 'reader'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <UserCircle className="w-3.5 h-3.5" />
                    <span>Pembaca</span>
                  </button>
                </div>

                {activeRole === 'admin' ? (
                  <AdminPage articles={articles} onSelectArticle={onSelectArticle} embedded />
                ) : (
                  <div className="space-y-5">
                    {readerAuthNotice && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{readerAuthNotice}</span>
                      </div>
                    )}

                    {readerAccount ? (
                      <div className="space-y-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <UserCircle className="w-7 h-7" />
                            </div>
                            <div>
                              <h2 className="text-lg font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
                                {readerAccount.name}
                              </h2>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {readerAccount.email}
                              </p>
                            </div>
                          </div>

                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                            Aktif
                          </span>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            Hak Akses Pembaca Terdaftar:
                          </p>
                          <div className="flex items-center gap-2">
                            <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>Dapat menyukai (Like) seluruh berita dan artikel</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>Dapat menulis, mengedit, dan menghapus komentar Anda</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => onNavigateTab('feed')}
                            className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Jelajahi Berita
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              logoutReader();
                              setReaderAuthNotice(null);
                            }}
                            className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Keluar Akun Pembaca</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            {readerAuthMode === 'register' ? (
                              <UserPlus className="w-5 h-5" />
                            ) : (
                              <LogIn className="w-5 h-5" />
                            )}
                          </div>
                          <h2 className="text-xl sm:text-2xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
                            {readerAuthMode === 'register' ? 'Daftar' : 'Masuk'}
                          </h2>
                        </div>

                        {readerAuthError && (
                          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{readerAuthError}</span>
                          </div>
                        )}

                        <form onSubmit={handleReaderSubmit} className="space-y-4">
                          {readerAuthMode === 'register' && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Nama
                              </label>
                              <input
                                type="text"
                                required
                                minLength={2}
                                maxLength={60}
                                value={readerNameInput}
                                onChange={(e) => setReaderNameInput(e.target.value)}
                                placeholder="Masukkan nama Anda"
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                              Email
                            </label>
                            <input
                              type="email"
                              required
                              value={readerEmailInput}
                              onChange={(e) => setReaderEmailInput(e.target.value)}
                              placeholder="nama@email.com"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                              Kata Sandi
                            </label>
                            <input
                              type="password"
                              required
                              minLength={6}
                              value={readerPasswordInput}
                              onChange={(e) => setReaderPasswordInput(e.target.value)}
                              placeholder="Minimal 6 karakter"
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmittingReader}
                            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                          >
                            {isSubmittingReader
                              ? 'Memproses...'
                              : readerAuthMode === 'register'
                              ? 'Daftar'
                              : 'Masuk'}
                          </button>
                        </form>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setReaderAuthError(null);
                              setReaderAuthMode((prev) => (prev === 'register' ? 'login' : 'register'));
                            }}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {readerAuthMode === 'register'
                              ? 'Sudah punya akun? Masuk'
                              : 'Belum punya akun? Daftar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* SECTION 3: PENGATURAN & PREFERENSI */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          {saveNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tema & Topik Favorit */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Tema & Tampilan Aplikasi
                </h2>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Mode Warna Layar
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Saat ini menggunakan {isDarkMode ? 'Mode Gelap' : 'Mode Terang'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className="min-h-[38px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {isDarkMode ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                    <span>{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Topik Favorit untuk "Rekomendasi Untukmu"
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pilih topik berita yang Anda minati agar rekomendasi artikel di beranda lebih relevan.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ALL_THEMATIC_CATEGORIES.map((topic) => {
                    const active = preferredTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => onTogglePreferredTopic(topic)}
                        className={`min-h-[34px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
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
            </div>

            {/* Sumber Data & Koneksi API Server */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Status Koneksi API Server
                  </h2>
                  <button
                    type="button"
                    onClick={loadServerStatus}
                    disabled={isCheckingStatus}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                    <span>Periksa</span>
                  </button>
                </div>

                {status ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between gap-2">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        Blogger API v3.0
                      </span>
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
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between gap-2">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        Data Pasar Saham (IDX & Global)
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Aktif (Publik)
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between gap-2">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        Ekonomi (ECB & Bank Dunia)
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Aktif (Resmi)
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Memeriksa status layanan backend...
                  </p>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Sumber Berita Blogger
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Kredensial rahasia dilindungi di sisi server. Anda dapat menyesuaikan ID Blog Blogger yang menjadi sumber artikel portal.
                </p>

                <form onSubmit={handleSaveBlogConfig} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ID Blog Blogger
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
                      ID Blog utama portal:{' '}
                      <span className="font-mono-tabular">{DEFAULT_BLOGGER_ID}</span>
                    </p>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="submit"
                      className="min-h-[38px] px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                    >
                      Simpan Konfigurasi Blog
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
