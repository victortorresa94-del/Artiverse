'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  RefreshCw, Send, Inbox, UserPlus, Loader2, ArrowRight,
  Zap, Mail, MessageCircle, Users, Building2,
} from 'lucide-react'

interface SentBreakdown { instantly: number; hubspot: number }

interface PanelData {
  sent: {
    ayer:   SentBreakdown
    hoy:    SentBreakdown
    semana: SentBreakdown
    mes:    SentBreakdown
    total:  SentBreakdown
  }
  registros: {
    hoy:    number
    semana: number
    mes:    number
    total:  number
    ultimos: Array<{ email: string; name: string; createdAt: string; hasAgency: boolean }>
  }
  pendientes: {
    necesitan_respuesta: number
    contactos_unicos:    number
    hoy_nuevos:          number
  }
  generated_at: string
}

function fmtRel(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d`
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

export default function PanelPage() {
  const [data, setData]     = useState<PanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/panel', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Panel</h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
            Resumen del día · {data ? fmtRel(data.generated_at) : 'cargando…'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: '#EF444415', color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-20" style={{ color: 'var(--text-2)' }}>
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Cargando…</span>
        </div>
      )}

      {data && (
        <div className="space-y-5">
          {/* ─── BLOQUE 1: ENVÍOS ──────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Send size={14} style={{ color: 'var(--blue)' }} />
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-1)' }}>
                Envíos
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Ayer',   data: data.sent.ayer   },
                { label: 'Hoy',    data: data.sent.hoy, accent: true },
                { label: 'Semana', data: data.sent.semana },
                { label: 'Mes',    data: data.sent.mes    },
                { label: 'Total',  data: data.sent.total  },
              ].map(({ label, data: d, accent }) => (
                <KpiSentCard key={label} label={label} instantly={d.instantly} hubspot={d.hubspot} accent={!!accent} />
              ))}
            </div>
          </section>

          {/* ─── BLOQUE 2: REGISTROS + PENDIENTES (2 columnas) ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Registros */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UserPlus size={14} style={{ color: '#22C55E' }} />
                  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-1)' }}>
                    Registros nuevos
                  </h2>
                </div>
                <Link
                  href="/funnel"
                  className="flex items-center gap-1 text-[11px] font-medium"
                  style={{ color: 'var(--text-2)' }}
                >
                  Ver funnel <ArrowRight size={11} />
                </Link>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Hoy',    value: data.registros.hoy },
                  { label: 'Semana', value: data.registros.semana },
                  { label: 'Mes',    value: data.registros.mes },
                ].map(c => (
                  <div
                    key={c.label}
                    className="p-2.5 rounded-lg text-center"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                  >
                    <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{c.value}</p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Lista últimos */}
              <div
                className="rounded-lg overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider"
                     style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                  Últimos 8 registros · Total: {data.registros.total}
                </div>
                {data.registros.ultimos.length === 0 ? (
                  <div className="p-4 text-center text-xs" style={{ color: 'var(--text-3)' }}>
                    Sin registros recientes
                  </div>
                ) : (
                  data.registros.ultimos.map(u => (
                    <div
                      key={u.email}
                      className="flex items-center gap-3 px-3 py-2"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <div
                        className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)' }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>{u.name}</p>
                        <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>{u.email}</p>
                      </div>
                      {u.hasAgency && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase"
                          style={{ background: '#A78BFA20', color: '#A78BFA' }}
                        >
                          Agencia
                        </span>
                      )}
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--text-3)' }}>
                        {fmtRel(u.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Pendientes */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} style={{ color: '#F59E0B' }} />
                  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-1)' }}>
                    Pendientes
                  </h2>
                </div>
                <Link
                  href="/conversaciones"
                  className="flex items-center gap-1 text-[11px] font-medium"
                  style={{ color: 'var(--text-2)' }}
                >
                  Ir a conversaciones <ArrowRight size={11} />
                </Link>
              </div>

              <div className="space-y-3">
                <BigStat
                  icon={MessageCircle}
                  iconColor="#F59E0B"
                  value={data.pendientes.necesitan_respuesta}
                  label="Mensajes entrantes (14d)"
                  sub={`${data.pendientes.contactos_unicos} contactos únicos`}
                  href="/conversaciones"
                />
                <BigStat
                  icon={Inbox}
                  iconColor="#60A5FA"
                  value={data.pendientes.hoy_nuevos}
                  label="Nuevos contactos hoy"
                  sub="Personas que nos han escrito hoy"
                  href="/conversaciones"
                />
              </div>

              {/* Atajos */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Shortcut href="/funnel"        label="Funnel"        icon={Users} />
                <Shortcut href="/enviados"      label="Enviados"      icon={Send} />
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function KpiSentCard({
  label, instantly, hubspot, accent,
}: { label: string; instantly: number; hubspot: number; accent: boolean }) {
  const total = instantly + hubspot
  return (
    <div
      className="p-3 sm:p-4 rounded-lg"
      style={{
        background: accent ? 'var(--blue-dim)' : 'var(--bg-surface)',
        border:     `1px solid ${accent ? 'var(--blue-glow)' : 'var(--border)'}`,
      }}
    >
      <p
        className="text-[10px] uppercase tracking-wider mb-1.5"
        style={{ color: accent ? 'var(--blue)' : 'var(--text-3)' }}
      >
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{total}</p>
      <div className="mt-2 space-y-0.5 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1" style={{ color: 'var(--text-2)' }}>
            <Zap size={9} style={{ color: '#F59E0B' }} /> Instantly
          </span>
          <span style={{ color: 'var(--text-1)' }}>{instantly}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1" style={{ color: 'var(--text-2)' }}>
            <Mail size={9} style={{ color: '#22C55E' }} /> HubSpot
          </span>
          <span style={{ color: 'var(--text-1)' }}>{hubspot}</span>
        </div>
      </div>
    </div>
  )
}

function BigStat({
  icon: Icon, iconColor, value, label, sub, href,
}: { icon: React.ElementType; iconColor: string; value: number; label: string; sub: string; href: string }) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-lg transition-all"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: iconColor + '20' }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold leading-none" style={{ color: 'var(--text-1)' }}>{value}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-1)' }}>{label}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>
        </div>
        <ArrowRight size={14} style={{ color: 'var(--text-3)' }} />
      </div>
    </Link>
  )
}

function Shortcut({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-all"
      style={{ background: 'var(--bg-surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
    >
      <Icon size={12} style={{ color: 'var(--text-2)' }} />
      {label}
    </Link>
  )
}
