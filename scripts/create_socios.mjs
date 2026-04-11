/**
 * create_socios.mjs
 * Uploads 280 Socios ARTE contacts to Instantly.ai campaign
 * Campaign: "Socios ARTE - Artiverse"
 * List: "Socios ARTE 1"
 *
 * Instantly v2 /api/v2/leads only accepts one lead per POST.
 * We use concurrency=5 with small delays between groups.
 */

import { readFileSync } from 'fs';

const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==';
const CAMPAIGN_ID = '3a31a680-f37c-4bb8-a39a-eed87e2b1db0';
const LIST_ID = '2a24e922-1126-4064-a76d-15d507f28042';
const CONTACTS_PATH = 'C:/Users/Usuario/Downloads/contacts_socios.json';

const CONCURRENCY = 5;
const DELAY_BETWEEN_GROUPS_MS = 400;

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getFirstEmail(emailField) {
  if (!emailField) return null;
  const parts = emailField.split(/[\n;]+/).map(e => e.trim()).filter(Boolean);
  return parts[0] || null;
}

async function uploadLead(contact) {
  const email = getFirstEmail(contact.email);
  if (!email) return { success: false, reason: 'no_email', contact };

  const payload = {
    email,
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    company_name: contact.company_name || '',
    phone: contact.phone || '',
    list_id: LIST_ID,
    campaign_id: CAMPAIGN_ID
  };

  const r = await fetch('https://api.instantly.ai/api/v2/leads', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (r.status === 200 || r.status === 201) {
    return { success: true, email };
  } else {
    const data = await r.json();
    return { success: false, reason: `HTTP ${r.status}: ${data.message || JSON.stringify(data)}`, email };
  }
}

async function main() {
  console.log('=== Socios ARTE - Artiverse Lead Upload ===');
  console.log(`Campaign ID: ${CAMPAIGN_ID}`);
  console.log(`List ID:     ${LIST_ID}`);
  console.log('');

  const raw = JSON.parse(readFileSync(CONTACTS_PATH, 'utf-8'));
  console.log(`Contacts loaded: ${raw.length}`);
  console.log('');

  let successCount = 0;
  let failCount = 0;
  const failures = [];

  // Process in groups of CONCURRENCY
  for (let i = 0; i < raw.length; i += CONCURRENCY) {
    const group = raw.slice(i, i + CONCURRENCY);
    const groupNum = Math.floor(i / CONCURRENCY) + 1;
    const totalGroups = Math.ceil(raw.length / CONCURRENCY);

    process.stdout.write(`Group ${groupNum}/${totalGroups} (leads ${i + 1}-${Math.min(i + CONCURRENCY, raw.length)})... `);

    const results = await Promise.all(group.map(uploadLead));

    const groupSuccess = results.filter(r => r.success).length;
    const groupFail = results.filter(r => !r.success).length;
    successCount += groupSuccess;
    failCount += groupFail;

    for (const r of results) {
      if (!r.success) failures.push(r);
    }

    console.log(`OK: ${groupSuccess} | Fail: ${groupFail}`);

    // Delay between groups to respect rate limits
    if (i + CONCURRENCY < raw.length) {
      await sleep(DELAY_BETWEEN_GROUPS_MS);
    }
  }

  console.log('');
  console.log('=== UPLOAD COMPLETE ===');
  console.log(`Campaign ID:                 ${CAMPAIGN_ID}`);
  console.log(`List ID:                     ${LIST_ID}`);
  console.log(`Leads uploaded successfully: ${successCount}`);
  console.log(`Leads failed:               ${failCount}`);
  console.log(`Total processed:            ${raw.length}`);

  if (failures.length > 0) {
    console.log('');
    console.log('Failed leads:');
    for (const f of failures) {
      console.log(`  - ${f.email || 'no email'}: ${f.reason}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
