import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchCountryInfo,
  fetchCountryNews,
  formatPopulation,
  formatArea,
  timeAgo,
  type CountryInfoData,
  type NewsArticle,
} from '../api/countryInfo';
import type { SelectedCountry } from '../types/globe';

interface CountryDrawerProps {
  country: SelectedCountry;
  open: boolean;
  onClose: () => void;
}

export default function CountryDrawer({ country, open, onClose }: CountryDrawerProps) {
  const [visible, setVisible] = useState(false);

  // Animate in/out
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  const { data: info, isLoading: infoLoading } = useQuery({
    queryKey: ['country-info', country.iso2],
    queryFn: () => fetchCountryInfo(country.iso2),
    enabled: open,
    staleTime: 1000 * 60 * 60, // 1h
  });

  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ['country-news', country.iso2],
    queryFn: () => fetchCountryNews(country.iso2, country.name),
    enabled: open,
    staleTime: 1000 * 60 * 15, // 15min
  });

  if (!open) return null;

  const name = info?.name?.common ?? country.name;
  const officialName = info?.name?.official;
  const articles = newsData?.articles ?? [];
  const newsNote = newsData?.note;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[85vh] transform overflow-hidden rounded-t-3xl border-t border-white/10 bg-globe-ocean shadow-2xl transition-transform duration-500 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pb-8" style={{ maxHeight: 'calc(85vh - 2rem)' }}>
          {/* ===== HEADER with flag ===== */}
          <div className="mb-6 flex items-start gap-4">
            {info?.flags?.svg && (
              <img
                src={info.flags.svg}
                alt={info.flags.alt ?? `Flag of ${name}`}
                className="h-16 w-24 rounded-lg border border-white/10 object-cover shadow-lg"
              />
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{name}</h2>
                  {officialName && officialName !== name && (
                    <p className="text-sm text-slate-400">{officialName}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {info?.region && (
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                    {info.region}
                  </span>
                )}
                {info?.subregion && (
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400/80">
                    {info.subregion}
                  </span>
                )}
                {info?.unMember && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                    🇺🇳 UN Member
                  </span>
                )}
              </div>
            </div>
          </div>

          {infoLoading && (
            <div className="mb-6 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-globe-highlight" />
            </div>
          )}

          {info && <InfoGrid info={info} />}

          {/* ===== LANGUAGES & CURRENCIES ===== */}
          {info && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {info.languages && Object.keys(info.languages).length > 0 && (
                <DetailCard title="🗣️ Languages">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.values(info.languages).map((lang) => (
                      <span key={lang} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                        {lang}
                      </span>
                    ))}
                  </div>
                </DetailCard>
              )}
              {info.currencies && Object.keys(info.currencies).length > 0 && (
                <DetailCard title="💰 Currencies">
                  <div className="space-y-1">
                    {Object.entries(info.currencies).map(([code, cur]) => (
                      <div key={code} className="text-sm text-slate-300">
                        <span className="font-medium text-white">{cur.symbol}</span>{' '}
                        {cur.name}{' '}
                        <span className="text-xs text-slate-500">({code})</span>
                      </div>
                    ))}
                  </div>
                </DetailCard>
              )}
            </div>
          )}

          {/* ===== EXTRA INFO ===== */}
          {info && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {info.timezones && info.timezones.length > 0 && (
                <DetailCard title="🕐 Timezones">
                  <p className="text-sm text-slate-300">{info.timezones.join(', ')}</p>
                </DetailCard>
              )}
              {info.car?.side && (
                <DetailCard title="🚗 Driving">
                  <p className="text-sm text-slate-300">
                    Drives on the <span className="font-medium text-white">{info.car.side}</span> side
                  </p>
                </DetailCard>
              )}
              {info.tld && info.tld.length > 0 && (
                <DetailCard title="🌐 Domain">
                  <p className="text-sm font-mono text-slate-300">{info.tld.join(', ')}</p>
                </DetailCard>
              )}
              {info.borders && info.borders.length > 0 && (
                <DetailCard title="🗺️ Borders">
                  <p className="text-sm text-slate-300">{info.borders.join(', ')}</p>
                </DetailCard>
              )}
            </div>
          )}

          {/* ===== MAPS ===== */}
          {info?.maps && (
            <div className="mt-4 flex gap-3">
              {info.maps.googleMaps && (
                <a
                  href={info.maps.googleMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  Google Maps
                </a>
              )}
              {info.maps.openStreetMaps && (
                <a
                  href={info.maps.openStreetMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  🗺️ OpenStreetMap
                </a>
              )}
            </div>
          )}

          {/* ===== NEWS SECTION ===== */}
          <div className="mt-8">
            <h3 className="mb-4 text-lg font-semibold text-white">
              📰 Latest News — {name}
            </h3>

            {newsLoading && (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-globe-highlight" />
              </div>
            )}

            {!newsLoading && articles.length === 0 && (
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-center text-sm text-slate-500">
                {newsNote ?? 'No recent news available for this country.'}
              </div>
            )}

            {articles.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article, i) => (
                  <NewsCard key={i} article={article} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============ Sub-components ============

function InfoGrid({ info }: { info: CountryInfoData }) {
  const stats = [
    { label: 'Capital', value: info.capital?.join(', ') ?? '—', icon: '🏛️' },
    { label: 'Population', value: formatPopulation(info.population), icon: '👥' },
    { label: 'Area', value: formatArea(info.area), icon: '📐' },
    {
      label: 'Continent',
      value: info.continents?.join(', ') ?? info.region ?? '—',
      icon: '🌍',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-white/5 bg-white/5 p-3 text-center"
        >
          <div className="text-xl">{s.icon}</div>
          <div className="mt-1 text-base font-semibold text-white">{s.value}</div>
          <div className="text-xs text-slate-500">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-4">
      <h4 className="mb-2 text-sm font-medium text-slate-400">{title}</h4>
      {children}
    </div>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-white/5 bg-white/5 transition hover:border-white/10 hover:bg-white/10"
    >
      {article.image && (
        <div className="h-32 w-full overflow-hidden">
          <img
            src={article.image}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-3">
        <h4 className="line-clamp-2 text-sm font-medium text-white group-hover:text-globe-highlight">
          {article.title}
        </h4>
        {article.description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{article.description}</p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-slate-500">
          <span>{article.source}</span>
          <span>·</span>
          <span>{timeAgo(article.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}

