import { useState } from 'react';

export default function ApiKeyInput({ configured, onConfigured }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/birdbrain-api/config/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save API key.');
      } else {
        setValue('');
        setEditing(false);
        onConfigured(true);
      }
    } catch {
      setError('Network error — is the server running?');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    await fetch('/birdbrain-api/config/apikey', { method: 'DELETE' });
    onConfigured(false);
    setEditing(false);
  }

  if (configured && !editing) {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>eBird API Key</h2>
            <span className="success">Configured ✓</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              onClick={() => { setEditing(true); setError(''); }}>
              Change
            </button>
            <button className="secondary" style={{ fontSize: '0.82rem', padding: '6px 12px', color: 'var(--danger)' }}
              onClick={handleRemove}>
              Remove
            </button>
          </div>
        </div>
      </div>
    );
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
            onChange={e => { setValue(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Paste your eBird API key here"
            autoFocus={configured}
          />
        </div>
        <button onClick={handleSave} disabled={!value.trim() || saving}>
          {saving ? <><span className="spinner" />Validating…</> : 'Save'}
        </button>
        {configured && (
          <button className="secondary" onClick={() => setEditing(false)}>Cancel</button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      {!configured && (
        <div style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--text-dim)' }}>
          Get a free API key at{' '}
          <a href="https://ebird.org/api/keygen" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
            ebird.org/api/keygen
          </a>
        </div>
      )}
    </div>
  );
}
