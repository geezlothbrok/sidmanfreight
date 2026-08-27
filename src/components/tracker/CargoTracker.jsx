import React, { useState } from 'react';
import { FiSearch, FiMapPin, FiClock, FiPackage } from 'react-icons/fi';
import './CargoTracker.css';

// Public tracking endpoint (no auth). Same relative path as the rest of the
// API, so it works via the dev proxy and same-origin in production.
const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? '/backend/manager_api.php' : 'https://api.sidmanfreightconsult.com/manager_api.php');

// Maps a shipment status to a colour class for the status pill.
function statusClass(status) {
  const s = (status || '').toLowerCase();
  if (/(delivered|cleared|release|approved|duty paid|terminal paid)/.test(s)) return 'is-success';
  if (/(transit|out for delivery|shipping)/.test(s)) return 'is-progress';
  if (/(hold|pending|review)/.test(s)) return 'is-pending';
  return 'is-default';
}

function CargoTracker() {
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const query = ref.trim();
    if (!query) {
      setError('Please enter your Bill of Lading or reference number.');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=track&ref=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Could not reach the tracking service. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="tracker-section" id="track">
      <div className="tracker-inner">
        <span className="tracker-eyebrow">Real-Time Updates</span>
        <h2 className="tracker-title">Track Your Cargo</h2>
        <p className="tracker-subtitle">
          Enter your Bill of Lading or reference number to see your shipment's latest status and progress.
        </p>

        <form className="tracker-form" onSubmit={handleSubmit}>
          <div className="tracker-input-wrap">
            <FiPackage className="tracker-input-icon" />
            <input
              type="text"
              className="tracker-input"
              placeholder="e.g. MSKU1234567"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              aria-label="Bill of Lading or reference number"
            />
          </div>
          <button type="submit" className="tracker-btn" disabled={loading}>
            <FiSearch />
            <span>{loading ? 'Tracking…' : 'Track'}</span>
          </button>
        </form>

        {error && <div className="tracker-error">{error}</div>}

        {result && result.found === false && (
          <div className="tracker-notfound">
            No shipment found for that number. Please double-check your Bill of Lading / reference number,
            or contact us if you think this is an error.
          </div>
        )}

        {result && result.found && (
          <div className="tracker-result">
            <div className="tracker-result-head">
              <div className="tracker-result-ref">
                <span className="tracker-result-label">Tracking</span>
                <strong>{result.containerNo}</strong>
              </div>
              <span className={`tracker-status ${statusClass(result.status)}`}>{result.status}</span>
            </div>

            <div className="tracker-meta">
              <div className="tracker-meta-item">
                <FiMapPin />
                <span>{result.origin || '—'} <em>→</em> {result.destination || '—'}</span>
              </div>
              <div className="tracker-meta-item">
                <FiClock />
                <span>Last updated: {new Date(result.lastUpdated).toLocaleString()}</span>
              </div>
            </div>

            {result.updates && result.updates.length > 0 ? (
              <ul className="tracker-timeline">
                {result.updates.slice().reverse().map((u, i) => (
                  <li key={i} className={`tracker-timeline-item ${i === 0 ? 'is-latest' : ''}`}>
                    <span className="tracker-dot" />
                    <div className="tracker-timeline-body">
                      <p className="tracker-timeline-note">{u.note}</p>
                      <span className="tracker-timeline-date">{u.date}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tracker-noupdates">
                Your shipment has been logged. Detailed progress updates will appear here as it moves.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default CargoTracker;
