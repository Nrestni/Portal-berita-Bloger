/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  Bookmark,
  Share2,
  ExternalLink,
  Volume2,
  VolumeX,
  Type,
  MessageSquare,
  Eye,
  BookOpen,
  Heart,
  Send,
  ShieldCheck,
  Lock,
  Unlock,
  Pin,
  Reply,
  Trash2,
  Pencil,
  CheckCircle2,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { NewsArticle } from '../types/blogger';
import { AppComment, CommentStatus } from '../types/engagement';
import {
  sanitizeHtmlContent,
  fetchBloggerComments,
  BloggerComment,
  getStoredBloggerConfig,
} from '../services/bloggerApi';
import {
  adminDeleteCommentApi,
  adminManageArticleApi,
  adminModerateCommentApi,
  deleteAppComment,
  editOwnAppComment,
  fetchArticleAppComments,
  getSavedReaderName,
  postArticleAppComment,
  saveReaderName,
} from '../services/engagementApi';
import { useEngagement } from '../contexts/EngagementContext';
import { ImageWithFallback } from './ImageWithFallback';
import { HottestNewsCard } from './HottestNewsCard';
import { ShareSheet } from './ShareSheet';

interface ArticleDetailProps {
  article: NewsArticle;
  allArticles: NewsArticle[];
  bookmarkIds: string[];
  onBack: () => void;
  onSelectArticle: (article: NewsArticle) => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string, article?: NewsArticle) => void;
  onOpenAdminPanel?: () => void;
  onOpenReaderAuth?: () => void;
}

