import { useState } from 'react';
import type { AuthUser } from '../api/auth';

type Tab = 'visited' | 'wishlist';

interface ProfilePanelProps {
  user: AuthUser;
  visitedCountries: string[];
  wishlistCountries: string[];
  countryNames: Record<string, string>;
  onClose: () => void;
  onCountryClick: (iso2: string) => void;
  onLogout: () => void;
}

export default function ProfilePanel({
  user,
  visitedCountries,
  wishlistCountries,
  countryNames,
  onClose,
  onCountryClick,
  onLogout,
}: ProfilePanelProps) {
  const [tab, setTab] = useState<Tab>('visited');

  const totalCountries = 195;
  const visitedCount = visitedCountries.length;
  const wishlistCount = wishlistCountries.length;
  const percentage = totalCountries > 0 ? Math.round((visitedCount / totalCountries) * 100) : 0;

  const activeList = tab === 'visited' ? visitedCountries : wishlistCountries;
  const emptyMessage =
    tab === 'visited'
      ? "You haven't visited any countries yet.\nClick a country on the globe to get started!"
      : "Your wishlist is empty.\nAdd countries you dream of visiting!";

  return (
    <div className="absolute left-4 top-1/2 z-10 flex max-h-[80vh] w-80 -translate-y-1/2 flex-col rounded-2xl border border-white/10 bg-globe-ocean/95 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-white/10 p-5">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {user.displayName || 'Traveler'}
          </h2>
          <p className="text-sm text-slate-400">{user.email}</p>
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

      {/* Stats */}
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <span className="text-2xl font-bold text-green-400">{visitedCount}</span>
            <span className="ml-1 text-xs text-slate-500">visited</span>
          </div>
          <div className="flex-1">
            <span className="text-2xl font-bold text-purple-400">{wishlistCount}</span>
            <span className="ml-1 text-xs text-slate-500">wishlist</span>
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-slate-500">
          {percentage}% of the world explored
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-white/10">
        <button
          type="button"
          onClick={() => setTab('visited')}
          className={`flex-1 py-2.5 text-center text-sm font-medium transition ${
            tab === 'visited'
              ? 'border-b-2 border-green-400 text-green-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          ✓ Visited ({visitedCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('wishlist')}
          className={`flex-1 py-2.5 text-center text-sm font-medium transition ${
            tab === 'wishlist'
              ? 'border-b-2 border-purple-400 text-purple-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          📌 Wishlist ({wishlistCount})
        </button>
      </div>

      {/* Country list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {activeList.length === 0 ? (
          <p className="whitespace-pre-line text-center text-sm text-slate-500">
            {emptyMessage}
          </p>
        ) : (
          <ul className="space-y-1">
            {activeList
              .slice()
              .sort((a, b) => (countryNames[a] ?? a).localeCompare(countryNames[b] ?? b))
              .map((iso2) => (
                <li key={iso2}>
                  <button
                    type="button"
                    onClick={() => onCountryClick(iso2)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <span className={tab === 'visited' ? 'text-green-400' : 'text-purple-400'}>
                      {tab === 'visited' ? '✓' : '📌'}
                    </span>
                    <span className="flex-1">{countryNames[iso2] ?? iso2}</span>
                    <span className="text-xs text-slate-500">{iso2}</span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
