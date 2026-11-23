/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NewsArticle } from '../types/blogger';

const HISTORY_KEY = 'newsapp_reading_history';

export function getReadingHistory(): NewsArticle[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToReadingHistory(article: NewsArticle): void {
  try {
    const current = getReadingHistory();
    const filtered = current.filter((a) => a.id !== article.id);
    const updated = [article, ...filtered].slice(0, 40);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export function removeFromReadingHistory(articleId: string): NewsArticle[] {
  try {
    const current = getReadingHistory();
    const updated = current.filter((a) => a.id !== articleId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearReadingHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
}
