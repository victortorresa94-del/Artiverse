import React from 'react';

// Example skeleton for standardizing layout components
export default function StatsCard({ title, value, percentage, isPositive = true, isMuted = false }: any) {
  return (
    <div className={`border border-neutral-800 bg-neutral-950 p-4 flex flex-col gap-2 ${isMuted ? 'opacity-60' : ''}`}>
      <span className="text-neutral-400 font-mono text-xs uppercase tracking-wider">{title}</span>
      <div className="flex items-baseline justify-between">
        <span className="font-syne text-3xl font-bold text-white">{value}</span>
        {percentage && (
          <span className={`font-mono text-xs font-bold ${isPositive ? 'text-[#CCFF00]' : 'text-neutral-500'}`}>
            {percentage}
          </span>
        )}
      </div>
    </div>
  );
}
