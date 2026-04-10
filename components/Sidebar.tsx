'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, Megaphone, GitBranch, Users, Flame
} from 'lucide-react'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Campañas', icon: Megaphone },
  { href: '/funnel', label: 'Funnel', icon: GitBranch },
  { href: '/leads', label: 'Leads / CRM', icon: Users },
  { href: '/warmup', label: 'Warm-up', icon: Flame },
]

export default function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname()

  return (
    <aside className={`flex flex-col bg-white ${mobile ? 'w-full' : 'w-56 shrink-0 border-r border-gray-200'}`}>
      {/* Logo — only shown in desktop sidebar (mobile has it in header) */}
      {!mobile && (
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <Image src="/artiverse-logo.jpg" alt="Artiverse" width={32} height={32} className="rounded-md" />
          <div>
            <span className="text-gray-900 font-bold text-base tracking-tight">Artiverse</span>
            <p className="text-[10px] text-gray-400 tracking-widest uppercase leading-none mt-0.5">Control Center</p>
          </div>
        </div>
      </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} className={active ? 'text-blue-600' : 'text-current'} />
              <span className="flex-1">{label}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <p className="text-[11px] text-gray-500 font-medium">Sistema activo</p>
        </div>
        <p className="text-[10px] text-gray-400">victor@aetherlabs.es</p>
      </div>
    </aside>
  )
}
