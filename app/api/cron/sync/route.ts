import { NextResponse } from 'next/server';
import { fetchInstantly } from '@/lib/instantly';
import { syncContactToHubspot } from '@/lib/hubspot';

// Important: Note that Vercel cron secrets are usually passed as HTTP headers, 
// but we'll accept our shared token for testing manually over the browser
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        // Allow either the cron secret or our manual query token
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && token !== 'AETHER2026') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch all active campaigns
        const res = await fetchInstantly('/campaigns');
        const campaigns = Array.isArray(res) ? res : (res.items || []);
        // For safety, only process active campaigns to save API calls
        const activeCampaigns = campaigns.filter((c: any) => c.status === 1 || c.status === 'active');

        let totalSynced = 0;
        const syncedEmails = [];

        // 2. Fetch leads for each active campaign and sync those with 'replied' status
        for (const camp of activeCampaigns) {
            const leadsRes = await fetchInstantly('/leads', { campaign_id: camp.id });
            const leads = Array.isArray(leadsRes) ? leadsRes : (leadsRes.items || []);

            // Find those who replied
            const repliedLeads = leads.filter((lead: any) => lead.status?.toLowerCase() === 'replied');

            for (const lead of repliedLeads) {
                try {
                    // Attach campaign name for HubSpot tagging
                    lead.campaign_name = camp.name;
                    await syncContactToHubspot(lead);
                    totalSynced++;
                    syncedEmails.push(lead.email);
                } catch (err: any) {
                    console.error(`Failed to auto-sync lead ${lead.email}:`, err.message);
                }
            }
        }

        return NextResponse.json({
            success: true,
            synced_count: totalSynced,
            emails: syncedEmails
        });
    } catch (error: any) {
        console.error('Cron Sync API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
