'use client'
import { useState, useEffect } from 'react'
import {
  Mail, Send, Users, List, BarChart2, Plus, Upload,
  Clock, Star, Copy, Trash2, Eye, Edit2, Filter,
  ChevronRight, CheckCircle, Calendar, Zap, Layers,
  FileText, Tag, Globe, Building2, MailOpen, MessageSquare,
  TrendingUp, AlertCircle, ArrowRight, Inbox, X, Key,
} from 'lucide-react'
import KpiCard from '@/components/ui/KpiCard'
import PillBadge from '@/components/ui/PillBadge'

// ── HubSpot Service Key Modal ──────────────────────────────────────────────────

function HubSpotModal({ open, onClose, onConnected }: {
  open: boolean
  onClose: () => void
  onConnected: () => void
}) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<'ok' | 'error' | null>(null)
  const [errMsg, setErrMsg] = useState('')

  async function handleTest() {
    setTesting(true)
    setResult(null)
    try {
      const res = await fetch('/api/hubspot')
      const data = await res.json()
      if (data.connected) {
        setResult('ok')
        setTimeout(() => { onConnected(); onClose() }, 1000)
      } else {
        setResult('error')
        setErrMsg(data.error || 'Token inválido')
      }
    } catch {
      setResult('error')
      setErrMsg('Error de conexión')
    }
    setTesting(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Key size={15} style={{ color: '#FB923C' }} />
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>Conectar HubSpot</h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-2)' }}><X size={15} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Instrucciones Clave de servicio */}
          <div className="rounded-xl p-4 space-y-2.5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold" style={{ color: '#FB923C' }}>
              Cómo obtener tu Clave de servicio:
            </p>
            {[
              ['1', '⚙️ Configuración (engranaje arriba derecha)'],
              ['2', '🔗 Integraciones → Aplicaciones privadas'],
              ['3', '✅ En el aviso, clic en "Usar las claves de servicio"'],
              ['4', '📝 Ponle un nombre (ej: "Control Center")'],
              ['5', '🔑 Copia la clave generada'],
            ].map(([n, step]) => (
              <div key={n} className="flex items-start gap-2">
                <span className="text-[10px] font-bold w-4 shrink-0 mt-0.5"
                  style={{ color: '#FB923C' }}>{n}</span>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{step}</p>
              </div>
            ))}
          </div>

          {/* Info: dónde pegar */}
          <div className="rounded-xl p-3 flex items-start gap-2"
            style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
            <AlertCircle size={13} style={{ color: 'var(--blue)' }} className="mt-0.5 shrink-0" />
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>
              Pega la clave en <code className="px-1 py-0.5 rounded text-[10px]"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)' }}>.env.local</code>{' '}
              como <code className="px-1 py-0.5 rounded text-[10px]"
                style={{ background: 'var(--bg-elevated)', color: '#CCFF00' }}>HUBSPOT_API_KEY=tu_clave</code>{' '}
              y reinicia el servidor. Luego pulsa "Probar conexión".
            </p>
          </div>

          {/* Test */}
          <button
            onClick={handleTest}
            disabled={testing}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: result === 'ok' ? 'rgba(34,197,94,0.15)' : result === 'error' ? 'rgba(239,68,68,0.1)' : 'var(--blue)',
              color: result === 'ok' ? '#22C55E' : result === 'error' ? '#EF4444' : '#fff',
            }}>
            {testing ? 'Probando...'
              : result === 'ok' ? '✓ Conectado correctamente'
              : result === 'error' ? `✗ ${errMsg}`
              : 'Probar conexión'}
          </button>

          <p className="text-[10px] text-center" style={{ color: 'var(--text-3)' }}>
            La clave no se comparte y sólo se usa desde tu servidor.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── HubSpot Status Banner ─────────────────────────────────────────────────────

