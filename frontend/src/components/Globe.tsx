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
  const globeRef = useRef<{ controls: () => { autoRotate: boolean; autoRotateSpeed: number }; pointOfView: (pov: object, ms?: number) => void } | undefined>();
  const [countries, setCountries] = useState<CountriesGeoJSON | null>(null);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then((data: CountriesGeoJSON) => setCountries(data))
      .catch((err) => console.error('Failed to load countries GeoJSON', err));
  }, []);

  useEffect(() => {
    if (!globeRef.current || !countries) return;
    globeRef.current.controls().autoRotate = true;
    globeRef.current.controls().autoRotateSpeed = 0.4;
    globeRef.current.pointOfView({ altitude: 2.2 }, 1200);
  }, [countries]);

  const handlePolygonClick = useCallback(
    (polygon: CountryFeature) => {
      const props = polygon?.properties;
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
    (d: CountryFeature) => {
      if (!selectedCountry) return 'rgba(59, 130, 246, 0.35)';
      const iso = d?.properties?.ISO_A2;
      if (iso === selectedCountry.iso2) return 'rgba(59, 130, 246, 0.85)';
      return 'rgba(30, 58, 95, 0.6)';
    },
    [selectedCountry]
  );

  const getPolygonAltitude = useCallback((d: CountryFeature) => {
    if (selectedCountry && d?.properties?.ISO_A2 === selectedCountry.iso2) return 0.08;
    return 0.02;
  }, [selectedCountry]);

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
        polygonLabel={({ properties: p }: CountryFeature) =>
          p?.ADMIN ? `${p.ADMIN} (${p.ISO_A2})` : ''
        }
        onPolygonClick={handlePolygonClick}
        polygonTransitionDuration={300}
      />
    </div>
  );
}
