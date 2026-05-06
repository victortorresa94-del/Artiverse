'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  RefreshCw, Send, Inbox, Search, ChevronRight, ChevronDown, X, Mail,
  Building2, Loader2, Zap, Hash,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SentEmail {
  id:           string
  source:       'instantly' | 'hubspot'
  timestamp:    string
  to_email:     string
  to_name:      string
  company:      string
  subject:      string
  preview:      string
  body_text:    string
  body_html:    string
  campaign_id?: string
  campaign_name?: string
  step?:        number
  step_label?:  string
}

interface ApiResponse {
  instantly: SentEmail[]
  hubspot:   SentEmail[]
  counts:    { instantly: number; hubspot: number; total: number }
  since:     string
}

type Tab = 'instantly' | 'hubspot'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRel(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)    return 'ahora'
  if (m < 60)   return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)   return `hace ${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `hace ${days}d`
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function fmtAbs(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-ES', {
    day:   '2-digit',
    month: 'short',
    hour:  '2-digit',
    minute:'2-digit',
  })
}

function stepColor(step?: number): string {
  if (step === 1) return '#60A5FA'  // blue
  if (step === 2) return '#A78BFA'  // purple
  if (step === 3) return '#F472B6'  // pink
  return '#94A3B8'
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({ email, onClose }: { email: SentEmail; onClose: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[560px] flex flex-col"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-strong)' }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start justify-between gap-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold"
                style={{
                  background: email.source === 'instantly' ? '#F59E0B30' : '#22C55E30',
                  color:      email.source === 'instantly' ? '#F59E0B'   : '#22C55E',
                }}
              >
                {email.source === 'instantly' ? 'Instantly' : 'HubSpot'}
              </span>
              {email.step && (
                <span
                  className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold"
                  style={{ background: stepColor(email.step) + '30', color: stepColor(email.step) }}
                >
                  {email.step_label}
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold truncate" style={{ color: 'var(--text-1)' }}>
              {email.subject}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
              Para: {email.to_name ? `${email.to_name} · ` : ''}{email.to_email}
            </p>
            {email.campaign_name && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                Campaña: {email.campaign_name}
              </p>
            )}
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
              {fmtAbs(email.timestamp)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors shrink-0"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div
            className="prose prose-sm max-w-none p-4 rounded-lg"
            style={{
              background: 'var(--bg-base)',
              border:     '1px solid var(--border)',
              color:      'var(--text-1)',
            }}
            dangerouslySetInnerHTML={{ __html: email.body_html }}
          />
        </div>
      </aside>
    </>
  )
}

// ─── Email row ────────────────────────────────────────────────────────────────

function EmailRow({ email, onClick }: { email: SentEmail; onClick: () => void }) {
  const initial = (email.to_name || email.to_email).charAt(0).toUpperCase()
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 transition-all"
      style={{
        background:   'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-md flex items-center justify-center text-sm font-semibold"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)' }}
      >
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
            {email.to_name || email.to_email.split('@')[0]}
          </span>
          {email.company && (
            <span className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
              · {email.company}
            </span>
          )}
        </div>
        <p className="text-[13px] truncate" style={{ color: 'var(--text-1)' }}>
          {email.subject}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-2)' }}>
          {email.preview}
        </p>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        {email.step && (
          <span
            className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold"
            style={{ background: stepColor(email.step) + '25', color: stepColor(email.step) }}
          >
            {email.step_label}
          </span>
        )}
        <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
          {fmtRel(email.timestamp)}
        </span>
      </div>

      <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
    </button>
  )
}

// ─── Section (Instantly grouped by campaign) ──────────────────────────────────

function InstantlyGrouped({ emails, onSelect }: { emails: SentEmail[]; onSelect: (e: SentEmail) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, SentEmail[]>()
    emails.forEach(e => {
      const key = e.campaign_name || 'Sin campaña'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    })
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [emails])

  // Por defecto todos cerrados
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => setOpenGroups(s => ({ ...s, [k]: !s[k] }))

  if (emails.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>
        <Send size={28} style={{ margin: '0 auto', opacity: 0.4 }} />
        <p className="text-sm mt-3">Sin envíos de Instantly en el periodo</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map(([campaignName, list]) => {
        const stepCounts = { 1: 0, 2: 0, 3: 0 }
        list.forEach(e => {
          if (e.step === 1 || e.step === 2 || e.step === 3) {
            stepCounts[e.step] = (stepCounts[e.step] || 0) + 1
          }
        })
        const isOpen = !!openGroups[campaignName]
        return (
          <div
            key={campaignName}
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <button
              onClick={() => toggle(campaignName)}
              className="w-full flex items-center gap-3 px-4 py-3 transition-all"
              style={{ background: isOpen ? 'var(--bg-elevated)' : 'var(--bg-surface)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = isOpen ? 'var(--bg-elevated)' : 'var(--bg-surface)')}
            >
              {isOpen
                ? <ChevronDown  size={14} style={{ color: 'var(--text-2)' }} />
                : <ChevronRight size={14} style={{ color: 'var(--text-2)' }} />}
              <Zap size={13} style={{ color: '#F59E0B' }} />
              <span className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--text-1)' }}>
                {campaignName}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
                style={{ background: 'var(--bg-base)', color: 'var(--text-2)' }}
              >
                {list.length}
              </span>
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                {[1, 2, 3].map(s => stepCounts[s as 1|2|3] > 0 && (
                  <span
                    key={s}
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{
                      background: stepColor(s) + '15',
                      color:      stepColor(s),
                      border:     `1px solid ${stepColor(s)}30`,
                    }}
                  >
                    {s}º · {stepCounts[s as 1 | 2 | 3]}
                  </span>
                ))}
              </div>
            </button>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {list.map(e => <EmailRow key={e.id} email={e} onClick={() => onSelect(e)} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function HubspotList({ emails, onSelect }: { emails: SentEmail[]; onSelect: (e: SentEmail) => void }) {
  if (emails.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>
        <Mail size={28} style={{ margin: '0 auto', opacity: 0.4 }} />
        <p className="text-sm mt-3">Sin respuestas manuales enviadas desde HubSpot todavía</p>
        <p className="text-xs mt-1">Cuando contestes desde Conversaciones aparecerán aquí</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      {emails.map(e => <EmailRow key={e.id} email={e} onClick={() => onSelect(e)} />)}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EnviadosPage() {
  const [data, setData]       = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<Tab>('instantly')
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState<SentEmail | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/enviados', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const d = await res.json()
      setData(d)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!data) return { instantly: [], hubspot: [] }
    const q = search.trim().toLowerCase()
    const match = (e: SentEmail) =>
      !q ||
      e.subject.toLowerCase().includes(q) ||
      e.to_email.toLowerCase().includes(q) ||
      e.to_name.toLowerCase().includes(q) ||
      e.company.toLowerCase().includes(q) ||
      (e.campaign_name || '').toLowerCase().includes(q)
    return {
      instantly: data.instantly.filter(match),
      hubspot:   data.hubspot.filter(match),
    }
  }, [data, search])

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Enviados</h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
            {data
              ? `${data.counts.total} emails enviados · ${data.counts.instantly} Instantly · ${data.counts.hubspot} HubSpot`
              : 'Cargando…'}
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{
            background: 'var(--bg-surface)',
            color:      'var(--text-1)',
            border:     '1px solid var(--border)',
          }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {loading ? 'Cargando…' : 'Refrescar'}
        </button>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div
          className="flex p-1 rounded-lg gap-1"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {[
            { id: 'instantly', label: 'Instantly · Outreach', icon: Zap,  count: data?.counts.instantly },
            { id: 'hubspot',   label: 'HubSpot · Manuales',   icon: Mail, count: data?.counts.hubspot },
          ].map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as Tab)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: active ? 'var(--bg-active)' : 'transparent',
                  color:      active ? 'var(--text-1)'    : 'var(--text-2)',
                }}
              >
                <Icon size={12} />
                {t.label}
                {t.count !== undefined && (
                  <span
                    className="text-[10px] px-1 py-0.5 rounded font-bold"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)' }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-3)' }}
          />
          <input
            type="text"
            placeholder="Buscar por asunto, contacto, empresa…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-surface)',
              color:      'var(--text-1)',
              border:     '1px solid var(--border)',
            }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-4 rounded-lg mb-4 text-sm"
          style={{ background: '#EF444415', border: '1px solid #EF444430', color: '#FCA5A5' }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20" style={{ color: 'var(--text-2)' }}>
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Cargando emails enviados…</span>
        </div>
      )}

      {/* Content */}
      {data && (
        <div>
          {tab === 'instantly' && <InstantlyGrouped emails={filtered.instantly} onSelect={setSelected} />}
          {tab === 'hubspot'   && <HubspotList     emails={filtered.hubspot}   onSelect={setSelected} />}
        </div>
      )}

      {/* Detail panel */}
      {selected && <DetailPanel email={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
