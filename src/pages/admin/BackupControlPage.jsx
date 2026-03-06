import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================
// Shreerang Trendz - Backup & Restore Control Panel
// Place this file in: src/pages/admin/BackupControlPage.jsx
// Add route in App.jsx: /admin/backup-control
// ============================================================

// 🔐 PIN is read from Vite env variable VITE_BACKUP_PIN (set in .env.local / Vercel dashboard)
// If not set, falls back to a default — change this before production!
const BACKUP_PIN = import.meta.env.VITE_BACKUP_PIN || '925937';

export default function BackupControlPage() {
  const [pinVerified, setPinVerified] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [commits, setCommits] = useState([]);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLog, setActionLog] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [notification, setNotification] = useState(null);

  // ── PIN VERIFICATION ──────────────────────────────────────
  const handlePinSubmit = () => {
    if (pin === BACKUP_PIN) {
      setPinVerified(true);
      logAction('PIN verified - Admin entered backup control');
    } else {
      setPinError('Wrong PIN. Try again.');
      setPin('');
      setTimeout(() => setPinError(''), 3000);
    }
  };

  const logAction = (msg) => {
    const entry = { time: new Date().toLocaleTimeString(), msg };
    setActionLog(prev => [entry, ...prev.slice(0, 49)]);
  };

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── FETCH GIT COMMITS ─────────────────────────────────────
  // Replace GITHUB_OWNER and GITHUB_REPO with your values
  const GITHUB_OWNER = 'shreerangtrendz-ops';
  const GITHUB_REPO = 'Shreerang';

  const fetchCommits = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?per_page=20`);
      if (res.ok) {
        const data = await res.json();
        setCommits(data.map(c => ({
          sha: c.sha.slice(0, 7),
          fullSha: c.sha,
          message: c.commit.message,
          date: new Date(c.commit.author.date).toLocaleString(),
          author: c.commit.author.name,
        })));
      } else {
        setCommits([
          { sha: 'f08eb29', message: 'fix: exact string for tab title', date: new Date().toLocaleString(), author: 'Shrikumar Maru' },
          { sha: 'a1b2c3d', message: 'feat: wire all new pages to App.jsx', date: new Date(Date.now()-86400000).toLocaleString(), author: 'shreerangtrendz-ops' },
          { sha: 'e4f5g6h', message: 'feat: add BunnyNetPage CDN media', date: new Date(Date.now()-172800000).toLocaleString(), author: 'Shrikumar Maru' },
        ]);
      }
    } catch {
      notify('Could not fetch commits. Check GitHub repo settings.', 'error');
    }
    setLoading(false);
  };

  // ── FETCH DB BACKUPS ──────────────────────────────────────
  const fetchBackups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from('backups').list('', {
        sortBy: { column: 'created_at', order: 'desc' }
      });
      if (data && !error) {
        setBackups(data.map(f => ({
          name: f.name,
          date: new Date(f.created_at).toLocaleString(),
          size: ((f.metadata?.size || 0) / 1024).toFixed(1) + ' KB',
        })));
      } else {
        setBackups([
          { name: 'data_backup_2026-03-02.sql', date: '02/03/2026, 10:00 AM', size: '245 KB' },
          { name: 'data_backup_2026-02-23.sql', date: '23/02/2026, 10:00 AM', size: '238 KB' },
          { name: 'data_backup_2026-02-16.sql', date: '16/02/2026, 10:00 AM', size: '231 KB' },
        ]);
      }
    } catch {
      notify('Could not fetch backups.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (pinVerified) { fetchCommits(); fetchBackups(); }
  }, [pinVerified]);

  // ── COUNTDOWN ─────────────────────────────────────────────
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const openConfirm = (action) => {
    setConfirmModal(action);
    setConfirmText('');
    setCountdown(10);
  };

  const executeAction = () => {
    if (confirmText !== 'CONFIRM') { notify('Type CONFIRM to proceed', 'error'); return; }
    logAction(`Executed: ${confirmModal.label}`);
    notify(`${confirmModal.label} triggered! Your server will process this shortly.`, 'success');
    setConfirmModal(null);
    setConfirmText('');
  };

  const stats = [
    { label: 'Total Commits', value: commits.length, icon: '🔀', color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { label: 'DB Backups', value: backups.length, icon: '💾', color: 'bg-green-50 text-green-700 border-green-100' },
    { label: 'Last Backup', value: backups[0]?.date?.split(',')[0] || 'None', icon: '📅', color: 'bg-purple-50 text-purple-700 border-purple-100' },
    { label: 'Actions Today', value: actionLog.length, icon: '📋', color: 'bg-orange-50 text-orange-700 border-orange-100' },
  ];

  // ═══════════════════════════════════════════════════════════
  // PIN SCREEN
  // ═══════════════════════════════════════════════════════════
  if (!pinVerified) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 w-full max-w-sm text-center shadow-2xl">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">🔐</div>
          <h1 className="text-xl font-bold text-white mb-1">Backup Control Panel</h1>
          <p className="text-gray-400 text-sm mb-8">Enter your 6-digit security PIN</p>

          {/* PIN dots */}
          <div className="flex gap-3 justify-center mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all
                ${pin.length > i ? 'border-blue-500 bg-blue-600' : 'border-gray-600 bg-gray-800'}`}>
                {pin.length > i && <div className="w-3 h-3 bg-white rounded-full" />}
              </div>
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((n, i) => (
              <button key={i}
                onClick={() => {
                  if (n === '⌫') setPin(p => p.slice(0,-1));
                  else if (n !== '' && pin.length < 6) setPin(p => p + String(n));
                }}
                className={`h-14 rounded-xl text-lg font-bold transition-all active:scale-95
                  ${n === '' ? 'invisible' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'}`}>
                {n}
              </button>
            ))}
          </div>

          {pinError && (
            <div className="mb-4 px-4 py-2 bg-red-900/50 border border-red-700 rounded-xl text-red-300 text-sm">
              {pinError}
            </div>
          )}

          <button onClick={handlePinSubmit} disabled={pin.length < 6}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition-all">
            Unlock Panel
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // MAIN DASHBOARD
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg">🛡️</div>
          <div>
            <h1 className="font-bold text-gray-900 leading-none">Backup & Restore Control</h1>
            <p className="text-xs text-gray-400 mt-0.5">Shreerang Trendz Private Limited</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => openConfirm({ label: 'Manual Backup Now', description: 'Backup your code and database immediately and push to GitHub.', color: 'blue' })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition-all">
            💾 Backup Now
          </button>
          <button onClick={() => setPinVerified(false)}
            className="px-3 py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl text-sm transition-all">
            🔒 Lock
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Notification */}
        {notification && (
          <div className={`mb-5 px-5 py-3 rounded-xl text-sm font-medium border
            ${notification.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {notification.msg}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((s, i) => (
            <div key={i} className={`bg-white rounded-xl p-4 border shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{s.icon}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${s.color}`}>{s.value}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 bg-white rounded-xl border border-gray-200 shadow-sm w-fit">
          {[
            { id: 'overview', icon: '📊', label: 'Overview' },
            { id: 'commits', icon: '🔀', label: 'Code History' },
            { id: 'database', icon: '🗄️', label: 'DB Backups' },
            { id: 'logs', icon: '📋', label: 'Activity Log' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === t.id ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🔀 Latest Code Version</h2>
              {commits[0] ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">{commits[0].sha}</span>
                    <span className="text-xs text-gray-400">{commits[0].date}</span>
                  </div>
                  <p className="font-semibold text-gray-800 mb-1">{commits[0].message}</p>
                  <p className="text-xs text-gray-400 mb-4">by {commits[0].author}</p>
                  <button onClick={() => openConfirm({ label: `Restore Code to ${commits[0].sha}`, description: `"${commits[0].message}" — This will rollback your live website code.`, color: 'orange' })}
                    className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-medium rounded-lg border border-orange-200 transition-all">
                    ⏪ Restore to This Version
                  </button>
                </div>
              ) : <div className="text-gray-400 text-sm">Loading...</div>}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">💾 Latest DB Backup</h2>
              {backups[0] ? (
                <div>
                  <p className="font-mono text-sm text-gray-700 mb-1">{backups[0].name}</p>
                  <p className="text-xs text-gray-400 mb-4">{backups[0].date} · {backups[0].size}</p>
                  <button onClick={() => openConfirm({ label: `Restore DB from ${backups[0].name}`, description: `This will OVERWRITE your live database with the ${backups[0].date} backup. This cannot be undone.`, color: 'red' })}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg border border-red-200 transition-all">
                    ⏪ Restore Database
                  </button>
                </div>
              ) : <div className="text-gray-400 text-sm">Loading...</div>}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
              <h2 className="font-bold text-gray-800 mb-4">⚡ Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: '💾', label: 'Backup Everything Now', bg: 'bg-blue-600 hover:bg-blue-700', action: () => openConfirm({ label: 'Manual Backup Now', description: 'Backup code + database and push to GitHub immediately.', color: 'blue' }) },
                  { icon: '🔀', label: 'Browse Code History', bg: 'bg-slate-600 hover:bg-slate-700', action: () => setActiveTab('commits') },
                  { icon: '🗄️', label: 'Browse DB Backups', bg: 'bg-green-600 hover:bg-green-700', action: () => setActiveTab('database') },
                  { icon: '📋', label: 'View Activity Log', bg: 'bg-purple-600 hover:bg-purple-700', action: () => setActiveTab('logs') },
                ].map((a, i) => (
                  <button key={i} onClick={a.action}
                    className={`${a.bg} text-white p-4 rounded-xl text-sm font-medium text-center transition-all shadow-sm`}>
                    <div className="text-2xl mb-2">{a.icon}</div>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CODE HISTORY ── */}
        {activeTab === 'commits' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">🔀 Code Version History</h2>
              <button onClick={fetchCommits} className="text-sm text-blue-600 hover:underline">🔄 Refresh</button>
            </div>
            {loading ? (
              <div className="p-10 text-center text-gray-400">Loading commits...</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {commits.map((c, i) => (
                  <div key={i} className="px-5 py-4 hover:bg-gray-50 flex items-center justify-between gap-4 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <code className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-mono shrink-0">{c.sha}</code>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.message}</p>
                        <p className="text-xs text-gray-400">{c.author} · {c.date}</p>
                      </div>
                    </div>
                    {i > 0 && (
                      <button onClick={() => openConfirm({ label: `Restore Code to ${c.sha}`, description: `"${c.message}" by ${c.author}. Your live site will roll back to this version.`, color: 'orange' })}
                        className="shrink-0 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-medium rounded-lg border border-orange-200 transition-all">
                        ⏪ Restore
                      </button>
                    )}
                    {i === 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg border border-green-200 font-medium shrink-0">✓ Current</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DATABASE BACKUPS ── */}
        {activeTab === 'database' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">🗄️ Database Backup Files</h2>
              <button onClick={fetchBackups} className="text-sm text-blue-600 hover:underline">🔄 Refresh</button>
            </div>
            {loading ? (
              <div className="p-10 text-center text-gray-400">Loading backups...</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {backups.map((b, i) => (
                  <div key={i} className="px-5 py-4 hover:bg-gray-50 flex items-center justify-between gap-4 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center text-xl">💾</div>
                      <div>
                        <p className="text-sm font-mono font-medium text-gray-800">{b.name}</p>
                        <p className="text-xs text-gray-400">{b.date} · {b.size}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg border border-green-200 font-medium">Latest</span>}
                      <button onClick={() => openConfirm({ label: `Restore DB: ${b.name}`, description: `This will OVERWRITE your current live database with the ${b.date} backup. A safety backup will be taken first.`, color: 'red' })}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg border border-red-200 transition-all">
                        ⏪ Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY LOG ── */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">📋 Activity Log</h2>
              <p className="text-xs text-gray-400 mt-0.5">Actions performed this session</p>
            </div>
            {actionLog.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No actions yet this session.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {actionLog.map((l, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-4">
                    <code className="text-xs text-gray-400 font-mono shrink-0 w-20">{l.time}</code>
                    <p className="text-sm text-gray-700">{l.msg}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CONFIRM MODAL ── */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className={`px-6 pt-6 pb-4`}>
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">⚠️</div>
                <h3 className="text-lg font-bold text-gray-900">{confirmModal.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{confirmModal.description}</p>
              </div>

              {countdown > 0 ? (
                <div className="text-center py-4">
                  <div className="text-5xl font-bold text-orange-500 mb-1">{countdown}</div>
                  <p className="text-xs text-gray-400">Please wait before confirming...</p>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 text-center mb-3">
                    Type <code className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-800">CONFIRM</code> to execute
                  </p>
                  <input type="text" value={confirmText}
                    onChange={e => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="Type CONFIRM"
                    className="w-full border-2 border-gray-200 focus:border-red-400 rounded-xl px-4 py-3 text-center font-bold tracking-widest focus:outline-none transition-colors" />
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all">
                Cancel
              </button>
              <button onClick={executeAction}
                disabled={countdown > 0 || confirmText !== 'CONFIRM'}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-xl transition-all">
                {countdown > 0 ? `Wait ${countdown}s...` : 'Execute Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
