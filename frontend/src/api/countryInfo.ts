/**
 * Country Info & News APIs.
 * - Country data: proxied through our backend (which calls REST Countries API)
 * - News: proxied through our backend (which calls GNews API)
 */

import { API_BASE } from './config';

// ---------- Country Info (REST Countries via backend proxy) ----------

export interface CountryInfoData {
  name: {
    common: string;
    official: string;
    nativeName?: Record<string, { official: string; common: string }>;
  };
  flags: { svg: string; png: string; alt?: string };
  coatOfArms?: { svg?: string; png?: string };
  capital?: string[];
  capitalInfo?: { latlng?: [number, number] };
  population: number;
  area: number;
  region: string;
  subregion?: string;
  continents?: string[];
  languages?: Record<string, string>;
  currencies?: Record<string, { name: string; symbol: string }>;
  timezones?: string[];
  borders?: string[];
  maps?: { googleMaps?: string; openStreetMaps?: string };
  car?: { signs?: string[]; side?: string };
  unMember?: boolean;
  startOfWeek?: string;
  latlng?: [number, number];
  tld?: string[];
}

export async function fetchCountryInfo(iso2: string): Promise<CountryInfoData | null> {
  try {
    const res = await fetch(`${API_BASE}/country-info/${iso2}`);
    if (!res.ok) return null;
    return res.json() as Promise<CountryInfoData>;
  } catch {
    return null;
  }
}

// ---------- Country News (GNews via backend proxy) ----------

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: string;
}

export interface NewsResponse {
  articles: NewsArticle[];
  note?: string;
}

export async function fetchCountryNews(
  iso2: string,
  countryName?: string
): Promise<NewsResponse> {
  try {
    const params = new URLSearchParams();
    if (countryName) params.set('name', countryName);
    const res = await fetch(`${API_BASE}/country-news/${iso2}?${params.toString()}`);
    if (!res.ok) return { articles: [], note: 'News unavailable' };
    return res.json() as Promise<NewsResponse>;
  } catch {
    return { articles: [], note: 'News unavailable' };
  }
}

// ---------- Helpers ----------

export function formatPopulation(pop: number): string {
  if (pop >= 1_000_000_000) return `${(pop / 1_000_000_000).toFixed(2)}B`;
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(1)}K`;
  return pop.toString();
}

export function formatArea(area: number): string {
  return area.toLocaleString() + ' km²';
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

