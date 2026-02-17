import { useRef, useEffect, useState, useCallback } from 'react';
import Globe from 'react-globe.gl';
import type { CountryFeature, CountriesGeoJSON, SelectedCountry } from '../types/globe';

const GEOJSON_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

interface GlobeViewProps {
  onCountrySelect: (country: SelectedCountry | null) => void;
  selectedCountry: SelectedCountry | null;
}

export default function GlobeView({ onCountrySelect, selectedCountry }: GlobeViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [countries, setCountries] = useState<CountriesGeoJSON | null>(null);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then((data: CountriesGeoJSON) => setCountries(data))
      .catch((err) => console.error('Failed to load countries GeoJSON', err));
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !countries) return;
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.4;
    globe.pointOfView({ altitude: 2.2 }, 1200);
  }, [countries]);

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
      if (!selectedCountry) return 'rgba(59, 130, 246, 0.35)';
      const iso = f?.properties?.ISO_A2;
      if (iso === selectedCountry.iso2) return 'rgba(59, 130, 246, 0.85)';
      return 'rgba(30, 58, 95, 0.6)';
    },
    [selectedCountry]
  );

  const getPolygonAltitude = useCallback(
    (d: object) => {
      const f = d as CountryFeature;
      if (selectedCountry && f?.properties?.ISO_A2 === selectedCountry.iso2) return 0.08;
      return 0.02;
    },
    [selectedCountry]
  );

  const getPolygonLabel = useCallback((obj: object) => {
    const f = obj as CountryFeature;
    const p = f?.properties;
    return p?.ADMIN ? `${p.ADMIN} (${p.ISO_A2})` : '';
  }, []);

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
      />
    </div>
  );
}
