/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdminSessionResponse,
  ArticleEngagementStats,
  ModerationSettings,
  ReaderProfile,
} from '../types/engagement';
import {
  fetchAdminSession,
  fetchEngagementSummary,
  fetchReaderSession,
  loginAdminApi,
  loginReaderApi,
  recordArticleViewApi,
  registerReaderApi,
  setStoredAdminToken,
  setStoredReaderToken,
  setupAdminPasswordApi,
  toggleArticleLikeApi,
} from '../services/engagementApi';

interface EngagementContextValue {
  statsByArticle: Record<string, ArticleEngagementStats>;
  moderationSettings: ModerationSettings;
  getStats: (articleId: string) => ArticleEngagementStats;
  syncSingleStats: (stats: ArticleEngagementStats) => void;
  recordView: (articleId: string, title: string) => Promise<void>;
  toggleLike: (articleId: string, title: string) => Promise<void>;
  refreshSummary: () => Promise<void>;
  readerAccount: ReaderProfile | null;
  isRegisteredReader: boolean;
  isCheckingReader: boolean;
  canEngage: boolean;
  registerReader: (name: string, email: string, password: string) => Promise<void>;
  loginReader: (email: string, password: string) => Promise<void>;
  logoutReader: () => void;
  authRequiredNotice: string | null;
  triggerAuthRequiredNotice: (msg?: string) => void;
  dismissAuthRequiredNotice: () => void;
  isAdmin: boolean;
  adminEmail: string;
  allowedAdminEmails: string[];
  loggedInAdminEmail: string | null;
  setupRequired: boolean;
  isCheckingAdmin: boolean;
  loginAdmin: (email: string, password: string) => Promise<void>;
  setupAdmin: (email: string, password: string) => Promise<void>;
  logoutAdmin: () => void;
  refreshAdminSession: () => Promise<void>;
}

const DEFAULT_EMPTY_STATS = (articleId: string): ArticleEngagementStats => ({
  articleId,
  title: '',
  views: 0,
  uniqueReaders: 0,
  likes: 0,
  commentCount: 0,
  likedByMe: false,
  commentsLocked: false,
  lastViewedAt: null,
});

const EngagementContext = createContext<EngagementContextValue | null>(null);

