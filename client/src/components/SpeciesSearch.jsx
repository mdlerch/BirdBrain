import { useState, useEffect, useRef } from 'react';

// Module-level cache so the taxonomy survives component re-mounts
let taxonomyCache = null;
let taxonomyFetchPromise = null;

async function fetchTaxonomy(apiKey) {
  if (taxonomyCache) return taxonomyCache;
  if (taxonomyFetchPromise) return taxonomyFetchPromise;

  taxonomyFetchPromise = fetch(`/birdbrain-api/taxonomy?apiKey=${encodeURIComponent(apiKey)}`)
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data)) {
        taxonomyCache = data;
        return data;
      }
      throw new Error(data.error || 'Failed to load taxonomy');
    })
    .finally(() => { taxonomyFetchPromise = null; });

  return taxonomyFetchPromise;
}

function filterSpecies(taxonomy, query) {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return [];

  const scored = [];
  for (const sp of taxonomy) {
    const cn = sp.comName.toLowerCase();
    const sn = sp.sciName.toLowerCase();

    let score = 0;
    if (cn === q) score = 5;                        // exact match
    else if (cn.startsWith(q)) score = 4;           // prefix of full name
    else if (cn.includes(` ${q}`)) score = 3;       // word boundary (e.g. "warbler" → "Yellow Warbler")
    else if (cn.includes(q)) score = 2;             // substring of common name
    else if (sn.includes(q)) score = 1;             // substring of scientific name

    if (score > 0) scored.push({ sp, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.sp.comName.localeCompare(b.sp.comName))
    .slice(0, 25)
    .map(({ sp }) => sp);
}

export default function SpeciesSearch({ apiKey, onSelect, selected }) {
  const [query, setQuery] = useState(selected?.comName || '');
  const [results, setResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState('');

  useEffect(() => {
    if (selected) setQuery(selected.comName);
  }, [selected]);

  // Load taxonomy as soon as we have an API key
  useEffect(() => {
    if (!apiKey || taxonomyCache) return;
    setLoadingTaxonomy(true);
    setTaxonomyError('');
    fetchTaxonomy(apiKey)
      .then(() => setLoadingTaxonomy(false))
      .catch(err => {
        setTaxonomyError(err.message);
        setLoadingTaxonomy(false);
      });
  }, [apiKey]);

  function handleChange(value) {
    setQuery(value);
    setActiveIdx(-1);
    if (!taxonomyCache || value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const filtered = filterSpecies(taxonomyCache, value);
    setResults(filtered);
    setOpen(filtered.length > 0);
  }

  function select(species) {
    setQuery(species.comName);
    setResults([]);
    setOpen(false);
    onSelect(species);
  }

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      select(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const placeholder = !apiKey
    ? 'Enter API key first'
    : loadingTaxonomy
    ? 'Loading species list…'
    : 'e.g. American Robin, Bald Eagle…';

  return (
    <div className="autocomplete-wrap">
      <label htmlFor="species">Bird species</label>
      <input
        id="species"
        type="text"
        value={query}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={!apiKey || loadingTaxonomy}
      />
      {taxonomyError && <div className="error">{taxonomyError}</div>}
      {open && results.length > 0 && (
        <ul className="autocomplete-list">
          {results.map((sp, i) => (
            <li
              key={sp.speciesCode}
              className={i === activeIdx ? 'active' : ''}
              onMouseDown={() => select(sp)}
            >
              {sp.comName}
              <span className="sci">{sp.sciName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
