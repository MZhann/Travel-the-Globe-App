import { Router, Request, Response } from 'express';
import Country from '../models/Country.js';

const router = Router();

/**
 * GET /api/countries
 * Returns list of countries (for search, dropdowns). GeoJSON is loaded by frontend from CDN.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const countries = await Country.find().sort({ name: 1 }).lean();
    return res.json(countries);
  } catch {
    return res.json([]);
  }
});

/**
 * GET /api/countries/:iso2
 * Returns one country by ISO2 code.
 */
router.get('/:iso2', async (req: Request, res: Response) => {
  try {
    const country = await Country.findOne({ iso2: req.params.iso2.toUpperCase() }).lean();
    if (!country) return res.status(404).json({ error: 'Country not found' });
    return res.json(country);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
