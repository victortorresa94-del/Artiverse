'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  RefreshCw, Mail, CheckCircle2, Clock, FileText, Loader2, Send, Eye, Play,
  Sparkles, Gift, Award, BarChart3, Megaphone, ChevronDown, ChevronRight,
  Users, Pencil,
} from 'lucide-react'

interface Newsletter {
  id: string; name: string; description: string
  status: 'active' | 'ready' | 'draft'
  audience: string; template: string
  triggerType: 'auto' | 'manual' | 'scheduled'
  triggerDesc: string
  recipients?: number
}

interface ApiResp {
  newsletters: Newsletter[]
  counts: { total: number; active: number; ready: number; draft: number }
}

interface SentRecord {
  email: string; name?: string; sentAt: string
  openedAt?: string; openCount: number
  bounced?: boolean
}

const STATUS_META = {
  active: { label: 'Activa',  color: '#22C55E', icon: CheckCircle2 },
  ready:  { label: 'Lista',   color: '#60A5FA', icon: Clock },
  draft:  { label: 'Borrador',color: '#94A3B8', icon: FileText },
} as const

const ICONS_BY_ID: Record<string, React.ElementType> = {
  bienvenida:    Gift,
  licitaciones:  Megaphone,
  talento_mes:   Award,
  insights:      BarChart3,
  convocatorias: Sparkles,
}

