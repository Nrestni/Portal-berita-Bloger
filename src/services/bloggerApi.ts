/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlogInfo, BloggerConfig, BloggerPostRaw, BloggerResponse, NewsArticle } from '../types/blogger';
import { inferThematicCategories } from './recommendationEngine';
import { apiUrl } from './apiBase';

export const DEFAULT_BLOGGER_ID = '4682143712664244285';
const CONFIG_STORAGE_KEY = 'newsapp_blogger_blog_id';
const OFFLINE_ARTICLES_CACHE_KEY = 'newsapp_offline_articles_cache_v2';

export interface CachedArticlesPayload {
  blogId: string;
  cachedAt: string;
  articles: NewsArticle[];
}

/**
 * Get configured Blogger Blog ID (defaults strictly to 4682143712664244285).
 * API keys are NEVER stored or handled in the frontend.
 */
export function getStoredBloggerConfig(): BloggerConfig {
  try {
    const savedId = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (savedId && savedId.trim()) {
      return { blogId: savedId.trim() };
    }
  } catch {}
  return { blogId: DEFAULT_BLOGGER_ID };
}

export function saveStoredBloggerConfig(config: BloggerConfig): void {
  try {
    const cleanId = config.blogId.trim() || DEFAULT_BLOGGER_ID;
    localStorage.setItem(CONFIG_STORAGE_KEY, cleanId);
  } catch {}
}

