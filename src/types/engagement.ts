/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CommentStatus = 'published' | 'pending' | 'hidden';

export interface AdminReplyInfo {
  content: string;
  repliedAt: string;
  adminEmail: string;
}

export interface ArticleEngagementStats {
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

export interface AppComment {
  id: string;
  articleId: string;
  articleTitle: string;
  authorName: string;
  isAdminAuthor: boolean;
  content: string;
  status: CommentStatus;
  pinned: boolean;
  adminReply: AdminReplyInfo | null;
  isMine: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationSettings {
  requireApproval: boolean;
}

export interface AdminSessionResponse {
  authenticated: boolean;
  email: string | null;
  adminEmail: string;
  allowedAdminEmails?: string[];
  setupRequired: boolean;
  moderationSettings: ModerationSettings;
}

export interface ReaderProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ReaderSessionResponse {
  authenticated: boolean;
  reader: ReaderProfile | null;
}

export interface AdminOverviewResponse {
  totals: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    publishedComments: number;
    pendingComments: number;
    hiddenComments: number;
    trackedArticles: number;
  };
  moderationSettings: ModerationSettings;
  articles: ArticleEngagementStats[];
  comments: AppComment[];
  adminEmail: string;
  passwordManagedByEnv: boolean;
}