function fmtRel(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d`
  return new Date(iso).toLocaleDateString('es-ES', { day:'2-digit', month:'short' })
}

export default function NewslettersPage() {
  const [data, setData]       = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ id: string; type: 'ok'|'err'; msg: string } | null>(null)

  // Sent records por newsletter
  const [openId, setOpenId]     = useState<string | null>(null)
  const [sent, setSent]         = useState<Record<string, { records: SentRecord[]; stats: any }>>({})
  const [loadingSent, setLoadingSent] = useState<Record<string, boolean>>({})

  // Bulk send
  const [launching, setLaunching] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/newsletters', { cache: 'no-store' })
      if (!r.ok) throw new Error(`Error ${r.status}`)
      setData(await r.json())
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function loadSent(id: string) {
    if (sent[id]) return
    setLoadingSent(s => ({ ...s, [id]: true }))
    try {
      const r = await fetch(`/api/newsletters/${id}/sent`, { cache: 'no-store' })
      const d = await r.json()
      setSent(s => ({ ...s, [id]: { records: d.records || [], stats: d.stats || {} } }))
    } finally {
      setLoadingSent(s => ({ ...s, [id]: false }))
    }
  }

  function toggle(id: string) {
    if (openId === id) { setOpenId(null) }
    else { setOpenId(id); loadSent(id) }
  }

  async function sendTest(id: string) {
    if (id !== 'bienvenida') {
      setFeedback({ id, type: 'err', msg: 'Solo "Bienvenida" tiene template implementado' })
      return
    }
    const to = prompt('Email de prueba:', 'victor@aetherlabs.es')
    if (!to) return
    setTestingId(id); setFeedback(null)
    try {
      const r = await fetch('/api/welcome/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, firstName: to.split('@')[0], test: true }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setFeedback({ id, type: 'ok', msg: `Test enviado a ${to}` })
    } catch (e: any) { setFeedback({ id, type: 'err', msg: e.message }) }
    finally { setTestingId(null) }
  }

  function preview(id: string) {
    if (id !== 'bienvenida') return alert('Sin template todavía')
    window.open(`/api/welcome/preview?firstName=Victor`, '_blank')
  }

  async function launchToday(id: string) {
    if (id !== 'bienvenida') return
    if (!confirm('Lanzar bienvenida a TODOS los nuevos registros de las últimas 24h?')) return
    setLaunching(id); setFeedback(null)
    try {
      const r = await fetch('/api/automation/welcome?token=AETHER2026&window=1440', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setFeedback({ id, type: 'ok', msg: `Lanzado: ${d.emailed} enviados / ${d.found} detectados / ${d.errors?.length || 0} errores` })
      // Refresh sent list
      delete sent[id]
      await loadSent(id)
    } catch (e: any) { setFeedback({ id, type: 'err', msg: e.message }) }
    finally { setLaunching(null) }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Newsletters</h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
            {data ? `${data.counts.total} campañas · ${data.counts.active} activa(s) · ${data.counts.ready} lista(s) · ${data.counts.draft} borrador(es)` : 'Cargando…'}
          </p>
        </div>
        <button onClick={load} disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs disabled:opacity-50"
                style={{ background:'var(--bg-surface)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg mb-4 text-sm" style={{ background:'#EF444415', color:'#FCA5A5' }}>{error}</div>
      )}

      {data && (
        <div className="space-y-3">
          {data.newsletters.map(n => {
            const meta = STATUS_META[n.status]
            const Icon = ICONS_BY_ID[n.id] || Mail
            const StatusIcon = meta.icon
            const fb = feedback?.id === n.id ? feedback : null
            const isOpen = openId === n.id
            const sd = sent[n.id]
            const ld = loadingSent[n.id]

            return (
              <div key={n.id}
                   className="rounded-lg overflow-hidden"
                   style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
                {/* HEADER */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                           style={{ background: meta.color + '20' }}>
                        <Icon size={18} style={{ color: meta.color }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold mb-0.5" style={{ color:'var(--text-1)' }}>{n.name}</h3>
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
                              style={{ background: meta.color + '25', color: meta.color }}>
                          <StatusIcon size={9} /> {meta.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs mb-3 leading-relaxed" style={{ color:'var(--text-2)' }}>{n.description}</p>

                  <div className="space-y-1 mb-4 text-[11px]" style={{ color:'var(--text-3)' }}>
                    <div><span>Audiencia: </span><span style={{ color:'var(--text-1)' }}>{n.audience}</span>{n.recipients !== undefined && <span> ({n.recipients})</span>}</div>
                    <div><span>Trigger: </span><span style={{ color:'var(--text-2)' }}>{n.triggerDesc}</span></div>
                  </div>

                  {fb && (
                    <div className="px-2 py-1.5 rounded text-[11px] mb-2"
                         style={{ background: fb.type==='ok' ? '#22C55E20':'#EF444420', color: fb.type==='ok' ? '#22C55E':'#FCA5A5' }}>
                      {fb.msg}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => preview(n.id)} disabled={n.id !== 'bienvenida'}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background:'var(--bg-elevated)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
                      <Eye size={11} /> Preview
                    </button>
                    <Link href="/maquetador"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium"
                          style={{ background:'var(--bg-elevated)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
                      <Pencil size={11} /> Editar
                    </Link>
                    <button onClick={() => sendTest(n.id)} disabled={n.id !== 'bienvenida' || testingId === n.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background:'var(--bg-elevated)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
                      {testingId === n.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Test
                    </button>
                    {n.id === 'bienvenida' && (
                      <button onClick={() => launchToday(n.id)} disabled={launching === n.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold ml-auto disabled:opacity-50"
                              style={{ background:'#22C55E', color:'#fff' }}>
                        {launching === n.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                        Lanzar nuevos hoy
                      </button>
                    )}
                  </div>
                </div>

                {/* SENT LIST TOGGLE */}
                <button onClick={() => toggle(n.id)}
                        className="w-full px-5 py-2.5 flex items-center gap-2 text-[11px] font-medium transition-all"
                        style={{ background: isOpen ? 'var(--bg-elevated)' : 'var(--bg-base)', borderTop:'1px solid var(--border)', color:'var(--text-2)' }}>
                  {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  <Users size={11} />
                  Enviados {sd ? `(${sd.stats.total}, ${sd.stats.opened} abrieron — ${sd.stats.openRate}%)` : ''}
                </button>

                {isOpen && (
                  <div style={{ borderTop:'1px solid var(--border)' }}>
                    {ld ? (
                      <div className="p-4 text-center text-xs" style={{ color:'var(--text-2)' }}>
                        <Loader2 size={12} className="animate-spin inline mr-2" /> Cargando…
                      </div>
                    ) : !sd || sd.records.length === 0 ? (
                      <div className="p-6 text-center text-xs" style={{ color:'var(--text-3)' }}>
                        Sin envíos registrados todavía. Cuando se envíe este newsletter aparecerán aquí los destinatarios.
                      </div>
                    ) : (
                      <>
                        {/* Stats summary */}
                        <div className="px-5 py-3 grid grid-cols-3 gap-3 text-center"
                             style={{ background:'var(--bg-base)', borderBottom:'1px solid var(--border)' }}>
                          <div>
                            <p className="text-lg font-bold" style={{ color:'var(--text-1)' }}>{sd.stats.total}</p>
                            <p className="text-[9px] uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Enviados</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold" style={{ color:'#22C55E' }}>{sd.stats.opened}</p>
                            <p className="text-[9px] uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Abrieron</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold" style={{ color:'var(--blue)' }}>{sd.stats.openRate}%</p>
                            <p className="text-[9px] uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Open rate</p>
                          </div>
                        </div>

                        {/* Records list */}
                        <div className="divide-y" style={{ borderColor:'var(--border)' }}>
                          {sd.records.map((r, i) => {
                            const opened = r.openCount > 0
                            return (
                              <div key={`${r.email}-${i}`} className="px-5 py-2.5 flex items-center gap-3">
                                <div className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-semibold"
                                     style={{ background:'var(--bg-elevated)', color:'var(--text-1)' }}>
                                  {(r.name || r.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate" style={{ color:'var(--text-1)' }}>
                                    {r.name || r.email.split('@')[0]}
                                  </p>
                                  <p className="text-[10px] truncate" style={{ color:'var(--text-3)' }}>{r.email}</p>
                                </div>
                                <div className="text-[10px] text-right" style={{ color:'var(--text-3)' }}>
                                  Enviado {fmtRel(r.sentAt)}
                                  {opened && (
                                    <p style={{ color:'#22C55E' }}>
                                      ✓ Abierto {fmtRel(r.openedAt!)} {r.openCount > 1 ? `(${r.openCount}x)` : ''}
                                    </p>
                                  )}
                                  {!opened && (
                                    <p style={{ color:'var(--text-3)' }}>Sin abrir</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 p-4 rounded-lg text-xs"
           style={{ background:'var(--bg-surface)', border:'1px dashed var(--border)', color:'var(--text-2)' }}>
        💡 <strong>Botón "Lanzar nuevos hoy"</strong>: ejecuta el cron de bienvenida para los registros de las últimas 24h. Para automatización continua, configura cron horario en <code>vercel.json</code>.
      </div>
    </div>
  )
}
