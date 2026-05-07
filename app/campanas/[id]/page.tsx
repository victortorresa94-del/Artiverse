'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, RefreshCw, Loader2, Search, Send, ExternalLink,
  Mail, Eye, MousePointer, MessageCircle, MailX, ChevronDown, ChevronRight,
  MapPin, Briefcase, Linkedin, Building2,
} from 'lucide-react'

type Phase = 'respondido' | 'click' | 'abierto' | 'contactado' | 'mail_erroneo'

interface Contact {
  email: string; name: string; company: string; job: string; location: string
  linkedin?: string
  phase: Phase
  opens: number; clicks: number; replies: number
  updated: string
  last_subject: string; last_message: string; last_at: string; thread_id: string
}

const PHASE_META: Record<Phase, { label: string; color: string; bg: string; icon: any }> = {
  respondido:   { label: 'Respondido',  color:'#22C55E', bg:'#22C55E25', icon: MessageCircle },
  click:        { label: 'Click',       color:'#A78BFA', bg:'#A78BFA25', icon: MousePointer },
  abierto:      { label: 'Abierto',     color:'#FBBF24', bg:'#FBBF2425', icon: Eye },
  contactado:   { label: 'Contactado',  color:'#60A5FA', bg:'#60A5FA25', icon: Mail },
  mail_erroneo: { label: 'Mail erróneo',color:'#EF4444', bg:'#EF444425', icon: MailX },
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' })
}
function fmtRel(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d`
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [campaignName, setCampaignName] = useState('')
  const [counts, setCounts]     = useState<Record<string, number>>({ all: 0, respondido: 0, click: 0, abierto: 0, contactado: 0, mail_erroneo: 0 })
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [filter, setFilter]     = useState<Phase | 'all'>('all')
  const [search, setSearch]     = useState('')
  const [openRow, setOpenRow]   = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/campanas/${id}/contacts`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setContacts(d.contacts || [])
      setCounts(d.counts || {})
      setCampaignName(d.campaign?.name || id)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contacts.filter(c => {
      if (filter !== 'all' && c.phase !== filter) return false
      if (q && !(
        c.email.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [contacts, filter, search])

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/campanas" className="p-1.5 rounded-md" style={{ color:'var(--text-2)' }}>
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate" style={{ color:'var(--text-1)' }}>
            {campaignName}
          </h1>
          <p className="text-xs" style={{ color:'var(--text-3)' }}>
            {contacts.length} contactos · {counts.respondido || 0} respuestas · {counts.click || 0} clicks · {counts.abierto || 0} aperturas
          </p>
        </div>
        <button onClick={load} disabled={loading}
                className="p-1.5 rounded-md disabled:opacity-50"
                style={{ color:'var(--text-2)', background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        </button>
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex flex-wrap gap-1">
          <FilterPill active={filter==='all'}        label="Todos"       count={counts.all || 0}        color="var(--text-2)" onClick={() => setFilter('all')} />
          <FilterPill active={filter==='respondido'} label="Respondidos" count={counts.respondido || 0} color="#22C55E" onClick={() => setFilter('respondido')} />
          <FilterPill active={filter==='click'}      label="Clicks"      count={counts.click || 0}      color="#A78BFA" onClick={() => setFilter('click')} />
          <FilterPill active={filter==='abierto'}    label="Abiertos"    count={counts.abierto || 0}    color="#FBBF24" onClick={() => setFilter('abierto')} />
          <FilterPill active={filter==='contactado'} label="Contactados" count={counts.contactado || 0} color="#60A5FA" onClick={() => setFilter('contactado')} />
          <FilterPill active={filter==='mail_erroneo'} label="Erróneos" count={counts.mail_erroneo || 0} color="#EF4444" onClick={() => setFilter('mail_erroneo')} />
        </div>
        <div className="relative flex-1 max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }} />
          <input type="text" placeholder="Buscar nombre, email, empresa…" value={search} onChange={e => setSearch(e.target.value)}
                 className="w-full pl-9 pr-3 py-2 rounded-md text-sm outline-none"
                 style={{ background:'var(--bg-surface)', color:'var(--text-1)', border:'1px solid var(--border)' }} />
        </div>
      </div>

      {error && <div className="p-3 rounded mb-4 text-sm" style={{ background:'#EF444415', color:'#FCA5A5' }}>{error}</div>}

      {loading && contacts.length === 0 && (
        <div className="flex items-center justify-center py-20" style={{ color:'var(--text-2)' }}>
          <Loader2 size={20} className="animate-spin mr-2" /> Cargando contactos…
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-lg overflow-hidden" style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
        {/* Header */}
        <div className="hidden md:grid gap-3 px-4 py-2.5 text-[10px] uppercase tracking-wider font-semibold"
             style={{ gridTemplateColumns:'2fr 110px 60px 60px 60px 100px 30px', color:'var(--text-3)', borderBottom:'1px solid var(--border)' }}>
          <div>Contacto</div>
          <div>Estado</div>
          <div className="text-center">Aperturas</div>
          <div className="text-center">Clicks</div>
          <div className="text-center">Respuestas</div>
          <div>Última act.</div>
          <div></div>
        </div>

        {filtered.length === 0 && !loading && (
          <div className="p-8 text-center text-xs" style={{ color:'var(--text-3)' }}>
            Sin contactos en este filtro
          </div>
        )}

        {filtered.map(c => {
          const meta = PHASE_META[c.phase]
          const isOpen = openRow === c.email
          return (
            <div key={c.email} style={{ borderBottom:'1px solid var(--border)' }}>
              <button onClick={() => setOpenRow(isOpen ? null : c.email)}
                      className="w-full text-left grid md:grid-cols-[2fr_110px_60px_60px_60px_100px_30px] gap-3 px-4 py-3 transition-all"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {/* Contact */}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color:'var(--text-1)' }}>
                    {c.name || c.email.split('@')[0]}
                  </p>
                  <p className="text-[11px] truncate" style={{ color:'var(--text-3)', fontFamily:'var(--font-mono)' }}>
                    {c.email}
                  </p>
                  {c.company && (
                    <p className="text-[10px] truncate md:hidden mt-0.5" style={{ color:'var(--text-2)' }}>
                      {c.company}
                    </p>
                  )}
                </div>
                {/* Phase */}
                <div className="md:flex items-center">
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: meta.bg, color: meta.color }}>
                    <meta.icon size={9} /> {meta.label}
                  </span>
                </div>
                {/* Stats */}
                <div className="hidden md:block text-center text-xs" style={{ color: c.opens > 0 ? 'var(--text-1)' : 'var(--text-3)' }}>
                  {c.opens || '—'}
                </div>
                <div className="hidden md:block text-center text-xs" style={{ color: c.clicks > 0 ? 'var(--text-1)' : 'var(--text-3)' }}>
                  {c.clicks > 0 ? `${c.clicks}x` : '—'}
                </div>
                <div className="hidden md:block text-center text-xs font-semibold" style={{ color: c.replies > 0 ? '#22C55E' : 'var(--text-3)' }}>
                  {c.replies > 0 ? `${c.replies}x` : '—'}
                </div>
                <div className="hidden md:block text-xs" style={{ color:'var(--text-3)' }}>
                  {fmtDate(c.last_at || c.updated)}
                </div>
                <div className="hidden md:flex items-center justify-end" style={{ color:'var(--text-3)' }}>
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </div>
              </button>

              {/* Expanded row */}
              {isOpen && (
                <div className="px-4 py-4" style={{ background:'var(--bg-base)', borderTop:'1px solid var(--border)' }}>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Info */}
                    <div className="space-y-2 text-xs" style={{ color:'var(--text-1)' }}>
                      {c.company && (
                        <div className="flex items-start gap-2">
                          <Building2 size={11} className="mt-0.5" style={{ color:'var(--text-3)' }} />
                          <span>{c.company}</span>
                        </div>
                      )}
                      {c.job && (
                        <div className="flex items-start gap-2">
                          <Briefcase size={11} className="mt-0.5" style={{ color:'var(--text-3)' }} />
                          <span>{c.job}</span>
                        </div>
                      )}
                      {c.location && (
                        <div className="flex items-start gap-2">
                          <MapPin size={11} className="mt-0.5" style={{ color:'var(--text-3)' }} />
                          <span>{c.location}</span>
                        </div>
                      )}
                      {c.linkedin && (
                        <div className="flex items-start gap-2">
                          <Linkedin size={11} className="mt-0.5" style={{ color:'var(--text-3)' }} />
                          <a href={c.linkedin} target="_blank" rel="noopener noreferrer" style={{ color:'var(--blue)' }}>
                            LinkedIn
                          </a>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {[
                          { label:'Aperturas',  value: c.opens,   color:'#FBBF24' },
                          { label:'Clicks',     value: c.clicks,  color:'#A78BFA' },
                          { label:'Respuestas', value: c.replies, color:'#22C55E' },
                        ].map(s => (
                          <div key={s.label} className="text-center p-2 rounded"
                               style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
                            <p className="text-base font-bold" style={{ color: s.value > 0 ? s.color : 'var(--text-3)' }}>
                              {s.value || '—'}
                            </p>
                            <p className="text-[9px] uppercase tracking-wider" style={{ color:'var(--text-3)' }}>
                              {s.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mensaje */}
                    <div>
                      {c.last_message ? (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color:'var(--text-3)' }}>
                            Último mensaje · {fmtDate(c.last_at)}
                          </p>
                          {c.last_subject && (
                            <p className="text-sm font-semibold mb-2" style={{ color:'var(--text-1)' }}>{c.last_subject}</p>
                          )}
                          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color:'var(--text-2)' }}>
                            {c.last_message.slice(0, 600)}{c.last_message.length > 600 ? '…' : ''}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs italic" style={{ color:'var(--text-3)' }}>
                          {c.phase === 'contactado'   ? 'Aún no ha interactuado.' :
                           c.phase === 'abierto'      ? 'Abrió pero no respondió.' :
                           c.phase === 'click'        ? 'Hizo click pero no respondió.' :
                           c.phase === 'mail_erroneo' ? 'Email no entregado (bounce).' :
                           'Sin mensaje guardado.'}
                        </p>
                      )}

                      {/* Acciones */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {c.replies > 0 ? (
                          <Link href={`/conversaciones?email=${encodeURIComponent(c.email)}`}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold"
                                style={{ background:'var(--blue)', color:'#fff' }}>
                            <Send size={10} /> Responder
                          </Link>
                        ) : (
                          <Link href={`/conversaciones?email=${encodeURIComponent(c.email)}`}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium"
                                style={{ background:'var(--bg-surface)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
                            <Mail size={10} /> Iniciar conversación
                          </Link>
                        )}
                        <Link href={`/funnel?email=${encodeURIComponent(c.email)}`}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium"
                              style={{ background:'var(--bg-surface)', color:'var(--text-2)', border:'1px solid var(--border)' }}>
                          <ExternalLink size={10} /> Ficha completa
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[11px]" style={{ color:'var(--text-3)' }}>
        {filtered.length} de {contacts.length} contactos
      </p>
    </div>
  )
}

function FilterPill({ active, label, count, color, onClick }: any) {
  return (
    <button onClick={onClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium transition-all"
            style={{
              background: active ? color + '25' : 'var(--bg-surface)',
              color:      active ? color : 'var(--text-2)',
              border:     `1px solid ${active ? color + '50' : 'var(--border)'}`,
            }}>
      {label}
      <span className="text-[9px] font-bold px-1 rounded"
            style={{ background: active ? color + '30' : 'var(--bg-elevated)' }}>
        {count}
      </span>
    </button>
  )
}
