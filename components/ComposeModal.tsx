'use client'
/**
 * Compose modal estilo Gmail. Popup flotante en bottom-right.
 * Envía vía /api/bandeja/compose con firma automática.
 */
import { useState } from 'react'
import { X, Minimize2, Send, Loader2, ChevronUp } from 'lucide-react'

interface Props {
  open:      boolean
  onClose:   () => void
  initialTo?:      string
  initialSubject?: string
  initialBody?:    string
}

export default function ComposeModal({
  open, onClose, initialTo = '', initialSubject = '', initialBody = '',
}: Props) {
  const [minimized, setMinimized] = useState(false)
  const [to, setTo]               = useState(initialTo)
  const [subject, setSubject]     = useState(initialSubject)
  const [body, setBody]           = useState(initialBody)
  const [sending, setSending]     = useState(false)
  const [feedback, setFeedback]   = useState<{ type: 'ok'|'err'; msg: string } | null>(null)

  if (!open) return null

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setFeedback({ type: 'err', msg: 'Faltan campos' }); return
    }
    setSending(true); setFeedback(null)
    try {
      const recipients = to.split(/[,;]/).map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/bandeja/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipients, subject, bodyText: body }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || `Error ${res.status}`)
      setFeedback({ type: 'ok', msg: `Enviado a ${recipients.length} destinatario${recipients.length > 1 ? 's' : ''}` })
      // Reset y cerrar tras 1.5s
      setTimeout(() => {
        setTo(''); setSubject(''); setBody('')
        onClose()
      }, 1500)
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed bottom-0 right-0 sm:right-6 sm:bottom-0 z-50 w-full sm:w-[520px] flex flex-col rounded-t-lg shadow-2xl"
      style={{
        background: 'var(--bg-surface)',
        border:     '1px solid var(--border-strong)',
        borderBottom: 'none',
        height:     minimized ? 'auto' : '560px',
        maxHeight:  '90vh',
      }}
    >
      {/* Title bar */}
      <div
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer"
        style={{ background: 'var(--bg-elevated)', borderBottom: minimized ? 'none' : '1px solid var(--border)' }}
        onClick={() => setMinimized(m => !m)}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
          {subject || 'Nuevo mensaje'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); setMinimized(m => !m) }}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {minimized ? <ChevronUp size={13} /> : <Minimize2 size={13} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClose() }}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Form */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <input
              type="text"
              placeholder="Para: email@ejemplo.com (separa con , para varios)"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="w-full px-2 py-2 rounded text-xs outline-none"
              style={{ background: 'transparent', color: 'var(--text-1)', borderBottom: '1px solid var(--border)' }}
            />
            <input
              type="text"
              placeholder="Asunto"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-2 py-2 rounded text-sm font-medium outline-none"
              style={{ background: 'transparent', color: 'var(--text-1)', borderBottom: '1px solid var(--border)' }}
            />
            <textarea
              placeholder="Escribe tu mensaje…"
              value={body}
              onChange={e => setBody(e.target.value)}
              className="w-full px-2 py-2 rounded text-sm outline-none resize-none"
              style={{ background: 'transparent', color: 'var(--text-1)', minHeight: '300px' }}
            />
            <div
              className="text-[10px] italic mt-2 p-2 rounded"
              style={{ color: 'var(--text-3)', background: 'var(--bg-base)', border: '1px dashed var(--border)' }}
            >
              💼 La firma de Artiverse se añade automáticamente al final del email
            </div>
            {feedback && (
              <div
                className="px-2 py-1.5 rounded text-xs"
                style={{
                  background: feedback.type === 'ok' ? '#22C55E20' : '#EF444420',
                  color:      feedback.type === 'ok' ? '#22C55E'   : '#FCA5A5',
                }}
              >
                {feedback.msg}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-3 py-2.5 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--blue)', color: '#fff' }}
            >
              {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              {sending ? 'Enviando…' : 'Enviar'}
            </button>
            <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
              Vía SMTP Nominalia
            </span>
          </div>
        </>
      )}
    </div>
  )
}
