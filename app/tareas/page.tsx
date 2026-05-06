'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ListChecks, Plus, X, Check, Trash2, RefreshCw, Loader2, Sparkles,
  ChevronDown, ChevronRight, Send, AlertCircle, Mail,
} from 'lucide-react'

interface Task {
  id: string; text: string; done: boolean
  createdAt: string; completedAt?: string
  smartType?: string; metadata?: any
}

interface SmartTask {
  id: string; text: string; smartType: string; metadata: any
}

const SMART_ICONS: Record<string, any> = {
  reply:   Send,
  welcome: Mail,
  bounce:  AlertCircle,
}
const SMART_COLORS: Record<string, string> = {
  reply:   '#22C55E',
  welcome: '#60A5FA',
  bounce:  '#EF4444',
}

function fmtRel(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `hace ${days}d`
  return new Date(iso).toLocaleDateString('es-ES', { day:'2-digit', month:'short' })
}

export default function TareasPage() {
  const [tasks, setTasks]     = useState<Task[]>([])
  const [smart, setSmart]     = useState<SmartTask[]>([])
  const [loading, setLoading] = useState(true)
  const [smartLoading, setSmartLoading] = useState(false)
  const [adding, setAdding]   = useState(false)
  const [newText, setNewText] = useState('')
  const [showDone, setShowDone] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/tareas', { cache: 'no-store' })
      const d = await r.json()
      setTasks(d.tasks || [])
    } finally { setLoading(false) }
  }
  async function loadSmart() {
    setSmartLoading(true)
    try {
      const r = await fetch('/api/tareas/inteligentes', { cache: 'no-store' })
      const d = await r.json()
      setSmart(d.suggestions || [])
    } finally { setSmartLoading(false) }
  }
  useEffect(() => { load(); loadSmart() }, [])

  async function add(text: string, smartType?: string, metadata?: any) {
    if (!text.trim()) return
    setAdding(true)
    try {
      await fetch('/api/tareas', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ text: text.trim(), smartType, metadata }),
      })
      await load()
    } finally { setAdding(false) }
  }

  async function toggle(id: string, done: boolean) {
    // Optimistic
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done, completedAt: done ? new Date().toISOString() : undefined } : t))
    await fetch(`/api/tareas/${id}`, { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ done }) })
  }

  async function remove(id: string) {
    setTasks(ts => ts.filter(t => t.id !== id))
    await fetch(`/api/tareas/${id}`, { method:'DELETE' })
  }

  async function acceptSmart(s: SmartTask) {
    await add(s.text, s.smartType, s.metadata)
    // Quitar de la lista de sugerencias localmente
    setSmart(prev => prev.filter(x => x.id !== s.id))
  }

  // Filtrar sugerencias que ya están en tareas (smartType+email)
  const taskSmartIds = new Set(tasks.map(t => `${t.smartType}:${t.metadata?.email || ''}`).filter(s => s !== ':'))
  const filteredSmart = smart.filter(s => !taskSmartIds.has(`${s.smartType}:${s.metadata?.email || ''}`))

  const pendientes = tasks.filter(t => !t.done)
  const hechas     = tasks.filter(t => t.done)

  // Cuántas hechas hoy
  const hoyStart = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() })()
  const hechasHoy = hechas.filter(t => t.completedAt && new Date(t.completedAt).getTime() >= hoyStart)

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background:'var(--bg-base)' }}>
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color:'var(--text-1)' }}>
            <ListChecks size={20} style={{ color:'#CCFF00' }} /> Tareas
          </h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color:'var(--text-2)' }}>
            {pendientes.length} pendientes · {hechasHoy.length} hechas hoy · {hechas.length} totales
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSmart} disabled={smartLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs disabled:opacity-50"
                  style={{ background:'var(--bg-surface)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
            {smartLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            Refrescar smart
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna principal: tareas */}
        <div className="lg:col-span-2 space-y-3">
          {/* Add */}
          <div className="flex gap-2">
            <input
              type="text" value={newText} onChange={e => setNewText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newText.trim()) { add(newText); setNewText('') } }}
              placeholder="Añadir tarea (Enter para guardar)"
              autoFocus
              className="flex-1 px-3 py-2.5 rounded-md text-sm outline-none"
              style={{ background:'var(--bg-surface)', color:'var(--text-1)', border:'1px solid var(--border)' }}
            />
            <button
              onClick={() => { if (newText.trim()) { add(newText); setNewText('') } }}
              disabled={!newText.trim() || adding}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold disabled:opacity-40"
              style={{ background:'var(--blue)', color:'#fff' }}>
              {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Añadir
            </button>
          </div>

          {/* Pendientes */}
          {loading && tasks.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color:'var(--text-3)' }}>
              <Loader2 size={14} className="animate-spin inline mr-2" /> Cargando…
            </p>
          )}

          {pendientes.length > 0 && (
            <div className="rounded-lg overflow-hidden"
                 style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold"
                   style={{ color:'var(--text-3)', borderBottom:'1px solid var(--border)' }}>
                Pendientes · {pendientes.length}
              </div>
              {pendientes.map(t => (
                <TaskRow key={t.id} task={t} onToggle={toggle} onDelete={remove} />
              ))}
            </div>
          )}

          {pendientes.length === 0 && !loading && (
            <div className="p-8 rounded-lg text-center"
                 style={{ background:'var(--bg-surface)', border:'1px dashed var(--border)', color:'var(--text-3)' }}>
              <Check size={20} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Todo al día — sin tareas pendientes 🎉</p>
            </div>
          )}

          {/* Hechas */}
          {hechas.length > 0 && (
            <div className="rounded-lg overflow-hidden"
                 style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
              <button onClick={() => setShowDone(s => !s)}
                      className="w-full px-3 py-2 text-[10px] uppercase tracking-wider font-semibold flex items-center gap-2"
                      style={{ color:'var(--text-3)' }}>
                {showDone ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                Hechas · {hechas.length}
              </button>
              {showDone && hechas.map(t => (
                <TaskRow key={t.id} task={t} onToggle={toggle} onDelete={remove} />
              ))}
            </div>
          )}
        </div>

        {/* Columna sugerencias smart */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <h2 className="text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-2"
                style={{ color:'var(--text-3)' }}>
              <Sparkles size={11} style={{ color:'#A78BFA' }} /> Tareas inteligentes
            </h2>
            {smartLoading && (
              <p className="text-xs text-center py-4" style={{ color:'var(--text-3)' }}>
                <Loader2 size={11} className="animate-spin inline mr-1" /> Analizando…
              </p>
            )}
            {!smartLoading && filteredSmart.length === 0 && (
              <div className="p-4 rounded-lg text-xs text-center"
                   style={{ background:'var(--bg-surface)', border:'1px dashed var(--border)', color:'var(--text-3)' }}>
                Sin sugerencias inteligentes ahora.
                <br /><span className="text-[10px]">Se calculan según pendientes, registros nuevos y bounces.</span>
              </div>
            )}
            <div className="space-y-2">
              {filteredSmart.map(s => {
                const Icon  = SMART_ICONS[s.smartType] || Sparkles
                const color = SMART_COLORS[s.smartType] || '#A78BFA'
                return (
                  <div key={s.id} className="rounded-md p-3"
                       style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
                    <div className="flex items-start gap-2 mb-2">
                      <Icon size={11} style={{ color, marginTop:2, flexShrink: 0 }} />
                      <p className="text-xs leading-relaxed" style={{ color:'var(--text-1)' }}>{s.text}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => acceptSmart(s)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-semibold"
                              style={{ background: color + '25', color }}>
                        <Plus size={9} /> Aceptar
                      </button>
                      <button onClick={() => setSmart(prev => prev.filter(x => x.id !== s.id))}
                              className="px-2 py-1 rounded text-[10px]"
                              style={{ background:'var(--bg-elevated)', color:'var(--text-3)' }}
                              title="Descartar">
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskRow({
  task, onToggle, onDelete,
}: { task: Task; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void }) {
  const SmartIcon = task.smartType ? SMART_ICONS[task.smartType] : null
  const smartColor = task.smartType ? SMART_COLORS[task.smartType] : null
  return (
    <div className="px-3 py-2.5 flex items-center gap-3 group transition-all"
         style={{ borderBottom:'1px solid var(--border)' }}>
      <button onClick={() => onToggle(task.id, !task.done)}
              className="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
              style={{
                borderColor: task.done ? '#22C55E' : 'var(--border-strong)',
                background:  task.done ? '#22C55E' : 'transparent',
              }}>
        {task.done && <Check size={10} style={{ color:'#fff' }} />}
      </button>
      {SmartIcon && (
        <SmartIcon size={11} style={{ color: smartColor || 'var(--text-3)', flexShrink:0 }} />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{
          color: task.done ? 'var(--text-3)' : 'var(--text-1)',
          textDecoration: task.done ? 'line-through' : 'none',
        }}>
          {task.text}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px]" style={{ color:'var(--text-3)' }}>
            {task.done ? `✓ ${fmtRel(task.completedAt!)}` : fmtRel(task.createdAt)}
          </span>
          {task.smartType && (
            <span className="text-[9px] px-1 rounded uppercase tracking-wider"
                  style={{ background:'var(--bg-elevated)', color: smartColor || 'var(--text-3)' }}>
              {task.smartType}
            </span>
          )}
          {task.metadata?.email && (
            <Link href={`/conversaciones?email=${encodeURIComponent(task.metadata.email)}`}
                  className="text-[10px]" style={{ color:'var(--blue)' }}>
              ↪ {task.metadata.email}
            </Link>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(task.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
              style={{ color:'#EF4444' }}>
        <Trash2 size={11} />
      </button>
    </div>
  )
}
