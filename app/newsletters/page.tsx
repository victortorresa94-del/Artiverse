'use client'
import { useEffect, useState } from 'react'
import {
  RefreshCw, Mail, CheckCircle2, Clock, FileText, Loader2, Send, Eye, Play,
  Sparkles, Gift, Award, BarChart3, Megaphone,
} from 'lucide-react'

interface Newsletter {
  id:           string
  name:         string
  description:  string
  status:       'active' | 'ready' | 'draft'
  audience:     string
  template:     string
  triggerType:  'auto' | 'manual' | 'scheduled'
  triggerDesc:  string
  recipients?:  number
}

interface ApiResp {
  newsletters: Newsletter[]
  counts:      { total: number; active: number; ready: number; draft: number }
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

export default function NewslettersPage() {
  const [data, setData]       = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [feedback, setFeedback]   = useState<{ id: string; type: 'ok'|'err'; msg: string } | null>(null)

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

  async function sendTest(id: string) {
    if (id !== 'bienvenida') {
      setFeedback({ id, type: 'err', msg: 'Solo "Bienvenida" tiene template implementado' })
      return
    }
    const to = prompt('Email de destino para la prueba:', 'victor@aetherlabs.es')
    if (!to) return
    setTestingId(id); setFeedback(null)
    try {
      const r = await fetch('/api/welcome/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, firstName: to.split('@')[0], test: true }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
      setFeedback({ id, type: 'ok', msg: `Enviado a ${to}` })
    } catch (e: any) {
      setFeedback({ id, type: 'err', msg: e.message })
    } finally {
      setTestingId(null)
    }
  }

  function preview(id: string) {
    if (id !== 'bienvenida') return alert('Sin template todavía')
    window.open(`/api/welcome/preview?firstName=Victor`, '_blank')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Newsletters</h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
            {data ? `${data.counts.total} campañas · ${data.counts.active} activa${data.counts.active === 1 ? '' : 's'} · ${data.counts.ready} lista${data.counts.ready === 1 ? '' : 's'} · ${data.counts.draft} borrador${data.counts.draft === 1 ? '' : 'es'}` : 'Cargando…'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: '#EF444415', color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      {/* Newsletter cards */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.newsletters.map(n => {
            const meta = STATUS_META[n.status]
            const Icon = ICONS_BY_ID[n.id] || Mail
            const StatusIcon = meta.icon
            const fb = feedback?.id === n.id ? feedback : null

            return (
              <div
                key={n.id}
                className="rounded-lg p-5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                {/* Header card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: meta.color + '20' }}
                    >
                      <Icon size={18} style={{ color: meta.color }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-1)' }}>
                        {n.name}
                      </h3>
                      <span
                        className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
                        style={{ background: meta.color + '25', color: meta.color }}
                      >
                        <StatusIcon size={9} /> {meta.label}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {n.description}
                </p>

                {/* Meta */}
                <div className="space-y-1.5 mb-4 text-[11px]" style={{ color: 'var(--text-3)' }}>
                  <div><span style={{ color: 'var(--text-3)' }}>Audiencia: </span><span style={{ color: 'var(--text-1)' }}>{n.audience}</span>{n.recipients !== undefined && <span> ({n.recipients})</span>}</div>
                  <div><span style={{ color: 'var(--text-3)' }}>Template: </span><span style={{ color: 'var(--text-2)' }}>{n.template}</span></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Trigger: </span><span style={{ color: 'var(--text-2)' }}>{n.triggerDesc}</span></div>
                </div>

                {/* Feedback */}
                {fb && (
                  <div
                    className="px-2 py-1.5 rounded text-[11px] mb-2"
                    style={{
                      background: fb.type === 'ok' ? '#22C55E20' : '#EF444420',
                      color:      fb.type === 'ok' ? '#22C55E' : '#FCA5A5',
                    }}
                  >
                    {fb.msg}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => preview(n.id)}
                    disabled={n.id !== 'bienvenida'}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
                  >
                    <Eye size={11} /> Preview
                  </button>
                  <button
                    onClick={() => sendTest(n.id)}
                    disabled={n.id !== 'bienvenida' || testingId === n.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
                  >
                    {testingId === n.id
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Send size={11} />}
                    Test
                  </button>
                  {n.status === 'ready' && (
                    <button
                      disabled
                      title="Activación pendiente — falta cron hourly"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold disabled:opacity-40 ml-auto"
                      style={{ background: 'var(--blue)', color: '#fff' }}
                    >
                      <Play size={11} /> Activar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Help */}
      <div
        className="mt-6 p-4 rounded-lg text-xs"
        style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)', color: 'var(--text-2)' }}
      >
        💡 <strong>Cómo activar la bienvenida automática:</strong> en <code>vercel.json</code> añade un cron <code>{`{ "path": "/api/automation/welcome?token=AETHER2026", "schedule": "0 * * * *" }`}</code> (cada hora). Luego sube <code>WELCOME_WINDOW_MIN=70</code> en Vercel envs.
      </div>
    </div>
  )
}
