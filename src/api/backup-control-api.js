// ============================================================
// File: api/backup-control.js
// Save this to: your-project/api/backup-control.js
// This is a Vercel serverless function
// ============================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ⚠️ Set these in Vercel Environment Variables (NOT here)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER; // e.g. 'shreerangtrendz'
const GITHUB_REPO = process.env.GITHUB_REPO;   // e.g. 'Shreerang'
const DB_URL = process.env.SUPABASE_DB_URL;     // your pooler URL

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {

    // ── GET: List commits ──────────────────────────────────
    if (req.method === 'GET' && action === 'list-commits') {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?per_page=20`,
        { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
      );
      const commits = await response.json();
      return res.json({
        commits: commits.map(c => ({
          sha: c.sha,
          message: c.commit.message,
          date: new Date(c.commit.author.date).toLocaleString('en-IN'),
          author: c.commit.author.name
        }))
      });
    }

    // ── GET: List backups ──────────────────────────────────
    if (req.method === 'GET' && action === 'list-backups') {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/`,
        { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
      );
      const files = await response.json();
      const backups = files
        .filter(f => f.name.startsWith('data_backup_') && f.name.endsWith('.sql'))
        .sort((a, b) => b.name.localeCompare(a.name))
        .map(f => ({
          name: f.name,
          size: `${Math.round(f.size / 1024)} KB`,
          date: f.name.replace('data_backup_', '').replace('.sql', '')
        }));
      return res.json({ backups });
    }

    // ── POST: Manual backup ────────────────────────────────
    if (req.method === 'POST') {
      const { type, id, file } = req.body;

      if (type === 'manual-backup') {
        // Trigger GitHub Actions workflow for backup
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
          {
            method: 'POST',
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ event_type: 'manual-backup' })
          }
        );
        return res.json({ success: response.ok, message: response.ok ? '✅ Backup triggered! Check GitHub Actions.' : '❌ Failed to trigger backup.' });
      }

      if (type === 'restore-code') {
        // Trigger GitHub Actions workflow for code restore
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
          {
            method: 'POST',
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ event_type: 'restore-code', client_payload: { commit_sha: id } })
          }
        );
        return res.json({ success: response.ok, message: response.ok ? `✅ Code restore to ${id.slice(0,7)} triggered!` : '❌ Failed to trigger restore.' });
      }

      if (type === 'restore-db') {
        // Trigger GitHub Actions workflow for DB restore
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
          {
            method: 'POST',
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ event_type: 'restore-db', client_payload: { backup_file: file } })
          }
        );
        return res.json({ success: response.ok, message: response.ok ? `✅ DB restore from ${file} triggered!` : '❌ Failed to trigger DB restore.' });
      }
    }

    return res.status(400).json({ success: false, message: 'Unknown action' });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
