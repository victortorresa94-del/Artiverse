'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, RefreshCw, ExternalLink, Mail, Building2, MapPin,
  Calendar, ChevronRight, Zap, Globe, Phone, Users, Clock,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface RutaContact {
  email: string; company: string; contact: string; phone: string
  website: string; city: string; segment: string
  campaignName?: string; lastContact?: string; opens?: number; replies?: number
  artName?: string; subscription?: string; hasAgency?: boolean
  agencyName?: string; registeredAt?: string
  source: 'excel' | 'instantly' | 'artiverse'
}

interface NodeData {
  count: number
  breakdown: Record<string, number>
  contacts: RutaContact[]
  hasMore: boolean
}

interface RutaData {
  last_updated: string; total_base: number
  nodes: Record<string, NodeData>
  conversion_rates: Record<string, number | null>
  campaigns: { id: string; name: string; sent: number; opened: number; replied: number; bounced: number }[]
  cached?: boolean; stale?: boolean
}

// ── Node definitions ───────────────────────────────────────────────────────────

interface NodeDef {
  key: string; label: string; sub: string
  color: string; glow: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isMeta?: boolean; isDown?: boolean
}

const OUTBOUND_NODES: NodeDef[] = [
  { key: 'base_contactos', label: 'Universo', sub: 'base total',    color: '#4B5563', glow: '#6B728066', size: 'lg' },
  { key: 'enviado',        label: 'Enviado',  sub: 'email sent',    color: '#1E40AF', glow: '#2563EB55', size: 'md' },
  { key: 'abierto',        label: 'Abierto',  sub: 'email opened',  color: '#2563EB', glow: '#3B82F655', size: 'md' },
  { key: 'respondido',     label: 'Respondido', sub: 'replied',     color: '#0284C7', glow: '#0EA5E955', size: 'md' },
]

const INBOUND_NODES: NodeDef[] = [
  { key: 'registrado',         label: 'Registrado',  sub: 'plataforma',      color: '#0E7490', glow: '#06B6D455', size: 'md' },
  { key: 'verificado',         label: 'Verificado',  sub: 'email ok',        color: '#047857', glow: '#10B98155', size: 'md' },
  { key: 'perfil_completo',    label: 'Perfil',      sub: 'completo',        color: '#15803D', glow: '#22C55E55', size: 'md' },
  { key: 'agencia_registrada', label: 'Agencia',     sub: 'registrada',      color: '#4D7C0F', glow: '#84CC1655', size: 'md' },
  { key: 'total_pro',          label: 'PRO',         sub: 'suscriptores',    color: '#CCFF00', glow: '#CCFF0066', size: 'xl', isMeta: true },
]

const OUTBOUND_RATES = ['base_to_enviado', 'enviado_to_abierto', 'abierto_to_respondido']
const INBOUND_RATES  = ['registrado_to_verificado', 'verificado_to_perfil', 'perfil_to_agencia', 'agencia_to_pro']

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) { return n >= 1000 ? n.toLocaleString('es-ES') : String(n) }
function pct(r: number | null | undefined) {
  if (r == null) return null
  return `${(r * 100).toFixed(1)}%`
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'hace un momento'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  return `hace ${Math.floor(s / 3600)} h`
}

// ── Counter-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, delay = 0, run = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run || !target) return
    const tid = setTimeout(() => {
      const start = Date.now()
      const dur = Math.min(800 + target / 5, 1400)
      const tick = () => {
        const p = Math.min((Date.now() - start) / dur, 1)
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(tid)
  }, [target, delay, run])
  return val
}

// ── Node component ─────────────────────────────────────────────────────────────

