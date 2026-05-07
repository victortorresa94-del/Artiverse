'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Smartphone, Monitor, Loader2 } from 'lucide-react'

export default function PreviewTemplate() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [html, setHtml] = useState('')
  const [view, setView] = useState<'desktop'|'mobile'>('desktop')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/maquetador/${id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setHtml(d.html))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen" style={{ background:'var(--bg-base)' }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3"
           style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <Link href="/maquetador" className="p-1.5 rounded-md" style={{ color:'var(--text-2)' }}><ArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Preview · {id}</h1>
            <p className="text-[10px]" style={{ color:'var(--text-3)' }}>Solo lectura · template builtin</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-0.5 rounded gap-0.5" style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
            <button onClick={() => setView('desktop')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px]"
                    style={{ background: view==='desktop' ? 'var(--bg-active)' : 'transparent', color: view==='desktop' ? 'var(--text-1)' : 'var(--text-2)' }}>
              <Monitor size={11} /> Desktop
            </button>
            <button onClick={() => setView('mobile')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px]"
                    style={{ background: view==='mobile' ? 'var(--bg-active)' : 'transparent', color: view==='mobile' ? 'var(--text-1)' : 'var(--text-2)' }}>
              <Smartphone size={11} /> Mobile
            </button>
          </div>
          <button
            onClick={() => router.push(`/maquetador?use=${id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
            style={{ background:'var(--blue)', color:'#fff' }}
          >
            <Plus size={11} /> Usar este template
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" style={{ background:'#EBEBEB' }}>
        {loading ? (
          <div className="flex items-center justify-center pt-20" style={{ color:'var(--text-2)' }}>
            <Loader2 className="animate-spin mr-2" size={16} /> Cargando…
          </div>
        ) : (
          <div className="mx-auto" style={{ maxWidth: view === 'mobile' ? '375px' : '100%' }}>
            <iframe srcDoc={html} title="preview"
                    style={{ width:'100%', minHeight:'calc(100vh - 200px)', border:'none', background:'#fff', borderRadius:'12px' }} />
          </div>
        )}
      </div>
    </div>
  )
}
