'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Wand2, Loader2, Paperclip, X, Sparkles, Save,
  Eye, Code2, Plus, Image as ImageIcon,
} from 'lucide-react'

interface AttachedImage { base64: string; mediaType: string; preview: string }

const TEMPLATES = [
  { id: '',                    label: 'Sin referencia (libre)' },
  { id: 'welcome',             label: 'Bienvenida (negro+lima)' },
  { id: 'newsletter-classic',  label: 'Newsletter clásico' },
  { id: 'digest',              label: 'Digest semanal' },
  { id: 'showcase',            label: 'Showcase / Talento' },
  { id: 'announcement',        label: 'Anuncio / Lanzamiento' },
  { id: 'insights',            label: 'Insights / Stats' },
]

const NEWSLETTERS = [
  { id: '',              label: 'Sin vincular' },
  { id: 'bienvenida',    label: 'Bienvenida' },
  { id: 'licitaciones',  label: 'Licitaciones' },
  { id: 'talento_mes',   label: 'Talento del mes' },
  { id: 'insights',      label: 'Insights' },
  { id: 'convocatorias', label: 'Convocatorias' },
]

export default function DesdeCero() {
  const router = useRouter()
  const [prompt, setPrompt]   = useState('')
  const [refTemplate, setRef] = useState('')
  const [refHtml, setRefHtml] = useState('')
  const [images, setImages]   = useState<AttachedImage[]>([])
  const [generated, setGen]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<'preview'|'code'>('preview')

  // Save
  const [saveOpen, setSaveOpen] = useState(false)
  const [name, setName]         = useState('')
  const [desc, setDesc]         = useState('')
  const [newsletterId, setNl]   = useState('')
  const [saving, setSaving]     = useState(false)

  const imgInputRef  = useRef<HTMLInputElement>(null)
  const htmlInputRef = useRef<HTMLInputElement>(null)

  function attachImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    files.slice(0, 5 - images.length).forEach(file => {
      if (file.size > 4 * 1024 * 1024) { alert(`${file.name} > 4MB`); return }
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        setImages(prev => [...prev, { base64, mediaType: file.type, preview: result }])
      }
      reader.readAsDataURL(file)
    })
    if (imgInputRef.current) imgInputRef.current.value = ''
  }

  async function attachHtml(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setRefHtml(text)
    if (htmlInputRef.current) htmlInputRef.current.value = ''
  }

  async function generate() {
    if (!prompt.trim()) return
    setLoading(true); setError(null); setGen('')
    try {
      const r = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:            prompt.trim(),
          referenceTemplate: refTemplate || undefined,
          referenceHtml:     refHtml     || undefined,
          images:            images.map(i => ({ base64: i.base64, mediaType: i.mediaType })),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setGen(d.html)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function save() {
    if (!name.trim() || !generated) return
    setSaving(true)
    try {
      const r = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description: desc || undefined,
          newsletterId: newsletterId || undefined,
          html: generated,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      router.push(`/maquetador/editar/${d.mail.id}`)
    } catch (e: any) { setError(e.message); setSaving(false) }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen flex-col" style={{ background:'var(--bg-base)' }}>
      <div className="px-4 py-3 flex items-center justify-between"
           style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <Link href="/maquetador" className="p-1.5 rounded-md" style={{ color:'var(--text-2)' }}><ArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-sm font-bold flex items-center gap-2" style={{ color:'var(--text-1)' }}>
              <Wand2 size={14} style={{ color:'#A78BFA' }} /> Crear mail desde cero
            </h1>
            <p className="text-[10px]" style={{ color:'var(--text-3)' }}>
              Claude diseña el mail completo a partir de tu descripción + referencias
            </p>
          </div>
        </div>
        {generated && (
          <button onClick={() => setSaveOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
                  style={{ background:'var(--blue)', color:'#fff' }}>
            <Save size={11} /> Guardar como mail
          </button>
        )}
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Form izquierda */}
        <div className="w-full md:w-[420px] flex flex-col shrink-0 overflow-y-auto p-4 gap-3"
             style={{ background:'var(--bg-surface)', borderRight:'1px solid var(--border)' }}>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color:'var(--text-2)' }}>
              Descripción del mail
            </span>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={6} autoFocus
                      placeholder="Ej: Email para anunciar un evento de danza el 15 de junio en Madrid. Tono cercano, mencionar precio especial early bird, CTA para registrarse, incluir 3 highlights del evento."
                      className="w-full mt-1 px-3 py-2 rounded text-sm outline-none resize-none"
                      style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }} />
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color:'var(--text-2)' }}>
              Plantilla base (estilo)
            </span>
            <select value={refTemplate} onChange={e => setRef(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded text-sm outline-none cursor-pointer"
                    style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
              {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <p className="text-[10px] mt-1" style={{ color:'var(--text-3)' }}>
              Claude usará esta plantilla como referencia visual y de estructura.
            </p>
          </label>

          {/* HTML referencia */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color:'var(--text-2)' }}>
              HTML referencia (opcional)
            </span>
            <button onClick={() => htmlInputRef.current?.click()}
                    className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs"
                    style={{ background:'var(--bg-base)', color:'var(--text-2)', border:'1px dashed var(--border)' }}>
              <Paperclip size={11} /> {refHtml ? `HTML cargado (${refHtml.length} chars)` : 'Subir HTML'}
            </button>
            {refHtml && (
              <button onClick={() => setRefHtml('')} className="text-[10px] mt-1" style={{ color:'#EF4444' }}>
                Quitar HTML
              </button>
            )}
            <input ref={htmlInputRef} type="file" accept=".html,.htm,text/html" onChange={attachHtml} className="hidden" />
          </div>

          {/* Imágenes referencia */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color:'var(--text-2)' }}>
              Imágenes referencia (opcional · max 5)
            </span>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img.preview} alt={`ref-${i}`} className="w-full h-20 object-cover rounded" />
                    <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 bg-black rounded-full p-0.5">
                      <X size={9} style={{ color:'#fff' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length < 5 && (
              <button onClick={() => imgInputRef.current?.click()}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs"
                      style={{ background:'var(--bg-base)', color:'var(--text-2)', border:'1px dashed var(--border)' }}>
                <ImageIcon size={11} /> Subir imágenes de referencia
              </button>
            )}
            <input ref={imgInputRef} type="file" accept="image/*" multiple onChange={attachImage} className="hidden" />
          </div>

          <button onClick={generate} disabled={loading || !prompt.trim()}
                  className="mt-2 flex items-center justify-center gap-2 px-3 py-3 rounded-md text-sm font-semibold disabled:opacity-50"
                  style={{ background:'#A78BFA', color:'#fff' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Generando…' : (generated ? 'Regenerar' : 'Generar mail')}
          </button>

          {error && <div className="text-xs px-3 py-2 rounded" style={{ background:'#EF444420', color:'#FCA5A5' }}>{error}</div>}
        </div>

        {/* Preview derecha */}
        <div className="flex-1 flex flex-col min-w-0">
          {!generated ? (
            <div className="flex-1 flex items-center justify-center" style={{ color:'var(--text-3)' }}>
              <div className="text-center max-w-sm">
                <Wand2 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">El mail generado aparecerá aquí</p>
                <p className="text-xs mt-2">Usa el formulario de la izquierda para describir lo que quieres</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 flex items-center gap-2" style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)' }}>
                <div className="flex p-0.5 rounded gap-0.5" style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                  <button onClick={() => setTab('preview')}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px]"
                          style={{ background: tab==='preview' ? 'var(--bg-active)' : 'transparent', color: tab==='preview' ? 'var(--text-1)' : 'var(--text-2)' }}>
                    <Eye size={11} /> Preview
                  </button>
                  <button onClick={() => setTab('code')}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px]"
                          style={{ background: tab==='code' ? 'var(--bg-active)' : 'transparent', color: tab==='code' ? 'var(--text-1)' : 'var(--text-2)' }}>
                    <Code2 size={11} /> Código
                  </button>
                </div>
              </div>
              {tab === 'preview' ? (
                <div className="flex-1 overflow-y-auto p-4" style={{ background:'#EBEBEB' }}>
                  <iframe srcDoc={generated} title="preview"
                          style={{ width:'100%', minHeight:'calc(100vh - 200px)', border:'none', background:'#fff', borderRadius:'12px' }} />
                </div>
              ) : (
                <textarea value={generated} onChange={e => setGen(e.target.value)} spellCheck={false}
                          className="flex-1 p-4 font-mono text-xs outline-none resize-none"
                          style={{ background:'var(--bg-surface)', color:'var(--text-1)', border:'none' }} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal guardar */}
      {saveOpen && (
        <Modal title="Guardar como mail" onClose={() => setSaveOpen(false)}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" autoFocus
                 className="w-full px-3 py-2 rounded-md text-sm outline-none mb-2"
                 style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }} />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción (opcional)"
                 className="w-full px-3 py-2 rounded-md text-sm outline-none mb-2"
                 style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }} />
          <select value={newsletterId} onChange={e => setNl(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none mb-3 cursor-pointer"
                  style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
            {NEWSLETTERS.map(n => <option key={n.id} value={n.id}>{n.id ? `Vincular a: ${n.label}` : n.label}</option>)}
          </select>
          <button onClick={save} disabled={!name.trim() || saving}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                  style={{ background:'var(--blue)', color:'#fff' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Guardar y editar
          </button>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: any) {
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }} onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-md p-5 rounded-lg"
           style={{ background:'var(--bg-surface)', border:'1px solid var(--border-strong)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color:'var(--text-1)' }}>{title}</h3>
          <button onClick={onClose} className="p-1" style={{ color:'var(--text-3)' }}><X size={14} /></button>
        </div>
        {children}
      </div>
    </>
  )
}
