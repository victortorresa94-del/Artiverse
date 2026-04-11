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

export type Priority = 'alta' | 'media' | 'baja';
export type Channel = 'email' | 'whatsapp' | 'instagram' | 'telefono';
export type Segment =
  | 'Teatro-Danza'
  | 'Salas Conciertos'
  | 'Festivales'
  | 'Dance from Spain'
  | 'Socios ARTE'
  | 'Distribuidoras';

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
  { id: '1', company: 'MPC Management', contact: 'María Pérez', email: 'maria@mpcmanagement.es', phone: '612 345 678', instagram: '@mpcmanagement', city: 'Madrid', segment: 'Teatro-Danza', channel: 'email', stage: 'dentro_plataforma', emailStatus: 'replied', lastContact: '2026-04-02', nextAction: '-', notes: 'Primera en entrar. Muy activa.', inPlatform: true, priority: 'alta', campaignId: 'teatros' },
  { id: '2', company: 'Meteórica', contact: 'Carlos Ruiz', email: 'carlos@meteorica.es', phone: '623 456 789', instagram: '@meteorica.es', city: 'Barcelona', segment: 'Teatro-Danza', channel: 'email', stage: 'dentro_plataforma', emailStatus: 'replied', lastContact: '2026-04-03', nextAction: '-', notes: 'Perfil completo. Compartió en RRSS.', inPlatform: true, priority: 'alta', campaignId: 'teatros' },
  { id: '3', company: 'Darlalata', contact: 'Ana García', email: 'ana@darlalata.com', phone: '634 567 890', instagram: '@darlalata', city: 'Madrid', segment: 'Teatro-Danza', channel: 'email', stage: 'dentro_plataforma', emailStatus: 'opened', lastContact: '2026-04-01', nextAction: '-', notes: '', inPlatform: true, priority: 'media', campaignId: 'teatros' },
  { id: '4', company: 'Calaverita Records', contact: 'Pedro Sánchez', email: 'pedro@calaverita.es', phone: '645 678 901', instagram: '', city: 'Sevilla', segment: 'Teatro-Danza', channel: 'email', stage: 'dentro_plataforma', emailStatus: 'opened', lastContact: '2026-03-30', nextAction: '-', notes: '', inPlatform: true, priority: 'media', campaignId: 'teatros' },
  { id: '5', company: 'The Music Republic', contact: 'Jorge Torres', email: 'j.torres@themusicrepublic.es', phone: '656 789 012', instagram: '@themusicrepublic', city: 'Madrid', segment: 'Dance from Spain', channel: 'email', stage: 'respondio_interesado', emailStatus: 'replied', lastContact: '2026-04-07', nextAction: 'Enviar link de registro', notes: 'Respondió positivo. Muy interesado.', inPlatform: false, priority: 'alta', campaignId: 'dance-from-spain' },
  { id: '6', company: 'GTS Talent', contact: 'María Alba', email: 'maria.alba@gtstalent.com', phone: '667 890 123', instagram: '@gtstalent', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'respondio_interesado', emailStatus: 'replied', lastContact: '2026-04-06', nextAction: 'Follow-up call', notes: 'Pidió más información sobre precios.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: '7', company: 'Share Music', contact: 'Hugo García', email: 'hugo@sharemusic.es', phone: '678 901 234', instagram: '@sharemusic_es', city: 'Barcelona', segment: 'Dance from Spain', channel: 'email', stage: 'email2_enviado', emailStatus: 'opened', lastContact: '2026-04-05', nextAction: 'Esperar respuesta Step 2', notes: '', inPlatform: false, priority: 'media', campaignId: 'dance-from-spain' },
  { id: '8', company: 'Rotativa Performing Arts', contact: 'Fani Benages', email: 'info@rotativaperformingarts.com', phone: '689 012 345', instagram: '@rotativaperformingarts', city: 'Barcelona', segment: 'Teatro-Danza', channel: 'email', stage: 'email1_enviado', emailStatus: 'sent', lastContact: '2026-04-08', nextAction: 'Esperar respuesta', notes: '', inPlatform: false, priority: 'media', campaignId: 'teatro-danza-2' },
  { id: '9', company: 'Cía. Moveo', contact: 'Stéphane Lévy', email: 'info@ciamoveo.cat', phone: '933 002 508', instagram: '', city: 'Barcelona', segment: 'Teatro-Danza', channel: 'email', stage: 'email1_enviado', emailStatus: 'opened', lastContact: '2026-04-08', nextAction: 'Esperar respuesta', notes: '', inPlatform: false, priority: 'media', campaignId: 'teatro-danza-2' },
  { id: '10', company: 'A Mansalva', contact: 'Pablo Carrera', email: 'info@amansalva.es', phone: '912 345 678', instagram: '@amansalvamusica', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'email1_enviado', emailStatus: 'sent', lastContact: '2026-04-08', nextAction: 'Esperar respuesta', notes: '', inPlatform: false, priority: 'baja', campaignId: 'salas' },
  { id: '11', company: 'CERSA Music', contact: 'Alberto Cervera', email: 'cersamusic@cersamusic.com', phone: '963 456 789', instagram: '', city: 'Valencia', segment: 'Salas Conciertos', channel: 'email', stage: 'email1_enviado', emailStatus: 'bounced', lastContact: '2026-04-08', nextAction: 'Buscar email alternativo', notes: 'Email devuelto.', inPlatform: false, priority: 'baja', campaignId: 'salas' },
  { id: '12', company: 'Carver Producciones', contact: 'José Carrión', email: 'jcarrion@carverespectaculos.com', phone: '923 567 890', instagram: '@carverespectaculos', city: 'Salamanca', segment: 'Teatro-Danza', channel: 'whatsapp', stage: 'contactado_whatsapp', emailStatus: 'sent', lastContact: '2026-04-09', nextAction: 'Esperar respuesta WA', notes: 'Contactado por WhatsApp tras no abrir email.', inPlatform: false, priority: 'media', campaignId: 'teatros' },
  { id: '13', company: 'Concert Tour Gestiones', contact: 'Rafael Casilla', email: 'grupoconcerttour@grupoconcerttour.com', phone: '934 678 901', instagram: '@concerttour', city: 'Barcelona', segment: 'Salas Conciertos', channel: 'instagram', stage: 'contactado_instagram', emailStatus: 'sent', lastContact: '2026-04-09', nextAction: 'Responder DM Instagram', notes: 'Comentó un post de Artiverse.', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: '14', company: 'PRODUARTCE', contact: 'Carlos Cerdán', email: 'produartce@produartce.com', phone: '945 789 012', instagram: '@produartce', city: 'Zaragoza', segment: 'Salas Conciertos', channel: 'email', stage: 'reunion_agendada', emailStatus: 'replied', lastContact: '2026-04-08', nextAction: 'Reunión lunes 14 abril 10:00h', notes: 'Demo programada. Muy interesado en licitaciones.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: '15', company: 'Iberia Producciones', contact: 'Antonio Caro', email: 'contratacion@iberiaproducciones.es', phone: '956 890 123', instagram: '', city: 'Málaga', segment: 'Teatro-Danza', channel: 'email', stage: 'email3_enviado', emailStatus: 'opened', lastContact: '2026-04-06', nextAction: 'Último seguimiento', notes: '', inPlatform: false, priority: 'baja', campaignId: 'teatros' },
  { id: '16', company: 'Magazine Showbusiness', contact: 'Félix Cartagena', email: 'felixcartagena@telefonica.net', phone: '967 901 234', instagram: '', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'no_interesado', emailStatus: 'replied', lastContact: '2026-04-04', nextAction: '-', notes: 'Respondió que no les interesa.', inPlatform: false, priority: 'baja', campaignId: 'salas' },
  { id: '17', company: 'Cía. Niñas Malditas', contact: 'Clara Fernández', email: 'malditas.circo@gmail.com', phone: '', instagram: '@ninasmalditascirco', city: 'Madrid', segment: 'Teatro-Danza', channel: 'email', stage: 'email1_enviado', emailStatus: 'sent', lastContact: '2026-04-08', nextAction: 'Esperar respuesta', notes: '', inPlatform: false, priority: 'media', campaignId: 'teatro-danza-2' },
  { id: '18', company: 'Last Tour International', contact: 'Yahvé García', email: 'yahve@lasttour.net', phone: '978 012 345', instagram: '@lasttourinternational', city: 'Madrid', segment: 'Dance from Spain', channel: 'email', stage: 'email2_enviado', emailStatus: 'opened', lastContact: '2026-04-05', nextAction: 'Follow-up email', notes: 'Abrió Step 1 dos veces.', inPlatform: false, priority: 'alta', campaignId: 'dance-from-spain' },
  { id: '19', company: 'Aquintada Auga', contact: 'Andrea Buergo', email: 'andrea.buergo@aquintadaauga.com', phone: '989 123 456', instagram: '', city: 'Vigo', segment: 'Dance from Spain', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '', inPlatform: false, priority: 'baja', campaignId: 'dance-from-spain' },
  { id: '20', company: 'Intercruises', contact: 'Rosa López', email: 'r.lopez@intercruises.com', phone: '990 234 567', instagram: '@intercruises_official', city: 'Barcelona', segment: 'Dance from Spain', channel: 'telefono', stage: 'contactado_telefono', emailStatus: 'opened', lastContact: '2026-04-09', nextAction: 'Enviar propuesta formal', notes: 'Llamada de 12 min. Quieren una demo.', inPlatform: false, priority: 'alta', campaignId: 'dance-from-spain' },

  // ── Salas Conciertos 1 — leads reales (374 en campaña activa) ──────────────
  { id: 'sc-01', company: 'Sala Apolo', contact: '', email: 'info@sala-apolo.com', phone: '934-414001', instagram: '@salaapolo', city: 'Barcelona', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: 'Sala icónica BCN. 2905 cap. También La [2] Apolo (800). TOP prioridad.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-02', company: 'Razzmatazz', contact: '', email: 'info@salarazzmatazz.com', phone: '933-208200', instagram: '@salarazzmatazz', city: 'Barcelona', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: 'Cinco salas. 2130 cap principal. Referencia nacional.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-03', company: 'Sala La Riviera', contact: '', email: 'info@larivieramadrid.com', phone: '', instagram: '@larivieramadrid', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '1800 cap. Una de las salas de referencia en Madrid.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-04', company: 'Santana 27 / Fever', contact: '', email: 'info@santana27.com', phone: '', instagram: '@santana27bilbao', city: 'Bilbao', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '1500 cap. Principal sala de conciertos Bilbao.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-05', company: 'WiZink Center', contact: '', email: 'info@wizinkcenter.es', phone: '', instagram: '@wizinkcenter', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '17.000 cap. Macrorecinto. Programación masiva.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-06', company: 'Zentral', contact: '', email: 'info@zentral.es', phone: '', instagram: '@zentral_pamplona', city: 'Pamplona', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '1100 cap. Principal sala Navarra.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-07', company: 'Teatro Nuevo Apolo', contact: '', email: 'programacion@somproduce.com', phone: '', instagram: '', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '1150 cap. Programacion@somproduce. Teatro-conciertos Madrid.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-08', company: 'Sala Bikini', contact: '', email: 'info@bikini.es', phone: '', instagram: '@salabikini', city: 'Barcelona', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: 'Barcelona. Programación pop-rock-jazz consolidada.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-09', company: 'Luz de Gas', contact: 'Fernando Vila Navarro', email: 'comunicacio@luzdegas.com', phone: '932-097711', instagram: '@luzdegas', city: 'Barcelona', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '900 cap. Clásico BCN, contacto directo Fernando Vila.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-10', company: 'Jimmy Jazz Gasteiz', contact: '', email: 'hola@jimmyjazz.com', phone: '', instagram: '@jimmyjazzgasteiz', city: 'Vitoria', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '800 cap. Referencia Euskadi. Jazz + indie.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-11', company: 'Capitol Santiago', contact: '', email: 'info@capitolsantiago.com', phone: '', instagram: '@capitolsantiago', city: 'Santiago de Compostela', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '800 cap. Principal sala Galicia.', inPlatform: false, priority: 'alta', campaignId: 'salas' },
  { id: 'sc-12', company: 'Garaje Beat Club', contact: '', email: 'info@garaje.es', phone: '', instagram: '@garaje_beat', city: 'Murcia', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '600 cap. Principal sala Murcia.', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: 'sc-13', company: 'Playa Club', contact: 'Carlos Landeira', email: 'programacion@playaclub.club', phone: '981-250063', instagram: '', city: 'A Coruña', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '650 cap. Contacto directo programación.', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: 'sc-14', company: 'La Sala Live!', contact: '', email: 'info@lasalalive.es', phone: '', instagram: '@lasalalive', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '500 cap. Madrid. Pop-rock-indie.', inPlatform: false, priority: 'media', campaignId: 'salas' },
  { id: 'sc-15', company: 'Galileo Galilei', contact: '', email: 'info@salagalileoalilei.com', phone: '', instagram: '@salagalileoalilei', city: 'Madrid', segment: 'Salas Conciertos', channel: 'email', stage: 'sin_contactar', emailStatus: 'not_sent', lastContact: '-', nextAction: 'Enviar email 1', notes: '500 cap. Madrid. Folk, indie, cantautor.', inPlatform: false, priority: 'media', campaignId: 'salas' },
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
