import { useQuery } from '@tanstack/react-query';
import { fetchCountryByIso2 } from '../api/countries';
import type { SelectedCountry } from '../types/globe';

interface CountryPanelProps {
  country: SelectedCountry | null;
  onClose: () => void;
}

export default function CountryPanel({ country, onClose }: CountryPanelProps) {
  const { data: apiCountry } = useQuery({
    queryKey: ['country', country?.iso2],
    queryFn: () => fetchCountryByIso2(country!.iso2),
    enabled: Boolean(country?.iso2),
  });

  if (!country) return null;

  const name = apiCountry?.name ?? country.name;
  const region = apiCountry?.region;
  const subregion = apiCountry?.subregion;

  return (
    <div className="absolute right-4 top-1/2 z-10 w-72 -translate-y-1/2 rounded-2xl border border-white/10 bg-globe-ocean/95 p-5 shadow-xl backdrop-blur">
      <div className="mb-3 flex items-start justify-between">
        <h2 className="text-xl font-semibold text-white">{name}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-sm text-slate-400">
        {country.iso2} / {country.iso3}
        {region && ` · ${region}`}
      </p>
      {subregion && <p className="mt-1 text-xs text-slate-500">{subregion}</p>}
      <p className="mt-3 text-sm text-slate-300">
        Attractions, safety rating and news will be added in Week 6.
      </p>
    </div>
  );
}