export function saveOfflineArticlesCache(blogId: string, articles: NewsArticle[]): void {
  if (!articles || articles.length === 0) return;
  try {
    const payload: CachedArticlesPayload = {
      blogId,
      cachedAt: new Date().toISOString(),
      articles: articles.slice(0, 40),
    };
    localStorage.setItem(OFFLINE_ARTICLES_CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

export function getOfflineArticlesCache(blogId: string): CachedArticlesPayload | null {
  try {
    const raw = localStorage.getItem(OFFLINE_ARTICLES_CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedArticlesPayload = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.articles) && parsed.articles.length > 0) {
      if (!blogId || parsed.blogId === blogId) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract one single primary thumbnail:
 * 1. Prioritize images[0].url if provided by Blogger API
 * 2. Fallback to extracting the first <img> src from HTML content
 * 3. Return null if no image found
 */
function upgradeBloggerImageUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (trimmed.includes('blogger.googleusercontent.com') || trimmed.includes('bp.blogspot.com')) {
    return trimmed.replace(/\/s\d+(-c)?\//, '/s1200/').replace(/=s\d+(-c)?$/, '=s1200');
  }
  return trimmed;
}

export function extractThumbnail(images?: Array<{ url: string }>, contentHtml?: string): string | null {
  if (images && images.length > 0 && images[0]?.url) {
    const url = images[0].url.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return upgradeBloggerImageUrl(url);
    }
  }

  if (contentHtml) {
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = contentHtml.match(imgRegex);
    if (match && match[1]) {
      const url = match[1].trim();
      if (
        !url.includes('feeds.feedburner.com') &&
        !url.includes('1x1') &&
        (url.startsWith('http://') || url.startsWith('https://'))
      ) {
        return upgradeBloggerImageUrl(url);
      }
    }
  }

  return null;
}

/**
 * Convert HTML content to clean plain text.
 */
export function extractPlainTextFull(html: string): string {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const unwanted = doc.querySelectorAll('script, style, noscript, svg, button');
    unwanted.forEach((node) => node.remove());
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

export function extractPlainTextExcerpt(html: string, maxLength: number = 160): string {
  const cleaned = extractPlainTextFull(html);
  if (cleaned.length <= maxLength) return cleaned;
  const trimmed = cleaned.slice(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(' ');
  return (lastSpace > 60 ? trimmed.slice(0, lastSpace) : trimmed) + '...';
}

/**
 * Format publication date in Indonesian locale with relative time support.
 */
export function formatDate(isoDate: string): { formatted: string; relative: string } {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return { formatted: isoDate, relative: '' };
    }

    const formatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);

    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative = '';
    if (diffDays > 30) {
      relative = formatted;
    } else if (diffDays > 0) {
      relative = `${diffDays} hari lalu`;
    } else if (diffHours > 0) {
      relative = `${diffHours} jam lalu`;
    } else if (diffMin > 0) {
      relative = `${diffMin} menit lalu`;
    } else {
      relative = 'Baru saja';
    }

    return { formatted, relative };
  } catch {
    return { formatted: isoDate, relative: '' };
  }
}

export function calculateReadingTime(text: string): number {
  if (!text) return 1;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function getBloggerImageKey(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const clean = url.split('?')[0].split('#')[0];
    const parts = clean.split('/').filter(Boolean);
    return (parts[parts.length - 1] || clean).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Sanitize HTML content before rendering (XSS prevention & Blogger layout cleanup).
 */
export function sanitizeHtmlContent(html: string, coverImageUrl?: string | null): string {
  if (!html) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const bannedTags = ['script', 'style', 'link', 'meta', 'base', 'object', 'embed', 'form', 'applet'];
    bannedTags.forEach((tag) => {
      doc.querySelectorAll(tag).forEach((el) => el.remove());
    });

    // If the cover image is already displayed above the article body, remove the duplicate first <img>
    // and clean up Blogger's wrapper (<div class="separator"><a><img/></a></div><br/>) so images never overlap or double-render.
    if (coverImageUrl) {
      const coverKey = getBloggerImageKey(coverImageUrl);
      const firstImg = doc.querySelector('img');
      if (firstImg && coverKey) {
        const firstSrc = firstImg.getAttribute('src') || '';
        if (getBloggerImageKey(firstSrc) === coverKey) {
          const parentAnchor = firstImg.closest('a');
          const separatorDiv = firstImg.closest('.separator');
          const targetNode: Element = separatorDiv || parentAnchor || firstImg;
          const nextSibling = targetNode.nextElementSibling;
          if (nextSibling && nextSibling.tagName.toLowerCase() === 'br') {
            nextSibling.remove();
          }
          const parentBlock = targetNode.parentElement;
          targetNode.remove();
          if (parentBlock && !(parentBlock.textContent || '').trim() && parentBlock.children.length === 0) {
            parentBlock.remove();
          }
        }
      }
    }

    // Remove leading empty <p>&nbsp;</p> spacer elements produced by Blogger editor
    while (doc.body.firstElementChild) {
      const firstEl = doc.body.firstElementChild;
      const tag = firstEl.tagName.toLowerCase();
      const hasMedia = firstEl.querySelector('img, iframe, video, table');
      const text = (firstEl.textContent || '').replace(/\u00a0/g, '').trim();
      if ((tag === 'p' || tag === 'div' || tag === 'br') && !hasMedia && !text) {
        firstEl.remove();
      } else {
        break;
      }
    }

    doc.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.toLowerCase().startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });

      if (el.hasAttribute('href')) {
        const href = (el.getAttribute('href') || '').trim();
        if (href.toLowerCase().startsWith('javascript:') || href.toLowerCase().startsWith('data:text/html')) {
          el.removeAttribute('href');
        }
      }

      if (el.hasAttribute('src')) {
        const src = (el.getAttribute('src') || '').trim();
        if (src.toLowerCase().startsWith('javascript:') || src.toLowerCase().startsWith('data:text/html')) {
          el.removeAttribute('src');
        }
      }

      if (el.classList.contains('separator')) {
        el.removeAttribute('style');
      }

      if (el.tagName.toLowerCase() === 'a') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
        if (el.querySelector('img')) {
          el.removeAttribute('style');
        }
      }

      if (el.tagName.toLowerCase() === 'img') {
        const currentSrc = el.getAttribute('src') || '';
        if (currentSrc) {
          el.setAttribute('src', upgradeBloggerImageUrl(currentSrc));
        }
        el.removeAttribute('width');
        el.removeAttribute('height');
        el.removeAttribute('border');
        el.removeAttribute('style');
        el.setAttribute('loading', 'lazy');
        el.setAttribute('referrerpolicy', 'no-referrer');
      }

      if (el.tagName.toLowerCase() === 'iframe') {
        const src = (el.getAttribute('src') || '').trim();
        const isSafeEmbed =
          src.startsWith('https://www.youtube.com/') ||
          src.startsWith('https://youtube.com/') ||
          src.startsWith('https://www.youtube-nocookie.com/') ||
          src.startsWith('https://player.vimeo.com/') ||
          src.startsWith('https://maps.google.com/');

        if (!isSafeEmbed) {
          el.remove();
        } else {
          el.setAttribute('loading', 'lazy');
          el.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
        }
      }
    });

    return doc.body.innerHTML;
  } catch {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
}

