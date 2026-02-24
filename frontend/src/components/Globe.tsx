import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Globe from 'react-globe.gl';
import type { CountryFeature, CountriesGeoJSON, SelectedCountry } from '../types/globe';

const GEOJSON_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

interface GlobeViewProps {
  onCountrySelect: (country: SelectedCountry | null) => void;
  selectedCountry: SelectedCountry | null;
  visitedCountries: string[];
  wishlistCountries: string[];
  autoRotate: boolean;
}

interface PinLabel {
  lat: number;
  lng: number;
  iso2: string;
  name: string;
}

/** Compute a rough centroid from a GeoJSON geometry. */
function computeCentroid(geometry: { type: string; coordinates: unknown }): [number, number] | null {
  try {
    let coords: number[][] = [];
    if (geometry.type === 'Polygon') {
      coords = (geometry.coordinates as number[][][])[0];
    } else if (geometry.type === 'MultiPolygon') {
      // Use the largest polygon (first ring of each polygon, pick longest)
      const polys = geometry.coordinates as number[][][][];
      let maxLen = 0;
      for (const poly of polys) {
        if (poly[0].length > maxLen) {
          maxLen = poly[0].length;
          coords = poly[0];
        }
      }
    }
    if (coords.length === 0) return null;
    let sumLng = 0, sumLat = 0;
    for (const c of coords) {
      sumLng += c[0];
      sumLat += c[1];
    }
    return [sumLat / coords.length, sumLng / coords.length];
  } catch {
    return null;
  }
}

export default function GlobeView({
  onCountrySelect,
  selectedCountry,
  visitedCountries,
  wishlistCountries,
  autoRotate,
}: GlobeViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [countries, setCountries] = useState<CountriesGeoJSON | null>(null);

  const visitedSet = useMemo(() => new Set(visitedCountries), [visitedCountries]);
  const wishlistSet = useMemo(() => new Set(wishlistCountries), [wishlistCountries]);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then((data: CountriesGeoJSON) => setCountries(data))
      .catch((err) => console.error('Failed to load countries GeoJSON', err));
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !countries) return;
    globe.controls().autoRotate = autoRotate;
    globe.controls().autoRotateSpeed = 0.4;
    globe.pointOfView({ altitude: 2.2 }, 1200);
  }, [countries, autoRotate]);

  // Build pin markers for wishlist countries
  const wishlistPins: PinLabel[] = useMemo(() => {
    if (!countries || wishlistCountries.length === 0) return [];
    const pins: PinLabel[] = [];
    for (const feature of countries.features) {
      const p = feature.properties;
      if (!p?.ISO_A2 || !wishlistSet.has(p.ISO_A2)) continue;
      const center = computeCentroid(feature.geometry);
      if (!center) continue;
      pins.push({
        lat: center[0],
        lng: center[1],
        iso2: p.ISO_A2,
        name: p.ADMIN ?? p.NAME ?? p.ISO_A2,
      });
    }
    return pins;
  }, [countries, wishlistCountries, wishlistSet]);

  const handlePolygonClick = useCallback(
    (polygon: object) => {
      const f = polygon as CountryFeature;
      const props = f?.properties;
      if (!props?.ISO_A2 || props.ISO_A2 === '-99') return;
      const name = props.ADMIN ?? props.NAME ?? 'Unknown';
      onCountrySelect({
        name,
        iso2: props.ISO_A2,
        iso3: props.ISO_A3 ?? props.ISO_A2,
      });
    },
    [onCountrySelect]
  );

  const getPolygonColor = useCallback(
    (d: object) => {
      const f = d as CountryFeature;
      const iso = f?.properties?.ISO_A2;

      // Visited → green
      if (iso && visitedSet.has(iso)) {
        if (selectedCountry && iso === selectedCountry.iso2) return 'rgba(34, 197, 94, 0.9)';
        return 'rgba(34, 197, 94, 0.55)';
      }

      // Wishlist → violet/purple
      if (iso && wishlistSet.has(iso)) {
        if (selectedCountry && iso === selectedCountry.iso2) return 'rgba(168, 85, 247, 0.9)';
        return 'rgba(168, 85, 247, 0.50)';
      }

      // Currently selected → bright blue
      if (selectedCountry && iso === selectedCountry.iso2) return 'rgba(59, 130, 246, 0.85)';

      // Nothing selected → default blue tint
      if (!selectedCountry) return 'rgba(59, 130, 246, 0.35)';

      // Something selected but this is not it → dim
      return 'rgba(30, 58, 95, 0.6)';
    },
    [selectedCountry, visitedSet, wishlistSet]
  );

  const getPolygonAltitude = useCallback(
    (d: object) => {
      const f = d as CountryFeature;
      const iso = f?.properties?.ISO_A2;
      if (selectedCountry && iso === selectedCountry.iso2) return 0.08;
      if (iso && visitedSet.has(iso)) return 0.04;
      if (iso && wishlistSet.has(iso)) return 0.035;
      return 0.02;
    },
    [selectedCountry, visitedSet, wishlistSet]
  );

  const getPolygonLabel = useCallback(
    (obj: object) => {
      const f = obj as CountryFeature;
      const p = f?.properties;
      if (!p?.ADMIN) return '';
      let badge = '';
      if (p.ISO_A2 && visitedSet.has(p.ISO_A2)) badge = ' ✓ Visited';
      else if (p.ISO_A2 && wishlistSet.has(p.ISO_A2)) badge = ' 📌 Wishlist';
      return `${p.ADMIN} (${p.ISO_A2})${badge}`;
    },
    [visitedSet, wishlistSet]
  );

  if (!countries) {
    return (
      <div className="globe-container flex items-center justify-center bg-globe-bg">
        <p className="text-globe-highlight font-medium">Loading globe…</p>
      </div>
    );
  }

  const features = countries.features.filter(
    (f) => f.properties?.ISO_A2 && f.properties.ISO_A2 !== '-99'
  );

  return (
    <div className="globe-container">
      <Globe
        ref={globeRef}
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
        polygonsData={features}
        polygonCapColor={getPolygonColor}
        polygonSideColor={() => 'rgba(0, 0, 0, 0.15)'}
        polygonStrokeColor={() => 'rgba(255,255,255,0.1)'}
        polygonAltitude={getPolygonAltitude}
        polygonLabel={getPolygonLabel}
        onPolygonClick={handlePolygonClick}
        polygonsTransitionDuration={300}
        // Wishlist pin markers
        labelsData={wishlistPins}
        labelLat={(d: object) => (d as PinLabel).lat}
        labelLng={(d: object) => (d as PinLabel).lng}
        labelText={() => '📌'}
        labelSize={() => 1.2}
        labelDotRadius={() => 0}
        labelColor={() => 'rgba(168, 85, 247, 1)'}
        labelResolution={2}
        labelAltitude={0.05}
      />
    </div>
  );
}
