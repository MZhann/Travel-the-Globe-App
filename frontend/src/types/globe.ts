/**
 * GeoJSON feature from Natural Earth (ne_110m_admin_0_countries).
 * Used for globe polygon data.
 */
export interface CountryFeatureProperties {
  ADMIN: string;
  ISO_A2: string;
  ISO_A3: string;
  NAME?: string;
  POP_EST?: number;
  [key: string]: unknown;
}

export interface CountryFeature {
  type: 'Feature';
  properties: CountryFeatureProperties;
  geometry: { type: string; coordinates: unknown };
  bbox?: [number, number, number, number];
}

export interface CountriesGeoJSON {
  type: 'FeatureCollection';
  features: CountryFeature[];
}

export interface SelectedCountry {
  name: string;
  iso2: string;
  iso3: string;
}