export function transformBloggerPost(raw: BloggerPostRaw): NewsArticle {
  const thumbnail = extractThumbnail(raw.images, raw.content);
  const plainTextFull = extractPlainTextFull(raw.content);
  const plainTextExcerpt =
    plainTextFull.length <= 165
      ? plainTextFull
      : plainTextFull.slice(0, plainTextFull.slice(0, 165).lastIndexOf(' ') > 60 ? plainTextFull.slice(0, 165).lastIndexOf(' ') : 165) + '...';
  const { formatted, relative } = formatDate(raw.published);
  const readingTime = calculateReadingTime(plainTextFull);

  const labels =
    Array.isArray(raw.labels) && raw.labels.length > 0
      ? raw.labels.map((l) => l.trim()).filter(Boolean)
      : ['Umum'];

  const primaryCategory = labels[0] || 'Umum';
  const thematicCategories = inferThematicCategories(labels, raw.title || '', plainTextExcerpt);

  return {
    id: raw.id,
    title: raw.title || 'Tanpa Judul',
    content: raw.content || '',
    plainTextFull,
    plainTextExcerpt,
    thumbnail,
    labels,
    primaryCategory,
    thematicCategories,
    published: raw.published,
    publishedFormatted: formatted,
    publishedRelative: relative,
    url: raw.url,
    readingTime,
    author: {
      displayName: raw.author?.displayName || 'Redaksi',
      avatarUrl: raw.author?.image?.url
        ? raw.author.image.url.startsWith('//')
          ? `https:${raw.author.image.url}`
          : raw.author.image.url
        : undefined,
    },
  };
}

export interface FetchPostsResult {
  articles: NewsArticle[];
  nextPageToken?: string;
  fromCache?: boolean;
  cachedAt?: string;
}

/**
 * Fetch posts from Blogger API v3.0 via secure backend proxy (/api/blogger/posts)
 */
export async function fetchBloggerPosts(
  config: BloggerConfig,
  pageToken?: string,
  searchQuery?: string,
  forceRefresh?: boolean
): Promise<FetchPostsResult> {
  const blogId = config.blogId || DEFAULT_BLOGGER_ID;
  const params = new URLSearchParams({ blogId });
  if (pageToken) params.set('pageToken', pageToken);
  if (searchQuery && searchQuery.trim()) params.set('q', searchQuery.trim());
  if (forceRefresh) params.set('refresh', '1');

  let response: Response;
  try {
    response = await fetch(apiUrl(`/api/blogger/posts?${params.toString()}`), {
      headers: { Accept: 'application/json' },
    });
  } catch (err: any) {
    // Fallback to offline cache if available when network is down
    if (!pageToken && !searchQuery) {
      const cached = getOfflineArticlesCache(blogId);
      if (cached) {
        return {
          articles: cached.articles,
          fromCache: true,
          cachedAt: cached.cachedAt,
        };
      }
    }
    throw new Error(
      `NETWORK_ERROR: Gagal terhubung ke server berita. Periksa sambungan internet Anda (${err?.message || 'Koneksi terputus'}).`
    );
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const code = errBody?.code || 'API_ERROR';
    const msg = errBody?.message || `HTTP ${response.status}`;

    // If quota/network failed and we have local cached articles on initial load, preserve access with warning
    if (!pageToken && !searchQuery && code !== 'CONFIG_MISSING') {
      const cached = getOfflineArticlesCache(blogId);
      if (cached) {
        return {
          articles: cached.articles,
          fromCache: true,
          cachedAt: cached.cachedAt,
        };
      }
    }
    throw new Error(`${code}: ${msg}`);
  }

  const data: BloggerResponse = await response.json();
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return {
      articles: [],
      nextPageToken: undefined,
      cachedAt: data._cachedAt || new Date().toISOString(),
    };
  }

  const articles = data.items.map(transformBloggerPost);

  if (!pageToken && !searchQuery) {
    saveOfflineArticlesCache(blogId, articles);
  }

  return {
    articles,
    nextPageToken: data.nextPageToken,
    fromCache: false,
    cachedAt: data._cachedAt || new Date().toISOString(),
  };
}

export async function fetchBlogInfo(config: BloggerConfig): Promise<BlogInfo> {
  const blogId = config.blogId || DEFAULT_BLOGGER_ID;
  const response = await fetch(apiUrl(`/api/blogger/info?blogId=${encodeURIComponent(blogId)}`));
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.message || `HTTP ${response.status}: Gagal memuat info blog.`);
  }
  return response.json();
}

export interface BloggerComment {
  id: string;
  content: string;
  published: string;
  author: {
    displayName: string;
    image?: { url: string };
  };
}

export async function fetchBloggerComments(config: BloggerConfig, postId: string): Promise<BloggerComment[]> {
  const blogId = config.blogId || DEFAULT_BLOGGER_ID;
  if (!postId) return [];
  try {
    const response = await fetch(
      apiUrl(`/api/blogger/posts/${encodeURIComponent(postId)}/comments?blogId=${encodeURIComponent(blogId)}`)
    );
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.items || !Array.isArray(data.items)) return [];
    return data.items.map((item: any) => ({
      id: item.id,
      content: sanitizeHtmlContent(item.content || ''),
      published: item.published || '',
      author: {
        displayName: item.author?.displayName || 'Pembaca',
        image: item.author?.image ? { url: item.author.image.url } : undefined,
      },
    }));
  } catch {
    return [];
  }
}
