import { useState, useEffect, useCallback } from 'react';
import { searchUsers, getFeaturedUsers, getLeaderboard } from '../api/users';
import type { UserSearchResult } from '../api/users';

interface ExploreUsersProps {
  onUserSelect: (userId: string) => void;
  onClose: () => void;
}

type ActiveTab = 'featured' | 'leaderboard' | 'search';
type LeaderboardSort = 'visited' | 'followers';

export default function ExploreUsers({ onUserSelect, onClose }: ExploreUsersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [featuredUsers, setFeaturedUsers] = useState<UserSearchResult[]>([]);
  const [leaderboardUsers, setLeaderboardUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('featured');
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSort>('visited');

  useEffect(() => {
    getFeaturedUsers(12)
      .then((res) => setFeaturedUsers(res.users))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      setLoading(true);
      getLeaderboard(leaderboardSort, 30)
        .then((res) => setLeaderboardUsers(res.users))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [activeTab, leaderboardSort]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchUsers(searchQuery, 20);
        setSearchResults(res.users);
      } catch { setSearchResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUserClick = useCallback((userId: string) => onUserSelect(userId), [onUserSelect]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">
      {/* Header */}
      <div className="relative z-10 border-b border-white/10 bg-globe-ocean/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Explore Travelers
            </h1>
            <p className="mt-1 text-sm text-slate-400">Discover globetrotters and get inspired by their journeys</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Search bar */}
        <div className="mx-auto max-w-6xl px-6 pb-4">
          <div className="relative">
            <input type="text" value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value.length >= 2) setActiveTab('search'); }}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 pl-10 text-white placeholder-slate-400 outline-none transition focus:border-white/40 focus:bg-white/15" />
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(''); setActiveTab('featured'); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-6xl border-t border-white/10">
          <div className="flex">
            <button type="button" onClick={() => { setActiveTab('featured'); setSearchQuery(''); }}
              className={`px-6 py-3 text-sm font-medium transition ${activeTab === 'featured' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-slate-300'}`}>
              Featured Travelers
            </button>
            <button type="button" onClick={() => setActiveTab('leaderboard')}
              className={`px-6 py-3 text-sm font-medium transition ${activeTab === 'leaderboard' ? 'border-b-2 border-yellow-400 text-yellow-400' : 'text-slate-400 hover:text-slate-300'}`}>
              Leaderboard
            </button>
            {searchQuery && (
              <button type="button" onClick={() => setActiveTab('search')}
                className={`px-6 py-3 text-sm font-medium transition ${activeTab === 'search' ? 'border-b-2 border-green-400 text-green-400' : 'text-slate-400 hover:text-slate-300'}`}>
                Search Results ({searchResults.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-globe-bg p-6">
        <div className="mx-auto max-w-6xl">
          {activeTab === 'featured' && (
            <div>
              <h2 className="mb-6 text-xl font-semibold text-white">Most Traveled Adventurers</h2>
              {featuredUsers.length === 0 ? (
                <LoadingSpinner />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {featuredUsers.map((user) => (
                    <UserCard key={user.id} user={user} onClick={() => handleUserClick(user.id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Leaderboard</h2>
                <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
                  <button type="button" onClick={() => setLeaderboardSort('visited')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${leaderboardSort === 'visited' ? 'bg-green-600/30 text-green-400' : 'text-slate-400 hover:text-white'}`}>
                    Most Countries
                  </button>
                  <button type="button" onClick={() => setLeaderboardSort('followers')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${leaderboardSort === 'followers' ? 'bg-blue-600/30 text-blue-400' : 'text-slate-400 hover:text-white'}`}>
                    Most Followers
                  </button>
                </div>
              </div>

              {loading ? (
                <LoadingSpinner />
              ) : (
                <div className="space-y-2">
                  {leaderboardUsers.map((user, index) => (
                    <LeaderboardRow key={user.id} user={user} rank={index + 1}
                      sortBy={leaderboardSort} onClick={() => handleUserClick(user.id)} />
                  ))}
                  {leaderboardUsers.length === 0 && (
                    <p className="py-12 text-center text-slate-400">No travelers found yet</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div>
              {loading ? (
                <LoadingSpinner />
              ) : searchQuery.length < 2 ? (
                <p className="py-12 text-center text-slate-400">Type at least 2 characters to search</p>
              ) : searchResults.length === 0 ? (
                <p className="py-12 text-center text-slate-400">No users found</p>
              ) : (
                <div>
                  <h2 className="mb-6 text-xl font-semibold text-white">Search Results ({searchResults.length})</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((user) => (
                      <UserCard key={user.id} user={user} onClick={() => handleUserClick(user.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <svg className="h-8 w-8 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

function UserCard({ user, onClick }: { user: UserSearchResult; onClick: () => void }) {
  const percentage = Math.round((user.visitedCount / 195) * 100);

  return (
    <button type="button" onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-globe-ocean/50 p-6 text-left transition hover:border-white/30 hover:bg-globe-ocean/70">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-purple-900/10 opacity-0 transition group-hover:opacity-100" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #8b7355 0%, #6b5344 100%)', boxShadow: '0 4px 12px rgba(139,115,85,0.4)' }}>
            {(user.displayName || user.email)[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="truncate font-semibold text-white group-hover:text-amber-300">{user.displayName || 'Traveler'}</h3>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">{user.visitedCount}</div>
            <div className="text-[10px] text-slate-500">Visited</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-400">{user.wishlistCount}</div>
            <div className="text-[10px] text-slate-500">Wishlist</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">{user.followersCount}</div>
            <div className="text-[10px] text-slate-500">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-400">{percentage}%</div>
            <div className="text-[10px] text-slate-500">World</div>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-amber-500 transition-all" style={{ width: `${percentage}%` }} />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-slate-500">Joined {new Date(user.joinedAt).toLocaleDateString()}</span>
          {user.albumsPublic ? (
            <span className="rounded-full bg-amber-500/20 px-2 py-1 text-amber-400">Public Album</span>
          ) : (
            <span className="rounded-full bg-slate-700/50 px-2 py-1 text-slate-500">Private</span>
          )}
        </div>
      </div>
    </button>
  );
}

function LeaderboardRow({ user, rank, sortBy, onClick }: { user: UserSearchResult; rank: number; sortBy: LeaderboardSort; onClick: () => void }) {
  const percentage = Math.round((user.visitedCount / 195) * 100);
  const isTop3 = rank <= 3;
  const medals = ['', '🥇', '🥈', '🥉'];

  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition hover:bg-white/10 ${
        isTop3 ? 'border-amber-500/30 bg-amber-900/10' : 'border-white/10 bg-white/5'
      }`}>
      {/* Rank */}
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold ${
        rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
        rank === 2 ? 'bg-slate-400/20 text-slate-300' :
        rank === 3 ? 'bg-amber-700/20 text-amber-500' :
        'bg-white/5 text-slate-500'
      }`}>
        {isTop3 ? medals[rank] : rank}
      </div>

      {/* Avatar */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #8b7355, #6b5344)' }}>
        {(user.displayName || user.email)[0].toUpperCase()}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{user.displayName || 'Traveler'}</p>
        <p className="truncate text-xs text-slate-400">{user.email}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className={`text-center ${sortBy === 'visited' ? 'opacity-100' : 'opacity-60'}`}>
          <p className="text-xl font-bold text-green-400">{user.visitedCount}</p>
          <p className="text-[10px] text-slate-500">countries</p>
        </div>
        <div className={`text-center ${sortBy === 'followers' ? 'opacity-100' : 'opacity-60'}`}>
          <p className="text-xl font-bold text-blue-400">{user.followersCount}</p>
          <p className="text-[10px] text-slate-500">followers</p>
        </div>
        <div className="w-20">
          <div className="mb-1 text-right text-xs text-slate-400">{percentage}%</div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-amber-500" style={{ width: `${percentage}%` }} />
          </div>
        </div>
      </div>
    </button>
  );
}
