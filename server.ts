/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { engagementStore } from './server/engagementStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_BLOG_ID = (process.env.BLOGGER_BLOG_ID || '4682143712664244285').trim();

function getBloggerApiKey(): string {
  return (
    process.env.BLOGGER_API_KEY ||
    process.env.VITE_BLOGGER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ''
  ).trim();
}

// Simple TTL in-memory cache to protect external API quotas
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  cachedAt: string;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): { data: T; cachedAt: string } | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return { data: entry.data as T, cachedAt: entry.cachedAt };
}

function setCached<T>(key: string, data: T, ttlMs: number): string {
  const cachedAt = new Date().toISOString();
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    cachedAt,
  });
  return cachedAt;
}

// Curated company names for IDX & Global benchmarks so tickers display clear Indonesian labels
const KNOWN_SYMBOLS: Record<string, { name: string; market: 'INDEKS_IDX' | 'IDX' | 'GLOBAL'; sector?: string }> = {
  '^JKSE': { name: 'IHSG (Indeks Harga Saham Gabungan)', market: 'INDEKS_IDX', sector: 'Indeks Utama BEI' },
  'BBCA.JK': { name: 'PT Bank Central Asia Tbk', market: 'IDX', sector: 'Perbankan' },
  'BBRI.JK': { name: 'PT Bank Rakyat Indonesia (Persero) Tbk', market: 'IDX', sector: 'Perbankan' },
  'BMRI.JK': { name: 'PT Bank Mandiri (Persero) Tbk', market: 'IDX', sector: 'Perbankan' },
  'BBNI.JK': { name: 'PT Bank Negara Indonesia (Persero) Tbk', market: 'IDX', sector: 'Perbankan' },
  'TLKM.JK': { name: 'PT Telkom Indonesia (Persero) Tbk', market: 'IDX', sector: 'Telekomunikasi & Digital' },
  'ASII.JK': { name: 'PT Astra International Tbk', market: 'IDX', sector: 'Otomotif & Konglomerasi' },
  'GOTO.JK': { name: 'PT GoTo Gojek Tokopedia Tbk', market: 'IDX', sector: 'Teknologi & Ekosistem Digital' },
  'UNVR.JK': { name: 'PT Unilever Indonesia Tbk', market: 'IDX', sector: 'Konsumer Primer' },
  'ICBP.JK': { name: 'PT Indofood CBP Sukses Makmur Tbk', market: 'IDX', sector: 'Konsumer Primer' },
  'KLBF.JK': { name: 'PT Kalbe Farma Tbk', market: 'IDX', sector: 'Kesehatan & Farmasi' },
  'AMRT.JK': { name: 'PT Sumber Alfaria Trijaya Tbk', market: 'IDX', sector: 'Ritel Modern' },
  'ANTM.JK': { name: 'PT Aneka Tambang Tbk', market: 'IDX', sector: 'Pertambangan & Hilirisasi' },
  '^GSPC': { name: 'S&P 500 (Amerika Serikat)', market: 'GLOBAL', sector: 'Indeks Global' },
  '^IXIC': { name: 'NASDAQ Composite (AS)', market: 'GLOBAL', sector: 'Indeks Teknologi Global' },
  '^DJI': { name: 'Dow Jones Industrial Average', market: 'GLOBAL', sector: 'Indeks Global' },
  '^N225': { name: 'Nikkei 225 (Jepang)', market: 'GLOBAL', sector: 'Indeks Asia' },
  '^HSI': { name: 'Hang Seng Index (Hong Kong)', market: 'GLOBAL', sector: 'Indeks Asia' },
  '^STI': { name: 'Straits Times Index (Singapura)', market: 'GLOBAL', sector: 'Indeks ASEAN' },
};

const DEFAULT_SYMBOLS = [
  '^JKSE',
  'BBCA.JK',
  'BBRI.JK',
  'BMRI.JK',
  'TLKM.JK',
  'ASII.JK',
  'GOTO.JK',
  'ICBP.JK',
  'KLBF.JK',
  'ANTM.JK',
  '^GSPC',
  '^IXIC',
  '^N225',
  '^STI',
];

function classifyMarketStatus(symbol: string, regularMarketTimeSec?: number): {
  statusLabel: 'Data Tertunda Bursa' | 'Data Penutupan Pasar';
  delayNote: string;
} {
  if (!regularMarketTimeSec) {
    return {
      statusLabel: 'Data Penutupan Pasar',
      delayNote: 'Kuotasi publik mengacu pada penutupan perdagangan terakhir',
    };
  }
  const ageMinutes = (Date.now() - regularMarketTimeSec * 1000) / 60000;
  // Free public Yahoo Finance feeds are delayed 10-20 mins during market hours, or reflect market close
  if (ageMinutes <= 45) {
    const delay = symbol.endsWith('.JK') || symbol === '^JKSE' ? '15 menit (BEI)' : '15–20 menit';
    return {
      statusLabel: 'Data Tertunda Bursa',
      delayNote: `Kuotasi publik tertunda sekitar ${delay}`,
    };
  }
  return {
    statusLabel: 'Data Penutupan Pasar',
    delayNote: 'Harga penutupan sesi perdagangan terakhir yang tercatat',
  };
}

