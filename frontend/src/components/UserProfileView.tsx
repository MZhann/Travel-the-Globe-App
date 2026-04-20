import { useState, useEffect, useCallback } from 'react';
import GlobeView from './Globe';
import PhotoAlbum from './PhotoAlbum';
import { getUserProfile, followUser, unfollowUser } from '../api/users';
import { getMyMemories, getUserMemories } from '../api/albums';
import type { UserProfileData, Badge } from '../api/users';
import type { TravelMemory } from '../api/albums';
import { TIER_COLORS, ALL_BADGE_DEFS, CONTINENT_COLORS, CONTINENT_TOTAL_COUNTRIES } from '../utils/badges';
import { useAuth } from '../context/AuthContext';

interface UserProfileViewProps {
  userId: string;
  countryNames: Record<string, string>;
  onClose: () => void;
  getToken?: () => string | null;
}

export default function UserProfileView({ userId, countryNames, onClose, getToken }: UserProfileViewProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [memories, setMemories] = useState<TravelMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'globe' | 'stats' | 'badges' | 'albums'>('stats');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken?.() || undefined;
        const profileData = await getUserProfile(userId, token);
        setProfile(profileData);
        setIsFollowing(profileData.isFollowing ?? false);
        setFollowersCount(profileData.stats?.followersCount ?? 0);

        if (profileData.canViewAlbums) {
          try {
            if (profileData.isOwnProfile && token) {
              const albumsRes = await getMyMemories(token);
              setMemories(albumsRes.memories);
            } else {
              const albumsRes = await getUserMemories(userId, token);
              setMemories(albumsRes.memories);
            }
          } catch (err) { console.error('Failed to load album data:', err); }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [userId, getToken]);

  const handleFollow = useCallback(async () => {
    const token = getToken?.();
    if (!token) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const res = await unfollowUser(token, userId);
        setIsFollowing(res.following);
        setFollowersCount(res.targetFollowersCount);
      } else {
        const res = await followUser(token, userId);
        setIsFollowing(res.following);
        setFollowersCount(res.targetFollowersCount);
      }
    } catch (err) { console.error('Follow/unfollow error:', err); }
    finally { setFollowLoading(false); }
  }, [getToken, userId, isFollowing]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
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
          <button type="button" onClick={onClose} className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20">Close</button>
        </div>
      </div>
    );
  }

  const { user, stats } = profile;
  const badges = profile.badges ?? [];
  const canFollow = currentUser && currentUser.id !== userId;
  const continentCounts = stats?.continentCounts ?? {};
  const visitedContinents = stats?.visitedContinents ?? [];

  return (
    <div className="fixed inset-0 z-50 flex min-h-0 flex-col bg-black/95 backdrop-blur-sm">
      {/* Header */}
      <div className="relative z-10 border-b border-white/10 bg-globe-ocean/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #8b7355 0%, #6b5344 100%)', boxShadow: '0 4px 12px rgba(139,115,85,0.4)' }}>
              {(user.displayName || user.email)[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {user.displayName || 'Traveler'}
              </h1>
              <p className="text-sm text-slate-400">{user.email}</p>
              <div className="mt-1 flex items-center gap-4 text-xs">
                <span className="text-green-400">{stats?.visitedCount ?? 0} visited</span>
                <span className="text-blue-400">{followersCount} followers</span>
                <span className="text-indigo-400">{stats?.followingCount ?? 0} following</span>
                <span className="text-amber-400">{badges.length} badges</span>
                <span className="text-slate-500">Joined {new Date(user.joinedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canFollow && (
              <button type="button" onClick={handleFollow} disabled={followLoading}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition ${
                  isFollowing
                    ? 'border border-white/20 bg-white/5 text-slate-300 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/30'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}>
                {followLoading ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : isFollowing ? (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Following
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Follow
                  </>
                )}
              </button>
            )}
            <button type="button" onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-7xl border-t border-white/10">
          <div className="flex">
            {(['stats', 'badges', 'globe', 'albums'] as const).map((t) => {
              const labels = { stats: 'Statistics', badges: 'Badges', globe: 'Globe', albums: 'Albums' };
              const icons = { stats: '📊', badges: '🏅', globe: '🌍', albums: '📷' };
              const disabled = t === 'albums' && !profile.canViewAlbums;
              if (disabled) {
                return <div key={t} className="px-6 py-3 text-sm text-slate-600">🔒 Albums Private</div>;
              }
              return (
                <button key={t} type="button" onClick={() => setActiveTab(t)}
                  className={`px-6 py-3 text-sm font-medium transition ${activeTab === t ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-slate-300'}`}>
                  {icons[t]} {labels[t]} {t === 'badges' && `(${badges.length})`}
                  {t === 'albums' && (stats?.photoCount ?? 0) > 0 && ` (${stats?.photoCount})`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content — min-h-0 so nested h-full globe canvas gets a real height in flex layout */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {activeTab === 'globe' && (
          <div className="h-full min-h-0">
            <GlobeView selectedCountry={null} onCountrySelect={() => {}} visitedCountries={user.visitedCountries} wishlistCountries={user.wishlistCountries} autoRotate={true} />
            <div className="absolute bottom-4 left-4 rounded-lg bg-globe-ocean/90 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-4 text-sm">
                <div><span className="text-2xl font-bold text-green-400">{stats?.visitedCount ?? 0}</span><span className="ml-1 text-slate-400">visited</span></div>
                <div><span className="text-2xl font-bold text-purple-400">{stats?.wishlistCount ?? 0}</span><span className="ml-1 text-slate-400">wishlist</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="h-full overflow-y-auto bg-globe-bg p-8">
            <div className="mx-auto max-w-5xl space-y-8">
              {/* Top stats */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <StatsCard value={stats?.visitedCount ?? 0} label="Visited" color="text-green-400" />
                <StatsCard value={stats?.wishlistCount ?? 0} label="Wishlist" color="text-purple-400" />
                <StatsCard value={stats?.photoCount ?? 0} label="Memories" color="text-amber-400" />
                <StatsCard value={followersCount} label="Followers" color="text-blue-400" />
                <StatsCard value={stats?.followingCount ?? 0} label="Following" color="text-indigo-400" />
              </div>

              {/* World progress + Continents */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">World Progress</h3>
                  <div className="flex items-center gap-6">
                    <ProfileDonut percentage={stats?.percentage ?? 0} size={120} />
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-white">{stats?.percentage ?? 0}%</p>
                      <p className="text-sm text-slate-400">{stats?.visitedCount ?? 0} of {stats?.totalCountries ?? 195} countries</p>
                      <p className="text-sm text-slate-400">{visitedContinents.length} of 6 continents</p>
                      {visitedContinents.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {visitedContinents.map((c) => (
                            <span key={c} className="rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: `${CONTINENT_COLORS[c]}20`, color: CONTINENT_COLORS[c] }}>{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">By Continent</h3>
                  <div className="space-y-3">
                    {Object.entries(CONTINENT_TOTAL_COUNTRIES).map(([continent, total]) => {
                      const count = continentCounts[continent] ?? 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={continent}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium" style={{ color: CONTINENT_COLORS[continent] }}>{continent}</span>
                            <span className="text-slate-400">{count}/{total}</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: CONTINENT_COLORS[continent] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Country lists */}
              <div className="grid gap-6 md:grid-cols-2">
                {user.visitedCountries.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <h3 className="mb-4 text-lg font-semibold text-green-400">Visited Countries</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.visitedCountries.sort((a, b) => (countryNames[a] ?? a).localeCompare(countryNames[b] ?? b)).map((iso2) => (
                        <span key={iso2} className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400">{countryNames[iso2] ?? iso2}</span>
                      ))}
                    </div>
                  </div>
                )}
                {user.wishlistCountries.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <h3 className="mb-4 text-lg font-semibold text-purple-400">Wishlist Countries</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.wishlistCountries.sort((a, b) => (countryNames[a] ?? a).localeCompare(countryNames[b] ?? b)).map((iso2) => (
                        <span key={iso2} className="rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-400">{countryNames[iso2] ?? iso2}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="h-full overflow-y-auto bg-globe-bg p-8">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Badges & Achievements</h2>
                  <p className="mt-1 text-sm text-slate-400">{badges.length} of {ALL_BADGE_DEFS.length} earned</p>
                </div>
                <div className="h-2 w-48 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-amber-500 transition-all duration-700"
                    style={{ width: `${(badges.length / ALL_BADGE_DEFS.length) * 100}%` }} />
                </div>
              </div>

              {badges.length > 0 && (
                <div className="mb-8">
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-green-400">Earned</h3>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {badges.map((badge) => <BadgeCard key={badge.id} badge={badge} earned />)}
                  </div>
                </div>
              )}

              {ALL_BADGE_DEFS.filter((b) => !badges.some((e) => e.id === b.id)).length > 0 && (
                <div>
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500">Locked</h3>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {ALL_BADGE_DEFS.filter((b) => !badges.some((e) => e.id === b.id)).map((badge) => (
                      <BadgeCard key={badge.id} badge={badge} earned={false} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'albums' && profile.canViewAlbums && (
          <div className="h-full overflow-y-auto bg-globe-bg p-8">
            {(stats?.photoCount ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-900/30 text-3xl">📷</div>
                  <p className="text-lg text-slate-400">No photos shared yet</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {profile.isOwnProfile ? 'Add photos from your visited countries!' : "This traveler hasn't shared any photos yet."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-6xl">
                <div className="rounded-xl p-6"
                  style={{ background: 'linear-gradient(145deg, rgba(45,31,20,0.6) 0%, rgba(26,18,8,0.8) 100%)', border: '1px solid rgba(139,115,85,0.3)' }}>
                  <h2 className="mb-6 text-center text-2xl text-amber-400" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {user.displayName || 'Traveler'}'s Travel Memories
                  </h2>
                  {memories.length > 0 ? (
                    <PhotoAlbum memories={memories} countryNames={countryNames} isOwnProfile={profile.isOwnProfile} />
                  ) : (
                    <p className="text-center text-sm text-amber-600">Loading photos...</p>
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

function StatsCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function ProfileDonut({ percentage, size }: { percentage: number; size: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="url(#profileDonutGrad)" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-1000" />
      <defs>
        <linearGradient id="profileDonutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function BadgeCard({ badge, earned }: { badge: Badge & { requirement?: string }; earned: boolean }) {
  const colors = TIER_COLORS[badge.tier];
  return (
    <div className={`relative rounded-xl border p-4 transition ${earned ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}` : 'border-white/5 bg-white/[0.02] opacity-40'}`}>
      <div className="flex items-start gap-3">
        <span className={`text-3xl ${earned ? '' : 'grayscale'}`}>{badge.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${earned ? colors.text : 'text-slate-500'}`}>{badge.name}</p>
          <p className={`text-xs ${earned ? 'text-slate-400' : 'text-slate-600'}`}>{badge.description}</p>
          {!earned && badge.requirement && (
            <p className="mt-1 text-xs text-slate-600 italic">{badge.requirement}</p>
          )}
        </div>
      </div>
      {earned && (
        <div className={`absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text} ${colors.border} border`}>✓</div>
      )}
    </div>
  );
}
