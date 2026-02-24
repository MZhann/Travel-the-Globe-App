import { Router, Request, Response } from 'express';

const router = Router();

// --------------- News proxy (GNews API) ---------------
// Get a free API key at https://gnews.io (100 requests/day free tier)
// Set GNEWS_API_KEY in your .env file.

const newsCache = new Map<string, { data: unknown; ts: number }>();
const NEWS_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Map ISO-2 codes to country names for news search.
 * We use the country name + "country" as the search query.
 */
function iso2ToSearchTerm(iso2: string, countryName?: string): string {
  return countryName ? `${countryName} country` : iso2;
}

/**
 * GET /api/country-news/:iso2?name=CountryName
 * Fetches recent news for a country via GNews API.
 * Falls back gracefully if no API key is configured.
 */
router.get('/:iso2', async (req: Request, res: Response) => {
  const iso2 = req.params.iso2.toUpperCase();
  const countryName = typeof req.query.name === 'string' ? req.query.name : undefined;

  if (!/^[A-Z]{2}$/.test(iso2)) {
    res.status(400).json({ error: 'Invalid ISO-2 code' });
    return;
  }

  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    // No API key configured — return empty gracefully
    res.json({
      articles: [],
      note: 'News not configured. Set GNEWS_API_KEY in backend/.env to enable news.',
    });
    return;
  }

  // Check cache
  const cached = newsCache.get(iso2);
  if (cached && Date.now() - cached.ts < NEWS_TTL) {
    res.json(cached.data);
    return;
  }

  try {
    const searchTerm = iso2ToSearchTerm(iso2, countryName);
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(searchTerm)}&lang=en&max=6&apikey=${apiKey}`;
    const apiRes = await fetch(url);

    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error('GNews API error:', apiRes.status, text);
      res.json({ articles: [], note: 'News temporarily unavailable' });
      return;
    }

    const raw = (await apiRes.json()) as { articles?: Record<string, unknown>[] };
    const articles = (raw.articles ?? []).map((a: Record<string, unknown>) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      image: a.image,
      publishedAt: a.publishedAt,
      source: (a.source as Record<string, unknown>)?.name ?? 'Unknown',
    }));

    const data = { articles };
    newsCache.set(iso2, { data, ts: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('News proxy error:', err);
    res.json({ articles: [], note: 'News temporarily unavailable' });
  }
});

export default router;

