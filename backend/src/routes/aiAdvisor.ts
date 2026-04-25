import { Response, Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Tour, { ITourDoc } from '../models/Tour';

const router = Router();

function getConfig() {
  return {
    apiKey: (process.env.OPENAI_API_KEY ?? '').trim(),
    baseUrl: (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').trim(),
    model: (process.env.OPENAI_MODEL ?? process.env.AI_MODEL ?? 'gpt-4o-mini').trim(),
  };
}

interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type LeanTour = Pick<ITourDoc, '_id' | 'title'> & { _id: unknown };

function normalizeTitleKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function looksLikeObjectId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

async function normalizeAdvisorReply(reply: string): Promise<string> {
  // Replace any [[tour:ID|Title]] token with a canonical version from DB.
  // This prevents mismatches where the model outputs the correct title but a wrong/random ID (or vice versa).
  const tokenRe = /\[\[tour:([^\]|]+)\|([^\]]+)\]\]/g;
  const tokens = Array.from(reply.matchAll(tokenRe)).map((m, idx) => {
    const full = m[0] ?? '';
    const id = String(m[1] ?? '').trim();
    const title = String(m[2] ?? '').trim();
    const placeholder = `__TOUR_TOKEN_${idx}__`;
    return { full, id, title, placeholder };
  });
  if (tokens.length === 0) return reply;

  // First, replace tokens with placeholders so we can safely do async resolution.
  let cursor = 0;
  let tokenIdx = 0;
  const withPlaceholders = reply.replace(tokenRe, () => tokens[tokenIdx++]?.placeholder ?? '');

  const candidateIds = Array.from(new Set(tokens.map((t) => t.id).filter(looksLikeObjectId)));

  // Fetch only what we need (small payload).
  const toursById = new Map<string, { id: string; title: string }>();
  if (candidateIds.length > 0) {
    const found = (await Tour.find({ _id: { $in: candidateIds } }, { title: 1 }).lean()) as unknown as LeanTour[];
    for (const t of found) {
      const id = String(t._id);
      toursById.set(id.toLowerCase(), { id, title: (t as unknown as { title: string }).title });
    }
  }

  const unresolvedByTitle = tokens.some((t) => !looksLikeObjectId(t.id) || !toursById.has(t.id.toLowerCase()));

  let toursByTitleKey: Map<string, { id: string; title: string }> | null = null;
  if (unresolvedByTitle) {
    const all = (await Tour.find({}, { title: 1 }).lean()) as unknown as LeanTour[];
    toursByTitleKey = new Map<string, { id: string; title: string }>();
    for (const t of all) {
      const id = String(t._id);
      const title = (t as unknown as { title: string }).title;
      toursByTitleKey.set(normalizeTitleKey(title), { id, title });
    }
  }

  let result = withPlaceholders;
  for (const t of tokens) {
    let replacement: string | null = null;

    if (looksLikeObjectId(t.id)) {
      const byId = toursById.get(t.id.toLowerCase());
      if (byId) replacement = `[[tour:${byId.id}|${byId.title}]]`;
    }

    if (!replacement && toursByTitleKey) {
      const byTitle = toursByTitleKey.get(normalizeTitleKey(t.title));
      if (byTitle) replacement = `[[tour:${byTitle.id}|${byTitle.title}]]`;
    }

    // If we can't resolve safely, keep the original token (better than linking to a wrong tour).
    if (!replacement) replacement = t.full;

    result = result.replace(t.placeholder, replacement);
    cursor++;
  }

  return result;
}

