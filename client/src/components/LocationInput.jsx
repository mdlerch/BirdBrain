import { useState, useEffect } from 'react';

const DEFAULT_LOCATION = { lat: 41.7355, lng: -111.8338 };
const DEFAULT_LABEL = 'Logan, UT (default)';

export default function LocationInput({ location, onLocation }) {
  const [mode, setMode] = useState('manual'); // 'auto' | 'manual'
  const [query, setQuery] = useState('Logan, UT');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationLabel, setLocationLabel] = useState(DEFAULT_LABEL);

  // Set default location on mount
  useEffect(() => {
    onLocation(DEFAULT_LOCATION);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestGeolocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        onLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLabel('Current location');
        setGeoLoading(false);
      },
      () => {
        setError('Location access denied.');
        setGeoLoading(false);
      }
    );
  }


  async function geocode() {
    if (!query.trim()) return;
    setGeocodeLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.lat) {
        setError(data.error || 'Location not found. Try a more specific place name.');
      } else {
        onLocation({ lat: data.lat, lng: data.lng });
        setLocationLabel(data.displayName);
      }
    } catch {
      setError('Network error while looking up location.');
    } finally {
      setGeocodeLoading(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    if (next === 'manual') {
      setQuery('Logan, UT');
      setLocationLabel(DEFAULT_LABEL);
      onLocation(DEFAULT_LOCATION);
    } else {
      setLocationLabel('');
      onLocation(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          className={mode === 'auto' ? '' : 'secondary'}
          style={{ fontSize: '0.82rem', padding: '6px 12px' }}
          onClick={() => switchMode('auto')}
        >
          Use my location
        </button>
        <button
          className={mode === 'manual' ? '' : 'secondary'}
          style={{ fontSize: '0.82rem', padding: '6px 12px' }}
          onClick={() => switchMode('manual')}
        >
          Enter location
        </button>
      </div>

      {mode === 'auto' && (
        <div>
          {geoLoading && <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}><span className="spinner" />Requesting location…</span>}
          {!geoLoading && location && (
            <span style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>
              {locationLabel} ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
            </span>
          )}
          {error && (
            <div className="error">
              {error}{' '}
              <button className="secondary" style={{ fontSize: '0.8rem', padding: '4px 10px', marginLeft: 8 }} onClick={requestGeolocation}>
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="row">
          <div>
            <label htmlFor="locationQuery">City, region, or address</label>
            <input
              id="locationQuery"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && geocode()}
              placeholder="e.g. Portland, Oregon"
            />
          </div>
          <button onClick={geocode} disabled={!query.trim() || geocodeLoading} style={{ marginTop: 22 }}>
            {geocodeLoading ? <><span className="spinner" />Looking up…</> : 'Set'}
          </button>
        </div>
      )}

      {mode === 'manual' && !error && location && locationLabel && (
        <div className="success" style={{ marginTop: 6 }}>
          {locationLabel}
        </div>
      )}
      {mode === 'manual' && error && <div className="error">{error}</div>}
    </div>
  );
}