async function fetchYahooQuoteSingle(symbol: string) {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cacheKey = `yf_quote_${cleanSymbol}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached.data;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}?interval=1d&range=5d`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NewsApp/1.0)',
      'Accept': 'application/json',
    },
  });

  if (!resp.ok) {
    throw new Error(`HTTP_${resp.status}`);
  }

  const json: any = await resp.json();
  const result = json?.chart?.result?.[0];
  if (!result || !result.meta) {
    throw new Error('SYMBOL_NOT_FOUND');
  }

  const meta = result.meta;
  const quotes = result.indicators?.quote?.[0] || {};
  const closes: number[] = (quotes.close || []).filter((v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v));
  const highs: number[] = (quotes.high || []).filter((v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v));
  const lows: number[] = (quotes.low || []).filter((v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v));
  const volumes: number[] = (quotes.volume || []).filter((v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v));

  const price = typeof meta.regularMarketPrice === 'number'
    ? meta.regularMarketPrice
    : closes[closes.length - 1];

  // Determine previous session close accurately
  let prevClose = typeof meta.previousClose === 'number'
    ? meta.previousClose
    : typeof meta.chartPreviousClose === 'number'
    ? meta.chartPreviousClose
    : closes.length >= 2
    ? closes[closes.length - 2]
    : price;

  if (!prevClose || Number.isNaN(prevClose)) {
    prevClose = price;
  }

  // If 5d daily candles exist and last close matches current price, second-to-last daily candle is true 1D previous close
  if (closes.length >= 2 && Math.abs(closes[closes.length - 1] - price) < 0.0001) {
    prevClose = closes[closes.length - 2];
  }

  const change = price - prevClose;
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  const known = KNOWN_SYMBOLS[cleanSymbol];
  const inferredMarket: 'INDEKS_IDX' | 'IDX' | 'GLOBAL' = known
    ? known.market
    : cleanSymbol === '^JKSE'
    ? 'INDEKS_IDX'
    : cleanSymbol.endsWith('.JK')
    ? 'IDX'
    : 'GLOBAL';

  const marketStatus = classifyMarketStatus(cleanSymbol, meta.regularMarketTime);

  const item = {
    symbol: cleanSymbol,
    displaySymbol: cleanSymbol.replace('.JK', '').replace('^', ''),
    name: known?.name || meta.longName || meta.shortName || cleanSymbol,
    sector: known?.sector || meta.exchangeName || (inferredMarket === 'IDX' ? 'Ekuitas BEI' : 'Pasar Global'),
    market: inferredMarket,
    price,
    previousClose: prevClose,
    change,
    changePercent,
    currency: meta.currency || (inferredMarket !== 'GLOBAL' ? 'IDR' : 'USD'),
    dayHigh: typeof meta.regularMarketDayHigh === 'number' ? meta.regularMarketDayHigh : highs[highs.length - 1] ?? null,
    dayLow: typeof meta.regularMarketDayLow === 'number' ? meta.regularMarketDayLow : lows[lows.length - 1] ?? null,
    volume: typeof meta.regularMarketVolume === 'number' ? meta.regularMarketVolume : volumes[volumes.length - 1] ?? null,
    sparkline: closes.slice(-5),
    updatedAt: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
    statusLabel: marketStatus.statusLabel,
    delayNote: marketStatus.delayNote,
    source: 'Yahoo Finance Chart API (Bursa Efek Indonesia / Global)',
  };

  setCached(cacheKey, item, 60_000); // 60 seconds cache
  return item;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // CORS — izinkan Firebase Hosting dan localhost mengakses API
  const ALLOWED_ORIGINS = [
    'https://newsapp-bloger.web.app',
    'https://newsapp-bloger.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  app.use((req: Request, res: Response, next: () => void) => {
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-reader-id,x-reader-secret,x-reader-token,x-admin-token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  // 1. Health & Source Configuration Status
  app.get('/api/status', (_req: Request, res: Response) => {
    const hasBloggerKey = Boolean(getBloggerApiKey());
    res.json({
      timestamp: new Date().toISOString(),
      blogger: {
        configured: hasBloggerKey,
        blogId: DEFAULT_BLOG_ID,
        provider: 'Google Blogger API v3.0 (Server Proxy)',
      },
      stocks: {
        configured: true,
        provider: 'Yahoo Finance Public Market Feed (IDX & Global)',
        note: 'Kuotasi pasar bersifat tertunda (delayed 15–20 menit) atau harga penutupan pasar sesuai ketentuan feed publik.',
      },
      economy: {
        configured: true,
        providers: [
          'World Bank Open Data API v2 (Indikator Makroekonomi Indonesia)',
          'Frankfurter API / European Central Bank (Kurs Valuta Asing terhadap Rupiah)',
        ],
      },
      techTrends: {
        configured: true,
        providers: [
          `Blogger Utama (ID: ${DEFAULT_BLOG_ID})`,
          'DEV Community Public API (Referensi Tren Pengembang & AI)',
        ],
      },
    });
  });

  // 2. Blogger Blog Info Proxy
  app.get('/api/blogger/info', async (req: Request, res: Response) => {
    const apiKey = getBloggerApiKey();
    const blogId = String(req.query.blogId || DEFAULT_BLOG_ID).trim();

    if (!apiKey) {
      res.status(503).json({
        code: 'CONFIG_MISSING',
        message: 'Kredensial BLOGGER_API_KEY belum dikonfigurasi pada environment server.',
      });
      return;
    }

    const cacheKey = `blogger_info_${blogId}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      res.json({ ...cached.data, _cachedAt: cached.cachedAt });
      return;
    }

    try {
      const url = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errBody: any = await response.json().catch(() => ({}));
        const msg = errBody?.error?.message || response.statusText;
        const code =
          response.status === 429
            ? 'QUOTA_EXCEEDED'
            : response.status === 403
            ? 'ACCESS_DENIED'
            : response.status === 404
            ? 'BLOG_NOT_FOUND'
            : 'API_ERROR';
        res.status(response.status).json({ code, message: msg });
        return;
      }
      const data = await response.json();
      const cachedAt = setCached(cacheKey, data, 5 * 60_000);
      res.json({ ...data, _cachedAt: cachedAt });
    } catch (err: any) {
      res.status(502).json({
        code: 'NETWORK_ERROR',
        message: `Gagal menghubungi layanan Blogger API: ${err?.message || 'Kesalahan jaringan'}`,
      });
    }
  });

  // 3. Blogger Posts Proxy (v3.0)
  app.get('/api/blogger/posts', async (req: Request, res: Response) => {
    const apiKey = getBloggerApiKey();
    const blogId = String(req.query.blogId || DEFAULT_BLOG_ID).trim();
    const pageToken = req.query.pageToken ? String(req.query.pageToken).trim() : '';
    const searchQuery = req.query.q ? String(req.query.q).trim() : '';
    const forceRefresh = req.query.refresh === '1';

    if (!apiKey) {
      res.status(503).json({
        code: 'CONFIG_MISSING',
        message: 'BLOGGER_API_KEY belum diatur pada environment server (.env). Silakan konfigurasikan kredensial server untuk memuat artikel Blogger.',
      });
      return;
    }

    const cacheKey = `blogger_posts_${blogId}_${pageToken}_${searchQuery}`;
    if (!forceRefresh) {
      const cached = getCached<any>(cacheKey);
      if (cached) {
        res.json({ ...cached.data, _cachedAt: cached.cachedAt });
        return;
      }
    }

    try {
      let endpoint = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts`;
      const params = new URLSearchParams({
        key: apiKey,
        fetchBodies: 'true',
        fetchImages: 'true',
        maxResults: '25',
        orderBy: 'published',
      });

      if (pageToken) {
        params.set('pageToken', pageToken);
      }
      if (searchQuery) {
        endpoint = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/search`;
        params.set('q', searchQuery);
      }

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const errBody: any = await response.json().catch(() => ({}));
        const rawMsg = errBody?.error?.message || response.statusText;
        let code = 'API_ERROR';
        let message = `Terjadi kendala saat mengambil artikel dari Blogger (${rawMsg}).`;

        if (response.status === 429) {
          code = 'QUOTA_EXCEEDED';
          message = 'Batas kuota harian Blogger API v3 telah tercapai. Silakan coba kembali beberapa saat lagi.';
        } else if (response.status === 403) {
          code = 'ACCESS_DENIED';
          message = 'Akses Blogger API v3 ditolak atau kuota layanan sedang dibatasi.';
        } else if (response.status === 404) {
          code = 'BLOG_NOT_FOUND';
          message = `Blog dengan ID ${blogId} tidak ditemukan di Blogger.`;
        } else if (response.status === 400) {
          code = 'API_KEY_INVALID';
          message = 'Konfigurasi parameter atau kredensial Blogger API di server tidak valid.';
        }

        res.status(response.status).json({ code, message });
        return;
      }

      const data = await response.json();
      const cachedAt = setCached(cacheKey, data, 2 * 60_000); // 2 min TTL
      res.json({ ...data, _cachedAt: cachedAt });
    } catch (err: any) {
      res.status(502).json({
        code: 'NETWORK_ERROR',
        message: `Gagal terhubung ke Google Blogger API v3.0 (${err?.message || 'Koneksi gagal'}).`,
      });
    }
  });

  // 4. Blogger Post Comments Proxy (v3.0)
  app.get('/api/blogger/posts/:postId/comments', async (req: Request, res: Response) => {
    const apiKey = getBloggerApiKey();
    const blogId = String(req.query.blogId || DEFAULT_BLOG_ID).trim();
    const postId = String(req.params.postId || '').trim();

    if (!apiKey || !postId) {
      res.json({ items: [] });
      return;
    }

    const cacheKey = `blogger_comments_${blogId}_${postId}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      res.json(cached.data);
      return;
    }

    try {
      const url = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(postId)}/comments?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (!response.ok) {
        res.json({ items: [] });
        return;
      }
      const data = await response.json();
      setCached(cacheKey, data, 2 * 60_000);
      res.json(data);
    } catch {
      res.json({ items: [] });
    }
  });

  // 5. Stock Market Quotes (IDX / IHSG / Global)
  app.get('/api/stocks/quotes', async (req: Request, res: Response) => {
    const rawSymbols = req.query.symbols ? String(req.query.symbols) : '';
    const requestedSymbols = rawSymbols
      ? Array.from(
          new Set(
            rawSymbols
              .split(',')
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
          )
        ).slice(0, 25)
      : DEFAULT_SYMBOLS;

    try {
      const settled = await Promise.allSettled(
        requestedSymbols.map((sym) => fetchYahooQuoteSingle(sym))
      );

      const quotes = settled
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value);

      const failedSymbols = requestedSymbols.filter((_, idx) => settled[idx].status === 'rejected');

      if (quotes.length === 0) {
        res.status(503).json({
          code: 'MARKET_DATA_UNAVAILABLE',
          message: 'Layanan penyedia data pasar saham sedang tidak dapat dijangkau atau kuota permintaan publik terbatas. Data tidak ditampilkan untuk menjaga keakuratan.',
          failedSymbols,
        });
        return;
      }

      res.json({
        quotes,
        failedSymbols,
        fetchedAt: new Date().toISOString(),
        provider: 'Yahoo Finance Public Feed',
        disclaimer: 'Data pasar modal bersumber dari kuotasi publik bursa (tertunda 15–20 menit atau harga penutupan terakhir) dan bukan merupakan rekomendasi transaksi efek.',
      });
    } catch (err: any) {
      res.status(502).json({
        code: 'MARKET_NETWORK_ERROR',
        message: `Gagal memuat data pasar modal: ${err?.message || 'Kesalahan jaringan'}`,
      });
    }
  });

  // 6. Stock Historical Chart Data
  app.get('/api/stocks/chart/:symbol', async (req: Request, res: Response) => {
    const symbol = String(req.params.symbol || '^JKSE').trim().toUpperCase();
    const allowedRanges: Record<string, { range: string; interval: string }> = {
      '5d': { range: '5d', interval: '1h' },
      '1mo': { range: '1mo', interval: '1d' },
      '3mo': { range: '3mo', interval: '1d' },
      '6mo': { range: '6mo', interval: '1d' },
      '1y': { range: '1y', interval: '1wk' },
    };
    const reqRange = String(req.query.range || '1mo');
    const cfg = allowedRanges[reqRange] || allowedRanges['1mo'];

    const cacheKey = `yf_chart_${symbol}_${cfg.range}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      res.json(cached.data);
      return;
    }

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${cfg.interval}&range=${cfg.range}`;
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsApp/1.0)',
          Accept: 'application/json',
        },
      });

      if (!resp.ok) {
        res.status(resp.status).json({
          code: 'CHART_UNAVAILABLE',
          message: `Data grafik historis untuk ${symbol} belum tersedia dari penyedia data (HTTP ${resp.status}).`,
        });
        return;
      }

      const json: any = await resp.json();
      const result = json?.chart?.result?.[0];
      const timestamps: number[] = result?.timestamp || [];
      const quote = result?.indicators?.quote?.[0] || {};
      const closes: Array<number | null> = quote.close || [];
      const highs: Array<number | null> = quote.high || [];
      const lows: Array<number | null> = quote.low || [];
      const volumes: Array<number | null> = quote.volume || [];

      const points = timestamps
        .map((ts, i) => {
          const close = closes[i];
          if (typeof close !== 'number' || Number.isNaN(close)) return null;
          return {
            timestamp: ts * 1000,
            isoDate: new Date(ts * 1000).toISOString(),
            close,
            high: typeof highs[i] === 'number' ? highs[i] : close,
            low: typeof lows[i] === 'number' ? lows[i] : close,
            volume: typeof volumes[i] === 'number' ? volumes[i] : null,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      if (points.length === 0) {
        res.status(404).json({
          code: 'EMPTY_CHART',
          message: `Tidak ada titik data historis yang valid untuk ${symbol} pada rentang waktu ini.`,
        });
        return;
      }

      const meta = result.meta || {};
      const statusInfo = classifyMarketStatus(symbol, meta.regularMarketTime);
      const payload = {
        symbol,
        name: KNOWN_SYMBOLS[symbol]?.name || meta.longName || meta.shortName || symbol,
        currency: meta.currency || (symbol.endsWith('.JK') || symbol === '^JKSE' ? 'IDR' : 'USD'),
        range: reqRange,
        points,
        statusLabel: statusInfo.statusLabel,
        delayNote: statusInfo.delayNote,
        updatedAt: meta.regularMarketTime
          ? new Date(meta.regularMarketTime * 1000).toISOString()
          : new Date().toISOString(),
        source: 'Yahoo Finance Historical Feed',
      };

      setCached(cacheKey, payload, 2 * 60_000);
      res.json(payload);
    } catch (err: any) {
      res.status(502).json({
        code: 'CHART_NETWORK_ERROR',
        message: `Gagal memuat grafik harga saham: ${err?.message || 'Kesalahan jaringan'}`,
      });
    }
  });

  // 7. Stock Search & Official Market News Links
  app.get('/api/stocks/search', async (req: Request, res: Response) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ quotes: [], news: [] });
      return;
    }

    const cacheKey = `yf_search_${q.toLowerCase()}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      res.json(cached.data);
      return;
    }

    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=6`;
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsApp/1.0)',
          Accept: 'application/json',
        },
      });

      if (!resp.ok) {
        res.status(resp.status).json({
          code: 'SEARCH_FAILED',
          message: 'Pencarian kode saham sedang tidak tersedia.',
        });
        return;
      }

      const data: any = await resp.json();
      const rawQuotes: any[] = Array.isArray(data?.quotes) ? data.quotes : [];
      const rawNews: any[] = Array.isArray(data?.news) ? data.news : [];

      const quotes = rawQuotes
        .filter((item) => item.symbol && (item.quoteType === 'EQUITY' || item.quoteType === 'INDEX' || item.quoteType === 'ETF'))
        .map((item) => ({
          symbol: String(item.symbol),
          displaySymbol: String(item.symbol).replace('.JK', '').replace('^', ''),
          name: KNOWN_SYMBOLS[item.symbol]?.name || item.longname || item.shortname || item.symbol,
          exchange: item.exchDisp || item.exchange || '',
          quoteType: item.quoteType,
          isIndonesia: String(item.symbol).endsWith('.JK') || item.symbol === '^JKSE',
        }))
        .sort((a, b) => Number(b.isIndonesia) - Number(a.isIndonesia));

      const news = rawNews
        .filter((n) => n.title && n.link)
        .map((n) => ({
          id: String(n.uuid || n.link),
          title: String(n.title),
          publisher: String(n.publisher || 'Sumber Pasar'),
          url: String(n.link),
          publishedAt: n.providerPublishTime
            ? new Date(n.providerPublishTime * 1000).toISOString()
            : null,
          relatedTickers: Array.isArray(n.relatedTickers) ? n.relatedTickers : [],
        }));

      const payload = { quotes, news };
      setCached(cacheKey, payload, 3 * 60_000);
      res.json(payload);
    } catch (err: any) {
      res.status(502).json({
        code: 'SEARCH_ERROR',
        message: `Gagal mencari saham: ${err?.message || 'Kesalahan jaringan'}`,
      });
    }
  });

  // 8. Official Economic Indicators (ECB Frankfurter FX + World Bank Open Data IDN)
  app.get('/api/economy/indicators', async (req: Request, res: Response) => {
    const forceRefresh = req.query.refresh === '1';
    const cacheKey = 'economy_indicators_idn_v1';
    if (!forceRefresh) {
      const cached = getCached<any>(cacheKey);
      if (cached) {
        res.json({ ...cached.data, _cachedAt: cached.cachedAt });
        return;
      }
    }

    try {
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 35 * 86400_000).toISOString().slice(0, 10);

      const wbIndicatorsMeta = [
        {
          code: 'FP.CPI.TOTL.ZG',
          id: 'inflasi_ihk',
          name: 'Inflasi Harga Konsumen (IHK)',
          unit: '% per tahun (YoY)',
          description: 'Perubahan tahunan indeks harga konsumen rumah tangga di Indonesia.',
        },
        {
          code: 'NY.GDP.MKTP.KD.ZG',
          id: 'pertumbuhan_pdb',
          name: 'Pertumbuhan Ekonomi (PDB Riil)',
          unit: '% per tahun (YoY)',
          description: 'Laju pertumbuhan tahunan Produk Domestik Bruto atas dasar harga konstan.',
        },
        {
          code: 'FR.INR.LEND',
          id: 'suku_bunga_pinjaman',
          name: 'Suku Bunga Pinjaman Rata-rata',
          unit: '% per tahun (p.a.)',
          description: 'Rata-rata suku bunga kredit perbankan untuk kebutuhan pembiayaan jangka pendek & menengah.',
        },
        {
          code: 'FR.INR.RINR',
          id: 'suku_bunga_riil',
          name: 'Suku Bunga Riil',
          unit: '% per tahun (p.a.)',
          description: 'Suku bunga pinjaman yang telah disesuaikan terhadap inflasi (deflator PDB).',
        },
        {
          code: 'SL.UEM.TOTL.ZS',
          id: 'tingkat_pengangguran',
          name: 'Tingkat Pengangguran Terbuka',
          unit: '% dari angkatan kerja',
          description: 'Persentase angkatan kerja yang sedang aktif mencari pekerjaan (estimasi ILO/BPS melalui Bank Dunia).',
        },
      ];

      const [fxLatestRes, fxHistRes, ...wbResults] = await Promise.allSettled([
        fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR,EUR,SGD,JPY,GBP,AUD,CNY'),
        fetch(`https://api.frankfurter.dev/v1/${startDate}..${endDate}?base=USD&symbols=IDR`),
        ...wbIndicatorsMeta.map((ind) =>
          fetch(`https://api.worldbank.org/v2/country/IDN/indicator/${ind.code}?format=json&per_page=12`)
        ),
      ]);

      // Parse FX Data
      let exchangeRates: any = null;
      if (fxLatestRes.status === 'fulfilled' && fxLatestRes.value.ok) {
        const fxJson: any = await fxLatestRes.value.json();
        const rates = fxJson?.rates || {};
        const usdIdr = typeof rates.IDR === 'number' ? rates.IDR : null;

        let historyPoints: Array<{ date: string; close: number }> = [];
        if (fxHistRes.status === 'fulfilled' && fxHistRes.value.ok) {
          const histJson: any = await fxHistRes.value.json();
          const histRates = histJson?.rates || {};
          historyPoints = Object.entries(histRates)
            .map(([date, obj]: [string, any]) => ({
              date,
              close: typeof obj?.IDR === 'number' ? obj.IDR : NaN,
            }))
            .filter((p) => !Number.isNaN(p.close))
            .sort((a, b) => a.date.localeCompare(b.date));
        }

        if (usdIdr) {
          const prevUsdIdr =
            historyPoints.length >= 2
              ? historyPoints[historyPoints.length - 2].close
              : usdIdr;
          const usdChange = usdIdr - prevUsdIdr;
          const usdChangePct = prevUsdIdr !== 0 ? (usdChange / prevUsdIdr) * 100 : 0;

          const pairs: Array<{
            pair: string;
            label: string;
            multiplier: number;
            rateIdr: number;
            unit: string;
          }> = [
            { pair: 'USD/IDR', label: 'Dolar Amerika Serikat', multiplier: 1, rateIdr: usdIdr, unit: 'Rp per 1 USD' },
          ];

          const addCrossRate = (code: string, label: string, mult = 1) => {
            if (typeof rates[code] === 'number' && rates[code] > 0) {
              pairs.push({
                pair: mult === 100 ? `100 ${code}/IDR` : `${code}/IDR`,
                label,
                multiplier: mult,
                rateIdr: (usdIdr / rates[code]) * mult,
                unit: `Rp per ${mult} ${code}`,
              });
            }
          };

          addCrossRate('SGD', 'Dolar Singapura', 1);
          addCrossRate('EUR', 'Euro Eropa', 1);
          addCrossRate('JPY', 'Yen Jepang', 100);
          addCrossRate('GBP', 'Poundsterling Inggris', 1);
          addCrossRate('AUD', 'Dolar Australia', 1);
          addCrossRate('CNY', 'Yuan Tiongkok', 1);

          exchangeRates = {
            usdIdr,
            usdChange,
            usdChangePct,
            referenceDate: fxJson.date,
            dataType: 'Aktual',
            source: 'European Central Bank (melalui Frankfurter API)',
            pairs,
            usdIdrHistory: historyPoints.map((h) => ({
              timestamp: new Date(h.date).getTime(),
              isoDate: h.date,
              close: h.close,
              high: h.close,
              low: h.close,
              volume: null,
            })),
          };
        }
      }

      // Parse World Bank Macro Indicators (only keep indicators with valid real data)
      const macroIndicators: any[] = [];
      for (let i = 0; i < wbIndicatorsMeta.length; i++) {
        const meta = wbIndicatorsMeta[i];
        const resItem = wbResults[i];
        if (resItem.status !== 'fulfilled' || !resItem.value.ok) continue;

        const wbJson: any = await resItem.value.json().catch(() => null);
        const lastUpdatedHeader = wbJson?.[0]?.lastupdated || null;
        const series: any[] = Array.isArray(wbJson?.[1]) ? wbJson[1] : [];
        const validPoints = series
          .filter((row) => typeof row?.value === 'number' && !Number.isNaN(row.value))
          .map((row) => ({
            period: String(row.date),
            value: Number(row.value),
          }))
          .sort((a, b) => Number(b.period) - Number(a.period));

        if (validPoints.length === 0) continue;

        const latest = validPoints[0];
        const previous = validPoints[1] || null;

        macroIndicators.push({
          id: meta.id,
          code: meta.code,
          name: meta.name,
          description: meta.description,
          value: latest.value,
          unit: meta.unit,
          period: `Tahun ${latest.period}`,
          previousValue: previous ? previous.value : null,
          previousPeriod: previous ? `Tahun ${previous.period}` : null,
          dataType: 'Aktual',
          source: 'Bank Dunia (World Bank Open Data - Indonesia)',
          updatedAt: lastUpdatedHeader || null,
          history: validPoints.slice(0, 7).reverse(),
        });
      }

      // Official Statutory Policy Target Reference (explicitly distinguished as 'Target Kebijakan')
      const policyReferences = [
        {
          id: 'target_inflasi_bi',
          name: 'Sasaran Inflasi Nasional',
          valueDisplay: '2,5% ± 1% (1,5% – 3,5%)',
          unit: '% YoY',
          period: 'Sasaran Kebijakan Moneter',
          dataType: 'Target Kebijakan',
          source: 'Bank Indonesia & Pemerintah RI (PMK Sasaran Inflasi)',
          description: 'Rentang sasaran inflasi tahunan yang ditetapkan sebagai jangkar kebijakan moneter nasional, dibedakan dari realisasi inflasi aktual.',
        },
      ];

      if (!exchangeRates && macroIndicators.length === 0) {
        res.status(503).json({
          code: 'ECONOMY_DATA_UNAVAILABLE',
          message: 'Sumber data indikator ekonomi dan nilai tukar belum berhasil dimuat saat ini.',
        });
        return;
      }

      const payload = {
        fetchedAt: new Date().toISOString(),
        exchangeRates,
        macroIndicators,
        policyReferences,
      };

      const cachedAt = setCached(cacheKey, payload, 15 * 60_000);
      res.json({ ...payload, _cachedAt: cachedAt });
    } catch (err: any) {
      res.status(502).json({
        code: 'ECONOMY_NETWORK_ERROR',
        message: `Gagal mengambil indikator ekonomi resmi: ${err?.message || 'Kesalahan jaringan'}`,
      });
    }
  });

  // 9. Legal External Tech Trends Metadata (DEV Community Public API — links & metadata only)
  app.get('/api/tech-trends', async (_req: Request, res: Response) => {
    const cacheKey = 'external_tech_trends_v1';
    const cached = getCached<any>(cacheKey);
    if (cached) {
      res.json({ ...cached.data, _cachedAt: cached.cachedAt });
      return;
    }

    try {
      const resp = await fetch('https://dev.to/api/articles?per_page=8&top=7', {
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) {
        res.json({ items: [], provider: 'DEV Community Public API', available: false });
        return;
      }
      const raw: any[] = await resp.json();
      const items = (Array.isArray(raw) ? raw : []).slice(0, 8).map((art) => ({
        id: String(art.id),
        title: String(art.title || ''),
        description: String(art.description || ''),
        url: String(art.url || ''),
        publishedAt: String(art.published_at || ''),
        readingTimeMinutes: Number(art.reading_time_minutes || 3),
        authorName: String(art.user?.name || 'Kontributor Komunitas'),
        tags: Array.isArray(art.tag_list) ? art.tag_list.slice(0, 4) : [],
        coverImage: art.cover_image || art.social_image || null,
        sourceName: 'DEV Community (Tautan Resmi Eksternal)',
      }));

      const payload = {
        items,
        provider: 'DEV Community Public API',
        available: true,
        fetchedAt: new Date().toISOString(),
      };
      const cachedAt = setCached(cacheKey, payload, 10 * 60_000);
      res.json({ ...payload, _cachedAt: cachedAt });
    } catch {
      res.json({ items: [], provider: 'DEV Community Public API', available: false });
    }
  });

  // 10. Reader Account Auth (Instant Registration without Email Verification)
  const resolveActor = (req: Request) => {
    const adminCheck = engagementStore.verifyAdminToken(req.headers.authorization);
    const readerTokenHeader = req.headers['x-reader-token'];
    const readerCheck = engagementStore.verifyReaderToken(
      typeof readerTokenHeader === 'string' ? readerTokenHeader : undefined
    );
    const actorId = readerCheck.valid && readerCheck.reader
      ? readerCheck.reader.id
      : adminCheck.valid
      ? 'admin_account'
      : '';
    return { adminCheck, readerCheck, actorId };
  };

  app.get('/api/readers/session', (req: Request, res: Response) => {
    const readerTokenHeader = req.headers['x-reader-token'];
    const check = engagementStore.verifyReaderToken(
      typeof readerTokenHeader === 'string' ? readerTokenHeader : undefined
    );
    res.json({
      authenticated: check.valid,
      reader: check.valid && check.reader ? check.reader : null,
    });
  });

  app.post('/api/readers/register', (req: Request, res: Response) => {
    const result = engagementStore.registerReader({
      name: String(req.body?.name || ''),
      email: String(req.body?.email || ''),
      password: String(req.body?.password || ''),
    });
    if ('error' in result) {
      res.status(result.status).json({
        code: result.code || 'REGISTER_FAILED',
        message: result.error,
      });
      return;
    }
    res.status(201).json({
      authenticated: true,
      token: result.token,
      reader: result.reader,
    });
  });

  app.post('/api/readers/login', (req: Request, res: Response) => {
    const result = engagementStore.loginReader({
      email: String(req.body?.email || ''),
      password: String(req.body?.password || ''),
    });
    if ('error' in result) {
      res.status(result.status).json({
        code: 'READER_LOGIN_FAILED',
        message: result.error,
      });
      return;
    }
    res.json({
      authenticated: true,
      token: result.token,
      reader: result.reader,
    });
  });

  // 11. Article Engagement API (Views, Likes & Reader Comments)
  app.get('/api/engagement/summary', (req: Request, res: Response) => {
    const { actorId } = resolveActor(req);
    const stats = engagementStore.getSummaryMap(actorId || undefined);
    res.json({
      stats,
      moderationSettings: engagementStore.getModerationSettings(),
      fetchedAt: new Date().toISOString(),
    });
  });

  app.post('/api/engagement/articles/:articleId/view', (req: Request, res: Response) => {
    const articleId = String(req.params.articleId || '');
    const { actorId } = resolveActor(req);
    const fallbackVisitorId = String(req.body?.readerId || '');
    const stats = engagementStore.recordArticleView(
      articleId,
      actorId || fallbackVisitorId,
      req.body?.title ? String(req.body.title) : undefined
    );
    if (!stats) {
      res.status(400).json({ message: 'ID artikel tidak valid.' });
      return;
    }
    res.json({ stats });
  });

  app.post('/api/engagement/articles/:articleId/like', (req: Request, res: Response) => {
    const articleId = String(req.params.articleId || '');
    const { adminCheck, readerCheck, actorId } = resolveActor(req);
    if (!readerCheck.valid && !adminCheck.valid) {
      res.status(401).json({
        code: 'READER_AUTH_REQUIRED',
        message:
          'Hanya pembaca yang sudah mendaftar akun yang dapat menyukai berita. Silakan daftar akun terlebih dahulu.',
      });
      return;
    }
    const title = req.body?.title ? String(req.body.title) : undefined;
    const stats = engagementStore.toggleArticleLike(articleId, actorId, title);
    if (!stats) {
      res.status(400).json({ message: 'ID artikel atau akun tidak valid.' });
      return;
    }
    res.json({ stats });
  });

  app.get('/api/engagement/articles/:articleId/comments', (req: Request, res: Response) => {
    const articleId = String(req.params.articleId || '');
    const { adminCheck, actorId } = resolveActor(req);
    const result = engagementStore.getArticleComments(
      articleId,
      actorId || undefined,
      adminCheck.valid
    );
    if (!result) {
      res.status(400).json({ message: 'ID artikel tidak valid.' });
      return;
    }
    res.json(result);
  });

  app.post('/api/engagement/articles/:articleId/comments', (req: Request, res: Response) => {
    const articleId = String(req.params.articleId || '');
    const { adminCheck, readerCheck, actorId } = resolveActor(req);

    if (!readerCheck.valid && !adminCheck.valid) {
      res.status(401).json({
        code: 'READER_AUTH_REQUIRED',
        message:
          'Hanya pembaca yang sudah mendaftar akun yang dapat mengirim komentar. Silakan daftar akun terlebih dahulu.',
      });
      return;
    }

    const actingAsAdmin = adminCheck.valid && !readerCheck.valid;
    const authorName = actingAsAdmin
      ? String(req.body?.authorName || 'Admin Redaksi')
      : readerCheck.reader?.name || String(req.body?.authorName || '');

    const result = engagementStore.createComment({
      articleId,
      articleTitle: req.body?.articleTitle ? String(req.body.articleTitle) : undefined,
      authorName,
      content: String(req.body?.content || ''),
      readerId: actorId,
      readerSecret: String(req.body?.readerSecret || ''),
      isAdmin: actingAsAdmin,
      isVerifiedAccount: readerCheck.valid || adminCheck.valid,
    });
    if ('error' in result) {
      res.status(result.status).json({
        code: result.code || 'COMMENT_FAILED',
        message: result.error,
      });
      return;
    }
    res.status(201).json(result);
  });

  app.patch('/api/engagement/comments/:commentId', (req: Request, res: Response) => {
    const commentId = String(req.params.commentId || '');
    const { adminCheck, readerCheck, actorId } = resolveActor(req);
    const result = engagementStore.updateOwnComment({
      commentId,
      content: String(req.body?.content || ''),
      readerId: actorId || String(req.body?.readerId || ''),
      readerSecret: String(req.body?.readerSecret || ''),
      isVerifiedReader: readerCheck.valid,
      isAdmin: adminCheck.valid,
    });
    if ('error' in result) {
      res.status(result.status).json({ message: result.error });
      return;
    }
    res.json(result);
  });

  app.delete('/api/engagement/comments/:commentId', (req: Request, res: Response) => {
    const commentId = String(req.params.commentId || '');
    const { adminCheck, readerCheck, actorId } = resolveActor(req);
    const fallbackReaderId = req.query.readerId
      ? String(req.query.readerId)
      : String(req.body?.readerId || '');
    const readerSecret = req.headers['x-reader-secret']
      ? String(req.headers['x-reader-secret'])
      : String(req.body?.readerSecret || '');
    const result = engagementStore.deleteComment({
      commentId,
      readerId: actorId || fallbackReaderId,
      readerSecret,
      isVerifiedReader: readerCheck.valid,
      isAdmin: adminCheck.valid,
    });
    if ('error' in result) {
      res.status(result.status).json({ message: result.error });
      return;
    }
    res.json(result);
  });

  // 11. Admin Authentication & Management API
  const requireAdmin = (req: Request, res: Response): string | null => {
    const check = engagementStore.verifyAdminToken(req.headers.authorization);
    if (!check.valid || !check.email) {
      res.status(401).json({ message: 'Sesi Admin tidak valid atau telah berakhir. Silakan masuk kembali.' });
      return null;
    }
    return check.email;
  };

  app.get('/api/admin/session', (req: Request, res: Response) => {
    const check = engagementStore.verifyAdminToken(req.headers.authorization);
    res.json({
      authenticated: check.valid,
      email: check.valid ? check.email : null,
      adminEmail: engagementStore.getAdminEmail(),
      allowedAdminEmails: engagementStore.getAllowedEmails(),
      setupRequired: engagementStore.isPasswordSetupRequired(),
      moderationSettings: engagementStore.getModerationSettings(),
    });
  });

  app.post('/api/admin/setup', (_req: Request, res: Response) => {
    res.status(403).json({
      code: 'ADMIN_REGISTRATION_DISABLED',
      message: 'Akses Admin hanya untuk pengelola terdaftar. Gunakan menu Masuk Admin.',
      setupRequired: false,
    });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const result = engagementStore.loginAdmin(
      String(req.body?.email || ''),
      String(req.body?.password || '')
    );
    if ('error' in result) {
      res.status(result.status).json({
        code: result.code || 'LOGIN_FAILED',
        message: result.error,
        setupRequired: engagementStore.isPasswordSetupRequired(),
      });
      return;
    }
    res.json({
      authenticated: true,
      token: result.token,
      email: result.email,
      moderationSettings: engagementStore.getModerationSettings(),
    });
  });

  app.post('/api/admin/change-password', (req: Request, res: Response) => {
    const adminEmail = requireAdmin(req, res);
    if (!adminEmail) return;
    const result = engagementStore.changeAdminPassword(
      String(req.body?.currentPassword || ''),
      String(req.body?.newPassword || ''),
      adminEmail
    );
    if ('error' in result) {
      res.status(result.status).json({ message: result.error });
      return;
    }
    res.json(result);
  });

  app.get('/api/admin/overview', (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    res.json(engagementStore.getAdminOverview());
  });

  app.patch('/api/admin/settings', (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const settings = engagementStore.updateModerationSettings({
      requireApproval:
        typeof req.body?.requireApproval === 'boolean' ? req.body.requireApproval : undefined,
    });
    res.json({ moderationSettings: settings });
  });

  app.patch('/api/admin/articles/:articleId', (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const articleId = String(req.params.articleId || '');
    const stats = engagementStore.adminManageArticle(articleId, {
      title: req.body?.title ? String(req.body.title) : undefined,
      commentsLocked:
        typeof req.body?.commentsLocked === 'boolean' ? req.body.commentsLocked : undefined,
      resetViews: Boolean(req.body?.resetViews),
      resetLikes: Boolean(req.body?.resetLikes),
      clearComments: Boolean(req.body?.clearComments),
    });
    if (!stats) {
      res.status(400).json({ message: 'ID artikel tidak valid.' });
      return;
    }
    res.json({ stats });
  });

  app.patch('/api/admin/comments/:commentId', (req: Request, res: Response) => {
    const adminEmail = requireAdmin(req, res);
    if (!adminEmail) return;
    const commentId = String(req.params.commentId || '');
    const result = engagementStore.adminModerateComment(commentId, {
      status: req.body?.status,
      pinned: typeof req.body?.pinned === 'boolean' ? req.body.pinned : undefined,
      adminReply: req.body?.adminReply,
      adminEmail,
    });
    if ('error' in result) {
      res.status(result.status).json({ message: result.error });
      return;
    }
    res.json(result);
  });

  app.delete('/api/admin/comments/:commentId', (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const commentId = String(req.params.commentId || '');
    const result = engagementStore.deleteComment({
      commentId,
      isAdmin: true,
    });
    if ('error' in result) {
      res.status(result.status).json({ message: result.error });
      return;
    }
    res.json(result);
  });

  // Mount Vite dev middleware or serve static production build
  const distPath = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' || (fs.existsSync(path.join(distPath, 'index.html')) && process.env.npm_lifecycle_event === 'start');

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NewsApp server berjalan pada http://0.0.0.0:${PORT}`);
  });
}

startServer();
