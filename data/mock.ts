export type CampaignStatus = 'active' | 'paused' | 'pending' | 'completed';
export type FunnelStage =
  | 'sin_contactar'
  | 'email1_enviado'
  | 'email2_enviado'
  | 'email3_enviado'
  | 'contactado_instagram'
  | 'contactado_whatsapp'
  | 'contactado_telefono'
  | 'respondio_interesado'
  | 'reunion_agendada'
  | 'dentro_plataforma'
  | 'no_interesado';

export type InboundStage =
  | 'registrado'
  | 'perfil_incompleto'
  | 'perfil_completo'
  | 'bienvenida_enviada'
  | 'activo'
  | 'inactivo';

export type Priority = 'alta' | 'media' | 'baja';
export type Channel = 'email' | 'whatsapp' | 'instagram' | 'telefono';
export type Segment =
  | 'Teatro-Danza'
  | 'Salas Conciertos'
  | 'Festivales'
  | 'Dance from Spain'
  | 'Socios ARTE'
  | 'Distribuidoras';

export type UserSource = 'outreach' | 'organic' | 'referral' | 'unknown';
export type Subscription = 'free' | 'pro' | 'business' | 'custom';
export type UserRole = 'registered' | 'admin' | 'unassigned';

export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  company: string;
  source: UserSource;
  sourceCampaign?: string;
  sourceSegment?: Segment;
  registeredAt: string;
  emailVerified: boolean;
  inboundStage: InboundStage;
  hasAgency: boolean;
  agencyName?: string;
  subscription: Subscription;
  profileComplete: boolean;
  isPromotor: boolean;
  role: UserRole;
  notes: string;
  nextAction: string;
}

export interface EmailStep {
  step: number;
  delayDays: number;
  subject: string;
  body: string;
  sent: number;
  openRate: number;
  replyRate: number;
}

export interface Campaign {
  id: string;
  name: string;
  segment: Segment;
  sendingEmail: string;
  status: CampaignStatus;
  totalContacts: number;
  emailsSent: number;
  openRate: number;
  replyRate: number;
  warmupPercent: number;
  steps: EmailStep[];
}

export type EmailStatus = 'not_sent' | 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced';

export interface Lead {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  instagram: string;
  city: string;
  segment: Segment;
  channel: Channel;
  stage: FunnelStage;
  emailStatus: EmailStatus;
  lastContact: string;
  nextAction: string;
  notes: string;
  inPlatform: boolean;
  priority: Priority;
  campaignId: string;
}

export interface DomainWarmup {
  domain: string;
  email: string;
  warmupPercent: number;
  warmupEmailsToday: number;
  campaignEmailsToday: number;
  dailyTarget: number;
  status: 'warming' | 'ready' | 'paused';
  startDate: string;
  reputationScore: number;
}

// ─── CAMPAIGNS ───────────────────────────────────────────────────────────────

const TEATROS_BODY_1 = `Hola {{firstName}},

Supongo que lleváis años enviando dossieres a teatros y auditorios que no responden, perdiendo licitaciones porque llegasteis tarde a saberlo, y consiguiendo contratos solo a través de quien os conoce.

El problema no sois vosotros.

Es que nunca ha existido un sitio donde los programadores de teatros, auditorios y centros culturales de este país puedan encontrar compañías como la vuestra para su programación.

El sector funciona por contactos. Siempre ha sido así. Hasta hoy.

Hemos creado ARTIVERSE, una plataforma que conecta a todos los profesionales del sector de las artes escénicas en un solo lugar.

En Artiverse encontrarás:
• Perfil profesional visible para programadores de todo el país
• Licitaciones públicas centralizadas en un solo sitio
• Buscador de artistas por disciplina y estilo
• Tablón de oportunidades y convocatorias del sector
• Insights del mercado escénico
• Contacto directo dentro de la plataforma

El objetivo es que los programadores de teatros, auditorios y centros culturales de toda España encuentren compañías como {{companyName}} cuando están creando su programación. No al revés.

Estamos en primera fase de crecimiento, y compañías MPC Management, Meteórica, Darlalata y Calaverita Records ya tienen su perfil.

Cuantas más compañías estén dentro, más razones tendrán los programadores para venir a buscar aquí.

Crear el perfil de {{companyName}} es gratuito y lleva cinco minutos.

¡Nos vemos dentro! → artiverse.es`;

const TEATROS_BODY_2 = `¡Hola!

Te contacté hace algunos días, contándote sobre Artiverse.

Por si no pudiste leerlo, Artiverse es la primera plataforma que reúne a todos los profesionales del sector escénico español en un solo lugar: compañías, agencias, programadores, salas y festivales.

Ya tenemos más de 130 perfiles activos. Y cada semana entran más programadores buscando compañías para su temporada.

Crear el perfil de tu compañía es gratuito. → artiverse.es`;

const TEATROS_BODY_3 = `Hola {{firstName}},

Este es mi último intento de contacto.

Las mejores agencias, salas y teatros de españa ya están cerrando contratos desde Artiverse.

Crear vuestro perfil es gratuito y lleva cinco minutos. Si en algún momento queréis estar dentro, aquí está el enlace: artiverse.es

Suerte con la temporada.`;

