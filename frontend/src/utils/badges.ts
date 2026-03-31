import type { Badge } from '../api/users';

export const TIER_COLORS: Record<Badge['tier'], { bg: string; border: string; text: string; glow: string }> = {
  bronze:   { bg: 'bg-amber-900/30',   border: 'border-amber-700/50',   text: 'text-amber-400',   glow: 'shadow-amber-900/20' },
  silver:   { bg: 'bg-slate-600/30',    border: 'border-slate-500/50',   text: 'text-slate-300',   glow: 'shadow-slate-600/20' },
  gold:     { bg: 'bg-yellow-600/30',   border: 'border-yellow-500/50',  text: 'text-yellow-400',  glow: 'shadow-yellow-600/20' },
  platinum: { bg: 'bg-cyan-600/30',     border: 'border-cyan-500/50',    text: 'text-cyan-300',    glow: 'shadow-cyan-600/20' },
  diamond:  { bg: 'bg-violet-600/30',   border: 'border-violet-400/50',  text: 'text-violet-300',  glow: 'shadow-violet-600/30' },
};

export const TIER_LABELS: Record<Badge['tier'], string> = {
  bronze:   'Bronze',
  silver:   'Silver',
  gold:     'Gold',
  platinum: 'Platinum',
  diamond:  'Diamond',
};

export const ALL_BADGE_DEFS: (Badge & { requirement: string })[] = [
  { id: 'first_step', name: 'First Step', icon: '👣', description: 'Visit your first country', tier: 'bronze', requirement: '1 country visited' },
  { id: 'explorer', name: 'Explorer', icon: '🧭', description: 'Visit 5 countries', tier: 'bronze', requirement: '5 countries visited' },
  { id: 'adventurer', name: 'Adventurer', icon: '🏔️', description: 'Visit 10 countries', tier: 'silver', requirement: '10 countries visited' },
  { id: 'globetrotter', name: 'Globetrotter', icon: '✈️', description: 'Visit 25 countries', tier: 'silver', requirement: '25 countries visited' },
  { id: 'world_traveler', name: 'World Traveler', icon: '🌍', description: 'Visit 50 countries', tier: 'gold', requirement: '50 countries visited' },
  { id: 'centurion', name: 'Centurion', icon: '🗺️', description: 'Visit 100 countries', tier: 'platinum', requirement: '100 countries visited' },
  { id: 'legend', name: 'Legend', icon: '👑', description: 'Visit 150 countries', tier: 'diamond', requirement: '150 countries visited' },
  { id: 'world_master', name: 'World Master', icon: '🏆', description: 'Visit every country on Earth', tier: 'diamond', requirement: '195 countries visited' },
  { id: 'continent_starter', name: 'Continent Starter', icon: '🌐', description: 'Visit countries on 1 continent', tier: 'bronze', requirement: '1 continent' },
  { id: 'multi_continental', name: 'Multi-Continental', icon: '🛫', description: 'Visit countries on 3 continents', tier: 'silver', requirement: '3 continents' },
  { id: 'all_continents', name: 'All Continents', icon: '🌏', description: 'Visit all 6 inhabited continents', tier: 'diamond', requirement: '6 continents' },
  { id: 'photographer', name: 'Photographer', icon: '📸', description: 'Share your first travel memory', tier: 'bronze', requirement: '1 photo shared' },
  { id: 'memory_keeper', name: 'Memory Keeper', icon: '📚', description: 'Share 10 travel memories', tier: 'silver', requirement: '10 photos shared' },
  { id: 'storyteller', name: 'Storyteller', icon: '🎬', description: 'Share 50 travel memories', tier: 'gold', requirement: '50 photos shared' },
  { id: 'first_follower', name: 'First Follower', icon: '🤗', description: 'Got your first follower', tier: 'bronze', requirement: '1 follower' },
  { id: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', description: 'Have 5 followers', tier: 'silver', requirement: '5 followers' },
  { id: 'influencer', name: 'Influencer', icon: '⭐', description: 'Have 25 followers', tier: 'gold', requirement: '25 followers' },
  { id: 'friendly', name: 'Friendly', icon: '🤝', description: 'Follow 5 travelers', tier: 'bronze', requirement: 'Follow 5 people' },
  { id: 'dreamer', name: 'Dreamer', icon: '💭', description: 'Add 10 countries to your wishlist', tier: 'bronze', requirement: '10 wishlist countries' },
  { id: 'big_dreamer', name: 'Big Dreamer', icon: '🌠', description: 'Add 50 countries to your wishlist', tier: 'silver', requirement: '50 wishlist countries' },
];

export const CONTINENT_COLORS: Record<string, string> = {
  'Africa': '#f59e0b',
  'Asia': '#ef4444',
  'Europe': '#3b82f6',
  'North America': '#22c55e',
  'South America': '#a855f7',
  'Oceania': '#06b6d4',
};

export const CONTINENT_TOTAL_COUNTRIES: Record<string, number> = {
  'Africa': 54,
  'Asia': 48,
  'Europe': 44,
  'North America': 23,
  'South America': 12,
  'Oceania': 14,
};
