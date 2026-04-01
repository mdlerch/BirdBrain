import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, 'cache');
const TAXONOMY_FILE = join(CACHE_DIR, 'taxonomy.json');
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

const app = express();
const PORT = 3003;
const EBIRD_BASE = 'https://api.ebird.org/v2';

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

function ebirdHeaders(apiKey) {
  return { 'X-eBirdApiToken': apiKey };
}

// In-memory taxonomy cache (avoids re-reading disk on every request)
let taxonomyMemCache = null;

function loadTaxonomyFromDisk() {
  if (!existsSync(TAXONOMY_FILE)) return null;
  try {
    const { timestamp, species } = JSON.parse(readFileSync(TAXONOMY_FILE, 'utf8'));
    if (Date.now() - timestamp > TWO_WEEKS_MS) return null; // expired
    return species;
  } catch {
    return null;
  }
}

// Serve the full taxonomy for client-side filtering.
// On first call (or after 2 weeks), downloads from eBird and caches to disk.
app.get('/birdbrain-api/taxonomy', async (req, res) => {
  if (taxonomyMemCache) return res.json(taxonomyMemCache);

  const fromDisk = loadTaxonomyFromDisk();
  if (fromDisk) {
    taxonomyMemCache = fromDisk;
    return res.json(taxonomyMemCache);
  }

  const { apiKey } = req.query;
  if (!apiKey) {
    return res.status(400).json({ error: 'API key required to download taxonomy' });
  }

  try {
    console.log('Downloading eBird taxonomy...');
    const response = await fetch(`${EBIRD_BASE}/ref/taxonomy/ebird?fmt=json`, {
      headers: ebirdHeaders(apiKey),
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text || 'Failed to fetch taxonomy' });
    }
    const full = await response.json();

    // Slim down to only the fields we need
    const species = full.map(({ speciesCode, comName, sciName, category }) => ({
      speciesCode, comName, sciName, category,
    }));

    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR);
    writeFileSync(TAXONOMY_FILE, JSON.stringify({ timestamp: Date.now(), species }));
    taxonomyMemCache = species;
    console.log(`Taxonomy cached: ${species.length} entries`);
    res.json(species);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Geocode a place name using Nominatim (OpenStreetMap) — no API key required
app.get('/birdbrain-api/geocode', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BirdBrain/1.0 (birding app)' },
    });
    if (!response.ok) return res.status(response.status).json({ error: 'Geocoding service error' });
    const results = await response.json();
    if (!results.length) return res.status(404).json({ error: 'Location not found' });
    const { lat, lon, display_name } = results[0];
    res.json({ lat: parseFloat(lat), lng: parseFloat(lon), displayName: display_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent nearby observations for a species
app.get('/birdbrain-api/sightings/nearby', async (req, res) => {
  const { speciesCode, lat, lng, days, dist, apiKey } = req.query;
  if (!apiKey) return res.status(400).json({ error: 'API key required' });
  if (!speciesCode || !lat || !lng) {
    return res.status(400).json({ error: 'speciesCode, lat, and lng required' });
  }

  const backDays = Math.min(parseInt(days) || 14, 30);
  const distKm = Math.min(parseInt(dist) || 50, 500);

  try {
    const url = `${EBIRD_BASE}/data/obs/geo/recent/${speciesCode}` +
      `?lat=${lat}&lng=${lng}&back=${backDays}&dist=${distKm}&sort=date&detail=full`;
    const response = await fetch(url, { headers: ebirdHeaders(apiKey) });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text || 'eBird API error' });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`BirdBrain server running on http://localhost:${PORT}`);
});
