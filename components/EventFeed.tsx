'use client';

import { useEffect, useState } from 'react';
import type { CyberEvent } from '@/lib/queries';

function toneColor(tone: number) {
  if (tone < -5) return 'text-red-400';
  if (tone < 0) return 'text-orange-400';
  return 'text-green-400';
}

function formatTime(date: string, time: string) {
  // date: YYYYMMDD, time: HHMMSS
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} ${time.slice(0, 2)}:${time.slice(2, 4)}`;
}

export default function EventFeed() {
  const [events, setEvents] = useState<CyberEvent[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recent-events');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data.events);
      setFetchedAt(data.fetchedAt);
    } catch (e) {
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="bg-cyber-panel border border-cyber-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-cyber-accent font-semibold text-sm uppercase tracking-widest">
            Live Feed — Last 24h
          </h2>
          <p className="text-cyber-muted text-xs mt-1">
            Latest articles flagged by GDELT as cyber-related. Tone score indicates sentiment — negative values reflect alarming or hostile coverage.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-cyber-muted hover:text-cyber-accent transition-colors disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {fetchedAt && (
        <p className="text-xs text-cyber-muted">
          Fetched at {new Date(fetchedAt).toLocaleTimeString()}
        </p>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex flex-col gap-2 overflow-y-auto max-h-[520px] pr-1">
        {events.map((ev, i) => (
          <div
            key={i}
            className="border border-cyber-border rounded p-3 hover:border-cyber-accent transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-200 hover:text-cyber-accent truncate max-w-[75%]"
              >
                {ev.source}
              </a>
              <span className={`text-xs font-mono ${toneColor(ev.tone)}`}>
                {ev.tone > 0 ? '+' : ''}{ev.tone.toFixed(1)}
              </span>
            </div>

            <p className="text-xs text-cyber-muted mb-2">
              {formatTime(ev.date, ev.time)}
              {ev.locations && ` · ${ev.locations.split(';')[0]}`}
            </p>

            <div className="flex flex-wrap gap-1">
              {ev.themes.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="text-[10px] bg-cyber-border text-cyber-accent px-1.5 py-0.5 rounded"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}

        {!loading && events.length === 0 && !error && (
          <p className="text-cyber-muted text-sm">No events in the last 24 hours.</p>
        )}
      </div>
    </div>
  );
}
