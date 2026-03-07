#!/usr/bin/env node
// tools/import-n8n-workflow.js
// Imports and activates n8n-daily-tally-sync-v3.json via n8n REST API
// Usage: node tools/import-n8n-workflow.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const N8N_BASE = process.env.N8N_URL || 'http://72.61.249.86:32771';
const N8N_AUTH = Buffer.from('admin:shreerang_auto').toString('base64');

const headers = {
  'Authorization': `Basic ${N8N_AUTH}`,
  'Content-Type': 'application/json',
};

async function apiFetch(method, path, body) {
  const r = await fetch(`${N8N_BASE}/api/v1${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`n8n ${method} ${path} → ${r.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  // 1. Read workflow JSON
  const wfPath = path.join(__dirname, '..', 'n8n-daily-tally-sync-v3.json');
  const wfJson = JSON.parse(fs.readFileSync(wfPath, 'utf-8'));
  console.log(`Read workflow: ${wfJson.name || 'unnamed'}`);

  // 2. List existing workflows to find duplicates
  const { data: existing } = await apiFetch('GET', '/workflows?limit=50');
  const existing_wf = (existing || []).find(w => w.name === wfJson.name);

  let workflowId;
  if (existing_wf) {
    console.log(`Found existing workflow "${wfJson.name}" (ID: ${existing_wf.id}) — deactivating...`);
    await apiFetch('PATCH', `/workflows/${existing_wf.id}`, { active: false });
    // Delete old workflow
    await apiFetch('DELETE', `/workflows/${existing_wf.id}`);
    console.log('Deleted old workflow.');
  }

  // 3. Import new workflow
  console.log('Importing new workflow...');
  const created = await apiFetch('POST', '/workflows', wfJson);
  workflowId = created.id;
  console.log(`Created workflow ID: ${workflowId}`);

  // 4. Activate
  console.log('Activating workflow...');
  await apiFetch('PATCH', `/workflows/${workflowId}/activate`);
  console.log(`✅ Workflow "${wfJson.name}" is now active (ID: ${workflowId})`);

  // 5. Health check
  try {
    const health = await fetch(`${N8N_BASE}/healthz`);
    const hText = await health.text();
    console.log(`n8n health: ${health.status} — ${hText}`);
  } catch(e) {
    console.warn(`n8n health check failed: ${e.message}`);
  }
}

main().catch(err => { console.error('Import failed:', err.message); process.exit(1); });
