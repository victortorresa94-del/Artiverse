'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Megaphone, Mail, Eye, MessageCircle, MailX, RefreshCw, Loader2,
  ChevronRight, Search, MousePointer,
} from 'lucide-react'

interface Stats {
  total: number; sent: number; opened: number; clicked: number
  replied: number; bounced: number; lastActivity: string
}
interface Campaign {
  id: string; name: string; status?: number; created?: string; stats: Stats
}

function fmtRel(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d`
  return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short' })
}

export default function CampanasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')

  async function load() {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/campanas', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setCampaigns(d.campaigns || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter(c => c.name.toLowerCase().includes(q))
  }, [campaigns, search])

  const totals = useMemo(() => {
    return campaigns.reduce((acc, c) => ({
      total:    acc.total + c.stats.total,
      replied:  acc.replied + c.stats.replied,
      opened:   acc.opened + c.stats.opened,
      clicked:  acc.clicked + c.stats.clicked,
      bounced:  acc.bounced + c.stats.bounced,
    }), { total: 0, replied: 0, opened: 0, clicked: 0, bounced: 0 })
  }, [campaigns])

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <Megaphone size={20} style={{ color: '#F59E0B' }} /> Campañas
          </h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
            {campaigns.length} campañas · {totals.total} contactos · {totals.replied} respuestas · {totals.clicked} clicks · {totals.opened} aperturas
          </p>
        </div>
        <button onClick={load} disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs disabled:opacity-50"
                style={{ background:'var(--bg-surface)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
        <input type="text" placeholder="Buscar campaña…" value={search} onChange={e => setSearch(e.target.value)}
               className="w-full pl-9 pr-3 py-2 rounded-md text-sm outline-none"
               style={{ background:'var(--bg-surface)', color:'var(--text-1)', border:'1px solid var(--border)' }} />
      </div>

      {error && (
        <div className="p-3 rounded-lg mb-4 text-sm" style={{ background:'#EF444415', color:'#FCA5A5' }}>{error}</div>
      )}

      {loading && !campaigns.length && (
        <div className="flex items-center justify-center py-20" style={{ color: 'var(--text-2)' }}>
          <Loader2 size={20} className="animate-spin mr-2" /> Cargando campañas…
        </div>
      )}

      {/* Cards clickables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(c => {
          const sent = c.stats.total
          const replyRate = sent > 0 ? (c.stats.replied / sent * 100).toFixed(1) : '0'
          return (
            <Link key={c.id} href={`/campanas/${c.id}`}
                  className="rounded-lg p-4 transition-all flex flex-col gap-3 group"
                  style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
              <div className="flex items-start gap-2.5">
                <Megaphone size={16} style={{ color:'#F59E0B', flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight mb-0.5" style={{ color:'var(--text-1)' }}>
                    {c.name}
                  </p>
                  <p className="text-[10px]" style={{ color:'var(--text-3)' }}>
                    {c.stats.total} contactos · {fmtRel(c.stats.lastActivity) || 'sin actividad'}
                  </p>
                </div>
                <ChevronRight size={14}
                  className="opacity-50 group-hover:opacity-100 transition-opacity"
                  style={{ color:'var(--text-3)', flexShrink: 0 }} />
              </div>

              {/* Reply rate destacado */}
              <div className="rounded-md p-2 text-center"
                   style={{
                     background: c.stats.replied > 0 ? '#22C55E15' : 'var(--bg-base)',
                     border:     `1px solid ${c.stats.replied > 0 ? '#22C55E40' : 'var(--border)'}`,
                   }}>
                <p className="text-2xl font-bold" style={{ color: c.stats.replied > 0 ? '#22C55E' : 'var(--text-3)' }}>
                  {c.stats.replied}
                </p>
                <p className="text-[9px] uppercase tracking-wider" style={{ color:'var(--text-3)' }}>
                  Respuestas · {replyRate}%
                </p>
              </div>

              {/* Stats secundarias */}
              <div className="grid grid-cols-3 gap-1.5">
                <Stat icon={Eye}          color="#FBBF24" label="aperturas" value={c.stats.opened} />
                <Stat icon={MousePointer} color="#A78BFA" label="clicks"    value={c.stats.clicked} />
                <Stat icon={MailX}        color="#EF4444" label="bounces"   value={c.stats.bounced} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, color }: any) {
  return (
    <div className="text-center p-2 rounded"
         style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>
      <Icon size={11} className="mx-auto mb-1" style={{ color: value > 0 ? color : 'var(--text-3)' }} />
      <p className="text-sm font-bold" style={{ color: value > 0 ? 'var(--text-1)' : 'var(--text-3)' }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider" style={{ color:'var(--text-3)' }}>{label}</p>
    </div>
  )
}
