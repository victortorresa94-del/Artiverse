'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Megaphone, GitBranch, Users, Flame, ChevronRight
} from 'lucide-react'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Campañas', icon: Megaphone },
  { href: '/funnel', label: 'Funnel', icon: GitBranch },
  { href: '/leads', label: 'Leads / CRM', icon: Users },
  { href: '/warmup', label: 'Warm-up', icon: Flame },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-white/5 flex flex-col bg-[#0A0A0A]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[#CCFF00] font-bold text-lg tracking-tight">ARTIVERSE</span>
        </div>
        <p className="text-[10px] text-white/30 mt-0.5 tracking-widest uppercase">Control Center</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                active
                  ? 'bg-[#2563EB]/20 text-white border border-[#2563EB]/30'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} className={active ? 'text-[#2563EB]' : 'text-current'} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} className="text-[#2563EB]" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/5">
        <p className="text-[10px] text-white/20">victor@aetherlabs.es</p>
        <p className="text-[10px] text-white/20">v1.0 — Apr 2026</p>
      </div>
    </aside>
  )
}
