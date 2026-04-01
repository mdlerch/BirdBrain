import { useState } from 'react';

export default function ApiKeyInput({ apiKey, onSave }) {
  const [value, setValue] = useState(apiKey || '');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    setValue('');
    onSave('');
  }

  return (
    <div className="card">
      <h2>eBird API Key</h2>
      <div className="row">
        <div>
          <label htmlFor="apiKey">Your eBird API key</label>
          <input
            id="apiKey"
            type="password"
            value={value}
            onChange={e => { setValue(e.target.value); setSaved(false); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Paste your eBird API key here"
          />
        </div>
        <button onClick={handleSave} disabled={!value.trim()}>
          Save
        </button>
        {apiKey && (
          <button className="secondary" onClick={handleClear}>
            Clear
          </button>
        )}
      </div>
      {saved && <div className="success">API key saved.</div>}
      {!apiKey && (
        <div className="error" style={{ marginTop: 8 }}>
          Get a free API key at{' '}
          <a href="https://ebird.org/api/keygen" target="_blank" rel="noreferrer"
            style={{ color: 'inherit' }}>
            ebird.org/api/keygen
          </a>
        </div>
      )}
    </div>
  );
}
