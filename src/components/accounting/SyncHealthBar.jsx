import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * SyncHealthBar — shown just below the page header on all accounting pages.
 *
 * Props:
 *   tableName   {string}  — Supabase table to query for last sync info
 *                           e.g. "rec_from_mill", "sales_bills", "issue_to_mill"
 *   recordCount {number}  — pass the already-loaded record count from the page
 *   extraItems  {Array}   — [{label, value, warn}] for page-specific additions
 *
 * Auto-fetches: last sync timestamp from tally_sync_log, counts records,
 * calculates days behind.
 */
export default function SyncHealthBar({ tableName, recordCount, extraItems = [] }) {
  const [syncInfo, setSyncInfo] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchSyncInfo();
  }, [tableName]);

  async function fetchSyncInfo() {
    try {
      setLoading(true);

      // 1. Last sync time from tally_sync_log
      const { data: syncLog } = await supabase
        .from('tally_sync_log')
        .select('created_at, status, records_synced, error_message')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2. Error count in last 24h
      const since24h = new Date(Date.now() - 86400000).toISOString();
      const { count: errCount } = await supabase
        .from('tally_sync_log')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'error')
        .gte('created_at', since24h);

      // 3. Days behind — compare last sync to now
      let daysBehind = null;
      let lastSyncTime = null;
      let lastSyncDisplay = '—';

      if (syncLog?.created_at) {
        lastSyncTime = new Date(syncLog.created_at);
        const diffMs = Date.now() - lastSyncTime.getTime();
        daysBehind = Math.floor(diffMs / 86400000);

        // Human-readable
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 2)        lastSyncDisplay = 'Just now';
        else if (diffMins < 60)  lastSyncDisplay = `${diffMins}m ago`;
        else if (diffMins < 1440) lastSyncDisplay = `${Math.floor(diffMins/60)}h ago`;
        else                     lastSyncDisplay = `${daysBehind}d ago`;
      }

      setSyncInfo({
        lastSync: lastSyncDisplay,
        lastSyncTime,
        daysBehind,
        recordsSynced: syncLog?.records_synced ?? 0,
        syncStatus: syncLog?.status ?? 'unknown',
        errorCount: errCount ?? 0,
        errorMsg: syncLog?.error_message,
      });
    } catch (e) {
      console.warn('[SyncHealthBar] fetch failed:', e);
      setSyncInfo(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="sync-health-bar">
        <span className="shb-dot syncing" />
        <span className="shb-label">Checking sync…</span>
      </div>
    );
  }

  if (!syncInfo) return null;

  const { lastSync, daysBehind, recordsSynced, syncStatus, errorCount } = syncInfo;
  const daysWarn  = daysBehind != null && daysBehind > 30;
  const hasErrors = errorCount > 0;
  const dotClass  = hasErrors ? 'error' : daysWarn ? 'warn' : syncStatus === 'running' ? 'syncing' : '';

  return (
    <div className="sync-health-bar">

      {/* Sync dot */}
      <span className={`shb-dot ${dotClass}`} title={syncStatus} />

      {/* Last sync */}
      <div className="shb-item">
        <span className="shb-label">Last Sync</span>
        <span className={`shb-value ${daysWarn ? 'warn' : ''}`}>{lastSync}</span>
      </div>

      <div className="shb-divider" />

      {/* Records in this view */}
      {recordCount != null && (
        <>
          <div className="shb-item">
            <span className="shb-label">Records</span>
            <span className="shb-value">{recordCount.toLocaleString('en-IN')}</span>
          </div>
          <div className="shb-divider" />
        </>
      )}

      {/* Days behind */}
      {daysBehind != null && (
        <>
          <div className="shb-item">
            <span className="shb-label">Days Behind</span>
            <span className={`shb-value ${daysWarn ? 'warn' : ''}`}>
              {daysBehind === 0 ? 'Today' : `${daysBehind}d`}
              {daysWarn && ' ⚠'}
            </span>
          </div>
          <div className="shb-divider" />
        </>
      )}

      {/* Errors (24h) */}
      <div className="shb-item">
        <span className="shb-label">Errors (24h)</span>
        <span className={`shb-value ${hasErrors ? 'error' : ''}`}>
          {errorCount}
        </span>
      </div>

      {/* Extra page-specific items */}
      {extraItems.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="shb-divider" />
          <div className="shb-item">
            <span className="shb-label">{item.label}</span>
            <span className={`shb-value ${item.warn ? 'warn' : ''}`}>{item.value}</span>
          </div>
        </div>
      ))}

      {/* Refresh button */}
      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={fetchSyncInfo}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: 'var(--teal, #2BA898)', fontWeight: 600,
            padding: '2px 6px', borderRadius: 4,
            transition: 'background 0.13s',
          }}
          title="Refresh sync info"
        >
          ↻ Refresh
        </button>
      </div>

    </div>
  );
}
