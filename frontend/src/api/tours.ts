import { API_BASE } from './config';

export interface Tour {
  _id: string;
  title: string;
  description: string;
  country: string;
  countryCode: string;
  city: string;
  priceUsd: number;
  durationDays: number;
  type: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  highlights: string[];
  includes: string[];
  provider: string;
  externalUrl: string;
  maxGroupSize: number;
  difficulty: string;
  bestSeason: string;
}

export interface TourPlanMessage {
  _id?: string;
  userId: string;
  displayName: string;
  message: string;
  createdAt: string;
}

export interface TourPlan {
  _id: string;
  tourId: string;
  creatorId: string;
  title: string;
  status: 'planning' | 'confirmed' | 'cancelled';
  members: string[];
  messages: TourPlanMessage[];
  plannedDate?: string;
  notes: string;
  tour?: Tour | null;
  memberDetails?: Array<{ _id: string; email?: string; displayName?: string }>;
  creatorDetails?: { _id: string; email?: string; displayName?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error('[tours] Invalid JSON:', text.slice(0, 200));
    throw new Error('Invalid response from server');
  }
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function searchTours(params?: {
  country?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  minDays?: number;
  maxDays?: number;
  difficulty?: string;
  search?: string;
  sort?: string;
  limit?: number;
}): Promise<{ tours: Tour[]; total: number }> {
  const qp = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) qp.set(k, String(v));
    });
  }
  const res = await fetch(`${API_BASE}/tours?${qp.toString()}`);
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to fetch tours');
  return json as unknown as { tours: Tour[]; total: number };
}

export async function getTourById(id: string): Promise<{ tour: Tour }> {
  const res = await fetch(`${API_BASE}/tours/${id}`);
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Tour not found');
  return json as unknown as { tour: Tour };
}

export async function getMyTourPlans(token: string): Promise<{ plans: TourPlan[] }> {
  const res = await fetch(`${API_BASE}/tour-plans`, { headers: authHeaders(token) });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to fetch tour plans');
  return json as unknown as { plans: TourPlan[] };
}

export async function discoverTourPlans(
  token: string,
  limit = 30
): Promise<{ plans: TourPlan[] }> {
  const res = await fetch(`${API_BASE}/tour-plans/discover?limit=${limit}`, {
    headers: authHeaders(token),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to discover plans');
  return json as unknown as { plans: TourPlan[] };
}

export async function createTourPlan(
  token: string,
  data: { tourId: string; title?: string; plannedDate?: string; notes?: string }
): Promise<{ plan: TourPlan }> {
  const res = await fetch(`${API_BASE}/tour-plans`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to create plan');
  return json as unknown as { plan: TourPlan };
}

export async function getTourPlan(token: string, planId: string): Promise<{ plan: TourPlan }> {
  const res = await fetch(`${API_BASE}/tour-plans/${planId}`, { headers: authHeaders(token) });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Plan not found');
  return json as unknown as { plan: TourPlan };
}

export async function joinTourPlan(token: string, planId: string): Promise<{ plan: TourPlan }> {
  const res = await fetch(`${API_BASE}/tour-plans/${planId}/join`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to join plan');
  return json as unknown as { plan: TourPlan };
}

export async function leaveTourPlan(token: string, planId: string): Promise<{ plan: TourPlan }> {
  const res = await fetch(`${API_BASE}/tour-plans/${planId}/leave`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to leave plan');
  return json as unknown as { plan: TourPlan };
}

export async function sendPlanMessage(
  token: string,
  planId: string,
  message: string
): Promise<{ messages: TourPlanMessage[] }> {
  const res = await fetch(`${API_BASE}/tour-plans/${planId}/messages`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ message }),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to send message');
  return json as unknown as { messages: TourPlanMessage[] };
}

export async function updateTourPlan(
  token: string,
  planId: string,
  data: { status?: string; notes?: string; plannedDate?: string; title?: string }
): Promise<{ plan: TourPlan }> {
  const res = await fetch(`${API_BASE}/tour-plans/${planId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to update plan');
  return json as unknown as { plan: TourPlan };
}

export async function inviteToPlan(
  token: string,
  planId: string,
  userId: string
): Promise<{ plan: TourPlan }> {
  const res = await fetch(`${API_BASE}/tour-plans/${planId}/invite`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ userId }),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to invite user');
  return json as unknown as { plan: TourPlan };
}

export async function chatWithAIAdvisor(
  token: string,
  messages: AIChatMessage[]
): Promise<{ reply: string; fallback?: boolean }> {
  const res = await fetch(`${API_BASE}/ai-advisor/chat`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ messages }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    if (json.fallback && json.message) {
      return { reply: json.message as string, fallback: true };
    }
    throw new Error((json.error as string) || 'AI advisor error');
  }
  return json as unknown as { reply: string; fallback?: boolean };
}

export async function getAIAdvisorStatus(): Promise<{ available: boolean; model: string | null }> {
  const res = await fetch(`${API_BASE}/ai-advisor/status`);
  const json = await parseJson(res);
  if (!res.ok) return { available: false, model: null };
  return json as unknown as { available: boolean; model: string | null };
}
