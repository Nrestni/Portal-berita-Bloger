/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ThematicCategory =
  | 'Teknologi'
  | 'Nasional'
  | 'Ekonomi'
  | 'Bisnis'
  | 'Pendidikan'
  | 'Lingkungan'
  | 'Opini';

export interface BloggerAuthor {
  id?: string;
  displayName: string;
  url?: string;
  image?: {
    url: string;
  };
}

export interface BloggerPostRaw {
  kind?: string;
  id: string;
  blog: {
    id: string;
  };
  published: string;
  updated?: string;
  url: string;
  selfLink?: string;
  title: string;
  content: string;
  images?: Array<{
    url: string;
  }>;
  author: BloggerAuthor;
  labels?: string[];
  etag?: string;
}

export interface BloggerResponse {
  kind: string;
  items?: BloggerPostRaw[];
  nextPageToken?: string;
  prevPageToken?: string;
  etag?: string;
  _cachedAt?: string;
}

export interface BlogInfo {
  id: string;
  name: string;
  description?: string;
  published?: string;
  updated?: string;
  url: string;
  posts?: {
    totalItems: number;
    selfLink?: string;
  };
  _cachedAt?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  plainTextFull: string;
  plainTextExcerpt: string;
  thumbnail: string | null;
  labels: string[];
  primaryCategory: string;
  thematicCategories: ThematicCategory[];
  published: string;
  publishedFormatted: string;
  publishedRelative: string;
  url: string;
  readingTime: number;
  author: {
    displayName: string;
    avatarUrl?: string;
  };
}

export interface BloggerConfig {
  blogId: string;
}

export interface DynamicCategory {
  name: string;
  count: number;
}
