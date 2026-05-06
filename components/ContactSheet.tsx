'use client'
/**
 * Slide-over de ficha de contacto unificada.
 * Reusable desde funnel, conversaciones, enviados, panel.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  X, Loader2, Mail, MapPin, Phone, Building2, Briefcase, Globe, Linkedin,
  Eye, MousePointer, MessageCircle, Calendar, Activity, CheckCircle2, Star,
  ThumbsUp, ThumbsDown, RefreshCw, ArrowRight, Send, GitBranch, ExternalLink,
} from 'lucide-react'

interface ContactData {
  email:     string
  hubspot:   any | null
  instantly: any | null
  artiverse: any | null
}

interface Props {
  email:    string | null
  onClose:  () => void
  initialName?:    string
  initialCompany?: string
}

export default function ContactSheet({ email, onClose, initialName, initialCompany }: Props) {
  const [data, setData]       = useState<ContactData | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState<string | null>(null)
  const [moving, setMoving]   = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok'|'err'; msg: string } | null>(null)

  useEffect(() => {
    if (!email) return
    setData(null); setLoading(true); setErr(null); setFeedback(null)
    fetch(`/api/contact/${encodeURIComponent(email)}`, { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) throw new Error(`Error ${r.status}`)
        const d = await r.json()
        setData(d)
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [email])

  async function moveFunnel(phase: 'interesado'|'no_interesado'|'__auto__') {
    if (!email) return
    setMoving(true); setFeedback(null)
    try {
      const r = await fetch('/api/funnel/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phase }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
      setFeedback({ type: 'ok', msg: `Movido a ${phase === '__auto__' ? 'auto' : phase}` })
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message })
    } finally {
      setMoving(false)
    }
  }

  async function changeConvStatus(status: string) {
    if (!email) return
    setMoving(true); setFeedback(null)
    try {
      const r = await fetch('/api/conversaciones/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, status }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
      setFeedback({ type: 'ok', msg: `Conv: ${status}` })
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message })
    } finally {
      setMoving(false)
    }
  }

  if (!email) return null

  const name = data?.hubspot?.firstname || data?.instantly?.firstName || data?.artiverse?.firstName || initialName || email.split('@')[0]
  const lastName = data?.hubspot?.lastname || data?.instantly?.lastName || data?.artiverse?.lastName || ''
  const fullName = [name, lastName].filter(Boolean).join(' ').trim()
  const company = data?.hubspot?.company || data?.instantly?.company || data?.artiverse?.companyName || initialCompany || ''
  const job     = data?.hubspot?.jobtitle || data?.instantly?.jobTitle || ''

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[520px] flex flex-col"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-strong)' }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start justify-between gap-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold shrink-0"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)' }}
            >
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate" style={{ color: 'var(--text-1)' }}>
                {fullName || email.split('@')[0]}
              </h2>
              <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{email}</p>
              {(company || job) && (
                <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                  {[job, company].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors shrink-0"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-2)' }}>
              <Loader2 size={13} className="animate-spin" /> Cargando ficha…
            </div>
          )}
          {err && <div className="text-xs" style={{ color: '#FCA5A5' }}>{err}</div>}

          {/* ─── Cross-system badges ─── */}
          {data && (
            <div className="flex gap-1.5 flex-wrap">
              {data.hubspot   && <SystemBadge label="HubSpot"   color="#22C55E" />}
              {data.instantly && <SystemBadge label="Instantly" color="#F59E0B" />}
              {data.artiverse && <SystemBadge label="Artiverse" color="#A78BFA" />}
              {!data.hubspot && !data.instantly && !data.artiverse && (
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Sin datos en ningún sistema
                </span>
              )}
            </div>
          )}

          {/* ─── Quick actions ─── */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/conversaciones?email=${encodeURIComponent(email)}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ background: 'var(--blue)', color: '#fff' }}
            >
              <Send size={11} /> Responder
            </Link>
            {data?.hubspot?.vid && (
              <a
                href={`https://app-eu1.hubspot.com/contacts/${data.hubspot.vid}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
              >
                <ExternalLink size={11} /> Abrir en HubSpot
              </a>
            )}
          </div>

          {feedback && (
            <div
              className="px-3 py-1.5 rounded text-xs"
              style={{
                background: feedback.type === 'ok' ? '#22C55E20' : '#EF444420',
                color:      feedback.type === 'ok' ? '#22C55E'   : '#FCA5A5',
              }}
            >
              {feedback.msg}
            </div>
          )}

          {/* ─── Información de contacto ─── */}
          {(data?.hubspot?.phone || data?.instantly?.location || data?.hubspot?.city || data?.instantly?.linkedin) && (
            <Section title="Información de contacto">
              <div className="space-y-2">
                {data?.hubspot?.phone && (
                  <InfoRow icon={Phone} label="Teléfono" value={data.hubspot.phone} />
                )}
                {(data?.hubspot?.city || data?.instantly?.location) && (
                  <InfoRow icon={MapPin} label="Ubicación" value={data.hubspot?.city || data.instantly?.location} />
                )}
                {data?.instantly?.linkedin && (
                  <InfoRow icon={Linkedin} label="LinkedIn" value={data.instantly.linkedin} link />
                )}
                {data?.hubspot?.properties?.website && (
                  <InfoRow icon={Globe} label="Website" value={data.hubspot.properties.website} link />
                )}
              </div>
            </Section>
          )}

          {/* ─── Instantly stats ─── */}
          {data?.instantly && (
            <Section title="Outreach — Instantly">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Stat icon={Eye}           label="Aperturas"  value={data.instantly.opens   || 0} />
                <Stat icon={MousePointer}  label="Clicks"     value={data.instantly.clicks  || 0} />
                <Stat icon={MessageCircle} label="Respuestas" value={data.instantly.replies || 0} />
              </div>
              {data.instantly.lastUpdate && (
                <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  Última actividad: {new Date(data.instantly.lastUpdate).toLocaleString('es-ES')}
                </p>
              )}
            </Section>
          )}

          {/* ─── Artiverse profile ─── */}
          {data?.artiverse && (
            <Section title="Plataforma Artiverse">
              <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-1)' }}>
                {data.artiverse.companyName && (
                  <p><span style={{ color: 'var(--text-3)' }}>Empresa: </span>{data.artiverse.companyName}</p>
                )}
                {data.artiverse.segment && (
                  <p><span style={{ color: 'var(--text-3)' }}>Segmento: </span>{data.artiverse.segment}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {data.artiverse.isPro          && <Tag color="#FFD700" label="PRO" />}
                  {data.artiverse.hasAgency      && <Tag color="#A78BFA" label="Agencia" />}
                  {data.artiverse.profileComplete && <Tag color="#22C55E" label="Perfil completo" />}
                  {data.artiverse.hasMedia       && <Tag color="#60A5FA" label="Con media" />}
                  {data.artiverse.hasBio         && <Tag color="#94A3B8" label="Con bio" />}
                </div>
                {data.artiverse.createdAt && (
                  <p className="mt-2 text-[11px]" style={{ color: 'var(--text-3)' }}>
                    Registrado: {new Date(data.artiverse.createdAt).toLocaleDateString('es-ES')}
                    {data.artiverse.lastLoginAt && (
                      <> · Último login: {new Date(data.artiverse.lastLoginAt).toLocaleDateString('es-ES')}</>
                    )}
                  </p>
                )}
              </div>
            </Section>
          )}

          {/* ─── HubSpot lifecycle + score ─── */}
          {data?.hubspot && (
            <Section title="HubSpot CRM">
              <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-1)' }}>
                {data.hubspot.lifecycle && (
                  <p><span style={{ color: 'var(--text-3)' }}>Lifecycle: </span>{data.hubspot.lifecycle}</p>
                )}
                {data.hubspot.leadStatus && (
                  <p><span style={{ color: 'var(--text-3)' }}>Lead status: </span>{data.hubspot.leadStatus}</p>
                )}
                {data.hubspot.funnelPhase && (
                  <p><span style={{ color: 'var(--text-3)' }}>Funnel phase: </span>{data.hubspot.funnelPhase}</p>
                )}
                {typeof data.hubspot.score !== 'undefined' && data.hubspot.score && (
                  <p><span style={{ color: 'var(--text-3)' }}>Predictive score: </span>{data.hubspot.score}</p>
                )}
                <p className="text-[11px] mt-2" style={{ color: 'var(--text-3)' }}>
                  vid: {data.hubspot.vid}
                </p>
              </div>
            </Section>
          )}

          {/* ─── Engagements / historial ─── */}
          {data?.hubspot?.engagements && data.hubspot.engagements.length > 0 && (
            <Section title={`Historial · ${data.hubspot.engagements.length} eventos`}>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {data.hubspot.engagements.slice(0, 20).map((e: any) => (
                  <div
                    key={e.id}
                    className="p-2.5 rounded-md text-[11px]"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
                        style={{
                          background: e.direction === 'out' ? '#22C55E25' : '#60A5FA25',
                          color:      e.direction === 'out' ? '#22C55E'   : '#60A5FA',
                          fontSize:   '9px',
                        }}
                      >
                        {e.type} {e.direction === 'out' ? '→' : '←'}
                      </span>
                      <span className="ml-auto" style={{ color: 'var(--text-3)' }}>
                        {new Date(e.timestamp).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {e.subject && <p className="font-medium" style={{ color: 'var(--text-1)' }}>{e.subject}</p>}
                    {e.preview && (
                      <p className="mt-1 truncate" style={{ color: 'var(--text-2)' }}>{e.preview}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Footer — acciones rápidas */}
        <div
          className="p-4 space-y-2.5"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
        >
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            Mover a fase del funnel
          </p>
          <div className="grid grid-cols-3 gap-2">
            <ActionBtn label="Interesado"   icon={ThumbsUp}   color="#22C55E" disabled={moving} onClick={() => moveFunnel('interesado')} />
            <ActionBtn label="No"           icon={ThumbsDown} color="#94A3B8" disabled={moving} onClick={() => moveFunnel('no_interesado')} />
            <ActionBtn label="Auto"         icon={RefreshCw}  color="#60A5FA" disabled={moving} onClick={() => moveFunnel('__auto__')} />
          </div>

          <p className="text-[10px] uppercase tracking-wider mt-3" style={{ color: 'var(--text-3)' }}>
            Estado de conversación
          </p>
          <div className="grid grid-cols-3 gap-2">
            <ActionBtn label="Pendiente"     color="#F59E0B" disabled={moving} onClick={() => changeConvStatus('pendiente')} small />
            <ActionBtn label="Esperando"     color="#60A5FA" disabled={moving} onClick={() => changeConvStatus('esperando')} small />
            <ActionBtn label="Cerrada"       color="#22C55E" disabled={moving} onClick={() => changeConvStatus('cerrada')} small />
            <ActionBtn label="No interesado" color="#94A3B8" disabled={moving} onClick={() => changeConvStatus('no_interesado')} small />
            <ActionBtn label="Mail obsoleto" color="#EF4444" disabled={moving} onClick={() => changeConvStatus('mail_obsoleto')} small />
          </div>
        </div>
      </aside>
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, link }: { icon: React.ElementType; label: string; value: string; link?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon size={12} style={{ color: 'var(--text-3)', marginTop: 2 }} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{label}</p>
        {link
          ? <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
               className="truncate block" style={{ color: 'var(--blue)' }}>{value}</a>
          : <p className="truncate" style={{ color: 'var(--text-1)' }}>{value}</p>}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div
      className="text-center p-2 rounded-md"
      style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
    >
      <Icon size={11} style={{ color: 'var(--text-3)', margin: '0 auto' }} />
      <p className="text-base font-bold mt-1" style={{ color: 'var(--text-1)' }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{label}</p>
    </div>
  )
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
      style={{ background: color + '25', color }}
    >
      {label}
    </span>
  )
}

function SystemBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: color + '25', color, border: `1px solid ${color}40` }}
    >
      ✓ {label}
    </span>
  )
}

function ActionBtn({
  label, icon: Icon, color, disabled, onClick, small,
}: { label: string; icon?: React.ElementType; color: string; disabled?: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md ${small ? 'text-[10px]' : 'text-xs'} font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
      style={{
        background: 'var(--bg-base)',
        color:      color,
        border:     `1px solid ${color}30`,
      }}
    >
      {Icon && <Icon size={11} />}
      {label}
    </button>
  )
}
