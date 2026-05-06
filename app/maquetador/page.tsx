'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  Mail, FileText, Plus, Wand2, Sparkles, Loader2, Eye,
  Calendar, Tag, ChevronRight, Trash2, Copy, X, Send,
} from 'lucide-react'

interface TemplateMeta {
  id: string; name: string; description?: string; builtin?: boolean
}
interface MailMeta {
  id: string; name: string; description?: string
  basedOnTemplate?: string; newsletterId?: string
  createdAt: string; updatedAt: string; size?: number
}

const NEWSLETTERS = [
  { id: 'bienvenida',    name: 'Bienvenida nuevos usuarios' },
  { id: 'licitaciones',  name: 'Licitaciones de la semana' },
  { id: 'talento_mes',   name: 'Talento del mes' },
  { id: 'insights',      name: 'Insights del sector' },
  { id: 'convocatorias', name: 'Convocatorias y festivales' },
]

export default function MaquetadorPage() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([])
  const [mails, setMails]         = useState<MailMeta[]>([])
  const [loading, setLoading]     = useState(true)

  // Modal: crear desde template
  const [createOpen, setCreateOpen] = useState(false)
  const [createBase, setCreateBase] = useState<string>('')
  const [newName, setNewName]       = useState('')
  const [newDesc, setNewDesc]       = useState('')
  const [newNewsletter, setNewNl]   = useState('')

  async function load() {
    setLoading(true)
    try {
      const [rt, rm] = await Promise.all([
        fetch('/api/maquetador', { cache: 'no-store' }),
        fetch('/api/drafts',     { cache: 'no-store' }),
      ])
      const dt = await rt.json()
      const dm = await rm.json()
      setTemplates(dt.templates || [])
      setMails(dm.mails || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function startCreate(templateId: string) {
    setCreateBase(templateId)
    const tpl = templates.find(t => t.id === templateId)
    setNewName(tpl ? `Copia de ${tpl.name}` : 'Nuevo mail')
    setNewDesc('')
    setNewNl('')
    setCreateOpen(true)
  }

  async function doCreate() {
    if (!newName.trim()) return
    try {
      const r = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDesc || undefined,
          basedOnTemplate: createBase,
          newsletterId: newNewsletter || undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) { alert(d.error); return }
      window.location.href = `/maquetador/editar/${d.mail.id}`
    } catch (e: any) { alert(e.message) }
  }

  async function deleteMail(id: string, name: string) {
    if (!confirm(`¿Borrar "${name}"? No se puede deshacer.`)) return
    await fetch(`/api/drafts/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <Mail size={20} style={{ color: '#CCFF00' }} /> Maquetador
          </h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
            Templates base + tus mails editables · {mails.length} mail{mails.length===1?'':'s'} guardado{mails.length===1?'':'s'}
          </p>
        </div>
        <Link
          href="/maquetador/desde-cero"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: '#A78BFA', color: '#fff' }}
        >
          <Wand2 size={14} /> Crear desde cero (IA)
        </Link>
      </div>

      {/* ── MIS MAILS ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
          <FileText size={13} /> Mis mails ({mails.length})
        </h2>
        {loading ? (
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Cargando…</p>
        ) : mails.length === 0 ? (
          <div
            className="p-8 rounded-lg text-center"
            style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)', color: 'var(--text-3)' }}
          >
            <p className="text-sm">No tienes mails todavía.</p>
            <p className="text-xs mt-1">Elige un template abajo y crea el primero.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mails.map(m => {
              const nl = NEWSLETTERS.find(n => n.id === m.newsletterId)
              return (
                <div
                  key={m.id}
                  className="rounded-lg p-4 transition-all relative group"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  <Link href={`/maquetador/editar/${m.id}`} className="block">
                    <h3 className="text-sm font-semibold mb-1 truncate pr-6" style={{ color: 'var(--text-1)' }}>{m.name}</h3>
                    {m.description && (
                      <p className="text-[11px] mb-2 line-clamp-2" style={{ color: 'var(--text-3)' }}>{m.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {m.basedOnTemplate && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider"
                              style={{ background:'var(--bg-elevated)', color:'var(--text-2)' }}>
                          {m.basedOnTemplate}
                        </span>
                      )}
                      {nl && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider flex items-center gap-1"
                              style={{ background:'#22C55E25', color:'#22C55E' }}>
                          <Tag size={8} /> {nl.name}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                      Editado {new Date(m.updatedAt).toLocaleDateString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </Link>
                  <button
                    onClick={() => deleteMail(m.id, m.name)}
                    className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: '#EF4444' }}
                    title="Borrar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── TEMPLATES BASE ── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
          <Sparkles size={13} /> Templates base · solo lectura
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.filter(t => t.builtin).map(t => (
            <div key={t.id}
                 className="rounded-lg p-4 group transition-all"
                 style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold mb-1" style={{ color:'var(--text-1)' }}>{t.name}</h3>
              <p className="text-[11px] mb-3 line-clamp-2" style={{ color:'var(--text-3)' }}>{t.description}</p>
              <div className="flex gap-1.5">
                <a
                  href={`/api/welcome/preview?firstName=Test`}
                  target="_blank" rel="noopener noreferrer"
                  className="hidden"
                />
                <Link
                  href={`/maquetador/preview/${t.id}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
                  style={{ background:'var(--bg-elevated)', color:'var(--text-2)', border:'1px solid var(--border)' }}
                >
                  <Eye size={11} /> Preview
                </Link>
                <button
                  onClick={() => startCreate(t.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ml-auto"
                  style={{ background:'var(--blue)', color:'#fff' }}
                >
                  <Plus size={11} /> Usar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal crear */}
      {createOpen && (
        <Modal title="Crear nuevo mail" onClose={() => setCreateOpen(false)}>
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nombre (ej: Bienvenida v2 — Mayo)"
            autoFocus
            className="w-full px-3 py-2 rounded-md text-sm outline-none mb-2"
            style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }}
          />
          <input
            value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full px-3 py-2 rounded-md text-sm outline-none mb-2"
            style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }}
          />
          <select
            value={newNewsletter} onChange={e => setNewNl(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm outline-none mb-3 cursor-pointer"
            style={{ background:'var(--bg-base)', color:'var(--text-1)', border:'1px solid var(--border)' }}
          >
            <option value="">Sin vincular a newsletter</option>
            {NEWSLETTERS.map(n => <option key={n.id} value={n.id}>Vincular a: {n.name}</option>)}
          </select>
          <p className="text-[10px] mb-3" style={{ color:'var(--text-3)' }}>
            Base: <strong style={{ color:'var(--text-2)' }}>{templates.find(t => t.id === createBase)?.name}</strong>
          </p>
          <button
            onClick={doCreate} disabled={!newName.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
            style={{ background:'var(--blue)', color:'#fff' }}
          >
            <Plus size={14} /> Crear y editar
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
