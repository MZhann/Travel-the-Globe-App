import { useState, useEffect } from 'react';
import GlobeView from './Globe';
import PhotoAlbum from './PhotoAlbum';
import { getUserProfile } from '../api/users';
import { getMyMemories, getUserMemories } from '../api/albums';
import type { UserProfileData } from '../api/users';
import type { TravelMemory } from '../api/albums';

interface UserProfileViewProps {
  userId: string;
  countryNames: Record<string, string>;
  onClose: () => void;
  getToken?: () => string | null;
}

export default function UserProfileView({
  userId,
  countryNames,
  onClose,
  getToken,
}: UserProfileViewProps) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [memories, setMemories] = useState<TravelMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'globe' | 'albums' | 'stats'>('globe');

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken?.() || undefined;
        const profileData = await getUserProfile(userId, token);
        setProfile(profileData);

        // Load full album data if albums are viewable
        if (profileData.canViewAlbums) {
          try {
            if (profileData.isOwnProfile && token) {
              // For own profile, use albums API to get full image data
              const albumsRes = await getMyMemories(token);
              setMemories(albumsRes.memories);
            } else {
              // For other users, fetch public albums
              const albumsRes = await getUserMemories(userId, token);
              setMemories(albumsRes.memories);
            }
          } catch (err) {
            console.error('Failed to load full album data:', err);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, getToken]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="mx-4 max-w-md rounded-xl bg-globe-ocean/95 p-6 text-center">
          <p className="text-red-400">{error || 'Profile not found'}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { user, stats } = profile;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">
      {/* Header */}
      <div className="relative z-10 border-b border-white/10 bg-globe-ocean/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div 
              className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #8b7355 0%, #6b5344 100%)',
                boxShadow: '0 4px 12px rgba(139, 115, 85, 0.4)',
              }}
            >
              {(user.displayName || user.email)[0].toUpperCase()}
            </div>
            <div>
              <h1 
                className="text-2xl font-semibold text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {user.displayName || 'Traveler'}
              </h1>
              <p className="text-sm text-slate-400">{user.email}</p>
              <p className="mt-1 text-xs text-amber-600">
                Joined {new Date(user.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-7xl border-t border-white/10">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('globe')}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === 'globe'
                  ? 'border-b-2 border-green-400 text-green-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              🌍 Globe
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === 'stats'
                  ? 'border-b-2 border-amber-400 text-amber-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              📊 Stats
            </button>
            {profile.canViewAlbums && (
              <button
                type="button"
                onClick={() => setActiveTab('albums')}
                className={`px-6 py-3 text-sm font-medium transition ${
                  activeTab === 'albums'
                    ? 'border-b-2 border-amber-400 text-amber-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                📷 Albums {stats.photoCount > 0 && `(${stats.photoCount})`}
              </button>
            )}
            {!profile.canViewAlbums && (
              <div className="px-6 py-3 text-sm text-slate-600">
                🔒 Albums Private
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">
        {activeTab === 'globe' && (
          <div className="h-full">
            <GlobeView
              selectedCountry={null}
              onCountrySelect={() => {}}
              visitedCountries={user.visitedCountries}
              wishlistCountries={user.wishlistCountries}
              autoRotate={true}
            />
            {/* Overlay stats */}
            <div className="absolute bottom-4 left-4 rounded-lg bg-globe-ocean/90 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-2xl font-bold text-green-400">{stats.visitedCount}</span>
                  <span className="ml-1 text-slate-400">visited</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-purple-400">{stats.wishlistCount}</span>
                  <span className="ml-1 text-slate-400">wishlist</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-amber-400">{stats.photoCount}</span>
                  <span className="ml-1 text-slate-400">photos</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="flex h-full items-center justify-center overflow-y-auto bg-globe-bg p-8">
            <div className="mx-auto max-w-4xl space-y-8">
              {/* Main stats cards */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-globe-ocean/50 p-6 backdrop-blur">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-green-400">{stats.visitedCount}</div>
                    <div className="mt-2 text-sm text-slate-400">Countries Visited</div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {stats.percentage}% of the world
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-globe-ocean/50 p-6 backdrop-blur">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-purple-400">{stats.wishlistCount}</div>
                    <div className="mt-2 text-sm text-slate-400">Wishlist Countries</div>
                    <div className="mt-4 text-xs text-slate-500">
                      Dream destinations
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-globe-ocean/50 p-6 backdrop-blur">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-amber-400">{stats.photoCount}</div>
                    <div className="mt-2 text-sm text-slate-400">Travel Memories</div>
                    <div className="mt-4 text-xs text-slate-500">
                      {profile.canViewAlbums ? 'Photos shared' : 'Private album'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Countries lists */}
              <div className="grid gap-6 md:grid-cols-2">
                {user.visitedCountries.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-globe-ocean/50 p-6 backdrop-blur">
                    <h3 className="mb-4 text-lg font-semibold text-green-400">✓ Visited Countries</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.visitedCountries
                        .sort((a, b) => (countryNames[a] ?? a).localeCompare(countryNames[b] ?? b))
                        .map((iso2) => (
                          <span
                            key={iso2}
                            className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400"
                          >
                            {countryNames[iso2] ?? iso2}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {user.wishlistCountries.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-globe-ocean/50 p-6 backdrop-blur">
                    <h3 className="mb-4 text-lg font-semibold text-purple-400">📌 Wishlist Countries</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.wishlistCountries
                        .sort((a, b) => (countryNames[a] ?? a).localeCompare(countryNames[b] ?? b))
                        .map((iso2) => (
                          <span
                            key={iso2}
                            className="rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-400"
                          >
                            {countryNames[iso2] ?? iso2}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'albums' && profile.canViewAlbums && (
          <div className="h-full overflow-y-auto bg-globe-bg p-8">
            {stats.photoCount === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-900/30 flex items-center justify-center text-3xl">
                    📷
                  </div>
                  <p className="text-lg text-slate-400">No photos shared yet</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {profile.isOwnProfile 
                      ? 'Add photos from your visited countries!' 
                      : 'This traveler hasn\'t shared any photos yet.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-6xl">
                <div 
                  className="rounded-xl p-6"
                  style={{
                    background: 'linear-gradient(145deg, rgba(45,31,20,0.6) 0%, rgba(26,18,8,0.8) 100%)',
                    border: '1px solid rgba(139,115,85,0.3)',
                  }}
                >
                  <h2 
                    className="mb-6 text-center text-2xl text-amber-400"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    ✦ {user.displayName || 'Traveler'}'s Travel Memories ✦
                  </h2>
                  {memories.length > 0 ? (
                    <PhotoAlbum
                      memories={memories}
                      countryNames={countryNames}
                      isOwnProfile={profile.isOwnProfile}
                    />
                  ) : (
                    <p className="text-center text-sm text-amber-600">
                      Loading photos...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