export const campaigns: Campaign[] = [
  {
    id: 'teatros',
    name: 'Teatros',
    segment: 'Teatro-Danza',
    sendingEmail: 'victor@artiversemail.es',
    status: 'active',
    totalContacts: 159,
    emailsSent: 75,
    openRate: 18.7,
    replyRate: 2.7,
    warmupPercent: 87,
    steps: [
      {
        step: 1, delayDays: 0,
        subject: 'Ya está bien de gestionar el arte por WhatsApp.',
        body: TEATROS_BODY_1,
        sent: 75, openRate: 18.7, replyRate: 2.7,
      },
      {
        step: 2, delayDays: 4,
        subject: 'Únete a la plataforma del mejor talento de España.',
        body: TEATROS_BODY_2,
        sent: 0, openRate: 0, replyRate: 0,
      },
      {
        step: 3, delayDays: 3,
        subject: 'Última oportunidad para formar parte de Artiverse',
        body: TEATROS_BODY_3,
        sent: 0, openRate: 0, replyRate: 0,
      },
    ],
  },
  {
    id: 'salas',
    name: 'Salas Conciertos 1',
    segment: 'Salas Conciertos',
    sendingEmail: 'victor@artiversemail.es',
    status: 'active',
    totalContacts: 374,
    emailsSent: 0,
    openRate: 0,
    replyRate: 0,
    warmupPercent: 87,
    steps: [
      {
        step: 1, delayDays: 0,
        subject: '¿Cuántos dossieres de artistas revisáis al mes en {{companyName}}?',
        body: `Hola {{firstName}},

Los programadores de salas reciben decenas de propuestas de artistas cada semana. La mayoría no encajan: formato equivocado, rider inasumible, o simplemente no es el estilo de la sala.

Artiverse es la plataforma donde vosotros buscáis en vez de recibir. Un catálogo de compañías y artistas verificados, filtrable por género, formato, aforo mínimo y disponibilidad.

Ya están dentro MPC Management, Meteórica, Darlalata, Calaverita Records y más de 130 organizaciones del sector.

El registro para salas es gratuito: artiverse.es`,
        sent: 0, openRate: 0, replyRate: 0,
      },
      {
        step: 2, delayDays: 4,
        subject: '',
        body: `Hola {{firstName}},

Te escribía la semana pasada sobre Artiverse. ¿Tuviste un momento de echarle un vistazo?

Si os interesa tener acceso al catálogo para la próxima temporada de {{companyName}}, en artiverse.es el registro es gratuito y en cinco minutos estáis dentro.

Víctor`,
        sent: 0, openRate: 0, replyRate: 0,
      },
      {
        step: 3, delayDays: 8,
        subject: '',
        body: `Hola {{firstName}},

Último mensaje, lo prometo.

Artiverse ya tiene más de 130 organizaciones del sector escénico español. Si en algún momento buscáis artistas para {{companyName}} o queréis estar en el radar de las compañías que programan en vuestra zona, en artiverse.es.

Víctor`,
        sent: 0, openRate: 0, replyRate: 0,
      },
    ],
  },
  {
    id: 'teatro-danza-2',
    name: 'Teatro Danza 2',
    segment: 'Teatro-Danza',
    sendingEmail: 'victor@artiverse.online',
    status: 'pending',
    totalContacts: 96,
    emailsSent: 0,
    openRate: 0,
    replyRate: 0,
    warmupPercent: 71,
    steps: [
      {
        step: 1, delayDays: 0,
        subject: 'Lleváis años mandando dossieres. Hay una forma mejor.',
        body: `Hola {{firstName}},

Supongo que lleváis tiempo enviando dossieres a teatros y festivales que no responden, buscándoos la vida por contactos, y llegando tarde a licitaciones que ni sabíais que existían.

El problema no sois vosotros.

Es que nunca ha existido un sitio donde los programadores de teatro-danza de este país puedan encontrar compañías como la vuestra para su programación.

Hemos creado ARTIVERSE, una plataforma que conecta a todos los profesionales de las artes escénicas en un solo lugar.

Crear el perfil de {{companyName}} es gratuito y lleva cinco minutos.

¡Nos vemos dentro! → artiverse.es`,
        sent: 0, openRate: 0, replyRate: 0,
      },
    ],
  },
  {
    id: 'dance-from-spain',
    name: 'Calentamiento - Dance from spain',
    segment: 'Dance from Spain',
    sendingEmail: 'victor@artiversemail.es',
    status: 'active',
    totalContacts: 50,
    emailsSent: 6,
    openRate: 0,
    replyRate: 0,
    warmupPercent: 87,
    steps: [
      {
        step: 1, delayDays: 1,
        subject: 'Lleváis años mandando dossieres. Hay una forma mejor.',
        body: `Hola {{firstName}},\n\nSupongo que lleváis años enviando dossieres a teatros y festivales que no responden, perdiendo contratos porque el programador no os conocía, y consiguiendo bolos solo a través de quien os conoce de antes.\n\nEl problema no sois vosotros.\n\nEs que nunca ha existido un sitio donde los programadores de danza de este país puedan encontrar compañías como la vuestra cuando están montando su temporada.\n\nHemos creado ARTIVERSE, la primera plataforma que conecta a todos los profesionales de la danza y las artes escénicas en un solo lugar.\n\nCrear el perfil de {{companyName}} es gratuito y lleva cinco minutos.\n\n¡Nos vemos dentro! → artiverse.es`,
        sent: 6, openRate: 0, replyRate: 0,
      },
      {
        step: 2, delayDays: 4,
        subject: 'Únete a la plataforma de danza de España.',
        body: `¡Hola!\n\nTe contacté hace algunos días, contándote sobre Artiverse.\n\nArtiverse es la primera plataforma que reúne a todos los profesionales de la danza y las artes escénicas de España en un solo lugar: compañías, coreógrafos, programadores, teatros y festivales.\n\nYa tenemos más de 130 perfiles activos. Y cada semana entran más programadores buscando compañías de danza para su temporada.\n\nCrear el perfil de tu compañía es gratuito. → artiverse.es`,
        sent: 0, openRate: 0, replyRate: 0,
      },
      {
        step: 3, delayDays: 3,
        subject: 'Última oportunidad para formar parte de Artiverse',
        body: `Hola {{firstName}},\n\nEste es mi último intento de contacto.\n\nLas mejores compañías de danza de España ya están en Artiverse, y los programadores de teatro y festivales vienen a buscar aquí.\n\nCrear vuestro perfil es gratuito y lleva cinco minutos. Si en algún momento queréis estar dentro: artiverse.es\n\nSuerte con la temporada.`,
        sent: 0, openRate: 0, replyRate: 0,
      },
    ],
  },
  {
    id: 'socios-arte',
    name: 'Socios ARTE 1',
    segment: 'Socios ARTE',
    sendingEmail: 'victor@artiverse.online',
    status: 'paused',
    totalContacts: 80,
    emailsSent: 12,
    openRate: 25.0,
    replyRate: 2.5,
    warmupPercent: 71,
    steps: [
      {
        step: 1, delayDays: 0,
        subject: 'Ya está bien de gestionar el arte por WhatsApp.',
        body: TEATROS_BODY_1,
        sent: 12, openRate: 25.0, replyRate: 2.5,
      },
    ],
  },
  {
    id: 'teatros-2',
    name: 'Teatros 2',
    segment: 'Teatro-Danza',
    sendingEmail: 'victor@artiverse.online',
    status: 'pending',
    totalContacts: 160,
    emailsSent: 0,
    openRate: 0,
    replyRate: 0,
    warmupPercent: 71,
    steps: [
      {
        step: 1, delayDays: 0,
        subject: 'Ya está bien de gestionar el arte por WhatsApp.',
        body: TEATROS_BODY_1,
        sent: 0, openRate: 0, replyRate: 0,
      },
    ],
  },
];

