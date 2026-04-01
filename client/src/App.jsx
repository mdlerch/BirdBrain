import { useState, useEffect } from 'react';
import ApiKeyInput from './components/ApiKeyInput';
import SpeciesSearch from './components/SpeciesSearch';
import LocationInput from './components/LocationInput';
import SightingsList from './components/SightingsList';

export default function App() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [species, setSpecies] = useState(null);
  const [days, setDays] = useState(14);
  const [userLocation, setUserLocation] = useState(null);
  const [sightings, setSightings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Check on load whether the server already has an API key stored
  useEffect(() => {
    fetch('/birdbrain-api/config/apikey')
      .then(r => r.json())
      .then(data => setHasApiKey(data.configured))
      .catch(() => {});
  }, []);

  async function findSightings() {
    if (!species || !userLocation || !hasApiKey) return;
    setLoading(true);
    setSearchError('');
    setSightings(null);
    try {
      const params = new URLSearchParams({
        speciesCode: species.speciesCode,
        lat: userLocation.lat,
        lng: userLocation.lng,
        days,
      });
      const res = await fetch(`/birdbrain-api/sightings/nearby?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || 'Failed to fetch sightings.');
      } else {
        setSightings(data);
      }
    } catch (err) {
      setSearchError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const canSearch = hasApiKey && species && userLocation && !loading;

  return (
    <>
      <h1>BirdBrain</h1>
      <p className="subtitle">Find nearby bird sightings using eBird data</p>

      <ApiKeyInput configured={hasApiKey} onConfigured={setHasApiKey} />

      <div className="card">
        <h2>Find Sightings</h2>
        <div className="field-group">
          <SpeciesSearch hasApiKey={hasApiKey} onSelect={setSpecies} selected={species} />

          <div>
            <label>Your location</label>
            <LocationInput location={userLocation} onLocation={setUserLocation} />
          </div>

          <div className="row">
            <div>
              <label htmlFor="days">Search window (days back)</label>
              <input
                id="days"
                type="number"
                min={1}
                max={30}
                value={days}
                onChange={e => setDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 14)))}
              />
            </div>
            <button onClick={findSightings} disabled={!canSearch}>
              {loading ? <><span className="spinner" />Searching…</> : 'Find Sightings'}
            </button>
          </div>

          {!hasApiKey && <div className="error">Enter your eBird API key above to get started.</div>}
          {searchError && <div className="error">{searchError}</div>}
        </div>
      </div>

      <SightingsList
        sightings={sightings}
        userLocation={userLocation}
        species={species}
        days={days}
      />
    </>
  );
}
