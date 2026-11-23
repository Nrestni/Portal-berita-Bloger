/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AdminOverviewResponse,
  AdminSessionResponse,
  AppComment,
  ArticleEngagementStats,
  CommentStatus,
  ModerationSettings,
  ReaderProfile,
  ReaderSessionResponse,
} from '../types/engagement';
import { apiUrl } from './apiBase';

const READER_ID_KEY = 'newsapp_reader_id';
const READER_SECRET_KEY = 'newsapp_reader_secret';
const READER_NAME_KEY = 'newsapp_reader_name';
const READER_TOKEN_KEY = 'newsapp_reader_token';
const ADMIN_TOKEN_KEY = 'newsapp_admin_token';

function generateRandomId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
    }
  } catch {}
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function getReaderIdentity(): { readerId: string; readerSecret: string } {
  try {
    let readerId = localStorage.getItem(READER_ID_KEY) || '';
    let readerSecret = localStorage.getItem(READER_SECRET_KEY) || '';
    if (!readerId || !/^[a-zA-Z0-9_\-]+$/.test(readerId)) {
      readerId = generateRandomId('rdr');
      localStorage.setItem(READER_ID_KEY, readerId);
    }
    if (!readerSecret || readerSecret.length < 8) {
      readerSecret = generateRandomId('sec');
      localStorage.setItem(READER_SECRET_KEY, readerSecret);
    }
    return { readerId, readerSecret };
  } catch {
    return {
      readerId: 'rdr_ephemeral',
      readerSecret: 'sec_ephemeral_token',
    };
  }
}

export function getSavedReaderName(): string {
  try {
    return localStorage.getItem(READER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveReaderName(name: string): void {
  try {
    localStorage.setItem(READER_NAME_KEY, name.trim().slice(0, 60));
  } catch {}
}

export function getStoredReaderToken(): string {
  try {
    return localStorage.getItem(READER_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredReaderToken(token: string | null): void {
  try {
    if (!token) {
      localStorage.removeItem(READER_TOKEN_KEY);
    } else {
      localStorage.setItem(READER_TOKEN_KEY, token);
    }
  } catch {}
}

export function getStoredAdminToken(): string {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredAdminToken(token: string | null): void {
  try {
    if (!token) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    } else {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
  } catch {}
}

function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const adminToken = getStoredAdminToken();
  const readerToken = getStoredReaderToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...extra,
  };
  if (adminToken) {
    headers.Authorization = `Bearer ${adminToken}`;
  }
  if (readerToken) {
    headers['x-reader-token'] = readerToken;
  }
  return headers;
}

export interface EngagementApiError extends Error {
  code?: string;
  status?: number;
  setupRequired?: boolean;
}

async function parseJsonOrThrow<T>(resp: Response): Promise<T> {
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data?.message || `Permintaan gagal (${resp.status})`) as EngagementApiError;
    err.status = resp.status;
    if (typeof data?.code === 'string') {
      err.code = data.code;
    }
    if (typeof data?.setupRequired === 'boolean') {
      err.setupRequired = data.setupRequired;
    }
    throw err;
  }
  return data as T;
}

export async function fetchEngagementSummary(): Promise<{
  stats: Record<string, ArticleEngagementStats>;
  moderationSettings: ModerationSettings;
}> {
  const { readerId } = getReaderIdentity();
  const resp = await fetch(apiUrl(`/api/engagement/summary?readerId=${encodeURIComponent(readerId)}`), {
    headers: getAuthHeaders(),
  });
  return parseJsonOrThrow(resp);
}

export async function recordArticleViewApi(
  articleId: string,
  title: string
): Promise<ArticleEngagementStats> {
  const { readerId } = getReaderIdentity();
  const resp = await fetch(apiUrl(`/api/engagement/articles/${encodeURIComponent(articleId)}/view`), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ readerId, title }),
  });
  const data = await parseJsonOrThrow<{ stats: ArticleEngagementStats }>(resp);
  return data.stats;
}

export async function toggleArticleLikeApi(
  articleId: string,
  title: string
): Promise<ArticleEngagementStats> {
  const { readerId } = getReaderIdentity();
  const resp = await fetch(apiUrl(`/api/engagement/articles/${encodeURIComponent(articleId)}/like`), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ readerId, title }),
  });
  const data = await parseJsonOrThrow<{ stats: ArticleEngagementStats }>(resp);
  return data.stats;
}

export async function fetchArticleAppComments(articleId: string): Promise<{
  comments: AppComment[];
  stats: ArticleEngagementStats;
  moderationSettings: ModerationSettings;
}> {
  const { readerId } = getReaderIdentity();
  const resp = await fetch(
    apiUrl(`/api/engagement/articles/${encodeURIComponent(articleId)}/comments?readerId=${encodeURIComponent(readerId)}`),
    {
      headers: getAuthHeaders(),
    }
  );
  return parseJsonOrThrow(resp);
}

export async function postArticleAppComment(params: {
  articleId: string;
  articleTitle: string;
  authorName: string;
  content: string;
}): Promise<{ comment: AppComment; stats: ArticleEngagementStats }> {
  const { readerId, readerSecret } = getReaderIdentity();
  const resp = await fetch(
    apiUrl(`/api/engagement/articles/${encodeURIComponent(params.articleId)}/comments`),
    {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        readerId,
        readerSecret,
        authorName: params.authorName,
        content: params.content,
        articleTitle: params.articleTitle,
      }),
    }
  );
  return parseJsonOrThrow(resp);
}

