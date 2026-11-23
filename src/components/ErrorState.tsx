/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, RotateCw, Settings, ShieldAlert, WifiOff, FileQuestion } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  onOpenSettings: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, onOpenSettings }) => {
  const isMissingConfig = error.includes('CONFIG_MISSING');
  const isQuotaOrDenied = error.includes('QUOTA_EXCEEDED') || error.includes('ACCESS_DENIED');
  const isNotFound = error.includes('BLOG_NOT_FOUND');
  const isNetwork = error.includes('NETWORK_ERROR');

  let title = 'Gagal Memuat Artikel Berita';
  let description = error;
  let icon = <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />;

  if (isMissingConfig) {
    title = 'Konfigurasi Server Blogger Diperlukan';
    description =
      'Variabel lingkungan BLOGGER_API_KEY belum dikonfigurasi pada sisi server. Tambahkan kredensial Blogger API v3 pada environment server untuk memuat artikel.';
    icon = <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />;
  } else if (isQuotaOrDenied) {
    title = 'Batas Kuota atau Akses Blogger API';
    description =
      'Permintaan ke Blogger API v3 sedang mencapai batas kuota harian atau akses dibatasi. Silakan coba beberapa saat lagi.';
    icon = <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />;
  } else if (isNotFound) {
    title = 'Sumber Blog Tidak Ditemukan';
    description =
      'ID Blog Blogger yang dikonfigurasi tidak ditemukan. Periksa pengaturan ID Blog pada menu Preferensi.';
    icon = <FileQuestion className="w-8 h-8 text-rose-600 dark:text-rose-400" />;
  } else if (isNetwork) {
    title = 'Koneksi Jaringan Terputus';
    description =
      'Tidak dapat menghubungi layanan berita saat ini. Periksa sambungan internet perangkat Anda lalu coba kembali.';
    icon = <WifiOff className="w-8 h-8 text-slate-600 dark:text-slate-400" />;
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center">
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          {icon}
        </div>

        <h3 className="text-lg sm:text-xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="w-full sm:w-auto min-h-[40px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>Coba Muat Ulang</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full sm:w-auto min-h-[40px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Lihat Status Sumber Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
