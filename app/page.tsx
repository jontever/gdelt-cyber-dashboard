/**
 * GDELT Cyber Dashboard — main page.
 *
 * Rendering strategy (Vercel Hobby free plan):
 *   - Trend + actor data: fetched server-side, cached via ISR (revalidate 1h).
 *     These are the heavier BigQuery scans (~1–2 GB). Running them once per hour
 *     keeps BigQuery costs negligible and avoids the 10s function timeout.
 *   - Live event feed: client-side via /api/recent-events (lightweight 24h query).
 *     Users can manually refresh; not auto-polled to avoid quota burn.
 */

import { getCyberTrends, getTopActors, type DayTrend, type TopActor } from '@/lib/queries';
import TrendChart from '@/components/TrendChart';
import ActorTable from '@/components/ActorTable';
import EventFeed from '@/components/EventFeed';

// ISR: regenerate at most once per hour
export const revalidate = 86400; // 24 hours — limits BigQuery to one scan per day

export default async function Dashboard() {
  let trends: DayTrend[] = [];
  let actors: TopActor[] = [];
  let dataError: string | null = null;

  try {
    [trends, actors] = await Promise.all([getCyberTrends(), getTopActors()]);
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    console.error('[dashboard]', message);
    dataError = message;
  }

  return (
    <main className="min-h-screen bg-cyber-bg text-slate-200 p-4 md:p-8">
      {/* Header */}
      <header className="mb-8 border-b border-cyber-border pb-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-cyber-muted uppercase tracking-widest mb-1">
            Powered by GDELT · Google BigQuery
          </p>
          <h1 className="text-2xl font-bold text-cyber-accent">
            Cyber Intelligence Dashboard
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-cyber-muted">Trend data cached hourly</p>
          <p className="text-xs text-cyber-muted">Live feed on demand</p>
        </div>
      </header>

      {dataError && (
        <div className="mb-6 border border-red-800 bg-red-950/40 rounded-lg p-4 text-red-400 text-sm">
          {dataError}
        </div>
      )}

      {/* Stats bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: 'Cyber Attack Articles',
            value: trends.reduce((s, d) => s + d.cyber_attacks, 0).toLocaleString(),
            color: 'text-red-400',
            description: 'News articles tagged CYBER_ATTACK in the last 7 days',
          },
          {
            label: 'Hacking Coverage',
            value: trends.reduce((s, d) => s + d.hacking, 0).toLocaleString(),
            color: 'text-orange-400',
            description: 'Articles mentioning hacking activity in the last 7 days',
          },
          {
            label: 'Disinfo / Propaganda',
            value: trends.reduce((s, d) => s + d.info_ops, 0).toLocaleString(),
            color: 'text-cyber-accent',
            description: 'Articles covering disinformation or propaganda in the last 7 days',
          },
          {
            label: 'Avg Tone (7d)',
            value:
              trends.length > 0
                ? (trends.reduce((s, d) => s + d.avg_tone, 0) / trends.length).toFixed(2)
                : 'N/A',
            color: 'text-slate-300',
            description: 'Average sentiment of cyber coverage — negative means alarming framing',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-cyber-panel border border-cyber-border rounded-lg p-4"
          >
            <p className="text-xs text-cyber-muted mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-cyber-muted mt-2 leading-relaxed">{stat.description}</p>
          </div>
        ))}
      </section>

      {/* Main grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart — spans 2 cols */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <TrendChart data={trends} />
          <ActorTable actors={actors} />
        </div>

        {/* Live event feed */}
        <div className="lg:col-span-1">
          <EventFeed />
        </div>
      </section>

      <footer className="mt-8 text-xs text-cyber-muted text-center">
        Data sourced from{' '}
        <a
          href="https://www.gdeltproject.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-cyber-accent"
        >
          The GDELT Project
        </a>{' '}
        · Open data for open research
      </footer>
    </main>
  );
}
