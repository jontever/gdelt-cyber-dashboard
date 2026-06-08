import { NextResponse } from 'next/server';
import { getCyberTrends, getTopActors } from '@/lib/queries';

// Cache this response for 1 hour.
// Heavier BigQuery scans (7 days of GKG) live here — not on the live feed.
// Vercel Hobby: cached responses don't count against function invocation limits.
export const revalidate = 3600;

export async function GET() {
  try {
    const [trends, actors] = await Promise.all([
      getCyberTrends(),
      getTopActors(),
    ]);

    return NextResponse.json({
      trends,
      actors,
      cachedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[trends]', err);
    return NextResponse.json(
      { error: 'Failed to fetch trend data from BigQuery' },
      { status: 500 }
    );
  }
}
