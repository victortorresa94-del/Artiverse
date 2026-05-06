'use client'
import { useEffect, useState, useRef } from 'react'
import {
  Save, RotateCcw, Send, Sparkles, Loader2, Code2, Eye,
  Download, Smartphone, Monitor, Mail, Image as ImageIcon, Plus,
  FolderOpen, Upload, Wand2, Trash2, Copy, X, ChevronDown,
} from 'lucide-react'

interface ChatMsg { role: 'user'|'assistant'; text: string; ts: number }

interface TemplateMeta {
  id:          string
  name:        string
  description?:string
  createdAt:   string
  updatedAt:   string
  builtin?:    boolean
}

interface BlobFile {
  url:        string
  pathname:   string
  size:       number
  uploadedAt: string
  contentType?: string
}

export default function MaquetadorPage() {
  // Templates
  const [templates, setTemplates]       = useState<TemplateMeta[]>([])
  const [activeId, setActiveId]         = useState<string>('welcome')
  const [showTplPicker, setShowTplPicker] = useState(false)

  // HTML
  const [html, setHtml]               = useState<string>('')
  const [originalHtml, setOriginal]   = useState<string>('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)

  // UI
  const [view, setView]               = useState<'desktop'|'mobile'>('desktop')
  const [tab, setTab]                 = useState<'preview'|'code'>('preview')
  const [feedback, setFeedback]       = useState<{ type:'ok'|'err'; msg: string } | null>(null)

  // AI chat
  const [messages, setMessages]   = useState<ChatMsg[]>([])
  const [input, setInput]         = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [rightPanel, setRightPanel] = useState<'chat'|'files'|null>('chat')

  // Files
  const [files, setFiles]                 = useState<BlobFile[]>([])
  const [filesLoading, setFilesLoading]   = useState(false)
  const [uploading, setUploading]         = useState(false)
  const fileInputRef                      = useRef<HTMLInputElement>(null)
  const htmlInputRef                      = useRef<HTMLInputElement>(null)

  // Image generator
  const [genOpen, setGenOpen]   = useState(false)
  const [genPrompt, setGenPrompt] = useState('')
  const [genAspect, setGenAspect] = useState<'16:9'|'1:1'|'4:3'|'9:16'>('16:9')
  const [generating, setGenerating] = useState(false)

  // New template modal
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  // Test send
  const [testEmail, setTestEmail]     = useState('victor@aetherlabs.es')
  const [sendingTest, setSendingTest] = useState(false)

  // ── Load templates list
  async function loadTemplates() {
    try {
      const r = await fetch('/api/maquetador', { cache: 'no-store' })
      const d = await r.json()
      if (r.ok) setTemplates(d.templates || [])
    } catch {}
  }

  // ── Load template HTML
  async function loadTpl(id: string) {
    setLoading(true); setFeedback(null); setActiveId(id)
    try {
      const r = await fetch(`/api/maquetador/${id}`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setHtml(d.html); setOriginal(d.html)
    } catch (e: any) {
      setFeedback({ type:'err', msg: e.message })
    } finally {
      setLoading(false)
    }
  }

  // ── Load files
  async function loadFiles() {
    setFilesLoading(true)
    try {
      const r = await fetch('/api/files', { cache: 'no-store' })
      const d = await r.json()
      setFiles(d.files || [])
    } catch {} finally { setFilesLoading(false) }
  }

  useEffect(() => { loadTemplates(); loadTpl('welcome'); loadFiles() }, [])

  const dirty = html !== originalHtml
  const activeTpl = templates.find(t => t.id === activeId)

  // ── Save template
  async function save() {
    setSaving(true); setFeedback(null)
    try {
      const r = await fetch(`/api/maquetador/${activeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setOriginal(html)
      setFeedback({ type:'ok', msg: 'Guardado' })
    } catch (e: any) { setFeedback({ type:'err', msg: e.message }) }
    finally { setSaving(false) }
  }

  // ── Restore default
  async function restoreDefault() {
    if (!confirm('¿Restaurar al HTML original? Cambios guardados se pierden.')) return
    await fetch(`/api/maquetador/${activeId}`, { method: 'DELETE' })
    await loadTpl(activeId)
    setFeedback({ type:'ok', msg: 'Restaurado' })
  }

  // ── New template
  async function createNew() {
    if (!newName.trim()) return
    try {
      const r = await fetch('/api/maquetador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        newName.trim(),
          description: newDesc.trim() || undefined,
          html:        html || '<!DOCTYPE html><html><body><h1>Nuevo template</h1></body></html>',
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      await loadTemplates()
      await loadTpl(d.template.id)
      setNewOpen(false); setNewName(''); setNewDesc('')
      setFeedback({ type:'ok', msg: `Creado: ${d.template.name}` })
    } catch (e: any) { setFeedback({ type:'err', msg: e.message }) }
  }

  // ── Upload HTML
  async function handleHtmlUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    if (!text.includes('<')) { setFeedback({ type:'err', msg: 'No parece HTML válido' }); return }
    setHtml(text)
    setFeedback({ type:'ok', msg: `HTML cargado de ${file.name}. Guarda para persistir.` })
    if (htmlInputRef.current) htmlInputRef.current.value = ''
  }

  // ── Upload image
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setFeedback(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/files', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      await loadFiles()
      navigator.clipboard?.writeText(d.url)
      setFeedback({ type:'ok', msg: `Subido. URL copiada: ${d.url}` })
      setRightPanel('files')
    } catch (err: any) { setFeedback({ type:'err', msg: err.message }) }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  // ── Generate image
  async function generateImage() {
    if (!genPrompt.trim()) return
    setGenerating(true); setFeedback(null)
    try {
      const r = await fetch('/api/files/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: genPrompt.trim(), aspect: genAspect }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      navigator.clipboard?.writeText(d.url)
      setFeedback({ type:'ok', msg: `Imagen generada. URL copiada: ${d.url}${d.warning ? ' · ⚠ ' + d.warning : ''}` })
      await loadFiles()
      setGenOpen(false); setGenPrompt('')
      setRightPanel('files')
    } catch (e: any) { setFeedback({ type:'err', msg: e.message }) }
    finally { setGenerating(false) }
  }

  // ── Delete file
  async function deleteFile(url: string) {
    if (!confirm('¿Borrar esta imagen?')) return
    try {
      await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      await loadFiles()
    } catch {}
  }

  // ── AI chat
  async function sendChat() {
    if (!input.trim()) return
    const userMsg: ChatMsg = { role:'user', text: input.trim(), ts: Date.now() }
    setMessages(m => [...m, userMsg])
    const instruction = input.trim(); setInput(''); setAiLoading(true)
    try {
      const r = await fetch(`/api/maquetador/${activeId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, instruction }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setHtml(d.html)
      setMessages(m => [...m, { role:'assistant', text:'✓ Cambio aplicado. Revisa el preview. Si te gusta, guarda.', ts: Date.now() }])
    } catch (e: any) {
      setMessages(m => [...m, { role:'assistant', text:`❌ ${e.message}`, ts: Date.now() }])
    } finally { setAiLoading(false) }
  }

  // ── Test send
  async function sendTest() {
    if (!testEmail.trim()) return
    setSendingTest(true); setFeedback(null)
    try {
      if (dirty && !confirm('¿Guardar cambios antes de enviar test?')) {
        setSendingTest(false); return
      }
      if (dirty) await save()
      const r = await fetch('/api/welcome/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail.trim(), firstName: 'Test', test: true }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setFeedback({ type:'ok', msg: `Test enviado a ${testEmail}` })
    } catch (e: any) { setFeedback({ type:'err', msg: e.message }) }
    finally { setSendingTest(false) }
  }

  function copyUrl(url: string) {
    navigator.clipboard?.writeText(url)
    setFeedback({ type:'ok', msg: `URL copiada: ${url.slice(0, 60)}…` })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div
        className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 min-w-0 relative">
          <Mail size={16} style={{ color: '#CCFF00' }} />
          <button
            onClick={() => setShowTplPicker(o => !o)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
          >
            <span className="truncate max-w-[180px]">{activeTpl?.name || activeId}</span>
            <ChevronDown size={11} />
          </button>
          {dirty && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0"
                  style={{ background:'#F59E0B25', color:'#F59E0B' }}>•</span>
          )}

          {/* Template picker dropdown */}
          {showTplPicker && (
            <div
              className="absolute top-full left-0 mt-1 z-30 rounded-lg shadow-2xl py-1 min-w-[280px]"
              style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-strong)' }}
            >
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => { loadTpl(t.id); setShowTplPicker(false) }}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color:'var(--text-1)' }}>{t.name}</span>
                    {t.builtin && <span className="text-[9px] px-1 rounded" style={{ background:'var(--bg-base)', color:'var(--text-3)' }}>builtin</span>}
                  </div>
                  {t.description && <p className="text-[10px] mt-0.5" style={{ color:'var(--text-3)' }}>{t.description}</p>}
                </button>
              ))}
              <div style={{ borderTop:'1px solid var(--border)' }} className="mt-1 pt-1">
                <button
                  onClick={() => { setShowTplPicker(false); setNewOpen(true) }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/5"
                  style={{ color:'#A78BFA' }}
                >
                  <Plus size={11} /> <span className="text-xs">Nuevo template</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <input
            type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
            placeholder="email test"
            className="px-2 py-1 rounded text-xs outline-none w-40 sm:w-48"
            style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }}
          />
          <IconBtn icon={Send}      onClick={sendTest}    disabled={sendingTest} loading={sendingTest} title="Enviar test" />
          <IconBtn icon={Upload}    onClick={() => htmlInputRef.current?.click()} title="Subir HTML" />
          <IconBtn icon={ImageIcon} onClick={() => fileInputRef.current?.click()} disabled={uploading} loading={uploading} title="Subir imagen" />
          <IconBtn icon={Wand2}     onClick={() => setGenOpen(true)} title="Generar imagen IA" color="#A78BFA" />
          <IconBtn icon={Download}  onClick={() => {
            const blob = new Blob([html], { type:'text/html' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${activeId}.html`; a.click()
          }} title="Descargar HTML" />
          <IconBtn icon={RotateCcw} onClick={restoreDefault} title="Restaurar" />
          <button
            onClick={save} disabled={saving || !dirty}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background:'var(--blue)', color:'#fff' }}
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Guardar
          </button>
        </div>

        {/* Hidden inputs */}
        <input ref={htmlInputRef} type="file" accept=".html,.htm,text/html" onChange={handleHtmlUpload} className="hidden" />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      </div>

      {feedback && (
        <div
          className="px-4 py-2 text-xs flex items-center justify-between"
          style={{
            background: feedback.type === 'ok' ? '#22C55E20' : '#EF444420',
            color:      feedback.type === 'ok' ? '#22C55E' : '#FCA5A5',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span className="truncate">{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="shrink-0 ml-2 opacity-60 hover:opacity-100"><X size={12} /></button>
        </div>
      )}

      {/* Toolbar */}
      <div
        className="px-4 py-2 flex items-center gap-2 justify-between"
        style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)' }}
      >
        <div className="flex p-0.5 rounded gap-0.5" style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
          <ToggleBtn active={tab === 'preview'} icon={Eye}   label="Preview" onClick={() => setTab('preview')} />
          <ToggleBtn active={tab === 'code'}    icon={Code2} label="Código"  onClick={() => setTab('code')} />
        </div>
        <div className="flex gap-1.5">
          {tab === 'preview' && (
            <div className="flex p-0.5 rounded gap-0.5" style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
              <ToggleBtn active={view === 'desktop'} icon={Monitor}    label="Desktop" onClick={() => setView('desktop')} />
              <ToggleBtn active={view === 'mobile'}  icon={Smartphone} label="Mobile"  onClick={() => setView('mobile')} />
            </div>
          )}
          <div className="hidden md:flex p-0.5 rounded gap-0.5" style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
            <ToggleBtn active={rightPanel === 'chat'}  icon={Sparkles}   label="IA"        onClick={() => setRightPanel(p => p === 'chat'  ? null : 'chat')} />
            <ToggleBtn active={rightPanel === 'files'} icon={FolderOpen} label="Archivos"  onClick={() => setRightPanel(p => p === 'files' ? null : 'files')} />
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex min-h-0">
        {/* Editor / preview */}
        <div className="flex-1 min-w-0 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-2)' }}>
              <Loader2 size={20} className="animate-spin mr-2" /> Cargando…
            </div>
          ) : tab === 'preview' ? (
            <div className="flex-1 p-4 overflow-y-auto" style={{ background: '#EBEBEB' }}>
              <div className="mx-auto" style={{ maxWidth: view === 'mobile' ? '375px' : '100%' }}>
                <iframe
                  srcDoc={html} title="preview"
                  style={{
                    width: '100%', minHeight: 'calc(100vh - 240px)', border: 'none',
                    background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  }}
                />
              </div>
            </div>
          ) : (
            <textarea
              value={html} onChange={e => setHtml(e.target.value)} spellCheck={false}
              onDragOver={e => e.preventDefault()}
              onDrop={async e => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (!file) return
                if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
                  // HTML arrastrado → cargar al editor
                  const text = await file.text()
                  setHtml(text)
                  setFeedback({ type:'ok', msg: `HTML cargado de ${file.name}. Guarda para persistir.` })
                } else if (file.type.startsWith('image/')) {
                  // Imagen arrastrada → subir vía endpoint
                  setUploading(true); setFeedback(null)
                  try {
                    const fd = new FormData(); fd.append('file', file)
                    const r = await fetch('/api/files', { method: 'POST', body: fd })
                    const d = await r.json()
                    if (!r.ok) throw new Error(d.error)
                    await loadFiles()
                    navigator.clipboard?.writeText(d.url)
                    setFeedback({ type:'ok', msg: `Imagen subida. URL copiada: ${d.url}` })
                    setRightPanel('files')
                  } catch (err: any) { setFeedback({ type:'err', msg: err.message }) }
                  finally { setUploading(false) }
                } else {
                  setFeedback({ type:'err', msg: `Tipo no soportado: ${file.type || file.name}` })
                }
              }}
              className="flex-1 p-4 font-mono text-xs outline-none resize-none"
              style={{ background:'var(--bg-surface)', color:'var(--text-1)', border:'none', lineHeight:1.5 }}
            />
          )}
        </div>

        {/* Right panel */}
        {rightPanel === 'chat' && (
          <ChatPanel
            messages={messages} input={input} setInput={setInput}
            aiLoading={aiLoading} sendChat={sendChat}
            onClose={() => setRightPanel(null)}
          />
        )}
        {rightPanel === 'files' && (
          <FilesPanel
            files={files} loading={filesLoading}
            onCopy={copyUrl} onDelete={deleteFile}
            onClose={() => setRightPanel(null)}
            onReload={loadFiles}
          />
        )}

        {/* Mobile floating button */}
        {!rightPanel && (
          <button
            onClick={() => setRightPanel('chat')}
            className="md:hidden fixed bottom-4 right-4 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl"
            style={{ background:'#A78BFA', color:'#fff' }}
          >
            <Sparkles size={14} /> IA
          </button>
        )}
      </div>

      {/* Generate image modal */}
      {genOpen && (
        <Modal title="Generar imagen con IA" onClose={() => setGenOpen(false)}>
          <textarea
            value={genPrompt} onChange={e => setGenPrompt(e.target.value)}
            placeholder="Describe la imagen en inglés (ej: cinematic photo of dancers on stage with dramatic lighting)"
            rows={3}
            className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none mb-3"
            style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }}
          />
          <div className="flex gap-2 mb-3 flex-wrap">
            {(['16:9','4:3','1:1','9:16'] as const).map(a => (
              <button
                key={a}
                onClick={() => setGenAspect(a)}
                className="px-2.5 py-1 rounded text-[11px] font-medium"
                style={{
                  background: genAspect === a ? 'var(--blue)' : 'var(--bg-base)',
                  color:      genAspect === a ? '#fff' : 'var(--text-2)',
                  border:     '1px solid var(--border)',
                }}
              >
                {a}
              </button>
            ))}
          </div>
          <button
            onClick={generateImage} disabled={generating || !genPrompt.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
            style={{ background:'#A78BFA', color:'#fff' }}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {generating ? 'Generando…' : 'Generar (Flux Schnell)'}
          </button>
          <p className="text-[10px] mt-3" style={{ color:'var(--text-3)' }}>
            La imagen se guarda en Vercel Blob (URL permanente) y se copia al clipboard.
          </p>
        </Modal>
      )}

      {/* New template modal */}
      {newOpen && (
        <Modal title="Nuevo template" onClose={() => setNewOpen(false)}>
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nombre (ej: Licitaciones semanales)"
            className="w-full px-3 py-2 rounded-md text-sm outline-none mb-2"
            style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }}
          />
          <input
            value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full px-3 py-2 rounded-md text-sm outline-none mb-3"
            style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }}
          />
          <p className="text-[10px] mb-3" style={{ color:'var(--text-3)' }}>
            Se creará usando el HTML actual del editor como base.
          </p>
          <button
            onClick={createNew} disabled={!newName.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
            style={{ background:'var(--blue)', color:'#fff' }}
          >
            <Plus size={14} /> Crear template
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ToggleBtn({ active, icon: Icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all"
      style={{
        background: active ? 'var(--bg-active)' : 'transparent',
        color:      active ? 'var(--text-1)' : 'var(--text-2)',
      }}
    >
      <Icon size={11} /> {label}
    </button>
  )
}

function IconBtn({ icon: Icon, onClick, disabled, loading, title, color }: any) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className="p-1.5 rounded-md transition-all disabled:opacity-50"
      style={{ background:'var(--bg-elevated)', color: color || 'var(--text-2)', border:'1px solid var(--border)' }}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
    </button>
  )
}

function ChatPanel({ messages, input, setInput, aiLoading, sendChat, onClose }: any) {
  return (
    <div
      className="hidden md:flex w-[360px] flex-col shrink-0"
      style={{ background:'var(--bg-surface)', borderLeft:'1px solid var(--border)' }}
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color:'#A78BFA' }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color:'var(--text-1)' }}>Editar con IA</h2>
        </div>
        <button onClick={onClose} className="p-1" style={{ color:'var(--text-3)' }}><X size={13} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="text-xs space-y-2" style={{ color:'var(--text-3)' }}>
            <p>Ejemplos:</p>
            <ul className="space-y-1 pl-3">
              <li>• "Pon el título en negrita"</li>
              <li>• "Cambia el color del botón a azul"</li>
              <li>• "Quita el bloque del mockup"</li>
              <li>• "Reemplaza la imagen del hero por https://..."</li>
            </ul>
          </div>
        )}
        {messages.map((m: ChatMsg, i: number) => (
          <div key={i} className="px-3 py-2 rounded-lg text-xs"
               style={{
                 background: m.role === 'user' ? 'var(--bg-active)' : 'var(--bg-base)',
                 color:'var(--text-1)', border:'1px solid var(--border)',
               }}>
            <p className="text-[9px] uppercase tracking-wider mb-1 font-semibold" style={{ color:'var(--text-3)' }}>
              {m.role === 'user' ? 'Tú' : 'Claude'}
            </p>
            <p style={{ whiteSpace:'pre-wrap' }}>{m.text}</p>
          </div>
        ))}
        {aiLoading && (
          <div className="flex items-center gap-2 text-xs px-3 py-2" style={{ color:'var(--text-2)' }}>
            <Loader2 size={12} className="animate-spin" /> Modificando HTML…
          </div>
        )}
      </div>
      <div className="p-3 space-y-2" style={{ borderTop:'1px solid var(--border)' }}>
        <textarea
          value={input} onChange={e => setInput(e.target.value)} placeholder="¿Qué cambias?" rows={3}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendChat() } }}
          className="w-full px-2.5 py-2 rounded text-xs outline-none resize-none"
          style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }}
        />
        <button
          onClick={sendChat} disabled={aiLoading || !input.trim()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold disabled:opacity-40"
          style={{ background:'#A78BFA', color:'#fff' }}
        >
          {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Aplicar
        </button>
      </div>
    </div>
  )
}

function FilesPanel({ files, loading, onCopy, onDelete, onClose, onReload }: any) {
  return (
    <div
      className="hidden md:flex w-[360px] flex-col shrink-0"
      style={{ background:'var(--bg-surface)', borderLeft:'1px solid var(--border)' }}
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <FolderOpen size={14} style={{ color:'#60A5FA' }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color:'var(--text-1)' }}>Archivos · {files.length}</h2>
        </div>
        <div className="flex gap-1">
          <button onClick={onReload} className="p-1" style={{ color:'var(--text-3)' }} title="Recargar">↻</button>
          <button onClick={onClose} className="p-1" style={{ color:'var(--text-3)' }}><X size={13} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && <p className="text-xs" style={{ color:'var(--text-3)' }}>Cargando…</p>}
        {!loading && files.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color:'var(--text-3)' }}>
            Sin archivos. Usa los botones del header para subir o generar.
          </p>
        )}
        {files.map((f: BlobFile) => (
          <div key={f.url} className="rounded-md p-2" style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>
            {f.contentType?.startsWith('image/') && (
              <img src={f.url} alt={f.pathname} className="w-full h-24 object-cover rounded mb-2" />
            )}
            <p className="text-[10px] truncate" style={{ color:'var(--text-1)' }}>{f.pathname}</p>
            <p className="text-[9px] mb-2" style={{ color:'var(--text-3)' }}>
              {(f.size/1024).toFixed(0)}KB · {new Date(f.uploadedAt).toLocaleDateString('es-ES')}
            </p>
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
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-md p-5 rounded-lg"
        style={{ background:'var(--bg-surface)', border:'1px solid var(--border-strong)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color:'var(--text-1)' }}>{title}</h3>
          <button onClick={onClose} className="p-1" style={{ color:'var(--text-3)' }}><X size={14} /></button>
        </div>
        {children}
      </div>
    </>
  )
}
