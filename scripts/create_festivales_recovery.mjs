import fs from 'fs';

const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==';
const BASE_URL = 'https://api.instantly.ai/api/v2';
const CONTACTS_FILE = 'C:/Users/Usuario/Downloads/contacts_festivales.json';

// From previous run
const LIST_ID = '18c9a4aa-aa3b-4a99-b4f6-1a17a3383011';
const CAMPAIGN_ID = '6e151dbe-f16b-4111-a2b6-cf6a33941967';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

async function apiCall(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${method} ${path} => ${res.status}: ${text}`);
  }
  return data;
}

function extractFirstEmail(raw) {
  if (!raw) return '';
  // Split by common separators: newline, /, //, spaces between emails
  const parts = raw.split(/[\n\/]+/).map(p => p.trim());
  for (const part of parts) {
    // Extract the first email-like token from each part
    const match = part.match(/[^\s,;(]+@[^\s,;)]+\.[^\s,;)]+/);
    if (match) {
      const email = match[0].replace(/[.,]+$/, ''); // trim trailing dots/commas
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
    }
  }
  return '';
}

const contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
console.log(`Total contacts: ${contacts.length}`);

// Find contacts whose first-pass email (simple \n split) was invalid but have recoverable emails
const failedContacts = contacts.filter(c => {
  const simpleEmail = c.email ? c.email.split('\n')[0].trim() : '';
  const isSimpleValid = simpleEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(simpleEmail);
  return !isSimpleValid; // these are the ones that likely failed
});

console.log(`Contacts that likely failed in first run: ${failedContacts.length}`);

// From these, find the recoverable ones
const recoverableContacts = failedContacts
  .map(c => ({ ...c, cleanEmail: extractFirstEmail(c.email) }))
  .filter(c => c.cleanEmail);

console.log(`Recoverable with improved parsing: ${recoverableContacts.length}`);

let successCount = 0;
let failCount = 0;
const CONCURRENCY = 5;
const DELAY_MS = 200;

async function uploadLead(contact) {
  const email = contact.cleanEmail;
  const firstName = contact.first_name || '';
  const companyName = contact.company_name || '';

  const body = {
    list_id: LIST_ID,
    email,
    ...(firstName && { first_name: firstName }),
    ...(companyName && { company_name: companyName }),
  };

  try {
    await apiCall('POST', '/leads', body);
    return { success: true, email };
  } catch (err) {
    return { success: false, email, reason: err.message };
  }
}

async function runWithConcurrency(items, concurrency, fn, delayMs) {
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const result = await fn(items[i]);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.log(`  FAIL [${i}] ${result.email}: ${result.reason?.substring(0, 100)}`);
      }
      if (i % 30 === 0) {
        console.log(`  Progress: ${i}/${items.length} (ok: ${successCount}, fail: ${failCount})`);
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
}

console.log('\n=== Uploading recovered leads ===');
await runWithConcurrency(recoverableContacts, CONCURRENCY, uploadLead, DELAY_MS);

console.log('\n=== RECOVERY DONE ===');
console.log(`Campaign ID:  ${CAMPAIGN_ID}`);
console.log(`List ID:      ${LIST_ID}`);
console.log(`Recovery leads uploaded successfully: ${successCount} / ${recoverableContacts.length}`);
console.log(`Recovery leads failed: ${failCount}`);
console.log(`\nTotal leads (first run + recovery): ${470 + successCount} / 646`);
