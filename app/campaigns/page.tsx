'use client'
import { useEffect, useRef, useState } from 'react'
import { campaigns as mockCampaigns } from '@/data/mock'
import { ChevronDown, ChevronUp, RefreshCw, Upload, X, CheckCircle } from 'lucide-react'

const statusStyle: Record<string, { label: string; bg: string; text: string }> = {
  '1': { label: 'Activa',    bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  '0': { label: 'Pendiente', bg: 'bg-gray-100',    text: 'text-gray-500' },
  '2': { label: 'Pausada',   bg: 'bg-amber-50',    text: 'text-amber-700' },
  '3': { label: 'Completada',bg: 'bg-purple-50',   text: 'text-purple-700' },
}

function EmailBody({ body }: { body: string }) {
  const [open, setOpen] = useState(false)
  const clean = body.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  return (
    <div>
      <p className="text-xs text-gray-500 leading-relaxed">{clean.slice(0, 140)}…</p>
      {open && (
        <pre className="mt-3 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-sans border-t border-gray-100 pt-3">
          {clean}
        </pre>
      )}
      <button onClick={() => setOpen(!open)} className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
        {open ? <><ChevronUp size={12} /> Cerrar</> : <><ChevronDown size={12} /> Ver completo</>}
      </button>
    </div>
  )
}

function CsvImportModal({ campaign, onClose, onImported }: { campaign: any; onClose: () => void; onImported: () => void }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Importar CSV de Instantly</h3>
            <p className="text-xs text-gray-500 mt-0.5">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          En Instantly: Analytics → selecciona campaña → Export CSV. Sube el archivo o pega el contenido.
        </p>
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-4 mb-3 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={20} className="mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">Haz clic para subir CSV</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </div>
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder="…o pega el contenido del CSV aquí"
          rows={6}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none mb-4"
        />
        {status === 'ok' && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 mb-3">
            <CheckCircle size={14} /> Importado: {msg}
          </div>
        )}
        {status === 'error' && <div className="text-xs text-red-500 mb-3">{msg}</div>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || status === 'loading' || status === 'ok'}
            className="px-4 py-2 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Importando…' : 'Importar stats'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/instantly?lite=1')
      if (res.ok) {
        const data = await res.json()
        const merged = data.campaigns.map((live: any) => {
          const mock = mockCampaigns.find(m => m.id === live.id || m.name === live.name)
          return {
            ...live,
            segment: mock?.segment || 'General',
            sendingEmail: live.emailList?.[0] || mock?.sendingEmail || '',
            steps: live.steps?.length > 0 ? live.steps.map((s: any, i: number) => ({
              ...s, sent: i === 0 ? live.sent : 0, openRate: i === 0 ? live.openRate : 0, replyRate: i === 0 ? live.replyRate : 0,
            })) : mock?.steps || [],
          }
        })
        setCampaigns(merged)
        if (!selected && merged.length > 0) setSelected(merged[0].id)
      }
    } catch (err) {
      console.warn('Instantly API error, using mock:', err)
      const fallback = mockCampaigns.map(c => ({ ...c, status: c.status === 'active' ? 1 : c.status === 'paused' ? 2 : 0, total: c.totalContacts, sent: c.emailsSent }))
      setCampaigns(fallback)
      if (!selected && fallback.length > 0) setSelected(fallback[0].id)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const campaign = campaigns.find(c => c.id === selected) || campaigns[0]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Campañas</h1>
          <p className="text-sm text-gray-500 mt-1">Secuencias, estadísticas y configuración</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {campaign && (
            <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-medium">
              <Upload size={12} /> Importar CSV
            </button>
          )}
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs shadow-sm">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {loading && campaigns.length === 0 ? (
        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <RefreshCw size={14} className="animate-spin" /> Cargando datos de Instantly…
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Campaign list — horizontal scroll on mobile, vertical on desktop */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:w-64 lg:shrink-0 pb-2 lg:pb-0">
            {campaigns.map(c => {
              const st = statusStyle[String(c.status)] || statusStyle['0']
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`shrink-0 lg:w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    selected === c.id
                      ? 'bg-blue-50 border-blue-200 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                >
                  <p className={`text-sm font-medium leading-tight whitespace-nowrap lg:whitespace-normal ${selected === c.id ? 'text-blue-900' : 'text-gray-700'}`}>{c.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{c.sent ?? 0}/{c.total ?? 0}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Campaign detail */}
          {campaign && (
            <div className="flex-1 min-w-0 space-y-5">
              <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">{campaign.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {campaign.segment} · <span className="font-mono text-xs">{campaign.sendingEmail}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {campaign._statsSource === 'csv' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-200 text-blue-600 bg-blue-50 font-medium">CSV</span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${(statusStyle[String(campaign.status)] || statusStyle['0']).bg} ${(statusStyle[String(campaign.status)] || statusStyle['0']).text}`}>
                      {(statusStyle[String(campaign.status)] || statusStyle['0']).label}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'Total leads', value: campaign.total ?? 0 },
                    { label: 'Enviados',    value: campaign.sent ?? 0 },
                    { label: 'Abiertos',    value: campaign.opened ?? 0 },
                    { label: 'Open rate',   value: (campaign.openRate ?? 0) > 0 ? `${campaign.openRate}%` : '—', accent: '#D97706' },
                    { label: 'Reply rate',  value: (campaign.replyRate ?? 0) > 0 ? `${campaign.replyRate}%` : '—', accent: '#059669' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-medium">{s.label}</p>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: s.accent || '#111827' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              {campaign.steps?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Secuencia de emails</h3>
                  {campaign.steps.map((step: any, i: number) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="flex items-center gap-4 px-4 sm:px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                        <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-blue-700">{step.step}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Step {step.step}</p>
                          <p className="text-xs text-gray-400">
                            {step.delayDays === 0 ? 'Día 1 — Email inicial' : `+${step.delayDays} días`}
                          </p>
                        </div>
                        <div className="flex gap-3 text-xs font-mono shrink-0 flex-wrap justify-end">
                          {(step.sent ?? 0) > 0 && <span className="text-gray-400">{step.sent} env.</span>}
                          {(step.openRate ?? 0) > 0 && <span className="text-amber-600 font-semibold">{step.openRate}% open</span>}
                          {(step.replyRate ?? 0) > 0 && <span className="text-emerald-600 font-semibold">{step.replyRate}% reply</span>}
                        </div>
                      </div>
                      <div className="px-4 sm:px-5 py-4">
                        <div className="mb-3">
                          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Asunto: </span>
                          <span className="text-sm text-gray-800 font-medium">{step.subject || '(sin asunto)'}</span>
                        </div>
                        {step.body && <EmailBody body={step.body} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {showImport && campaign && (
        <CsvImportModal campaign={campaign} onClose={() => setShowImport(false)} onImported={fetchData} />
      )}
    </div>
  )
}
