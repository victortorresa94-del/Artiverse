'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, RotateCcw, Send, Sparkles, Loader2, Code2, Eye,
  Download, Smartphone, Monitor, Image as ImageIcon, Wand2, Trash2, Copy, X,
  ChevronDown, FolderOpen, Upload, Tag, Link2, Paperclip,
} from 'lucide-react'

interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
  ts: number
  options?: string[]
  imageUrl?: string  // si el user adjuntó imagen
}

interface MailMeta {
  id: string; name: string; description?: string
  basedOnTemplate?: string; newsletterId?: string
  createdAt: string; updatedAt: string
}

interface BlobFile {
  url: string; pathname: string; size: number; uploadedAt: string; contentType?: string
}

const NEWSLETTERS = [
  { id: 'bienvenida',    name: 'Bienvenida nuevos usuarios' },
  { id: 'licitaciones',  name: 'Licitaciones de la semana' },
  { id: 'talento_mes',   name: 'Talento del mes' },
  { id: 'insights',      name: 'Insights del sector' },
  { id: 'convocatorias', name: 'Convocatorias y festivales' },
]

export default function MailEditor() {
  const { id } = useParams<{ id: string }>()
  const [meta, setMeta]               = useState<MailMeta | null>(null)
  const [html, setHtml]               = useState('')
  const [originalHtml, setOriginal]   = useState('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [view, setView]               = useState<'desktop'|'mobile'>('desktop')
  const [tab, setTab]                 = useState<'preview'|'code'>('preview')
  const [feedback, setFeedback]       = useState<{ type:'ok'|'err'; msg:string } | null>(null)

  // Chat
  const [messages, setMessages]   = useState<ChatMsg[]>([])
  const [input, setInput]         = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [rightPanel, setRightPanel] = useState<'chat'|'files'|null>('chat')
  const [pendingImage, setPendingImage] = useState<{ base64: string; mediaType: string; preview: string } | null>(null)
  const chatImgInputRef = useRef<HTMLInputElement>(null)
  const chatScrollRef   = useRef<HTMLDivElement>(null)

  // Files
  const [files, setFiles] = useState<BlobFile[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Test
  const [testEmail, setTestEmail] = useState('victor@aetherlabs.es')
  const [sendingTest, setSendingTest] = useState(false)

  // Image gen
  const [genOpen, setGenOpen] = useState(false)
  const [genPrompt, setGenPrompt] = useState('')
  const [genAspect, setGenAspect] = useState<'16:9'|'1:1'|'4:3'|'9:16'>('16:9')
  const [generating, setGenerating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [r, rChat, rFiles] = await Promise.all([
        fetch(`/api/drafts/${id}`, { cache: 'no-store' }),
        fetch(`/api/drafts/${id}/chat`, { cache: 'no-store' }),
        fetch('/api/files', { cache: 'no-store' }),
      ])
      const d = await r.json()
      if (!r.ok) { setFeedback({ type:'err', msg: d.error }); return }
      setMeta(d.meta); setHtml(d.html); setOriginal(d.html)
      try {
        const cd = await rChat.json()
        setMessages(Array.isArray(cd.messages) ? cd.messages : [])
      } catch {}
      try {
        const fd = await rFiles.json()
        setFiles(fd.files || [])
      } catch {}
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages, aiLoading])

  const dirty = html !== originalHtml

  async function persistChat(msgs: ChatMsg[]) {
    try {
      await fetch(`/api/drafts/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs }),
      })
    } catch {}
  }

  async function save() {
    setSaving(true); setFeedback(null)
    try {
      const r = await fetch(`/api/drafts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setOriginal(html); setMeta(d.meta)
      setFeedback({ type:'ok', msg: 'Guardado' })
    } catch (e: any) { setFeedback({ type:'err', msg: e.message }) }
    finally { setSaving(false) }
  }

  async function changeNewsletter(newsletterId: string) {
    try {
      const r = await fetch(`/api/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletterId: newsletterId || null }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setMeta(d.meta)
      setFeedback({ type:'ok', msg: newsletterId ? `Vinculado a ${NEWSLETTERS.find(n=>n.id===newsletterId)?.name}` : 'Desvinculado' })
    } catch (e: any) { setFeedback({ type:'err', msg: e.message }) }
  }

  async function loadFiles() {
    setFilesLoading(true)
    try { const r = await fetch('/api/files', { cache: 'no-store' }); setFiles((await r.json()).files || []) }
    finally { setFilesLoading(false) }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setFeedback(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/files', { method:'POST', body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      await loadFiles()
      navigator.clipboard?.writeText(d.url)
      setFeedback({ type:'ok', msg: `Subida. URL copiada al portapapeles.` })
    } catch (e: any) { setFeedback({ type:'err', msg: e.message }) }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  // ── Adjuntar imagen al chat (no sube, solo la pasa a Claude Vision) ──
  async function attachChatImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { alert('Máximo 4MB para imágenes en chat'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      setPendingImage({ base64, mediaType: file.type, preview: result })
    }
    reader.readAsDataURL(file)
    if (chatImgInputRef.current) chatImgInputRef.current.value = ''
  }

  // ── Send chat ──
  async function sendChat() {
    const trimmed = input.trim()
    if (!trimmed && !pendingImage) return
    const userMsg: ChatMsg = {
      role:'user',
      text: trimmed || '(adjunto imagen)',
      ts: Date.now(),
      imageUrl: pendingImage?.preview,
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    const instruction = trimmed || 'Mira la imagen adjunta y aplica los cambios indicados/inferidos al email'
    const sentImage = pendingImage
    setInput(''); setPendingImage(null); setAiLoading(true)

    try {
      const r = await fetch(`/api/drafts/${id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html, instruction,
          history: messages.map(m => ({ role: m.role, text: m.text })),
          image: sentImage ? { base64: sentImage.base64, mediaType: sentImage.mediaType } : undefined,
        }),
      })
      const text = await r.text()
      let d: any
      try { d = JSON.parse(text) } catch {
        throw new Error(r.status === 504 ? 'Tardó demasiado.' : `Error ${r.status}: ${text.slice(0, 200)}`)
      }
      if (!r.ok) throw new Error(d.error)

      if (d.type === 'question') {
        const finalMsgs: ChatMsg[] = [...newMessages, {
          role:'assistant', text: `❓ ${d.question}`, ts: Date.now(),
          options: Array.isArray(d.options) ? d.options : [],
        }]
        setMessages(finalMsgs); persistChat(finalMsgs); return
      }

      setHtml(d.html)
      const summary = d.summary || 'Cambio aplicado'
      const failed  = (d.patches || []).filter((p: any) => !p.ok).length
      const failedDetail = failed > 0 ? ` (${failed} no aplicados)` : ''
      const richText = `✓ ${summary}${failedDetail}`
      const finalMsgs: ChatMsg[] = [...newMessages, { role:'assistant', text: richText, ts: Date.now() }]
      setMessages(finalMsgs); persistChat(finalMsgs)
    } catch (e: any) {
      const errMsgs: ChatMsg[] = [...newMessages, { role:'assistant', text:`❌ ${e.message}`, ts: Date.now() }]
      setMessages(errMsgs); persistChat(errMsgs)
    } finally { setAiLoading(false) }
  }

  function pickOption(opt: string) {
    setInput(opt)
    setTimeout(() => sendChat(), 50)
  }

  async function clearChat() {
    if (!confirm('¿Borrar historial del chat?')) return
    setMessages([])
    try { await fetch(`/api/drafts/${id}/chat`, { method:'DELETE' }) } catch {}
  }

  async function sendTest() {
    if (!testEmail.trim()) return
    setSendingTest(true); setFeedback(null)
    try {
      if (dirty && !confirm('¿Guardar cambios antes del test?')) { setSendingTest(false); return }
      if (dirty) await save()
      // El endpoint welcome/send lee del mail vinculado a "bienvenida" si existe
      // Pero queremos enviar ESTE mail, no el vinculado. Hacemos render manual.
      const renderedHtml = html
        .replace(/\{\{firstName\}\}/g, 'Test')
        .replace(/\{\{email\}\}/g, testEmail)
        .replace(/\{\{unsubscribe_url\}\}/g, '#')
      const r = await fetch('/api/welcome/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail.trim(), firstName: 'Test', test: true }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setFeedback({ type:'ok', msg: `Test enviado a ${testEmail}. Nota: si este mail no está vinculado a 'bienvenida', se envió el welcome general.` })
    } catch (e: any) { setFeedback({ type:'err', msg: e.message }) }
    finally { setSendingTest(false) }
  }

  async function generateImage() {
    if (!genPrompt.trim()) return
    setGenerating(true)
    try {
      const r = await fetch('/api/files/generate', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ prompt: genPrompt, aspect: genAspect }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      navigator.clipboard?.writeText(d.url)
      setFeedback({ type:'ok', msg:`Imagen generada. URL copiada.` })
      await loadFiles()
      setGenOpen(false); setGenPrompt('')
    } catch (e: any) { setFeedback({ type:'err', msg: e.message }) }
    finally { setGenerating(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen" style={{ color:'var(--text-2)' }}>
      <Loader2 className="animate-spin mr-2" size={18} /> Cargando…
    </div>
  }

  if (!meta) {
    return <div className="p-8 text-center">
      <p style={{ color:'#FCA5A5' }}>Mail no encontrado</p>
      <Link href="/maquetador" className="text-sm" style={{ color:'var(--blue)' }}>← Volver</Link>
    </div>
  }

  const linkedNl = NEWSLETTERS.find(n => n.id === meta.newsletterId)

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap"
           style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/maquetador" className="p-1" style={{ color:'var(--text-2)' }}><ArrowLeft size={16} /></Link>
          <Mail size={16} style={{ color: '#CCFF00' }} />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold truncate" style={{ color:'var(--text-1)' }}>{meta.name}</p>
            <div className="flex items-center gap-1.5">
              {linkedNl && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1"
                      style={{ background:'#22C55E25', color:'#22C55E' }}>
                  <Link2 size={8} /> {linkedNl.name}
                </span>
              )}
              {meta.basedOnTemplate && (
                <span className="text-[9px] px-1 py-0.5 rounded uppercase tracking-wider"
                      style={{ background:'var(--bg-elevated)', color:'var(--text-3)' }}>
                  base: {meta.basedOnTemplate}
                </span>
              )}
            </div>
          </div>
          {dirty && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background:'#F59E0B25', color:'#F59E0B' }}>•</span>}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={meta.newsletterId || ''} onChange={e => changeNewsletter(e.target.value)}
            className="px-2 py-1 rounded text-[11px] outline-none cursor-pointer"
            style={{ background:'var(--bg-elevated)', color:'var(--text-1)', border:'1px solid var(--border)' }}
            title="Vincular a newsletter"
          >
            <option value="">Sin newsletter</option>
            {NEWSLETTERS.map(n => <option key={n.id} value={n.id}>↪ {n.name}</option>)}
          </select>
          <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                 className="px-2 py-1 rounded text-xs outline-none w-40"
                 style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }} />
          <IconBtn icon={Send} onClick={sendTest} loading={sendingTest} title="Test" />
          <IconBtn icon={ImageIcon} onClick={() => fileInputRef.current?.click()} loading={uploading} title="Subir imagen" />
          <IconBtn icon={Wand2} onClick={() => setGenOpen(true)} title="Generar imagen IA" color="#A78BFA" />
          <IconBtn icon={Download} onClick={() => {
            const blob = new Blob([html], { type:'text/html' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${meta.name}.html`; a.click()
          }} title="Descargar" />
          <button onClick={save} disabled={saving || !dirty}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-40"
                  style={{ background:'var(--blue)', color:'#fff' }}>
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Guardar
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      </div>

      {feedback && (
        <div className="px-4 py-2 text-xs flex items-center justify-between"
             style={{
               background: feedback.type === 'ok' ? '#22C55E20' : '#EF444420',
               color:      feedback.type === 'ok' ? '#22C55E' : '#FCA5A5',
               borderBottom: '1px solid var(--border)',
             }}>
          <span className="truncate">{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="opacity-60"><X size={12} /></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="px-4 py-2 flex items-center justify-between"
           style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)' }}>
        <div className="flex p-0.5 rounded gap-0.5" style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
          <ToggleBtn active={tab==='preview'} icon={Eye}   label="Preview" onClick={() => setTab('preview')} />
          <ToggleBtn active={tab==='code'}    icon={Code2} label="Código"  onClick={() => setTab('code')} />
        </div>
        <div className="flex gap-1.5">
          {tab === 'preview' && (
            <div className="flex p-0.5 rounded gap-0.5" style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
              <ToggleBtn active={view==='desktop'} icon={Monitor}    label="Desktop" onClick={() => setView('desktop')} />
              <ToggleBtn active={view==='mobile'}  icon={Smartphone} label="Mobile"  onClick={() => setView('mobile')} />
            </div>
          )}
          <div className="hidden md:flex p-0.5 rounded gap-0.5" style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
            <ToggleBtn active={rightPanel==='chat'}  icon={Sparkles}   label="IA"       onClick={() => setRightPanel(p => p==='chat'?null:'chat')} />
            <ToggleBtn active={rightPanel==='files'} icon={FolderOpen} label="Archivos" onClick={() => setRightPanel(p => p==='files'?null:'files')} />
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 flex flex-col">
          {tab === 'preview' ? (
            <div className="flex-1 p-4 overflow-y-auto" style={{ background:'#EBEBEB' }}>
              <div className="mx-auto" style={{ maxWidth: view === 'mobile' ? '375px' : '100%' }}>
                <iframe srcDoc={html} title="preview"
                        style={{ width:'100%', minHeight:'calc(100vh - 240px)', border:'none', background:'#fff', borderRadius:'12px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }} />
              </div>
            </div>
          ) : (
            <textarea value={html} onChange={e => setHtml(e.target.value)} spellCheck={false}
                      className="flex-1 p-4 font-mono text-xs outline-none resize-none"
                      style={{ background:'var(--bg-surface)', color:'var(--text-1)', border:'none', lineHeight:1.5 }} />
          )}
        </div>

        {rightPanel === 'chat' && (
          <ChatPanel
            messages={messages} input={input} setInput={setInput}
            aiLoading={aiLoading} sendChat={sendChat}
            onClose={() => setRightPanel(null)}
            onClear={clearChat}
            onPickOption={pickOption}
            scrollRef={chatScrollRef}
            pendingImage={pendingImage}
            onAttachImage={() => chatImgInputRef.current?.click()}
            onClearImage={() => setPendingImage(null)}
          />
        )}
        {rightPanel === 'files' && (
          <FilesPanel files={files} loading={filesLoading}
                      onCopy={url => { navigator.clipboard?.writeText(url); setFeedback({ type:'ok', msg:'URL copiada' }) }}
                      onDelete={async url => {
                        if (!confirm('¿Borrar?')) return
                        await fetch('/api/files/delete', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ url }) })
                        await loadFiles()
                      }}
                      onClose={() => setRightPanel(null)}
                      onReload={loadFiles} />
        )}

        <input ref={chatImgInputRef} type="file" accept="image/*" onChange={attachChatImage} className="hidden" />
      </div>

      {/* Generate image modal */}
      {genOpen && (
        <Modal title="Generar imagen con IA" onClose={() => setGenOpen(false)}>
          <textarea value={genPrompt} onChange={e => setGenPrompt(e.target.value)}
                    placeholder="Describe en inglés (ej: cinematic photo of dancers on stage)" rows={3}
                    className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none mb-3"
                    style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }} />
          <div className="flex gap-2 mb-3 flex-wrap">
            {(['16:9','4:3','1:1','9:16'] as const).map(a => (
              <button key={a} onClick={() => setGenAspect(a)}
                      className="px-2.5 py-1 rounded text-[11px] font-medium"
                      style={{ background: genAspect===a ? 'var(--blue)' : 'var(--bg-base)', color: genAspect===a ? '#fff' : 'var(--text-2)', border:'1px solid var(--border)' }}>
                {a}
              </button>
            ))}
          </div>
          <button onClick={generateImage} disabled={generating || !genPrompt.trim()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                  style={{ background:'#A78BFA', color:'#fff' }}>
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Generar
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ToggleBtn({ active, icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium"
            style={{ background: active ? 'var(--bg-active)' : 'transparent', color: active ? 'var(--text-1)' : 'var(--text-2)' }}>
      <Icon size={11} /> {label}
    </button>
  )
}

function IconBtn({ icon: Icon, onClick, loading, title, color }: any) {
  return (
    <button onClick={onClick} title={title}
            className="p-1.5 rounded-md disabled:opacity-50"
            style={{ background:'var(--bg-elevated)', color: color || 'var(--text-2)', border:'1px solid var(--border)' }}>
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
    </button>
  )
}

function ChatPanel({
  messages, input, setInput, aiLoading, sendChat, onClose, onClear, onPickOption,
  scrollRef, pendingImage, onAttachImage, onClearImage,
}: any) {
  return (
    <div className="hidden md:flex w-[380px] flex-col shrink-0"
         style={{ background:'var(--bg-surface)', borderLeft:'1px solid var(--border)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid var(--border)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} style={{ color:'#A78BFA', flexShrink:0 }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color:'var(--text-1)' }}>
            Editar con IA · {messages.length}
          </h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <button onClick={onClear} className="p-1" style={{ color:'var(--text-3)' }} title="Borrar historial">
              <Trash2 size={11} />
            </button>
          )}
          <button onClick={onClose} className="p-1" style={{ color:'var(--text-3)' }}><X size={13} /></button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="text-xs space-y-2" style={{ color:'var(--text-3)' }}>
            <p>Habla en español. Ejemplos:</p>
            <ul className="space-y-1 pl-3">
              <li>• "negrita en X"</li>
              <li>• "cambia el color del botón a azul"</li>
              <li>• "borra la imagen de los bailarines"</li>
              <li>• "mejora la firma"</li>
            </ul>
            <p className="mt-2">Adjunta una captura con 📎 para que vea lo que quieres cambiar.</p>
          </div>
        )}
        {messages.map((m: ChatMsg, i: number) => (
          <div key={i} className="px-3 py-2 rounded-lg text-xs"
               style={{ background: m.role==='user' ? 'var(--bg-active)' : 'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
            <p className="text-[9px] uppercase tracking-wider mb-1 font-semibold" style={{ color:'var(--text-3)' }}>
              {m.role==='user' ? 'Tú' : 'Claude'}
            </p>
            {m.imageUrl && <img src={m.imageUrl} alt="adjunto" className="max-w-full rounded mb-2 max-h-32 object-cover" />}
            <p style={{ whiteSpace:'pre-wrap' }}>{m.text}</p>
            {m.options && m.options.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {m.options.map((opt: string, j: number) => (
                  <button key={j} onClick={() => onPickOption(opt)}
                          className="text-[10px] px-2 py-1 rounded font-medium"
                          style={{ background:'var(--bg-elevated)', color:'#A78BFA', border:'1px solid #A78BFA40' }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {aiLoading && (
          <div className="flex items-center gap-2 text-xs px-3 py-2" style={{ color:'var(--text-2)' }}>
            <Loader2 size={12} className="animate-spin" /> Pensando…
          </div>
        )}
      </div>

      <div className="p-3 space-y-2" style={{ borderTop:'1px solid var(--border)' }}>
        {pendingImage && (
          <div className="relative inline-block">
            <img src={pendingImage.preview} alt="adjunta" className="h-16 w-16 object-cover rounded" />
            <button onClick={onClearImage} className="absolute -top-1 -right-1 bg-black rounded-full p-0.5">
              <X size={10} style={{ color:'#fff' }} />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <button onClick={onAttachImage} className="p-2 rounded shrink-0" style={{ background:'var(--bg-base)', border:'1px solid var(--border)', color:'var(--text-2)' }} title="Adjuntar imagen">
            <Paperclip size={12} />
          </button>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="¿Qué cambias?" rows={2}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendChat()
                      }
                    }}
                    className="flex-1 px-2.5 py-2 rounded text-xs outline-none resize-none"
                    style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }} />
          <button onClick={sendChat} disabled={aiLoading || (!input.trim() && !pendingImage)}
                  className="p-2 rounded shrink-0 disabled:opacity-40"
                  style={{ background:'#A78BFA', color:'#fff' }}>
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
        <p className="text-[10px] text-center" style={{ color:'var(--text-3)' }}>
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  )
}

function FilesPanel({ files, loading, onCopy, onDelete, onClose, onReload }: any) {
  return (
    <div className="hidden md:flex w-[360px] flex-col shrink-0"
         style={{ background:'var(--bg-surface)', borderLeft:'1px solid var(--border)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid var(--border)' }}>
        <div className="flex items-center gap-2"><FolderOpen size={14} style={{ color:'#60A5FA' }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color:'var(--text-1)' }}>Archivos · {files.length}</h2>
        </div>
        <div className="flex gap-1">
          <button onClick={onReload} className="p-1" style={{ color:'var(--text-3)' }}>↻</button>
          <button onClick={onClose} className="p-1" style={{ color:'var(--text-3)' }}><X size={13} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && <p className="text-xs" style={{ color:'var(--text-3)' }}>Cargando…</p>}
        {!loading && files.length === 0 && <p className="text-xs text-center py-8" style={{ color:'var(--text-3)' }}>Sin archivos</p>}
        {files.map((f: BlobFile) => (
          <div key={f.url} className="rounded-md p-2" style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>
            {f.contentType?.startsWith('image/') && <img src={f.url} alt={f.pathname} className="w-full h-24 object-cover rounded mb-2" />}
            <p className="text-[10px] truncate" style={{ color:'var(--text-1)' }}>{f.pathname}</p>
            <p className="text-[9px] mb-2" style={{ color:'var(--text-3)' }}>{(f.size/1024).toFixed(0)}KB</p>
            <div className="flex gap-1">
              <button onClick={() => onCopy(f.url)} className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1 rounded"
                      style={{ background:'var(--bg-elevated)', color:'var(--text-1)' }}>
                <Copy size={10} /> URL
              </button>
              <button onClick={() => onDelete(f.url)} className="px-2 text-[10px] py-1 rounded"
                      style={{ background:'#EF444420', color:'#EF4444' }}>
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
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
