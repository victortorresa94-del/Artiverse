import { NextResponse } from 'next/server';
import { fetchInstantly } from '@/lib/instantly';

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        // Simple verification
        if (token && token !== 'AETHER2026') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const res = await fetchInstantly('/campaigns');
        const campaigns = Array.isArray(res) ? res : (res.items || []);

        // Also fetch summary per campaign to be complete
        const enrichedCampaigns = await Promise.all(campaigns.map(async (camp: any) => {
            try {
                const summaryRes = await fetchInstantly('/analytics/campaign/summary', { campaign_id: camp.id });
                const summaryArray = Array.isArray(summaryRes) ? summaryRes : (summaryRes.items || []);
                return {
                    ...camp,
                    stats: summaryArray[0] || {}
                };
            } catch (e) {
                console.error(`Error fetching stats for campaign ${camp.id}`, e);
                return camp;
            }
        }));

        return NextResponse.json(enrichedCampaigns);
    } catch (error: any) {
        console.error('Campaigns API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
