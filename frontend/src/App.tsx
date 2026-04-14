import { useState, useCallback, useEffect, useRef } from 'react';
import GlobeView from './components/Globe';
import CountryPanel from './components/CountryPanel';
import CountryDrawer from './components/CountryDrawer';
import AuthModal from './components/AuthModal';
import ProfilePanel from './components/ProfilePanel';
import ExploreUsers from './components/ExploreUsers';
import UserProfileView from './components/UserProfileView';
import GlobalChat from './components/GlobalChat';
import ToursSection from './components/ToursSection';
import { useAuth } from './context/AuthContext';
import { markVisited, unmarkVisited, getVisitedCountries } from './api/visited';
import { addToWishlist, removeFromWishlist, getWishlistCountries } from './api/wishlist';
import type { SelectedCountry, CountryFeature } from './types/globe';
import { resolveNaturalEarthIso2 } from './utils/naturalEarthIso2';

const GEOJSON_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

export default function App() {
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [visitedCountries, setVisitedCountries] = useState<string[]>([]);
  const [wishlistCountries, setWishlistCountries] = useState<string[]>([]);
  const [countryNames, setCountryNames] = useState<Record<string, string>>({});
  const [drawerCountry, setDrawerCountry] = useState<SelectedCountry | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [toursOpen, setToursOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const { user, logout, loading, getToken } = useAuth();

  // Detect shared globe link (?globe=userId) on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const globeUserId = params.get('globe');
    if (globeUserId) {
      setViewingUserId(globeUserId);
    }
  }, []);

  const handleShareGlobe = useCallback(() => {
    if (!user) return;
    const url = `${window.location.origin}${window.location.pathname}?globe=${user.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }).catch(() => {});
  }, [user]);

  const handleCloseUserProfile = useCallback(() => {
    setViewingUserId(null);
    if (window.location.search.includes('globe=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Build iso2 → name map from GeoJSON (loaded once)
  const geoLoaded = useRef(false);
  useEffect(() => {
    if (geoLoaded.current) return;
    geoLoaded.current = true;
    fetch(GEOJSON_URL)
      .then((r) => r.json())
      .then((data: { features: CountryFeature[] }) => {
        const map: Record<string, string> = {};
        for (const f of data.features) {
          const p = f.properties;
          const iso2 = resolveNaturalEarthIso2(p);
          if (iso2) {
            map[iso2] = p.ADMIN ?? p.NAME ?? iso2;
          }
        }
        setCountryNames(map);
      })
      .catch(() => {});
  }, []);

  // Load visited & wishlist when user signs in
  useEffect(() => {
    if (!user) {
      setVisitedCountries([]);
      setWishlistCountries([]);
      return;
    }
    // Seed from user object returned by login/register/me
    if (user.visitedCountries?.length) setVisitedCountries(user.visitedCountries);
    if (user.wishlistCountries?.length) setWishlistCountries(user.wishlistCountries);

    // Also fetch fresh lists from the API
    const token = getToken();
    if (token) {
      getVisitedCountries(token).then(setVisitedCountries).catch(() => {});
      getWishlistCountries(token).then(setWishlistCountries).catch(() => {});
    }
  }, [user, getToken]);

  // ---------- Visited handlers ----------
  const handleToggleVisited = useCallback(
    async (iso2: string) => {
      const token = getToken();
      if (!token) return;
      const isCurrentlyVisited = visitedCountries.includes(iso2);
      if (isCurrentlyVisited) {
        const res = await unmarkVisited(token, iso2);
        setVisitedCountries(res.visitedCountries);
      } else {
        const res = await markVisited(token, iso2);
        setVisitedCountries(res.visitedCountries);
        // Marking as visited auto-removes from wishlist on the backend
        if (res.wishlistCountries) setWishlistCountries(res.wishlistCountries);
      }
    },
    [getToken, visitedCountries]
  );

  // ---------- Wishlist handlers ----------
  const handleToggleWishlist = useCallback(
    async (iso2: string) => {
      const token = getToken();
      if (!token) return;
      const isCurrentlyWishlisted = wishlistCountries.includes(iso2);
      if (isCurrentlyWishlisted) {
        const res = await removeFromWishlist(token, iso2);
        setWishlistCountries(res.wishlistCountries);
      } else {
        const res = await addToWishlist(token, iso2);
        setWishlistCountries(res.wishlistCountries);
        // Adding to wishlist auto-removes from visited on the backend
        if (res.visitedCountries) setVisitedCountries(res.visitedCountries);
      }
    },
    [getToken, wishlistCountries]
  );

  // ---------- Misc handlers ----------
  const handleLogout = useCallback(() => {
    setVisitedCountries([]);
    setWishlistCountries([]);
    setProfileOpen(false);
    setSelectedCountry(null);
    logout();
  }, [logout]);

  const handleProfileCountryClick = useCallback(
    (iso2: string) => {
      const name = countryNames[iso2] ?? iso2;
      setSelectedCountry({ name, iso2, iso3: iso2 });
      setProfileOpen(false);
    },
    [countryNames]
  );

  const handleLearnMore = useCallback((c: SelectedCountry) => {
    setDrawerCountry(c);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerCountry(null);
  }, []);

  const totalBadge = visitedCountries.length + wishlistCountries.length;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-globe-bg">
      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-white">Travel the Globe</h1>
          <button
            type="button"
            onClick={() => setExploreOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-amber-600/20 px-3 py-1.5 text-sm text-amber-400 transition hover:bg-amber-600/30"
            title="Explore other travelers"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Explore
          </button>
          <button
            type="button"
            onClick={() => setToursOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600/20 px-3 py-1.5 text-sm text-emerald-400 transition hover:bg-emerald-600/30"
            title="Browse tours"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tours
          </button>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            user ? (
              <div className="flex items-center gap-3">
                {visitedCountries.length > 0 && (
                  <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
                    {visitedCountries.length} visited
                  </span>
                )}
                {wishlistCountries.length > 0 && (
                  <span className="rounded-full bg-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-400">
                    {wishlistCountries.length} wishlist
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setProfileOpen((p) => !p)}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {user.displayName || user.email.split('@')[0]}
                </button>
                <button
                  type="button"
                  onClick={handleShareGlobe}
                  className="flex items-center gap-2 rounded-lg bg-blue-600/20 px-3 py-1.5 text-sm text-blue-400 transition hover:bg-blue-600/30"
                  title="Share your globe"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="rounded-lg bg-globe-highlight px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-600"
              >
                Sign in
              </button>
            )
          )}
        </div>
      </header>

      {/* Auth modal */}
      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}

      {/* Profile panel (full-screen dashboard) */}
      {profileOpen && user && (
        <ProfilePanel
          user={user}
          visitedCountries={visitedCountries}
          wishlistCountries={wishlistCountries}
          countryNames={countryNames}
          onClose={() => setProfileOpen(false)}
          onCountryClick={handleProfileCountryClick}
          onLogout={handleLogout}
          getToken={getToken}
          onShareGlobe={handleShareGlobe}
          onViewUser={(userId) => {
            setViewingUserId(userId);
            setProfileOpen(false);
          }}
        />
      )}

      {/* 3D Globe */}
      <GlobeView
        selectedCountry={selectedCountry}
        onCountrySelect={setSelectedCountry}
        visitedCountries={visitedCountries}
        wishlistCountries={wishlistCountries}
        autoRotate={autoRotate}
      />

      {/* Country info panel (right side) */}
      <CountryPanel
        country={selectedCountry}
        onClose={() => setSelectedCountry(null)}
        isVisited={selectedCountry ? visitedCountries.includes(selectedCountry.iso2) : false}
        isWishlisted={selectedCountry ? wishlistCountries.includes(selectedCountry.iso2) : false}
        onToggleVisited={handleToggleVisited}
        onToggleWishlist={handleToggleWishlist}
        isLoggedIn={Boolean(user)}
        onSignInClick={() => setAuthModalOpen(true)}
        onLearnMore={handleLearnMore}
      />

      {/* Country detail drawer (slides up from bottom) */}
      {drawerCountry && (
        <CountryDrawer
          country={drawerCountry}
          open={Boolean(drawerCountry)}
          onClose={handleCloseDrawer}
        />
      )}

      {/* Explore Users */}
      {exploreOpen && (
        <ExploreUsers
          onUserSelect={(userId) => {
            setViewingUserId(userId);
            setExploreOpen(false);
          }}
          onClose={() => setExploreOpen(false)}
        />
      )}

      {/* User Profile View */}
      {viewingUserId && (
        <UserProfileView
          userId={viewingUserId}
          countryNames={countryNames}
          onClose={handleCloseUserProfile}
          getToken={getToken}
        />
      )}

      {/* Auto-rotate toggle */}
      <button
        type="button"
        onClick={() => setAutoRotate((r) => !r)}
        className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-globe-ocean/80 px-3 py-2 text-xs text-slate-400 backdrop-blur transition hover:bg-globe-ocean hover:text-white"
        aria-label={autoRotate ? 'Pause rotation' : 'Resume rotation'}
      >
        {autoRotate ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        {autoRotate ? 'Pause rotation' : 'Rotate globe'}
      </button>

      {/* Help text + legend */}
      <div className="absolute bottom-4 left-4 space-y-1">
        <div className="rounded-lg bg-globe-ocean/80 px-3 py-2 text-xs text-slate-400 backdrop-blur">
          Drag to rotate • Scroll to zoom • Click a country to select
        </div>
        {totalBadge > 0 && (
          <div className="flex gap-3 rounded-lg bg-globe-ocean/80 px-3 py-2 text-xs backdrop-blur">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-slate-400">Visited</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-500" />
              <span className="text-slate-400">Wishlist</span>
            </span>
          </div>
        )}
      </div>

      {/* Tours Section */}
      {toursOpen && (
        <ToursSection
          onClose={() => setToursOpen(false)}
          getToken={getToken}
          userId={user?.id}
        />
      )}

      {/* Global Chat */}
      {user && <GlobalChat getToken={getToken} user={user} />}

      {/* Share toast notification */}
      {shareToast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 animate-bounce">
          <div className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Globe link copied to clipboard!
          </div>
        </div>
      )}
    </div>
  );
}