async function callOpenAI(messages: ChatMsg[]): Promise<string> {
  const { apiKey, baseUrl, model } = getConfig();
  console.log(`[AI Advisor] Calling OpenAI — model: ${model}, baseUrl: ${baseUrl}, keyLen: ${apiKey.length}`);

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${body}`);
  }

  const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.';
}

async function getToursContext(): Promise<string> {
  try {
    const tours = await Tour.find().lean();
    if (tours.length === 0) return 'No tours available in the database yet.';

    return tours
      .map(
        (t) =>
          `[ID:${t._id}] "${t.title}" — ${t.country}, ${t.city} | ${t.durationDays} days | $${t.priceUsd} | Type: ${t.type} | Difficulty: ${t.difficulty} | Rating: ${t.rating}/5 (${t.reviewCount} reviews) | Season: ${t.bestSeason} | Highlights: ${t.highlights.join(', ')} | Includes: ${t.includes.join(', ')}`
      )
      .join('\n');
  } catch {
    return 'Unable to fetch tours from database.';
  }
}

const SYSTEM_PROMPT = `You are an expert AI Travel Tour Advisor for the "Travel the Globe" app. Your role is to help users find their perfect tour.

CONVERSATION FLOW:
1. Start by warmly greeting the user and asking what kind of travel experience they're looking for.
2. Ask clarifying questions ONE AT A TIME (not all at once). Key topics to cover:
   - Preferred destination region or specific country
   - Travel style (adventure, relaxation, cultural, food, etc.)
   - Budget range
   - Trip duration preference
   - Physical fitness level / difficulty preference
   - Preferred travel season
   - Group size preference
   - Any specific interests or requirements
3. After gathering enough info (usually 3-5 questions), recommend 2-3 tours from the available catalog.
4. For each recommendation, explain WHY it matches their preferences.
5. Offer to create a tour plan if they're interested.

RULES:
- Be conversational, friendly, and enthusiastic about travel
- Ask ONE question at a time to keep the conversation natural
- Use emojis sparingly to keep the tone fun
- When recommending a tour, link to it using the EXACT format [[tour:TOUR_ID|Tour Title]] (use the double-bracket syntax so the app can render a clickable link). Do not include the raw ID anywhere else.
- Format tour recommendations clearly with name, price, duration, and match reasoning
- If no tours match perfectly, suggest the closest options and explain trade-offs
- Keep responses concise (2-4 short paragraphs max)
- When you have enough information to make recommendations, present them in this format:

RECOMMENDATIONS:
**1. [[tour:TOUR_ID|Tour Title]]**
- Price: $X | Duration: X days | Difficulty: X
- Why it's perfect for you: [personalized explanation]

**2. [[tour:TOUR_ID|Tour Title]]**
- Price: $X | Duration: X days | Difficulty: X
- Why it's perfect for you: [personalized explanation]

AVAILABLE TOURS:
{TOURS_CONTEXT}`;

/**
 * POST /api/ai-advisor/chat — AI advisor conversation
 * Body: { messages: ChatMsg[] }
 */
router.post('/chat', requireAuth, async (req: AuthRequest, res: Response) => {
  const userMessages: ChatMsg[] = (req.body.messages ?? []).filter(
    (m: ChatMsg) => m.role === 'user' || m.role === 'assistant'
  );

  const { apiKey } = getConfig();
  if (apiKey) {
    try {
      const toursContext = await getToursContext();
      const systemPrompt = SYSTEM_PROMPT.replace('{TOURS_CONTEXT}', toursContext);
      const fullMessages: ChatMsg[] = [{ role: 'system', content: systemPrompt }, ...userMessages];
      const rawReply = await callOpenAI(fullMessages);
      const reply = await normalizeAdvisorReply(rawReply);
      res.json({ reply });
      return;
    } catch (err) {
      console.error('AI advisor OpenAI error:', err);
    }
  }

  try {
    const rawReply = await buildSmartFallback(userMessages);
    const reply = await normalizeAdvisorReply(rawReply);
    res.json({ reply, fallback: true });
  } catch (err) {
    console.error('AI advisor fallback error:', err);
    res.status(500).json({ error: 'AI advisor failed' });
  }
});

/**
 * GET /api/ai-advisor/status — Check if AI is configured
 */
router.get('/status', (_req, res: Response) => {
  const { apiKey, model } = getConfig();
  res.json({ available: !!apiKey, model: apiKey ? model : null });
});

/* ─── Smart Fallback ─── */

interface UserPrefs {
  types: string[];
  maxBudget: number;
  minDays: number;
  maxDays: number;
  difficulty: string | null;
  wantsRecommendation: boolean;
}

const TYPE_KEYWORDS: Record<string, string[]> = {
  adventure: ['adventure', 'adventurous', 'thrill', 'exciting', 'adrenaline', 'trek', 'trekking', 'hiking', 'climb', 'extreme', 'explore', 'expedition'],
  cultural: ['culture', 'cultural', 'history', 'heritage', 'museum', 'art', 'temple', 'local', 'tradition', 'spiritual', 'wellness', 'yoga'],
  beach: ['beach', 'sun', 'ocean', 'sea', 'island', 'swim', 'snorkel', 'dive', 'tropical', 'resort', 'relax', 'relaxation', 'chill'],
  nature: ['nature', 'wildlife', 'safari', 'animal', 'forest', 'mountain', 'northern lights', 'aurora', 'glacier', 'waterfall', 'landscape'],
  city: ['city', 'urban', 'nightlife', 'shopping', 'skyline', 'metropolitan'],
  cruise: ['cruise', 'sail', 'sailing', 'yacht', 'boat', 'ship'],
  food: ['food', 'culinary', 'gastronomy', 'cooking', 'cuisine', 'eat', 'taste', 'restaurant', 'street food'],
  historical: ['historical', 'ancient', 'ruins', 'archaeology', 'palace', 'castle', 'medieval', 'empire', 'roman'],
};

function parsePreferences(messages: ChatMsg[]): UserPrefs {
  const userTexts = messages.filter((m) => m.role === 'user').map((m) => m.content.toLowerCase());
  const allText = userTexts.join(' ');

  const types: string[] = [];
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some((kw) => allText.includes(kw))) types.push(type);
  }

  let maxBudget = 99999;
  const budgetMatch = allText.match(/(\d[\d,]*)\s*\$|\$\s*(\d[\d,]*)|under\s+\$?\s*(\d[\d,]*)|(\d[\d,]*)\s*(?:dollar|usd|budget)/);
  if (budgetMatch) {
    const raw = (budgetMatch[1] || budgetMatch[2] || budgetMatch[3] || budgetMatch[4]).replace(/,/g, '');
    maxBudget = parseInt(raw, 10) || 99999;
  }

  let minDays = 0;
  let maxDays = 999;
  const daysMatch = allText.match(/(\d+)\s*[-–to]+\s*(\d+)\s*day/);
  const singleDayMatch = allText.match(/(\d+)\s*day/);
  if (daysMatch) {
    minDays = parseInt(daysMatch[1], 10);
    maxDays = parseInt(daysMatch[2], 10);
  } else if (singleDayMatch) {
    const d = parseInt(singleDayMatch[1], 10);
    minDays = Math.max(1, d - 2);
    maxDays = d + 2;
  }

  let difficulty: string | null = null;
  if (/easy|easy-going|relaxed|chill|light/.test(allText)) difficulty = 'easy';
  else if (/challenging|hard|tough|intense|extreme|physically active/.test(allText)) difficulty = 'challenging';
  else if (/moderate|medium|average/.test(allText)) difficulty = 'moderate';

  const wantsRecommendation =
    userTexts.length >= 3 ||
    /recommend|suggest|show|name|which|what tour|find|give me|list/.test(allText);

  return { types, maxBudget, minDays, maxDays, difficulty, wantsRecommendation };
}

function scoreTour(tour: ITourDoc, prefs: UserPrefs): number {
  let score = tour.rating * 10;

  if (prefs.types.length > 0) {
    if (prefs.types.includes(tour.type)) score += 50;
  }

  if (tour.priceUsd <= prefs.maxBudget) {
    score += 30;
  } else {
    score -= (tour.priceUsd - prefs.maxBudget) / 50;
  }

  if (tour.durationDays >= prefs.minDays && tour.durationDays <= prefs.maxDays) {
    score += 25;
  }

  if (prefs.difficulty && tour.difficulty === prefs.difficulty) {
    score += 20;
  }

  return score;
}

function formatTourRecommendation(tour: ITourDoc, idx: number, reason: string): string {
  return `**${idx}. [[tour:${tour._id}|${tour.title}]]**\n` +
    `- ${tour.city}, ${tour.country} | ${tour.durationDays} days | $${tour.priceUsd} | ${tour.difficulty}\n` +
    `- Rating: ★ ${tour.rating} (${tour.reviewCount} reviews)\n` +
    `- ${reason}`;
}

const QUESTIONS: Array<(prefs: UserPrefs) => string | null> = [
  () => `Hey there, welcome to the Travel Tour Advisor! 🌍\n\nI'll help you find the perfect tour. What kind of travel experience are you looking for? Adventure, beach relaxation, cultural exploration, food tours, or something else?`,
  (p) => p.types.length === 0 ? `That sounds great! Could you tell me what kind of travel style you prefer — adventure, cultural, beach, food, nature? This will help me narrow down the best tours for you.` : null,
  (p) => p.maxBudget >= 99999 ? `Awesome choice! What's your approximate budget per person for this trip? (e.g., under $1000, $1000–$2000, $2000+)` : null,
  (p) => (p.minDays === 0 && p.maxDays === 999) ? `Good to know! How many days are you thinking for the trip? (e.g., 3–5 days, a week, 10+ days)` : null,
  (p) => !p.difficulty ? `Almost there! Do you prefer an easy-going relaxed trip, a moderate one with some activity, or a physically challenging adventure?` : null,
];

