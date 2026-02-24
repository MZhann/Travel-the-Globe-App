import { Router, Request, Response } from 'express';

const router = Router();

// --------------- REST Countries proxy (with in-memory cache) ---------------

const countryCache = new Map<string, { data: unknown; ts: number }>();
const COUNTRY_TTL = 1000 * 60 * 60 * 24; // 24 h

/**
 * GET /api/country-info/:iso2
 * Proxies restcountries.com and caches the result for 24 hours.
 */
router.get('/:iso2', async (req: Request, res: Response) => {
  const iso2 = req.params.iso2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso2)) {
    res.status(400).json({ error: 'Invalid ISO-2 code' });
    return;
  }

  // Check cache
  const cached = countryCache.get(iso2);
  if (cached && Date.now() - cached.ts < COUNTRY_TTL) {
    res.json(cached.data);
    return;
  }

  try {
    const url = `https://restcountries.com/v3.1/alpha/${iso2}?fields=name,flags,coatOfArms,capital,population,area,region,subregion,languages,currencies,timezones,borders,continents,maps,car,unMember,startOfWeek,capitalInfo,latlng,tld`;
    const apiRes = await fetch(url);
    if (!apiRes.ok) {
      res.status(apiRes.status).json({ error: 'Country not found' });
      return;
    }
    const data = await apiRes.json();
    countryCache.set(iso2, { data, ts: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('REST Countries proxy error:', err);
    res.status(502).json({ error: 'Failed to fetch country info' });
  }
});

export default router;

