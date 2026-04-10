import { CheckCircle2, Circle } from 'lucide-react';

export default function LeadsTable({ leads = [] }: any) {
    if (leads.length === 0) {
        return <div className="p-8 text-center font-mono text-sm text-neutral-600 uppercase">No active leads found in this sector.</div>;
    }

    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('replied')) return 'bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/20';
        if (s.includes('opened')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        if (s.includes('clicked')) return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        if (s.includes('sent')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        if (s.includes('bounced')) return 'bg-red-500/10 text-red-500 border-red-500/20';
        if (s.includes('unsubscribed')) return 'bg-neutral-800 text-neutral-500 border-neutral-700 line-through';
        return 'bg-neutral-900 border-neutral-800 text-neutral-400';
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-950/80 uppercase font-mono text-[10px] tracking-widest text-neutral-500 sticky top-0">
                        <th className="p-4 font-normal w-10 text-center"><Circle size={14} className="opacity-30 inline" /></th>
                        <th className="p-4 font-normal">Contact</th>
                        <th className="p-4 font-normal hidden md:table-cell">Company</th>
                        <th className="p-4 font-normal">Status</th>
                        <th className="p-4 font-normal hidden lg:table-cell">Activity</th>
                        <th className="p-4 font-normal text-right">HubSpot</th>
                    </tr>
                </thead>
                <tbody className="font-mono text-xs divide-y divide-neutral-900/50">
                    {leads.map((lead: any, i: number) => (
                        <tr key={lead.email || i} className="hover:bg-neutral-900/50 transition-colors group">
                            <td className="p-4 text-center">
                                <input type="checkbox" className="accent-[#2563EB] bg-black border-neutral-700 w-3 h-3 appearance-none border checked:bg-[#2563EB] cursor-pointer" />
                            </td>
                            <td className="p-4">
                                <div className="flex flex-col">
                                    <span className="text-neutral-200 font-syne text-sm font-semibold mb-1">
                                        {lead.firstName} {lead.lastName}
                                    </span>
                                    <span className="text-neutral-500">{lead.email}</span>
                                </div>
                            </td>
                            <td className="p-4 text-neutral-400 hidden md:table-cell">{lead.companyName || '-'}</td>
                            <td className="p-4">
                                <span className={`px-2.5 py-1 rounded inline-block border font-bold uppercase tracking-wider text-[9px] ${getStatusBadge(lead.status)}`}>
                                    {lead.status || 'Unknown'}
                                </span>
                            </td>
                            <td className="p-4 text-neutral-500 hidden lg:table-cell">
                                {lead.lastActivityDate ? new Date(lead.lastActivityDate).toLocaleDateString() : '-'}
                            </td>
                            <td className="p-4 text-right">
                                {/* Visual mock for CRM sync state */}
                                {lead.status?.toLowerCase().includes('replied') ? (
                                    <CheckCircle2 className="inline text-neutral-600 group-hover:text-neutral-400 transition-colors" size={16} />
                                ) : (
                                    <span className="text-neutral-700">-</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
