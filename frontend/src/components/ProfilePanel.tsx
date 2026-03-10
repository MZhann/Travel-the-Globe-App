import { useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../api/auth';
import type { TravelMemory } from '../api/albums';
import { 
  getMyMemories, 
  createMemory, 
  deleteMemory, 
  updateMemory, 
  updateAlbumPrivacy 
} from '../api/albums';
import PhotoAlbum from './PhotoAlbum';
import AddPhotoModal from './AddPhotoModal';

type Tab = 'visited' | 'wishlist' | 'albums';

interface ProfilePanelProps {
  user: AuthUser;
  visitedCountries: string[];
  wishlistCountries: string[];
  countryNames: Record<string, string>;
  onClose: () => void;
  onCountryClick: (iso2: string) => void;
  onLogout: () => void;
  getToken: () => string | null;
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
}: ProfilePanelProps) {
  const [tab, setTab] = useState<Tab>('visited');
  const [memories, setMemories] = useState<TravelMemory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [albumsPublic, setAlbumsPublic] = useState(user.albumsPublic ?? false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCountryForPhoto, setSelectedCountryForPhoto] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalCountries = 195;
  const visitedCount = visitedCountries.length;
  const wishlistCount = wishlistCountries.length;
  const percentage = totalCountries > 0 ? Math.round((visitedCount / totalCountries) * 100) : 0;

  // Load memories when albums tab is opened
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

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleAddPhoto = useCallback(async (data: {
    imageData: string;
    dateTaken: string;
    notes: string;
    isPublic: boolean;
  }) => {
    const token = getToken();
    if (!token || !selectedCountryForPhoto) return;

    const res = await createMemory(token, {
      countryCode: selectedCountryForPhoto,
      ...data,
    });
    setMemories((prev) => [res.memory, ...prev]);
  }, [getToken, selectedCountryForPhoto]);

  const handleDeleteMemory = useCallback(async (memoryId: string) => {
    const token = getToken();
    if (!token) return;

    if (!confirm('Are you sure you want to delete this memory?')) return;

    try {
      await deleteMemory(token, memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  }, [getToken]);

  const handleTogglePublic = useCallback(async (memoryId: string, isPublic: boolean) => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await updateMemory(token, memoryId, { isPublic });
      setMemories((prev) => prev.map((m) => 
        m.id === memoryId ? { ...m, isPublic: res.memory.isPublic } : m
      ));
    } catch (err) {
      console.error('Failed to update memory:', err);
    }
  }, [getToken]);

  const handleToggleAlbumsPublic = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await updateAlbumPrivacy(token, !albumsPublic);
      setAlbumsPublic(res.albumsPublic);
    } catch (err) {
      console.error('Failed to update privacy:', err);
    }
  }, [getToken, albumsPublic]);

  const openAddPhotoModal = useCallback((countryCode: string) => {
    setSelectedCountryForPhoto(countryCode);
    setShowAddModal(true);
  }, []);

  const activeList = tab === 'visited' ? visitedCountries : wishlistCountries;
  const emptyMessage =
    tab === 'visited'
      ? "You haven't visited any countries yet.\nClick a country on the globe to get started!"
      : "Your wishlist is empty.\nAdd countries you dream of visiting!";

  // Fullscreen panel classes
  const panelClasses = isFullscreen
    ? 'fixed inset-4 z-50 flex flex-col rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl'
    : 'absolute left-4 top-1/2 z-10 flex max-h-[85vh] w-96 -translate-y-1/2 flex-col rounded-2xl border border-white/10 shadow-xl backdrop-blur';

  const panelStyle = isFullscreen
    ? {
        background: 'linear-gradient(135deg, rgba(10, 14, 23, 0.98) 0%, rgba(26, 18, 8, 0.95) 100%)',
      }
    : {};

  return (
    <>
      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        />
      )}

      <div 
        className={`${panelClasses} ${!isFullscreen ? 'bg-globe-ocean/95' : ''}`}
        style={panelStyle}
      >
        {/* Vintage texture overlay for fullscreen */}
        {isFullscreen && (
          <div 
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        )}

      {/* Header */}
        <div className="relative flex items-start justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-4">
            {/* Profile avatar in fullscreen */}
            {isFullscreen && (
              <div 
                className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                style={{
                  background: 'linear-gradient(135deg, #8b7355 0%, #6b5344 100%)',
                  boxShadow: '0 4px 12px rgba(139, 115, 85, 0.4)',
                }}
              >
                {(user.displayName || user.email)[0].toUpperCase()}
              </div>
            )}
        <div>
              <h2 
                className={`font-semibold text-white ${isFullscreen ? 'text-2xl' : 'text-lg'}`}
                style={isFullscreen ? { fontFamily: "'Playfair Display', Georgia, serif" } : {}}
              >
            {user.displayName || 'Traveler'}
          </h2>
          <p className="text-sm text-slate-400">{user.email}</p>
              {isFullscreen && (
                <p className="mt-1 text-xs text-amber-600">
                  📍 {visitedCount} countries visited • {memories.length} memories captured
                </p>
              )}
            </div>
        </div>
          <div className="flex items-center gap-2">
            {/* Fullscreen toggle button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Open fullscreen view'}
            >
              {isFullscreen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
            {/* Close button */}
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
      </div>

        {/* Stats - more prominent in fullscreen */}
        <div className={`border-b border-white/10 ${isFullscreen ? 'px-8 py-6' : 'px-5 py-4'}`}>
          <div className={`flex items-center ${isFullscreen ? 'gap-8' : 'gap-4'}`}>
            <div className={`${isFullscreen ? 'text-center' : ''}`}>
              <span className={`font-bold text-green-400 ${isFullscreen ? 'text-4xl' : 'text-2xl'}`}>{visitedCount}</span>
              <span className={`ml-1 text-slate-500 ${isFullscreen ? 'block text-sm' : 'text-xs'}`}>visited</span>
            </div>
            <div className={`${isFullscreen ? 'text-center' : ''}`}>
              <span className={`font-bold text-purple-400 ${isFullscreen ? 'text-4xl' : 'text-2xl'}`}>{wishlistCount}</span>
              <span className={`ml-1 text-slate-500 ${isFullscreen ? 'block text-sm' : 'text-xs'}`}>wishlist</span>
            </div>
            <div className={`${isFullscreen ? 'text-center' : ''}`}>
              <span className={`font-bold text-amber-400 ${isFullscreen ? 'text-4xl' : 'text-2xl'}`}>{memories.length}</span>
              <span className={`ml-1 text-slate-500 ${isFullscreen ? 'block text-sm' : 'text-xs'}`}>photos</span>
            </div>
            {isFullscreen && (
              <div className="ml-auto flex-1">
                <div className="flex items-center justify-end gap-3">
                  <div className="text-right">
                    <span className="text-3xl font-bold text-white">{percentage}%</span>
                    <span className="ml-2 text-sm text-slate-400">of the world</span>
                  </div>
                  <div className="h-16 w-16 rounded-full border-4 border-white/10 p-1">
                    <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="3"
                        strokeDasharray={`${percentage} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
          </div>
            )}
          </div>
          {!isFullscreen && (
            <>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-slate-500">
          {percentage}% of the world explored
        </p>
            </>
          )}
      </div>

      {/* Tab switcher */}
        <div className={`flex border-b border-white/10 ${isFullscreen ? 'px-4' : ''}`}>
        <button
          type="button"
          onClick={() => setTab('visited')}
            className={`flex-1 py-2.5 text-center font-medium transition ${isFullscreen ? 'text-base' : 'text-sm'} ${
            tab === 'visited'
              ? 'border-b-2 border-green-400 text-green-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
            ✓ Visited
        </button>
        <button
          type="button"
          onClick={() => setTab('wishlist')}
            className={`flex-1 py-2.5 text-center font-medium transition ${isFullscreen ? 'text-base' : 'text-sm'} ${
            tab === 'wishlist'
              ? 'border-b-2 border-purple-400 text-purple-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
            📌 Wishlist
          </button>
          <button
            type="button"
            onClick={() => setTab('albums')}
            className={`flex-1 py-2.5 text-center font-medium transition ${isFullscreen ? 'text-base' : 'text-sm'} ${
              tab === 'albums'
                ? 'border-b-2 border-amber-400 text-amber-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            📷 Albums
          </button>
        </div>

        {/* Content area */}
        <div className="relative flex-1 overflow-y-auto">
          {tab === 'albums' ? (
            <div className={isFullscreen ? 'p-8' : 'p-4'}>
              {/* Album privacy toggle */}
              <div 
                className={`mb-4 flex items-center justify-between rounded-lg px-4 py-3 ${isFullscreen ? 'mb-6' : ''}`}
                style={{ background: 'rgba(139, 115, 85, 0.2)' }}
              >
                <div className="flex items-center gap-3">
                  <span className={isFullscreen ? 'text-2xl' : 'text-lg'}>{albumsPublic ? '🌍' : '🔒'}</span>
                  <div>
                    <p className={`font-medium text-amber-200 ${isFullscreen ? 'text-base' : 'text-sm'}`}>
                      {albumsPublic ? 'Public Album' : 'Private Album'}
                    </p>
                    <p className={`text-amber-700 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
                      {albumsPublic ? 'Others can view your photos' : 'Only you can see your album'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAlbumsPublic}
                  className={`relative rounded-full transition-colors ${
                    albumsPublic ? 'bg-amber-600' : 'bg-amber-900'
                  } ${isFullscreen ? 'h-8 w-14' : 'h-6 w-11'}`}
                >
                  <span
                    className={`absolute rounded-full bg-amber-100 shadow transition-transform ${
                      isFullscreen 
                        ? `top-1 h-6 w-6 ${albumsPublic ? 'left-[30px]' : 'left-1'}`
                        : `top-0.5 h-5 w-5 ${albumsPublic ? 'left-[22px]' : 'left-0.5'}`
                    }`}
                  />
        </button>
      </div>

              {/* Add photo button for visited countries */}
              {visitedCountries.length > 0 && (
                <div className={isFullscreen ? 'mb-6' : 'mb-4'}>
                  <p className={`mb-2 font-medium uppercase tracking-wide text-amber-600 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
                    Add a memory from:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {visitedCountries.slice(0, isFullscreen ? 16 : 8).map((iso2) => (
                      <button
                        key={iso2}
                        type="button"
                        onClick={() => openAddPhotoModal(iso2)}
                        className={`rounded-full bg-amber-900/40 font-medium text-amber-300 transition hover:bg-amber-800/50 ${
                          isFullscreen ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
                        }`}
                      >
                        + {countryNames[iso2] ?? iso2}
                      </button>
                    ))}
                    {visitedCountries.length > (isFullscreen ? 16 : 8) && (
                      <span className={`text-amber-600 ${isFullscreen ? 'px-3 py-2 text-sm' : 'px-2 py-1.5 text-xs'}`}>
                        +{visitedCountries.length - (isFullscreen ? 16 : 8)} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Album content */}
              {loadingMemories ? (
                <div className="flex items-center justify-center py-12">
                  <svg className={`animate-spin text-amber-500 ${isFullscreen ? 'h-12 w-12' : 'h-8 w-8'}`} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : (
                <div 
                  className={`rounded-xl ${isFullscreen ? 'p-6' : 'p-4'}`}
                  style={{
                    background: 'linear-gradient(145deg, rgba(45,31,20,0.6) 0%, rgba(26,18,8,0.8) 100%)',
                    border: '1px solid rgba(139,115,85,0.3)',
                  }}
                >
                  {/* Vintage album title in fullscreen */}
                  {isFullscreen && memories.length > 0 && (
                    <div className="mb-6 text-center">
                      <h3 
                        className="text-2xl text-amber-400"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        ✦ My Travel Memories ✦
                      </h3>
                      <p className="mt-1 text-sm text-amber-700">
                        A collection of moments from around the world
                      </p>
                    </div>
                  )}
                  <PhotoAlbum
                    memories={memories}
                    countryNames={countryNames}
                    isOwnProfile={true}
                    onDelete={handleDeleteMemory}
                    onTogglePublic={handleTogglePublic}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className={isFullscreen ? 'px-8 py-6' : 'px-5 py-4'}>
        {activeList.length === 0 ? (
                <p className={`whitespace-pre-line text-center text-slate-500 ${isFullscreen ? 'py-12 text-lg' : 'text-sm'}`}>
            {emptyMessage}
          </p>
        ) : (
                <ul className={`space-y-1 ${isFullscreen ? 'grid grid-cols-2 gap-3 space-y-0 lg:grid-cols-3' : ''}`}>
            {activeList
              .slice()
              .sort((a, b) => (countryNames[a] ?? a).localeCompare(countryNames[b] ?? b))
              .map((iso2) => (
                <li key={iso2}>
                        <div className={`flex items-center gap-2 ${isFullscreen ? 'rounded-lg bg-white/5 p-1' : ''}`}>
                  <button
                    type="button"
                    onClick={() => onCountryClick(iso2)}
                            className={`flex flex-1 items-center gap-2 rounded-lg text-left text-slate-300 transition hover:bg-white/5 hover:text-white ${
                              isFullscreen ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm'
                            }`}
                  >
                    <span className={tab === 'visited' ? 'text-green-400' : 'text-purple-400'}>
                      {tab === 'visited' ? '✓' : '📌'}
                    </span>
                    <span className="flex-1">{countryNames[iso2] ?? iso2}</span>
                            <span className={`text-slate-500 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>{iso2}</span>
                          </button>
                          {tab === 'visited' && (
                            <button
                              type="button"
                              onClick={() => openAddPhotoModal(iso2)}
                              className={`rounded-lg text-amber-500 transition hover:bg-amber-900/30 hover:text-amber-400 ${
                                isFullscreen ? 'p-3' : 'p-2'
                              }`}
                              title="Add photo"
                            >
                              <svg className={isFullscreen ? 'h-5 w-5' : 'h-4 w-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                  </button>
                          )}
                        </div>
                </li>
              ))}
          </ul>
              )}
            </div>
        )}
      </div>

      {/* Footer */}
        <div className={`border-t border-white/10 ${isFullscreen ? 'p-6' : 'p-4'}`}>
          <div className={`flex gap-3 ${isFullscreen ? '' : 'flex-col'}`}>
            {isFullscreen && (
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="flex-1 rounded-lg border border-amber-700/50 bg-amber-900/30 py-2 text-sm text-amber-400 transition hover:bg-amber-900/50"
              >
                ← Back to compact view
              </button>
            )}
        <button
          type="button"
          onClick={onLogout}
              className={`rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white ${
                isFullscreen ? 'px-6' : 'w-full'
              }`}
        >
          Sign out
        </button>
      </div>
    </div>
      </div>

      {/* Add Photo Modal */}
      {showAddModal && selectedCountryForPhoto && (
        <AddPhotoModal
          countryCode={selectedCountryForPhoto}
          countryName={countryNames[selectedCountryForPhoto] ?? selectedCountryForPhoto}
          onClose={() => {
            setShowAddModal(false);
            setSelectedCountryForPhoto(null);
          }}
          onSubmit={handleAddPhoto}
        />
      )}
    </>
  );
}
