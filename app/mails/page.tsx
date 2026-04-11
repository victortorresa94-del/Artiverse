'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Mail, ChevronRight, RefreshCw, Save, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader2, Layers, FileText,
  Tag, MessageSquare
} from 'lucide-react'

interface Variant {
  subject: string
  body: string
}
interface Step {
  type: string
  delay: number
  delay_unit?: string
  variants: Variant[]
}
interface Sequence {
  steps: Step[]
}
interface Campaign {
  id: string
  name: string
  status: number
  email_list: string[]
  sequences: Sequence[]
}

const STATUS = {
  1: { label: 'Activa', color: 'bg-emerald-100 text-emerald-700' },
  0: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  2: { label: 'Pausada', color: 'bg-gray-100 text-gray-500' },
  3: { label: 'Completada', color: 'bg-purple-100 text-purple-700' },
} as Record<number, { label: string; color: string }>

const VARIANT_LABELS = ['A', 'B', 'C', 'D', 'E']

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
}

function HtmlPreview({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default function MailsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCamp, setSelectedCamp] = useState<Campaign | null>(null)
  const [selectedStep, setSelectedStep] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState(0)
  const [editedCampaigns, setEditedCampaigns] = useState<Record<string, Campaign>>({})
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [previewMode, setPreviewMode] = useState(false)
  const [unsaved, setUnsaved] = useState<Set<string>>(new Set())

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mails')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
      if (data.campaigns?.length > 0 && !selectedCamp) {
        setSelectedCamp(data.campaigns[0])
      }
    } finally {
      setLoading(false)
    }
  }, [selectedCamp])

  useEffect(() => { fetchCampaigns() }, [])

  // Get working copy of a campaign (edited or original)
  const getCamp = (c: Campaign) => editedCampaigns[c.id] || c

  // Get current variant being edited
  const currentCamp = selectedCamp ? getCamp(selectedCamp) : null
  const currentSteps = currentCamp?.sequences?.[0]?.steps || []
  const currentStep = currentSteps[selectedStep]
  const currentVariants = currentStep?.variants || []
  const currentVariant = currentVariants[selectedVariant] || { subject: '', body: '' }

  // Update a field in the current variant
  const updateVariant = (field: 'subject' | 'body', value: string) => {
    if (!selectedCamp) return
    const camp = JSON.parse(JSON.stringify(getCamp(selectedCamp))) as Campaign
    const steps = camp.sequences[0].steps
    if (!steps[selectedStep]) return
    if (!steps[selectedStep].variants[selectedVariant]) return
    steps[selectedStep].variants[selectedVariant][field] = value
    setEditedCampaigns(prev => ({ ...prev, [selectedCamp.id]: camp }))
    setUnsaved(prev => new Set(prev).add(selectedCamp.id))
    setSaveStatus('idle')
  }

  // Save to Instantly
  const save = async () => {
    if (!selectedCamp) return
    const camp = getCamp(selectedCamp)
    setSaving(true)
    setSaveStatus('idle')
    try {
      const res = await fetch('/api/mails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: camp.id, sequences: camp.sequences }),
      })
      if (res.ok) {
        setSaveStatus('ok')
        setUnsaved(prev => { const n = new Set(prev); n.delete(selectedCamp.id); return n })
        setTimeout(() => setSaveStatus('idle'), 2500)
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Left Panel: Campaign list ─────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Campañas</h2>
          </div>
          <button onClick={fetchCampaigns} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : (
            campaigns.map(c => {
              const isSelected = selectedCamp?.id === c.id
              const hasUnsaved = unsaved.has(c.id)
              const stepCount = c.sequences?.[0]?.steps?.length || 0
              const s = STATUS[c.status] || STATUS[0]
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCamp(c); setSelectedStep(0); setSelectedVariant(0) }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-medium leading-tight ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {c.name}
                    </span>
                    {hasUnsaved && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1" title="Sin guardar" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.color}`}>
                      {s.label}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {stepCount} step{stepCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </nav>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────── */}
      {!selectedCamp ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Mail size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm">Selecciona una campaña</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Campaign header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <span>Mails</span>
                  <ChevronRight size={10} />
                  <span className="text-gray-600 font-medium">{selectedCamp.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-bold text-gray-900">{currentCamp?.name}</h1>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS[selectedCamp.status]?.color || ''}`}>
                    {STATUS[selectedCamp.status]?.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Enviando desde: {selectedCamp.email_list?.join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    previewMode
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {previewMode ? <EyeOff size={13} /> : <Eye size={13} />}
                  {previewMode ? 'Editar' : 'Preview'}
                </button>

                <button
                  onClick={save}
                  disabled={saving || !unsaved.has(selectedCamp.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    unsaved.has(selectedCamp.id)
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {saving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : saveStatus === 'ok' ? (
                    <CheckCircle size={13} className="text-emerald-400" />
                  ) : saveStatus === 'error' ? (
                    <AlertCircle size={13} className="text-red-400" />
                  ) : (
                    <Save size={13} />
                  )}
                  {saving ? 'Guardando...' : saveStatus === 'ok' ? '¡Guardado!' : saveStatus === 'error' ? 'Error' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>

          {/* Steps tabs */}
          <div className="bg-white border-b border-gray-200 px-6">
            <div className="flex gap-0">
              {currentSteps.map((step, i) => {
                const varCount = step.variants?.length || 1
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedStep(i); setSelectedVariant(0) }}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      selectedStep === i
                        ? 'border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                    }`}
                  >
                    <Layers size={13} />
                    Step {i + 1}
                    {step.delay > 0 && (
                      <span className="text-[10px] text-gray-400">+{step.delay}d</span>
                    )}
                    {varCount > 1 && (
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                        {varCount} var
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            {currentStep && (
              <div className="max-w-4xl mx-auto px-6 py-6">

                {/* Variant tabs */}
                {currentVariants.length > 0 && (
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-xs text-gray-400 font-medium mr-1">Variante:</span>
                    {currentVariants.map((_, vi) => (
                      <button
                        key={vi}
                        onClick={() => setSelectedVariant(vi)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          selectedVariant === vi
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {VARIANT_LABELS[vi] || `V${vi + 1}`}
                      </button>
                    ))}
                    <span className="ml-auto text-xs text-gray-400">
                      {currentStep.delay === 0 ? 'Envío inmediato' : `Retraso: ${currentStep.delay} días`}
                    </span>
                  </div>
                )}

                {/* Subject field */}
                <div className="mb-5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    <Tag size={11} />
                    Asunto
                  </label>
                  {previewMode ? (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-800 font-medium min-h-[44px]">
                      {currentVariant.subject || <span className="text-gray-400 italic">(sin asunto — usa el hilo del email anterior)</span>}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={currentVariant.subject}
                      onChange={e => updateVariant('subject', e.target.value)}
                      placeholder="(vacío = continúa el hilo del email anterior)"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  )}
                </div>

                {/* Body field */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    <MessageSquare size={11} />
                    Cuerpo del email
                  </label>

                  {previewMode ? (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      {/* Email preview header */}
                      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">V</div>
                        <div>
                          <p className="text-xs font-medium text-gray-700">Víctor · Artiverse</p>
                          <p className="text-[10px] text-gray-400">victor@artiversemail.es</p>
                        </div>
                      </div>
                      <div className="px-6 py-5">
                        {currentVariant.subject && (
                          <p className="font-semibold text-gray-900 mb-4 text-sm">{currentVariant.subject}</p>
                        )}
                        <HtmlPreview html={currentVariant.body} />
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={currentVariant.body}
                      onChange={e => updateVariant('body', e.target.value)}
                      rows={18}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Escribe el cuerpo del email (HTML o texto plano)..."
                    />
                  )}
                </div>

                {/* Quick tips */}
                {!previewMode && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                      <FileText size={11} />
                      Variables disponibles
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['{{firstName}}', '{{lastName}}', '{{companyName}}', '{{email}}'].map(v => (
                        <code key={v} className="text-[11px] bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded font-mono">
                          {v}
                        </code>
                      ))}
                    </div>
                    <p className="text-[11px] text-blue-500 mt-2">
                      Consejo: deja el asunto vacío en Steps 2/3 para que el email continúe en el mismo hilo.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
