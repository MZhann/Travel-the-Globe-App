import { useState, useEffect, useCallback, useRef, Fragment, type ReactNode } from 'react';
import type { Tour, TourPlan, AIChatMessage } from '../api/tours';
import {
  searchTours,
  getMyTourPlans,
  discoverTourPlans,
  createTourPlan,
  getTourPlan,
  joinTourPlan,
  leaveTourPlan,
  sendPlanMessage,
  chatWithAIAdvisor,
  getTourById,
} from '../api/tours';

type Tab = 'browse' | 'advisor' | 'plans';
type PlansSubTab = 'mine' | 'discover';
type TourType = '' | 'adventure' | 'cultural' | 'beach' | 'nature' | 'city' | 'cruise' | 'food' | 'historical';

const TYPE_OPTIONS: { value: TourType; label: string; icon: string }[] = [
  { value: '', label: 'All Types', icon: '🌍' },
  { value: 'adventure', label: 'Adventure', icon: '🏔️' },
  { value: 'cultural', label: 'Cultural', icon: '🏛️' },
  { value: 'beach', label: 'Beach', icon: '🏖️' },
  { value: 'nature', label: 'Nature', icon: '🌿' },
  { value: 'city', label: 'City', icon: '🏙️' },
  { value: 'cruise', label: 'Cruise', icon: '🚢' },
  { value: 'food', label: 'Food', icon: '🍜' },
  { value: 'historical', label: 'Historical', icon: '🏺' },
];

const SORT_OPTIONS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'duration', label: 'Duration' },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/20 text-green-400',
  moderate: 'bg-yellow-500/20 text-yellow-400',
  challenging: 'bg-red-500/20 text-red-400',
};

interface Props {
  onClose: () => void;
  getToken: () => string | null;
  userId?: string;
}

