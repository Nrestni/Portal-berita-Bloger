/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RotateCw, ArrowDown, WifiOff, UserPlus, X } from 'lucide-react';
import { Header } from './components/Header';
import {
  TopChannelsBar,
  DateFilterOption,
  ContentTypeFilter,
} from './components/TopChannelsBar';
import { HottestNewsCard } from './components/HottestNewsCard';
import { ArticleDetail } from './components/ArticleDetail';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { ErrorState } from './components/ErrorState';
import { EmptyState } from './components/EmptyState';
import { BottomNav, NavTab } from './components/BottomNav';
import { OnboardingView } from './components/OnboardingView';
import { NotificationSheet } from './components/NotificationSheet';
import { HistoryPage } from './components/HistoryPage';
import { SavedPage } from './components/SavedPage';
import { ShareSheet } from './components/ShareSheet';
import { DashboardView } from './components/DashboardView';
import { MarketsPage } from './components/MarketsPage';
import { EconomyPage } from './components/EconomyPage';
import { TechNewsPage } from './components/TechNewsPage';
import { AccountPage, AccountSection, AuthRole } from './components/AccountPage';
import { useEngagement } from './contexts/EngagementContext';
import {
  fetchBloggerPosts,
  fetchBlogInfo,
  getStoredBloggerConfig,
} from './services/bloggerApi';
import {
  getSavedBookmarkIds,
  getSavedArticlesMap,
  toggleBookmarkId,
  clearAllBookmarks,
} from './services/bookmarkStorage';
import {
  getReadingHistory,
  addToReadingHistory,
  removeFromReadingHistory,
  clearReadingHistory,
} from './services/historyStorage';
import {
  getPersonalizedRecommendations,
  getPreferredTopics,
  savePreferredTopics,
} from './services/recommendationEngine';
import {
  fetchStockQuotes,
  fetchEconomyIndicators,
  fetchTechTrends,
  getStockWatchlist,
  toggleStockWatchlist,
} from './services/marketApi';
import {
  BlogInfo,
  BloggerConfig,
  DynamicCategory,
  NewsArticle,
  ThematicCategory,
} from './types/blogger';
import {
  EconomyIndicatorsResponse,
  ExternalTechArticle,
  StockQuotesResponse,
} from './types/market';

