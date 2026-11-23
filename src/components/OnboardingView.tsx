/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface OnboardingViewProps {
  onDiscover: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onDiscover }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      <div className="relative h-[54vh] sm:h-[58vh] overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="relative z-10 flex flex-col items-center justify-center pt-6">
          <div className="relative mb-3 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-200 rounded-2xl px-5 py-2 shadow-sm">
            <span className="text-xs font-bold tracking-wider text-slate-900 dark:text-slate-100">
              PORTAL INFORMASI HARI INI
            </span>
          </div>

          <svg
            className="w-60 h-60 sm:w-72 sm:h-72 drop-shadow-lg"
            viewBox="0 0 240 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M95 90 C85 60 155 60 145 90" fill="#78350F" stroke="#0F172A" strokeWidth="4" />
            <ellipse cx="120" cy="100" rx="30" ry="34" fill="#FED7AA" stroke="#0F172A" strokeWidth="4" />
            <circle cx="108" cy="98" r="11" fill="#E0F2FE" stroke="#0284C7" strokeWidth="3.5" />
            <circle cx="132" cy="98" r="11" fill="#E0F2FE" stroke="#0284C7" strokeWidth="3.5" />
            <path d="M119 98 L121 98" stroke="#0284C7" strokeWidth="3.5" />
            <circle cx="109" cy="98" r="3" fill="#0F172A" />
            <circle cx="131" cy="98" r="3" fill="#0F172A" />
            <path d="M120 102 L118 108 L122 108" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M116 116 Q120 120 124 116" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M90 134 L120 155 L150 134 L160 170 L80 170 Z" fill="#1D4ED8" stroke="#0F172A" strokeWidth="4" />
            <path d="M112 134 L120 152 L128 134 Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
            <path
              d="M40 125 L120 140 L200 125 L190 230 L120 235 L50 230 Z"
              fill="#F8FAFC"
              stroke="#0F172A"
              strokeWidth="4.5"
            />
            <path d="M120 140 L120 235" stroke="#0F172A" strokeWidth="4" />
            <text x="134" y="162" fontFamily="serif" fontWeight="900" fontSize="14" fill="#0F172A" transform="rotate(-5 134 162)">
              BERITA
            </text>
            <rect x="58" y="152" width="22" height="30" fill="#0F172A" opacity="0.85" />
            <rect x="85" y="152" width="22" height="18" fill="#94A3B8" />
            <rect x="85" y="174" width="22" height="18" fill="#94A3B8" />
            <rect x="58" y="188" width="50" height="32" fill="#CBD5E1" />
            <rect x="135" y="172" width="48" height="22" fill="#0F172A" opacity="0.85" />
            <rect x="135" y="198" width="48" height="26" fill="#94A3B8" />
            <ellipse cx="48" cy="150" rx="9" ry="14" fill="#FED7AA" stroke="#0F172A" strokeWidth="4" transform="rotate(20 48 150)" />
            <ellipse cx="192" cy="150" rx="9" ry="14" fill="#FED7AA" stroke="#0F172A" strokeWidth="4" transform="rotate(-20 192 150)" />
          </svg>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-slate-950 via-white/80 dark:via-slate-950/80 to-transparent pointer-events-none" />
      </div>

      <div className="px-6 pb-10 text-center max-w-md mx-auto w-full z-10 space-y-4">
        <h1 className="text-2xl sm:text-3xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
          Informasi Terpercaya dalam Satu Portal
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
          Baca berita terkini dari Blogger, pantau pergerakan saham BEI/IHSG, kurs Rupiah, indikator ekonomi, serta tren teknologi digital.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={onDiscover}
            className="w-full min-h-[48px] py-3.5 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base transition-colors cursor-pointer"
          >
            Mulai Jelajahi NewsApp
          </button>
        </div>
      </div>
    </div>
  );
};
