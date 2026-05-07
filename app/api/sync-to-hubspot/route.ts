import { NextResponse } from 'next/server';
import { syncContactToHubspot } from '@/lib/hubspot';

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (token && token !== 'AETHER2026') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { leads } = await request.json();

        if (!Array.isArray(leads)) {
            return NextResponse.json({ error: 'Body must contain "leads" array' }, { status: 400 });
        }

        const results = {
            success: 0,
            errors: 0,
            details: [] as any[]
        };

        // Process sequentially to be safe with rate limits, or use Promise.all for speed
        // Using sequential for safety with basic HubSpot API
        for (const lead of leads) {
            try {
                const synced = await syncContactToHubspot(lead);
                results.success++;
                results.details.push({ email: lead.email, status: 'success', hubspot_id: synced.vid });
            } catch (error: any) {
                results.errors++;
                results.details.push({ email: lead.email, status: 'error', message: error.message });
            }
        }

        return NextResponse.json(results);
    } catch (error: any) {
        console.error('Sync API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