export default function App() {
  const {
    refreshSummary,
    authRequiredNotice,
    dismissAuthRequiredNotice,
  } = useEngagement();
  const [config, setConfig] = useState<BloggerConfig>(() => getStoredBloggerConfig());
  const [accountSection, setAccountSection] = useState<AccountSection>('auth');
  const [authRole, setAuthRole] = useState<AuthRole>('admin');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [shareArticle, setShareArticle] = useState<NewsArticle | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    try {
      return localStorage.getItem('newsapp_intro_dismissed') !== 'true';
    } catch {
      return false;
    }
  });

  // Navigation & detail view state
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('dashboard');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  // Blogger news state
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [blogInfo, setBlogInfo] = useState<BlogInfo | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [lastNewsSyncAt, setLastNewsSyncAt] = useState<string | undefined>(undefined);
  const [isFromOfflineCache, setIsFromOfflineCache] = useState<boolean>(false);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  // Search & Filter state on Feed
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');

  // Stock Market, Economy, and Tech Trends state
  const [watchlist, setWatchlist] = useState<string[]>(() => getStockWatchlist());
  const [quotesData, setQuotesData] = useState<StockQuotesResponse | null>(null);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState<boolean>(true);
  const [quotesError, setQuotesError] = useState<string | null>(null);

  const [economyData, setEconomyData] = useState<EconomyIndicatorsResponse | null>(null);
  const [isLoadingEconomy, setIsLoadingEconomy] = useState<boolean>(true);
  const [economyError, setEconomyError] = useState<string | null>(null);

  const [externalTech, setExternalTech] = useState<ExternalTechArticle[]>([]);

  // Bookmarks, Reading History & Personal Recommendation Preferences
  const [bookmarkIds, setBookmarkIds] = useState<string[]>(() => getSavedBookmarkIds());
  const [historyArticles, setHistoryArticles] = useState<NewsArticle[]>(() => getReadingHistory());
  const [preferredTopics, setPreferredTopics] = useState<ThematicCategory[]>(() =>
    getPreferredTopics()
  );

  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('newsapp_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('newsapp_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Load Blogger posts via secure backend proxy
  const loadNews = useCallback(async (currentConfig: BloggerConfig, forceRefresh = false) => {
    setIsLoadingNews(true);
    setNewsError(null);

    try {
      const [postsResult, blogMeta] = await Promise.allSettled([
        fetchBloggerPosts(currentConfig, undefined, undefined, forceRefresh),
        fetchBlogInfo(currentConfig),
      ]);

      if (postsResult.status === 'fulfilled') {
        setArticles(postsResult.value.articles);
        setNextPageToken(postsResult.value.nextPageToken);
        setIsFromOfflineCache(Boolean(postsResult.value.fromCache));
        setLastNewsSyncAt(postsResult.value.cachedAt || new Date().toISOString());
      } else {
        throw postsResult.reason;
      }

      if (blogMeta.status === 'fulfilled') {
        setBlogInfo(blogMeta.value);
      }
    } catch (err: any) {
      console.error('Gagal memuat artikel Blogger:', err);
      setNewsError(err?.message || 'Gagal memuat artikel dari Blogger API v3.0.');
    } finally {
      setIsLoadingNews(false);
    }
  }, []);

  // Load Stock Quotes (IDX/IHSG/Global + Watchlist)
  const loadStocks = useCallback(async (customWatchlist: string[]) => {
    setIsLoadingQuotes(true);
    setQuotesError(null);
    try {
      const res = await fetchStockQuotes(customWatchlist);
      setQuotesData(res);
    } catch (err: any) {
      console.error('Gagal memuat data saham:', err);
      setQuotesError(
        err?.message || 'Layanan data pasar saham belum dapat dijangkau saat ini.'
      );
    } finally {
      setIsLoadingQuotes(false);
    }
  }, []);

  // Load Official Economy Indicators (FX + Macro)
  const loadEconomy = useCallback(async (forceRefresh = false) => {
    setIsLoadingEconomy(true);
    setEconomyError(null);
    try {
      const res = await fetchEconomyIndicators(forceRefresh);
      setEconomyData(res);
    } catch (err: any) {
      console.error('Gagal memuat indikator ekonomi:', err);
      setEconomyError(
        err?.message || 'Sumber indikator ekonomi resmi belum berhasil dimuat.'
      );
    } finally {
      setIsLoadingEconomy(false);
    }
  }, []);

  // Load Supplementary External Tech Community Links
  const loadTechLinks = useCallback(async () => {
    try {
      const res = await fetchTechTrends();
      if (res.available && Array.isArray(res.items)) {
        setExternalTech(res.items);
      }
    } catch {
      setExternalTech([]);
    }
  }, []);

  useEffect(() => {
    loadNews(config);
  }, [config, loadNews]);

  useEffect(() => {
    loadStocks(watchlist);
  }, [watchlist, loadStocks]);

  useEffect(() => {
    loadEconomy(false);
    loadTechLinks();
  }, [loadEconomy, loadTechLinks]);

  const handleRefreshAll = () => {
    loadNews(config, true);
    loadStocks(watchlist);
    loadEconomy(true);
    loadTechLinks();
    refreshSummary();
  };

  // Article selection & reading history persistence
  const handleSelectArticle = (article: NewsArticle) => {
    setSelectedArticle(article);
    addToReadingHistory(article);
    setHistoryArticles(getReadingHistory());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseArticleDetail = () => {
    setSelectedArticle(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Bookmarks persistence (with full article snapshot so reload never loses bookmarked items)
  const handleToggleBookmark = (articleId: string, articleSnapshot?: NewsArticle) => {
    const fallbackArticle =
      articleSnapshot ||
      articles.find((a) => a.id === articleId) ||
      historyArticles.find((a) => a.id === articleId) ||
      getSavedArticlesMap()[articleId];
    const res = toggleBookmarkId(articleId, fallbackArticle);
    setBookmarkIds(res.allIds);
  };

  const handleClearAllBookmarks = () => {
    clearAllBookmarks();
    setBookmarkIds([]);
  };

  // Reading history item & full clear
  const handleRemoveHistoryItem = (articleId: string) => {
    const updated = removeFromReadingHistory(articleId);
    setHistoryArticles(updated);
  };

  const handleClearHistory = () => {
    clearReadingHistory();
    setHistoryArticles([]);
  };

  // Watchlist toggle
  const handleToggleWatchlist = (symbol: string) => {
    const updated = toggleStockWatchlist(symbol);
    setWatchlist(updated);
  };

  // Preferred recommendation topics toggle
  const handleTogglePreferredTopic = (topic: ThematicCategory) => {
    setPreferredTopics((prev) => {
      const exists = prev.includes(topic);
      const updated = exists ? prev.filter((t) => t !== topic) : [...prev, topic];
      savePreferredTopics(updated);
      return updated;
    });
  };

  // Pagination load more Blogger articles
  const handleLoadMore = async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchBloggerPosts(config, nextPageToken);
      setArticles((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newArticles = result.articles.filter((a) => !existingIds.has(a.id));
        return [...prev, ...newArticles];
      });
      setNextPageToken(result.nextPageToken);
    } catch (err) {
      console.error('Gagal memuat halaman berita berikutnya:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Save Blogger ID configuration
  const handleSaveConfig = (newConfig: BloggerConfig) => {
    setConfig(newConfig);
    setArticles([]);
    setNextPageToken(undefined);
    setActiveCategory('all');
    setSearchQuery('');
    setSelectedArticle(null);
    loadNews(newConfig, true);
  };

  // Dynamic categories mapped from real Blogger labels
  const dynamicCategories: DynamicCategory[] = useMemo(() => {
    const labelCounts = new Map<string, { originalName: string; count: number }>();

    articles.forEach((article) => {
      article.labels.forEach((label) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        const normalizedKey = trimmed.toLowerCase();

        if (labelCounts.has(normalizedKey)) {
          labelCounts.get(normalizedKey)!.count += 1;
        } else {
          labelCounts.set(normalizedKey, {
            originalName: trimmed,
            count: 1,
          });
        }
      });
    });

    return Array.from(labelCounts.values())
      .map((item) => ({ name: item.originalName, count: item.count }))
      .sort((a, b) => b.count - a.count);
  }, [articles]);

  // Personalized recommendations ("Rekomendasi Untukmu")
  const recommendations = useMemo(() => {
    return getPersonalizedRecommendations(
      articles,
      historyArticles,
      bookmarkIds,
      preferredTopics,
      4
    );
  }, [articles, historyArticles, bookmarkIds, preferredTopics]);

  // Full search & multi-criteria filter on Blogger articles
  const filteredArticles = useMemo(() => {
    let result = articles;

    // 1. Category or Thematic Category filter
    if (activeCategory !== 'all') {
      if (activeCategory.startsWith('tema:')) {
        const tema = activeCategory.replace('tema:', '') as ThematicCategory;
        result = result.filter(
          (art) =>
            (art.thematicCategories || []).includes(tema) ||
            art.labels.some((l) => l.toLowerCase().includes(tema.toLowerCase()))
        );
      } else {
        const lowerCategory = activeCategory.toLowerCase();
        result = result.filter((art) =>
          art.labels.some((l) => l.trim().toLowerCase() === lowerCategory)
        );
      }
    }

    // 2. Date range filter
    if (dateFilter !== 'all') {
      const now = Date.now();
      const currentYear = new Date().getFullYear();
      result = result.filter((art) => {
        const pubTime = new Date(art.published).getTime();
        if (Number.isNaN(pubTime)) return true;
        if (dateFilter === '7d') {
          return now - pubTime <= 7 * 24 * 60 * 60 * 1000;
        }
        if (dateFilter === '30d') {
          return now - pubTime <= 30 * 24 * 60 * 60 * 1000;
        }
        if (dateFilter === 'year') {
          return new Date(pubTime).getFullYear() === currentYear;
        }
        return true;
      });
    }

    // 3. Content type filter
    if (contentTypeFilter !== 'all') {
      result = result.filter((art) => {
        if (contentTypeFilter === 'short') return art.readingTime <= 3;
        if (contentTypeFilter === 'deep') return art.readingTime > 3;
        if (contentTypeFilter === 'illustrated') return Boolean(art.thumbnail);
        return true;
      });
    }

    // 4. Search across title, full article body text, and Blogger labels
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (art) =>
          art.title.toLowerCase().includes(q) ||
          (art.plainTextFull || art.plainTextExcerpt).toLowerCase().includes(q) ||
          art.labels.some((l) => l.toLowerCase().includes(q)) ||
          (art.thematicCategories || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    return [...result].sort(
      (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
    );
  }, [articles, activeCategory, dateFilter, contentTypeFilter, searchQuery]);

  const handleResetFilters = () => {
    setActiveCategory('all');
    setSearchQuery('');
    setDateFilter('all');
    setContentTypeFilter('all');
  };

  const handleDismissIntro = () => {
    try {
      localStorage.setItem('newsapp_intro_dismissed', 'true');
    } catch {}
    setShowOnboarding(false);
  };

  const handleNavTabChange = (tab: NavTab) => {
    setSelectedArticle(null);
    if (tab === 'settings') {
      setAccountSection('settings');
      setActiveNavTab('account');
    } else if (tab === 'admin' || tab === 'account') {
      setAccountSection('auth');
      setAuthRole('admin');
      setActiveNavTab('account');
    } else {
      setActiveNavTab(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenReaderRegister = () => {
    setSelectedArticle(null);
    dismissAuthRequiredNotice();
    setAccountSection('auth');
    setAuthRole('reader');
    setActiveNavTab('account');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategoryInFeed = (categoryKey: string) => {
    setSelectedArticle(null);
    setActiveCategory(categoryKey);
    setActiveNavTab('feed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickSearch = () => {
    setSelectedArticle(null);
    if (activeNavTab !== 'feed' && activeNavTab !== 'stocks') {
      setActiveNavTab('feed');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Welcome Onboarding Screen (First Visit)
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex justify-center transition-colors">
        <div className="w-full max-w-lg min-h-screen bg-white dark:bg-slate-950 shadow-xs">
          <OnboardingView onDiscover={handleDismissIntro} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-blue-600 selection:text-white">
      {/* Offline / Local Cache Banner at Top */}
      {(isOffline || isFromOfflineCache) && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 z-50">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            {isOffline
              ? 'Perangkat kehilangan koneksi internet. Menampilkan berita tersimpan dari cache localStorage.'
              : 'Menampilkan berita dari cache localStorage perangkat.'}
          </span>
        </div>
      )}

      {/* Top Reader Registration Prompt Banner (shown at top when unregistered visitor tries to Like) */}
      {authRequiredNotice && (
        <div className="bg-blue-600 text-white px-4 py-2.5 text-xs font-medium z-50">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>{authRequiredNotice}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenReaderRegister}
                className="px-3.5 py-1 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 transition-colors cursor-pointer"
              >
                Daftar
              </button>
              <button
                type="button"
                onClick={dismissAuthRequiredNotice}
                aria-label="Tutup pemberitahuan"
                className="p-1 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Header (Hidden when reading full-screen article detail to preserve Reader Mode focus) */}
      {!selectedArticle && (
        <Header
          activeTab={activeNavTab}
          onTabChange={handleNavTabChange}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          onQuickSearch={handleQuickSearch}
          isDarkMode={theme === 'dark'}
          onToggleTheme={toggleTheme}
          savedCount={bookmarkIds.length}
          historyCount={historyArticles.length}
        />
      )}

      {/* Main Content Viewport */}
      {selectedArticle ? (
        <ArticleDetail
          article={selectedArticle}
          allArticles={articles}
          bookmarkIds={bookmarkIds}
          onBack={handleCloseArticleDetail}
          onSelectArticle={handleSelectArticle}
          isBookmarked={bookmarkIds.includes(selectedArticle.id)}
          onToggleBookmark={handleToggleBookmark}
          onOpenAdminPanel={() => handleNavTabChange('admin')}
          onOpenReaderAuth={handleOpenReaderRegister}
        />
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-12">
          {/* TAB 1: DASHBOARD RINGKASAN */}
          {activeNavTab === 'dashboard' && (
            <>
              {isLoadingNews && articles.length === 0 ? (
                <LoadingSkeleton />
              ) : newsError && articles.length === 0 ? (
                <ErrorState
                  error={newsError}
                  onRetry={() => loadNews(config, true)}
                  onOpenSettings={() => handleNavTabChange('settings')}
                />
              ) : (
                <DashboardView
                  articles={articles}
                  blogName={blogInfo?.name}
                  lastNewsSyncAt={lastNewsSyncAt}
                  isFromOfflineCache={isFromOfflineCache}
                  recommendations={recommendations}
                  preferredTopics={preferredTopics}
                  onTogglePreferredTopic={handleTogglePreferredTopic}
                  quotesData={quotesData}
                  economyData={economyData}
                  isLoadingNews={isLoadingNews}
                  isLoadingMarket={isLoadingQuotes || isLoadingEconomy}
                  onRefreshAll={handleRefreshAll}
                  onSelectArticle={handleSelectArticle}
                  onNavigateTab={handleNavTabChange}
                  onSelectCategoryInFeed={handleSelectCategoryInFeed}
                  bookmarkIds={bookmarkIds}
                  onToggleBookmark={handleToggleBookmark}
                  onOpenShare={(art) => setShareArticle(art)}
                />
              )}
            </>
          )}

          {/* TAB 2: BERITA, PENCARIAN & REKOMENDASI */}
          {activeNavTab === 'feed' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
                    Berita & Artikel Blogger
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Telusuri seluruh artikel berdasarkan judul, isi lengkap, kategori, rentang waktu, dan jenis bacaan.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadNews(config, true)}
                  disabled={isLoadingNews}
                  className="min-h-[40px] self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${isLoadingNews ? 'animate-spin text-blue-600' : ''}`}
                  />
                  <span>Perbarui Berita</span>
                </button>
              </div>

              {/* Search & Multi-Filter Bar */}
              <TopChannelsBar
                categories={dynamicCategories}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                contentTypeFilter={contentTypeFilter}
                onContentTypeFilterChange={setContentTypeFilter}
                onResetAll={handleResetFilters}
              />

              {isLoadingNews && articles.length === 0 && <LoadingSkeleton />}

              {!isLoadingNews && newsError && articles.length === 0 && (
                <ErrorState
                  error={newsError}
                  onRetry={() => loadNews(config, true)}
                  onOpenSettings={() => handleNavTabChange('settings')}
                />
              )}

              {!isLoadingNews && !newsError && (
                <>
                  {/* Personalized Recommendations Section when no search/filter is narrowing the view */}
                  {activeCategory === 'all' &&
                    !searchQuery.trim() &&
                    dateFilter === 'all' &&
                    contentTypeFilter === 'all' &&
                    recommendations.items.length > 0 && (
                      <section className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                        <div className="space-y-1">
                          <h2 className="text-lg sm:text-xl font-serif-editorial font-bold text-slate-900 dark:text-slate-100">
                            Rekomendasi Untukmu
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {recommendations.summaryNote}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                          {recommendations.items.map(({ article, reason }) => (
                            <HottestNewsCard
                              key={`feed-rec-${article.id}`}
                              article={article}
                              onSelect={handleSelectArticle}
                              isBookmarked={bookmarkIds.includes(article.id)}
                              onToggleBookmark={handleToggleBookmark}
                              onOpenShare={(art) => setShareArticle(art)}
                              recommendationReason={
                                recommendations.isPersonalized ? reason : undefined
                              }
                            />
                          ))}
                        </div>
                      </section>
                    )}

                  {/* Filtered Results */}
                  {filteredArticles.length === 0 ? (
                    <EmptyState
                      searchQuery={searchQuery}
                      category={activeCategory}
                      onReset={handleResetFilters}
                    />
                  ) : (
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                          {activeCategory === 'all' && !searchQuery.trim()
                            ? 'Semua Artikel Terbaru'
                            : 'Hasil Penyaringan Artikel'}
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                          {filteredArticles.length} artikel ditampilkan
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredArticles.map((article) => (
                          <HottestNewsCard
                            key={article.id}
                            article={article}
                            onSelect={handleSelectArticle}
                            isBookmarked={bookmarkIds.includes(article.id)}
                            onToggleBookmark={handleToggleBookmark}
                            onOpenShare={(art) => setShareArticle(art)}
                          />
                        ))}
                      </div>

                      {nextPageToken &&
                        !searchQuery.trim() &&
                        activeCategory === 'all' &&
                        dateFilter === 'all' &&
                        contentTypeFilter === 'all' && (
                          <div className="pt-4 text-center max-w-md mx-auto">
                            <button
                              type="button"
                              onClick={handleLoadMore}
                              disabled={isLoadingMore}
                              className="min-h-[44px] w-full py-3 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                            >
                              {isLoadingMore ? (
                                <>
                                  <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                  <span>Memuat Artikel Berikutnya...</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDown className="w-3.5 h-3.5" />
                                  <span>Muat Lebih Banyak Artikel</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                    </section>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: SAHAM & PASAR MODAL */}
          {activeNavTab === 'stocks' && (
            <MarketsPage
              quotesData={quotesData}
              isLoadingQuotes={isLoadingQuotes}
              quotesError={quotesError}
              onRefreshQuotes={() => loadStocks(watchlist)}
              watchlist={watchlist}
              onToggleWatchlist={handleToggleWatchlist}
              articles={articles}
              bookmarkIds={bookmarkIds}
              onSelectArticle={handleSelectArticle}
              onToggleBookmark={handleToggleBookmark}
              onOpenShare={(art) => setShareArticle(art)}
            />
          )}

          {/* TAB 4: INFORMASI EKONOMI */}
          {activeNavTab === 'economy' && (
            <EconomyPage
              economyData={economyData}
              isLoading={isLoadingEconomy}
              error={economyError}
              onRefresh={() => loadEconomy(true)}
              articles={articles}
              bookmarkIds={bookmarkIds}
              onSelectArticle={handleSelectArticle}
              onToggleBookmark={handleToggleBookmark}
              onOpenShare={(art) => setShareArticle(art)}
            />
          )}

          {/* TAB 5: BERITA TEKNOLOGI & TREN DIGITAL */}
          {activeNavTab === 'tech' && (
            <TechNewsPage
              articles={articles}
              externalTech={externalTech}
              bookmarkIds={bookmarkIds}
              onSelectArticle={handleSelectArticle}
              onToggleBookmark={handleToggleBookmark}
              onOpenShare={(art) => setShareArticle(art)}
            />
          )}

          {/* TAB 6: BOOKMARK / ARTIKEL TERSIMPAN */}
          {activeNavTab === 'saved' && (
            <SavedPage
              articles={articles}
              bookmarkIds={bookmarkIds}
              historyCount={historyArticles.length}
              onSelectArticle={handleSelectArticle}
              onRemoveBookmark={handleToggleBookmark}
              onClearAllBookmarks={handleClearAllBookmarks}
              onSwitchTab={handleNavTabChange}
            />
          )}

          {/* TAB 7: RIWAYAT BACAAN */}
          {activeNavTab === 'history' && (
            <HistoryPage
              historyArticles={historyArticles}
              savedCount={bookmarkIds.length}
              onSelectArticle={handleSelectArticle}
              onRemoveHistoryItem={handleRemoveHistoryItem}
              onClearHistory={handleClearHistory}
              onSwitchTab={handleNavTabChange}
            />
          )}

          {/* TAB 8: AKUN (MASUK/DAFTAR ADMIN & PEMBACA + PENGATURAN) */}
          {(activeNavTab === 'account' || activeNavTab === 'admin' || activeNavTab === 'settings') && (
            <AccountPage
              activeSection={accountSection}
              onSectionChange={setAccountSection}
              activeRole={authRole}
              onRoleChange={setAuthRole}
              config={config}
              onSaveConfig={handleSaveConfig}
              isDarkMode={theme === 'dark'}
              onToggleTheme={toggleTheme}
              preferredTopics={preferredTopics}
              onTogglePreferredTopic={handleTogglePreferredTopic}
              articles={articles}
              onSelectArticle={handleSelectArticle}
              onNavigateTab={handleNavTabChange}
            />
          )}
        </main>
      )}

      {/* Desktop Footer */}
      {!selectedArticle && (
        <footer className="hidden md:block border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <span className="font-serif-editorial font-bold text-slate-900 dark:text-slate-100 mr-2">
                NewsApp
              </span>
              <span>
                Portal Berita Blogger API v3.0, Pasar Modal IDX/Global & Indikator Ekonomi Resmi.
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => handleNavTabChange('saved')}
                className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
              >
                Disimpan ({bookmarkIds.length})
              </button>
              <button
                type="button"
                onClick={() => handleNavTabChange('history')}
                className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
              >
                Riwayat ({historyArticles.length})
              </button>
              <button
                type="button"
                onClick={() => handleNavTabChange('account')}
                className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
              >
                Akun & Pengaturan
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Mobile Bottom Navigation */}
      {!selectedArticle && (
        <BottomNav
          activeTab={activeNavTab}
          onTabChange={handleNavTabChange}
          savedCount={bookmarkIds.length}
          historyCount={historyArticles.length}
        />
      )}

      {/* Top Slide-Down Notifications Sheet */}
      <NotificationSheet
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        articles={articles}
        onSelectArticle={handleSelectArticle}
        onRefresh={() => loadNews(config, true)}
        isLoading={isLoadingNews}
      />

      {/* Share Sheet */}
      {shareArticle && (
        <ShareSheet
          isOpen={Boolean(shareArticle)}
          onClose={() => setShareArticle(null)}
          article={shareArticle}
          isBookmarked={bookmarkIds.includes(shareArticle.id)}
          onToggleBookmark={() => handleToggleBookmark(shareArticle.id, shareArticle)}
        />
      )}

    </div>
  );
}
