import { NextResponse } from 'next/server';
import { fetchInstantly } from '@/lib/instantly';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const campaignId = searchParams.get('campaign');
        const status = searchParams.get('status');
        const token = searchParams.get('token');

        if (token && token !== 'AETHER2026') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!campaignId) {
            return NextResponse.json({ error: 'campaign parameter is required' }, { status: 400 });
        }

        const params: Record<string, string> = { campaign_id: campaignId };

        const res = await fetchInstantly('/leads', params);
        const leads = Array.isArray(res) ? res : (res.items || []);

        // The instantly API might not filter heavily by status correctly natively via simple params in all versions, 
        // so we can filter post-fetch if a status was requested.
        let filteredLeads = leads;
        if (status) {
            filteredLeads = leads.filter((lead: any) => lead.status?.toLowerCase() === status.toLowerCase());
        }

        return NextResponse.json(filteredLeads);
    } catch (error: any) {
        console.error('Leads API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
