import { NextResponse } from 'next/server';
import { INSTANTLY_API_KEY } from '@/lib/instantly';

const BASE = 'https://api.instantly.ai/api/v2';

function headers() {
  return {
    'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// POST /api/leads  { campaignId, limit?, startingAfter? }
// Fetches real leads from Instantly v2 /leads/list (paginated)
export async function POST(request: Request) {
  try {
    const { campaignId, limit = 100, startingAfter } = await request.json();
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });

    const body: Record<string, any> = { campaign: campaignId, limit };
    if (startingAfter) body.starting_after = startingAfter;

    const res = await fetch(`${BASE}/leads/list`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Leads POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/leads?campaign=ID  — kept for backward compat
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign');
    if (!campaignId) return NextResponse.json({ error: 'campaign required' }, { status: 400 });

    const body = { campaign: campaignId, limit: 100 };
    const res = await fetch(`${BASE}/leads/list`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const leads = Array.isArray(data) ? data : (data.items || []);
    return NextResponse.json(leads);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
