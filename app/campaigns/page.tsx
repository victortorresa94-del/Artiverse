'use client'
import { useEffect, useRef, useState } from 'react'
import { campaigns as mockCampaigns } from '@/data/mock'
import { ChevronDown, ChevronUp, RefreshCw, Upload, X, CheckCircle } from 'lucide-react'

const statusColors: Record<string, string> = {
  '1': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  '0': 'text-white/30 bg-white/5 border-white/10',
  '2': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
}
const statusLabel: Record<string, string> = { '1': 'Activa', '0': 'Pendiente', '2': 'Pausada' }

function EmailBody({ body }: { body: string }) {
  const [open, setOpen] = useState(false)
  const clean = body.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  return (
    <div>
      <p className="text-xs text-white/40 leading-relaxed">{clean.slice(0, 140)}…</p>
      {open && (
        <pre className="mt-3 text-xs text-white/60 whitespace-pre-wrap leading-relaxed font-sans border-t border-white/5 pt-3">
          {clean}
        </pre>
      )}
      <button onClick={() => setOpen(!open)} className="mt-2 text-xs text-[#2563EB] hover:text-blue-300 flex items-center gap-1">
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
        setStatus('error')
        setMsg(data.error || 'Error al importar')
      }
    } catch (err) {
      setStatus('error')
      setMsg(String(err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Importar CSV de Instantly</h3>
            <p className="text-xs text-white/40 mt-0.5">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-white/40 mb-3">
          En Instantly: Analytics → selecciona campaña → Export CSV. Sube el archivo o pega el contenido.
        </p>

        <div
          className="border-2 border-dashed border-white/10 rounded-xl p-4 mb-3 text-center cursor-pointer hover:border-[#2563EB]/40 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={20} className="mx-auto text-white/20 mb-2" />
          <p className="text-xs text-white/30">Haz clic para subir CSV</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="…o pega el contenido del CSV aquí"
          rows={6}
          className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg p-3 text-xs text-white/60 font-mono placeholder-white/20 focus:outline-none focus:border-[#2563EB]/40 resize-none mb-4"
        />

        {status === 'ok' && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 mb-3">
            <CheckCircle size={14} /> Importado: {msg}
          </div>
        )}
        {status === 'error' && (
          <div className="text-xs text-red-400 mb-3">{msg}</div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || status === 'loading' || status === 'ok'}
            className="px-4 py-2 rounded-lg text-xs bg-[#2563EB] text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
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

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/instantly')
      if (res.ok) {
        const data = await res.json()
        // Merge live stats with mock sequence data for campaigns that have sequences
        const merged = data.campaigns.map((live: any) => {
          const mock = mockCampaigns.find(m => m.id === live.id || m.name === live.name)
          return {
            ...live,
            segment: mock?.segment || 'General',
            sendingEmail: live.emailList?.[0] || mock?.sendingEmail || '',
            steps: live.steps?.length > 0 ? live.steps.map((s: any, i: number) => ({
              ...s,
              sent: i === 0 ? live.sent : 0,
              openRate: i === 0 ? live.openRate : 0,
              replyRate: i === 0 ? live.replyRate : 0,
            })) : mock?.steps || [],
          }
        })
        setCampaigns(merged)
        if (!selected && merged.length > 0) setSelected(merged[0].id)
      }
    } catch {
      const fallback = mockCampaigns.map(c => ({ ...c, status: c.status === 'active' ? 1 : 0 }))
      setCampaigns(fallback)
      if (!selected && fallback.length > 0) setSelected(fallback[0].id)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const campaign = campaigns.find(c => c.id === selected) || campaigns[0]

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campañas</h1>
          <p className="text-sm text-white/30 mt-1">Secuencias, estadísticas y configuración</p>
        </div>
        <div className="flex items-center gap-2">
          {campaign && (
            <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] hover:bg-[#2563EB]/20 text-xs">
              <Upload size={12} /> Importar CSV
            </button>
          )}
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white text-xs">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {loading && campaigns.length === 0 ? (
        <div className="flex items-center gap-3 text-white/30 text-sm">
          <RefreshCw size={14} className="animate-spin" /> Cargando datos de Instantly…
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Campaign list */}
          <div className="w-64 shrink-0 space-y-1.5">
            {campaigns.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                  selected === c.id
                    ? 'bg-[#2563EB]/10 border-[#2563EB]/30 text-white'
                    : 'bg-[#111827] border-white/5 text-white/50 hover:text-white hover:border-white/10'
                }`}
              >
                <p className="text-sm font-medium leading-tight">{c.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusColors[String(c.status)] || statusColors['0']}`}>
                    {statusLabel[String(c.status)] || 'Pendiente'}
                  </span>
                  <span className="text-[10px] text-white/30">{c.sent ?? 0}/{c.total ?? 0}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Campaign detail */}
          {campaign && (
            <div className="flex-1 min-w-0 space-y-6">
              <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{campaign.name}</h2>
                    <p className="text-sm text-white/40 mt-1">
                      {campaign.segment} · <span className="font-mono">{campaign.sendingEmail}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign._statsSource === 'csv' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/10">CSV</span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${statusColors[String(campaign.status)] || statusColors['0']}`}>
                      {statusLabel[String(campaign.status)] || 'Pendiente'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { label: 'Total leads', value: campaign.total ?? 0 },
                    { label: 'Enviados', value: campaign.sent ?? 0 },
                    { label: 'Abiertos', value: campaign.opened ?? 0 },
                    { label: 'Open rate', value: (campaign.openRate ?? 0) > 0 ? `${campaign.openRate}%` : '—', color: '#CCFF00' },
                    { label: 'Reply rate', value: (campaign.replyRate ?? 0) > 0 ? `${campaign.replyRate}%` : '—' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#0A0A0A] rounded-lg p-4 border border-white/5">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-2xl font-bold" style={{ color: s.color || '#F9FAFB' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              {campaign.steps?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Secuencia de emails</h3>
                  {campaign.steps.map((step: any, i: number) => (
                    <div key={i} className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-4 px-5 py-4 border-b border-white/5">
                        <div className="w-8 h-8 rounded-full bg-[#2563EB]/20 border border-[#2563EB]/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-[#2563EB]">{step.step}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">Step {step.step}</p>
                          <p className="text-xs text-white/30">
                            {step.delayDays === 0 ? 'Día 1 — Email inicial' : `+${step.delayDays} días`}
                          </p>
                        </div>
                        <div className="flex gap-4 text-xs font-mono">
                          {(step.sent ?? 0) > 0 && <span className="text-white/30">{step.sent} enviados</span>}
                          {(step.openRate ?? 0) > 0 && <span className="text-[#CCFF00]">{step.openRate}% open</span>}
                          {(step.replyRate ?? 0) > 0 && <span className="text-white/60">{step.replyRate}% reply</span>}
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        <div className="mb-3">
                          <span className="text-xs text-white/30 uppercase tracking-wider">Asunto: </span>
                          <span className="text-sm text-white font-medium">{step.subject || '(sin asunto)'}</span>
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
        <CsvImportModal
          campaign={campaign}
          onClose={() => setShowImport(false)}
          onImported={fetchData}
        />
      )}
    </div>
  )
}
