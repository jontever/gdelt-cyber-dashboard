import { NextResponse } from 'next/server';
import { getRecentCyberEvents } from '@/lib/queries';

// No caching — this is the live feed endpoint.
// Vercel Hobby max duration: 10s. The query is scoped to 24h so it reliably fits.
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET() {
  try {
    const events = await getRecentCyberEvents();
    return NextResponse.json({ events, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[recent-events]', err);
    return NextResponse.json(
      { error: 'Failed to fetch events from BigQuery' },
      { status: 500 }
    );
  }
}
