/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const STORE_PATH = path.join(DATA_DIR, 'engagement-store.json');

const VIEW_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes per readerId before counting another view
const ADMIN_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type CommentStatus = 'published' | 'pending' | 'hidden';

export interface AdminReplyRecord {
  content: string;
  repliedAt: string;
  adminEmail: string;
}

export interface StoredComment {
  id: string;
  articleId: string;
  articleTitle: string;
  authorName: string;
  isAdminAuthor: boolean;
  readerId: string;
  readerSecretHash: string;
  content: string;
  status: CommentStatus;
  pinned: boolean;
  adminReply: AdminReplyRecord | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredArticleEngagement {
  articleId: string;
  title: string;
  views: number;
  uniqueReaderIds: string[];
  recentViewsByReader: Record<string, number>;
  likedByReaderIds: string[];
  commentsLocked: boolean;
  lastViewedAt: string | null;
  updatedAt: string;
}

export interface ModerationSettings {
  requireApproval: boolean;
}

export interface StoredReaderAccount {
  id: string;
  name: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}

export interface PublicReaderProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AdminCredentialsStore {
  email: string;
  passwordSalt: string | null;
  passwordHash: string | null;
  sessionSecret: string;
}

interface EngagementDatabase {
  version: number;
  articles: Record<string, StoredArticleEngagement>;
  comments: StoredComment[];
  readers: StoredReaderAccount[];
  readerSessionSecret: string;
  moderationSettings: ModerationSettings;
  admin: AdminCredentialsStore;
}

export interface PublicArticleStats {
  articleId: string;
  title: string;
  views: number;
  uniqueReaders: number;
  likes: number;
  commentCount: number;
  likedByMe: boolean;
  commentsLocked: boolean;
  lastViewedAt: string | null;
}

export interface PublicCommentDTO {
  id: string;
  articleId: string;
  articleTitle: string;
  authorName: string;
  isAdminAuthor: boolean;
  content: string;
  status: CommentStatus;
  pinned: boolean;
  adminReply: AdminReplyRecord | null;
  isMine: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_OWNER_USERNAME = 'admin';
const DEFAULT_OWNER_EMAIL = 'nendenrestiani05@gmail.com';

function getAllowedAdminEmails(): string[] {
  const identifiers = new Set<string>([DEFAULT_OWNER_USERNAME, DEFAULT_OWNER_EMAIL]);
  const envUser = (process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const envEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (envUser) {
    identifiers.add(envUser);
  }
  if (envEmail) {
    identifiers.add(envEmail);
  }
  return Array.from(identifiers);
}

function isAllowedAdminEmail(emailRaw: unknown): boolean {
  const clean = String(emailRaw || '').trim().toLowerCase();
  if (!clean) return false;
  return getAllowedAdminEmails().includes(clean);
}

function getConfiguredAdminEmail(): string {
  return (process.env.ADMIN_USERNAME || DEFAULT_OWNER_USERNAME).trim().toLowerCase();
}

function getEnvAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD || '').trim();
}

function hashSecret(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function sanitizeId(raw: unknown, maxLen = 128): string {
  const s = String(raw || '').trim();
  if (!s || s.length > maxLen) return '';
  if (!/^[a-zA-Z0-9_\-]+$/.test(s)) return '';
  return s;
}

function sanitizePlainText(raw: unknown, maxLen: number): string {
  return String(raw || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

class EngagementStore {
  private db: EngagementDatabase;

  constructor() {
    this.db = this.loadFromDisk();
  }

  private createDefaultDb(): EngagementDatabase {
    return {
      version: 1,
      articles: {},
      comments: [],
      readers: [],
      readerSessionSecret: process.env.READER_SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
      moderationSettings: {
        requireApproval: false,
      },
      admin: {
        email: getConfiguredAdminEmail(),
        passwordSalt: null,
        passwordHash: null,
        sessionSecret: process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
      },
    };
  }

  private loadFromDisk(): EngagementDatabase {
    try {
      if (!fs.existsSync(STORE_PATH)) {
        const initial = this.createDefaultDb();
        this.persist(initial);
        return initial;
      }
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<EngagementDatabase>;
      const fallback = this.createDefaultDb();

      const merged: EngagementDatabase = {
        version: 1,
        articles: parsed.articles && typeof parsed.articles === 'object' ? parsed.articles : {},
        comments: Array.isArray(parsed.comments) ? parsed.comments : [],
        readers: Array.isArray(parsed.readers) ? parsed.readers : [],
        readerSessionSecret: process.env.READER_SESSION_SECRET || parsed.readerSessionSecret || fallback.readerSessionSecret,
        moderationSettings: {
          requireApproval: Boolean(parsed.moderationSettings?.requireApproval),
        },
        admin: {
          email:
            parsed.admin?.email && isAllowedAdminEmail(parsed.admin.email)
              ? parsed.admin.email.trim().toLowerCase()
              : getConfiguredAdminEmail(),
          passwordSalt: parsed.admin?.passwordSalt || null,
          passwordHash: parsed.admin?.passwordHash || null,
          sessionSecret: process.env.ADMIN_SESSION_SECRET || parsed.admin?.sessionSecret || fallback.admin.sessionSecret,
        },
      };
      return merged;
    } catch (err) {
      console.error('Gagal memuat engagement-store.json, membuat baru:', err);
      return this.createDefaultDb();
    }
  }

  private persist(target: EngagementDatabase = this.db): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpPath = `${STORE_PATH}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(target, null, 2), 'utf-8');
      fs.renameSync(tmpPath, STORE_PATH);
    } catch (err) {
      console.error('Gagal menyimpan engagement-store.json:', err);
    }
  }

  private ensureArticle(articleId: string, title?: string): StoredArticleEngagement {
    const cleanTitle = sanitizePlainText(title, 300);
    let record = this.db.articles[articleId];
    if (!record) {
      record = {
        articleId,
        title: cleanTitle || `Artikel #${articleId}`,
        views: 0,
        uniqueReaderIds: [],
        recentViewsByReader: {},
        likedByReaderIds: [],
        commentsLocked: false,
        lastViewedAt: null,
        updatedAt: new Date().toISOString(),
      };
      this.db.articles[articleId] = record;
    } else if (cleanTitle && (!record.title || record.title.startsWith('Artikel #'))) {
      record.title = cleanTitle;
    } else if (cleanTitle && cleanTitle !== record.title) {
      record.title = cleanTitle;
    }
    return record;
  }

  private countPublishedComments(articleId: string): number {
    return this.db.comments.filter(
      (c) => c.articleId === articleId && c.status === 'published'
    ).length;
  }

  public toPublicStats(articleId: string, readerId?: string): PublicArticleStats {
    const cleanReader = sanitizeId(readerId, 100);
    const record = this.db.articles[articleId];
    const publishedComments = this.countPublishedComments(articleId);

    if (!record) {
      return {
        articleId,
        title: '',
        views: 0,
        uniqueReaders: 0,
        likes: 0,
        commentCount: publishedComments,
        likedByMe: false,
        commentsLocked: false,
        lastViewedAt: null,
      };
    }

    return {
      articleId: record.articleId,
      title: record.title,
      views: record.views,
      uniqueReaders: record.uniqueReaderIds.length,
      likes: record.likedByReaderIds.length,
      commentCount: publishedComments,
      likedByMe: cleanReader ? record.likedByReaderIds.includes(cleanReader) : false,
      commentsLocked: Boolean(record.commentsLocked),
      lastViewedAt: record.lastViewedAt,
    };
  }

  public getSummaryMap(readerId?: string): Record<string, PublicArticleStats> {
    const ids = new Set<string>(Object.keys(this.db.articles));
    for (const c of this.db.comments) {
      ids.add(c.articleId);
    }
    const result: Record<string, PublicArticleStats> = {};
    for (const id of ids) {
      result[id] = this.toPublicStats(id, readerId);
    }
    return result;
  }

  public recordArticleView(articleIdRaw: string, readerIdRaw: string, title?: string): PublicArticleStats | null {
    const articleId = sanitizeId(articleIdRaw);
    if (!articleId) return null;

    const readerId = sanitizeId(readerIdRaw, 100) || 'anon';
    const record = this.ensureArticle(articleId, title);
    const now = Date.now();

    // Prune expired view cooldown entries
    for (const [rId, ts] of Object.entries(record.recentViewsByReader || {})) {
      if (now - ts > VIEW_COOLDOWN_MS) {
        delete record.recentViewsByReader[rId];
      }
    }

    const lastSeen = record.recentViewsByReader[readerId] || 0;
    if (now - lastSeen >= VIEW_COOLDOWN_MS) {
      record.views += 1;
      record.recentViewsByReader[readerId] = now;
      if (readerId !== 'anon' && !record.uniqueReaderIds.includes(readerId)) {
        if (record.uniqueReaderIds.length < 50_000) {
          record.uniqueReaderIds.push(readerId);
        }
      }
      record.lastViewedAt = new Date(now).toISOString();
      record.updatedAt = record.lastViewedAt;
      this.persist();
    } else if (title) {
      this.persist();
    }

    return this.toPublicStats(articleId, readerId);
  }

  public toggleArticleLike(
    articleIdRaw: string,
    readerIdRaw: string,
    title?: string
  ): PublicArticleStats | null {
    const articleId = sanitizeId(articleIdRaw);
    const readerId = sanitizeId(readerIdRaw, 100);
    if (!articleId || !readerId) return null;

    const record = this.ensureArticle(articleId, title);
    const existingIdx = record.likedByReaderIds.indexOf(readerId);

    if (existingIdx >= 0) {
      record.likedByReaderIds.splice(existingIdx, 1);
    } else {
      if (record.likedByReaderIds.length < 100_000) {
        record.likedByReaderIds.push(readerId);
      }
    }

    record.updatedAt = new Date().toISOString();
    this.persist();

    return this.toPublicStats(articleId, readerId);
  }

  public getArticleComments(
    articleIdRaw: string,
    readerIdRaw?: string,
    isAdmin = false
  ): {
    comments: PublicCommentDTO[];
    stats: PublicArticleStats;
    moderationSettings: ModerationSettings;
  } | null {
    const articleId = sanitizeId(articleIdRaw);
    if (!articleId) return null;

    const cleanReader = sanitizeId(readerIdRaw, 100);

    const filtered = this.db.comments
      .filter((c) => {
        if (c.articleId !== articleId) return false;
        if (isAdmin) return true;
        if (c.status === 'published') return true;
        if (c.status === 'pending' && cleanReader && c.readerId === cleanReader) return true;
        return false;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .map((c) => this.toPublicComment(c, cleanReader));

    return {
      comments: filtered,
      stats: this.toPublicStats(articleId, cleanReader),
      moderationSettings: { ...this.db.moderationSettings },
    };
  }

  private toPublicComment(c: StoredComment, readerId?: string): PublicCommentDTO {
    return {
      id: c.id,
      articleId: c.articleId,
      articleTitle: c.articleTitle,
      authorName: c.authorName,
      isAdminAuthor: c.isAdminAuthor,
      content: c.content,
      status: c.status,
      pinned: c.pinned,
      adminReply: c.adminReply,
      isMine: Boolean(readerId && c.readerId === readerId),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  public createComment(params: {
    articleId: string;
    articleTitle?: string;
    authorName: string;
    content: string;
    readerId: string;
    readerSecret?: string;
    isAdmin: boolean;
    isVerifiedAccount: boolean;
  }): { comment: PublicCommentDTO; stats: PublicArticleStats } | { error: string; status: number; code?: string } {
    if (!params.isVerifiedAccount && !params.isAdmin) {
      return {
        error: 'Hanya pembaca yang sudah mendaftar akun yang dapat mengirim komentar. Silakan daftar akun terlebih dahulu.',
        status: 401,
        code: 'READER_AUTH_REQUIRED',
      };
    }

    const articleId = sanitizeId(params.articleId);
    const readerId = sanitizeId(params.readerId, 100);
    const readerSecret = String(params.readerSecret || '').trim();

    if (!articleId || !readerId) {
      return { error: 'Identitas artikel atau akun tidak valid.', status: 400 };
    }

    const record = this.ensureArticle(articleId, params.articleTitle);
    if (record.commentsLocked && !params.isAdmin) {
      return {
        error: 'Kolom komentar pada berita ini sedang dikunci oleh Admin.',
        status: 403,
      };
    }

    const authorName = params.isAdmin
      ? sanitizePlainText(params.authorName || 'Admin Redaksi', 60) || 'Admin Redaksi'
      : sanitizePlainText(params.authorName, 60);

    if (!authorName || authorName.length < 2) {
      return { error: 'Nama tampilan minimal terdiri dari 2 karakter.', status: 400 };
    }

    const content = sanitizePlainText(params.content, 1500);
    if (!content || content.length < 2) {
      return { error: 'Isi komentar tidak boleh kosong (minimal 2 karakter).', status: 400 };
    }

    const nowIso = new Date().toISOString();
    const status: CommentStatus = params.isAdmin
      ? 'published'
      : this.db.moderationSettings.requireApproval
      ? 'pending'
      : 'published';

    const newComment: StoredComment = {
      id: crypto.randomUUID(),
      articleId,
      articleTitle: record.title,
      authorName,
      isAdminAuthor: params.isAdmin,
      readerId,
      readerSecretHash: readerSecret ? hashSecret(readerSecret) : '',
      content,
      status,
      pinned: false,
      adminReply: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.db.comments.unshift(newComment);
    record.updatedAt = nowIso;
    this.persist();

    return {
      comment: this.toPublicComment(newComment, readerId),
      stats: this.toPublicStats(articleId, readerId),
    };
  }

  public updateOwnComment(params: {
    commentId: string;
    content: string;
    readerId: string;
    readerSecret?: string;
    isVerifiedReader: boolean;
    isAdmin: boolean;
  }): { comment: PublicCommentDTO } | { error: string; status: number } {
    const commentId = sanitizeId(params.commentId);
    const target = this.db.comments.find((c) => c.id === commentId);
    if (!target) {
      return { error: 'Komentar tidak ditemukan.', status: 404 };
    }

    const secretHash = params.readerSecret ? hashSecret(String(params.readerSecret)) : '';
    const isVerifiedOwner = params.isVerifiedReader && params.readerId === target.readerId;
    const isLegacySecretOwner =
      Boolean(secretHash) &&
      params.readerId === target.readerId &&
      Boolean(target.readerSecretHash) &&
      safeEqualHex(secretHash, target.readerSecretHash);

    if (!isVerifiedOwner && !isLegacySecretOwner && !params.isAdmin) {
      return { error: 'Anda tidak memiliki izin untuk mengubah komentar ini.', status: 403 };
    }

    const content = sanitizePlainText(params.content, 1500);
    if (!content || content.length < 2) {
      return { error: 'Isi komentar minimal terdiri dari 2 karakter.', status: 400 };
    }

    target.content = content;
    target.updatedAt = new Date().toISOString();
    this.persist();

    return { comment: this.toPublicComment(target, params.readerId) };
  }

  public deleteComment(params: {
    commentId: string;
    readerId?: string;
    readerSecret?: string;
    isVerifiedReader?: boolean;
    isAdmin: boolean;
  }): { stats: PublicArticleStats } | { error: string; status: number } {
    const commentId = sanitizeId(params.commentId);
    const idx = this.db.comments.findIndex((c) => c.id === commentId);
    if (idx === -1) {
      return { error: 'Komentar tidak ditemukan.', status: 404 };
    }

    const target = this.db.comments[idx];
    const secretHash = params.readerSecret ? hashSecret(String(params.readerSecret)) : '';
    const isVerifiedOwner =
      Boolean(params.isVerifiedReader) && Boolean(params.readerId) && params.readerId === target.readerId;
    const isLegacySecretOwner =
      Boolean(secretHash) &&
      Boolean(params.readerId) &&
      params.readerId === target.readerId &&
      Boolean(target.readerSecretHash) &&
      safeEqualHex(secretHash, target.readerSecretHash);

    if (!isVerifiedOwner && !isLegacySecretOwner && !params.isAdmin) {
      return { error: 'Anda tidak memiliki izin untuk menghapus komentar ini.', status: 403 };
    }

    const articleId = target.articleId;
    this.db.comments.splice(idx, 1);
    this.persist();

    return { stats: this.toPublicStats(articleId, params.readerId) };
  }

  // =========================================================
  // READER ACCOUNT REGISTRATION & INSTANT LOGIN (NO VERIFICATION)
  // =========================================================

  private toPublicReader(reader: StoredReaderAccount): PublicReaderProfile {
    return {
      id: reader.id,
      name: reader.name,
      email: reader.email,
      createdAt: reader.createdAt,
    };
  }

  public issueReaderToken(reader: StoredReaderAccount): string {
    const payload = {
      id: reader.id,
      email: reader.email,
      name: reader.name,
      role: 'reader',
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      nonce: crypto.randomBytes(8).toString('hex'),
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
    const sig = crypto
      .createHmac('sha256', this.db.readerSessionSecret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${sig}`;
  }

  public verifyReaderToken(rawToken?: string): { valid: boolean; reader?: PublicReaderProfile } {
    if (!rawToken) return { valid: false };
    const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };

    const [encoded, providedSig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.db.readerSessionSecret)
      .update(encoded)
      .digest('base64url');

    if (providedSig.length !== expectedSig.length) return { valid: false };
    const sigMatch = crypto.timingSafeEqual(
      Buffer.from(providedSig, 'utf-8'),
      Buffer.from(expectedSig, 'utf-8')
    );
    if (!sigMatch) return { valid: false };

    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
      if (!payload || payload.role !== 'reader') return { valid: false };
      if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return { valid: false };
      const existing = this.db.readers.find((r) => r.id === payload.id);
      if (!existing) return { valid: false };
      return { valid: true, reader: this.toPublicReader(existing) };
    } catch {
      return { valid: false };
    }
  }

  public registerReader(params: {
    name: string;
    email: string;
    password: string;
  }):
    | { token: string; reader: PublicReaderProfile }
    | { error: string; status: number; code?: string } {
    const name = sanitizePlainText(params.name, 60);
    const email = String(params.email || '').trim().toLowerCase();
    const password = String(params.password || '');

    if (!name || name.length < 2) {
      return { error: 'Nama lengkap minimal terdiri dari 2 karakter.', status: 400 };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: 'Masukkan alamat email yang valid.', status: 400 };
    }

    if (password.length < 6) {
      return { error: 'Kata sandi minimal harus terdiri dari 6 karakter.', status: 400 };
    }

    const exists = this.db.readers.find((r) => r.email === email);
    if (exists) {
      return {
        error: 'Email ini sudah terdaftar. Silakan masuk menggunakan kata sandi Anda.',
        status: 409,
        code: 'EMAIL_EXISTS',
      };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const reader: StoredReaderAccount = {
      id: `rdr_${crypto.randomUUID().replace(/-/g, '')}`,
      name,
      email,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    };

    this.db.readers.unshift(reader);
    this.persist();

    return {
      token: this.issueReaderToken(reader),
      reader: this.toPublicReader(reader),
    };
  }

  public loginReader(params: {
    email: string;
    password: string;
  }): { token: string; reader: PublicReaderProfile } | { error: string; status: number } {
    const email = String(params.email || '').trim().toLowerCase();
    const password = String(params.password || '');

    const target = this.db.readers.find((r) => r.email === email);
    if (!target) {
      return { error: 'Email atau kata sandi pembaca tidak sesuai.', status: 401 };
    }

    const candidateHash = hashPassword(password, target.passwordSalt);
    if (!safeEqualHex(candidateHash, target.passwordHash)) {
      return { error: 'Email atau kata sandi pembaca tidak sesuai.', status: 401 };
    }

    return {
      token: this.issueReaderToken(target),
      reader: this.toPublicReader(target),
    };
  }

  public getRegisteredReadersCount(): number {
    return this.db.readers.length;
  }

  // =========================================================
  // ADMIN AUTHENTICATION & MANAGEMENT
  // =========================================================

  public isPasswordSetupRequired(): boolean {
    const hasStoredPass = Boolean(this.db.admin.passwordHash && this.db.admin.passwordSalt);
    return !hasStoredPass && !getEnvAdminPassword();
  }

  public getAdminEmail(): string {
    if (this.db.admin.email && isAllowedAdminEmail(this.db.admin.email)) {
      return this.db.admin.email;
    }
    return getConfiguredAdminEmail();
  }

  public getAllowedEmails(): string[] {
    return getAllowedAdminEmails();
  }

  public issueAdminToken(email: string): string {
    const payload = {
      email: email.toLowerCase(),
      role: 'admin',
      exp: Date.now() + ADMIN_TOKEN_TTL_MS,
      nonce: crypto.randomBytes(8).toString('hex'),
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
    const sig = crypto
      .createHmac('sha256', this.db.admin.sessionSecret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${sig}`;
  }

  public verifyAdminToken(authHeader?: string): { valid: boolean; email?: string } {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false };
    }
    const token = authHeader.slice(7).trim();
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };

    const [encoded, providedSig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.db.admin.sessionSecret)
      .update(encoded)
      .digest('base64url');

    if (providedSig.length !== expectedSig.length) return { valid: false };
    const sigMatch = crypto.timingSafeEqual(
      Buffer.from(providedSig, 'utf-8'),
      Buffer.from(expectedSig, 'utf-8')
    );
    if (!sigMatch) return { valid: false };

    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
      if (!payload || payload.role !== 'admin') return { valid: false };
      if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return { valid: false };
      const tokenEmail = String(payload.email || '').trim().toLowerCase();
      if (!isAllowedAdminEmail(tokenEmail)) {
        return { valid: false };
      }
      return { valid: true, email: tokenEmail };
    } catch {
      return { valid: false };
    }
  }

  public setupInitialAdminPassword(
    emailRaw: string,
    passwordRaw: string
  ): { token: string; email: string } | { error: string; status: number; code?: string } {
    const email = String(emailRaw || '').trim().toLowerCase();
    const password = String(passwordRaw || '');

    if (!this.isPasswordSetupRequired()) {
      const existingLogin = this.loginAdmin(email, password);
      if (!('error' in existingLogin)) {
        return existingLogin;
      }
      return {
        error:
          'Kata sandi Admin sudah aktif. Formulir telah dialihkan ke menu Masuk — silakan masukkan kata sandi Admin Anda.',
        status: 409,
        code: 'ALREADY_CONFIGURED',
      };
    }

    if (!isAllowedAdminEmail(email)) {
      return {
        error: 'Username Admin tidak sesuai.',
        status: 403,
      };
    }

    if (password.length < 6) {
      return { error: 'Kata sandi Admin minimal harus terdiri dari 6 karakter.', status: 400 };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    this.db.admin.email = email;
    this.db.admin.passwordSalt = salt;
    this.db.admin.passwordHash = hash;
    this.persist();

    return {
      token: this.issueAdminToken(email),
      email,
    };
  }

  public loginAdmin(
    emailRaw: string,
    passwordRaw: string
  ): { token: string; email: string } | { error: string; status: number; code?: string } {
    const email = String(emailRaw || '').trim().toLowerCase();

    if (!isAllowedAdminEmail(email)) {
      return {
        error: 'Username atau kata sandi Admin tidak sesuai.',
        status: 401,
      };
    }

    const password = String(passwordRaw || '');
    const hasStoredPass = Boolean(this.db.admin.passwordHash && this.db.admin.passwordSalt);
    const envPass = getEnvAdminPassword();

    if (!hasStoredPass && !envPass) {
      return {
        error: 'Kredensial Admin belum dikonfigurasi pada server.',
        status: 503,
        code: 'ADMIN_NOT_CONFIGURED',
      };
    }

    let matched = false;
    if (hasStoredPass && this.db.admin.passwordSalt && this.db.admin.passwordHash) {
      const candidateHash = hashPassword(password, this.db.admin.passwordSalt);
      if (safeEqualHex(candidateHash, this.db.admin.passwordHash)) {
        matched = true;
      }
    } else if (envPass) {
      const a = hashSecret(password);
      const b = hashSecret(envPass);
      if (safeEqualHex(a, b)) {
        matched = true;
      }
    }

    if (!matched) {
      return { error: 'Username atau kata sandi Admin tidak sesuai.', status: 401 };
    }

    return {
      token: this.issueAdminToken(email),
      email,
    };
  }

  public changeAdminPassword(
    currentPassword: string,
    newPassword: string,
    adminEmail?: string
  ): { ok: true; token: string } | { error: string; status: number } {
    const targetEmail =
      adminEmail && isAllowedAdminEmail(adminEmail)
        ? adminEmail.trim().toLowerCase()
        : this.getAdminEmail();

    const verify = this.loginAdmin(targetEmail, currentPassword);
    if ('error' in verify) {
      return { error: 'Kata sandi saat ini tidak sesuai.', status: 401 };
    }
    if (!newPassword || newPassword.length < 6) {
      return { error: 'Kata sandi baru minimal harus terdiri dari 6 karakter.', status: 400 };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    this.db.admin.email = targetEmail;
    this.db.admin.passwordSalt = salt;
    this.db.admin.passwordHash = hashPassword(newPassword, salt);
    // Rotate session secret so older sessions are invalidated
    this.db.admin.sessionSecret = crypto.randomBytes(32).toString('hex');
    this.persist();

    return {
      ok: true,
      token: this.issueAdminToken(targetEmail),
    };
  }

  public getModerationSettings(): ModerationSettings {
    return { ...this.db.moderationSettings };
  }

  public updateModerationSettings(patch: Partial<ModerationSettings>): ModerationSettings {
    if (typeof patch.requireApproval === 'boolean') {
      this.db.moderationSettings.requireApproval = patch.requireApproval;
      this.persist();
    }
    return { ...this.db.moderationSettings };
  }

  public adminModerateComment(
    commentIdRaw: string,
    patch: {
      status?: CommentStatus;
      pinned?: boolean;
      adminReply?: string | null;
      adminEmail: string;
    }
  ): { comment: PublicCommentDTO; stats: PublicArticleStats } | { error: string; status: number } {
    const commentId = sanitizeId(commentIdRaw);
    const target = this.db.comments.find((c) => c.id === commentId);
    if (!target) {
      return { error: 'Komentar tidak ditemukan.', status: 404 };
    }

    if (patch.status && ['published', 'pending', 'hidden'].includes(patch.status)) {
      target.status = patch.status;
    }

    if (typeof patch.pinned === 'boolean') {
      target.pinned = patch.pinned;
    }

    if (patch.adminReply !== undefined) {
      if (patch.adminReply === null || String(patch.adminReply).trim() === '') {
        target.adminReply = null;
      } else {
        target.adminReply = {
          content: sanitizePlainText(patch.adminReply, 1500),
          repliedAt: new Date().toISOString(),
          adminEmail: patch.adminEmail,
        };
      }
    }

    target.updatedAt = new Date().toISOString();
    this.persist();

    return {
      comment: this.toPublicComment(target),
      stats: this.toPublicStats(target.articleId),
    };
  }

  public adminManageArticle(
    articleIdRaw: string,
    action: {
      title?: string;
      commentsLocked?: boolean;
      resetViews?: boolean;
      resetLikes?: boolean;
      clearComments?: boolean;
    }
  ): PublicArticleStats | null {
    const articleId = sanitizeId(articleIdRaw);
    if (!articleId) return null;

    const record = this.ensureArticle(articleId, action.title);

    if (typeof action.commentsLocked === 'boolean') {
      record.commentsLocked = action.commentsLocked;
    }
    if (action.resetViews) {
      record.views = 0;
      record.uniqueReaderIds = [];
      record.recentViewsByReader = {};
      record.lastViewedAt = null;
    }
    if (action.resetLikes) {
      record.likedByReaderIds = [];
    }
    if (action.clearComments) {
      this.db.comments = this.db.comments.filter((c) => c.articleId !== articleId);
    }

    record.updatedAt = new Date().toISOString();
    this.persist();

    return this.toPublicStats(articleId);
  }

  public getAdminOverview() {
    const allStats = Object.values(this.getSummaryMap());
    const totalViews = allStats.reduce((sum, s) => sum + s.views, 0);
    const totalLikes = allStats.reduce((sum, s) => sum + s.likes, 0);

    const publishedComments = this.db.comments.filter((c) => c.status === 'published').length;
    const pendingComments = this.db.comments.filter((c) => c.status === 'pending').length;
    const hiddenComments = this.db.comments.filter((c) => c.status === 'hidden').length;

    const comments: PublicCommentDTO[] = [...this.db.comments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((c) => this.toPublicComment(c));

    return {
      totals: {
        totalViews,
        totalLikes,
        totalComments: this.db.comments.length,
        publishedComments,
        pendingComments,
        hiddenComments,
        trackedArticles: allStats.length,
      },
      moderationSettings: { ...this.db.moderationSettings },
      articles: allStats.sort((a, b) => b.views - a.views || b.likes - a.likes),
      comments,
      adminEmail: this.getAdminEmail(),
      passwordManagedByEnv: false,
    };
  }
}

export const engagementStore = new EngagementStore();