export async function editOwnAppComment(
  commentId: string,
  content: string
): Promise<{ comment: AppComment }> {
  const { readerId, readerSecret } = getReaderIdentity();
  const resp = await fetch(apiUrl(`/api/engagement/comments/${encodeURIComponent(commentId)}`), {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ readerId, readerSecret, content }),
  });
  return parseJsonOrThrow(resp);
}

export async function deleteAppComment(
  commentId: string
): Promise<{ stats: ArticleEngagementStats }> {
  const { readerId, readerSecret } = getReaderIdentity();
  const resp = await fetch(
    apiUrl(`/api/engagement/comments/${encodeURIComponent(commentId)}?readerId=${encodeURIComponent(readerId)}`),
    {
      method: 'DELETE',
      headers: getAuthHeaders({ 'x-reader-secret': readerSecret }),
    }
  );
  return parseJsonOrThrow(resp);
}

// =========================================================
// READER ACCOUNT AUTH ENDPOINTS (INSTANT LOGIN)
// =========================================================

export async function fetchReaderSession(): Promise<ReaderSessionResponse> {
  const resp = await fetch(apiUrl('/api/readers/session'), {
    headers: getAuthHeaders(),
  });
  return parseJsonOrThrow(resp);
}

export async function registerReaderApi(params: {
  name: string;
  email: string;
  password: string;
}): Promise<{ token: string; reader: ReaderProfile }> {
  const resp = await fetch(apiUrl('/api/readers/register'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });
  const data = await parseJsonOrThrow<{ token: string; reader: ReaderProfile }>(resp);
  setStoredReaderToken(data.token);
  saveReaderName(data.reader.name);
  return data;
}

export async function loginReaderApi(params: {
  email: string;
  password: string;
}): Promise<{ token: string; reader: ReaderProfile }> {
  const resp = await fetch(apiUrl('/api/readers/login'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });
  const data = await parseJsonOrThrow<{ token: string; reader: ReaderProfile }>(resp);
  setStoredReaderToken(data.token);
  saveReaderName(data.reader.name);
  return data;
}

// =========================================================
// ADMIN ENDPOINTS
// =========================================================

export async function fetchAdminSession(): Promise<AdminSessionResponse> {
  const resp = await fetch(apiUrl('/api/admin/session'), {
    headers: getAuthHeaders(),
  });
  return parseJsonOrThrow(resp);
}

export async function setupAdminPasswordApi(
  email: string,
  password: string
): Promise<{ token: string; email: string; moderationSettings: ModerationSettings }> {
  const resp = await fetch(apiUrl('/api/admin/setup'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonOrThrow<{
    token: string;
    email: string;
    moderationSettings: ModerationSettings;
  }>(resp);
  setStoredAdminToken(data.token);
  return data;
}

export async function loginAdminApi(
  email: string,
  password: string
): Promise<{ token: string; email: string; moderationSettings: ModerationSettings }> {
  const resp = await fetch(apiUrl('/api/admin/login'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonOrThrow<{
    token: string;
    email: string;
    moderationSettings: ModerationSettings;
  }>(resp);
  setStoredAdminToken(data.token);
  return data;
}

export async function changeAdminPasswordApi(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const resp = await fetch(apiUrl('/api/admin/change-password'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await parseJsonOrThrow<{ ok: boolean; token: string }>(resp);
  if (data.token) {
    setStoredAdminToken(data.token);
  }
}

export async function fetchAdminOverviewApi(): Promise<AdminOverviewResponse> {
  const resp = await fetch(apiUrl('/api/admin/overview'), {
    headers: getAuthHeaders(),
  });
  return parseJsonOrThrow(resp);
}

export async function updateAdminModerationSettingsApi(
  requireApproval: boolean
): Promise<{ moderationSettings: ModerationSettings }> {
  const resp = await fetch(apiUrl('/api/admin/settings'), {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ requireApproval }),
  });
  return parseJsonOrThrow(resp);
}

export async function adminManageArticleApi(
  articleId: string,
  action: {
    title?: string;
    commentsLocked?: boolean;
    resetViews?: boolean;
    resetLikes?: boolean;
    clearComments?: boolean;
  }
): Promise<{ stats: ArticleEngagementStats }> {
  const resp = await fetch(apiUrl(`/api/admin/articles/${encodeURIComponent(articleId)}`), {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(action),
  });
  return parseJsonOrThrow(resp);
}

export async function adminModerateCommentApi(
  commentId: string,
  patch: {
    status?: CommentStatus;
    pinned?: boolean;
    adminReply?: string | null;
  }
): Promise<{ comment: AppComment; stats: ArticleEngagementStats }> {
  const resp = await fetch(apiUrl(`/api/admin/comments/${encodeURIComponent(commentId)}`), {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(patch),
  });
  return parseJsonOrThrow(resp);
}

export async function adminDeleteCommentApi(
  commentId: string
): Promise<{ stats: ArticleEngagementStats }> {
  const resp = await fetch(apiUrl(`/api/admin/comments/${encodeURIComponent(commentId)}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return parseJsonOrThrow(resp);
}
