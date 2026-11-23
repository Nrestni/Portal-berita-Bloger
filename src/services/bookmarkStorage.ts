/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NewsArticle } from '../types/blogger';

const BOOKMARKS_KEY = 'newsapp_saved_bookmarks';
const BOOKMARK_ARTICLES_KEY = 'newsapp_saved_articles_data';

export function getSavedBookmarkIds(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getSavedArticlesMap(): Record<string, NewsArticle> {
  try {
    const raw = localStorage.getItem(BOOKMARK_ARTICLES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function toggleBookmarkId(
  id: string,
  articleSnapshot?: NewsArticle
): { isSaved: boolean; allIds: string[] } {
  try {
    const current = getSavedBookmarkIds();
    const map = getSavedArticlesMap();
    const index = current.indexOf(id);
    let updated: string[];
    let isSaved: boolean;

    if (index > -1) {
      updated = current.filter((item) => item !== id);
      delete map[id];
      isSaved = false;
    } else {
      updated = [id, ...current];
      if (articleSnapshot) {
        map[id] = articleSnapshot;
      }
      isSaved = true;
    }

    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
    localStorage.setItem(BOOKMARK_ARTICLES_KEY, JSON.stringify(map));
    return { isSaved, allIds: updated };
  } catch {
    return { isSaved: false, allIds: [] };
  }
}

export function clearAllBookmarks(): void {
  try {
    localStorage.removeItem(BOOKMARKS_KEY);
    localStorage.removeItem(BOOKMARK_ARTICLES_KEY);
  } catch {}
}
