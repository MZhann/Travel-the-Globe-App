import { Request, Response, Router, NextFunction } from 'express';
import mongoose from 'mongoose';
import Tour from '../models/Tour';

const router = Router();

function ensureDb(_req: Request, res: Response, next: NextFunction): void {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ error: 'Database not connected' });
    return;
  }
  next();
}

const SEED_TOURS = [
  { title: 'Northern Lights Chase in Tromso', description: 'Experience the magical Aurora Borealis in the Arctic Circle. Expert guides take you to the best viewing spots with hot chocolate and campfire stories.', country: 'Norway', countryCode: 'NO', city: 'Tromso', priceUsd: 890, durationDays: 4, type: 'nature', rating: 4.9, reviewCount: 1243, imageUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600', highlights: ['Northern Lights guaranteed or free retry', 'Arctic wildlife spotting', 'Traditional Sami culture experience', 'Dog sledding adventure'], includes: ['3 nights accommodation', 'All meals', 'Winter gear rental', 'Expert Arctic guide'], provider: 'Arctic Adventures', externalUrl: 'https://www.arcticadventures.com', maxGroupSize: 12, difficulty: 'moderate', bestSeason: 'October - March' },
  { title: 'Paris Art & Gastronomy Week', description: 'Immerse yourself in Parisian culture with private museum tours, cooking classes with Michelin-starred chefs, and wine tastings in hidden cellars.', country: 'France', countryCode: 'FR', city: 'Paris', priceUsd: 2450, durationDays: 7, type: 'cultural', rating: 4.8, reviewCount: 876, imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600', highlights: ['Private Louvre after-hours tour', 'Cooking class with Michelin chef', 'Seine River sunset cruise', 'Versailles day trip'], includes: ['6 nights boutique hotel', 'Breakfast daily', 'All entrance fees', 'Private guide'], provider: 'EuropeTours', externalUrl: 'https://www.europetours.com', maxGroupSize: 10, difficulty: 'easy', bestSeason: 'April - October' },
  { title: 'Machu Picchu & Sacred Valley Trek', description: 'Follow ancient Inca trails through breathtaking Andean landscapes to the legendary lost city. A once-in-a-lifetime adventure with expert local guides.', country: 'Peru', countryCode: 'PE', city: 'Cusco', priceUsd: 1650, durationDays: 8, type: 'adventure', rating: 4.9, reviewCount: 2156, imageUrl: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=600', highlights: ['Classic 4-day Inca Trail', 'Machu Picchu sunrise', 'Sacred Valley markets', 'Cusco city tour'], includes: ['All accommodation', 'Meals on trek', 'Inca Trail permits', 'Professional porter team'], provider: 'Peru Treks', externalUrl: 'https://www.perutreks.com', maxGroupSize: 12, difficulty: 'challenging', bestSeason: 'May - September' },
  { title: 'Tokyo Food & Culture Discovery', description: 'Explore Tokyo through its incredible food scene — from Tsukiji fish market at dawn to hidden ramen shops and Michelin-starred sushi bars.', country: 'Japan', countryCode: 'JP', city: 'Tokyo', priceUsd: 1890, durationDays: 6, type: 'food', rating: 4.7, reviewCount: 934, imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600', highlights: ['Tsukiji inner market tour', 'Sushi-making masterclass', 'Sake brewery visit', 'Akihabara & Shibuya night tour'], includes: ['5 nights hotel', 'All food tastings', 'JR Pass', 'Local food guide'], provider: 'Japan Delights', externalUrl: 'https://www.japandelights.com', maxGroupSize: 8, difficulty: 'easy', bestSeason: 'March - May, October - November' },
  { title: 'Maldives Island Hopping Paradise', description: 'Crystal-clear waters, pristine beaches, and world-class snorkeling across multiple stunning atolls in the Indian Ocean.', country: 'Maldives', countryCode: 'MV', city: 'Male', priceUsd: 3200, durationDays: 7, type: 'beach', rating: 4.8, reviewCount: 567, imageUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600', highlights: ['Private island stays', 'Manta ray snorkeling', 'Sunset dolphin cruise', 'Underwater restaurant dinner'], includes: ['6 nights overwater villa', 'All meals', 'Speedboat transfers', 'Snorkel equipment'], provider: 'Maldives Luxury', externalUrl: 'https://www.maldivesluxury.com', maxGroupSize: 6, difficulty: 'easy', bestSeason: 'November - April' },
  { title: 'Safari & Victoria Falls Adventure', description: 'Witness the Big Five on thrilling game drives, then stand in awe before the thundering Victoria Falls. Africa at its most spectacular.', country: 'Zimbabwe', countryCode: 'ZW', city: 'Victoria Falls', priceUsd: 2800, durationDays: 9, type: 'adventure', rating: 4.9, reviewCount: 1089, imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600', highlights: ['Big Five safari drives', 'Victoria Falls guided tour', 'Sunset Zambezi cruise', 'Bungee jumping option'], includes: ['8 nights lodge', 'All meals on safari', 'Park fees', 'Expert safari guide'], provider: 'Africa Wild', externalUrl: 'https://www.africawild.com', maxGroupSize: 10, difficulty: 'moderate', bestSeason: 'June - October' },
  { title: 'Greek Islands Sailing Voyage', description: 'Sail the turquoise Aegean Sea visiting Santorini, Mykonos, and hidden gems. Swim in secluded coves and explore ancient ruins.', country: 'Greece', countryCode: 'GR', city: 'Athens', priceUsd: 1750, durationDays: 8, type: 'cruise', rating: 4.7, reviewCount: 732, imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600', highlights: ['Santorini sunset', 'Mykonos nightlife', 'Ancient Delos ruins', 'Hidden beach coves'], includes: ['7 nights on yacht', 'Breakfast & lunch', 'Skipper & crew', 'Fuel & port fees'], provider: 'Med Sailing', externalUrl: 'https://www.medsailing.com', maxGroupSize: 8, difficulty: 'easy', bestSeason: 'May - October' },
  { title: 'Istanbul Historical Odyssey', description: 'Walk through millennia of history from Byzantine churches to Ottoman palaces. Experience the vibrant Grand Bazaar and exquisite Turkish cuisine.', country: 'Turkey', countryCode: 'TR', city: 'Istanbul', priceUsd: 980, durationDays: 5, type: 'historical', rating: 4.6, reviewCount: 1456, imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600', highlights: ['Hagia Sophia & Blue Mosque', 'Topkapi Palace private tour', 'Grand Bazaar guide', 'Bosphorus dinner cruise'], includes: ['4 nights boutique hotel', 'Breakfast daily', 'All entrance fees', 'Local historian guide'], provider: 'Turkey Tours', externalUrl: 'https://www.turkeytours.com', maxGroupSize: 15, difficulty: 'easy', bestSeason: 'April - June, September - November' },
  { title: 'New York City Highlights', description: 'The ultimate NYC experience — Broadway shows, world-class museums, iconic landmarks, and the best pizza in every borough.', country: 'United States of America', countryCode: 'US', city: 'New York', priceUsd: 1450, durationDays: 5, type: 'city', rating: 4.5, reviewCount: 2341, imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600', highlights: ['Broadway show tickets', 'Statue of Liberty ferry', 'Central Park bike tour', 'Brooklyn food tour'], includes: ['4 nights Manhattan hotel', 'Metro pass', 'Broadway tickets', 'Museum passes'], provider: 'USA Trips', externalUrl: 'https://www.usatrips.com', maxGroupSize: 20, difficulty: 'easy', bestSeason: 'Year-round' },
  { title: 'Bali Wellness & Temple Retreat', description: 'Find inner peace with yoga retreats, traditional Balinese healing, ancient temple visits, and stunning rice terrace walks.', country: 'Indonesia', countryCode: 'ID', city: 'Ubud', priceUsd: 1200, durationDays: 7, type: 'cultural', rating: 4.8, reviewCount: 1123, imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600', highlights: ['Tegallalang rice terraces', 'Traditional healing session', 'Temple ceremony experience', 'Volcano sunrise trek'], includes: ['6 nights villa', 'Daily yoga classes', 'All temple fees', 'Traditional meals'], provider: 'Bali Spirit', externalUrl: 'https://www.balispirit.com', maxGroupSize: 12, difficulty: 'easy', bestSeason: 'April - October' },
  { title: 'Patagonia Wilderness Explorer', description: 'Trek through dramatic landscapes of Torres del Paine, glaciers, and pristine forests at the end of the world.', country: 'Chile', countryCode: 'CL', city: 'Puerto Natales', priceUsd: 2100, durationDays: 10, type: 'adventure', rating: 4.9, reviewCount: 678, imageUrl: 'https://images.unsplash.com/photo-1531794750215-2161746b6703?w=600', highlights: ['Torres del Paine W Trek', 'Grey Glacier boat trip', 'Puma tracking experience', 'Estancia BBQ dinner'], includes: ['9 nights mixed accommodation', 'All meals on trek', 'Park permits', 'Expert trekking guide'], provider: 'Patagonia Wild', externalUrl: 'https://www.patagoniawild.com', maxGroupSize: 10, difficulty: 'challenging', bestSeason: 'October - April' },
  { title: 'Morocco Desert & Medina Magic', description: 'From the bustling souks of Marrakech to the silence of the Sahara under a billion stars. Experience the magic of Morocco.', country: 'Morocco', countryCode: 'MA', city: 'Marrakech', priceUsd: 1100, durationDays: 7, type: 'cultural', rating: 4.7, reviewCount: 1567, imageUrl: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=600', highlights: ['Sahara camel trek & camping', 'Marrakech medina tour', 'Atlas Mountains day hike', 'Cooking class in a riad'], includes: ['6 nights accommodation', 'Most meals', 'Desert camp', '4x4 transport'], provider: 'Morocco Excursions', externalUrl: 'https://www.moroccoexcursions.com', maxGroupSize: 14, difficulty: 'moderate', bestSeason: 'March - May, September - November' },
  { title: 'Iceland Ring Road Expedition', description: 'Circle the entire island, visiting geysers, waterfalls, glaciers, black sand beaches, and relaxing in natural hot springs.', country: 'Iceland', countryCode: 'IS', city: 'Reykjavik', priceUsd: 2600, durationDays: 10, type: 'nature', rating: 4.8, reviewCount: 892, imageUrl: 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=600', highlights: ['Golden Circle tour', 'Glacier hiking', 'Whale watching', 'Blue Lagoon spa'], includes: ['9 nights guesthouses', 'Breakfast daily', '4x4 rental', 'Glacier equipment'], provider: 'Iceland Explorers', externalUrl: 'https://www.icelandexplorers.com', maxGroupSize: 8, difficulty: 'moderate', bestSeason: 'June - August' },
  { title: 'Thailand Beach & Temple Trail', description: 'Combine stunning temples of Chiang Mai with the paradise beaches of southern Thailand. The perfect mix of culture and relaxation.', country: 'Thailand', countryCode: 'TH', city: 'Bangkok', priceUsd: 1350, durationDays: 10, type: 'beach', rating: 4.6, reviewCount: 1890, imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=600', highlights: ['Grand Palace & Wat Pho', 'Chiang Mai night market', 'Phi Phi Islands snorkeling', 'Thai cooking class'], includes: ['9 nights hotels', 'Domestic flights', 'All entrance fees', 'Island boat tours'], provider: 'Thai Journeys', externalUrl: 'https://www.thaijourneys.com', maxGroupSize: 16, difficulty: 'easy', bestSeason: 'November - March' },
  { title: 'Rome & Amalfi Coast Discovery', description: 'Explore ancient Rome colosseum and Vatican, then drive the stunning Amalfi Coast visiting Positano, Ravello and Capri island.', country: 'Italy', countryCode: 'IT', city: 'Rome', priceUsd: 2200, durationDays: 8, type: 'historical', rating: 4.7, reviewCount: 1234, imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600', highlights: ['Colosseum underground tour', 'Vatican early access', 'Positano cliffside walk', 'Capri Blue Grotto'], includes: ['7 nights hotels', 'Breakfast daily', 'Private transfers', 'Skip-the-line tickets'], provider: 'Italia Tours', externalUrl: 'https://www.italiatours.com', maxGroupSize: 12, difficulty: 'easy', bestSeason: 'April - October' },
  { title: 'Kazakhstan Silk Road Adventure', description: 'Discover the heart of Central Asia — from futuristic Astana to ancient Silk Road cities, nomadic culture, and stunning Charyn Canyon.', country: 'Kazakhstan', countryCode: 'KZ', city: 'Almaty', priceUsd: 1400, durationDays: 8, type: 'adventure', rating: 4.6, reviewCount: 234, imageUrl: 'https://images.unsplash.com/photo-1565108441861-0ab4e0de6921?w=600', highlights: ['Charyn Canyon trek', 'Big Almaty Lake', 'Astana futuristic city tour', 'Nomadic yurt stay'], includes: ['7 nights accommodation', 'All meals', 'Domestic flight', 'English-speaking guide'], provider: 'Silk Road Tours', externalUrl: 'https://www.silkroadtours.kz', maxGroupSize: 10, difficulty: 'moderate', bestSeason: 'May - September' },
];

/**
 * GET /api/tours — Search/filter tours
 */
router.get('/', ensureDb, async (req: Request, res: Response) => {
  try {
    const count = await Tour.countDocuments();
    if (count === 0) {
      await Tour.insertMany(SEED_TOURS);
      console.log(`Seeded ${SEED_TOURS.length} tours`);
    }

    const {
      country,
      type,
      minPrice,
      maxPrice,
      minDays,
      maxDays,
      difficulty,
      search,
      sort,
      limit: limitStr,
    } = req.query;

    const filter: Record<string, unknown> = {};

    if (country) filter.countryCode = (country as string).toUpperCase();
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (minPrice || maxPrice) {
      filter.priceUsd = {};
      if (minPrice) (filter.priceUsd as Record<string, number>).$gte = Number(minPrice);
      if (maxPrice) (filter.priceUsd as Record<string, number>).$lte = Number(maxPrice);
    }
    if (minDays || maxDays) {
      filter.durationDays = {};
      if (minDays) (filter.durationDays as Record<string, number>).$gte = Number(minDays);
      if (maxDays) (filter.durationDays as Record<string, number>).$lte = Number(maxDays);
    }
    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$or = [{ title: regex }, { description: regex }, { country: regex }, { city: regex }];
    }

    let sortObj: Record<string, 1 | -1> = { rating: -1 };
    if (sort === 'price_asc') sortObj = { priceUsd: 1 };
    else if (sort === 'price_desc') sortObj = { priceUsd: -1 };
    else if (sort === 'duration') sortObj = { durationDays: 1 };
    else if (sort === 'rating') sortObj = { rating: -1 };

    const limit = Math.min(parseInt(limitStr as string) || 50, 100);

    const tours = await Tour.find(filter).sort(sortObj).limit(limit).lean();

    res.json({ tours, total: tours.length });
  } catch (err) {
    console.error('Tours search error:', err);
    res.status(500).json({ error: 'Failed to fetch tours' });
  }
});

/**
 * GET /api/tours/:id — Get single tour details
 */
router.get('/:id', ensureDb, async (req: Request, res: Response) => {
  try {
    const tour = await Tour.findById(req.params.id).lean();
    if (!tour) { res.status(404).json({ error: 'Tour not found' }); return; }
    res.json({ tour });
  } catch (err) {
    console.error('Tour detail error:', err);
    res.status(500).json({ error: 'Failed to fetch tour' });
  }
});

export default router;
