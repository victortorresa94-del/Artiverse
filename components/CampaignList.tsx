export default function CampaignList({ campaigns, activeId, onSelect }: any) {
    return (
        <div className="flex flex-col gap-1 overflow-y-auto">
            {campaigns.map((camp: any) => {
                let statusColor = 'bg-neutral-600';
                if (camp.status === 1 || camp.status === 'active') statusColor = 'bg-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.4)]';
                else if (camp.status === 2 || camp.status === 'paused') statusColor = 'bg-amber-500';

                const stats = camp.stats || {};
                const replies = stats.replied || 0;

                return (
                    <button
                        key={camp.id}
                        onClick={() => onSelect(camp)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors border-l-2
              ${activeId === camp.id
                                ? 'bg-neutral-900 border-[#2563EB] text-white'
                                : 'hover:bg-neutral-900 border-transparent text-neutral-400'
                            }`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                            <span className="font-syne font-semibold truncate text-sm">{camp.name}</span>
                        </div>

                        {replies > 0 && (
                            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded shrink-0
                ${activeId === camp.id ? 'bg-[#2563EB] text-white' : 'bg-neutral-800 text-neutral-300'}
              `}>
                                {replies} REPLIES
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
