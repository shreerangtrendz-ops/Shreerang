import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const TALLY_PROXY = '/api/tally-proxy';

export default function TallyPrimePage() {
  const [tab, setTab] = useState('status');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncLog, setSyncLog] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [syncType, setSyncType] = useState('ledgers');
  const [lastSync, setLastSync] = useState(null);
  const [tallyCompany, setTallyCompany] = useState('');

  useEffect(() => { checkConnection(); fetchSyncLog(); }, []);

  async function checkConnection() {
    setLoading(true);
    try {
      const res = await fetch(TALLY_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>List of Companies</ID></HEADER><BODY><DESC></DESC></BODY></ENVELOPE>`
      });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/<NAME>(.*?)<\/NAME>/);
        if (match) setTallyCompany(match[1]);
        setConnected(true);
      }
    } catch (e) { setConnected(false); }
    setLoading(false);
  }

  async function fetchSyncLog() {
    const { data } = await supabase.from('tally_sync_log').select('*').order('synced_at', { ascending: false }).limit(20);
    setSyncLog(data || []);
    if (data && data.length > 0) setLastSync(data[0].synced_at);
  }

  async function syncFromTally(type) {
    setLoading(true);
    const xmlRequests = {
      ledgers: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>List of Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY></ENVELOPE>`,
      vouchers: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Daybook</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><SVFROMDATE>20250101</SVFROMDATE><SVTODATE>${new Date().toISOString().replace(/-/g, '').slice(0, 8)}</SVTODATE></STATICVARIABLES></DESC></BODY></ENVELOPE>`,
    };
    try {
      const res = await fetch(TALLY_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xmlRequests[type] || xmlRequests.ledgers
      });
      if (res.ok) {
        const text = await res.text();
        await supabase.from('tally_sync_log').insert([{
          sync_type: type, status: 'success', records_synced: (text.match(/<\/LEDGER>/g) || []).length,
          raw_response: text.slice(0, 500)
        }]);
        fetchSyncLog();
      }
    } catch (e) {
      await supabase.from('tally_sync_log').insert([{ sync_type: type, status: 'failed', error_message: e.message }]);
      fetchSyncLog();
    }
    setLoading(false);
  }

  const tabs = [
    { id: 'status', label: 'Connection', icon: '🔌' },
    { id: 'sync', label: 'Data Sync', icon: '🔄' },
    { id: 'log', label: 'Sync Log', icon: '📋' },
    { id: 'guide', label: 'Setup Guide', icon: '📖' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tally Prime Integration</h1>
        <p className="text-gray-500 text-sm mt-1">Sync accounting data between Shreerang and Tally Prime via FRP Tunnel</p>
      </div>

      <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'} ${connected ? 'animate-pulse' : ''}`} />
        <div className="flex-1">
          <p className={`font-medium ${connected ? 'text-green-800' : 'text-red-800'}`}>
            {connected ? `Connected to Tally Prime${tallyCompany ? ` — ${tallyCompany}` : ''}` : 'Tally Prime Not Connected'}
          </p>
          <p className={`text-xs ${connected ? 'text-green-600' : 'text-red-600'}`}>
            {connected ? 'Tally FRP Tunnel is active and responsive' : 'Cannot reach Tally. Ensure Tally is running and FRP Tunnel is active.'}
          </p>
        </div>
        <button onClick={checkConnection} disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${connected ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'} disabled:opacity-50`}>
          {loading ? 'Checking...' : 'Test Connection'}
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'status' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Connection Details</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Tally FRP Tunnel', value: 'tally.shreerangtrendz.com (via proxy)' },
                { label: 'Status', value: connected ? '✅ Connected' : '❌ Disconnected' },
                { label: 'Company', value: tallyCompany || 'Not detected' },
                { label: 'Last Sync', value: lastSync ? new Date(lastSync).toLocaleString('en-IN') : 'Never' },
                { label: 'Protocol', value: 'Tally XML Gateway' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-medium text-gray-900 text-right max-w-48 truncate">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Sync Statistics</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Syncs', value: syncLog.length, color: 'bg-blue-50 text-blue-700' },
                { label: 'Successful', value: syncLog.filter(l => l.status === 'success').length, color: 'bg-green-50 text-green-700' },
                { label: 'Failed', value: syncLog.filter(l => l.status === 'failed').length, color: 'bg-red-50 text-red-700' },
              ].map((s, i) => (
                <div key={i} className={`flex justify-between items-center p-3 rounded-lg ${s.color}`}>
                  <span className="text-sm">{s.label}</span>
                  <span className="font-bold text-lg">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'sync' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'ledgers', label: 'Sync Ledgers', icon: '📒', desc: 'Import customer and vendor ledger data from Tally', color: 'blue' },
            { id: 'vouchers', label: 'Sync Vouchers', icon: '🧾', desc: 'Import sales and payment vouchers from Tally', color: 'green' },
            { id: 'stock', label: 'Sync Stock Items', icon: '📦', desc: 'Import stock items and inventory from Tally', color: 'purple' },
            { id: 'outstanding', label: 'Sync Outstanding', icon: '💳', desc: 'Import outstanding payables and receivables', color: 'orange' },
          ].map(item => (
            <div key={item.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h4 className="font-semibold text-gray-900">{item.label}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
              <button onClick={() => syncFromTally(item.id)} disabled={loading || !connected}
                className={`w-full py-2 rounded-lg text-sm font-medium bg-${item.color}-600 text-white hover:bg-${item.color}-700 disabled:opacity-50 disabled:cursor-not-allowed`}>
                {loading ? '⏳ Syncing...' : `Sync ${item.label.replace('Sync ', '')}`}
              </button>
              {!connected && <p className="text-xs text-red-500 mt-1 text-center">Connect Tally first</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'log' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Type', 'Status', 'Records', 'Time', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {syncLog.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No sync history yet. Run a sync to get started.</td></tr>
              ) : syncLog.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 capitalize">{log.sync_type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {log.status === 'success' ? '✅' : '❌'} {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.records_synced || 0}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{log.synced_at ? new Date(log.synced_at).toLocaleString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{log.error_message || 'Success'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'guide' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 text-lg">Tally Prime Setup Guide</h3>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Install FRP on your Tally PC', desc: 'Set up FRP (Fast Reverse Proxy) on the computer running Tally Prime to expose it via tally.shreerangtrendz.com.' },
              { step: 2, title: 'Enable Tally XML Server', desc: 'In Tally Prime → F12 → Advanced Configuration → Enable ODBC/XML Port. Set port to 9000.' },
              { step: 3, title: 'Start FRP Tunnel', desc: 'Run your FRP client with server domain tally.shreerangtrendz.com pointing to localhost:9000.' },
              { step: 4, title: 'Test connection', desc: 'Click "Test Connection" above. You should see Connected status and your company name.' },
              { step: 5, title: 'Start syncing data', desc: 'Use the Data Sync tab to pull ledgers, vouchers, and outstanding data from Tally.' },
            ].map(s => (
              <div key={s.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {s.step}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{s.title}</h4>
                  <p className="text-sm text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <p className="text-xs text-blue-700 font-medium">Current FRP Tunnel endpoint:</p>
            <p className="text-xs text-blue-600 font-mono mt-1 break-all">tally.shreerangtrendz.com → routed via /api/tally-proxy</p>
            <p className="text-xs text-blue-500 mt-1">All Tally API calls are proxied through Vercel to avoid CORS issues.</p>
          </div>
        </div>
      )}
    </div>
  );
}
