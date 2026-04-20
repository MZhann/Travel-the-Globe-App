/**
 * Country boundaries (Natural Earth 110m).
 * 1) Same-origin file — created by `prebuild` (see scripts/fetch-geojson.mjs) so deploys do not rely on GitHub raw.
 * 2–3) Public CDNs as fallback (e.g. local `vite` before first build).
 */
export const GEOJSON_URLS = [
  '/geojson/ne_110m_admin_0_countries.geojson',
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson',
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
] as const;

export async function fetchCountriesGeoJson<T>(): Promise<T> {
  let lastError: unknown;
  for (const url of GEOJSON_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error('Failed to load country boundaries');
}
