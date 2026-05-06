'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, Zap, Map, Users, Megaphone, Settings, Sun, Moon, Mail, Inbox, GitBranch, Send, Gauge, Newspaper, MailOpen, Wand2,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'

// Nuevas vistas — las que estamos construyendo limpias y con sentido
const newNav = [
  { href: '/panel',          label: 'Panel',          icon: Gauge },
  { href: '/conversaciones', label: 'Conversaciones', icon: Inbox },
  { href: '/bandeja',        label: 'Bandeja',        icon: MailOpen },
  { href: '/enviados',       label: 'Enviados',       icon: Send },
  { href: '/funnel',         label: 'Funnel',         icon: GitBranch },
  { href: '/campanas',       label: 'Campañas',       icon: Megaphone },
  { href: '/newsletters',    label: 'Newsletters',    icon: Newspaper },
  { href: '/maquetador',     label: 'Maquetador',     icon: Wand2 },
]

// Vistas legacy — pendientes de revisar/migrar
const legacyNav = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/hoy',       label: 'Hoy',       icon: Zap },
  { href: '/ruta',      label: 'Ruta',      icon: Map },
  { href: '/contactos', label: 'Contactos', icon: Users },
  { href: '/campaigns', label: 'Campañas',  icon: Megaphone },
  { href: '/marketing', label: 'Marketing', icon: Mail },
]

const configNav = [
  { href: '/config', label: 'Config', icon: Settings },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1.5">
      <span
        className="text-[9px] uppercase tracking-[0.15em] font-semibold"
        style={{ color: 'var(--text-3)' }}
      >
        {children}
      </span>
    </div>
  )
}

function NavItem({
  href, label, icon: Icon, active,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative group"
      style={{
        background:  active ? 'var(--bg-active)' : 'transparent',
        color:       active ? 'var(--text-1)'    : 'var(--text-2)',
        fontWeight:  active ? '600' : '400',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-1)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
        }
      }}
    >
      <Icon
        size={15}
        style={{ color: active ? 'var(--blue)' : 'currentColor', flexShrink: 0 }}
      />
      <span className="flex-1 truncate">{label}</span>
      {active && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: 'var(--blue)' }}
        />
      )}
    </Link>
  )
}

export default function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname()
  const { theme, toggle } = useTheme()

  return (
    <aside
      className={`flex flex-col ${mobile ? 'w-full' : 'w-56 shrink-0'}`}
      style={{
        background:  'var(--bg-surface)',
        borderRight: mobile ? 'none' : '1px solid var(--border)',
      }}
    >
      {/* Logo — desktop only */}
      {!mobile && (
        <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <Image
              src="/artiverse-logo.jpg"
              alt="Artiverse"
              width={30}
              height={30}
              className="rounded-md"
            />
            <div>
              <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-1)' }}>
                Artiverse
              </span>
              <p
                className="text-[9px] uppercase tracking-widest leading-none mt-0.5"
                style={{ color: 'var(--text-3)' }}
              >
                Control Center
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {/* Sección NUEVO */}
        <SectionLabel>Nuevo</SectionLabel>
        {newNav.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={path === item.href}
          />
        ))}

        {/* Separador visual */}
        <div className="my-2" style={{ borderTop: '1px solid var(--border)' }} />

        {/* Sección LEGACY */}
        <SectionLabel>Legacy</SectionLabel>
        {legacyNav.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={path === item.href}
          />
        ))}
      </nav>

      {/* Config nav — above footer */}
      <div className="px-3 pb-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
        {configNav.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={path === item.href}
          />
        ))}
      </div>

      {/* Footer — status + theme toggle */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg mb-3 transition-all"
          style={{
            background: 'var(--bg-elevated)',
            border:     '1px solid var(--border)',
            color:      'var(--text-2)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
        >
          {theme === 'dark'
            ? <Sun  size={13} style={{ color: '#F59E0B' }} />
            : <Moon size={13} style={{ color: '#8B8BA8' }} />
          }
          <span className="text-[11px] font-medium">
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </span>
        </button>

        {/* Status */}
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="w-1.5 h-1.5 rounded-full status-pulse shrink-0"
            style={{ background: 'var(--success)' }}
          />
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>Sistema activo</p>
        </div>
        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>victor@aetherlabs.es</p>
      </div>
    </aside>
  )
}