function RutaNodeCircle({
  def, count, onClick, onHover, onLeave, animated, delay, isSelected,
}: {
  def: NodeDef; count: number; onClick: () => void
  onHover: () => void; onLeave: () => void
  animated: boolean; delay: number; isSelected: boolean
}) {
  const displayed = useCountUp(count, delay, animated)

  const sizes = {
    sm: { outer: 72, inner: 56 },
    md: { outer: 88, inner: 68 },
    lg: { outer: 104, inner: 82 },
    xl: { outer: 128, inner: 100 },
  }
  const sz = sizes[def.size ?? 'md']

  return (
    <div
      className={`flex flex-col items-center gap-2 cursor-pointer group node-pop ${isSelected ? 'opacity-100' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Outer ring */}
      <div
        className={`relative flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110 ${def.isMeta ? 'meta-pulse' : ''}`}
        style={{
          width:  sz.outer,
          height: sz.outer,
          background: `radial-gradient(circle at 35% 35%, ${def.color}22, ${def.color}08)`,
          border: `2px solid ${def.color}`,
          boxShadow: `0 0 20px 4px ${def.glow}, inset 0 0 20px ${def.color}11`,
        }}
      >
        {/* Inner circle */}
        <div
          className="flex flex-col items-center justify-center rounded-full"
          style={{
            width:  sz.inner,
            height: sz.inner,
            background: `radial-gradient(circle at 40% 30%, ${def.color}18, transparent)`,
          }}
        >
          <span
            className="font-mono font-bold leading-none tabular-nums"
            style={{
              fontSize: def.isMeta ? 28 : def.size === 'lg' ? 24 : 20,
              color: def.isMeta ? '#CCFF00' : '#F9FAFB',
              textShadow: def.isMeta ? `0 0 20px #CCFF00` : `0 0 12px ${def.color}`,
            }}
          >
            {fmt(animated ? displayed : count)}
            {def.key === 'respondido' && count <= 5 && (
              <span className="text-sm ml-0.5" style={{ color: def.color }}>+</span>
            )}
          </span>
        </div>

        {/* Hover ring pulse */}
        <div
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: `0 0 40px 8px ${def.glow}` }}
        />
      </div>

      {/* Label */}
      <div className="text-center">
        <div
          className="text-xs font-semibold uppercase tracking-wider leading-tight"
          style={{ color: def.isMeta ? '#CCFF00' : def.color }}
        >
          {def.label}
        </div>
        <div className="text-[10px] text-gray-600 mt-0.5">{def.sub}</div>
      </div>
    </div>
  )
}

// ── Connector ──────────────────────────────────────────────────────────────────

function Connector({ rate, fromColor, toColor, animated }: {
  rate: number | null | undefined; fromColor: string; toColor: string; animated: boolean
}) {
  const label = pct(rate)
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative px-1 min-w-[40px]">
      {label && (
        <div
          className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono whitespace-nowrap px-1.5 py-0.5 rounded"
          style={{ color: '#9CA3AF', background: '#0F0F1A' }}
        >
          {label}
        </div>
      )}
      {/* The road line */}
      <div
        className="w-full h-[2px] rounded-full relative overflow-hidden road-shimmer"
        style={{
          background: `linear-gradient(90deg, ${fromColor}99, ${toColor}99)`,
          boxShadow: animated ? `0 0 8px 1px ${fromColor}44` : 'none',
          opacity: animated ? 1 : 0.3,
          transition: 'opacity 0.8s ease',
        }}
      />
      {/* Arrow tip */}
      <ChevronRight
        size={14}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1"
        style={{ color: `${toColor}88` }}
      />
    </div>
  )
}

// ── Bounce node (drops down) ───────────────────────────────────────────────────

function BounceNode({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <div className="absolute" style={{ left: '38%', top: 'calc(100% + 16px)' }}>
      {/* Drop line */}
      <div className="absolute -top-6 left-1/2 w-[2px] h-6 -translate-x-1/2"
        style={{ background: 'linear-gradient(to bottom, #EF444433, #EF444499)' }}
      />
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all hover:scale-105"
        style={{
          background: '#1A0A0A', border: '1px solid #EF444433',
          color: '#EF4444', boxShadow: '0 0 12px #EF444422',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        BOUNCED · {count}
        <span className="text-red-800 text-[9px]">↓ fuera de ruta</span>
      </button>
    </div>
  )
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

function NodeTooltip({ def, node }: { def: NodeDef; node: NodeData }) {
  const entries = Object.entries(node.breakdown).sort((a, b) => b[1] - a[1]).slice(0, 6)
  if (!entries.length) return null
  return (
    <div
      className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 z-50 min-w-[200px] rounded-xl p-3 text-xs pointer-events-none"
      style={{ background: '#0D0D1F', border: `1px solid ${def.color}33`, boxShadow: `0 8px 32px ${def.glow}` }}
    >
      <div className="font-semibold mb-2" style={{ color: def.color }}>{def.label}</div>
      <div className="space-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 text-gray-400">
            <span className="truncate">{k}</span>
            <span className="font-mono font-bold" style={{ color: def.color }}>{v}</span>
          </div>
        ))}
        {node.hasMore && (
          <div className="text-gray-600 pt-1 text-center">+ más... click para ver todos</div>
        )}
      </div>
    </div>
  )
}

