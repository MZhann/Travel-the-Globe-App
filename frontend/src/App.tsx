import { useState } from 'react';
import GlobeView from './components/Globe';
import CountryPanel from './components/CountryPanel';
import AuthModal from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import type { SelectedCountry } from './types/globe';

export default function App() {
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, logout, loading } = useAuth();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-globe-bg">
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-white">Travel the Globe</h1>
        <div className="flex items-center gap-3">
          {!loading && (
            user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-300">
                  {user.displayName || user.email}
                </span>
                <button
                  type="button"
                  onClick={logout}
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

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}

      <GlobeView
        selectedCountry={selectedCountry}
        onCountrySelect={setSelectedCountry}
      />

      <CountryPanel
        country={selectedCountry}
        onClose={() => setSelectedCountry(null)}
      />

      <div className="absolute bottom-4 left-4 rounded-lg bg-globe-ocean/80 px-3 py-2 text-xs text-slate-400 backdrop-blur">
        Drag to rotate • Scroll to zoom • Click a country to select
      </div>
    </div>
  );
}
