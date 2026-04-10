import { NextResponse } from 'next/server';
import { fetchInstantly } from '@/lib/instantly';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (token && token !== 'AETHER2026') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // To get a global summary, we need all campaigns and their stats
        const res = await fetchInstantly('/campaigns');
        const campaigns = Array.isArray(res) ? res : (res.items || []);

        let total_sent = 0;
        let total_opened = 0;
        let total_replied = 0;
        let top_campaign = "";
        let max_replies = -1;

        for (const camp of campaigns) {
            try {
                const summaryRes = await fetchInstantly('/analytics/campaign/summary', { campaign_id: camp.id });
                const summaryArray = Array.isArray(summaryRes) ? summaryRes : (summaryRes.items || []);
                const stats = summaryArray[0];

                if (stats) {
                    total_sent += (stats.sent || 0);
                    total_opened += (stats.opened || 0);
                    total_replied += (stats.replied || 0);

                    if (stats.replied > max_replies) {
                        max_replies = stats.replied;
                        top_campaign = camp.name;
                    }
                }
            } catch (e) {
                console.error(`Status sync error for ${camp.id}`, e);
            }
        }

        const open_rate = total_sent > 0 ? (total_opened / total_sent) : 0;
        const reply_rate = total_sent > 0 ? (total_replied / total_sent) : 0;

        const summaryResponse = {
            total_campaigns: campaigns.length,
            total_sent,
            total_opened,
            open_rate: parseFloat(open_rate.toFixed(3)),
            total_replied,
            reply_rate: parseFloat(reply_rate.toFixed(3)),
            top_campaign,
            last_updated: new Date().toISOString()
        };

        return NextResponse.json(summaryResponse);
    } catch (error: any) {
        console.error('Summary API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
