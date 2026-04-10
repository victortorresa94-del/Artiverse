// Sync Instantly.ai → HubSpot CRM
// Uso: node sync-instantly-hubspot.js [campaign_id]

const INSTANTLY_KEY = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==';
const HUBSPOT_KEY   = process.env.HUBSPOT_API_KEY   || '';

const STATUS_MAP = {
  '-1': { instantly_status: 'bounced',        hs_lead_status: 'UNQUALIFIED' },
  '0':  { instantly_status: 'not_contacted',  hs_lead_status: 'OPEN' },
  '1':  { instantly_status: 'sent',           hs_lead_status: 'OPEN' },
  '2':  { instantly_status: 'clicked',        hs_lead_status: 'CONNECTED' },
  '3':  { instantly_status: 'opened',         hs_lead_status: 'CONNECTED' },
  '4':  { instantly_status: 'replied',        hs_lead_status: 'QUALIFIED' },
};

const SEGMENT_MAP = {
  'Teatros':          'Teatro-Danza',
  'Teatro-Danza':     'Teatro-Danza',
  'Dance from Spain': 'Dance-Spain',
  'Salas Conciertos': 'Salas',
  'Salas':            'Salas',
  'Festivales':       'Festivales',
  'Socios ARTE':      'Socios-ARTE',
  'Distribuidoras':   'Distribuidoras',
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Pagina todos los leads de una campaña
async function fetchCampaignLeads(campaignId) {
  const leads = [];
  let cursor = null;
  do {
    const body = { campaign_id: campaignId, limit: 100 };
    if (cursor) body.starting_after = cursor;
    const r = await fetch('https://api.instantly.ai/api/v2/leads/list', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${INSTANTLY_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`Instantly leads error: ${r.status}`);
    const d = await r.json();
    const items = d.items || [];
    leads.push(...items);
    cursor = d.next_starting_after;
    if (items.length < 100 || !cursor) break;
  } while (true);
  return leads;
}

// Crea propiedad custom en HubSpot si no existe
async function ensureHubSpotProperty(name, label) {
  const r = await fetch(`https://api.hubapi.com/crm/v3/properties/contacts/${name}`, {
    headers: { 'Authorization': `Bearer ${HUBSPOT_KEY}` }
  });
  if (r.ok) return; // ya existe
  await fetch('https://api.hubapi.com/crm/v3/properties/contacts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${HUBSPOT_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, label, type: 'string', fieldType: 'text', groupName: 'contactinformation' })
  });
}

// Batch upsert en HubSpot (100 máx por llamada)
async function batchUpsertHubSpot(contacts) {
  const inputs = contacts.map(c => ({
    idProperty: 'email',
    properties: {
      email:              c.email,
      firstname:          c.firstname || '',
      company:            c.company || '',
      instantly_status:   c.instantly_status,
      hs_lead_status:     c.hs_lead_status,
      instantly_campaign: c.campaign,
      artiverse_segment:  c.segment,
    }
  }));

  let retries = 0;
  while (retries < 3) {
    const r = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HUBSPOT_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs })
    });
    if (r.status === 429) {
      console.log('  ⏳ Rate limit — esperando 10s...');
      await sleep(10000);
      retries++;
      continue;
    }
    if (!r.ok) {
      const err = await r.json();
      throw new Error(`HubSpot error ${r.status}: ${JSON.stringify(err).slice(0, 200)}`);
    }
    return await r.json();
  }
  throw new Error('Max retries alcanzado en HubSpot batch upsert');
}

async function syncCampaign(campaign) {
  console.log(`\n🔄 Fetching leads — campaña: ${campaign.name}...`);
  const rawLeads = await fetchCampaignLeads(campaign.id);
  const leads = rawLeads.filter(l => l.email);
  const skipped = rawLeads.length - leads.length;

  console.log(`✅ Found ${leads.length} leads${skipped ? ` (${skipped} sin email, ignorados)` : ''}`);

  // Mapear a formato HubSpot
  const mapped = leads.map(l => {
    const s = STATUS_MAP[String(l.status)] || { instantly_status: 'sent', hs_lead_status: 'OPEN' };
    return {
      email:            l.email,
      firstname:        l.first_name || l.payload?.firstName || '',
      company:          l.company_name || l.payload?.companyName || '',
      instantly_status: s.instantly_status,
      hs_lead_status:   s.hs_lead_status,
      campaign:         campaign.name,
      segment:          SEGMENT_MAP[campaign.name] || campaign.name,
    };
  });

  // Batches de 100
  const BATCH = 100;
  const totalBatches = Math.ceil(mapped.length / BATCH);
  console.log(`🔄 Syncing to HubSpot — ${totalBatches} batch(es)...`);

  for (let i = 0; i < totalBatches; i++) {
    const chunk = mapped.slice(i * BATCH, (i + 1) * BATCH);
    await batchUpsertHubSpot(chunk);
    console.log(`  ✅ Batch ${i + 1}/${totalBatches}: ${chunk.length} upserted`);
    if (i < totalBatches - 1) await sleep(500);
  }

  return { synced: mapped.length, skipped };
}

async function main() {
  if (!HUBSPOT_KEY) {
    console.error('❌ HUBSPOT_API_KEY no configurada. Usa: HUBSPOT_API_KEY=pat-eu1-xxx node sync-instantly-hubspot.js');
    process.exit(1);
  }

  // Asegurar propiedades custom
  console.log('🔧 Verificando propiedades custom en HubSpot...');
  await Promise.all([
    ensureHubSpotProperty('instantly_status', 'Instantly Status'),
    ensureHubSpotProperty('instantly_campaign', 'Instantly Campaign'),
    ensureHubSpotProperty('artiverse_segment', 'Artiverse Segment'),
  ]);

  // Obtener campañas
  const r = await fetch('https://api.instantly.ai/api/v2/campaigns', {
    headers: { 'Authorization': `Bearer ${INSTANTLY_KEY}` }
  });
  const d = await r.json();
  let campaigns = d.items || [];

  // Filtrar por campaign_id si se pasó como argumento
  const targetId = process.argv[2];
  if (targetId) {
    campaigns = campaigns.filter(c => c.id === targetId || c.name === targetId);
    if (!campaigns.length) { console.error(`❌ Campaña no encontrada: ${targetId}`); process.exit(1); }
  } else {
    // Solo campañas activas (status 1)
    campaigns = campaigns.filter(c => c.status === 1);
  }

  console.log(`\n📋 Campañas a sincronizar: ${campaigns.map(c => c.name).join(', ')}`);

  let totalSynced = 0, totalSkipped = 0;
  for (const camp of campaigns) {
    const result = await syncCampaign(camp);
    totalSynced += result.synced;
    totalSkipped += result.skipped;
  }

  console.log(`\n✅ SYNC COMPLETE: ${totalSynced} contactos → HubSpot`);
  if (totalSkipped) console.log(`❌ ${totalSkipped} skipped (sin email)`);
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
