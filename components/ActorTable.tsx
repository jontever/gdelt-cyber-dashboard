'use client';

import type { TopActor } from '@/lib/queries';

function toneBar(tone: number) {
  // tone typically ranges -10 to +10
  const clamped = Math.max(-10, Math.min(10, tone));
  const pct = ((clamped + 10) / 20) * 100;
  const color = tone < -3 ? '#ff2d55' : tone < 0 ? '#ff6b35' : '#22c55e';
  return { pct, color };
}

export default function ActorTable({ actors }: { actors: TopActor[] }) {
  return (
    <div className="bg-cyber-panel border border-cyber-border rounded-lg p-4">
      <h2 className="text-cyber-accent font-semibold text-sm uppercase tracking-widest">
        Top Actors — Last 48h
      </h2>
      <p className="text-cyber-muted text-xs mb-4 mt-1">
        Organizations most mentioned in cyber-related news over the past 48 hours. Tone is the average sentiment of coverage — negative means hostile or alarming framing.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-cyber-muted text-xs border-b border-cyber-border">
              <th className="text-left pb-2 font-normal">Organization</th>
              <th className="text-right pb-2 font-normal pr-4">Mentions</th>
              <th className="text-left pb-2 font-normal">Tone</th>
            </tr>
          </thead>
          <tbody>
            {actors.map((a, i) => {
              const { pct, color } = toneBar(a.avg_tone);
              return (
                <tr key={i} className="border-b border-cyber-border/40 hover:bg-cyber-border/20">
                  <td className="py-2 pr-4 truncate max-w-[180px]">{a.name}</td>
                  <td className="py-2 pr-4 text-right font-mono text-cyber-accent">
                    {a.mentions.toLocaleString()}
                  </td>
                  <td className="py-2 w-32">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-cyber-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[10px] font-mono" style={{ color }}>
                        {a.avg_tone > 0 ? '+' : ''}{a.avg_tone.toFixed(1)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
