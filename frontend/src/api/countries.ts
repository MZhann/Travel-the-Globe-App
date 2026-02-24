export interface CountryFromAPI {
  _id?: string;
  name: string;
  iso2: string;
  iso3: string;
  region?: string;
  subregion?: string;
}

import { API_BASE } from './config';

export async function fetchCountries(): Promise<CountryFromAPI[]> {
  const res = await fetch(`${API_BASE}/countries`);
  if (!res.ok) throw new Error('Failed to fetch countries');
  return res.json();
}

export async function fetchCountryByIso2(iso2: string): Promise<CountryFromAPI | null> {
  const res = await fetch(`${API_BASE}/countries/${iso2}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch country');
  return res.json();
}
