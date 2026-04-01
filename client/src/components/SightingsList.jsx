function formatDate(dateStr) {
  // eBird returns e.g. "2024-03-15 14:32"
  const d = new Date(dateStr.replace(' ', 'T'));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function distanceMi(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SightingsList({ sightings, userLocation, species, days }) {
  if (!sightings) return null;

  if (sightings.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          No sightings of <strong>{species.comName}</strong> found within the past {days} days near you.
        </div>
      </div>
    );
  }

  // Sort by date desc (most recent first)
  const sorted = [...sightings].sort(
    (a, b) => new Date(b.obsDt) - new Date(a.obsDt)
  );

  return (
    <div className="card">
      <div className="sightings-header">
        <h2>{species.comName} sightings</h2>
        <span className="sightings-count">{sightings.length} reported in the past {days} days</span>
      </div>

      {sorted.map((s, i) => {
        const dist = userLocation
          ? distanceMi(userLocation.lat, userLocation.lng, s.lat, s.lng)
          : null;
        const mapsUrl = `https://www.google.com/maps?q=${s.lat},${s.lng}`;
        const ebirdUrl = `https://ebird.org/checklist/${s.subId}`;

        return (
          <div key={`${s.subId}-${i}`} className="sighting-item">
            <div className="sighting-location">{s.locName}</div>
            <div className="sighting-meta">
              <span>{formatDate(s.obsDt)}</span>
              {s.howMany && (
                <span className="sighting-count">
                  {s.howMany} bird{s.howMany !== 1 ? 's' : ''}
                </span>
              )}
              {dist !== null && (
                <span className="tag">{dist.toFixed(1)} mi away</span>
              )}
              {s.obsValid === false && (
                <span className="tag" style={{ color: 'var(--danger)' }}>unconfirmed</span>
              )}
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="map-link">
                Map
              </a>
              <a href={ebirdUrl} target="_blank" rel="noreferrer" className="map-link">
                eBird checklist
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
