import { RefreshCw, Download, ArrowRightCircle } from 'lucide-react';
import StatsCard from './StatsCard';
import LeadsTable from './LeadsTable';

export default function CampaignDetail({ campaign, leads, isLoadingLeads, onSyncAll }: any) {
    if (!campaign) {
        return (
            <div className="h-full flex items-center justify-center text-neutral-600 font-syne text-xl">
                Select a campaign to view details
            </div>
        );
    }

    const s = campaign.stats || {};
    const sent = s.sent || 0;

    const openRate = sent > 0 ? ((s.opened || 0) / sent * 100).toFixed(1) + '%' : '0%';
    const clickRate = sent > 0 ? ((s.clicked || 0) / sent * 100).toFixed(1) + '%' : '0%';
    const replyRate = sent > 0 ? ((s.replied || 0) / sent * 100).toFixed(1) + '%' : '0%';

    return (
        <div className="flex flex-col h-full bg-[#0A0A0A] p-6 lg:p-8 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="font-syne text-4xl font-bold text-white mb-2">{campaign.name}</h2>
                    <div className="flex items-center gap-3 text-sm font-mono text-neutral-400">
                        <span>ID: {campaign.id}</span>
                        <span>•</span>
                        <span className="uppercase">{campaign.type || 'Email Sequence'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors bg-neutral-900 font-mono text-xs uppercase tracking-wider">
                        <Download size={14} />
                        Export CSV
                    </button>

                    <button
                        onClick={onSyncAll}
                        className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-blue-500 text-white transition-colors font-mono text-xs uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                        <ArrowRightCircle size={14} />
                        Sync Replied to CRM
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatsCard title="Totals Sent" value={sent.toLocaleString()} isMuted={true} />
                <StatsCard title="Opened" value={(s.opened || 0).toLocaleString()} percentage={openRate} />
                <StatsCard title="Clicked" value={(s.clicked || 0).toLocaleString()} percentage={clickRate} isMuted={true} />
                <StatsCard title="Replied" value={(s.replied || 0).toLocaleString()} percentage={replyRate} isPositive={true} />
            </div>

            {/* Leads Section */}
            <div className="flex items-center justify-between mb-4 mt-6">
                <h3 className="font-syne text-xl font-bold text-neutral-200">Active Pipeline</h3>
                <div className="font-mono text-xs text-neutral-500 bg-neutral-900 px-3 py-1 border border-neutral-800">
                    FILTER: ALL
                </div>
            </div>

            <div className="flex-1 bg-black border border-neutral-800 relative min-h-[400px]">
                {isLoadingLeads ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                        <RefreshCw className="animate-spin text-neutral-500 mb-4" size={24} />
                        <p className="font-mono text-xs text-neutral-500 uppercase tracking-widest">Intercepting signal...</p>
                    </div>
                ) : (
                    <LeadsTable leads={leads} />
                )}
            </div>
        </div>
    );
}
