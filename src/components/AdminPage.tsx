/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  Eye,
  Heart,
  MessageSquare,
  Lock,
  Unlock,
  Trash2,
  Pin,
  Reply,
  CheckCircle2,
  EyeOff,
  RotateCw,
  LogOut,
  Search,
  KeyRound,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { NewsArticle } from '../types/blogger';
import {
  AdminOverviewResponse,
  AppComment,
  ArticleEngagementStats,
  CommentStatus,
} from '../types/engagement';
import {
  adminDeleteCommentApi,
  adminManageArticleApi,
  adminModerateCommentApi,
  changeAdminPasswordApi,
  fetchAdminOverviewApi,
  updateAdminModerationSettingsApi,
} from '../services/engagementApi';
import { useEngagement } from '../contexts/EngagementContext';

interface AdminPageProps {
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
  embedded?: boolean;
}

type AdminSubTab = 'comments' | 'articles' | 'settings';
type CommentFilterStatus = 'all' | 'published' | 'pending' | 'hidden';

export const AdminPage: React.FC<AdminPageProps> = ({
  articles,
  onSelectArticle,
  embedded = false,
}) => {
  const {
    isAdmin,
    adminEmail,
    loggedInAdminEmail,
    isCheckingAdmin,
    loginAdmin,
    logoutAdmin,
    refreshAdminSession,
    syncSingleStats,
    refreshSummary,
  } = useEngagement();

  // Auth form state
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);

  // Admin dashboard state
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('comments');
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Comment moderation filters & inline actions
  const [commentFilter, setCommentFilter] = useState<CommentFilterStatus>('all');
  const [commentSearch, setCommentSearch] = useState<string>('');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<string>('');
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);

  // Article management filters & inline actions
  const [articleSearch, setArticleSearch] = useState<string>('');
  const [confirmResetKey, setConfirmResetKey] = useState<string | null>(null);
  const [busyArticleId, setBusyArticleId] = useState<string | null>(null);

  // Password change state
  const [currentPass, setCurrentPass] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);

  useEffect(() => {
    refreshAdminSession();
  }, [refreshAdminSession]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setActionError(null);
    window.setTimeout(() => {
      setActionNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const loadOverview = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingOverview(true);
    setActionError(null);
    try {
      const data = await fetchAdminOverviewApi();
      setOverview(data);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memuat data pengelolaan Admin.');
    } finally {
      setIsLoadingOverview(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadOverview();
    } else {
      setOverview(null);
    }
  }, [isAdmin, loadOverview]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);
    try {
      await loginAdmin(usernameInput.trim(), passwordInput);
      setPasswordInput('');
    } catch (err: any) {
      setAuthError(err?.message || 'Gagal memverifikasi kredensial Admin.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleModerateComment = async (
    comment: AppComment,
    patch: { status?: CommentStatus; pinned?: boolean; adminReply?: string | null },
    successMsg: string
  ) => {
    setBusyCommentId(comment.id);
    setActionError(null);
    try {
      const res = await adminModerateCommentApi(comment.id, patch);
      syncSingleStats(res.stats);
      await loadOverview();
      await refreshSummary();
      setReplyingId(null);
      setReplyDraft('');
      showNotice(successMsg);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memperbarui komentar.');
    } finally {
      setBusyCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setBusyCommentId(commentId);
    setActionError(null);
    try {
      const res = await adminDeleteCommentApi(commentId);
      syncSingleStats(res.stats);
      setConfirmDeleteCommentId(null);
      await loadOverview();
      await refreshSummary();
      showNotice('Komentar berhasil dihapus permanen.');
    } catch (err: any) {
      setActionError(err?.message || 'Gagal menghapus komentar.');
    } finally {
      setBusyCommentId(null);
    }
  };

  const handleManageArticle = async (
    articleId: string,
    title: string,
    action: {
      commentsLocked?: boolean;
      resetViews?: boolean;
      resetLikes?: boolean;
      clearComments?: boolean;
    },
    successMsg: string
  ) => {
    setBusyArticleId(articleId);
    setActionError(null);
    try {
      const res = await adminManageArticleApi(articleId, { ...action, title });
      syncSingleStats(res.stats);
      setConfirmResetKey(null);
      await loadOverview();
      await refreshSummary();
      showNotice(successMsg);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memperbarui pengaturan artikel.');
    } finally {
      setBusyArticleId(null);
    }
  };

  const handleToggleRequireApproval = async (nextVal: boolean) => {
    setActionError(null);
    try {
      const res = await updateAdminModerationSettingsApi(nextVal);
      setOverview((prev) =>
        prev ? { ...prev, moderationSettings: res.moderationSettings } : prev
      );
      await refreshSummary();
      showNotice(
        nextVal
          ? 'Moderasi ketat diaktifkan: komentar baru memerlukan persetujuan Admin.'
          : 'Komentar baru kini langsung ditampilkan ke publik.'
      );
    } catch (err: any) {
      setActionError(err?.message || 'Gagal mengubah pengaturan moderasi.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsChangingPass(true);
    try {
      await changeAdminPasswordApi(currentPass, newPass);
      setCurrentPass('');
      setNewPass('');
      showNotice('Kata sandi Admin berhasil diperbarui.');
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memperbarui kata sandi Admin.');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Merge Blogger articles with persisted server engagement stats
  const unifiedArticles = useMemo(() => {
    const map = new Map<string, { article?: NewsArticle; stats: ArticleEngagementStats }>();

    articles.forEach((art) => {
      map.set(art.id, {
        article: art,
        stats: {
          articleId: art.id,
          title: art.title,
          views: 0,
          uniqueReaders: 0,
          likes: 0,
          commentCount: 0,
          likedByMe: false,
          commentsLocked: false,
          lastViewedAt: null,
        },
      });
    });

    (overview?.articles || []).forEach((st) => {
      const existing = map.get(st.articleId);
      map.set(st.articleId, {
        article: existing?.article,
        stats: {
          ...st,
          title: existing?.article?.title || st.title || `Artikel #${st.articleId}`,
        },
      });
    });

    const list = Array.from(map.values());
    if (articleSearch.trim()) {
      const q = articleSearch.toLowerCase().trim();
      return list
        .filter(
          (item) =>
            item.stats.title.toLowerCase().includes(q) ||
            item.stats.articleId.toLowerCase().includes(q)
        )
        .sort((a, b) => b.stats.views - a.stats.views || b.stats.likes - a.stats.likes);
    }

    return list.sort((a, b) => b.stats.views - a.stats.views || b.stats.likes - a.stats.likes);
  }, [articles, overview?.articles, articleSearch]);

  const filteredComments = useMemo(() => {
    let list = overview?.comments || [];
    if (commentFilter !== 'all') {
      list = list.filter((c) => c.status === commentFilter);
    }
    if (commentSearch.trim()) {
      const q = commentSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.authorName.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q) ||
          c.articleTitle.toLowerCase().includes(q)
      );
    }
    return list;
  }, [overview?.comments, commentFilter, commentSearch]);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  if (isCheckingAdmin) {
    return (
      <div className={embedded ? 'py-10 text-center text-sm text-slate-500 dark:text-slate-400' : 'py-16 text-center text-sm text-slate-500 dark:text-slate-400'}>
        Memeriksa sesi pengelola...
      </div>
    );
  }

  // =========================================================
  // LOGIN-ONLY VIEW FOR ADMIN (NO REGISTRATION)
  // =========================================================
  if (!isAdmin) {
    const authFormContent = (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
            Masuk Admin
          </h2>
        </div>

        {authError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Username"
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
              autoComplete="current-password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Kata sandi"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingAuth}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {isSubmittingAuth ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    );

    if (embedded) {
      return authFormContent;
    }

    return (
      <div className="max-w-md mx-auto py-6 sm:py-10">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
          {authFormContent}
        </div>
      </div>
    );
  }

  // =========================================================
  // AUTHENTICATED ADMIN DASHBOARD VIEW
  // =========================================================
  const totals = overview?.totals || {
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    publishedComments: 0,
    pendingComments: 0,
    hiddenComments: 0,
    trackedArticles: 0,
  };

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Pengelola Portal Berita · {loggedInAdminEmail || adminEmail}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
            Panel Pengelolaan Interaksi & Moderasi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Kelola komentar pembaca, pantau jumlah pembaca yang melihat berita, dan atur interaksi suka (like) setiap artikel.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadOverview}
            disabled={isLoadingOverview}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingOverview ? 'animate-spin text-blue-600' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            type="button"
            onClick={logoutAdmin}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Real Engagement Summary Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Berita Dilihat</span>
            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
            {totals.totalViews.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Dari {unifiedArticles.length} artikel terdaftar
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Suka (Like)</span>
            <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
            {totals.totalLikes.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Apresiasi asli dari pembaca
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Komentar Ditampilkan</span>
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
            {totals.publishedComments.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Total semua komentar: {totals.totalComments}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Menunggu / Disembunyikan</span>
            <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
            {(totals.pendingComments + totals.hiddenComments).toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {totals.pendingComments} menunggu · {totals.hiddenComments} disembunyikan
          </p>
        </div>
      </section>

      {/* Interactive Segmented Sub-Tab Control */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubTab('comments')}
          className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'comments'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Moderasi Komentar ({totals.totalComments})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('articles')}
          className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'articles'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Statistik & Kontrol Artikel ({unifiedArticles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'settings'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Pengaturan Moderasi & Sandi
        </button>
      </div>

      {/* SUB-TAB 1: COMMENT MODERATION */}
      {activeSubTab === 'comments' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: `Semua (${totals.totalComments})` },
                  { id: 'published', label: `Ditampilkan (${totals.publishedComments})` },
                  { id: 'pending', label: `Menunggu (${totals.pendingComments})` },
                  { id: 'hidden', label: `Disembunyikan (${totals.hiddenComments})` },
                ] as Array<{ id: CommentFilterStatus; label: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCommentFilter(item.id)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    commentFilter === item.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                placeholder="Cari nama, isi komentar, judul..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {filteredComments.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <MessageSquare className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Belum ada komentar yang sesuai dengan penyaringan ini
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Komentar yang dikirim pembaca pada halaman berita akan muncul secara otomatis di sini.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
              {filteredComments.map((c) => {
                const matchedArticle = articles.find((a) => a.id === c.articleId);
                const isBusy = busyCommentId === c.id;
                return (
                  <div key={c.id} className="p-4 sm:p-5 space-y-3">
                    {/* Metadata line (Zero-pill discipline) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {c.authorName}
                        </span>
                        {c.isAdminAuthor && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              Pengelola (Admin)
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{formatDateTime(c.createdAt)}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            c.status === 'published'
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : c.status === 'pending'
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : 'text-rose-600 dark:text-rose-400 font-semibold'
                          }
                        >
                          {c.status === 'published'
                            ? 'Ditampilkan'
                            : c.status === 'pending'
                            ? 'Menunggu Persetujuan'
                            : 'Disembunyikan'}
                        </span>
                        {c.pinned && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              Disematkan
                            </span>
                          </>
                        )}
                      </div>

                      {matchedArticle ? (
                        <button
                          type="button"
                          onClick={() => onSelectArticle(matchedArticle)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer max-w-xs truncate"
                        >
                          <span className="truncate">{matchedArticle.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 truncate max-w-xs">
                          {c.articleTitle}
                        </span>
                      )}
                    </div>

                    {/* Comment Body */}
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {c.content}
                    </p>

                    {/* Existing Admin Reply */}
                    {c.adminReply && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            Balasan Pengelola (Admin)
                          </span>
                          <span>{formatDateTime(c.adminReply.repliedAt)}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">
                          {c.adminReply.content}
                        </p>
                      </div>
                    )}

                    {/* Reply Form */}
                    {replyingId === c.id && (
                      <div className="pt-2 space-y-2">
                        <textarea
                          rows={2}
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          placeholder="Tulis balasan resmi Admin untuk komentar ini..."
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleModerateComment(
                                c,
                                { adminReply: replyDraft.trim() || null },
                                replyDraft.trim()
                                  ? 'Balasan Admin berhasil disimpan.'
                                  : 'Balasan Admin dihapus.'
                              )
                            }
                            className="min-h-[34px] px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            Simpan Balasan
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingId(null);
                              setReplyDraft('');
                            }}
                            className="min-h-[34px] px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Moderation Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {c.status !== 'published' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            handleModerateComment(
                              c,
                              { status: 'published' },
                              'Komentar disetujui dan ditampilkan ke publik.'
                            )
                          }
                          className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 text-xs font-semibold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tampilkan</span>
                        </button>
                      )}

                      {c.status !== 'hidden' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            handleModerateComment(
                              c,
                              { status: 'hidden' },
                              'Komentar disembunyikan dari publik.'
                            )
                          }
                          className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Sembunyikan</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleModerateComment(
                            c,
                            { pinned: !c.pinned },
                            !c.pinned
                              ? 'Komentar disematkan di urutan teratas artikel.'
                              : 'Sematan komentar dilepas.'
                          )
                        }
                        className={`min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          c.pinned
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span>{c.pinned ? 'Lepas Sematan' : 'Sematkan'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setReplyingId(c.id);
                          setReplyDraft(c.adminReply?.content || '');
                        }}
                        className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>{c.adminReply ? 'Ubah Balasan Admin' : 'Balas sebagai Admin'}</span>
                      </button>

                      {confirmDeleteCommentId === c.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteComment(c.id)}
                            className="min-h-[34px] px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                          >
                            Konfirmasi Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCommentId(null)}
                            className="min-h-[34px] px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteCommentId(c.id)}
                          className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SUB-TAB 2: PER-ARTICLE STATS & CONTROLS */}
      {activeSubTab === 'articles' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan jumlah pembaca yang melihat berita, jumlah suka, status diskusi, dan kontrol per artikel.
            </p>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={articleSearch}
                onChange={(e) => setArticleSearch(e.target.value)}
                placeholder="Cari judul artikel..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">Judul Berita</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Dilihat</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Pembaca Unik</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Suka</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Komentar</th>
                  <th className="py-3.5 px-4 font-semibold">Status Diskusi</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Tindakan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                {unifiedArticles.map(({ article, stats }) => {
                  const isBusy = busyArticleId === stats.articleId;
                  const resetKey = `reset_${stats.articleId}`;
                  return (
                    <tr
                      key={stats.articleId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 max-w-xs">
                        {article ? (
                          <button
                            type="button"
                            onClick={() => onSelectArticle(article)}
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-left line-clamp-2 cursor-pointer"
                          >
                            {stats.title}
                          </button>
                        ) : (
                          <span className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                            {stats.title}
                          </span>
                        )}
                        {stats.lastViewedAt && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Terakhir dilihat: {formatDateTime(stats.lastViewedAt)}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
                        {stats.views.toLocaleString('id-ID')}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono-tabular text-slate-600 dark:text-slate-300">
                        {stats.uniqueReaders.toLocaleString('id-ID')}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-rose-600 dark:text-rose-400">
                        {stats.likes.toLocaleString('id-ID')}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-200">
                        {stats.commentCount.toLocaleString('id-ID')}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {stats.commentsLocked ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            Dikunci
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Terbuka
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleManageArticle(
                                stats.articleId,
                                stats.title,
                                { commentsLocked: !stats.commentsLocked },
                                !stats.commentsLocked
                                  ? 'Kolom komentar artikel dikunci.'
                                  : 'Kolom komentar artikel dibuka kembali.'
                              )
                            }
                            className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
                          >
                            {stats.commentsLocked ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Buka Komentar</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Kunci Komentar</span>
                              </>
                            )}
                          </button>

                          {confirmResetKey === resetKey ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleManageArticle(
                                    stats.articleId,
                                    stats.title,
                                    { resetViews: true, resetLikes: true },
                                    'Statistik tayangan & suka artikel telah direset ke 0.'
                                  )
                                }
                                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                Ya, Reset
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmResetKey(null)}
                                className="min-h-[32px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            (stats.views > 0 || stats.likes > 0) && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setConfirmResetKey(resetKey)}
                                className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer whitespace-nowrap"
                              >
                                Reset Angka
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SUB-TAB 3: GLOBAL MODERATION & PASSWORD SETTINGS */}
      {activeSubTab === 'settings' && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Kebijakan Moderasi Komentar
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tentukan apakah komentar pembaca langsung diterbitkan atau harus disetujui terlebih dahulu oleh Admin sebelum terlihat oleh pembaca lain.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Wajib Tinjauan Admin Sebelum Tampil
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {overview?.moderationSettings.requireApproval
                    ? 'Aktif — komentar baru masuk ke antrean Menunggu Persetujuan.'
                    : 'Nonaktif — komentar baru langsung tampil dan tetap bisa dimoderasi Admin.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleToggleRequireApproval(!overview?.moderationSettings.requireApproval)
                }
                className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  overview?.moderationSettings.requireApproval
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {overview?.moderationSettings.requireApproval ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Keamanan Kata Sandi Admin
              </h2>
            </div>

            {overview?.passwordManagedByEnv ? (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Kata sandi Admin saat ini dikunci melalui konfigurasi environment server (<code className="font-mono-tabular">ADMIN_PASSWORD</code>).
              </p>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi Saat Ini
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi Baru (Min. 6 Karakter)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {isChangingPass ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
                </button>
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