export default function ToursSection({ onClose, getToken, userId }: Props) {
  const [tab, setTab] = useState<Tab>('browse');
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TourType>('');
  const [sortBy, setSortBy] = useState('rating');
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  // AI Advisor
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStarted, setAiStarted] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  // Plans
  const [plansSubTab, setPlansSubTab] = useState<PlansSubTab>('mine');
  const [plans, setPlans] = useState<TourPlan[]>([]);
  const [discoverPlans, setDiscoverPlans] = useState<TourPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TourPlan | null>(null);
  const [planMsg, setPlanMsg] = useState('');
  const [plansLoading, setPlansLoading] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  useEffect(() => {
    loadTours();
  }, [typeFilter, sortBy]);

  const loadTours = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { sort: sortBy };
      if (typeFilter) params.type = typeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const data = await searchTours(params);
      setTours(data.tours);
    } catch (err) {
      console.error('Failed to load tours:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, sortBy, searchQuery]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      loadTours();
    },
    [loadTours]
  );

  // Load plans
  const refreshMyPlans = useCallback(() => {
    const token = getToken();
    if (!token) return;
    setPlansLoading(true);
    getMyTourPlans(token)
      .then((d) => setPlans(d.plans))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, [getToken]);

  const refreshDiscoverPlans = useCallback(() => {
    const token = getToken();
    if (!token) return;
    setDiscoverLoading(true);
    discoverTourPlans(token)
      .then((d) => setDiscoverPlans(d.plans))
      .catch(() => setDiscoverPlans([]))
      .finally(() => setDiscoverLoading(false));
  }, [getToken]);

  useEffect(() => {
    if (tab !== 'plans') return;
    if (plansSubTab === 'mine') refreshMyPlans();
    else refreshDiscoverPlans();
  }, [tab, plansSubTab, refreshMyPlans, refreshDiscoverPlans]);

  // AI advisor: start session
  const startAISession = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setAiStarted(true);
    setAiLoading(true);
    try {
      const data = await chatWithAIAdvisor(token, []);
      setAiMessages([{ role: 'assistant', content: data.reply }]);
    } catch {
      setAiMessages([
        {
          role: 'assistant',
          content:
            "Welcome to the Travel Tour Advisor! 🌍\n\nI'd love to help you find your perfect tour. Tell me — what kind of travel experience are you dreaming of?",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (tab === 'advisor' && !aiStarted) startAISession();
  }, [tab, aiStarted, startAISession]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  useEffect(() => {
    if (!aiLoading && tab === 'advisor') {
      setTimeout(() => aiInputRef.current?.focus(), 50);
    }
  }, [aiLoading, tab]);

  const sendAIMessage = useCallback(async () => {
    if (!aiInput.trim() || aiLoading) return;
    const token = getToken();
    if (!token) return;

    const userMsg: AIChatMessage = { role: 'user', content: aiInput.trim() };
    const updated = [...aiMessages, userMsg];
    setAiMessages(updated);
    setAiInput('');
    setAiLoading(true);

    try {
      const data = await chatWithAIAdvisor(token, updated);
      setAiMessages([...updated, { role: 'assistant', content: data.reply }]);
    } catch {
      setAiMessages([
        ...updated,
        {
          role: 'assistant',
          content:
            'Sorry, I had trouble generating a response. Please try again or browse tours directly in the catalog!',
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, aiLoading, aiMessages, getToken]);

  // Plan actions
  const handleCreatePlan = useCallback(
    async (tour: Tour) => {
      const token = getToken();
      if (!token) return;
      try {
        const data = await createTourPlan(token, { tourId: tour._id });
        setPlans((prev) => [data.plan, ...prev]);
        setTab('plans');
      } catch (err) {
        console.error('Failed to create plan:', err);
      }
    },
    [getToken]
  );

  const handleOpenPlan = useCallback(
    async (plan: TourPlan) => {
      const token = getToken();
      if (!token) return;
      try {
        const data = await getTourPlan(token, plan._id);
        setSelectedPlan(data.plan);
      } catch {
        setSelectedPlan(plan);
      }
    },
    [getToken]
  );

  const handleSendPlanMsg = useCallback(async () => {
    if (!planMsg.trim() || !selectedPlan) return;
    const token = getToken();
    if (!token) return;
    try {
      const data = await sendPlanMessage(token, selectedPlan._id, planMsg.trim());
      setSelectedPlan((prev) => (prev ? { ...prev, messages: data.messages } : prev));
      setPlanMsg('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [planMsg, selectedPlan, getToken]);

  const handleJoinPlan = useCallback(
    async (planId: string) => {
      const token = getToken();
      if (!token) return;
      try {
        const data = await joinTourPlan(token, planId);
        // Ensure the plan lives in the "mine" list after joining
        setPlans((prev) => {
          const found = prev.find((p) => p._id === planId);
          if (found) return prev.map((p) => (p._id === planId ? { ...p, ...data.plan } : p));
          return [data.plan, ...prev];
        });
        setDiscoverPlans((prev) => prev.filter((p) => p._id !== planId));
        setSelectedPlan(data.plan);
        setPlansSubTab('mine');
      } catch (err) {
        console.error('Failed to join plan:', err);
      }
    },
    [getToken]
  );

  const handleLeavePlan = useCallback(
    async (planId: string) => {
      const token = getToken();
      if (!token) return;
      try {
        const data = await leaveTourPlan(token, planId);
        // After leaving, user is no longer a member — remove from mine, refresh discover
        setPlans((prev) => prev.filter((p) => p._id !== planId));
        setSelectedPlan(null);
        if (data.plan.status === 'planning') {
          refreshDiscoverPlans();
        }
      } catch (err) {
        console.error('Failed to leave plan:', err);
      }
    },
    [getToken, refreshDiscoverPlans]
  );

  // Open a tour from anywhere (used by AI advisor links)
  const handleOpenTourById = useCallback(
    async (tourId: string) => {
      // Look up the cached tour first
      const cached = tours.find((t) => t._id === tourId);
      if (cached) {
        setTab('browse');
        setSelectedTour(cached);
        return;
      }
      try {
        const data = await getTourById(tourId);
        setTab('browse');
        setSelectedTour(data.tour);
      } catch (err) {
        console.error('Failed to open tour by id:', err);
      }
    },
    [tours]
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Tours & Travel</h2>
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {(
              [
                { key: 'browse' as Tab, label: 'Browse Tours', icon: '🗺️' },
                { key: 'advisor' as Tab, label: 'AI Advisor', icon: '🤖' },
                { key: 'plans' as Tab, label: 'My Plans', icon: '📋' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                  tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-white/10 p-2 text-slate-400 transition hover:bg-white/20 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'browse' && !selectedTour && (
          <div className="flex h-full flex-col">
            {/* Filters */}
            <div className="border-b border-white/10 bg-slate-900/50 px-6 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <form onSubmit={handleSearch} className="flex flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tours, countries, cities..."
                    className="flex-1 rounded-l-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="rounded-r-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Search
                  </button>
                </form>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TourType)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-slate-800">
                      {o.icon} {o.label}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-slate-800">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Type chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setTypeFilter(o.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      typeFilter === o.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {o.icon} {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tours grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : tours.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-slate-500">
                  <span className="text-4xl">🔍</span>
                  <p className="mt-2">No tours found. Try different filters.</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {tours.map((tour) => (
                    <TourCard
                      key={tour._id}
                      tour={tour}
                      onClick={() => setSelectedTour(tour)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tour Detail View */}
        {tab === 'browse' && selectedTour && (
          <TourDetail
            tour={selectedTour}
            onBack={() => setSelectedTour(null)}
            onCreatePlan={() => handleCreatePlan(selectedTour)}
            userId={userId}
          />
        )}

        {/* AI Advisor Tab */}
        {tab === 'advisor' && (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-3xl space-y-4">
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-slate-200'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.role === 'assistant'
                          ? renderAIMessage(msg.content, handleOpenTourById)
                          : msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white/10 px-5 py-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>
            </div>
            <div className="border-t border-white/10 bg-slate-900/80 p-4">
              <div className="mx-auto flex max-w-3xl gap-3">
                <input
                  ref={aiInputRef}
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendAIMessage()}
                  placeholder="Tell the AI advisor about your dream trip..."
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  disabled={aiLoading}
                />
                <button
                  onClick={sendAIMessage}
                  disabled={aiLoading || !aiInput.trim()}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
              <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-slate-600">
                AI will ask you questions about your preferences and recommend the best tours for you
              </p>
            </div>
          </div>
        )}

        {/* Plans Tab */}
        {tab === 'plans' && !selectedPlan && (
          <div className="h-full overflow-y-auto p-6">
            <div className="mx-auto max-w-4xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Tour Plans</h3>
                <div className="flex gap-1 rounded-lg bg-white/5 p-1 text-sm">
                  <button
                    onClick={() => setPlansSubTab('mine')}
                    className={`rounded-md px-3 py-1.5 font-medium transition ${
                      plansSubTab === 'mine'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    My Plans ({plans.length})
                  </button>
                  <button
                    onClick={() => setPlansSubTab('discover')}
                    className={`rounded-md px-3 py-1.5 font-medium transition ${
                      plansSubTab === 'discover'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Discover & Join
                  </button>
                </div>
              </div>

              {plansSubTab === 'mine' && (
                <>
                  {plansLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                      <span className="text-5xl">📋</span>
                      <p className="mt-3 text-lg">No plans yet</p>
                      <p className="mt-1 text-sm">
                        Browse tours to create your own, or discover open plans from other
                        travelers!
                      </p>
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => setTab('browse')}
                          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Browse Tours
                        </button>
                        <button
                          onClick={() => setPlansSubTab('discover')}
                          className="rounded-lg bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/20"
                        >
                          Discover Plans
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {plans.map((plan) => (
                        <PlanCard
                          key={plan._id}
                          plan={plan}
                          onClick={() => handleOpenPlan(plan)}
                          userId={userId}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {plansSubTab === 'discover' && (
                <>
                  <p className="mb-4 text-sm text-slate-400">
                    Browse tour plans created by other travelers. Join any plan to chat with the
                    group and collaborate on the trip.
                  </p>
                  {discoverLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    </div>
                  ) : discoverPlans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                      <span className="text-5xl">🧭</span>
                      <p className="mt-3 text-lg">No open plans right now</p>
                      <p className="mt-1 text-sm">
                        Be the first — create a plan and invite others to join!
                      </p>
                      <button
                        onClick={() => setTab('browse')}
                        className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Browse Tours
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {discoverPlans.map((plan) => (
                        <DiscoverPlanCard
                          key={plan._id}
                          plan={plan}
                          onOpen={() => handleOpenPlan(plan)}
                          onJoin={() => handleJoinPlan(plan._id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Plan Detail */}
        {tab === 'plans' && selectedPlan && (
          <PlanDetail
            plan={selectedPlan}
            onBack={() => setSelectedPlan(null)}
            userId={userId}
            planMsg={planMsg}
            setPlanMsg={setPlanMsg}
            onSendMsg={handleSendPlanMsg}
            onJoin={() => handleJoinPlan(selectedPlan._id)}
            onLeave={() => handleLeavePlan(selectedPlan._id)}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function TourCard({ tour, onClick }: { tour: Tour; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 text-left transition hover:border-blue-500/50 hover:bg-white/10"
    >
      <div className="relative h-44 w-full overflow-hidden">
        <img
          src={tour.imageUrl}
          alt={tour.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
          {TYPE_OPTIONS.find((t) => t.value === tour.type)?.icon} {tour.type}
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-bold text-yellow-400 backdrop-blur">
          ★ {tour.rating}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h4 className="text-sm font-semibold text-white line-clamp-2">{tour.title}</h4>
        <p className="mt-1 text-xs text-slate-400">
          {tour.city}, {tour.country}
        </p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <p className="text-lg font-bold text-blue-400">${tour.priceUsd}</p>
            <p className="text-xs text-slate-500">{tour.durationDays} days</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[tour.difficulty] ?? 'bg-slate-500/20 text-slate-400'}`}>
            {tour.difficulty}
          </span>
        </div>
      </div>
    </button>
  );
}

function TourDetail({
  tour,
  onBack,
  onCreatePlan,
  userId,
}: {
  tour: Tour;
  onBack: () => void;
  onCreatePlan: () => void;
  userId?: string;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="relative h-72 w-full md:h-96">
        <img src={tour.imageUrl} alt={tour.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />
        <button
          onClick={onBack}
          className="absolute left-4 top-4 rounded-lg bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="absolute bottom-6 left-6 right-6">
          <span className="rounded-full bg-blue-600/80 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {TYPE_OPTIONS.find((t) => t.value === tour.type)?.icon} {tour.type}
          </span>
          <h2 className="mt-2 text-3xl font-bold text-white">{tour.title}</h2>
          <p className="mt-1 text-slate-300">
            {tour.city}, {tour.country}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <p className="text-slate-300 leading-relaxed">{tour.description}</p>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">Highlights</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {tour.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-white/5 p-3">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-slate-300">{h}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">What's Included</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {tour.includes.map((inc, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-white/5 p-3">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                    <span className="text-sm text-slate-300">{inc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <p className="text-3xl font-bold text-blue-400">${tour.priceUsd}</p>
              <p className="text-sm text-slate-500">per person</p>
              <div className="mt-4 space-y-3">
                <InfoRow label="Duration" value={`${tour.durationDays} days`} />
                <InfoRow label="Difficulty" value={tour.difficulty} />
                <InfoRow label="Group Size" value={`Up to ${tour.maxGroupSize}`} />
                <InfoRow label="Best Season" value={tour.bestSeason} />
                <InfoRow label="Rating" value={`★ ${tour.rating} (${tour.reviewCount} reviews)`} />
                <InfoRow label="Provider" value={tour.provider} />
              </div>

              <div className="mt-6 space-y-2">
                {tour.externalUrl && (
                  <a
                    href={tour.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-lg bg-blue-600 py-3 text-center text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Visit Provider Website
                  </a>
                )}
                {userId && (
                  <button
                    onClick={onCreatePlan}
                    className="block w-full rounded-lg bg-green-600 py-3 text-center text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    Create Group Plan
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium capitalize text-slate-300">{value}</span>
    </div>
  );
}

function PlanCard({
  plan,
  onClick,
  userId,
}: {
  plan: TourPlan;
  onClick: () => void;
  userId?: string;
}) {
  const tour = plan.tour;
  const statusColor =
    plan.status === 'confirmed'
      ? 'bg-green-500/20 text-green-400'
      : plan.status === 'cancelled'
        ? 'bg-red-500/20 text-red-400'
        : 'bg-blue-500/20 text-blue-400';
  const isCreator = plan.creatorId === userId;

  return (
    <button
      onClick={onClick}
      className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-blue-500/50 hover:bg-white/10"
    >
      {tour?.imageUrl && (
        <img src={tour.imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-semibold text-white">{plan.title}</h4>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
            {plan.status}
          </span>
        </div>
        {tour && (
          <p className="mt-1 text-xs text-slate-400">
            {tour.city}, {tour.country} — ${tour.priceUsd}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span>{plan.members?.length ?? 0} members</span>
          <span>{plan.messages?.length ?? 0} messages</span>
          {isCreator && <span className="text-amber-400">Creator</span>}
        </div>
      </div>
    </button>
  );
}

function DiscoverPlanCard({
  plan,
  onOpen,
  onJoin,
}: {
  plan: TourPlan;
  onOpen: () => void;
  onJoin: () => void;
}) {
  const tour = plan.tour;
  const creator = plan.creatorDetails;
  const creatorName =
    creator?.displayName || creator?.email?.split('@')[0] || 'Unknown traveler';

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJoin();
  };

  return (
    <div
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-emerald-500/50 hover:bg-white/10"
    >
      {tour?.imageUrl && (
        <div className="relative h-32 w-full overflow-hidden">
          <img src={tour.imageUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
            {tour.type}
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-white line-clamp-2">{plan.title}</h4>
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
            {plan.status}
          </span>
        </div>
        {tour && (
          <p className="mt-1 text-xs text-slate-400">
            {tour.city}, {tour.country} — ${tour.priceUsd} · {tour.durationDays} days
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span>by <span className="text-amber-400">{creatorName}</span></span>
          <span>·</span>
          <span>{plan.members?.length ?? 0} members</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="text-xs text-slate-400 hover:text-white"
          >
            View details →
          </button>
          <button
            type="button"
            onClick={handleJoinClick}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
          >
            Join plan
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Parse AI advisor message content and replace `[[tour:ID|Title]]` tokens
 * with clickable buttons. Also matches legacy `Tour ID: <24-char-id>` for
 * backward compatibility.
 */
function renderAIMessage(content: string, onOpenTour: (id: string) => void): ReactNode {
  // Combined regex: matches [[tour:ID|Title]] OR "Tour ID: <24-char-hex>"
  const combined = /\[\[tour:([a-f0-9]{24})\|([^\]]+)\]\]|Tour ID:\s*([a-f0-9]{24})/gi;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = combined.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`t-${key++}`}>{content.slice(lastIndex, match.index)}</Fragment>
      );
    }
    const id = match[1] ?? match[3];
    const label = match[2] ?? 'Open tour';
    nodes.push(
      <button
        key={`link-${key++}`}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenTour(id);
        }}
        className="rounded px-1 font-medium text-blue-300 underline-offset-2 transition hover:bg-blue-500/10 hover:text-blue-200 hover:underline"
      >
        {label}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    nodes.push(<Fragment key={`t-${key++}`}>{content.slice(lastIndex)}</Fragment>);
  }

  return nodes.length > 0 ? nodes : content;
}

function PlanDetail({
  plan,
  onBack,
  userId,
  planMsg,
  setPlanMsg,
  onSendMsg,
  onJoin,
  onLeave,
}: {
  plan: TourPlan;
  onBack: () => void;
  userId?: string;
  planMsg: string;
  setPlanMsg: (v: string) => void;
  onSendMsg: () => void;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMember = plan.members?.includes(userId ?? '');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [plan.messages]);

  const tour = plan.tour;

  return (
    <div className="flex h-full flex-col">
      {/* Plan header */}
      <div className="border-b border-white/10 bg-slate-900/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-lg bg-white/10 p-1.5 text-slate-400 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
            {tour && (
              <p className="text-sm text-slate-400">
                {tour.city}, {tour.country} — ${tour.priceUsd}/person — {tour.durationDays} days
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isMember && (
              <button onClick={onJoin} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                Join Plan
              </button>
            )}
            {isMember && plan.creatorId !== userId && (
              <button onClick={onLeave} className="rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-600/30">
                Leave
              </button>
            )}
          </div>
        </div>
        {/* Members */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(plan.memberDetails ?? []).map((m) => (
            <span
              key={m._id}
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                m._id === plan.creatorId ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-slate-400'
              }`}
            >
              {m.displayName || m.email?.split('@')[0] || 'User'}
              {m._id === plan.creatorId ? ' (creator)' : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-3">
          {(plan.messages ?? []).length === 0 && (
            <div className="py-10 text-center text-slate-500">
              <p className="text-3xl">💬</p>
              <p className="mt-2">No messages yet. Start discussing this trip!</p>
            </div>
          )}
          {(plan.messages ?? []).map((msg, i) => {
            const isMe = msg.userId === userId;
            const isSystem = msg.message.endsWith('joined the plan!') || msg.message.endsWith('left the plan.') || msg.message.includes('invited');
            if (isSystem) {
              return (
                <div key={i} className="text-center text-xs text-slate-600">
                  <span className="font-medium text-slate-500">{msg.displayName}</span> {msg.message}
                </div>
              );
            }
            return (
              <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-200'}`}>
                  {!isMe && <p className="mb-1 text-xs font-medium text-blue-400">{msg.displayName}</p>}
                  <p className="text-sm">{msg.message}</p>
                  <p className="mt-0.5 text-right text-[10px] opacity-60">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      {isMember && (
        <div className="border-t border-white/10 bg-slate-900/80 p-4">
          <div className="mx-auto flex max-w-3xl gap-3">
            <input
              type="text"
              value={planMsg}
              onChange={(e) => setPlanMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSendMsg()}
              placeholder="Discuss this trip with your group..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
            <button
              onClick={onSendMsg}
              disabled={!planMsg.trim()}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
