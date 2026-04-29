# Shreerang Image Sync

Syncs product images from Google Drive → Bunny CDN → Supabase `product_images` table.

**What it does.** Walks the `2-Shreerang Gallery` folder in Drive, uploads every image to Bunny preserving the full folder structure (Category → Width → Style → filename), and indexes each file in Supabase keyed on `design_no` parsed from the filename.

**Filename convention.** Files must be named `<design_no>.<ext>` or `<design_no>-<seq>.<ext>`:

| Filename | Parsed as |
|---|---|
| `769.jpg` | design 769, sort 0 (primary) |
| `769-1.jpg` | design 769, sort 1 (alt angle) |
| `1238 (1).jpg` | design 1238, sort 0 (Drive dup-rename handled) |
| `swatch-pink.jpg` | unparseable → goes to `product_images_unmapped` |

## One-time setup

### 1. Install dependencies

The script uses `googleapis`, `dotenv`, and `open`. They're not in `package.json` because they're only for this script. Install them in the repo root:

```powershell
cd "C:\Shreerang 2026\Horizon Code"
npm install --no-save googleapis dotenv open
```

(Using `--no-save` keeps `package.json` clean since these aren't needed for the Vite build. If you'd rather add them as devDependencies, drop `--no-save`.)

### 2. Create `scripts/.env`

Copy the example and fill in real values:

```powershell
cd scripts
cp .env.example .env
notepad .env
```

Required values:
- `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` — from Google Cloud Console
- `BUNNY_STORAGE_ACCESS_KEY` — from Bunny → Storage → `shreerang-s` → FTP & API Access → Password
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Settings → API → service_role key

### 3. Add the redirect URI to your OAuth client

In Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client ID → **Authorized redirect URIs**, add:

```
http://127.0.0.1:53682/oauth2callback
```

Save. (This lets the script catch the auth redirect when you consent in the browser.)

### 4. Add `.drive-token.json` and `.env` to .gitignore

The script caches the OAuth refresh token to `scripts/.drive-token.json`. That file must never be committed. Add these lines to `C:\Shreerang 2026\Horizon Code\.gitignore`:

```
scripts/.env
scripts/.drive-token.json
scripts/sync.log
```

## Running

### First run — small test

Always test with `MAX_FILES` first so you don't accidentally sync 3000 files on the first go:

```powershell
cd "C:\Shreerang 2026\Horizon Code"
$env:MAX_FILES="5"
node scripts/sync-drive-to-bunny.mjs
```

First run will print an auth URL. A browser tab opens. Log in, click Allow. Terminal picks up the redirect and starts syncing. The refresh token is cached — next runs are unattended.

### Regular run

```powershell
node scripts/sync-drive-to-bunny.mjs
```

Output looks like:

```
[142/2847] ✅ 1-Rayon/Width-44/1-Top(Foil)/769.jpg → design 769, sort 0
[143/2847] ✅ 1-Rayon/Width-44/1-Top(Foil)/769-1.jpg → design 769, sort 1
[144/2847] ⚠️  1-Rayon/Width-44/1-Top(Foil)/cover-swatch.jpg — unmapped (filename does not match ^digits(-digits)?$ pattern)
```

### Dry run (no writes)

See what *would* happen without uploading or touching the DB:

```powershell
$env:DRY_RUN="1"
node scripts/sync-drive-to-bunny.mjs
```

### Add to package.json scripts

Optional but convenient. Add to the `"scripts"` section of `package.json`:

```json
"sync-images": "node scripts/sync-drive-to-bunny.mjs",
"sync-images:dry": "cross-env DRY_RUN=1 node scripts/sync-drive-to-bunny.mjs"
```

Then just `npm run sync-images`.

## Behaviour

**Idempotent.** The upsert key is `drive_file_id`, so re-runs skip files already in `product_images`. If you replace a Drive file with a new version, the script will re-upload and update the Supabase row on next run.

**Partial failure.** If a single file errors (network blip, Bunny 5xx, etc.) the script logs it and keeps going. Full list of failures is in `scripts/sync.log` and also repeated on stdout at the end. Exit code is non-zero if any file failed, so CI/cron will notice.

**Concurrency.** 3 parallel uploads by default. If Bunny rate-limits you, lower this in the script (look for `concurrency: 3`).

## Unmapped files — what to do

Files whose names don't fit the `<digits>` or `<digits>-<digits>` pattern go to `product_images_unmapped`. They still get uploaded to Bunny (so nothing is lost) but they don't appear in the website gallery. To fix them:

```sql
-- See the backlog
SELECT filename, drive_path, reason FROM product_images_unmapped ORDER BY created_at DESC;

-- Manually link one to a design
INSERT INTO product_images (design_no, filename, bunny_path, cdn_url, sort_order, is_primary, drive_file_id, is_active)
SELECT '1234', filename, bunny_path, cdn_url, 0, true, drive_file_id, true
FROM product_images_unmapped WHERE drive_file_id = '<drive-id>';

DELETE FROM product_images_unmapped WHERE drive_file_id = '<drive-id>';
```

Or ask your team to rename the file in Drive to follow the convention, and re-run the sync.

## Scheduling (optional, later)

To run automatically, use Windows Task Scheduler:
1. Create Basic Task
2. Trigger: Daily / Weekly / whatever
3. Action: Start a program
4. Program: `node`
5. Arguments: `scripts/sync-drive-to-bunny.mjs`
6. Start in: `C:\Shreerang 2026\Horizon Code`

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Missing env vars` | `.env` not found or incomplete | Ensure `scripts/.env` exists with all 5 required keys |
| `redirect_uri_mismatch` on first auth | Didn't add the redirect URI | Add `http://127.0.0.1:53682/oauth2callback` in Google Cloud Console |
| `Bunny upload failed 401` | Wrong `BUNNY_STORAGE_ACCESS_KEY` | Copy from Bunny → Storage → zone → FTP & API → Password (NOT the account-level API key) |
| `JWT expired` | Supabase key expired or rotated | Update `SUPABASE_SERVICE_ROLE_KEY` in `.env` |
| Script hangs on OAuth | Browser didn't redirect | Copy the printed URL into the browser manually, complete consent |

## Safety

- The script only reads from Drive (`drive.readonly` scope). It cannot delete or modify your Drive files.
- The script uploads to Bunny only (no deletes). If you delete an image from Drive, it stays in Bunny. Clean-up is manual.
- The Supabase upsert never deletes rows. Setting `is_active = false` on a row hides it from the website without losing the record.
