import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load .env from the same folder as this script (scripts/.env),
// regardless of where the script is invoked from.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // fallback to cwd for backward compat
}
import readline from 'node:readline';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Shreerang — Drive → Bunny → Supabase Image Sync
//
// One-shot script that walks your Drive folder, mirrors every image to
// Bunny CDN preserving the full folder structure, and indexes each file
// in Supabase product_images (or product_images_unmapped for unparseable
// filenames).
//
// Idempotent: uses drive_file_id as the upsert key so re-running is a no-op
// for already-synced files. If a Drive file is replaced (new revision),
// the script re-uploads and updates the Supabase row.
//
// Run:  npm run sync-images
// Or:   node scripts/sync-drive-to-bunny.mjs
//
// First run will open a browser for Google consent. Subsequent runs are
// unattended (refresh token cached in scripts/.drive-token.json).
// ============================================================================

// ---------- config ----------
const CFG = {
  driveRootId: process.env.DRIVE_ROOT_FOLDER_ID || '1K_NV3Eu5gXM-LgCT-ji2dWOzTjDGtDes',
  driveRootName: process.env.DRIVE_ROOT_FOLDER_NAME || '2-Shreerang Gallery',
  googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  bunnyStorageZone: process.env.BUNNY_STORAGE_ZONE || 'shreerang-s',
  bunnyAccessKey: process.env.BUNNY_STORAGE_ACCESS_KEY,
  bunnyCdnHost: process.env.BUNNY_CDN_HOST || 'shreerang.b-cdn.net',
  bunnyPathPrefix: process.env.BUNNY_PATH_PREFIX || 'fabrics',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  tokenFile: path.resolve(process.cwd(), 'scripts/.drive-token.json'),
  logFile: path.resolve(process.cwd(), 'scripts/sync.log'),
  // Safety guards
  dryRun: process.env.DRY_RUN === '1',
  maxFiles: process.env.MAX_FILES ? parseInt(process.env.MAX_FILES, 10) : null,
  concurrency: 3, // parallel uploads
};

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|webp|gif|bmp)$/i;

// ---------- validate config ----------
function requireEnv() {
  const missing = [];
  if (!CFG.googleClientId) missing.push('GOOGLE_OAUTH_CLIENT_ID');
  if (!CFG.googleClientSecret) missing.push('GOOGLE_OAUTH_CLIENT_SECRET');
  if (!CFG.bunnyAccessKey) missing.push('BUNNY_STORAGE_ACCESS_KEY');
  if (!CFG.supabaseUrl) missing.push('SUPABASE_URL');
  if (!CFG.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) {
    console.error('\n❌ Missing env vars:', missing.join(', '));
    console.error('   Create scripts/.env from scripts/.env.example\n');
    process.exit(1);
  }
}

