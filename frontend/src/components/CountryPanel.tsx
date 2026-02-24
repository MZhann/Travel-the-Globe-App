import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCountryByIso2 } from '../api/countries';
import type { SelectedCountry } from '../types/globe';

interface CountryPanelProps {
  country: SelectedCountry | null;
  onClose: () => void;
  isVisited: boolean;
  isWishlisted: boolean;
  onToggleVisited: (iso2: string) => Promise<void>;
  onToggleWishlist: (iso2: string) => Promise<void>;
  isLoggedIn: boolean;
  onSignInClick: () => void;
  onLearnMore: (country: SelectedCountry) => void;
}

export default function CountryPanel({
  country,
  onClose,
  isVisited,
  isWishlisted,
  onToggleVisited,
  onToggleWishlist,
  isLoggedIn,
  onSignInClick,
  onLearnMore,
}: CountryPanelProps) {
  const [togglingVisited, setTogglingVisited] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const { data: apiCountry } = useQuery({
    queryKey: ['country', country?.iso2],
    queryFn: () => fetchCountryByIso2(country!.iso2),
    enabled: Boolean(country?.iso2),
  });

  if (!country) return null;

  const name = apiCountry?.name ?? country.name;
  const region = apiCountry?.region;
  const subregion = apiCountry?.subregion;

  const handleToggleVisited = async () => {
    setTogglingVisited(true);
    try {
      await onToggleVisited(country.iso2);
    } finally {
      setTogglingVisited(false);
    }
  };

  const handleToggleWishlist = async () => {
    setTogglingWishlist(true);
    try {
      await onToggleWishlist(country.iso2);
    } finally {
      setTogglingWishlist(false);
    }
  };

  return (
    <div className="absolute right-4 top-1/2 z-10 w-80 -translate-y-1/2 rounded-2xl border border-white/10 bg-globe-ocean/95 p-5 shadow-xl backdrop-blur">
      {/* Header with badges */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{name}</h2>
          <div className="mt-1 flex items-center gap-2">
            {isVisited && (
              <span className="inline-flex items-center rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                ✓ Visited
              </span>
            )}
            {isWishlisted && (
              <span className="inline-flex items-center rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
                📌 Wishlist
              </span>
            )}
          </div>
        </div>
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

      {/* Action buttons */}
      <div className="mt-4 space-y-2">
        {isLoggedIn ? (
          <>
            {/* Mark as Visited button */}
            <button
              type="button"
              onClick={handleToggleVisited}
              disabled={togglingVisited}
              className={`w-full rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                isVisited
                  ? 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {togglingVisited
                ? 'Updating…'
                : isVisited
                  ? 'Remove from Visited'
                  : '✓ Mark as Visited'}
            </button>

            {/* Wishlist button — only show if NOT already visited */}
            {!isVisited && (
              <button
                type="button"
                onClick={handleToggleWishlist}
                disabled={togglingWishlist}
                className={`w-full rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                  isWishlisted
                    ? 'border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                    : 'border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                }`}
              >
                {togglingWishlist
                  ? 'Updating…'
                  : isWishlisted
                    ? 'Remove from Wishlist'
                    : '📌 Add to Wishlist'}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onSignInClick}
            className="w-full rounded-lg bg-globe-highlight py-2.5 text-sm font-medium text-white transition hover:bg-blue-600"
          >
            Sign in to track your travels
          </button>
        )}
      </div>

      {/* Learn more button */}
      <button
        type="button"
        onClick={() => onLearnMore(country)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-globe-highlight/30 bg-globe-highlight/10 py-2.5 text-sm font-medium text-globe-highlight transition hover:bg-globe-highlight/20"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Learn more about {name}
      </button>
    </div>
  );
}