async function buildSmartFallback(messages: ChatMsg[]): Promise<string> {
  const prefs = parsePreferences(messages);
  const userMsgCount = messages.filter((m) => m.role === 'user').length;

  if (!prefs.wantsRecommendation && userMsgCount < 3) {
    for (let i = 0; i < QUESTIONS.length; i++) {
      if (i > userMsgCount) break;
      if (i === userMsgCount) {
        const q = QUESTIONS[i](prefs);
        if (q) return q;
      }
    }
  }

  let tours: ITourDoc[] = [];
  try {
    tours = await Tour.find().lean() as unknown as ITourDoc[];
  } catch {
    return 'Sorry, I could not access the tour catalog right now. Please try the "Browse Tours" tab!';
  }

  if (tours.length === 0) {
    return 'Our tour catalog is loading — please check back in a moment or browse the "Browse Tours" tab!';
  }

  const scored = tours
    .map((t) => ({ tour: t, score: scoreTour(t, prefs) }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 3);

  const prefParts: string[] = [];
  if (prefs.types.length > 0) prefParts.push(`**${prefs.types.join(' / ')}** style`);
  if (prefs.maxBudget < 99999) prefParts.push(`budget up to **$${prefs.maxBudget}**`);
  if (prefs.minDays > 0 || prefs.maxDays < 999) prefParts.push(`**${prefs.minDays}–${prefs.maxDays} days**`);
  if (prefs.difficulty) prefParts.push(`**${prefs.difficulty}** difficulty`);

  const intro = prefParts.length > 0
    ? `Based on your preferences (${prefParts.join(', ')}), here are my top recommendations:\n\n`
    : `Here are my top tour recommendations for you:\n\n`;

  const recs = top.map(({ tour, score: _score }, idx) => {
    const reasons: string[] = [];
    if (prefs.types.includes(tour.type)) reasons.push(`matches your love for ${tour.type} travel`);
    if (tour.priceUsd <= prefs.maxBudget) reasons.push(`within your budget at $${tour.priceUsd}`);
    if (tour.durationDays >= prefs.minDays && tour.durationDays <= prefs.maxDays) reasons.push(`perfect duration at ${tour.durationDays} days`);
    if (prefs.difficulty && tour.difficulty === prefs.difficulty) reasons.push(`${tour.difficulty} difficulty level as you wanted`);
    if (tour.rating >= 4.7) reasons.push(`highly rated at ★${tour.rating}`);
    if (reasons.length === 0) reasons.push(`one of our top-rated tours with amazing reviews`);

    return formatTourRecommendation(tour, idx + 1, `Why it's great for you: ${reasons.join('; ')}`);
  });

  const outro = `\n\nWould you like to know more about any of these tours? You can also click on a tour in the "Browse Tours" tab to see full details and create a group plan with friends!`;

  return intro + recs.join('\n\n') + outro;
}

export default router;