export const ArticleDetail: React.FC<ArticleDetailProps> = ({
  article,
  allArticles,
  bookmarkIds,
  onBack,
  onSelectArticle,
  isBookmarked,
  onToggleBookmark,
  onOpenAdminPanel,
  onOpenReaderAuth,
}) => {
  const {
    getStats,
    syncSingleStats,
    recordView,
    toggleLike,
    isAdmin,
    readerAccount,
    canEngage,
  } = useEngagement();

  const stats = getStats(article.id);
  const commentsSectionRef = useRef<HTMLElement | null>(null);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReaderMode, setIsReaderMode] = useState(false);

  // Interactive App Comments + Blogger Comments
  const [appComments, setAppComments] = useState<AppComment[]>([]);
  const [bloggerComments, setBloggerComments] = useState<BloggerComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);

  // Comment composer state
  const [authorName, setAuthorName] = useState<string>(() => getSavedReaderName());
  const [commentText, setCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [commentNotice, setCommentNotice] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Inline comment edit / delete / admin moderation state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [adminReplyDraft, setAdminReplyDraft] = useState<string>('');
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);
  const [isTogglingLock, setIsTogglingLock] = useState<boolean>(false);

  const [fontSizeLevel, setFontSizeLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('newsapp_font_size');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setScrollProgress(progress);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Record view count automatically when opening article
  useEffect(() => {
    recordView(article.id, article.title);
  }, [article.id, article.title, recordView]);

  const loadAllComments = useCallback(async () => {
    setIsLoadingComments(true);
    try {
      const config = getStoredBloggerConfig();
      const [appRes, bloggerRes] = await Promise.allSettled([
        fetchArticleAppComments(article.id),
        fetchBloggerComments(config, article.id),
      ]);

      if (appRes.status === 'fulfilled') {
        setAppComments(appRes.value.comments);
        syncSingleStats(appRes.value.stats);
        setRequireApproval(Boolean(appRes.value.moderationSettings?.requireApproval));
      }

      if (bloggerRes.status === 'fulfilled') {
        setBloggerComments(bloggerRes.value);
      } else {
        setBloggerComments([]);
      }
    } catch {
      // Offline fallback keeps current comments
    } finally {
      setIsLoadingComments(false);
    }
  }, [article.id, isAdmin, syncSingleStats]);

  useEffect(() => {
    loadAllComments();
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [loadAllComments]);

  const showTempNotice = (msg: string) => {
    setCommentNotice(msg);
    setCommentError(null);
    window.setTimeout(() => {
      setCommentNotice((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    setCommentNotice(null);

    if (!canEngage) {
      setCommentError('Silakan daftar atau masuk akun pembaca terlebih dahulu untuk berkomentar.');
      return;
    }

    const effectiveName = readerAccount
      ? readerAccount.name
      : isAdmin && !authorName.trim()
      ? 'Admin Redaksi'
      : authorName.trim();

    if (effectiveName.length < 2) {
      setCommentError('Nama tampilan minimal terdiri dari 2 karakter.');
      return;
    }
    if (commentText.trim().length < 2) {
      setCommentError('Silakan tulis komentar terlebih dahulu.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      if (!isAdmin && readerAccount) {
        saveReaderName(readerAccount.name);
      }
      const res = await postArticleAppComment({
        articleId: article.id,
        articleTitle: article.title,
        authorName: effectiveName,
        content: commentText.trim(),
      });
      syncSingleStats(res.stats);
      setCommentText('');
      await loadAllComments();

      if (res.comment.status === 'pending') {
        showTempNotice(
          'Komentar berhasil dikirim dan sedang menunggu persetujuan Admin sebelum ditampilkan.'
        );
      } else {
        showTempNotice('Komentar Anda berhasil diterbitkan.');
      }
    } catch (err: any) {
      setCommentError(err?.message || 'Gagal mengirim komentar.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    if (editDraft.trim().length < 2) {
      setCommentError('Isi komentar minimal terdiri dari 2 karakter.');
      return;
    }
    setBusyCommentId(commentId);
    setCommentError(null);
    try {
      await editOwnAppComment(commentId, editDraft.trim());
      setEditingCommentId(null);
      setEditDraft('');
      await loadAllComments();
      showTempNotice('Komentar berhasil diperbarui.');
    } catch (err: any) {
      setCommentError(err?.message || 'Gagal memperbarui komentar.');
    } finally {
      setBusyCommentId(null);
    }
  };

  const handleDeleteCommentItem = async (commentId: string, useAdminEndpoint: boolean) => {
    setBusyCommentId(commentId);
    setCommentError(null);
    try {
      const res = useAdminEndpoint
        ? await adminDeleteCommentApi(commentId)
        : await deleteAppComment(commentId);
      syncSingleStats(res.stats);
      setConfirmDeleteId(null);
      await loadAllComments();
      showTempNotice('Komentar berhasil dihapus.');
    } catch (err: any) {
      setCommentError(err?.message || 'Gagal menghapus komentar.');
    } finally {
      setBusyCommentId(null);
    }
  };

  const handleAdminModerateInline = async (
    commentId: string,
    patch: { status?: CommentStatus; pinned?: boolean; adminReply?: string | null },
    noticeMsg: string
  ) => {
    setBusyCommentId(commentId);
    setCommentError(null);
    try {
      const res = await adminModerateCommentApi(commentId, patch);
      syncSingleStats(res.stats);
      setReplyingCommentId(null);
      setAdminReplyDraft('');
      await loadAllComments();
      showTempNotice(noticeMsg);
    } catch (err: any) {
      setCommentError(err?.message || 'Gagal memproses tindakan Admin.');
    } finally {
      setBusyCommentId(null);
    }
  };

  const handleAdminToggleLock = async () => {
    setIsTogglingLock(true);
    setCommentError(null);
    try {
      const nextLocked = !stats.commentsLocked;
      const res = await adminManageArticleApi(article.id, {
        title: article.title,
        commentsLocked: nextLocked,
      });
      syncSingleStats(res.stats);
      showTempNotice(
        nextLocked
          ? 'Kolom komentar berita ini berhasil dikunci.'
          : 'Kolom komentar berita ini dibuka kembali.'
      );
    } catch (err: any) {
      setCommentError(err?.message || 'Gagal mengubah status kunci komentar.');
    } finally {
      setIsTogglingLock(false);
    }
  };

  const handleCycleFontSize = () => {
    const next = (fontSizeLevel + 1) % 3;
    setFontSizeLevel(next);
    try {
      localStorage.setItem('newsapp_font_size', String(next));
    } catch {}
  };

  const getBodyFontSizeClass = () => {
    if (fontSizeLevel === 1) return 'text-base sm:text-lg leading-relaxed';
    if (fontSizeLevel === 2) return 'text-lg sm:text-xl leading-relaxed';
    return 'text-sm sm:text-base leading-relaxed';
  };

  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToRead = `${article.title}. ${article.plainTextFull || article.plainTextExcerpt || ''}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = 'id-ID';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const scrollToComments = () => {
    commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Related articles ranked by shared labels & thematic categories
  const relatedArticles = useMemo(() => {
    const others = allArticles.filter((a) => a.id !== article.id);
    const scored = others.map((candidate) => {
      let score = 0;
      candidate.labels.forEach((l) => {
        if (article.labels.some((al) => al.toLowerCase() === l.toLowerCase())) {
          score += 3;
        }
      });
      (candidate.thematicCategories || []).forEach((th) => {
        if ((article.thematicCategories || []).includes(th)) {
          score += 2;
        }
      });
      return { candidate, score };
    });
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.candidate.published).getTime() - new Date(a.candidate.published).getTime()
    );
    return scored.slice(0, 3).map((s) => s.candidate);
  }, [allArticles, article]);

  const sanitizedContent = useMemo(
    () => sanitizeHtmlContent(article.content, !isReaderMode ? article.thumbnail : null),
    [article.content, article.thumbnail, isReaderMode]
  );

  const totalDisplayedComments = stats.commentCount + bloggerComments.length;

  const formatCommentDate = (iso: string) => {
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

  return (
    <div
      className={`min-h-screen text-slate-900 dark:text-slate-100 pb-24 relative transition-colors ${
        isReaderMode ? 'bg-[#fbfaf7] dark:bg-[#10131a]' : 'bg-slate-50 dark:bg-slate-950'
      }`}
    >
      {/* Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 bg-blue-600 z-50 transition-transform duration-75 origin-left w-full"
        style={{ transform: `scaleX(${scrollProgress / 100})` }}
      />

      {/* Sticky Top Reader Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="min-w-[40px] min-h-[40px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center gap-1 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs font-semibold"
            aria-label="Kembali"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
            {isReaderMode ? 'Mode Fokus Baca' : article.primaryCategory}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsReaderMode(!isReaderMode)}
              title={isReaderMode ? 'Keluar Mode Fokus Baca' : 'Mode Fokus Baca Bebas Gangguan'}
              className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isReaderMode
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleCycleFontSize}
              title={`Ukuran Teks: ${
                fontSizeLevel === 0 ? 'Normal' : fontSizeLevel === 1 ? 'Besar' : 'Sangat Besar'
              }`}
              className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Type className="w-4 h-4" />
            </button>

            {typeof window !== 'undefined' && 'speechSynthesis' in window && (
              <button
                type="button"
                onClick={handleToggleSpeak}
                title={isSpeaking ? 'Hentikan Pembacaan Suara' : 'Dengarkan Artikel'}
                className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  isSpeaking
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Article Body */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        <article className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-8 space-y-6">
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {article.primaryCategory}
              </span>
              <span aria-hidden="true">·</span>
              <span>{article.publishedFormatted}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{article.readingTime} mnt baca</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{stats.views.toLocaleString('id-ID')} dilihat</span>
              </span>
            </div>

            {!isReaderMode && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleBookmark(article.id, article)}
                  className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isBookmarked
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-white' : ''}`} />
                  <span>{isBookmarked ? 'Tersimpan' : 'Simpan'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShareOpen(true)}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Bagikan</span>
                </button>
              </div>
            )}
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100 leading-tight tracking-tight [text-wrap:balance]">
            {article.title}
          </h1>

          {/* Author Byline */}
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Penulis: <strong className="text-slate-800 dark:text-slate-200">{article.author.displayName}</strong>
            </span>
            {article.labels.length > 1 && (
              <span className="truncate max-w-[260px]">
                Topik: {article.labels.join(', ')}
              </span>
            )}
          </div>

          {/* Cover Image (Hidden in Distraction-Free Reader Mode) */}
          {!isReaderMode && article.thumbnail && (
            <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
              <ImageWithFallback
                src={article.thumbnail}
                alt={article.title}
                aspectRatioClass="aspect-[16/9] sm:aspect-[2/1]"
                category={article.primaryCategory}
              />
            </div>
          )}

          {/* Sanitized Blogger Article HTML Body */}
          <div
            className={`article-body ${getBodyFontSizeClass()}`}
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {/* Interactive Reader Engagement Bar (Like, Views, Comments, Original Link) */}
          {!isReaderMode && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleLike(article.id, article.title)}
                  className={`min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer tabular-nums ${
                    stats.likedByMe
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${stats.likedByMe ? 'fill-white' : ''}`} />
                  <span>
                    {stats.likedByMe ? 'Disukai' : 'Suka'} ({stats.likes.toLocaleString('id-ID')})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={scrollToComments}
                  className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer tabular-nums"
                >
                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Komentar ({totalDisplayedComments.toLocaleString('id-ID')})</span>
                </button>

                <div className="min-h-[42px] inline-flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <Eye className="w-4 h-4" />
                  <span>
                    Dilihat <strong className="text-slate-800 dark:text-slate-200">{stats.views.toLocaleString('id-ID')}</strong> kali
                  </span>
                </div>
              </div>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start sm:self-auto min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
              >
                <span>Buka Tautan Asli</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </article>

        {/* Interactive Reader Comments & Admin Moderation Section */}
        {!isReaderMode && (
          <section
            ref={commentsSectionRef}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Komentar Pembaca ({totalDisplayedComments.toLocaleString('id-ID')})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bagikan tanggapan Anda secara santun. Seluruh diskusi dikelola oleh Admin Redaksi.
                </p>
              </div>

              {/* Inline Admin Quick Bar when logged in as Admin */}
              {isAdmin && (
                <div className="flex items-center flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isTogglingLock}
                    onClick={handleAdminToggleLock}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    {stats.commentsLocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Buka Komentar</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Kunci Komentar</span>
                      </>
                    )}
                  </button>

                  {onOpenAdminPanel && (
                    <button
                      type="button"
                      onClick={onOpenAdminPanel}
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Panel Admin</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Feedback Messages */}
            {commentNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{commentNotice}</span>
              </div>
            )}

            {commentError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{commentError}</span>
              </div>
            )}

            {/* Comment Composer, Registration Gate, or Locked Notice */}
            {stats.commentsLocked && !isAdmin ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Kolom komentar pada berita ini sedang dikunci oleh Admin.</span>
              </div>
            ) : !canEngage ? (
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  Silakan daftar terlebih dahulu untuk menyukai dan berkomentar.
                </p>
                {onOpenReaderAuth && (
                  <button
                    type="button"
                    onClick={onOpenReaderAuth}
                    className="min-h-[40px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Daftar
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitComment} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Masuk sebagai:{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {readerAccount ? readerAccount.name : authorName.trim() || 'Admin Redaksi'}
                    </strong>
                    {readerAccount ? ` (${readerAccount.email})` : ' (Pengelola Admin)'}
                  </span>
                  {requireApproval && !isAdmin && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">
                      Moderasi aktif: komentar ditinjau Admin sebelum tampil ke publik.
                    </span>
                  )}
                </div>

                {!readerAccount && isAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Pengelola
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Admin Redaksi"
                      className="w-full sm:max-w-xs px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tulis Komentar
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1500}
                    required
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Tulis tanggapan atau pendapat Anda mengenai berita ini..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 font-mono-tabular">
                    {commentText.length}/1500 karakter
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingComment}
                    className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingComment ? 'Mengirim...' : 'Kirim Komentar'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Comments List */}
            {isLoadingComments && appComments.length === 0 && bloggerComments.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Memuat komentar pembaca...
              </div>
            ) : appComments.length === 0 && bloggerComments.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Belum ada komentar pada berita ini. Jadilah pembaca pertama yang memberikan tanggapan.
              </p>
            ) : (
              <div className="space-y-4 pt-2">
                {appComments.length > 0 && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {appComments.map((c) => {
                      const isBusy = busyCommentId === c.id;
                      const isEditing = editingCommentId === c.id;
                      const isReplying = replyingCommentId === c.id;

                      return (
                        <div key={c.id} className="py-4 first:pt-1 space-y-2.5">
                          {/* Clean Unboxed Comment Header */}
                          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {c.authorName}
                              </span>
                              {c.isAdminAuthor && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Admin</span>
                                  </span>
                                </>
                              )}
                              <span aria-hidden="true">·</span>
                              <span>{formatCommentDate(c.createdAt)}</span>
                              {c.pinned && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-1">
                                    <Pin className="w-3 h-3" />
                                    <span>Disematkan</span>
                                  </span>
                                </>
                              )}
                              {c.status === 'pending' && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    Menunggu Tinjauan Admin
                                  </span>
                                </>
                              )}
                              {c.status === 'hidden' && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                    Disembunyikan Admin
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Edit Form or Comment Body */}
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                rows={3}
                                maxLength={1500}
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleSaveEdit(c.id)}
                                  className="min-h-[32px] px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                                >
                                  Simpan Perubahan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditDraft('');
                                  }}
                                  className="min-h-[32px] px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                              {c.content}
                            </p>
                          )}

                          {/* Admin Official Reply */}
                          {c.adminReply && (
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Balasan Pengelola (Admin)</span>
                                </span>
                                <span>{formatCommentDate(c.adminReply.repliedAt)}</span>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">
                                {c.adminReply.content}
                              </p>
                            </div>
                          )}

                          {/* Inline Admin Reply Composer */}
                          {isAdmin && isReplying && (
                            <div className="space-y-2 pt-1">
                              <textarea
                                rows={2}
                                maxLength={1500}
                                value={adminReplyDraft}
                                onChange={(e) => setAdminReplyDraft(e.target.value)}
                                placeholder="Tulis balasan resmi Admin..."
                                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleAdminModerateInline(
                                      c.id,
                                      { adminReply: adminReplyDraft.trim() || null },
                                      adminReplyDraft.trim()
                                        ? 'Balasan Admin disimpan.'
                                        : 'Balasan Admin dihapus.'
                                    )
                                  }
                                  className="min-h-[32px] px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                                >
                                  Simpan Balasan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingCommentId(null);
                                    setAdminReplyDraft('');
                                  }}
                                  className="min-h-[32px] px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Reader Self-Controls & Admin Inline Moderation Controls */}
                          {(c.isMine || isAdmin) && !isEditing && (
                            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                              {c.isMine && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    setEditingCommentId(c.id);
                                    setEditDraft(c.content);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Ubah</span>
                                </button>
                              )}

                              {isAdmin && c.status !== 'published' && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleAdminModerateInline(
                                      c.id,
                                      { status: 'published' },
                                      'Komentar ditampilkan ke publik.'
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Tampilkan</span>
                                </button>
                              )}

                              {isAdmin && c.status !== 'hidden' && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleAdminModerateInline(
                                      c.id,
                                      { status: 'hidden' },
                                      'Komentar disembunyikan.'
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                                >
                                  <EyeOff className="w-3 h-3" />
                                  <span>Sembunyikan</span>
                                </button>
                              )}

                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleAdminModerateInline(
                                        c.id,
                                        { pinned: !c.pinned },
                                        !c.pinned ? 'Komentar disematkan.' : 'Sematan dilepas.'
                                      )
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                                  >
                                    <Pin className="w-3 h-3" />
                                    <span>{c.pinned ? 'Lepas Sematan' : 'Sematkan'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => {
                                      setReplyingCommentId(c.id);
                                      setAdminReplyDraft(c.adminReply?.content || '');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                                  >
                                    <Reply className="w-3 h-3" />
                                    <span>{c.adminReply ? 'Ubah Balasan' : 'Balas (Admin)'}</span>
                                  </button>
                                </>
                              )}

                              {confirmDeleteId === c.id ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleDeleteCommentItem(c.id, isAdmin)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                                  >
                                    Ya, Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setConfirmDeleteId(c.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Hapus</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Original Blogger API v3.0 Comments (if any exist on Blogger) */}
                {bloggerComments.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold">
                        Arsip Komentar Situs Blogger ({bloggerComments.length})
                      </span>
                      <a
                        href={`${article.url}#comments`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Lihat di Blogger
                      </a>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {bloggerComments.map((comment) => (
                        <div key={comment.id} className="py-3 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {comment.author.displayName}
                            </span>
                            <span className="text-slate-400">
                              {new Date(comment.published).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div
                            className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: comment.content }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Related Recommendations */}
        {!isReaderMode && relatedArticles.length > 0 && (
          <section className="space-y-4 pt-2">
            <h2 className="text-xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
              Artikel Terkait Untukmu
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedArticles.map((rel) => (
                <HottestNewsCard
                  key={rel.id}
                  article={rel}
                  onSelect={(item) => onSelectArticle(item)}
                  isBookmarked={bookmarkIds.includes(rel.id)}
                  onToggleBookmark={onToggleBookmark}
                  onOpenShare={() => setIsShareOpen(true)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <ShareSheet
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        article={article}
        isBookmarked={isBookmarked}
        onToggleBookmark={() => onToggleBookmark(article.id, article)}
      />
    </div>
  );
};
