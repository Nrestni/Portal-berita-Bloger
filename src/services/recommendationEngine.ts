/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NewsArticle, ThematicCategory } from '../types/blogger';

export const ALL_THEMATIC_CATEGORIES: ThematicCategory[] = [
  'Teknologi',
  'Nasional',
  'Ekonomi',
  'Bisnis',
  'Pendidikan',
  'Lingkungan',
  'Opini',
];

const PREFERRED_TOPICS_KEY = 'newsapp_preferred_topics';

const CATEGORY_KEYWORDS: Record<ThematicCategory, string[]> = {
  Teknologi: [
    'teknologi',
    'digital',
    'ai',
    'kecerdasan buatan',
    'cyber',
    'siber',
    'internet',
    'privasi',
    'gadget',
    'aplikasi',
    'perangkat lunak',
    'data',
    'algoritma',
    'media sosial',
    'penipuan digital',
    'jejak digital',
    'masa depan',
  ],
  Nasional: [
    'nasional',
    'indonesia',
    'pemerintah',
    'negara',
    'publik',
    'kebijakan',
    'hukum',
    'daerah',
    'masyarakat',
    'warga',
  ],
  Ekonomi: [
    'ekonomi',
    'anggaran',
    'anggaran negara',
    'apbn',
    'inflasi',
    'rupiah',
    'pajak',
    'keuangan',
    'fiskal',
    'moneter',
    'suku bunga',
    'bank',
    'daya beli',
  ],
  Bisnis: [
    'bisnis',
    'usaha',
    'industri',
    'perusahaan',
    'pasar',
    'investasi',
    'saham',
    'kerja',
    'pekerjaan',
    'karier',
    'umkm',
    'ekonomi digital',
  ],
  Pendidikan: [
    'pendidikan',
    'sekolah',
    'kampus',
    'mahasiswa',
    'guru',
    'siswa',
    'belajar',
    'literasi',
    'akademik',
    'kurikulum',
  ],
  Lingkungan: [
    'lingkungan',
    'iklim',
    'alam',
    'sampah',
    'energi',
    'hijau',
    'polusi',
    'hutan',
    'bencana',
    'ekologi',
    'bumi',
  ],
  Opini: [
    'opini',
    'kritik',
    'kritik sosial',
    'kebebasan berpendapat',
    'refleksi',
    'esai',
    'pandangan',
    'kesehatan digital',
    'sosial',
    'budaya',
  ],
};

/**
 * Infer relevant Indonesian thematic categories from Blogger labels and title/excerpt
 * without altering original Blogger labels.
 */
export function inferThematicCategories(
  labels: string[],
  title: string,
  excerpt: string
): ThematicCategory[] {
  const matched = new Set<ThematicCategory>();
  const labelText = labels.join(' ').toLowerCase();
  const titleAndLead = `${title} ${excerpt}`.toLowerCase();

  for (const category of ALL_THEMATIC_CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category];
    const inLabels = keywords.some((kw) => labelText.includes(kw));
    if (inLabels) {
      matched.add(category);
      continue;
    }
    const inTitle = keywords.some((kw) => title.toLowerCase().includes(kw));
    if (inTitle) {
      matched.add(category);
    } else {
      // Require stronger match in body excerpt
      const matchCount = keywords.filter((kw) => titleAndLead.includes(kw)).length;
      if (matchCount >= 2) {
        matched.add(category);
      }
    }
  }

  return Array.from(matched);
}

export function getPreferredTopics(): ThematicCategory[] {
  try {
    const raw = localStorage.getItem(PREFERRED_TOPICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is ThematicCategory =>
      ALL_THEMATIC_CATEGORIES.includes(t as ThematicCategory)
    );
  } catch {
    return [];
  }
}

export function savePreferredTopics(topics: ThematicCategory[]): void {
  try {
    localStorage.setItem(PREFERRED_TOPICS_KEY, JSON.stringify(topics));
  } catch {}
}

export interface RecommendedItem {
  article: NewsArticle;
  reason: string;
}

export interface RecommendationResult {
  items: RecommendedItem[];
  isPersonalized: boolean;
  summaryNote: string;
  topCategories: string[];
}

/**
 * Compute personalized article recommendations strictly from real user interactions:
 * 1. Reading history frequency
 * 2. Saved bookmarks
 * 3. User-selected preferred topics
 * Falls back honestly to latest articles if no activity exists yet.
 */
