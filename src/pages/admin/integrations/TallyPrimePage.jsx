import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const TALLY_PROXY = '/api/tally-proxy';

export default function TallyPrimePage() {
  const [tab, setTab] = useState('status');
  const [connected, setConnected] = useState(null); // null = initial/unknown
  const [wasOffline, setWasOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncLog, setSyncLog] = useState([]);
  const [syncType, setSyncType] = useState('ledgers');
  const [lastSync, setLastSync] = useState(null);
  const [lastConnected, setLastConnected] = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(null);
  const [tallyCompany, setTallyCompany] = useState('');

  // Initial check + auto-retry every 60 seconds
  useEffect(() => {
    checkConnection();
    fetchSyncLog();
    const interval = setInterval(() => checkConnection(), 60000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer shown on the offline banner
  useEffect(() => {
    if (connected === false) {
      setRetryCountdown(60);
      const tick = setInterval(() => {
        setRetryCountdown(prev => (prev <= 1 ? 60 : prev - 1));
      }, 1000);
      return () => clearInterval(tick);
    } else {
      setRetryCountdown(null);
    }
  }, [connected]);

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
        setConnected(prev => {
          if (prev === false) { setWasOffline(true); setJustReconnected(true); setTimeout(() => setJustReconnected(false), 8000); }
          return true;
        });
        setLastConnected(new Date());
      } else {
        setConnected(false);
      }
    } catch (e) {
      setConnected(false);
    }
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
      ledgers: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Ledger</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY></ENVELOPE>`,
      stock: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Stock Summary</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY></ENVELOPE>`,
      outstanding: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Bills Receivable</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY></ENVELOPE>`,
      vouchers: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Daybook</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><SVFROMDATE>20250101</SVFROMDATE><SVTODATE>${new Date().toISOString().replace(/-/g, '').slice(0, 8)}</SVTODATE></STATICVARIABLES></DESC></BODY></ENVELOPE>`,
    };

    // Helper: extract single XML tag value
    const xml = (tag, text) => { const m = text.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 's')); return m ? m[1].trim() : ''; };
    // Helper: extract all blocks of a repeated XML tag
    const xmlAll = (tag, text) => [...text.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'gs'))].map(m => m[1].trim());
    // Helper: parse YYYYMMDD → ISO date
    const tallyDate = (d) => (d && d.length >= 8) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null;

    try {
      const res = await fetch(TALLY_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xmlRequests[type] || xmlRequests.ledgers
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      let recordCount = 0;
      let saveError = null;

      // ── VOUCHERS → orders table ──────────────────────────────────────
      if (type === 'vouchers') {
        const blocks = xmlAll('VOUCHER', text);
        const rows = blocks.map(v => ({
          order_number: xml('VOUCHERNUMBER', v) || xml('GUID', v),
          customer_name: xml('PARTYLEDGERNAME', v),
          final_amount: Math.abs(parseFloat(xml('AMOUNT', v)) || 0),
          status: xml('VOUCHERTYPE', v) === 'Sales' ? 'pending' : (xml('VOUCHERTYPE', v).toLowerCase() || 'pending'),
          tally_voucher_type: xml('VOUCHERTYPE', v),
          created_at: tallyDate(xml('DATE', v)) || new Date().toISOString(),
          source: 'tally',
        })).filter(r => r.order_number && r.customer_name);

        if (rows.length > 0) {
          const { error } = await supabase.from('orders')
            .upsert(rows, { onConflict: 'order_number', ignoreDuplicates: false });
          if (error) saveError = error.message;
          else recordCount = rows.length;
        }
      }

      // ── LEDGERS → user_profiles as customers ─────────────────────────
      else if (type === 'ledgers') {
        const blocks = xmlAll('LEDGER', text);
        const rows = blocks.map(v => ({
          full_name: xml('NAME', v) || xml('LEDGERNAME', v),
          firm_name: xml('NAME', v),
          address: xml('ADDRESS', v),
          gst_number: xml('GSTIN', v) || xml('GSTREGISTRATIONNUMBER', v),
          role: 'customer',
          source: 'tally',
          is_approved: true,
        })).filter(r => r.full_name && r.full_name.length > 1 && (r.gst_number || '').length > 0);

        if (rows.length > 0) {
          const { error } = await supabase.from('user_profiles')
            .upsert(rows, { onConflict: 'gst_number', ignoreDuplicates: true });
          if (error) saveError = error.message;
          else recordCount = rows.length;
        }
      }

      // ── STOCK ITEMS → fabric_master table ────────────────────────────
      else if (type === 'stock') {
        const blocks = xmlAll('STOCKITEM', text);
        const rows = blocks.map(v => ({
          name: xml('NAME', v),
          type: 'Tally Stock',
          unit: xml('BASEUNITS', v) || 'Mtr',
          stock_quantity: parseFloat(xml('OPENINGBALANCE', v)) || 0,
          source: 'tally',
        })).filter(r => r.name && r.name.length > 1);

        if (rows.length > 0) {
          const { error } = await supabase.from('fabric_master')
            .upsert(rows, { onConflict: 'name', ignoreDuplicates: false });
          if (error) saveError = error.message;
          else recordCount = rows.length;
        }
      }

      // ── OUTSTANDING → count only (Bills Receivable is a report view) ─
      else if (type === 'outstanding') {
        recordCount = (text.match(/<\/BILLFIXED>/g) || []).length ||
          (text.match(/<\/BILL>/g) || []).length;
      }

      // Save to sync log
      await supabase.from('tally_sync_log').insert([{
        sync_type: type,
        status: saveError ? 'partial' : 'success',
        records_synced: recordCount,
        error_message: saveError,
        raw_response: text.slice(0, 500)
      }]);
      fetchSyncLog();

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
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Tally Prime Integration</h1>
        <p className="text-gray-500 text-sm mt-1">Sync accounting data between Shreerang and Tally Prime via FRP Tunnel</p>
      </div>

      {/* ── BIG OFFLINE BANNER ── */}
      {connected === false && (
        <div className="flex items-start gap-4 p-5 mb-4 rounded-2xl border-2 border-red-400 bg-red-50 shadow-md">
          <span className="text-3xl mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="text-red-800 font-bold text-lg">Tally Offline — Please open TallyPrime on office PC</p>
            <p className="text-red-600 text-sm mt-1">Cannot reach the Tally FRP Tunnel. Make sure Tally Prime is running and the FRP client is active on the office computer.</p>
            {lastConnected && (
              <p className="text-red-500 text-xs mt-2">Last connected: {lastConnected.toLocaleString('en-IN')}</p>
            )}
            <p className="text-red-400 text-xs mt-1">Auto-retrying in {retryCountdown}s…</p>
          </div>
          <button onClick={checkConnection} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 shrink-0">
            {loading ? 'Checking…' : 'Retry Now'}
          </button>
        </div>
      )}

      {/* ── RECONNECTED FLASH BANNER ── */}
      {justReconnected && (
        <div className="flex items-center gap-3 p-4 mb-4 rounded-2xl border-2 border-green-400 bg-green-50 shadow-md animate-pulse">
          <span className="text-2xl">✅</span>
          <p className="text-green-800 font-bold">Tally Reconnected — Data sync resumed automatically</p>
        </div>
      )}

      {/* ── NORMAL STATUS BAR (connected / initial) ── */}
      {connected !== false && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border mb-4 ${connected === true ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className={`w-3 h-3 rounded-full ${connected === true ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <div className="flex-1">
            <p className={`font-medium ${connected === true ? 'text-green-800' : 'text-gray-600'}`}>
              {connected === true ? `Connected to Tally Prime${tallyCompany ? ` — ${tallyCompany}` : ''}` : 'Checking connection…'}
            </p>
            <p className={`text-xs ${connected === true ? 'text-green-600' : 'text-gray-400'}`}>
              {connected === true
                ? `Tally FRP Tunnel is active${lastConnected ? ` · Last verified: ${lastConnected.toLocaleTimeString('en-IN')}` : ''}`
                : 'Please wait…'}
            </p>
          </div>
          <button onClick={checkConnection} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Checking…' : 'Test Connection'}
          </button>
        </div>
      )}

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
                { label: 'FRP Tunnel', value: 'tally.shreerangtrendz.com' },
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