function HubSpotBanner({ onConfigure }: { onConfigure: () => void }) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [portal, setPortal] = useState('')

  useEffect(() => {
    fetch('/api/hubspot')
      .then(r => r.json())
      .then(d => {
        setStatus(d.connected ? 'connected' : 'disconnected')
        if (d.portal) setPortal(d.portal)
      })
      .catch(() => setStatus('disconnected'))
  }, [])

  if (status === 'loading') return null

  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl mb-5"
        style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.18)' }}>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#22C55E' }} />
        <Building2 size={13} style={{ color: '#FB923C' }} />
        <span className="text-xs font-semibold" style={{ color: '#FB923C' }}>HubSpot conectado</span>
        {portal && <span className="text-xs" style={{ color: 'var(--text-3)' }}>· portal {portal}</span>}
        <button onClick={onConfigure} className="ml-auto text-[11px] px-2 py-0.5 rounded-lg"
          style={{ background: 'rgba(249,115,22,0.15)', color: '#FB923C' }}>
          Gestionar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl mb-5"
      style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
      <AlertCircle size={13} style={{ color: '#F59E0B' }} className="shrink-0" />
      <div className="flex-1">
        <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>HubSpot no conectado </span>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>— los envíos funcionan en modo demo</span>
      </div>
      <button onClick={onConfigure}
        className="text-xs px-3 py-1 rounded-lg font-semibold shrink-0"
        style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
        Conectar →
      </button>
    </div>
  )
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const mockLists = [
  { id: '1', name: 'Usuarios Pro Artiverse',       count: 47,  source: 'artiverse', updated: '2026-04-28', tags: ['pro', 'plataforma'],  openRate: 68 },
  { id: '2', name: 'Leads Instantly sin registrar', count: 312, source: 'instantly', updated: '2026-04-29', tags: ['outbound'],           openRate: 32 },
  { id: '3', name: 'Agencias Madrid',               count: 89,  source: 'csv',       updated: '2026-04-20', tags: ['agencias'],           openRate: 45 },
  { id: '4', name: 'Clientes B Services',           count: 104, source: 'hubspot',   updated: '2026-04-30', tags: ['b-services'],         openRate: 59 },
  { id: '5', name: 'De campañas → Plataforma',      count: 23,  source: 'smart',     updated: '2026-04-30', tags: ['smart'],              openRate: 74 },
  { id: '6', name: 'Pro sin actividad 30d',         count: 18,  source: 'smart',     updated: '2026-04-30', tags: ['smart', 'reenganche'], openRate: 41 },
]

const mockHistory = [
  { id: '1', name: 'Bienvenida Artiverse',      list: 'Leads Instantly',    sent: 312, opened: 94,  clicked: 31, replied: 8,  date: '2026-04-28', status: 'sent',      from: 'Artiverse'  },
  { id: '2', name: 'Comunicado B Services Q2',  list: 'Clientes B Services', sent: 104, opened: 61,  clicked: 18, replied: 3,  date: '2026-04-30', status: 'sent',      from: 'B Services' },
  { id: '3', name: 'Oferta Pro Agencia Mayo',   list: 'Agencias Madrid',    sent: 0,   opened: 0,   clicked: 0,  replied: 0,  date: '2026-05-02', status: 'scheduled', from: 'Artiverse'  },
  { id: '4', name: 'Follow-up Instantly W17',   list: 'Leads Instantly',    sent: 280, opened: 71,  clicked: 22, replied: 5,  date: '2026-04-21', status: 'sent',      from: 'Artiverse'  },
  { id: '5', name: 'Reactivación Pro free',     list: 'Pro sin actividad',  sent: 0,   opened: 0,   clicked: 0,  replied: 0,  date: '—',          status: 'draft',     from: 'Artiverse'  },
]

const mockTemplates = [
  { id: '1', name: 'Bienvenida Artiverse',   subject: 'Bienvenido/a {{firstName}} 🎶',       lastUsed: '2026-04-28', uses: 1, tags: ['onboarding']  },
  { id: '2', name: 'Follow-up Instantly',    subject: 'Hola {{firstName}}, ¿pudiste ver...', lastUsed: '2026-04-15', uses: 3, tags: ['followup']    },
  { id: '3', name: 'Newsletter mensual',     subject: 'Novedades de Artiverse — {{month}}',  lastUsed: '2026-03-30', uses: 2, tags: ['newsletter']   },
  { id: '4', name: 'Oferta Pro',             subject: '{{firstName}}, tenemos algo para ti', lastUsed: '—',          uses: 0, tags: ['conversion']  },
]

const SENDERS = [
  { id: 'artiverse',  label: 'Víctor · Artiverse',  email: 'victor@artiverse.app'  },
  { id: 'bservices',  label: 'Víctor · B Services',  email: 'victor@bservices.es'   },
  { id: 'aether',     label: 'Víctor · Aether Labs', email: 'victor@aetherlabs.es'  },
]

