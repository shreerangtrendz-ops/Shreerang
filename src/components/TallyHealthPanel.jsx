import React, { useState, useEffect } from 'react';

export default function TallyHealthPanel() {
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const r = await fetch('/api/tally-proxy?health=1');
      const data = await r.json();
      setHealth(data);
    } catch (e) {
      setHealth({ status: 'offline', error: e.message, message: 'Could not reach proxy' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { checkHealth(); }, []);

  const statusColor = health?.status === 'connected' ? '#22c55e'
    : health?.status === 'partial' ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      background: '#0B2E2B', border: `2px solid ${statusColor}`,
      borderRadius: 12, padding: 20, marginBottom: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%', background: statusColor,
          boxShadow: health?.status === 'connected' ? `0 0 8px ${statusColor}` : 'none',
          flexShrink: 0
        }} />
        <h3 style={{ color: '#fff', margin: 0, fontSize: 15, fontFamily: 'DM Sans, sans-serif' }}>
          Tally Prime: {health ? health.status?.toUpperCase() : 'Checking...'}
        </h3>
        {health?.latency_ms && (
          <span style={{ color: '#3DBFAE', fontSize: 12 }}>{health.latency_ms}ms</span>
        )}
        <button onClick={checkHealth} disabled={checking}
          style={{
            marginLeft: 'auto', background: '#2BA898', color: '#fff',
            border: 'none', borderRadius: 6, padding: '5px 12px',
            cursor: checking ? 'not-allowed' : 'pointer', fontSize: 13
          }}>
          {checking ? '⟳ Checking...' : '↻ Recheck'}
        </button>
      </div>

      {health?.status !== 'connected' && health && (
        <div style={{ background: '#1a3a37', borderRadius: 8, padding: 16 }}>
          <p style={{ color: '#f87171', fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
            ⚠️ {health.message}
          </p>
          <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
            HOW TO FIX:
          </p>
          <ol style={{ color: '#d1d5db', fontSize: 12, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
            <li>Open <strong style={{color:'#fff'}}>Tally Prime</strong> on the local PC</li>
            <li>Press <kbd style={{background:'#374151',padding:'1px 6px',borderRadius:3}}>F12</kbd> → <strong style={{color:'#fff'}}>Advanced Configuration</strong></li>
            <li>Set <strong style={{color:'#3DBFAE'}}>"Enable Tally.ERP 9 as HTTP Server"</strong> → <strong style={{color:'#fff'}}>Yes</strong></li>
            <li>Set <strong style={{color:'#3DBFAE'}}>Port Number</strong> → <strong style={{color:'#fff'}}>9000</strong></li>
            <li>Press <kbd style={{background:'#374151',padding:'1px 6px',borderRadius:3}}>Ctrl+A</kbd> to Accept</li>
            <li>Ensure <strong style={{color:'#fff'}}>frpc.exe</strong> CMD window is running</li>
            <li>Click <strong style={{color:'#3DBFAE'}}>↻ Recheck</strong> above</li>
          </ol>
        </div>
      )}
      {health?.status === 'connected' && (
        <p style={{ color: '#22c55e', margin: 0, fontSize: 13 }}>
          ✅ Tally Prime is live — sync is ready
        </p>
      )}
    </div>
  );
}
