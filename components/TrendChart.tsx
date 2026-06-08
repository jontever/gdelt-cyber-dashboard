'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DayTrend } from '@/lib/queries';

function formatDay(raw: string) {
  // YYYYMMDD → MM/DD
  return `${raw.slice(4, 6)}/${raw.slice(6, 8)}`;
}

export default function TrendChart({ data }: { data: DayTrend[] }) {
  const chartData = data.map((d) => ({
    ...d,
    day: formatDay(d.day),
  }));

  return (
    <div className="bg-cyber-panel border border-cyber-border rounded-lg p-4">
      <h2 className="text-cyber-accent font-semibold mb-4 text-sm uppercase tracking-widest">
        7-Day Theme Trends
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
          <XAxis dataKey="day" tick={{ fill: '#4a6fa5', fontSize: 11 }} />
          <YAxis tick={{ fill: '#4a6fa5', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f1629', border: '1px solid #1e3a5f', borderRadius: 6 }}
            labelStyle={{ color: '#00d4ff' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#4a6fa5' }} />
          <Line
            type="monotone"
            dataKey="cyber_attacks"
            name="Cyber Attacks"
            stroke="#ff2d55"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="hacking"
            name="Hacking"
            stroke="#ff6b35"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="info_ops"
            name="Disinfo / Propaganda"
            stroke="#00d4ff"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
