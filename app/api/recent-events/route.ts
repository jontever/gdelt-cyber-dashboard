import { NextResponse } from 'next/server';
import { getRecentCyberEventsFromCSV } from '@/lib/gdelt-csv';

// No BigQuery — fetches from GDELT's free raw CSV feed.
// GDELT publishes new files every 15 minutes.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const events = await getRecentCyberEventsFromCSV();
    return NextResponse.json({ events, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[recent-events]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
