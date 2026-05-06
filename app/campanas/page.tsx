'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Megaphone, Mail, Eye, MessageCircle, MailX, RefreshCw, Loader2,
  ChevronRight, ChevronDown, Send, ExternalLink, Search,
} from 'lucide-react'

interface Stats {
  total: number; sent: number; opened: number; clicked: number
  replied: number; bounced: number; lastActivity: string
}

interface Campaign {
  id: string
  name: string
  status?: number
  created?: string
  stats: Stats
}

interface Respondent {
  email: string
  name: string
  company: string
  location: string
  opens: number
  replies: number
  updated: string
  last_subject: string
  last_message: string
  last_at: string
  thread_id: string
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
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

export default function CampanasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [openId, setOpenId]       = useState<string | null>(null)
  const [respondents, setRespondents] = useState<Record<string, Respondent[]>>({})
  const [loadingResp, setLoadingResp] = useState<Record<string, boolean>>({})
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

  async function loadRespondents(id: string) {
    if (respondents[id]) return  // ya cargado
    setLoadingResp(s => ({ ...s, [id]: true }))
    try {
      const r = await fetch(`/api/campanas?campaign_id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setRespondents(s => ({ ...s, [id]: d.respondents || [] }))
    } catch {}
    finally { setLoadingResp(s => ({ ...s, [id]: false })) }
  }

  function toggle(id: string) {
    if (openId === id) {
      setOpenId(null)
    } else {
      setOpenId(id)
      loadRespondents(id)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter(c => c.name.toLowerCase().includes(q))
  }, [campaigns, search])

  const totalReplied = campaigns.reduce((acc, c) => acc + c.stats.replied, 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <Megaphone size={20} style={{ color: '#F59E0B' }} /> Campañas
          </h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
            {campaigns.length} campañas · {totalReplied} respondedores totales
          </p>
        </div>
        <button onClick={load} disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs disabled:opacity-50"
                style={{ background:'var(--bg-surface)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        </button>
      </div>

      {/* Search */}
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

      <div className="space-y-3">
        {filtered.map(c => {
          const isOpen = openId === c.id
          const resps  = respondents[c.id]
          const loading = loadingResp[c.id]
          const sent = c.stats.total
          const replyRate = sent > 0 ? (c.stats.replied / sent * 100).toFixed(1) : '0'

          return (
            <div key={c.id}
                 className="rounded-lg overflow-hidden"
                 style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
              <div className="flex">
                <button onClick={() => toggle(c.id)}
                        className="flex-1 flex items-center gap-3 px-4 py-3 transition-all min-w-0"
                        style={{ background: isOpen ? 'var(--bg-elevated)' : 'transparent' }}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}>
                  {isOpen ? <ChevronDown size={14} style={{ color:'var(--text-2)' }} /> : <ChevronRight size={14} style={{ color:'var(--text-2)' }} />}
                  <Megaphone size={14} style={{ color:'#F59E0B', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold truncate" style={{ color:'var(--text-1)' }}>{c.name}</p>
                    <p className="text-[10px]" style={{ color:'var(--text-3)' }}>
                      {c.stats.total} contactos · {fmtRel(c.stats.lastActivity)}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2.5 shrink-0 text-[11px]">
                    <Stat color="#60A5FA" label="abiertos"   value={c.stats.opened}  icon={Eye} />
                    <Stat color="#22C55E" label="respondió"  value={c.stats.replied} icon={MessageCircle} highlight />
                    <Stat color="#EF4444" label="bounce"     value={c.stats.bounced} icon={MailX} />
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background:'var(--bg-base)', color: c.stats.replied > 0 ? '#22C55E' : 'var(--text-3)' }}>
                      {replyRate}% reply
                    </span>
                  </div>
                </button>
                <Link href={`/campanas/${c.id}`}
                      className="flex items-center gap-1 px-3 py-3 text-[11px] font-medium border-l shrink-0"
                      style={{ borderColor:'var(--border)', color:'var(--blue)' }}
                      title="Ver todos los contactos">
                  Ver todos →
                </Link>
              </div>

              {isOpen && (
                <div style={{ borderTop:'1px solid var(--border)' }}>
                  {loading ? (
                    <div className="p-6 flex items-center justify-center gap-2 text-xs" style={{ color:'var(--text-2)' }}>
                      <Loader2 size={12} className="animate-spin" /> Cargando respondedores…
                    </div>
                  ) : !resps || resps.length === 0 ? (
                    <div className="p-6 text-center text-xs" style={{ color:'var(--text-3)' }}>
                      Sin respuestas todavía
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor:'var(--border)' }}>
                      {resps.map(r => (
                        <div key={r.email} className="p-4 flex items-start gap-3">
                          <div className="shrink-0 w-9 h-9 rounded-md flex items-center justify-center text-sm font-semibold"
                               style={{ background:'var(--bg-elevated)', color:'var(--text-1)' }}>
                            {(r.name || r.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold" style={{ color:'var(--text-1)' }}>
                                {r.name || r.email.split('@')[0]}
                              </span>
                              {r.company && <span className="text-xs" style={{ color:'var(--text-3)' }}>· {r.company}</span>}
                              {r.location && <span className="text-xs" style={{ color:'var(--text-3)' }}>· {r.location}</span>}
                              <span className="text-[10px] ml-auto" style={{ color:'var(--text-3)' }}>{fmtRel(r.last_at || r.updated)}</span>
                            </div>
                            <p className="text-xs mb-1" style={{ color:'var(--text-2)' }}>{r.email}</p>
                            {r.last_subject && (
                              <p className="text-xs font-medium mt-2" style={{ color:'var(--text-1)' }}>{r.last_subject}</p>
                            )}
                            {r.last_message && (
                              <p className="text-xs mt-1 leading-relaxed line-clamp-3" style={{ color:'var(--text-2)' }}>
                                "{r.last_message}"
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Link
                                href={`/conversaciones?email=${encodeURIComponent(r.email)}`}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium"
                                style={{ background:'var(--blue)', color:'#fff' }}>
                                <Send size={9} /> Responder
                              </Link>
                              <Link
                                href={`/funnel?email=${encodeURIComponent(r.email)}`}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium"
                                style={{ background:'var(--bg-elevated)', color:'var(--text-2)', border:'1px solid var(--border)' }}>
                                <ExternalLink size={9} /> Ficha
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, color, highlight }: any) {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded"
          style={{
            background: highlight ? color + '20' : 'transparent',
            color:      value > 0 ? color : 'var(--text-3)',
          }}>
      <Icon size={10} />
      <span className="font-bold">{value}</span>
      <span className="hidden md:inline" style={{ color:'var(--text-3)', fontWeight:400 }}>{label}</span>
    </span>
  )
}