// ── Lane component ─────────────────────────────────────────────────────────────

function Lane({
  label, icon, nodes, rateKeys, data, animated,
  selectedNode, onSelect, baseDelay,
}: {
  label: string; icon: React.ReactNode
  nodes: NodeDef[]; rateKeys: string[]
  data: RutaData; animated: boolean
  selectedNode: string | null; onSelect: (k: string) => void
  baseDelay: number
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3">
      {/* Lane label */}
      <div className="flex items-center gap-2 px-2">
        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-600 flex items-center gap-1.5">
          {icon}
          {label}
        </div>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #374151, transparent)' }} />
      </div>

      {/* Nodes row */}
      <div className="flex items-center relative">
        {nodes.map((def, i) => {
          const nodeData = data.nodes[def.key]
          if (!nodeData) return null
          const isLast = i === nodes.length - 1
          const rateKey = rateKeys[i]
          const rate = data.conversion_rates[rateKey]
          const nextNode = nodes[i + 1]
          const delay = baseDelay + i * 120

          return (
            <div key={def.key} className={`flex items-center ${isLast ? '' : 'flex-1'} relative`}>
              <div className="relative flex items-center justify-center">
                <RutaNodeCircle
                  def={def} count={nodeData.count}
                  onClick={() => onSelect(def.key)}
                  onHover={() => setHovered(def.key)}
                  onLeave={() => setHovered(null)}
                  animated={animated} delay={delay}
                  isSelected={selectedNode === def.key}
                />
                {/* Tooltip */}
                {hovered === def.key && (
                  <NodeTooltip def={def} node={nodeData} />
                )}
                {/* Bounce node special case (drops below ENVIADO) */}
                {def.key === 'enviado' && data.nodes.bounced?.count > 0 && (
                  <BounceNode count={data.nodes.bounced.count} onClick={() => onSelect('bounced')} />
                )}
              </div>

              {!isLast && nextNode && (
                <Connector
                  rate={rate}
                  fromColor={def.color}
                  toColor={nextNode.color}
                  animated={animated}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Contact card in slide-over ─────────────────────────────────────────────────

function ContactCard({ c, onHubspot }: { c: RutaContact; onHubspot: (c: RutaContact) => void }) {
  const sourceBadge = {
    excel:      { label: 'Excel', bg: '#1F2937',   color: '#9CA3AF' },
    instantly:  { label: 'Instantly', bg: '#1E3A5F', color: '#60A5FA' },
    artiverse:  { label: 'Artiverse', bg: '#0C2A1B', color: '#34D399' },
  }[c.source]

  return (
    <div
      className="p-3 rounded-xl border transition-all duration-200 hover:border-gray-600"
      style={{ background: '#0D0D1F', borderColor: '#1F2937' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-100 truncate">
            {c.company || c.contact || c.email.split('@')[0]}
          </div>
          <div className="text-xs text-gray-500 truncate">{c.email}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
            style={{ background: sourceBadge.bg, color: sourceBadge.color }}
          >
            {sourceBadge.label}
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {c.city && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <MapPin size={10} /> {c.city}
          </span>
        )}
        {c.segment && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <Users size={10} /> {c.segment}
          </span>
        )}
        {c.campaignName && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <Mail size={10} /> {c.campaignName}
          </span>
        )}
        {(c.opens ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-[11px]" style={{ color: '#2563EB' }}>
            👁 {c.opens} aperturas
          </span>
        )}
        {c.subscription && c.subscription !== 'free' && (
          <span className="flex items-center gap-1 text-[11px]" style={{ color: '#CCFF00' }}>
            ✦ {c.subscription}
          </span>
        )}
        {c.registeredAt && (
          <span className="flex items-center gap-1 text-[11px] text-gray-600">
            <Calendar size={10} /> {c.registeredAt.slice(0, 10)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onHubspot(c)}
          className="hs-btn flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-all hover:opacity-90"
          style={{ background: '#FF7A5915', color: '#FF7A59', border: '1px solid #FF7A5933' }}
        >
          <Zap size={11} />
          Contactar en HubSpot
        </button>
        {c.website && (
          <a
            href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
            target="_blank" rel="noopener noreferrer"
            className="px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-opacity hover:opacity-80"
            style={{ background: '#1F2937', color: '#9CA3AF' }}
          >
            <Globe size={11} />
          </a>
        )}
      </div>
    </div>
  )
}

// ── HubSpot modal (mockup) ─────────────────────────────────────────────────────

function HubSpotModal({ contact, onClose }: { contact: RutaContact; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const subject = `Artiverse — Te quiero presentar algo`
  const body = `Hola ${contact.contact || (contact.company ? `equipo de ${contact.company}` : 'equipo')},\n\n`

  const copyEmail = () => {
    navigator.clipboard.writeText(contact.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: '#00000088', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#0D0D1F', border: '1px solid #FF7A5933', boxShadow: '0 0 60px #FF7A5911' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#FF7A59' }} />
              <span className="text-sm font-semibold text-gray-100">Contactar en HubSpot</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {contact.company || contact.email}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Contact info */}
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-3">
              <Mail size={14} className="text-gray-600" />
              <span className="text-gray-300 font-mono text-xs">{contact.email}</span>
              <button
                onClick={copyEmail}
                className="ml-auto text-xs px-2 py-0.5 rounded transition-colors"
                style={{ color: copied ? '#34D399' : '#6B7280', background: '#1F2937' }}
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            {contact.company && (
              <div className="flex items-center gap-3">
                <Building2 size={14} className="text-gray-600" />
                <span className="text-gray-400 text-xs">{contact.company}</span>
              </div>
            )}
            {contact.city && (
              <div className="flex items-center gap-3">
                <MapPin size={14} className="text-gray-600" />
                <span className="text-gray-400 text-xs">{contact.city}</span>
              </div>
            )}
          </div>

          {/* Nota integración */}
          <div
            className="rounded-lg p-3 text-xs"
            style={{ background: '#FF7A5909', border: '1px solid #FF7A5922', color: '#FF7A59' }}
          >
            <div className="font-semibold mb-1">Integración HubSpot — próximamente</div>
            <div className="text-gray-500 leading-relaxed">
              El botón creará automáticamente el contacto en HubSpot y abrirá un deal vacío listo para editar.
              Por ahora puedes contactar directamente:
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <a
              href={`mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#2563EB', color: '#fff' }}
            >
              <Mail size={14} />
              Abrir en cliente de email
            </a>
            <button
              className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-gray-500 border border-gray-800 hover:border-gray-700 transition-colors"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Slide-over ─────────────────────────────────────────────────────────────────

const NODE_LABELS: Record<string, string> = {
  base_contactos:         'Base de contactos',
  sin_contactar:          'Sin contactar',
  enviado:                'Email enviado',
  abierto:                'Ha abierto',
  respondido:             'Ha respondido',
  bounced:                'Bounced / Fuera de ruta',
  registrado:             'Registrado en plataforma',
  verificado:             'Email verificado',
  perfil_completo:        'Perfil completo',
  agencia_registrada:     'Agencia registrada',
  programador_explorando: 'Explorando',
  pro_agencia:            'Pro — Agencia',
  pro_programador:        'Pro — Programador',
  total_pro:              'Suscriptores Pro',
}

function SlideOver({
  nodeKey, data, onClose, onHubspot,
}: {
  nodeKey: string; data: RutaData; onClose: () => void; onHubspot: (c: RutaContact) => void
}) {
  const node = data.nodes[nodeKey]
  if (!node) return null

  const def = [...OUTBOUND_NODES, ...INBOUND_NODES].find(n => n.key === nodeKey)
  const color = def?.color ?? '#2563EB'
  const label = NODE_LABELS[nodeKey] ?? nodeKey
  const [search, setSearch] = useState('')

  const filtered = search
    ? node.contacts.filter(c =>
        [c.email, c.company, c.city, c.segment, c.campaignName].join(' ')
          .toLowerCase().includes(search.toLowerCase())
      )
    : node.contacts

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 480, background: '#090913', borderLeft: `1px solid ${color}22` }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-800/60 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
                <span className="text-base font-bold text-gray-100">{label}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold" style={{ color }}>
                  {fmt(node.count)}
                </span>
                <span className="text-xs text-gray-500">contactos en esta fase</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-400 transition-colors mt-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Breakdown pills */}
          {Object.keys(node.breakdown).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(node.breakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([k, v]) => (
                  <span
                    key={k}
                    className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: `${color}15`, color: `${color}CC` }}
                  >
                    {k} · {v}
                  </span>
                ))
              }
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            placeholder="Buscar empresa, email, ciudad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mt-3 w-full text-sm bg-transparent outline-none placeholder-gray-700 text-gray-300 border-b border-gray-800 pb-1 focus:border-gray-600 transition-colors"
          />
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto ruta-scroll px-6 py-4 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center text-gray-600 text-sm py-12">
              {search ? 'Sin resultados para tu búsqueda' : 'No hay contactos en esta fase'}
            </div>
          )}
          {filtered.map((c, i) => (
            <ContactCard key={`${c.email}-${i}`} c={c} onHubspot={onHubspot} />
          ))}
          {node.hasMore && !search && (
            <div
              className="text-center text-xs py-3 rounded-xl"
              style={{ color: color, background: `${color}08`, border: `1px dashed ${color}33` }}
            >
              Mostrando los primeros 80 contactos.{' '}
              <a href="/pipeline" className="underline hover:opacity-80">
                Ver todos en Pipeline →
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function LaneSkeleton({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex items-center ${i < count - 1 ? 'flex-1' : ''}`}>
          <div
            className="rounded-full animate-pulse shrink-0"
            style={{ width: 88, height: 88, background: '#1F2937' }}
          />
          {i < count - 1 && (
            <div className="flex-1 h-[2px] mx-2 rounded-full animate-pulse" style={{ background: '#1F2937' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function RutaPage() {
  const [data, setData] = useState<RutaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [animated, setAnimated] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hubspotContact, setHubspotContact] = useState<RutaContact | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setAnimated(false)
    try {
      const res = await fetch('/api/ruta?token=AETHER2026')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d: RutaData = await res.json()
      setData(d)
      setTimeout(() => setAnimated(true), 100)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Close slide-over on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNode(null)
        setHubspotContact(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col ruta-scroll"
      style={{ background: '#080810', color: '#F9FAFB' }}
    >
      {/* ── Header ── */}
      <header
        className="shrink-0 px-8 py-4 flex items-center justify-between border-b"
        style={{ borderColor: '#1F2937', background: '#09090F' }}
      >
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-lg font-bold tracking-tight"
                style={{ background: 'linear-gradient(135deg, #2563EB, #CCFF00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                RUTA ARTIVERSE
              </span>
              <span className="text-[10px] uppercase tracking-widest text-gray-600 mt-0.5">
                · mapa de crecimiento
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {data && (
                <>
                  <span className="text-xs text-gray-600">
                    <span className="font-mono text-gray-400">{fmt(data.total_base)}</span> contactos en la base
                  </span>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-600">
                    actualizado {timeAgo(data.last_updated)}
                  </span>
                  {data.cached && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#1F2937', color: '#6B7280' }}>
                      CACHÉ
                    </span>
                  )}
                  {data.stale && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#1A0A0A', color: '#EF4444' }}>
                      CACHÉ ANTIGUA
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Conversion summary */}
          {data && (
            <div className="hidden lg:flex items-center gap-4 text-xs text-gray-600 mr-4">
              <div className="text-center">
                <div className="font-mono font-bold text-sm" style={{ color: '#CCFF00' }}>
                  {pct(data.conversion_rates.registrado_to_pro) ?? '—'}
                </div>
                <div className="text-[10px]">registrado → Pro</div>
              </div>
              <div className="w-px h-6 bg-gray-800" />
              <div className="text-center">
                <div className="font-mono font-bold text-sm" style={{ color: '#2563EB' }}>
                  {pct(data.conversion_rates.enviado_to_abierto) ?? '—'}
                </div>
                <div className="text-[10px]">open rate</div>
              </div>
              <div className="w-px h-6 bg-gray-800" />
              <div className="text-center">
                <div className="font-mono font-bold text-sm" style={{ color: '#4B5563' }}>
                  {pct(data.conversion_rates.base_to_pro) ?? '—'}
                </div>
                <div className="text-[10px]">base → Pro</div>
              </div>
            </div>
          )}

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: '#1F2937', color: '#9CA3AF' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main
        className="flex-1 flex flex-col justify-center gap-0 px-8 overflow-hidden"
        style={{ paddingTop: '5vh', paddingBottom: '5vh' }}
      >
        {error && (
          <div className="text-center py-12 text-red-400 text-sm">
            Error cargando datos: {error}
            <button onClick={load} className="ml-3 underline">Reintentar</button>
          </div>
        )}

        {/* ── OUTBOUND LANE ── */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            background: 'linear-gradient(135deg, #0D1021, #090910)',
            border: '1px solid #1E3A5F33',
            boxShadow: '0 4px 40px #2563EB08',
          }}
        >
          {loading || !data ? (
            <>
              <div className="w-40 h-3 rounded animate-pulse mb-6" style={{ background: '#1F2937' }} />
              <LaneSkeleton count={4} />
            </>
          ) : (
            <Lane
              label="OUTBOUND — EMAIL FRÍO"
              icon={<Mail size={10} />}
              nodes={OUTBOUND_NODES}
              rateKeys={OUTBOUND_RATES}
              data={data}
              animated={animated}
              selectedNode={selectedNode}
              onSelect={k => setSelectedNode(k === selectedNode ? null : k)}
              baseDelay={200}
            />
          )}
        </div>

        {/* Divider with stats */}
        {data && !loading && (
          <div className="flex items-center gap-6 px-4 mb-6">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #374151, transparent)' }} />
            <div className="flex items-center gap-6 text-xs text-gray-700">
              <span>
                <span className="font-mono text-gray-500">{pct(data.conversion_rates.abierto_to_respondido)}</span>
                {' '}reply rate
              </span>
              <span className="text-gray-600">→ respondidos entran a Artiverse</span>
              <span>
                <span className="font-mono text-gray-500">{pct(data.conversion_rates.registrado_to_pro)}</span>
                {' '}conversion to Pro
              </span>
            </div>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #374151, transparent)' }} />
          </div>
        )}

        {/* ── INBOUND LANE ── */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, #091809, #090910)',
            border: '1px solid #16A34A22',
            boxShadow: '0 4px 40px #22C55E06',
          }}
        >
          {loading || !data ? (
            <>
              <div className="w-48 h-3 rounded animate-pulse mb-6" style={{ background: '#1F2937' }} />
              <LaneSkeleton count={5} />
            </>
          ) : (
            <Lane
              label="INBOUND — PLATAFORMA ARTIVERSE"
              icon={<Zap size={10} />}
              nodes={INBOUND_NODES}
              rateKeys={INBOUND_RATES}
              data={data}
              animated={animated}
              selectedNode={selectedNode}
              onSelect={k => setSelectedNode(k === selectedNode ? null : k)}
              baseDelay={600}
            />
          )}
        </div>

        {/* ── Campaign summary table ── */}
        {data && !loading && data.campaigns.filter(c => c.sent > 0).length > 0 && (
          <div className="mt-6 rounded-2xl overflow-hidden" style={{ border: '1px solid #1F2937' }}>
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ background: '#0D0D1F', borderBottom: '1px solid #1F2937' }}
            >
              <span className="text-xs uppercase tracking-widest text-gray-600">Campañas Instantly</span>
              <span className="text-xs text-gray-600">{data.campaigns.filter(c => c.sent > 0).length} activas</span>
            </div>
            <div style={{ background: '#090910' }}>
              {data.campaigns.filter(c => c.sent > 0).map(c => {
                const openRate = c.sent > 0 ? c.opened / c.sent : 0
                return (
                  <div
                    key={c.id}
                    className="px-5 py-2.5 flex items-center gap-4 border-b text-xs"
                    style={{ borderColor: '#1F293733' }}
                  >
                    <span className="text-gray-400 flex-1 truncate">{c.name}</span>
                    <div className="flex items-center gap-3 text-gray-600">
                      <span className="font-mono"><span className="text-gray-400">{c.sent}</span> enviados</span>
                      <span className="font-mono" style={{ color: openRate > 0.5 ? '#22C55E' : '#2563EB' }}>
                        {c.opened} abiertos ({(openRate * 100).toFixed(0)}%)
                      </span>
                      {c.replied > 0 && (
                        <span className="font-mono text-sky-400">{c.replied} replied</span>
                      )}
                      {c.bounced > 0 && (
                        <span className="font-mono text-red-600">{c.bounced} bounced</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Slide-over ── */}
      {selectedNode && data && (
        <SlideOver
          nodeKey={selectedNode}
          data={data}
          onClose={() => setSelectedNode(null)}
          onHubspot={setHubspotContact}
        />
      )}

      {/* ── HubSpot modal ── */}
      {hubspotContact && (
        <HubSpotModal
          contact={hubspotContact}
          onClose={() => setHubspotContact(null)}
        />
      )}
    </div>
  )
}