// ---------- Google Drive auth (one-time consent, then cached) ----------
async function getDriveClient() {
  const oauth2 = new google.auth.OAuth2(
    CFG.googleClientId,
    CFG.googleClientSecret,
    'urn:ietf:wg:oauth:2.0:oob' // out-of-band, for CLI apps (deprecated but still works, see fallback)
  );

  // Try to load cached token
  if (fs.existsSync(CFG.tokenFile)) {
    try {
      const tok = JSON.parse(fs.readFileSync(CFG.tokenFile, 'utf8'));
      oauth2.setCredentials(tok);
      // Force a token refresh to verify it's still valid
      await oauth2.getAccessToken();
      return google.drive({ version: 'v3', auth: oauth2 });
    } catch (e) {
      console.warn('⚠️  Cached Drive token invalid, re-authenticating...');
      try { fs.unlinkSync(CFG.tokenFile); } catch (_) {}
    }
  }

  // First-time auth via local redirect server.
  // Binds to any free port (tries 53682 first, then 8080, then OS-assigned).
  // Works with BOTH "web" OAuth clients (redirect_uri has /oauth2callback)
  // AND "installed" OAuth clients (redirect_uri is plain http://localhost).
  const http = await import('node:http');
  const { URL } = await import('node:url');

  const CANDIDATE_PORTS = [53682, 8080, 0];
  let server, REDIRECT_PORT;
  for (const port of CANDIDATE_PORTS) {
    try {
      const tryServer = http.createServer();
      await new Promise((resolve, reject) => {
        tryServer.once('error', reject);
        tryServer.listen(port, '127.0.0.1', resolve);
      });
      server = tryServer;
      REDIRECT_PORT = tryServer.address().port;
      break;
    } catch (_) { /* port busy */ }
  }
  if (!server) throw new Error('Could not bind any local port for OAuth redirect');

  const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}`;
  const oauth2Local = new google.auth.OAuth2(CFG.googleClientId, CFG.googleClientSecret, REDIRECT_URI);
  const authUrl = oauth2Local.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  console.log('\n🔐 First-time Google Drive authentication needed.');
  console.log('   Listening on ' + REDIRECT_URI);
  console.log('   Opening this URL in your browser:\n');
  console.log('   ' + authUrl + '\n');
  console.log('   Log in → Allow. You will be redirected back automatically.');
  console.log('   If your browser does NOT open, copy the URL above into any browser.');

  // Try to open the URL
  try {
    const openMod = await import('open').catch(() => null);
    const open = openMod?.default;
    if (open) await open(authUrl);
  } catch (_) { /* user will copy-paste */ }

  const code = await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      try {
        const u = new URL(req.url, `http://127.0.0.1:${REDIRECT_PORT}`);
        const errorParam = u.searchParams.get('error');
        const codeParam = u.searchParams.get('code');
        if (errorParam) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>Auth failed: ${errorParam}</h1>`);
          try { server.close(); } catch (_) {}
          return reject(new Error(errorParam));
        }
        if (codeParam) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>✅ Authenticated! Close this tab and return to the terminal.</h1>');
          try { server.close(); } catch (_) {}
          return resolve(codeParam);
        }
        // Favicon or noise → 204
        res.writeHead(204); res.end();
      } catch (e) {
        try { server.close(); } catch (_) {}
        reject(e);
      }
    });
    setTimeout(() => {
      try { server.close(); } catch (_) {}
      reject(new Error('OAuth timeout after 5 min'));
    }, 5 * 60 * 1000);
  });
  const { tokens } = await oauth2Local.getToken(code);
  oauth2Local.setCredentials(tokens);
  fs.mkdirSync(path.dirname(CFG.tokenFile), { recursive: true });
  fs.writeFileSync(CFG.tokenFile, JSON.stringify(tokens, null, 2));
  console.log('✅ Drive token cached to', CFG.tokenFile);

  return google.drive({ version: 'v3', auth: oauth2Local });
}

// ---------- Drive recursive walker ----------
// Returns: [{ driveFileId, name, mimeType, size, modifiedTime, pathSegments: [category, width, style, ...] }]
async function walkDrive(drive, folderId, pathSoFar = []) {
  const results = [];
  let pageToken;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: 1000,
      pageToken,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of res.data.files || []) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        const kidResults = await walkDrive(drive, f.id, [...pathSoFar, f.name]);
        results.push(...kidResults);
      } else if (IMAGE_EXT_RE.test(f.name)) {
        results.push({
          driveFileId: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size ? parseInt(f.size, 10) : null,
          modifiedTime: f.modifiedTime,
          pathSegments: pathSoFar, // folders above the file, NOT including the file itself
        });
      }
      // else: skip non-image files (PDFs, docs, etc.)
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return results;
}

// ---------- filename parser ----------
function parseFilename(filename, pathSegments) {
  const base = filename.replace(IMAGE_EXT_RE, '');
  // Strip Drive duplicate suffix " (1)", " (2)", etc.
  const cleaned = base.replace(/\s*\(\d+\)\s*$/, '').trim();
  // Match "1234" or "1234-5"
  const m = cleaned.match(/^(\d+)(?:-(\d+))?$/);
  const category = pathSegments[0] || null;
  const width = pathSegments[1] || null;
  const style = pathSegments[2] || null;

  if (!m) {
    return { parseable: false, reason: 'filename does not match ^digits(-digits)?$ pattern', category, width, style };
  }
  const designNo = m[1];
  const sortOrder = m[2] ? parseInt(m[2], 10) : 0;
  return {
    parseable: true,
    design_no: designNo,
    sort_order: sortOrder,
    is_primary: sortOrder === 0,
    category, width, style,
  };
}

// ---------- Bunny upload ----------
async function uploadToBunny(buffer, bunnyPath, contentType) {
  const url = `https://storage.bunnycdn.com/${CFG.bunnyStorageZone}/${bunnyPath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'AccessKey': CFG.bunnyAccessKey,
      'Content-Type': contentType || 'application/octet-stream',
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bunny upload failed ${res.status}: ${text || res.statusText}`);
  }
}

// ---------- Drive download (buffer) ----------
async function downloadFromDrive(drive, fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data);
}

// ---------- main ----------
async function main() {
  requireEnv();

  console.log('\n🚀 Shreerang Image Sync starting...');
  console.log(`   Drive root:  ${CFG.driveRootName} (${CFG.driveRootId})`);
  console.log(`   Bunny zone:  ${CFG.bunnyStorageZone} (prefix: ${CFG.bunnyPathPrefix}/)`);
  console.log(`   Supabase:    ${new URL(CFG.supabaseUrl).host}`);
  if (CFG.dryRun) console.log('   🧪 DRY RUN — no uploads or DB writes');
  if (CFG.maxFiles) console.log(`   ⚠️  MAX_FILES limit: ${CFG.maxFiles}`);
  console.log();

  // --- init clients
  const drive = await getDriveClient();
  const supabase = createClient(CFG.supabaseUrl, CFG.supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // --- fetch already-synced file IDs so we skip them
  console.log('📋 Loading already-synced Drive IDs from Supabase...');
  const existingIds = new Set();
  {
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('product_images')
        .select('drive_file_id')
        .not('drive_file_id', 'is', null)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || !data.length) break;
      for (const r of data) existingIds.add(r.drive_file_id);
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  console.log(`   Found ${existingIds.size} already-synced files.`);

  // --- walk Drive
  console.log(`\n📂 Walking Drive folder tree...`);
  const allFiles = await walkDrive(drive, CFG.driveRootId);
  console.log(`   Discovered ${allFiles.length} image files in Drive.`);

  const toSync = allFiles.filter(f => !existingIds.has(f.driveFileId));
  const skipped = allFiles.length - toSync.length;
  console.log(`   ${skipped} already synced · ${toSync.length} new to process.\n`);

  const workList = CFG.maxFiles ? toSync.slice(0, CFG.maxFiles) : toSync;
  if (workList.length === 0) {
    console.log('✨ Nothing to do. Everything is in sync.\n');
    return;
  }

  // --- process with limited concurrency
  const stats = { synced: 0, unmapped: 0, failed: 0 };
  const failures = [];
  const logLines = [];

  let processed = 0;
  const total = workList.length;

  async function processOne(file) {
    const relPath = [...file.pathSegments, file.name].join('/');
    const parse = parseFilename(file.name, file.pathSegments);
    const bunnyPath = [CFG.bunnyPathPrefix, ...file.pathSegments, file.name].join('/');
    const encodedPath = [CFG.bunnyPathPrefix, ...file.pathSegments, file.name].map(encodeURIComponent).join('/');
    const cdnUrl = `https://${CFG.bunnyCdnHost}/${encodedPath}`;

    try {
      if (CFG.dryRun) {
        // simulate
      } else {
        // 1. download from Drive
        const buf = await downloadFromDrive(drive, file.driveFileId);
        // 2. upload to Bunny preserving full path
        await uploadToBunny(buf, bunnyPath, file.mimeType);
      }

      // 3. insert into Supabase
      if (parse.parseable) {
        if (!CFG.dryRun) {
          const { error } = await supabase.from('product_images').upsert({
            design_no: parse.design_no,
            category: parse.category,
            width: parse.width,
            style: parse.style,
            filename: file.name,
            sort_order: parse.sort_order,
            is_primary: parse.is_primary,
            bunny_path: bunnyPath,
            cdn_url: cdnUrl,
            drive_file_id: file.driveFileId,
            file_size: file.size,
            mime_type: file.mimeType,
            is_active: true,
          }, { onConflict: 'drive_file_id' });
          if (error) throw error;
        }
        stats.synced++;
        processed++;
        const msg = `[${processed}/${total}] ✅ ${relPath} → design ${parse.design_no}, sort ${parse.sort_order}`;
        console.log(msg);
        logLines.push(msg);
      } else {
        if (!CFG.dryRun) {
          const { error } = await supabase.from('product_images_unmapped').upsert({
            drive_file_id: file.driveFileId,
            drive_path: relPath,
            filename: file.name,
            bunny_path: bunnyPath,
            cdn_url: cdnUrl,
            reason: parse.reason,
          }, { onConflict: 'drive_file_id' });
          if (error) throw error;
        }
        stats.unmapped++;
        processed++;
        const msg = `[${processed}/${total}] ⚠️  ${relPath} — unmapped (${parse.reason})`;
        console.log(msg);
        logLines.push(msg);
      }
    } catch (err) {
      stats.failed++;
      processed++;
      const msg = `[${processed}/${total}] ❌ ${relPath} — ${err.message}`;
      console.log(msg);
      logLines.push(msg);
      failures.push({ file: relPath, error: err.message });
    }
  }

  // Simple concurrency pool
  const queue = [...workList];
  async function worker() {
    while (queue.length) {
      const f = queue.shift();
      await processOne(f);
    }
  }
  await Promise.all(Array.from({ length: CFG.concurrency }, worker));

  // --- final report
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Sync complete');
  console.log('═'.repeat(60));
  console.log(`   ✅ Synced:   ${stats.synced}`);
  console.log(`   ⚠️  Unmapped: ${stats.unmapped}`);
  console.log(`   ❌ Failed:   ${stats.failed}`);
  console.log('═'.repeat(60));

  // write log
  try {
    fs.writeFileSync(
      CFG.logFile,
      `${new Date().toISOString()}\n` +
      `Synced: ${stats.synced} | Unmapped: ${stats.unmapped} | Failed: ${stats.failed}\n` +
      '─'.repeat(60) + '\n' +
      logLines.join('\n') + '\n' +
      (failures.length ? '\nFAILURES:\n' + failures.map(f => `  ${f.file}: ${f.error}`).join('\n') : '')
    );
    console.log(`\n   📝 Log written to ${CFG.logFile}`);
  } catch (e) { /* ignore log write failure */ }

  if (stats.failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('\n💥 Fatal:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
