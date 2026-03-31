import { useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../api/auth';
import type { TravelMemory } from '../api/albums';
import type { Badge, UserProfileData, FollowUser } from '../api/users';
import {
  getMyMemories,
  createMemory,
  deleteMemory,
  updateMemory,
  updateAlbumPrivacy,
} from '../api/albums';
import { getUserProfile, getFollowers, getFollowing } from '../api/users';
import PhotoAlbum from './PhotoAlbum';
import AddPhotoModal from './AddPhotoModal';
import { TIER_COLORS, ALL_BADGE_DEFS, CONTINENT_COLORS, CONTINENT_TOTAL_COUNTRIES } from '../utils/badges';

type Tab = 'stats' | 'badges' | 'visited' | 'wishlist' | 'albums' | 'friends';

interface ProfilePanelProps {
  user: AuthUser;
  visitedCountries: string[];
  wishlistCountries: string[];
  countryNames: Record<string, string>;
  onClose: () => void;
  onCountryClick: (iso2: string) => void;
  onLogout: () => void;
  getToken: () => string | null;
  onShareGlobe?: () => void;
  onViewUser?: (userId: string) => void;
}

export default function ProfilePanel({
  user,
  visitedCountries,
  wishlistCountries,
  countryNames,
  onClose,
  onCountryClick,
  onLogout,
  getToken,
  onShareGlobe,
  onViewUser,
}: ProfilePanelProps) {
  const [tab, setTab] = useState<Tab>('stats');
  const [memories, setMemories] = useState<TravelMemory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [albumsPublic, setAlbumsPublic] = useState(user.albumsPublic ?? false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCountryForPhoto, setSelectedCountryForPhoto] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [friendsTab, setFriendsTab] = useState<'followers' | 'following'>('followers');

  const totalCountries = 195;
  const visitedCount = visitedCountries.length;
  const wishlistCount = wishlistCountries.length;
  const percentage = totalCountries > 0 ? Math.round((visitedCount / totalCountries) * 100) : 0;

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoadingProfile(true);
    getUserProfile(user.id, token)
      .then((data) => {
        setProfileData(data);
        setBadges(data.badges ?? []);
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
  }, [user.id, getToken]);

  useEffect(() => {
    if (tab === 'albums') {
      const token = getToken();
      if (!token) return;
      setLoadingMemories(true);
      getMyMemories(token)
        .then((res) => setMemories(res.memories))
        .catch(console.error)
        .finally(() => setLoadingMemories(false));
    }
  }, [tab, getToken]);

  useEffect(() => {
    if (tab === 'friends') {
      getFollowers(user.id)
        .then((res) => setFollowers(res.users))
        .catch(console.error);
      getFollowing(user.id)
        .then((res) => setFollowing(res.users))
        .catch(console.error);
    }
  }, [tab, user.id]);

  const handleAddPhoto = useCallback(async (data: {
    imageData: string; dateTaken: string; notes: string; isPublic: boolean;
  }) => {
    const token = getToken();
    if (!token || !selectedCountryForPhoto) return;
    const res = await createMemory(token, { countryCode: selectedCountryForPhoto, ...data });
    setMemories((prev) => [res.memory, ...prev]);
  }, [getToken, selectedCountryForPhoto]);

  const handleDeleteMemory = useCallback(async (memoryId: string) => {
    const token = getToken();
    if (!token) return;
    if (!confirm('Are you sure you want to delete this memory?')) return;
    try {
      await deleteMemory(token, memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) { console.error('Failed to delete memory:', err); }
  }, [getToken]);

  const handleTogglePublic = useCallback(async (memoryId: string, isPublic: boolean) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await updateMemory(token, memoryId, { isPublic });
      setMemories((prev) => prev.map((m) =>
        m.id === memoryId ? { ...m, isPublic: res.memory.isPublic } : m
      ));
    } catch (err) { console.error('Failed to update memory:', err); }
  }, [getToken]);

  const handleToggleAlbumsPublic = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await updateAlbumPrivacy(token, !albumsPublic);
      setAlbumsPublic(res.albumsPublic);
    } catch (err) { console.error('Failed to update privacy:', err); }
  }, [getToken, albumsPublic]);

  const stats = profileData?.stats;
  const continentCounts = stats?.continentCounts ?? {};
  const visitedContinents = stats?.visitedContinents ?? [];

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'stats', label: 'Statistics', icon: '📊' },
    { key: 'badges', label: 'Badges', icon: '🏅' },
    { key: 'visited', label: 'Visited', icon: '✓' },
    { key: 'wishlist', label: 'Wishlist', icon: '📌' },
    { key: 'albums', label: 'Albums', icon: '📷' },
    { key: 'friends', label: 'Friends', icon: '👥' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(10,14,23,0.98) 0%, rgba(26,18,8,0.95) 100%)' }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-8 py-5">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
              style={{ background: 'linear-gradient(135deg, #8b7355 0%, #6b5344 100%)', boxShadow: '0 4px 16px rgba(139,115,85,0.4)' }}>
              {(user.displayName || user.email)[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {user.displayName || 'Traveler'}
              </h1>
              <p className="text-sm text-slate-400">{user.email}</p>
              <div className="mt-1.5 flex items-center gap-4 text-xs">
                <span className="text-green-400 font-medium">{visitedCount} visited</span>
                <span className="text-purple-400 font-medium">{wishlistCount} wishlist</span>
                <span className="text-amber-400 font-medium">{badges.length} badges</span>
                <span className="text-blue-400 font-medium">{profileData?.stats.followersCount ?? 0} followers</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onShareGlobe && (
              <button type="button" onClick={onShareGlobe}
                className="flex items-center gap-2 rounded-lg bg-blue-600/20 px-4 py-2 text-sm text-blue-400 transition hover:bg-blue-600/30">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share
              </button>
            )}
            <button type="button" onClick={onLogout}
              className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white">
              Sign out
            </button>
            <button type="button" onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-white/10 px-4">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium transition ${tab === t.key ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'stats' && (
            <div className="p-8">
              {loadingProfile ? (
                <div className="flex items-center justify-center py-20">
                  <svg className="h-10 w-10 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                </div>
              ) : (
                <div className="mx-auto max-w-5xl space-y-8">
                  {/* Top stats row */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <StatCard value={visitedCount} label="Countries Visited" color="text-green-400" sub={`${percentage}% of the world`} />
                    <StatCard value={wishlistCount} label="On Wishlist" color="text-purple-400" sub="Dream destinations" />
                    <StatCard value={memories.length || stats?.photoCount || 0} label="Travel Memories" color="text-amber-400" sub="Photos captured" />
                    <StatCard value={badges.length} label="Badges Earned" color="text-cyan-400" sub={`of ${ALL_BADGE_DEFS.length} total`} />
                  </div>

                  {/* World progress + Donut */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                      <h3 className="mb-4 text-lg font-semibold text-white">World Progress</h3>
                      <div className="flex items-center gap-6">
                        <DonutChart percentage={percentage} size={120} />
                        <div className="space-y-2">
                          <p className="text-3xl font-bold text-white">{percentage}%</p>
                          <p className="text-sm text-slate-400">{visitedCount} of {totalCountries} countries</p>
                          <p className="text-sm text-slate-400">{visitedContinents.length} of 6 continents</p>
                          {visitedContinents.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {visitedContinents.map((c) => (
                                <span key={c} className="rounded-full px-2 py-0.5 text-xs font-medium"
                                  style={{ backgroundColor: `${CONTINENT_COLORS[c]}20`, color: CONTINENT_COLORS[c] }}>
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Continent breakdown */}
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
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, backgroundColor: CONTINENT_COLORS[continent] }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Social stats */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                      <p className="text-3xl font-bold text-blue-400">{stats?.followersCount ?? 0}</p>
                      <p className="mt-1 text-sm text-slate-400">Followers</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                      <p className="text-3xl font-bold text-indigo-400">{stats?.followingCount ?? 0}</p>
                      <p className="mt-1 text-sm text-slate-400">Following</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                      <p className="text-3xl font-bold text-emerald-400">{visitedContinents.length}</p>
                      <p className="mt-1 text-sm text-slate-400">Continents Explored</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'badges' && (
            <div className="p-8">
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

                {/* Earned badges */}
                {badges.length > 0 && (
                  <div className="mb-8">
                    <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-green-400">Earned</h3>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {badges.map((badge) => (
                        <BadgeCard key={badge.id} badge={badge} earned={true} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Locked badges */}
                {ALL_BADGE_DEFS.filter((b) => !badges.some((e) => e.id === b.id)).length > 0 && (
                  <div>
                    <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500">Locked</h3>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {ALL_BADGE_DEFS
                        .filter((b) => !badges.some((e) => e.id === b.id))
                        .map((badge) => (
                          <BadgeCard key={badge.id} badge={badge} earned={false} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'visited' && (
            <div className="p-8">
              <div className="mx-auto max-w-5xl">
                <h2 className="mb-6 text-xl font-semibold text-white">Visited Countries ({visitedCount})</h2>
                {visitedCount === 0 ? (
                  <EmptyState message="You haven't visited any countries yet. Click a country on the globe to get started!" />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {visitedCountries
                      .slice().sort((a, b) => (countryNames[a] ?? a).localeCompare(countryNames[b] ?? b))
                      .map((iso2) => (
                        <button key={iso2} type="button" onClick={() => onCountryClick(iso2)}
                          className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-left transition hover:bg-white/10">
                          <span className="text-green-400">✓</span>
                          <span className="flex-1 text-sm text-slate-200">{countryNames[iso2] ?? iso2}</span>
                          <span className="text-xs text-slate-500">{iso2}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'wishlist' && (
            <div className="p-8">
              <div className="mx-auto max-w-5xl">
                <h2 className="mb-6 text-xl font-semibold text-white">Wishlist ({wishlistCount})</h2>
                {wishlistCount === 0 ? (
                  <EmptyState message="Your wishlist is empty. Add countries you dream of visiting!" />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {wishlistCountries
                      .slice().sort((a, b) => (countryNames[a] ?? a).localeCompare(countryNames[b] ?? b))
                      .map((iso2) => (
                        <button key={iso2} type="button" onClick={() => onCountryClick(iso2)}
                          className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-left transition hover:bg-white/10">
                          <span className="text-purple-400">📌</span>
                          <span className="flex-1 text-sm text-slate-200">{countryNames[iso2] ?? iso2}</span>
                          <span className="text-xs text-slate-500">{iso2}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'albums' && (
            <div className="p-8">
              <div className="mx-auto max-w-5xl">
                {/* Privacy toggle */}
                <div className="mb-6 flex items-center justify-between rounded-xl px-5 py-4" style={{ background: 'rgba(139,115,85,0.2)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{albumsPublic ? '🌍' : '🔒'}</span>
                    <div>
                      <p className="font-medium text-amber-200">{albumsPublic ? 'Public Album' : 'Private Album'}</p>
                      <p className="text-sm text-amber-700">{albumsPublic ? 'Others can view your photos' : 'Only you can see your album'}</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleToggleAlbumsPublic}
                    className={`relative h-8 w-14 rounded-full transition-colors ${albumsPublic ? 'bg-amber-600' : 'bg-amber-900'}`}>
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-amber-100 shadow transition-transform ${albumsPublic ? 'left-[30px]' : 'left-1'}`} />
                  </button>
                </div>

                {/* Add memory buttons */}
                {visitedCountries.length > 0 && (
                  <div className="mb-6">
                    <p className="mb-2 text-sm font-medium uppercase tracking-wide text-amber-600">Add a memory from:</p>
                    <div className="flex flex-wrap gap-2">
                      {visitedCountries.slice(0, 16).map((iso2) => (
                        <button key={iso2} type="button"
                          onClick={() => { setSelectedCountryForPhoto(iso2); setShowAddModal(true); }}
                          className="rounded-full bg-amber-900/40 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-800/50">
                          + {countryNames[iso2] ?? iso2}
                        </button>
                      ))}
                      {visitedCountries.length > 16 && (
                        <span className="px-3 py-2 text-sm text-amber-600">+{visitedCountries.length - 16} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Album content */}
                {loadingMemories ? (
                  <div className="flex items-center justify-center py-12">
                    <svg className="h-10 w-10 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  </div>
                ) : (
                  <div className="rounded-xl p-6"
                    style={{ background: 'linear-gradient(145deg, rgba(45,31,20,0.6) 0%, rgba(26,18,8,0.8) 100%)', border: '1px solid rgba(139,115,85,0.3)' }}>
                    {memories.length > 0 && (
                      <div className="mb-6 text-center">
                        <h3 className="text-2xl text-amber-400" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                          My Travel Memories
                        </h3>
                        <p className="mt-1 text-sm text-amber-700">{memories.length} moments from around the world</p>
                      </div>
                    )}
                    <PhotoAlbum memories={memories} countryNames={countryNames} isOwnProfile={true}
                      onDelete={handleDeleteMemory} onTogglePublic={handleTogglePublic} />
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'friends' && (
            <div className="p-8">
              <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex items-center gap-4">
                  <button type="button" onClick={() => setFriendsTab('followers')}
                    className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${friendsTab === 'followers' ? 'bg-blue-600/20 text-blue-400' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                    Followers ({profileData?.stats.followersCount ?? 0})
                  </button>
                  <button type="button" onClick={() => setFriendsTab('following')}
                    className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${friendsTab === 'following' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                    Following ({profileData?.stats.followingCount ?? 0})
                  </button>
                </div>

                {friendsTab === 'followers' && (
                  <FriendsList users={followers} emptyMessage="No followers yet. Share your profile to grow your community!" onViewUser={onViewUser} />
                )}
                {friendsTab === 'following' && (
                  <FriendsList users={following} emptyMessage="You're not following anyone yet. Explore travelers to find adventurers!" onViewUser={onViewUser} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && selectedCountryForPhoto && (
        <AddPhotoModal
          countryCode={selectedCountryForPhoto}
          countryName={countryNames[selectedCountryForPhoto] ?? selectedCountryForPhoto}
          onClose={() => { setShowAddModal(false); setSelectedCountryForPhoto(null); }}
          onSubmit={handleAddPhoto}
        />
      )}
    </>
  );
}

function StatCard({ value, label, color, sub }: { value: number; label: string; color: string; sub: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-300">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function DonutChart({ percentage, size }: { percentage: number; size: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="url(#donutGradient)" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-1000" />
      <defs>
        <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
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
        <div className={`absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text} ${colors.border} border`}>
          ✓
        </div>
      )}
    </div>
  );
}

function FriendsList({ users, emptyMessage, onViewUser }: { users: FollowUser[]; emptyMessage: string; onViewUser?: (id: string) => void }) {
  if (users.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {users.map((u) => (
        <button key={u.id} type="button" onClick={() => onViewUser?.(u.id)}
          className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20 hover:bg-white/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #8b7355, #6b5344)' }}>
            {(u.displayName || u.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-white">{u.displayName || 'Traveler'}</p>
            <p className="text-xs text-slate-400">{u.visitedCount} countries visited</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="whitespace-pre-line text-center text-lg text-slate-500">{message}</p>
    </div>
  );
}