export function getPersonalizedRecommendations(
  allArticles: NewsArticle[],
  historyArticles: NewsArticle[],
  bookmarkedIds: string[],
  preferredTopics: ThematicCategory[] = [],
  limit = 4
): RecommendationResult {
  if (allArticles.length === 0) {
    return {
      items: [],
      isPersonalized: false,
      summaryNote: 'Menunggu artikel dimuat dari Blogger.',
      topCategories: [],
    };
  }

  const labelWeights = new Map<string, number>();
  const themeWeights = new Map<string, number>();
  const readIds = new Set(historyArticles.map((h) => h.id));
  const savedSet = new Set(bookmarkedIds);

  // 1. Weight from reading history (more recent = slightly higher weight)
  historyArticles.forEach((art, idx) => {
    const recencyBoost = Math.max(1, 2.5 - idx * 0.15);
    art.labels.forEach((lbl) => {
      const k = lbl.toLowerCase();
      labelWeights.set(k, (labelWeights.get(k) || 0) + 2 * recencyBoost);
    });
    (art.thematicCategories || []).forEach((th) => {
      themeWeights.set(th, (themeWeights.get(th) || 0) + 1.5 * recencyBoost);
    });
  });

  // 2. Weight from saved bookmarks (strong explicit interest signal)
  allArticles
    .filter((a) => savedSet.has(a.id))
    .forEach((art) => {
      art.labels.forEach((lbl) => {
        const k = lbl.toLowerCase();
        labelWeights.set(k, (labelWeights.get(k) || 0) + 4);
      });
      (art.thematicCategories || []).forEach((th) => {
        themeWeights.set(th, (themeWeights.get(th) || 0) + 3);
      });
    });

  // 3. Weight from explicit user topic preferences
  preferredTopics.forEach((topic) => {
    themeWeights.set(topic, (themeWeights.get(topic) || 0) + 3.5);
  });

  const hasSignals = labelWeights.size > 0 || themeWeights.size > 0;

  // Honest fallback when user has no reading history, bookmarks, or preferred topics
  if (!hasSignals) {
    const latest = [...allArticles]
      .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
      .slice(0, limit)
      .map((article) => ({
        article,
        reason: `Kiriman terbaru · ${article.primaryCategory}`,
      }));

    return {
      items: latest,
      isPersonalized: false,
      summaryNote: 'Menampilkan artikel terbaru dari Blogger. Baca atau simpan artikel agar rekomendasi menyesuaikan minat Anda.',
      topCategories: [],
    };
  }

  // Score candidate articles
  const scored = allArticles.map((article) => {
    let score = 0;
    let bestMatchLabel = '';
    let bestMatchScore = 0;

    article.labels.forEach((lbl) => {
      const w = labelWeights.get(lbl.toLowerCase()) || 0;
      if (w > 0) {
        score += w;
        if (w > bestMatchScore) {
          bestMatchScore = w;
          bestMatchLabel = lbl;
        }
      }
    });

    (article.thematicCategories || []).forEach((th) => {
      const w = themeWeights.get(th) || 0;
      if (w > 0) {
        score += w;
        if (w > bestMatchScore) {
          bestMatchScore = w;
          bestMatchLabel = th;
        }
      }
    });

    // Prioritize articles the user hasn't read yet so recommendations feel fresh
    const isUnread = !readIds.has(article.id);
    if (isUnread && score > 0) {
      score += 3;
    } else if (!isUnread) {
      score *= 0.35;
    }

    let reason = `Terbaru di ${article.primaryCategory}`;
    if (bestMatchLabel) {
      if (preferredTopics.includes(bestMatchLabel as ThematicCategory)) {
        reason = `Sesuai topik pilihan Anda: ${bestMatchLabel}`;
      } else if (savedSet.size > 0) {
        reason = `Selaras dengan bacaan & simpanan: ${bestMatchLabel}`;
      } else {
        reason = `Berdasarkan riwayat bacaan: ${bestMatchLabel}`;
      }
    }

    return { article, score, reason, isUnread };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.article.published).getTime() - new Date(a.article.published).getTime();
  });

  const topCategories = [
    ...Array.from(themeWeights.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k),
    ...Array.from(labelWeights.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k),
  ].slice(0, 3);

  return {
    items: scored.slice(0, limit).map(({ article, reason }) => ({ article, reason })),
    isPersonalized: true,
    summaryNote: `Disusun dari ${historyArticles.length} riwayat bacaan${bookmarkedIds.length > 0 ? ` dan ${bookmarkedIds.length} artikel tersimpan` : ''}.`,
    topCategories,
  };
}