export const EngagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [statsByArticle, setStatsByArticle] = useState<Record<string, ArticleEngagementStats>>({});
  const [moderationSettings, setModerationSettings] = useState<ModerationSettings>({
    requireApproval: false,
  });

  const [readerAccount, setReaderAccount] = useState<ReaderProfile | null>(null);
  const [isCheckingReader, setIsCheckingReader] = useState<boolean>(true);
  const [authRequiredNotice, setAuthRequiredNotice] = useState<string | null>(null);

  const [adminSession, setAdminSession] = useState<AdminSessionResponse>({
    authenticated: false,
    email: null,
    adminEmail: 'nendenrestiani05@gmail.com',
    allowedAdminEmails: ['nendenrestiani05@gmail.com'],
    setupRequired: false,
    moderationSettings: { requireApproval: false },
  });
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(true);

  const refreshSummary = useCallback(async () => {
    try {
      const res = await fetchEngagementSummary();
      setStatsByArticle(res.stats || {});
      if (res.moderationSettings) {
        setModerationSettings(res.moderationSettings);
      }
    } catch {
      // Keep last known stats if offline
    }
  }, []);

  const refreshReaderSession = useCallback(async () => {
    setIsCheckingReader(true);
    try {
      const session = await fetchReaderSession();
      setReaderAccount(session.authenticated ? session.reader : null);
    } catch {
      // Offline or unreachable
    } finally {
      setIsCheckingReader(false);
    }
  }, []);

  const refreshAdminSession = useCallback(async () => {
    setIsCheckingAdmin(true);
    try {
      const session = await fetchAdminSession();
      setAdminSession(session);
      if (session.moderationSettings) {
        setModerationSettings(session.moderationSettings);
      }
    } catch {
      // Offline or unreachable
    } finally {
      setIsCheckingAdmin(false);
    }
  }, []);

  useEffect(() => {
    refreshSummary();
    refreshReaderSession();
    refreshAdminSession();
  }, [refreshSummary, refreshReaderSession, refreshAdminSession]);

  const canEngage = Boolean(readerAccount) || adminSession.authenticated;

  const triggerAuthRequiredNotice = useCallback((msg?: string) => {
    setAuthRequiredNotice(
      msg || 'Silakan daftar terlebih dahulu untuk menyukai dan berkomentar.'
    );
  }, []);

  const dismissAuthRequiredNotice = useCallback(() => {
    setAuthRequiredNotice(null);
  }, []);

  const getStats = useCallback(
    (articleId: string): ArticleEngagementStats => {
      return statsByArticle[articleId] || DEFAULT_EMPTY_STATS(articleId);
    },
    [statsByArticle]
  );

  const syncSingleStats = useCallback((stats: ArticleEngagementStats) => {
    setStatsByArticle((prev) => ({
      ...prev,
      [stats.articleId]: stats,
    }));
  }, []);

  const recordView = useCallback(async (articleId: string, title: string) => {
    try {
      const updated = await recordArticleViewApi(articleId, title);
      setStatsByArticle((prev) => ({
        ...prev,
        [articleId]: updated,
      }));
    } catch {
      // Ignore view tracking failure when offline
    }
  }, []);

  const toggleLike = useCallback(
    async (articleId: string, title: string) => {
      if (!canEngage) {
        triggerAuthRequiredNotice('Silakan daftar terlebih dahulu untuk menyukai berita ini.');
        return;
      }

      const current = statsByArticle[articleId] || DEFAULT_EMPTY_STATS(articleId);
      const optimisticLiked = !current.likedByMe;
      const optimisticLikes = Math.max(0, current.likes + (optimisticLiked ? 1 : -1));

      // Optimistic UI update
      setStatsByArticle((prev) => ({
        ...prev,
        [articleId]: {
          ...current,
          title: title || current.title,
          likedByMe: optimisticLiked,
          likes: optimisticLikes,
        },
      }));

      try {
        const confirmed = await toggleArticleLikeApi(articleId, title);
        setStatsByArticle((prev) => ({
          ...prev,
          [articleId]: confirmed,
        }));
      } catch (err: any) {
        // Revert optimistic update on failure
        setStatsByArticle((prev) => ({
          ...prev,
          [articleId]: current,
        }));
        if (err?.code === 'READER_AUTH_REQUIRED' || err?.status === 401) {
          triggerAuthRequiredNotice(err?.message);
        }
      }
    },
    [statsByArticle, canEngage, triggerAuthRequiredNotice]
  );

  const registerReader = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await registerReaderApi({ name, email, password });
      setReaderAccount(res.reader);
      setAuthRequiredNotice(null);
      await refreshSummary();
    },
    [refreshSummary]
  );

  const loginReader = useCallback(
    async (email: string, password: string) => {
      const res = await loginReaderApi({ email, password });
      setReaderAccount(res.reader);
      setAuthRequiredNotice(null);
      await refreshSummary();
    },
    [refreshSummary]
  );

  const logoutReader = useCallback(() => {
    setStoredReaderToken(null);
    setReaderAccount(null);
    refreshSummary();
  }, [refreshSummary]);

  const loginAdmin = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await loginAdminApi(email, password);
        setAdminSession((prev) => ({
          ...prev,
          authenticated: true,
          email: res.email,
          setupRequired: false,
          moderationSettings: res.moderationSettings,
        }));
        setModerationSettings(res.moderationSettings);
        setAuthRequiredNotice(null);
        await refreshSummary();
      } catch (err: any) {
        if (typeof err?.setupRequired === 'boolean') {
          setAdminSession((prev) => ({
            ...prev,
            setupRequired: err.setupRequired,
          }));
        } else if (err?.code === 'SETUP_REQUIRED') {
          setAdminSession((prev) => ({
            ...prev,
            setupRequired: true,
          }));
        }
        throw err;
      }
    },
    [refreshSummary]
  );

  const setupAdmin = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await setupAdminPasswordApi(email, password);
        setAdminSession((prev) => ({
          ...prev,
          authenticated: true,
          email: res.email,
          setupRequired: false,
          moderationSettings: res.moderationSettings,
        }));
        setModerationSettings(res.moderationSettings);
        setAuthRequiredNotice(null);
        await refreshSummary();
      } catch (err: any) {
        if (typeof err?.setupRequired === 'boolean') {
          setAdminSession((prev) => ({
            ...prev,
            setupRequired: err.setupRequired,
          }));
        } else if (err?.code === 'ALREADY_CONFIGURED') {
          setAdminSession((prev) => ({
            ...prev,
            setupRequired: false,
          }));
        }
        throw err;
      }
    },
    [refreshSummary]
  );

  const logoutAdmin = useCallback(() => {
    setStoredAdminToken(null);
    setAdminSession((prev) => ({
      ...prev,
      authenticated: false,
      email: null,
    }));
    refreshSummary();
  }, [refreshSummary]);

  return (
    <EngagementContext.Provider
      value={{
        statsByArticle,
        moderationSettings,
        getStats,
        syncSingleStats,
        recordView,
        toggleLike,
        refreshSummary,
        readerAccount,
        isRegisteredReader: Boolean(readerAccount),
        isCheckingReader,
        canEngage,
        registerReader,
        loginReader,
        logoutReader,
        authRequiredNotice,
        triggerAuthRequiredNotice,
        dismissAuthRequiredNotice,
        isAdmin: adminSession.authenticated,
        adminEmail: adminSession.adminEmail,
        allowedAdminEmails:
          adminSession.allowedAdminEmails && adminSession.allowedAdminEmails.length > 0
            ? adminSession.allowedAdminEmails
            : [adminSession.adminEmail],
        loggedInAdminEmail: adminSession.email,
        setupRequired: adminSession.setupRequired,
        isCheckingAdmin,
        loginAdmin,
        setupAdmin,
        logoutAdmin,
        refreshAdminSession,
      }}
    >
      {children}
    </EngagementContext.Provider>
  );
};

export function useEngagement(): EngagementContextValue {
  const ctx = useContext(EngagementContext);
  if (!ctx) {
    throw new Error('useEngagement harus digunakan di dalam EngagementProvider');
  }
  return ctx;
}
