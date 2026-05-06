'use client'
import { useEffect, useState, useRef } from 'react'
import {
  Save, RotateCcw, Send, Sparkles, Loader2, Code2, Eye, MessageSquare,
  Download, ChevronUp, ChevronDown, Smartphone, Monitor, Mail,
} from 'lucide-react'

interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
  ts:   number
}

const TEMPLATE_ID = 'welcome'
const TEMPLATE_NAME = 'Bienvenida Artiverse'

export default function MaquetadorPage() {
  const [html, setHtml]               = useState<string>('')
  const [originalHtml, setOriginal]   = useState<string>('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [view, setView]               = useState<'desktop'|'mobile'>('desktop')
  const [tab, setTab]                 = useState<'preview'|'code'>('preview')
  const [feedback, setFeedback]       = useState<{ type:'ok'|'err'; msg: string } | null>(null)

  // AI chat
  const [chatOpen, setChatOpen]   = useState(true)
  const [messages, setMessages]   = useState<ChatMsg[]>([])
  const [input, setInput]         = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Test send
  const [testEmail, setTestEmail] = useState('victor@aetherlabs.es')
  const [sendingTest, setSendingTest] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  async function load() {
    setLoading(true); setFeedback(null)
    try {
      const r = await fetch(`/api/maquetador/${TEMPLATE_ID}`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setHtml(d.html)
      setOriginal(d.html)
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const dirty = html !== originalHtml

  async function save() {
    setSaving(true); setFeedback(null)
    try {
      const r = await fetch(`/api/maquetador/${TEMPLATE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setOriginal(html)
      setFeedback({ type: 'ok', msg: 'Guardado en KV. Los próximos envíos usarán este HTML.' })
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message })
    } finally {
      setSaving(false)
    }
  }

  async function restoreDefault() {
    if (!confirm('¿Restaurar al HTML original del repo? Los cambios guardados se perderán.')) return
    try {
      await fetch(`/api/maquetador/${TEMPLATE_ID}`, { method: 'DELETE' })
      await load()
      setFeedback({ type: 'ok', msg: 'Restaurado al diseño original' })
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message })
    }
  }

  function downloadHtml() {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${TEMPLATE_ID}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── AI chat ───────────────────────────────────────────────────────────────
  async function sendChat() {
    if (!input.trim()) return
    const userMsg: ChatMsg = { role: 'user', text: input.trim(), ts: Date.now() }
    setMessages(m => [...m, userMsg])
    const instruction = input.trim()
    setInput('')
    setAiLoading(true)

    try {
      const r = await fetch(`/api/maquetador/${TEMPLATE_ID}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, instruction }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setHtml(d.html)
      setMessages(m => [...m, {
        role: 'assistant',
        text: '✓ Cambio aplicado. Revisa el preview. Si te gusta, dale a "Guardar".',
        ts: Date.now(),
      }])
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', text: `❌ ${e.message}`, ts: Date.now() }])
    } finally {
      setAiLoading(false)
    }
  }

  // ── Test email ────────────────────────────────────────────────────────────
  async function sendTest() {
    if (!testEmail.trim()) return
    setSendingTest(true); setFeedback(null)
    try {
      // Si hay cambios sin guardar, preguntar
      if (dirty) {
        if (!confirm('Tienes cambios sin guardar. ¿Quieres guardarlos antes de enviar el test?')) {
          setSendingTest(false); return
        }
        await save()
      }
      const r = await fetch('/api/welcome/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail.trim(), firstName: 'Test', test: true }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setFeedback({ type: 'ok', msg: `Test enviado a ${testEmail}` })
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message })
    } finally {
      setSendingTest(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Mail size={18} style={{ color: '#CCFF00' }} />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-1)' }}>
              {TEMPLATE_NAME}
            </h1>
            <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
              Maquetador · ID: {TEMPLATE_ID}
            </p>
          </div>
          {dirty && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: '#F59E0B25', color: '#F59E0B' }}
            >
              Cambios sin guardar
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="email para test"
            className="px-2 py-1.5 rounded text-xs outline-none w-48"
            style={{ background: 'var(--bg-base)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
          />
          <button
            onClick={sendTest}
            disabled={sendingTest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
          >
            {sendingTest ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            Test
          </button>
          <button
            onClick={downloadHtml}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            title="Descargar HTML"
          >
            <Download size={11} />
          </button>
          <button
            onClick={restoreDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            title="Restaurar al original del repo"
          >
            <RotateCcw size={11} />
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'var(--blue)', color: '#fff' }}
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            Guardar
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className="px-4 py-2 text-xs"
          style={{
            background: feedback.type === 'ok' ? '#22C55E20' : '#EF444420',
            color:      feedback.type === 'ok' ? '#22C55E' : '#FCA5A5',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Toolbar */}
      <div
        className="px-4 py-2 flex items-center gap-2 justify-between"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="flex p-0.5 rounded gap-0.5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <ToggleBtn active={tab === 'preview'} icon={Eye}  label="Preview" onClick={() => setTab('preview')} />
          <ToggleBtn active={tab === 'code'}    icon={Code2} label="Código"  onClick={() => setTab('code')} />
        </div>
        {tab === 'preview' && (
          <div
            className="flex p-0.5 rounded gap-0.5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <ToggleBtn active={view === 'desktop'} icon={Monitor}    label="Desktop" onClick={() => setView('desktop')} />
            <ToggleBtn active={view === 'mobile'}  icon={Smartphone} label="Mobile"  onClick={() => setView('mobile')} />
          </div>
        )}
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
              <div
                className="mx-auto"
                style={{ maxWidth: view === 'mobile' ? '375px' : '100%' }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={html}
                  title="preview"
                  style={{
                    width: '100%',
                    minHeight: 'calc(100vh - 240px)',
                    border: 'none',
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  }}
                />
              </div>
            </div>
          ) : (
            <textarea
              value={html}
              onChange={e => setHtml(e.target.value)}
              spellCheck={false}
              className="flex-1 p-4 font-mono text-xs outline-none resize-none"
              style={{
                background: 'var(--bg-surface)',
                color:      'var(--text-1)',
                border:     'none',
                lineHeight: 1.5,
                fontFamily: 'var(--font-mono), monospace',
              }}
            />
          )}
        </div>

        {/* AI Chat sidebar */}
        {chatOpen && (
          <div
            className="hidden md:flex w-[380px] flex-col shrink-0"
            style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} style={{ color: '#A78BFA' }} />
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-1)' }}>
                  Editar con IA
                </h2>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 rounded"
                style={{ color: 'var(--text-3)' }}
              >
                <ChevronDown size={13} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {messages.length === 0 && (
                <div className="text-xs space-y-3" style={{ color: 'var(--text-3)' }}>
                  <p>Escribe en español lo que quieras cambiar. Ejemplos:</p>
                  <ul className="space-y-1.5 pl-3">
                    <li>• "Pon el título en negrita y más grande"</li>
                    <li>• "Cambia el color del botón a azul"</li>
                    <li>• "Quita el bloque del mockup"</li>
                    <li>• "Cambia el texto 'Ya estás dentro' por 'Bienvenido a la familia'"</li>
                    <li>• "Añade un emoji 🎭 al título principal"</li>
                  </ul>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className="px-3 py-2 rounded-lg text-xs"
                  style={{
                    background: m.role === 'user' ? 'var(--bg-active)' : 'var(--bg-base)',
                    color:      'var(--text-1)',
                    border:     '1px solid var(--border)',
                    alignSelf:  m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <p className="text-[9px] uppercase tracking-wider mb-1 font-semibold" style={{ color: 'var(--text-3)' }}>
                    {m.role === 'user' ? 'Tú' : 'Claude'}
                  </p>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{m.text}</p>
                </div>
              ))}
              {aiLoading && (
                <div className="flex items-center gap-2 text-xs px-3 py-2" style={{ color: 'var(--text-2)' }}>
                  <Loader2 size={12} className="animate-spin" /> Claude está modificando el HTML…
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="¿Qué quieres cambiar?"
                rows={3}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault(); sendChat()
                  }
                }}
                className="w-full px-2.5 py-2 rounded text-xs outline-none resize-none"
                style={{ background: 'var(--bg-base)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
              />
              <button
                onClick={sendChat}
                disabled={aiLoading || !input.trim()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all disabled:opacity-40"
                style={{ background: '#A78BFA', color: '#fff' }}
              >
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Aplicar cambio
              </button>
              <p className="text-[10px] text-center" style={{ color: 'var(--text-3)' }}>
                Cmd/Ctrl + Enter para enviar
              </p>
            </div>
          </div>
        )}

        {/* Toggle chat (mobile + cuando cerrado) */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl"
            style={{ background: '#A78BFA', color: '#fff' }}
          >
            <Sparkles size={14} /> Editar con IA
          </button>
        )}
      </div>
    </div>
  )
}

function ToggleBtn({
  active, icon: Icon, label, onClick,
}: { active: boolean; icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-all"
      style={{
        background: active ? 'var(--bg-active)' : 'transparent',
        color:      active ? 'var(--text-1)'    : 'var(--text-2)',
      }}
    >
      <Icon size={11} />
      {label}
    </button>
  )
}
