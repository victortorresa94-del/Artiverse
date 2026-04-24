'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { campaigns as mockCampaigns } from '@/data/mock'
import {
  ChevronDown, ChevronUp, RefreshCw, Upload, X, CheckCircle,
  BarChart2, Megaphone, Mail, Users,
} from 'lucide-react'
import PillBadge from '@/components/ui/PillBadge'

// ── Status config ─────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; variant: 'green' | 'gray' | 'amber' | 'purple' }> = {
  '1': { label: 'Activa',     variant: 'green' },
  '0': { label: 'Pendiente',  variant: 'gray' },
  '2': { label: 'Pausada',    variant: 'amber' },
  '3': { label: 'Completada', variant: 'purple' },
}

// ── Email body preview ────────────────────────────────────────────────────────

function EmailBody({ body }: { body: string }) {
  const [open, setOpen] = useState(false)
  const clean = body.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  return (
    <div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
        {clean.slice(0, 160)}…
      </p>
      {open && (
        <pre
          className="mt-3 text-xs whitespace-pre-wrap leading-relaxed font-sans pt-3"
          style={{ color: 'var(--text-2)', borderTop: '1px solid var(--border)' }}
        >
          {clean}
        </pre>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="mt-2 text-xs flex items-center gap-1 transition-opacity hover:opacity-70"
        style={{ color: 'var(--blue)' }}
      >
        {open ? <><ChevronUp size={12} /> Cerrar</> : <><ChevronDown size={12} /> Ver completo</>}
      </button>
    </div>
  )
}

// ── CSV Import Modal (dark) ───────────────────────────────────────────────────

function CsvImportModal({ campaign, onClose, onImported }: {
  campaign: any; onClose: () => void; onImported: () => void
}) {
  const [text,   setText]   = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg,    setMsg]    = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => setText(ev.target?.result as string)
    reader.readAsText(f)
  }

  const handleSubmit = async () => {
    if (!text.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, campaignName: campaign.name, csvText: text }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('ok')
        setMsg(`${data.stats.sent} enviados · ${data.stats.openRate}% open · ${data.stats.replyRate}% reply`)
        setTimeout(() => { onImported(); onClose() }, 1800)
      } else {
        setStatus('error'); setMsg(data.error || 'Error al importar')
      }
    } catch (err) { setStatus('error'); setMsg(String(err)) }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
              Importar CSV de Instantly
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{campaign.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            En Instantly: Analytics → selecciona campaña → Export CSV. Sube el archivo o pega el contenido.
          </p>
          <div
            className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors"
            style={{ borderColor: 'var(--border-strong)' }}
            onClick={() => fileRef.current?.click()}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--blue)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          >
            <Upload size={20} className="mx-auto mb-2" style={{ color: 'var(--text-3)' }} />
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Haz clic para subir CSV</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="…o pega el contenido del CSV aquí"
            rows={6}
            className="w-full rounded-lg p-3 text-xs font-mono resize-none focus:outline-none"
            style={{
              background:  'var(--bg-base)',
              border:      '1px solid var(--border)',
              color:       'var(--text-1)',
            }}
          />
          {status === 'ok' && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--success)' }}>
              <CheckCircle size={14} /> Importado: {msg}
            </div>
          )}
          {status === 'error' && (
            <div className="text-xs" style={{ color: 'var(--error)' }}>{msg}</div>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs transition-colors"
              style={{ color: 'var(--text-2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || status === 'loading' || status === 'ok'}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
              style={{ background: 'var(--blue)', color: '#fff' }}
            >
              {status === 'loading' ? 'Importando…' : 'Importar stats'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3.5"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: 'var(--text-3)' }}>
        {label}
      </p>
      <p
        className="text-2xl font-bold"
        style={{ color: accent || 'var(--text-1)' }}
      >
        {value}
      </p>
    </div>
  )
}

// ── Email status config ────────────────────────────────────────────────────────

const emailStatusConfig: Record<string, { label: string; variant: 'green' | 'gray' | 'amber' | 'blue' | 'red' | 'purple' }> = {
  replied:  { label: 'Respondido',   variant: 'green' },
  clicked:  { label: 'Clic',         variant: 'purple' },
  opened:   { label: 'Abierto',      variant: 'amber' },
  sent:     { label: 'Enviado',      variant: 'blue' },
  not_sent: { label: 'Sin enviar',   variant: 'gray' },
  bounced:  { label: 'Bounced',      variant: 'red' },
}

// ── Campaign contacts list ─────────────────────────────────────────────────────

function CampaignContacts({ campaignId }: { campaignId: string }) {
  const [data,    setData]    = useState<{ contacts: any[]; stats: any } | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState<string>('all')

  useEffect(() => {
    if (!campaignId) return
    setLoading(true)
    setData(null)
    fetch(`/api/campaigns/${campaignId}/contacts`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [campaignId])

  const filterOptions = [
    { id: 'all',      label: 'Todos' },
    { id: 'replied',  label: 'Respondidos' },
    { id: 'opened',   label: 'Abiertos' },
    { id: 'sent',     label: 'Enviados' },
    { id: 'bounced',  label: 'Bounced' },
  ]

  const filtered = data?.contacts.filter(c =>
    filter === 'all' ? true :
    filter === 'opened' ? (c.emailStatus === 'opened' || c.emailStatus === 'clicked') :
    c.emailStatus === filter
  ) ?? []

  if (loading) {
    return (
      <div className="px-2 py-6 text-center text-xs animate-pulse" style={{ color: 'var(--text-3)' }}>
        Cargando contactos de Instantly…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-2 py-6 text-center text-xs" style={{ color: 'var(--text-3)' }}>
        No se pudo cargar los contactos.
      </div>
    )
  }

  return (
    <div>
      {/* Stats mini-row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Total leads',  value: data.stats.total,   color: 'var(--text-1)' },
          { label: 'Abiertos',     value: data.stats.opened,  color: '#F59E0B' },
          { label: 'Respondidos',  value: data.stats.replied, color: 'var(--success)' },
          { label: 'Bounced',      value: data.stats.bounced, color: 'var(--error)' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl p-3 text-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] mt-0.5 uppercase tracking-wider font-semibold" style={{ color: 'var(--text-3)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {filterOptions.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all"
            style={{
              background: filter === f.id ? 'var(--blue)'     : 'var(--bg-elevated)',
              color:      filter === f.id ? '#fff'            : 'var(--text-2)',
              border:     `1px solid ${filter === f.id ? 'var(--blue)' : 'var(--border)'}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              {['Contacto', 'Estado', 'Paso', 'Aperturas', 'Última apertura'].map(h => (
                <th
                  key={h}
                  className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap"
                  style={{ color: 'var(--text-3)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-3)' }}>
                  Sin contactos para este filtro
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => {
                const st = emailStatusConfig[c.emailStatus] ?? emailStatusConfig['not_sent']
                return (
                  <tr
                    key={i}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-xs" style={{ color: 'var(--text-1)' }}>
                        {c.company || c.contact || c.email.split('@')[0]}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>{c.email}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <PillBadge label={st.label} variant={st.variant} size="xs" />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs" style={{ color: 'var(--text-2)' }}>
                      {c.step != null ? `Paso ${c.step}` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="font-mono font-semibold text-xs"
                        style={{ color: c.opens > 0 ? '#F59E0B' : 'var(--text-3)' }}
                      >
                        {c.opens > 0 ? `${c.opens}x` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] font-mono whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                      {c.lastOpen ? c.lastOpen.slice(0, 10) : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns,      setCampaigns]      = useState<any[]>([])
  const [selected,       setSelected]       = useState<string>('')
  const [loading,        setLoading]        = useState(true)
  const [showImport,     setShowImport]     = useState(false)
  const [activeTab,      setActiveTab]      = useState<'resumen' | 'analytics'>('resumen')
  const [detailTab,      setDetailTab]      = useState<'resumen' | 'contactos'>('resumen')

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch Instantly campaigns + ruta data (for real open/reply rates) in parallel
      const [instRes, rutaRes] = await Promise.all([
        fetch('/api/instantly?lite=1'),
        fetch('/api/ruta?token=AETHER2026'),
      ])

      const data     = instRes.ok  ? await instRes.json()  : { campaigns: [] }
      const rutaData = rutaRes.ok  ? await rutaRes.json()  : null

      // Build a map: campaign name → ruta stats
      const rutaMap = new Map<string, any>(
        (rutaData?.campaigns ?? []).map((rc: any) => [rc.name, rc])
      )

      const merged = data.campaigns.map((live: any) => {
        const mock = mockCampaigns.find((m: any) => m.id === live.id || m.name === live.name)

        // Find matching ruta campaign by name (fuzzy)
        let rc = rutaMap.get(live.name)
        if (!rc) {
          rc = rutaData?.campaigns?.find((r: any) =>
            live.name.toLowerCase().includes(r.name.toLowerCase()) ||
            r.name.toLowerCase().includes(live.name.toLowerCase())
          )
        }

        const sent    = (rc?.sent > 0 ? rc.sent : null) ?? live.sent ?? 0
        const opened  = rc?.opened  ?? 0
        const replied = rc?.replied ?? 0
        const openRate  = sent > 0 ? +((opened  / sent) * 100).toFixed(1) : (live.openRate  ?? 0)
        const replyRate = sent > 0 ? +((replied / sent) * 100).toFixed(1) : (live.replyRate ?? 0)

        const steps = live.steps?.length > 0
          ? live.steps.map((s: any, i: number) => ({
              ...s,
              sent:      i === 0 ? sent : 0,
              openRate:  i === 0 ? openRate  : 0,
              replyRate: i === 0 ? replyRate : 0,
            }))
          : mock?.steps || []

        return {
          ...live,
          segment:      mock?.segment || 'General',
          sendingEmail: live.emailList?.[0] || mock?.sendingEmail || '',
          sent,
          opened,
          replied,
          openRate,
          replyRate,
          steps,
        }
      })

      setCampaigns(merged)
      if (!selected && merged.length > 0) setSelected(merged[0].id)
    } catch (err) {
      console.warn('Instantly API error, using mock:', err)
      const fallback = mockCampaigns.map((c: any) => ({
        ...c,
        status: c.status === 'active' ? 1 : c.status === 'paused' ? 2 : 0,
        total:  c.totalContacts,
        sent:   c.emailsSent,
      }))
      setCampaigns(fallback)
      if (!selected && fallback.length > 0) setSelected(fallback[0].id)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const campaign = campaigns.find(c => c.id === selected) || campaigns[0]

  // Analytics totals
  const totalStats = useMemo(() => {
    const sent    = campaigns.reduce((s, c) => s + (c.sent    ?? 0), 0)
    const opened  = campaigns.reduce((s, c) => s + (c.opened  ?? 0), 0)
    const replied = campaigns.reduce((s, c) => s + (c.replied ?? 0), 0)
    const openRate  = sent > 0 ? +((opened  / sent) * 100).toFixed(1) : 0
    const replyRate = sent > 0 ? +((replied / sent) * 100).toFixed(1) : 0
    return { sent, opened, replied, openRate, replyRate }
  }, [campaigns])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
            Campañas
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
            Secuencias, estadísticas y configuración · Instantly
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {campaign && activeTab === 'resumen' && (
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(37,99,235,0.2)' }}
            >
              <Upload size={12} /> Importar CSV
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 mb-5" style={{ borderBottom: '1px solid var(--border)' }}>
        {([
          { id: 'resumen',   label: 'Resumen',   icon: Megaphone },
          { id: 'analytics', label: 'Analytics', icon: BarChart2 },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all"
            style={{
              color:        activeTab === tab.id ? 'var(--text-1)' : 'var(--text-3)',
              borderBottom: activeTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Analytics tab ───────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div>
          {/* Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            <StatChip label="Total enviados"  value={totalStats.sent}    />
            <StatChip label="Total abiertos"  value={totalStats.opened}  />
            <StatChip label="Total replies"   value={totalStats.replied} />
            <StatChip label="Open rate total" value={totalStats.openRate  > 0 ? `${totalStats.openRate}%`  : '—'} accent="#F59E0B" />
            <StatChip label="Reply rate total" value={totalStats.replyRate > 0 ? `${totalStats.replyRate}%` : '—'} accent="var(--success)" />
          </div>

          {/* Table */}
          <div className="surface-card overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                Rendimiento por campaña
              </h2>
            </div>
            {loading ? (
              <div className="px-5 py-8 text-center text-xs animate-pulse" style={{ color: 'var(--text-3)' }}>Cargando…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                      {['Campaña', 'Segmento', 'Enviados', 'Abiertos', 'Open rate', 'Reply rate', 'Estado'].map(h => (
                        <th
                          key={h}
                          className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap"
                          style={{ color: 'var(--text-3)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => {
                      const st = statusConfig[String(c.status)] ?? statusConfig['0']
                      return (
                        <tr
                          key={c.id}
                          style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--text-1)' }}>
                            {c.name}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>
                            {c.segment || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-2)' }}>
                            {c.sent ?? 0}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-2)' }}>
                            {c.opened ?? 0}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-xs font-semibold font-mono"
                              style={{ color: (c.openRate ?? 0) > 0 ? '#F59E0B' : 'var(--text-3)' }}
                            >
                              {(c.openRate ?? 0) > 0 ? `${c.openRate}%` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-xs font-semibold font-mono"
                              style={{ color: (c.replyRate ?? 0) > 0 ? 'var(--success)' : 'var(--text-3)' }}
                            >
                              {(c.replyRate ?? 0) > 0 ? `${c.replyRate}%` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <PillBadge label={st.label} variant={st.variant} size="xs" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Resumen tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        loading && campaigns.length === 0 ? (
          <div className="flex items-center gap-3 text-sm animate-pulse" style={{ color: 'var(--text-3)' }}>
            <RefreshCw size={14} className="animate-spin" /> Cargando datos de Instantly…
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">

            {/* Campaign list sidebar */}
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:w-64 lg:shrink-0 pb-2 lg:pb-0">
              {campaigns.map(c => {
                const st    = statusConfig[String(c.status)] ?? statusConfig['0']
                const isAct = selected === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className="shrink-0 lg:w-full text-left px-4 py-3 rounded-xl border transition-all"
                    style={{
                      background:  isAct ? 'var(--bg-active)'   : 'var(--bg-surface)',
                      border:      `1px solid ${isAct ? 'var(--blue)' : 'var(--border)'}`,
                    }}
                    onMouseEnter={e => { if (!isAct) e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                    onMouseLeave={e => { if (!isAct) e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <p
                      className="text-sm font-medium leading-tight whitespace-nowrap lg:whitespace-normal"
                      style={{ color: isAct ? 'var(--blue)' : 'var(--text-1)' }}
                    >
                      {c.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <PillBadge label={st.label} variant={st.variant} size="xs" />
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                        {c.sent ?? 0} env.
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Campaign detail */}
            {campaign && (
              <div className="flex-1 min-w-0 space-y-5">

                {/* Detail tabs */}
                <div className="flex items-center gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
                  {([
                    { id: 'resumen',   label: 'Resumen',   icon: Megaphone },
                    { id: 'contactos', label: 'Contactos', icon: Users },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id)}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all"
                      style={{
                        color:        detailTab === tab.id ? 'var(--text-1)' : 'var(--text-3)',
                        borderBottom: detailTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
                        marginBottom: '-1px',
                      }}
                    >
                      <tab.icon size={12} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Resumen tab content */}
                {detailTab === 'resumen' && (
                  <>
                    {/* Stats card */}
                    <div className="surface-card p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-3">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-1)' }}>
                            {campaign.name}
                          </h2>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                            {campaign.segment} · <span className="font-mono">{campaign.sendingEmail}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {campaign._statsSource === 'csv' && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{
                                border: '1px solid var(--blue)',
                                color:  'var(--blue)',
                                background: 'var(--blue-dim)',
                              }}
                            >
                              CSV
                            </span>
                          )}
                          <PillBadge
                            label={(statusConfig[String(campaign.status)] ?? statusConfig['0']).label}
                            variant={(statusConfig[String(campaign.status)] ?? statusConfig['0']).variant}
                            size="sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <StatChip label="Total leads" value={campaign.total ?? 0} />
                        <StatChip label="Enviados"    value={campaign.sent   ?? 0} />
                        <StatChip label="Abiertos"    value={campaign.opened ?? 0} />
                        <StatChip
                          label="Open rate"
                          value={(campaign.openRate ?? 0) > 0 ? `${campaign.openRate}%` : '—'}
                          accent="#D97706"
                        />
                        <StatChip
                          label="Reply rate"
                          value={(campaign.replyRate ?? 0) > 0 ? `${campaign.replyRate}%` : '—'}
                          accent="var(--success)"
                        />
                      </div>
                    </div>

                    {/* Email steps */}
                    {campaign.steps?.length > 0 && (
                      <div className="space-y-3">
                        <h3
                          className="text-[10px] font-semibold uppercase tracking-wider px-1"
                          style={{ color: 'var(--text-3)' }}
                        >
                          Secuencia de emails
                        </h3>
                        {campaign.steps.map((step: any, i: number) => (
                          <div key={i} className="surface-card overflow-hidden">
                            <div
                              className="flex items-center gap-4 px-4 sm:px-5 py-4"
                              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
                            >
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                                style={{ background: 'var(--blue-dim)', border: '1px solid var(--blue)', color: 'var(--blue)' }}
                              >
                                {step.step}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                                  Step {step.step}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                                  {step.delayDays === 0 ? 'Día 1 — Email inicial' : `+${step.delayDays} días`}
                                </p>
                              </div>
                              <div className="flex gap-3 text-xs font-mono shrink-0 flex-wrap justify-end">
                                {(step.sent ?? 0) > 0 && (
                                  <span style={{ color: 'var(--text-2)' }}>{step.sent} env.</span>
                                )}
                                {(step.openRate ?? 0) > 0 && (
                                  <span className="font-semibold" style={{ color: '#D97706' }}>
                                    {step.openRate}% open
                                  </span>
                                )}
                                {(step.replyRate ?? 0) > 0 && (
                                  <span className="font-semibold" style={{ color: 'var(--success)' }}>
                                    {step.replyRate}% reply
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="px-4 sm:px-5 py-4">
                              <div className="mb-3">
                                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-3)' }}>
                                  Asunto:{' '}
                                </span>
                                <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                                  {step.subject || '(sin asunto)'}
                                </span>
                              </div>
                              {step.body && <EmailBody body={step.body} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Contactos tab content */}
                {detailTab === 'contactos' && (
                  <CampaignContacts campaignId={campaign.id} />
                )}
              </div>
            )}
          </div>
        )
      )}

      {showImport && campaign && (
        <CsvImportModal
          campaign={campaign}
          onClose={() => setShowImport(false)}
          onImported={fetchData}
        />
      )}
    </div>
  )
}
