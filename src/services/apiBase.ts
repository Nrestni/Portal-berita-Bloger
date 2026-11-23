/**
 * API Base URL helper.
 *
 * - Development (npm run dev): server Express jalan di host yang sama,
 *   path relatif /api/... langsung diteruskan oleh Vite proxy.
 * - Production di Firebase Hosting: frontend di-serve dari Firebase,
 *   tapi Express server ada di Render. VITE_API_URL di-inject saat build
 *   sehingga semua fetch diarahkan ke https://newsapp-bloger-api.onrender.com
 */
const VITE_API_URL = import.meta.env.VITE_API_URL as string | undefined;

export function apiUrl(path: string): string {
  // path harus selalu dimulai dengan /api/...
  if (VITE_API_URL) {
    // Hindari double slash
    const base = VITE_API_URL.replace(/\/$/, '');
    return `${base}${path}`;
  }
  // Fallback: relatif ke host saat ini (dev server / Render all-in-one)
  return path;
}