// ─── LEADS ────────────────────────────────────────────────────────────────────

export const leads: Lead[] = [
  // ── Dentro plataforma — CONFIRMADOS reales ─────────────────────────────────
  { id: '1', company: 'MPC Management', contact: '', email: 'info@mpcmanagement.es', phone: '', instagram: '', city: 'Madrid', segment: 'Teatro-Danza', channel: 'email', stage: 'dentro_plataforma', emailStatus: 'sent', lastContact: '2026-04-02', nextAction: '-', notes: 'En plataforma.', inPlatform: true, priority: 'alta', campaignId: 'teatros' },
  { id: '2', company: 'Meteórica', contact: '', email: 'info@meteorica.es', phone: '', instagram: '', city: 'Barcelona', segment: 'Teatro-Danza', channel: 'email', stage: 'dentro_plataforma', emailStatus: 'sent', lastContact: '2026-04-03', nextAction: '-', notes: 'En plataforma.', inPlatform: true, priority: 'alta', campaignId: 'teatros' },
  { id: '3', company: 'Darlalata', contact: '', email: 'info@darlalata.com', phone: '', instagram: '', city: 'Madrid', segment: 'Teatro-Danza', channel: 'email', stage: 'dentro_plataforma', emailStatus: 'sent', lastContact: '2026-04-01', nextAction: '-', notes: 'En plataforma.', inPlatform: true, priority: 'media', campaignId: 'teatros' },
  { id: '4', company: 'Calaverita Records', contact: '', email: 'info@calaverita.es', phone: '', instagram: '', city: 'Sevilla', segment: 'Teatro-Danza', channel: 'email', stage: 'dentro_plataforma', emailStatus: 'sent', lastContact: '2026-03-30', nextAction: '-', notes: 'En plataforma.', inPlatform: true, priority: 'media', campaignId: 'teatros' },

  // ── Teatros — 75 enviados (email 1), campaña activa ────────────────────────
  { id: '12', company: 'Carver Producciones', contact: '', email: 'jcarrion@carverespectaculos.com', phone: '', instagram: '', city: 'Salamanca', segment: 'Teatro-Danza', channel: 'email', stage: 'email1_enviado', emailStatus: 'sent', lastContact: '2026-04-08', nextAction: 'Esperar respuesta', notes: '', inPlatform: false, priority: 'media', campaignId: 'teatros' },
  { id: '15', company: 'Iberia Producciones', contact: '', email: 'contratacion@iberiaproducciones.es', phone: '', instagram: '', city: 'Málaga', segment: 'Teatro-Danza', channel: 'email', stage: 'email1_enviado', emailStatus: 'sent', lastContact: '2026-04-08', nextAction: 'Esperar respuesta', notes: '', inPlatform: false, priority: 'baja', campaignId: 'teatros' },

  // ── Dance from Spain — 6 enviados, 0% open, 0% reply ──────────────────────
  { id: '5', company: 'The Music Republic', contact: '', email: 'j.torres@themusicrepublic.es', phone: '', instagram: '', city: 'Madrid', segment: 'Dance from Spain', channel: 'email', stage: 'email1_enviado', emailStatus: 'sent', lastContact: '2026-04-10', nextAction: 'Esperar respuesta', notes: '', inPlatform: false, priority: 'media', campaignId: 'dance-from-spain' },
  { id: '7', company: 'Share Music', contact: '', email: 'hugo@sharemusic.es', phone: '', instagram: '', city: 'Barcelona', segment: 'Dance from Spain', channel: 'email', stage: 'email1_enviado', emailStatus: 'sent', lastContact: '2026-04-10', nextAction: 'Esperar respuesta', notes: '', inPlatform: false, priority: 'media', campaignId: 'dance-from-spain' },
  { id: '18', company: 'Last Tour International', contact: '', email: 'yahve@lasttour.net', phone: '', instagram: '', city: 'Madrid', segment: 'Dance from Spain', channel: 'email', stage: 'email1_enviado', emailStatus: 'sent', lastContact: '2026-04-10', nextAction: 'Esperar respuesta', notes: '', inPlatform: false, priority: 'media', campaignId: 'dance-from-spain' },
  { id: '19', company: 'Aquintada Auga', contact: '', email: 'andrea.buergo@aquintadaauga.com', phone: '', instagram: '', city: 'Vigo', segment: 'Dance from Spain', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: '-', notes: '', inPlatform: false, priority: 'baja', campaignId: 'dance-from-spain' },
  { id: '20', company: 'Intercruises', contact: '', email: 'r.lopez@intercruises.com', phone: '', instagram: '', city: 'Barcelona', segment: 'Dance from Spain', channel: 'email', stage: 'email1_enviado', emailStatus: 'sent', lastContact: '2026-04-10', nextAction: 'Esperar respuesta', notes: '', inPlatform: false, priority: 'media', campaignId: 'dance-from-spain' },

  // ── Teatro Danza 2 — 0 enviados (pendiente activar) ────────────────────────
  { id: '8', company: 'Rotativa Performing Arts', contact: '', email: 'info@rotativaperformingarts.com', phone: '', instagram: '', city: 'Barcelona', segment: 'Teatro-Danza', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Pendiente — activar Teatro Danza 2', notes: '', inPlatform: false, priority: 'media', campaignId: 'teatro-danza-2' },
  { id: '9', company: 'Cía. Moveo', contact: '', email: 'info@ciamoveo.cat', phone: '', instagram: '', city: 'Barcelona', segment: 'Teatro-Danza', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Pendiente — activar Teatro Danza 2', notes: '', inPlatform: false, priority: 'media', campaignId: 'teatro-danza-2' },
  { id: '17', company: 'Cía. Niñas Malditas', contact: '', email: 'malditas.circo@gmail.com', phone: '', instagram: '', city: 'Madrid', segment: 'Teatro-Danza', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Pendiente — activar Teatro Danza 2', notes: '', inPlatform: false, priority: 'media', campaignId: 'teatro-danza-2' },

  // ── Salas Conciertos — 0 enviados aún (campaña recién activada 2026-04-11) ─
  { id: '6', company: 'GTS Talent', contact: '', email: 'maria.alba@gtstalent.com', phone: '', instagram: '', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: '-', notes: '', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: '10', company: 'A Mansalva', contact: '', email: 'info@amansalva.es', phone: '', instagram: '', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: '-', notes: '', inPlatform: false, priority: 'baja', campaignId: 'salas' },
  { id: '11', company: 'CERSA Music', contact: '', email: 'cersamusic@cersamusic.com', phone: '', instagram: '', city: 'Valencia', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: '-', notes: '', inPlatform: false, priority: 'baja', campaignId: 'salas' },
  { id: '13', company: 'Concert Tour Gestiones', contact: '', email: 'grupoconcerttour@grupoconcerttour.com', phone: '', instagram: '', city: 'Barcelona', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: '-', notes: '', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: '14', company: 'PRODUARTCE', contact: '', email: 'produartce@produartce.com', phone: '', instagram: '', city: 'Zaragoza', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: '-', notes: '', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: '16', company: 'Magazine Showbusiness', contact: '', email: 'felixcartagena@telefonica.net', phone: '', instagram: '', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: '-', notes: '', inPlatform: false, priority: 'baja', campaignId: 'salas' },

  // ── Salas Conciertos 1 — leads reales (374 en campaña activa desde 2026-04-11) ──
  // Prioridad alta = 1000+ cap o referente nacional. Research verificado.

  // 🔴 TOP TIER (nivel 3) — referentes nacionales
  { id: 'sc-01', company: 'Sala Apolo', contact: '', email: 'info@sala-apolo.com', phone: '934-414001', instagram: '@salaapolo', city: 'Barcelona', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '2905 cap (+ La [2] Apolo 800). Fundada 1943. Nitsa Club (electrónica), Caníbal Sound System. Indie, rock alt, hip-hop. ICONO. Mencionar ciclos propios al contactar.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-02', company: 'Razzmatazz', contact: '', email: 'info@salarazzmatazz.com', phone: '933-208200', instagram: '@salarazzmatazz', city: 'Barcelona', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '5 salas simultáneas (2130+700+223...). Referente europeo. Ferran Faidella (comunicación), Jose Alegre (art director). Modelo multisala = gestiona muchos artistas a la vez → pitch perfecto Artiverse.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-03', company: 'La Riviera', contact: '', email: 'info@larivieramadrid.com', phone: '', instagram: '@larivieramadrid', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '2000 cap (+terraza). 50+ años historia. Ha programado Arctic Monkeys, The Killers, Vetusta Morla, Love of Lesbian. 62+ conciertos en agenda 2026-27. Circuito medio-grande Madrid.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-04', company: 'Santana 27', contact: '', email: 'info@santana27.com', phone: '', instagram: '@santana27bilbao', city: 'Bilbao', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '1500 cap (Gold Room) + Blue Room 350 + Black Room 250. Desde 2005. Rock, metal, punk. Hub cultural País Vasco, paso obligado giras norte España.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-05', company: 'WiZink Center (Movistar Arena)', contact: '', email: 'info@wizinkcenter.es', phone: '', instagram: '@wizinkcenter', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '17.000 cap (renombrado Movistar Arena 2023). También "La Sala" (800). Live Nation / Eventim. Macrorecinto — pitch orientar a La Sala para artistas formato medio.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-06', company: 'Palacio Vistalegre Arena', contact: '', email: 'info@palaciovistalegre.com', phone: '', instagram: '@palaciovistalegre', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: 'TheArena 12.500 + TheCenter 5.500 + BlackBox 2.000. 3 espacios simultáneos = gestión compleja de artistas. Pitch: centralizar comunicación con múltiples artistas.', inPlatform: false, priority: 'alta', campaignId: 'salas' },

  // 🟡 NIVEL 2 — referentes regionales clave
  { id: 'sc-07', company: 'Zentral', contact: '', email: 'info@zentral.es', phone: '', instagram: '@zentralpamplona', city: 'Pamplona', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '1100 cap (Sala Ppal 900 + Sala 2 150). 300+ eventos/año. Casco Antiguo, vocación cultural institucional. Rock, indie, pop, electrónica, flamenco. Hub norte España.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-08', company: 'Teatro Nuevo Apolo', contact: '', email: 'programacion@somproduce.com', phone: '', instagram: '', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '1161 butacas. ATG Entertainment (2025). Musicales, flamenco, ópera, ballet. Pitch: artistas flamenco/lírica/espectáculo musical. Contacto vía programacion@somproduce.com.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-09', company: 'Sala Bikini', contact: '', email: 'info@bikini.es', phone: '', instagram: '@salabikini', city: 'Barcelona', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '700 cap. Desde 1953. L\'Illa (Diagonal 547). Pop, rock, indie, jazz, música latina. Público amplio/mainstream. Pitch: artistas pop-rock nacionales consolidados.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-10', company: 'Luz de Gas', contact: 'Fernando Vila Navarro', email: 'comunicacio@luzdegas.com', phone: '932-097711', instagram: '@luzdegas', city: 'Barcelona', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '900 cap. Desde 1995. +1000 actuaciones históricas. Jazz, soul, tributos (Bowie, ABBA), teatro, magia. Programación diaria → muchos artistas rotativos. Contacto Fernando Vila directo.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-11', company: 'Jimmy Jazz Gasteiz', contact: '', email: 'hola@jimmyjazz.com', phone: '', instagram: '@jimmyjazzgasteiz', city: 'Vitoria', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '800 cap. Centro histórico Vitoria. Rock, punk, metal, hip-hop. También teatro, monólogos, bertso saio. Vocación cultural vasca más allá del concierto. Pitch diversidad de propuestas Artiverse.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-12', company: 'Sala Capitol Santiago', contact: '', email: 'info@capitolsantiago.com', phone: '', instagram: '@capitolsantiago', city: 'Santiago de Compostela', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '800 cap. Desde 2003. Principal sala Galicia. Tres configuraciones: Capitol Club 270 / completo 800. Puerta de entrada giras noroeste peninsular.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-13', company: 'Sala Custom', contact: '', email: 'info@salacustom.com', phone: '', instagram: '@salacustom', city: 'Sevilla', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '700 cap. Pol. Industrial Calonge. Amaral, La Oreja de Van Gogh, Melendi, Nach. Acústica cuidada. Referente rock-pop andaluz. También Custom Club (DJs).', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-14', company: 'Salamandra', contact: '', email: 'info@salamandra.cat', phone: '', instagram: '@salamandrabarcelona', city: "L'Hospitalet", segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '800 cap. Desde 1996. Manu Chao, Mishima, Love of Lesbian, Toundra. Organiza Let\'s Festival (marzo). Ecosistema barcelonés. Fuerte indie/alternativo.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-15', company: 'Garaje Beat Club', contact: '', email: 'info@garajebeatclub.es', phone: '', instagram: '@garajebeatclub', city: 'Murcia', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '600 cap. +500m² tres espacios. Espacio de cultura más activo Región de Murcia. Rock, metal, punk, reggae. También teatro y monólogos. Líder sureste España.', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: 'sc-16', company: 'Sala Changó', contact: '', email: 'info@salachango.es', phone: '', instagram: '@salachango', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '600-1000 cap. Chamberí. Ha programado Izal, Miss Caffeina, artistas emergentes nacionales. También Cool Stage (~600, sala hermana). Circuito indie/alternativo Madrid tamaño medio.', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: 'sc-17', company: 'Galileo Galilei', contact: '', email: 'info@salagalileo.es', phone: '', instagram: '@salagalileoalilei', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '500 cap. Chamberí. Antigua sala de cine (2005). Pop, rock, jazz, flamenco, folk, monólogos, magia. Programación ecléctica — Artiverse ideal para discovery multi-género.', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: 'sc-18', company: 'Playa Club', contact: 'Carlos Landeira', email: 'programacion@playaclub.club', phone: '981-250063', instagram: '', city: 'A Coruña', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '650 cap. Contacto de programación directo. A Coruña. Email programacion@ → mejor apertura esperada.', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: 'sc-19', company: 'Sala Villanos (ex Caracol)', contact: '', email: 'info@salavillanos.es', phone: '', instagram: '@salavillanos', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '500 cap. Heredera de Sala Caracol (nueva identidad 2023). Legado: Rosalía en sus inicios, Los Planetas, Love of Lesbian. Underground Madrid. Clave artistas emergentes.', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: 'sc-20', company: 'Zentral (Teatro Calderón)', contact: '', email: 'programacion@somproduce.com', phone: '', instagram: '', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '986 butacas. Calle Atocha. beon. Entertainment (2025). Zarzuela, musicales, clásico, flamenco. Pitch: artistas espectáculo teatral/musical.', inPlatform: false, priority: 'media', campaignId: 'salas' },
];

// ─── WARMUP ───────────────────────────────────────────────────────────────────

export const domainWarmup: DomainWarmup[] = [
  {
    domain: 'artiversemail.es',
    email: 'victor@artiversemail.es',
    warmupPercent: 87,
    warmupEmailsToday: 28,
    campaignEmailsToday: 30,
    dailyTarget: 150,
    status: 'ready',
    startDate: '2026-03-10',
    reputationScore: 91,
  },
  {
    domain: 'artiverse.online',
    email: 'victor@artiverse.online',
    warmupPercent: 71,
    warmupEmailsToday: 35,
    campaignEmailsToday: 12,
    dailyTarget: 150,
    status: 'warming',
    startDate: '2026-03-24',
    reputationScore: 78,
  },
];

// ─── SUMMARY ──────────────────────────────────────────────────────────────────

const _activeCamps = campaigns.filter(c => c.emailsSent > 0);
export const summary = {
  totalEmailsSent: campaigns.reduce((s, c) => s + c.emailsSent, 0),
  avgOpenRate: _activeCamps.length > 0 ? Number((_activeCamps.reduce((s, c) => s + c.openRate, 0) / _activeCamps.length).toFixed(1)) : 0,
  avgReplyRate: _activeCamps.length > 0 ? Number((_activeCamps.reduce((s, c) => s + c.replyRate, 0) / _activeCamps.length).toFixed(1)) : 0,
  totalContacts: campaigns.reduce((s, c) => s + c.totalContacts, 0),
  usersInPlatform: 130,
  emailsPending: campaigns.reduce((s, c) => s + (c.totalContacts - c.emailsSent), 0),
};

export const FUNNEL_STAGES: { id: FunnelStage; label: string; color: string }[] = [
  { id: 'sin_contactar', label: 'Sin contactar', color: '#374151' },
  { id: 'email1_enviado', label: 'Email 1 enviado', color: '#1D4ED8' },
  { id: 'email2_enviado', label: 'Email 2 enviado', color: '#2563EB' },
  { id: 'email3_enviado', label: 'Email 3 enviado', color: '#3B82F6' },
  { id: 'contactado_instagram', label: 'Instagram DM', color: '#7C3AED' },
  { id: 'contactado_whatsapp', label: 'WhatsApp', color: '#059669' },
  { id: 'contactado_telefono', label: 'Teléfono', color: '#D97706' },
  { id: 'respondio_interesado', label: 'Interesado ✦', color: '#CCFF00' },
  { id: 'reunion_agendada', label: 'Reunión agendada', color: '#F59E0B' },
  { id: 'dentro_plataforma', label: 'En plataforma ✓', color: '#10B981' },
  { id: 'no_interesado', label: 'Descartado', color: '#6B7280' },
];

export const INBOUND_STAGES: { id: InboundStage; label: string; color: string }[] = [
  { id: 'registrado', label: 'Registrado', color: '#6366F1' },
  { id: 'perfil_incompleto', label: 'Perfil incompleto', color: '#F59E0B' },
  { id: 'perfil_completo', label: 'Perfil completo', color: '#10B981' },
  { id: 'bienvenida_enviada', label: 'Bienvenida enviada', color: '#3B82F6' },
  { id: 'activo', label: 'Activo', color: '#059669' },
  { id: 'inactivo', label: 'Inactivo', color: '#6B7280' },
];

// ─── PLATFORM USERS ──────────────────────────────────────────────────────────
// 115 usuarios reales del panel de administración de Artiverse
// Ordenados por fecha de registro (más reciente primero)

type U = PlatformUser
const _u = (id: string, email: string, name: string, company: string, agency: string, sub: Subscription, verified: boolean, profile: boolean, promotor: boolean, role: UserRole, source: UserSource, notes = '', next = ''): U => ({
  id, email, name, company, source,
  registeredAt: '',
  emailVerified: verified,
  hasAgency: !!agency,
  agencyName: agency || undefined,
  subscription: sub,
  profileComplete: profile,
  isPromotor: promotor,
  role,
  inboundStage: (profile && !!agency) ? 'activo' : profile ? 'perfil_completo' : !!agency ? 'perfil_incompleto' : 'registrado',
  notes, nextAction: next || (verified ? (profile ? '-' : 'Completar perfil') : 'Verificar email'),
})

export const platformUsers: PlatformUser[] = [
  // ── Abril 2026 — recientes de outreach ─────────────────────────────────────
  _u('pu-001','dydlowrider@yahoo.es','dydlowrider','','','free',false,false,false,'unassigned','outreach','No ha verificado el correo','Recordar verificación email'),
  _u('pu-002','almazartedanza@gmail.com','Juan y Marita','','','free',true,false,false,'unassigned','outreach'),
  _u('pu-003','info@ertza.com','ERTZA','ERTZA KONPAINIA','ERTZA KONPAINIA','free',true,true,true,'registered','outreach','Agencia de danza, preguntaron por correo'),
  _u('pu-004','gestioncultural@psicoballetmaiteleon.org','gestioncultural','','','free',true,false,false,'unassigned','outreach'),
  _u('pu-005','camilaaldanagb@gmail.com','Camila','','','free',true,true,true,'registered','outreach'),
  _u('pu-006','info@bluelightpro.es','Bluelightproject','','','free',true,true,true,'registered','outreach'),
  _u('pu-007','elenaagudozamora@gmail.com','Elena','ZAM Music','ZAM Music','free',true,true,true,'registered','outreach','Agencia con espectáculo'),
  _u('pu-008','pacopiramide@gmail.com','Paco Piramide','','','free',true,false,false,'unassigned','outreach'),
  _u('pu-009','dolores@doscondos.es','dolores','','','free',true,false,false,'unassigned','outreach','Tienen agencia pero no la han puesto','Recordar completar perfil de agencia'),
  _u('pu-010','tekila@bolanueve.com','tekila','','','free',false,false,false,'unassigned','outreach','Tienen agencia pero no la han puesto, no verificado'),
  _u('pu-011','victor@ymmusicagency.com','YMmusic','YM music','YM music','free',true,true,true,'registered','outreach'),
  _u('pu-012','martin.varela@thinkingup.live','martinvarela','','','free',true,true,true,'registered','outreach','Tienen agencia pero no la han puesto'),
  _u('pu-013','marina.roveta@gmail.com','ProduccionesSubmarinas','Producciones Submarinas','Producciones Submarinas','free',true,true,false,'registered','unknown'),
  _u('pu-014','blancadomfre@gmail.com','blancadomfre','','','free',true,false,false,'unassigned','unknown'),
  _u('pu-015','rociolopezpastor@gmail.com','Rociolopeez','','','free',true,true,true,'registered','unknown'),
  _u('pu-016','inaki@virtualmusic.es','Iñaki Monsalve','Virtual Music','Virtual Music','free',true,true,false,'registered','unknown'),
  _u('pu-017','hola@backstageon.com','BackStageON','','','pro',true,true,false,'registered','unknown'),
  _u('pu-018','cristssn@gmail.com','cristssn','','','free',true,false,false,'unassigned','unknown'),
  _u('pu-019','daniboada@gmail.com','Dani','Producciones Daniela','Producciones Daniela','free',true,true,true,'registered','unknown'),
  _u('pu-020','victor@aetherlabs.es','victor','Bonito Sound','Bonito Sound','free',true,true,false,'admin','unknown'),
  _u('pu-021','victortorresa94@gmail.com','Victor','94 MUSIC','94 MUSIC','free',true,true,true,'registered','unknown'),
  _u('pu-022','nil@bonitosound.com','nil','Bonito Sound','Bonito Sound','free',true,true,false,'registered','unknown'),
  _u('pu-023','pruebavictor@artiverse.es','pruebavictor','','','pro',true,false,false,'registered','unknown','Cuenta de prueba'),
  _u('pu-024','lalokamanagement@gmail.com','Lola','La Loka Management','La Loka Management','pro',true,true,true,'registered','unknown'),
  _u('pu-025','cristina@artiverse.es','cristina','','','free',true,false,false,'admin','unknown'),
  _u('pu-026','raul@artiverse.es','raul','','','free',true,true,false,'admin','unknown'),
  _u('pu-027','dani@artiverse.es','Admin','','','pro',true,true,true,'admin','unknown'),
  _u('pu-028','contratacion@meteorica.net','Antonio Palazón','Meteórica','Meteórica','pro',true,true,true,'registered','outreach','',''),
  _u('pu-029','davidrubiacontacto@gmail.com','David Rubia','David Rubia','David Rubia','pro',true,true,false,'registered','unknown'),
  _u('pu-030','info@nexusmusica.com','Nexus musica','Nexus musica','Nexus musica','pro',true,true,false,'registered','unknown'),
  _u('pu-031','diegolomamanagement@gmail.com','Diego Loma','Diego Loma','Diego Loma','pro',true,true,true,'registered','unknown'),
  _u('pu-032','kira@artica.agency','Kira','Artica Agency','Artica Agency','pro',true,true,true,'registered','unknown'),
  _u('pu-033','web@revitalmusic.es','Revital Music','','','pro',true,false,false,'registered','unknown'),
  _u('pu-034','jordi@playplan.es','Jordi Lauren','','','pro',true,false,false,'registered','unknown'),
  _u('pu-035','andres@playplan.es','Andrés Lamosa','PlayPlan','PlayPlan','pro',true,false,false,'registered','unknown'),
  _u('pu-036','zappa@rockandfashion.es','Cesar Zappa','Zappa Rock&Fashion','Zappa Rock&Fashion','pro',true,false,false,'registered','unknown'),
  _u('pu-037','newfizzprogramacion@gmail.com','New Fizz','','','pro',true,true,true,'registered','unknown'),
  _u('pu-038','anna@mpcmanagement.es','Anna Portomeñe','MPC Management','MPC Management','pro',true,true,true,'registered','outreach'),
  _u('pu-039','gabi.thinkingupevents@gmail.com','Gabi Gómez','Thinking Up Events','Thinking Up Events','pro',true,true,true,'registered','unknown'),
  _u('pu-040','ivan@neverlandconcerts.com','Ivan Frauca Gost','','','pro',true,true,true,'registered','unknown'),
  _u('pu-041','bernatidea@gmail.com','Bernat Tomàs Noguera','','','pro',true,false,false,'registered','unknown'),
  _u('pu-042','direccion@hermanosbrothers.es','Jaime Perozo','Jaime Perozo','Jaime Perozo','pro',true,true,false,'registered','unknown'),
  _u('pu-043','cristina@bonitosound.com','cris','Bonito Sound','Bonito Sound','pro',true,false,false,'registered','unknown'),
  _u('pu-044','raulgalerasancho@gmail.com','raulgs97','Bonito Sound','Bonito Sound','pro',true,true,true,'registered','unknown'),
  _u('pu-045','dani@bonitosound.com','Dani','Bonito Sound','Bonito Sound','pro',true,true,true,'registered','unknown'),
  _u('pu-046','admin@artiverse.es','Víctor','Bonito Sound','Bonito Sound','pro',true,true,false,'admin','unknown'),
  _u('pu-047','info@bcnanimacio.es','Jaume Estruch','Barcelona Animació','Barcelona Animació','pro',true,true,true,'registered','unknown'),
  _u('pu-048','maggi.martinez01@gmail.com','Maggi Martínez','maggimartinezmusic','maggimartinezmusic','pro',true,false,false,'registered','unknown'),
  _u('pu-049','isma@espectaculoslabruja.com','VERMUT MAMUT','VERMUT MAMUT','VERMUT MAMUT','pro',true,true,false,'registered','unknown'),
  _u('pu-050','bona_espectaculos@hotmail.com','Sandra Bona','Sandra Bona','Sandra Bona','pro',true,true,true,'registered','unknown'),
  _u('pu-051','rociomasso26@gmail.com','rociomasso','','','pro',true,false,false,'registered','unknown'),
  _u('pu-052','marpiqcab@gmail.com','Marta Piqueras','Marta Piqueras','Marta Piqueras','pro',true,true,true,'registered','unknown'),
  _u('pu-053','alfonso@sideralmusic.com','alfonsosideral','','','pro',true,false,false,'registered','unknown'),
  _u('pu-054','saimon@psreffects.es','Saimon Mas Miñana','','','pro',true,false,false,'registered','unknown'),
  _u('pu-055','efferock@hotmail.com','Fabián Navarrete','','','pro',true,false,false,'registered','unknown'),
  _u('pu-056','contratacion@larock.com.es','Andres Lomander','','','pro',true,false,false,'registered','unknown'),
  _u('pu-057','pol@deepdelaymanagement.com','Pol Juárez','Deep Delay','Deep Delay','pro',true,true,true,'registered','unknown'),
  _u('pu-058','activemusicpromo@gmail.com','jci90','jci90','jci90','pro',true,true,false,'registered','unknown'),
  _u('pu-059','info@vermouthdelacasa.com','Vermouth de la Casa','Vermouth de la casa','Vermouth de la casa','pro',true,true,true,'registered','unknown'),
  _u('pu-060','davidoficialspn@gmail.com','David Guez','','','pro',true,false,false,'registered','unknown'),
  _u('pu-061','anafmelerolunasanchez@gmail.com','PiesDeGallina','PiesDeGallina','PiesDeGallina','pro',true,true,false,'registered','unknown'),
  _u('pu-062','reglerogala@gmail.com','Gala','','','pro',true,false,false,'registered','unknown'),
  _u('pu-063','samupdh@gmail.com','Samuel Retamal','bigsamm','bigsamm','pro',true,false,false,'registered','unknown'),
  _u('pu-064','german@staffelproducciones.es','José María Robles','Staffel Producciones','Staffel Producciones','pro',true,true,true,'registered','unknown'),
  _u('pu-065','manolito.sanchez@doscondos.es','Manolito Sánchez','Manolito','Manolito','pro',true,true,true,'registered','unknown'),
  _u('pu-066','hola@big-groove.com','Carmina Brandariz','Big Groove','Big Groove','pro',true,true,true,'registered','unknown'),
  _u('pu-067','guoxmon@gmail.com','Josefe','','','pro',true,false,false,'registered','unknown'),
  _u('pu-068','grupounfrontier@gmail.com','Unfrontier','Unfrontier','Unfrontier','pro',true,true,false,'registered','unknown'),
  _u('pu-069','pylastern@gmail.com','Pyastern Lumern','','','pro',true,false,false,'registered','unknown'),
  _u('pu-070','alba@calaveritarecords.com','Alba Fernández','Calaverita Records','Calaverita Records','pro',true,true,false,'registered','outreach'),
  _u('pu-071','fran@boherecords.com','Fran Leo','BOHE Records','BOHE Records','pro',true,true,true,'registered','unknown'),
  _u('pu-072','ferran.villanuevamartin@gmail.com','Ferran Villanueva','','','pro',true,false,false,'registered','unknown'),
  _u('pu-073','davidbimusic@gmail.com','David Pereda','BiMusic','BiMusic','pro',true,true,true,'registered','unknown'),
  _u('pu-074','label@mantyx.com','Mantyx','','','pro',true,false,false,'registered','unknown'),
  _u('pu-075','kevinapaza@emotionalevents.es','Kevin Apaza','','','pro',true,false,false,'registered','unknown'),
  _u('pu-076','direccion@totalisimo.com','Manuel Villegas','Totalisimo','Totalisimo','pro',true,true,true,'registered','unknown'),
  _u('pu-077','jgimeno@lacatifaroja.com','LaCatifaRoja','','','pro',true,false,false,'registered','unknown'),
  _u('pu-078','jgimeno@lacatatifaroja.com','La Catifa Roja','','','pro',true,false,false,'registered','unknown'),
  _u('pu-079','jorgeprada@mundotributo.es','Jorge Prada','Mundo Tributo','Mundo Tributo','pro',true,false,false,'registered','unknown'),
  _u('pu-080','inescollarte@entrebotones.com','Inés Collarte','Entrebotones','Entrebotones','pro',true,true,false,'registered','unknown'),
  _u('pu-081','joaquin@peripecia.es','Joaquin Diaz Navarro','Peripecia','Peripecia','pro',true,true,true,'registered','unknown'),
  _u('pu-082','arteybalasera@gmail.com','Oscar Vicente Lazaro','','','pro',true,false,false,'registered','unknown'),
  _u('pu-083','joseluismarintutau.surtribe@gmail.com','Oscar Hernández','Surtribe Music Agency','Surtribe Music Agency','pro',true,true,true,'registered','unknown'),
  _u('pu-084','joseluismarintutua.surtribe@gmail.com','joseluissurtribe','','','pro',true,false,false,'registered','unknown'),
  _u('pu-085','r.dabizhaa@gmail.com','Rostyslav ROS','Rostyslav','Rostyslav','pro',true,false,false,'registered','unknown'),
  _u('pu-086','joseluismarintutau@gmail.com','joseluismarintutau','','','pro',true,false,false,'registered','unknown'),
  _u('pu-087','hola@eltragaluzdiscos.com','David Aguado','ElTragaluz','ElTragaluz','pro',true,true,false,'registered','unknown'),
  _u('pu-088','ad.santogrial@gmail.com','SANTO GRIAL PRO','','','pro',true,false,false,'registered','unknown'),
  _u('pu-089','info@osunaproducciones.com','OSUNA PRODUCCIONES','OSUNA PRODUCCIONES','OSUNA PRODUCCIONES','pro',true,true,false,'registered','unknown'),
  _u('pu-090','nuriamorodance@gmail.com','Nuria Moro','','','pro',true,false,false,'registered','unknown'),
  _u('pu-091','patricia@musicaglobal.com','patricia collado','Música Global','Música Global','pro',true,false,false,'registered','unknown'),
  _u('pu-092','info@dubbikids.com','Dubbi Kids','Dubbi Kids','Dubbi Kids','pro',true,true,false,'registered','unknown'),
  _u('pu-093','somoslatinensa@gmail.com','SOMOS LA TINENÇA','','','pro',true,false,false,'registered','unknown'),
  _u('pu-094','contratacion@worldmusicfactory.com','Toni Garcia','WORLD MUSIC FACTORY','WORLD MUSIC FACTORY','pro',true,true,false,'registered','unknown'),
  _u('pu-095','gestio@elsostingut.cat','El Sostingut','','','pro',true,false,false,'registered','unknown'),
  _u('pu-096','logistica@subterfuge-events.com','Subterfuge Events','Subterfuge Events','Subterfuge Events','pro',true,false,false,'registered','unknown'),
  _u('pu-097','cristtinasolersn@gmail.com','Cristina Soler','','','pro',true,false,false,'registered','unknown'),
  _u('pu-098','sella.booking@gmail.com','Sella','Sella','Sella','pro',true,true,false,'registered','unknown'),
  _u('pu-099','resonanciaok@gmail.com','Resonancia.es','Resonancia','Resonancia','pro',true,true,false,'registered','unknown'),
  _u('pu-100','manu.arenas@hotmail.com','marenas99','marenas99','marenas99','pro',true,true,false,'registered','unknown'),
  _u('pu-101','sonabonito@bonitosound.com','Quim','Bonito Sound','Bonito Sound','pro',true,true,true,'registered','unknown'),
  _u('pu-102','pedro.marcos@hit21producciones.com','Pedro Marcos','Pedro Marcos','Pedro Marcos','pro',true,true,false,'registered','unknown'),
  _u('pu-103','punkgrossos@gmail.com','Punkgrossos','Associació Cultural Punkgrossos','Associació Cultural Punkgrossos','pro',true,true,false,'registered','unknown'),
  _u('pu-104','manu@bonitosound.com','Manu','Bonito Sound','Bonito Sound','pro',true,true,true,'registered','unknown'),
  _u('pu-105','immagrimalt@gmail.com','Imma Grimalt','immagrimalt','immagrimalt','pro',true,false,false,'registered','unknown'),
  _u('pu-106','julia@bonitosound.com','Júlia','Bonito Sound','Bonito Sound','pro',true,true,true,'registered','unknown'),
  _u('pu-107','live@ventilador-music.com','ventiladormusic','','','pro',true,true,true,'registered','unknown'),
  _u('pu-108','promocion@darlalata.net','Javier Tomás Tio','Darlalata','Darlalata','pro',true,true,true,'registered','outreach'),
  _u('pu-109','raul@m2musicgroup.com','Raul Madronal','M2 Music Group','M2 Music Group','pro',true,true,true,'registered','unknown'),
  _u('pu-110','hydegeorge700@gmail.com','George','','','pro',true,false,false,'registered','unknown'),
  _u('pu-111','manuel@pirrongelli.com','Manuel Pirrongelli','Pirrongelli Management','Pirrongelli Management','pro',true,true,true,'registered','unknown'),
  _u('pu-112','fausto@slidemedia.net','Fausto','Slidemedia','Slidemedia','pro',true,true,false,'registered','unknown'),
  _u('pu-113','jorge.torres@themusicrepublic.es','Jorge Torres Martin','The Music Republic','The Music Republic','pro',true,true,true,'registered','unknown'),
  _u('pu-114','esencialabel@gmail.com','Piero Vega','Esencia Label','Esencia Label','pro',true,false,false,'registered','unknown'),
  _u('pu-115','matilde.cavalli92@gmail.com','Matilde Cavalli','MatildeCavalli','MatildeCavalli','pro',true,false,false,'registered','unknown'),
];

export const platformStats = {
  totalUsers: 116,
  totalArtists: 200,
  totalAgencies: 63,
  activeAgencies: 53,
  promotors: 37,
  proUsers: platformUsers.filter(u => u.subscription === 'pro').length,
  profileCompleteCount: platformUsers.filter(u => u.profileComplete).length,
  unverifiedCount: platformUsers.filter(u => !u.emailVerified).length,
  withAgencyCount: platformUsers.filter(u => u.hasAgency).length,
  monthlyRevenue: 120,
  paidSubscribers: 192,
  stripeSubscribers: 5,
  manualSubscribers: 144,
  cancellationRate: 0.52,
};