const MERGE_TAGS = ['{{firstName}}', '{{lastName}}', '{{company}}', '{{city}}', '{{unsubscribe_url}}']

const sourceConfig: Record<string, { label: string; color: string }> = {
  artiverse: { label: 'Artiverse', color: 'var(--lime)'    },
  instantly:  { label: 'Instantly', color: 'var(--blue)'   },
  csv:        { label: 'CSV',       color: '#A78BFA'        },
  hubspot:    { label: 'HubSpot',   color: '#F59E0B'        },
  smart:      { label: 'Smart',     color: 'var(--success)' },
}

const statusConfig: Record<string, { label: string; variant: string }> = {
  sent:      { label: 'Enviado',    variant: 'green'  },
  scheduled: { label: 'Programado', variant: 'amber'  },
  draft:     { label: 'Borrador',   variant: 'gray'   },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(a: number, b: number) { return b > 0 ? `${Math.round((a / b) * 100)}%` : '—' }

function SourceBadge({ source }: { source: string }) {
  const cfg = sourceConfig[source] ?? { label: source, color: 'var(--text-3)' }
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: `${cfg.color}18`, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ── Tab: Resumen ───────────────────────────────────────────────────────────────

function TabResumen() {
  const totalContacts = mockLists.reduce((s, l) => s + l.count, 0)
  const totalSent     = mockHistory.filter(h => h.status === 'sent').reduce((s, h) => s + h.sent, 0)
  const totalOpened   = mockHistory.filter(h => h.status === 'sent').reduce((s, h) => s + h.opened, 0)
  const avgOpen       = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Listas"         value={mockLists.length}             sub="activas"              icon={List}          accentColor="var(--blue)"    />
        <KpiCard label="Contactos"      value={totalContacts.toLocaleString()} sub="en todas las listas" icon={Users}         accentColor="#A78BFA"        />
        <KpiCard label="Enviados"       value={totalSent.toLocaleString()}    sub="este mes"             icon={Send}          accentColor="var(--text-2)"  />
        <KpiCard label="Open rate"      value={`${avgOpen}%`}                sub="media campañas"       icon={MailOpen}      accentColor="#F59E0B"        trend={+4} />
        <KpiCard label="Respuestas"     value={mockHistory.reduce((s,h) => s + h.replied, 0)} sub="total recibidas" icon={MessageSquare} accentColor="var(--success)"  />
        <KpiCard label="Programados"    value={mockHistory.filter(h=>h.status==='scheduled').length} sub="pendientes de enviar" icon={Calendar} accentColor="var(--lime)" />
      </div>

      {/* Segmentos inteligentes */}
      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} style={{ color: 'var(--lime)' }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
            Segmentos inteligentes
          </h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'rgba(163,230,53,0.12)', color: 'var(--lime)' }}>Auto</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Leads sin registrar',      desc: 'En Instantly pero no en plataforma', count: 289, color: 'var(--blue)',    icon: ArrowRight },
            { label: 'Pro sin actividad 30d',     desc: 'Usuarios pro inactivos — reenganche', count: 18,  color: '#F59E0B',       icon: AlertCircle },
            { label: 'De campañas → Plataforma',  desc: 'Outbound convertido a usuario',       count: 23,  color: 'var(--success)', icon: CheckCircle },
            { label: 'Agencias sin completar',    desc: 'Perfil < 60% de completitud',          count: 34,  color: '#A78BFA',       icon: Building2 },
            { label: 'Clientes B Services',       desc: 'Cartera activa empresa',               count: 104, color: '#F59E0B',       icon: Globe },
            { label: 'Nuevos esta semana',        desc: 'Registrados últimos 7 días',           count: 12,  color: 'var(--lime)',   icon: Zap },
          ].map(seg => (
            <div key={seg.label} className="rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition-all"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = seg.color}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${seg.color}15` }}>
                <seg.icon size={14} style={{ color: seg.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>{seg.label}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>{seg.desc}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold font-mono" style={{ color: seg.color }}>{seg.count}</p>
                <button className="text-[9px] font-medium" style={{ color: 'var(--blue)' }}>Enviar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
            Actividad reciente
          </h2>
          <button className="text-xs font-medium" style={{ color: 'var(--blue)' }}>Ver todo</button>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {mockHistory.slice(0, 4).map(h => (
            <div key={h.id} className="px-5 py-3.5 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: h.status === 'sent' ? 'rgba(34,197,94,0.1)' : h.status === 'scheduled' ? 'rgba(245,158,11,0.1)' : 'var(--bg-elevated)' }}>
                {h.status === 'sent'
                  ? <Send size={13} style={{ color: 'var(--success)' }} />
                  : h.status === 'scheduled'
                  ? <Calendar size={13} style={{ color: '#F59E0B' }} />
                  : <FileText size={13} style={{ color: 'var(--text-3)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{h.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {h.list} · {h.from} · {h.date}
                </p>
              </div>
              {h.status === 'sent' && (
                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    <p className="text-xs font-bold font-mono" style={{ color: 'var(--text-1)' }}>{pct(h.opened, h.sent)}</p>
                    <p className="text-[9px]" style={{ color: 'var(--text-3)' }}>apertura</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold font-mono" style={{ color: 'var(--text-1)' }}>{pct(h.replied, h.sent)}</p>
                    <p className="text-[9px]" style={{ color: 'var(--text-3)' }}>respuesta</p>
                  </div>
                </div>
              )}
              <PillBadge label={statusConfig[h.status].label} variant={statusConfig[h.status].variant as any} size="xs" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Nuevo envío (compositor) ─────────────────────────────────────────────

function TabNuevoEnvio() {
  const [step, setStep]         = useState<1 | 2 | 3>(1)
  const [sender, setSender]     = useState(SENDERS[0].id)
  const [listId, setListId]     = useState('')
  const [subject, setSubject]   = useState('')
  const [preheader, setPreheader] = useState('')
  const [body, setBody]         = useState('')
  const [bodyMode, setBodyMode] = useState<'visual' | 'html'>('visual')
  const [scheduled, setScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')

  const selectedList = mockLists.find(l => l.id === listId)
  const selectedSender = SENDERS.find(s => s.id === sender)

  function insertMergeTag(tag: string) {
    setBody(prev => prev + tag)
  }

  const STEPS = [
    { n: 1, label: 'Audiencia'  },
    { n: 2, label: 'Contenido'  },
    { n: 3, label: 'Revisar'    },
  ]

  return (
    <div className="max-w-3xl">
      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <button
              onClick={() => setStep(s.n as 1|2|3)}
              className="flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: step === s.n ? '#CCFF00' : step > s.n ? 'var(--success)' : 'var(--bg-elevated)',
                  color:      step === s.n ? '#0A0A0A'  : step > s.n ? '#fff'           : 'var(--text-3)',
                  border:     step < s.n ? '1px solid var(--border)' : 'none',
                }}>
                {step > s.n ? <CheckCircle size={14} /> : s.n}
              </div>
              <span className="text-xs font-medium hidden sm:block"
                style={{ color: step === s.n ? 'var(--text-1)' : 'var(--text-3)' }}>
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className="w-12 h-px mx-3" style={{ background: step > s.n ? 'var(--success)' : 'var(--border)' }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Audiencia ── */}
      {step === 1 && (
        <div className="surface-card p-6 space-y-5">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>¿A quién envías?</h2>

          {/* Remitente */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-2)' }}>Remitente</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SENDERS.map(s => (
                <button key={s.id} onClick={() => setSender(s.id)}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    border:     `1px solid ${sender === s.id ? '#CCFF00' : 'var(--border)'}`,
                    background: sender === s.id ? 'rgba(204,255,0,0.06)' : 'var(--bg-elevated)',
                  }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{s.label}</p>
                  <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{s.email}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Lista destino */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-2)' }}>Lista de destino</label>
            <div className="space-y-2">
              {mockLists.map(l => (
                <button key={l.id} onClick={() => setListId(l.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    border:     `1px solid ${listId === l.id ? '#CCFF00' : 'var(--border)'}`,
                    background: listId === l.id ? 'rgba(204,255,0,0.06)' : 'var(--bg-elevated)',
                  }}>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: listId === l.id ? '#CCFF00' : 'var(--border)' }}>
                    {listId === l.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#CCFF00' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>{l.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{l.count} contactos · open rate {l.openRate}%</p>
                  </div>
                  <SourceBadge source={l.source} />
                </button>
              ))}
            </div>
          </div>

          {selectedList && (
            <div className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: 'rgba(163,230,53,0.08)', border: '1px solid rgba(163,230,53,0.2)' }}>
              <CheckCircle size={14} style={{ color: 'var(--lime)' }} />
              <p className="text-xs" style={{ color: 'var(--text-1)' }}>
                Enviarás a <strong>{selectedList.count} contactos</strong> de "{selectedList.name}"
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} disabled={!listId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: listId ? '#CCFF00' : 'var(--bg-elevated)', color: listId ? '#0A0A0A' : 'var(--text-3)' }}>
              Siguiente — Contenido <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Contenido ── */}
      {step === 2 && (
        <div className="surface-card p-6 space-y-5">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Escribe el email</h2>

          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Asunto *</label>
              <span className="text-[10px]" style={{ color: subject.length > 70 ? 'var(--error)' : 'var(--text-3)' }}>
                {subject.length}/70
              </span>
            </div>
            <input
              value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Hola {{firstName}}, tenemos algo para ti 🎶"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
            />
          </div>

          {/* Preheader */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-2)' }}>
              Preheader <span style={{ color: 'var(--text-3)' }}>(texto preview en bandeja)</span>
            </label>
            <input
              value={preheader} onChange={e => setPreheader(e.target.value)}
              placeholder="El arte se gestiona aquí ahora."
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
            />
          </div>

          {/* Merge tags */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-2)' }}>
              Variables de personalización
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_TAGS.map(tag => (
                <button key={tag} onClick={() => insertMergeTag(tag)}
                  className="text-[11px] px-2 py-1 rounded font-mono font-medium transition-all"
                  style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--blue)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Cuerpo del email</label>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {(['visual', 'html'] as const).map(m => (
                  <button key={m} onClick={() => setBodyMode(m)}
                    className="px-2.5 py-1 text-[11px] font-medium transition-all"
                    style={{
                      background: bodyMode === m ? 'var(--bg-active)' : 'var(--bg-elevated)',
                      color:      bodyMode === m ? 'var(--text-1)'    : 'var(--text-3)',
                    }}>
                    {m === 'visual' ? 'Visual' : 'HTML'}
                  </button>
                ))}
              </div>
            </div>
            {bodyMode === 'visual' ? (
              <textarea
                value={body} onChange={e => setBody(e.target.value)}
                placeholder="Escribe aquí el contenido del email. Usa las variables de arriba para personalizar.

Ejemplo:
Hola {{firstName}},

Gracias por unirte a Artiverse..."
                rows={10}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y transition-all font-sans"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', lineHeight: '1.6' }}
              />
            ) : (
              <textarea
                value={body} onChange={e => setBody(e.target.value)}
                placeholder="<p>Hola <strong>{{firstName}}</strong>,</p>..."
                rows={12}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y transition-all font-mono"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', lineHeight: '1.6' }}
              />
            )}
          </div>

          {/* Image upload */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-2)' }}>Adjuntar imagen</label>
            <div className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-6 cursor-pointer transition-all"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
              <Upload size={20} style={{ color: 'var(--text-3)' }} />
              <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>Arrastra una imagen o haz clic</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>PNG, JPG, GIF · Max 5MB</p>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              ← Atrás
            </button>
            <button onClick={() => setStep(3)} disabled={!subject || !body}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: subject && body ? '#CCFF00' : 'var(--bg-elevated)', color: subject && body ? '#0A0A0A' : 'var(--text-3)' }}>
              Revisar envío <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Revisar ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="surface-card p-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Resumen del envío</h2>
            <div className="space-y-3">
              {[
                { label: 'De',        value: `${selectedSender?.label} <${selectedSender?.email}>` },
                { label: 'Para',      value: selectedList ? `${selectedList.name} (${selectedList.count} contactos)` : '—' },
                { label: 'Asunto',    value: subject || '—' },
                { label: 'Preheader', value: preheader || '(vacío)' },
              ].map(row => (
                <div key={row.label} className="flex gap-4">
                  <span className="text-xs font-semibold w-20 shrink-0" style={{ color: 'var(--text-3)' }}>{row.label}</span>
                  <span className="text-xs" style={{ color: 'var(--text-1)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview del body */}
          {body && (
            <div className="surface-card overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <Eye size={12} style={{ color: 'var(--text-3)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Preview del contenido</span>
              </div>
              <div className="p-5">
                {bodyMode === 'html'
                  ? <div className="text-sm" style={{ color: 'var(--text-1)', lineHeight: '1.7' }} dangerouslySetInnerHTML={{ __html: body }} />
                  : <pre className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-1)', lineHeight: '1.7', fontFamily: 'inherit' }}>{body}</pre>
                }
              </div>
            </div>
          )}

          {/* Programar */}
          <div className="surface-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setScheduled(false)}
                className="flex items-center gap-2 flex-1 p-3 rounded-xl transition-all"
                style={{ border: `1px solid ${!scheduled ? '#CCFF00' : 'var(--border)'}`, background: !scheduled ? 'rgba(204,255,0,0.06)' : 'var(--bg-elevated)' }}>
                <Send size={13} style={{ color: !scheduled ? '#CCFF00' : 'var(--text-3)' }} />
                <div className="text-left">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>Enviar ahora</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Sale inmediatamente</p>
                </div>
              </button>
              <button onClick={() => setScheduled(true)}
                className="flex items-center gap-2 flex-1 p-3 rounded-xl transition-all"
                style={{ border: `1px solid ${scheduled ? '#CCFF00' : 'var(--border)'}`, background: scheduled ? 'rgba(204,255,0,0.06)' : 'var(--bg-elevated)' }}>
                <Calendar size={13} style={{ color: scheduled ? '#CCFF00' : 'var(--text-3)' }} />
                <div className="text-left">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>Programar</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Elige fecha y hora</p>
                </div>
              </button>
            </div>
            {scheduled && (
              <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }} />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setStep(2)}
              className="flex-1 py-3 rounded-xl text-sm font-medium"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              ← Editar
            </button>
            <button
              className="flex-1 py-3 rounded-xl text-sm font-medium"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              Guardar borrador
            </button>
            <button
              className="flex-2 flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: '#CCFF00', color: '#0A0A0A', minWidth: '180px' }}>
              <Send size={14} />
              {scheduled && scheduleDate ? 'Programar envío' : 'Enviar ahora'}
            </button>
          </div>

          <p className="text-[11px] text-center" style={{ color: 'var(--text-3)' }}>
            Conecta el token de HubSpot para activar el envío real
          </p>
        </div>
      )}
    </div>
  )
}

// ── Tab: Plantillas ────────────────────────────────────────────────────────────

function TabPlantillas({ onUse }: { onUse: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          <span className="font-bold" style={{ color: 'var(--text-1)' }}>{mockTemplates.length}</span> plantillas guardadas
        </p>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: '#CCFF00', color: '#0A0A0A' }}>
          <Plus size={12} /> Nueva plantilla
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mockTemplates.map(t => (
          <div key={t.id} className="surface-card p-4">
            {/* Preview strip */}
            <div className="rounded-lg mb-3 flex items-center justify-center text-3xl"
              style={{ background: 'var(--bg-elevated)', height: '80px', border: '1px solid var(--border)' }}>
              ✉️
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{t.name}</p>
            <p className="text-xs mt-0.5 truncate font-mono" style={{ color: 'var(--text-3)' }}>{t.subject}</p>
            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-3)' }}>
                <span>{t.uses}× usado</span>
                {t.lastUsed !== '—' && <span>Último: {t.lastUsed}</span>}
              </div>
              <div className="flex gap-1.5">
                <button onClick={onUse} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: '#CCFF00', color: '#0A0A0A' }}>
                  Usar
                </button>
                <button className="px-2 py-1.5 rounded-lg text-xs"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                  <Copy size={12} />
                </button>
                <button className="px-2 py-1.5 rounded-lg text-xs"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab: Historial ─────────────────────────────────────────────────────────────

function TabHistorial() {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
          Historial de envíos
        </h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            <Filter size={11} /> Filtrar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              {['Nombre', 'Lista', 'Remitente', 'Enviados', 'Apertura', 'Clics', 'Respuestas', 'Fecha', 'Estado'].map(col => (
                <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-3)' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockHistory.map((h, i) => (
              <tr key={h.id}
                className="transition-colors cursor-pointer"
                style={{ borderBottom: i < mockHistory.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-1)' }}>{h.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{h.list}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{h.from}</td>
                <td className="px-4 py-3 font-mono text-xs font-medium" style={{ color: 'var(--text-1)' }}>
                  {h.sent > 0 ? h.sent.toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold"
                  style={{ color: h.sent > 0 ? (h.opened/h.sent > 0.5 ? 'var(--success)' : h.opened/h.sent > 0.3 ? '#F59E0B' : 'var(--text-2)') : 'var(--text-3)' }}>
                  {h.sent > 0 ? pct(h.opened, h.sent) : '—'}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>
                  {h.sent > 0 ? pct(h.clicked, h.sent) : '—'}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>
                  {h.replied > 0 ? `${h.replied} (${pct(h.replied, h.sent)})` : '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{h.date}</td>
                <td className="px-4 py-3">
                  <PillBadge label={statusConfig[h.status].label} variant={statusConfig[h.status].variant as any} size="xs" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab: Listas ────────────────────────────────────────────────────────────────

function TabListas({ onSendToList }: { onSendToList: () => void }) {
  const total = mockLists.reduce((s, l) => s + l.count, 0)
  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          <span className="font-bold" style={{ color: 'var(--text-1)' }}>{mockLists.length}</span> listas ·{' '}
          <span className="font-bold" style={{ color: 'var(--text-1)' }}>{total.toLocaleString()}</span> contactos totales
        </p>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            <Upload size={12} /> Importar CSV
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: '#CCFF00', color: '#0A0A0A' }}>
            <Plus size={12} /> Nueva lista
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mockLists.map(list => {
          const src = sourceConfig[list.source]
          return (
            <div key={list.id} className="surface-card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{list.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>Actualizada {list.updated}</p>
                </div>
                <SourceBadge source={list.source} />
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-lg font-bold font-mono leading-none" style={{ color: 'var(--text-1)' }}>
                    {list.count.toLocaleString()}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>contactos</p>
                </div>
                <div>
                  <p className="text-lg font-bold font-mono leading-none" style={{ color: list.openRate > 50 ? 'var(--success)' : list.openRate > 35 ? '#F59E0B' : 'var(--text-2)' }}>
                    {list.openRate}%
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>open rate</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {list.tags.map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                    {t}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={onSendToList}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: '#CCFF00', color: '#0A0A0A' }}>
                  <Send size={11} /> Enviar email
                </button>
                <button className="px-2.5 py-1.5 rounded-lg transition-all"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                  <Eye size={12} />
                </button>
                <button className="px-2.5 py-1.5 rounded-lg transition-all"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                  <Edit2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MarketingPage() {
  const [tab, setTab] = useState<'resumen' | 'nuevo' | 'listas' | 'historial' | 'plantillas'>('resumen')
  const [hsModal, setHsModal] = useState(false)

  const TABS = [
    { id: 'resumen',    label: 'Resumen',    icon: BarChart2  },
    { id: 'nuevo',      label: 'Nuevo envío', icon: Send      },
    { id: 'listas',     label: 'Listas',     icon: List       },
    { id: 'historial',  label: 'Historial',  icon: Clock      },
    { id: 'plantillas', label: 'Plantillas', icon: FileText   },
  ] as const

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">

      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Marketing</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            Gestión unificada de listas, emails y campañas
          </p>
        </div>
        <button
          onClick={() => setTab('nuevo')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: '#CCFF00', color: '#0A0A0A' }}
        >
          <Plus size={14} />
          Nuevo envío
        </button>
      </div>

      {/* HubSpot status banner */}
      <HubSpotBanner onConfigure={() => setHsModal(true)} />

      {/* HubSpot modal */}
      <HubSpotModal
        open={hsModal}
        onClose={() => setHsModal(false)}
        onConnected={() => window.location.reload()}
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: tab === t.id ? 'var(--bg-surface)' : 'transparent',
              color:      tab === t.id ? 'var(--text-1)'     : 'var(--text-3)',
              boxShadow:  tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'resumen'    && <TabResumen />}
      {tab === 'nuevo'      && <TabNuevoEnvio />}
      {tab === 'listas'     && <TabListas onSendToList={() => setTab('nuevo')} />}
      {tab === 'historial'  && <TabHistorial />}
      {tab === 'plantillas' && <TabPlantillas onUse={() => setTab('nuevo')} />}

    </div>
  )
}
