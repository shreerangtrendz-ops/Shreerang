import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const TALLY_PROXY = '/api/tally-proxy';

// ─── Vendor → Process Type mapping (fallback if tally_ledger_name not set) ───
// Edit this object to match your exact Tally ledger names
const VENDOR_PROCESS_MAP = {
  'SUDARSHAN TEXTILES': 'dyeing',
  'V. RUNGTA': 'dyeing',
  'RUNGTA': 'dyeing',
  'GCG MILL': 'mill_print',
  'GCG MILL PRINT': 'mill_print',
  'SURBHI TEXTILES': 'schiffli',
  'SURBHI': 'schiffli',
};

// ─── XML Helpers ──────────────────────────────────────────────────────────────
const xml = (tag, text) => { const m = text.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's')); return m ? m[1].trim() : ''; };
const xmlAll = (tag, text) => [...text.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'gs'))].map(m => m[1].trim());
const xmlAttr = (tag, attr, text) => { const m = text.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 's')); return m ? m[1].trim() : ''; };
const tallyDate = d => (d && d.length >= 8) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null;
const safeNum = v => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : Math.abs(n); };

// ─── XML Request Templates ────────────────────────────────────────────────────
const today = () => new Date().toISOString().replace(/-/g, '').slice(0, 8);
const dateRange = from => `<SVFROMDATE>${from}</SVFROMDATE><SVTODATE>${today()}</SVTODATE>`;

const XML_REQUESTS = {
  ledgers: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Ledger</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY></ENVELOPE>`,

  purchases: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Daybook</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>${dateRange('20250101')}<VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME></STATICVARIABLES></DESC></BODY></ENVELOPE>`,

  job_bills: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Daybook</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>${dateRange('20250101')}<VOUCHERTYPENAME>Journal</VOUCHERTYPENAME></STATICVARIABLES></DESC></BODY></ENVELOPE>`,

  delivery_notes: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Daybook</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>${dateRange('20250101')}<VOUCHERTYPENAME>Delivery Note</VOUCHERTYPENAME></STATICVARIABLES></DESC></BODY></ENVELOPE>`,

  vouchers: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Daybook</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>${dateRange('20250101')}</STATICVARIABLES></DESC></BODY></ENVELOPE>`,

  stock: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Stock Summary</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY></ENVELOPE>`,

  outstanding: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Bills Receivable</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY></ENVELOPE>`,
};

export default function TallyPrimePage() {
  const [tab, setTab] = useState('status');
  const [connected, setConnected] = useState(null);
  const [justReconnected, setJustReconnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncLog, setSyncLog] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [lastConnected, setLastConnected] = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(null);
  const [tallyCompany, setTallyCompany] = useState('');
  const [syncStatus, setSyncStatus] = useState(''); // live progress message
  const [jobWorkerMap, setJobWorkerMap] = useState({}); // tally_ledger_name → {id, process_type}

  useEffect(() => {
    checkConnection();
    fetchSyncLog();
    loadJobWorkerMap();
    const iv = setInterval(checkConnection, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (connected === false) {
      setRetryCountdown(60);
      const tick = setInterval(() => setRetryCountdown(p => p <= 1 ? 60 : p - 1), 1000);
      return () => clearInterval(tick);
    } else setRetryCountdown(null);
  }, [connected]);

  // Pre-load job_workers lookup table so parsers can use it without extra queries
  async function loadJobWorkerMap() {
    const { data } = await supabase
      .from('job_workers')
      .select('id, worker_name, tally_ledger_name, process_type')
      .eq('status', 'active');
    if (!data) return;
    const map = {};
    data.forEach(w => {
      if (w.tally_ledger_name) map[w.tally_ledger_name.toUpperCase()] = { id: w.id, process_type: w.process_type, name: w.worker_name };
    });
    setJobWorkerMap(map);
  }

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
          if (prev === false) { setJustReconnected(true); setTimeout(() => setJustReconnected(false), 8000); }
          return true;
        });
        setLastConnected(new Date());
      } else setConnected(false);
    } catch { setConnected(false); }
    setLoading(false);
  }

  async function fetchSyncLog() {
    const { data } = await supabase
      .from('tally_sync_log')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(30);
    setSyncLog(data || []);
    if (data?.length) setLastSync(data[0].synced_at);
  }

  // ─── Resolve process_type from party name ─────────────────────────────────
  function resolveProcessType(partyName) {
    const upper = (partyName || '').toUpperCase();
    // 1. Exact match from Supabase job_workers.tally_ledger_name
    if (jobWorkerMap[upper]) return jobWorkerMap[upper].process_type;
    // 2. Fallback to hardcoded map
    for (const [key, val] of Object.entries(VENDOR_PROCESS_MAP)) {
      if (upper.includes(key)) return val;
    }
    // 3. Last resort keyword sniff
    if (upper.includes('SCHIFFLI') || upper.includes('SURBHI')) return 'schiffli';
    if (upper.includes('MILL') || upper.includes('PRINT')) return 'mill_print';
    if (upper.includes('EMBROID')) return 'embroidery';
    return 'dyeing'; // default
  }

  // ─── Main Sync Function ───────────────────────────────────────────────────
  async function syncFromTally(type) {
    setLoading(true);
    setSyncStatus(`Fetching ${type} from Tally…`);
    let recordCount = 0, saveError = null;

    try {
      const res = await fetch(TALLY_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: XML_REQUESTS[type] || XML_REQUESTS.ledgers
      });
      if (!res.ok) throw new Error(`Tally HTTP ${res.status}`);
      const text = await res.text();
      setSyncStatus(`Parsing ${type} response…`);

      // ── 1. PURCHASES → purchase_fabric ──────────────────────────────────
      if (type === 'purchases') {
        const blocks = xmlAll('VOUCHER', text);
        setSyncStatus(`Parsing ${blocks.length} purchase vouchers…`);

        const rows = blocks.flatMap(v => {
          const voucherNo = xml('VOUCHERNUMBER', v);
          const date = tallyDate(xml('DATE', v)) || new Date().toISOString().slice(0, 10);
          const party = xml('PARTYLEDGERNAME', v);
          const narration = xml('NARRATION', v);
          const dueDate = tallyDate(xml('BILLDATE', v)) || tallyDate(xml('DUEDATE', v));

          // Parse all inventory entries within this voucher
          const invBlocks = xmlAll('ALLINVENTORYENTRIES.LIST', v).length
            ? xmlAll('ALLINVENTORYENTRIES.LIST', v)
            : xmlAll('INVENTORYENTRIES.LIST', v);

          if (invBlocks.length === 0) {
            // Fallback: single-line voucher
            const amount = safeNum(xml('AMOUNT', v));
            const qtyRaw = xml('BILLEDQTY', v) || xml('ACTUALQTY', v);
            const qty = safeNum(qtyRaw.split(' ')[0]) || 1;
            const rateRaw = xml('RATE', v);
            const rate = safeNum(rateRaw.split('/')[0]) || (amount / qty);
            if (!party || rate === 0) return [];
            return [{
              invoice_no: voucherNo,
              date,
              supplier_name: party,
              fabric_type: narration || 'Grey Fabric',
              sku_id: narration || null,
              quantity_mtrs: qty,
              price: parseFloat(rate.toFixed(2)),
              freight_amount: 0,
              cash_discount: safeNum(xml('DISCOUNT', v)),
              due_date: dueDate,
              broker_name: xml('BROKERNAME', v) || null,
              credit_days: parseInt(xml('CREDITDAYS', v) || xml('CREDITPERIOD', v)) || 0,
              transport_details: xml('TRANSPORTDETAILS', v) || xml('VEHICLENO', v) || null,
              payment_terms: xml('CREDITPERIOD', v) || null,
            }];
          }

          // Multi-line voucher: one row per inventory entry
          return invBlocks.map(inv => {
            const itemName = xml('STOCKITEMNAME', inv) || narration || 'Grey Fabric';
            const qtyRaw = xml('BILLEDQTY', inv) || xml('ACTUALQTY', inv);
            const qty = safeNum(qtyRaw.split(' ')[0]) || 1;
            const rateRaw = xml('RATE', inv);
            const rate = safeNum(rateRaw.split('/')[0]);
            const amount = safeNum(xml('AMOUNT', inv));
            const finalRate = rate > 0 ? rate : (amount / qty);

            // Freight: look for a ledger allocation named freight/transport
            const ledgerBlocks = xmlAll('LEDGERENTRIES.LIST', v);
            const freightLedger = ledgerBlocks.find(l =>
              /freight|transport|lorry|carriage/i.test(xml('LEDGERNAME', l))
            );
            const freightAmt = freightLedger ? safeNum(xml('AMOUNT', freightLedger)) : 0;

            if (!party || finalRate === 0) return null;
            return {
              invoice_no: voucherNo,
              date,
              supplier_name: party,
              fabric_type: itemName,
              sku_id: itemName,
              quantity_mtrs: qty,
              price: parseFloat(finalRate.toFixed(2)),
              freight_amount: parseFloat(freightAmt.toFixed(2)),
              cash_discount: safeNum(xml('DISCOUNT', inv) || xml('DISCOUNT', v)),
              due_date: dueDate,
              broker_name: xml('BROKERNAME', v) || null,
              credit_days: parseInt(xml('CREDITDAYS', v) || xml('CREDITPERIOD', v)) || 0,
              transport_details: xml('TRANSPORTDETAILS', v) || xml('VEHICLENO', v) || null,
              payment_terms: xml('CREDITPERIOD', v) || null,
            };
          }).filter(Boolean);
        });

        if (rows.length > 0) {
          setSyncStatus(`Saving ${rows.length} purchase records…`);
          // Upsert on invoice_no to prevent duplicates
          const { error } = await supabase
            .from('purchase_fabric')
            .upsert(rows, { onConflict: 'invoice_no', ignoreDuplicates: false });
          if (error) saveError = error.message;
          else {
            recordCount = rows.length;
            // Update supplier last_purchase_rate
            const latestBySupplier = {};
            rows.forEach(r => { if (!latestBySupplier[r.supplier_name] || r.date > latestBySupplier[r.supplier_name].date) latestBySupplier[r.supplier_name] = r; });
            for (const [name, r] of Object.entries(latestBySupplier)) {
              await supabase.from('suppliers')
                .update({ last_purchase_rate: r.price })
                .eq('tally_ledger_name', name.toUpperCase());
            }
          }
        }
      }

      // ── 2. JOB BILLS → process_charges ──────────────────────────────────
      else if (type === 'job_bills') {
        const blocks = xmlAll('VOUCHER', text);
        setSyncStatus(`Parsing ${blocks.length} job bill vouchers…`);

        const rows = blocks.map(v => {
          const party = xml('PARTYLEDGERNAME', v) || '';
          const voucherNo = xml('VOUCHERNUMBER', v);
          const date = tallyDate(xml('DATE', v)) || new Date().toISOString().slice(0, 10);
          const narration = xml('NARRATION', v);
          const processType = resolveProcessType(party);

          // Parse ledger entries to extract job charge, TDS, premium
          const ledgerBlocks = xmlAll('LEDGERENTRIES.LIST', v);
          let jobCharge = 0, tdsAmt = 0, premiumCharge = 0, finishedMetres = 0;

          ledgerBlocks.forEach(l => {
            const lName = (xml('LEDGERNAME', l) || '').toUpperCase();
            const lAmt = safeNum(xml('AMOUNT', l));
            if (/TDS|TAX DEDUCTED/i.test(lName)) tdsAmt += lAmt;
            else if (/FOIL|PREMIUM|SURCHARGE/i.test(lName)) premiumCharge += lAmt;
            else if (lName === party.toUpperCase()) jobCharge = lAmt;
          });

          // Fallback: use total voucher amount as job charge
          if (jobCharge === 0) jobCharge = safeNum(xml('AMOUNT', v));

          // Finished metres: from inventory entries
          const invBlocks = xmlAll('ALLINVENTORYENTRIES.LIST', v).length
            ? xmlAll('ALLINVENTORYENTRIES.LIST', v)
            : xmlAll('INVENTORYENTRIES.LIST', v);
          if (invBlocks.length > 0) {
            const qtyRaw = xml('BILLEDQTY', invBlocks[0]) || xml('ACTUALQTY', invBlocks[0]);
            finishedMetres = safeNum(qtyRaw.split(' ')[0]);
          }

          // Calculate rate per metre if we have metres
          const jobChargePerMtr = finishedMetres > 0
            ? parseFloat((jobCharge / finishedMetres).toFixed(2))
            : parseFloat(jobCharge.toFixed(2));

          // Design number from narration or stock item name
          const designNo = invBlocks.length > 0
            ? xml('STOCKITEMNAME', invBlocks[0]) || narration || voucherNo
            : narration || voucherNo;

          if (!party) return null;
          return {
            invoice_no: voucherNo,
            date,
            jobwork_unit_name: party,
            process_type: processType,
            design_number: designNo,
            job_charge: jobChargePerMtr,
            finished_metres: finishedMetres,
            tds_amount: parseFloat(tdsAmt.toFixed(2)),
            premium_charges: parseFloat(premiumCharge.toFixed(2)),
            // shortage_pct left as 0 — will be calculated by landed_cost_per_batch VIEW
            // once linked_issue_challan is matched manually or via delivery note sync
            shortage_pct: 0,
          };
        }).filter(Boolean);

        if (rows.length > 0) {
          setSyncStatus(`Saving ${rows.length} job bill records…`);
          const { error } = await supabase
            .from('process_charges')
            .upsert(rows, { onConflict: 'invoice_no', ignoreDuplicates: false });
          if (error) saveError = error.message;
          else {
            recordCount = rows.length;
            // Update job_workers last_tally_rate
            const latestByWorker = {};
            rows.forEach(r => { if (!latestByWorker[r.jobwork_unit_name] || r.date > latestByWorker[r.jobwork_unit_name].date) latestByWorker[r.jobwork_unit_name] = r; });
            for (const [name, r] of Object.entries(latestByWorker)) {
              await supabase.from('job_workers')
                .update({ last_tally_rate: r.job_charge })
                .eq('tally_ledger_name', name.toUpperCase());
            }
          }
        }
      }

      // ── 3. DELIVERY NOTES → process_issues (Challan Tracker) ────────────
      else if (type === 'delivery_notes') {
        const blocks = xmlAll('VOUCHER', text);
        setSyncStatus(`Parsing ${blocks.length} delivery note challans…`);

        const rows = blocks.map(v => {
          const challanNo = xml('VOUCHERNUMBER', v);
          const date = tallyDate(xml('DATE', v)) || new Date().toISOString().slice(0, 10);
          const party = xml('PARTYLEDGERNAME', v) || '';
          const narration = xml('NARRATION', v);
          const processType = resolveProcessType(party);

          const invBlocks = xmlAll('ALLINVENTORYENTRIES.LIST', v).length
            ? xmlAll('ALLINVENTORYENTRIES.LIST', v)
            : xmlAll('INVENTORYENTRIES.LIST', v);

          let metresIssued = 0, fabricSku = narration || '';
          if (invBlocks.length > 0) {
            const qtyRaw = xml('BILLEDQTY', invBlocks[0]) || xml('ACTUALQTY', invBlocks[0]);
            metresIssued = safeNum(qtyRaw.split(' ')[0]);
            fabricSku = xml('STOCKITEMNAME', invBlocks[0]) || narration || '';
          }

          // Sum all inventory entries for total metres if multi-item
          if (invBlocks.length > 1) {
            metresIssued = invBlocks.reduce((sum, inv) => {
              const q = safeNum((xml('BILLEDQTY', inv) || xml('ACTUALQTY', inv)).split(' ')[0]);
              return sum + q;
            }, 0);
          }

          if (!challanNo || metresIssued === 0) return null;
          return {
            challan_no: challanNo,
            issue_date: date,
            worker_name: party,
            fabric_sku: fabricSku,
            metres_issued: metresIssued,
            process_type: processType,
            status: 'pending',
            lot_number: xml('ORDERNUMBER', v) || null,
            expected_return_date: tallyDate(xml('DISPATCHEDTHROUGH', v)) || null,
          };
        }).filter(Boolean);

        if (rows.length > 0) {
          setSyncStatus(`Saving ${rows.length} delivery note records…`);
          // Upsert on challan_no (UNIQUE constraint) to prevent duplicates
          const { error } = await supabase
            .from('process_issues')
            .upsert(rows, { onConflict: 'challan_no', ignoreDuplicates: false });
          if (error) saveError = error.message;
          else recordCount = rows.length;
        }
      }

      // ── 4. LEDGERS → customers + job_workers ────────────────────────────
      else if (type === 'ledgers') {
        const blocks = xmlAll('LEDGER', text);
        setSyncStatus(`Parsing ${blocks.length} ledgers…`);

        // Customers (Sundry Debtors)
        const customerRows = blocks
          .filter(v => ['Sundry Debtors', 'Customers'].includes(xml('PARENT', v)))
          .map(v => ({
            name: xml('NAME', v),
            company_name: xml('NAME', v),
            address: xml('ADDRESS', v) || null,
            gst_number: xml('GSTIN', v) || xml('GSTREGISTRATIONNUMBER', v) || null,
            city: xml('LEDGERCITY', v) || null,
            state: xml('LEDGERSTATE', v) || null,
            status: 'active',
          })).filter(r => r.name?.length > 1);

        if (customerRows.length > 0) {
          const { error } = await supabase.from('customers')
            .upsert(customerRows, { onConflict: 'name', ignoreDuplicates: true });
          if (error) saveError = error.message;
          else recordCount += customerRows.length;
        }

        // Job Workers / Suppliers (Sundry Creditors)
        // Only UPSERT tally_ledger_name — don't overwrite process_type set manually
        const creditorBlocks = blocks.filter(v =>
          ['Sundry Creditors', 'Processors', 'Job Workers'].includes(xml('PARENT', v))
        );

        for (const v of creditorBlocks) {
          const ledgerName = xml('NAME', v);
          if (!ledgerName || ledgerName.length < 2) continue;
          const upper = ledgerName.toUpperCase();

          // Check if already in job_workers
          const existing = jobWorkerMap[upper];
          if (!existing) {
            // New vendor — insert with process_type from map
            const pType = VENDOR_PROCESS_MAP[upper] || 'dyeing';
            await supabase.from('job_workers').upsert({
              worker_name: ledgerName,
              tally_ledger_name: upper,
              process_type: pType,
              status: 'active',
            }, { onConflict: 'worker_name', ignoreDuplicates: false });

            // Also upsert into suppliers for grey fabric vendors
            await supabase.from('suppliers').upsert({
              supplier_name: ledgerName,
              tally_ledger_name: upper,
              gst_number: xml('GSTIN', v) || xml('GSTREGISTRATIONNUMBER', v) || null,
              address: xml('ADDRESS', v) || null,
              status: 'active',
            }, { onConflict: 'supplier_name', ignoreDuplicates: false });
          }
          recordCount++;
        }
      }

      // ── 5. VOUCHERS → orders ─────────────────────────────────────────────
      else if (type === 'vouchers') {
        const blocks = xmlAll('VOUCHER', text);
        const rows = blocks.map(v => ({
          order_number: xml('VOUCHERNUMBER', v) || xml('GUID', v),
          customer_name: xml('PARTYLEDGERNAME', v),
          total_amount: safeNum(xml('AMOUNT', v)),
          final_amount: safeNum(xml('AMOUNT', v)),
          status: 'pending',
          tally_voucher_type: xml('VOUCHERTYPE', v),
          packing_cost: 0,
          transport_lr: xml('TRANSPORTDETAILS', v) || null,
          source: 'tally',
        })).filter(r => r.order_number && r.customer_name);

        if (rows.length > 0) {
          const { error } = await supabase.from('orders')
            .upsert(rows, { onConflict: 'order_number', ignoreDuplicates: false });
          if (error) saveError = error.message;
          else recordCount = rows.length;
        }
      }

      // ── 6. STOCK ITEMS → fabric_masters ─────────────────────────────────
      else if (type === 'stock') {
        const blocks = xmlAll('STOCKITEM', text);
        const rows = blocks.map(v => ({
          name: xml('NAME', v),
          type: 'Tally Stock',
          sku: xml('NAME', v).replace(/\s+/g, '-').toUpperCase().slice(0, 30),
          status: 'active',
        })).filter(r => r.name?.length > 1);

        if (rows.length > 0) {
          const { error } = await supabase.from('fabric_masters')
            .upsert(rows, { onConflict: 'sku', ignoreDuplicates: false });
          if (error) saveError = error.message;
          else recordCount = rows.length;
        }
      }

      // ── 7. OUTSTANDING ───────────────────────────────────────────────────
      else if (type === 'outstanding') {
        recordCount = (text.match(/<\/BILLFIXED>/g) || []).length
          || (text.match(/<\/BILL>/g) || []).length;
      }

      // Log result
      await supabase.from('tally_sync_log').insert([{
        sync_type: type,
        status: saveError ? 'partial' : 'success',
        records_synced: recordCount,
        error_message: saveError,
        raw_response: text.slice(0, 800),
      }]);
      await fetchSyncLog();
      setSyncStatus(saveError
        ? `⚠️ ${recordCount} records saved with errors: ${saveError}`
        : `✅ ${recordCount} records synced successfully`
      );

    } catch (e) {
      await supabase.from('tally_sync_log').insert([{
        sync_type: type, status: 'failed', error_message: e.message
      }]);
      await fetchSyncLog();
      setSyncStatus(`❌ Sync failed: ${e.message}`);
    }
    setLoading(false);
    setTimeout(() => setSyncStatus(''), 6000);
  }

  const TABS = [
    { id: 'status', label: 'Connection', icon: '🔌' },
    { id: 'sync', label: 'Data Sync', icon: '🔄' },
    { id: 'log', label: 'Sync Log', icon: '📋' },
    { id: 'guide', label: 'Setup Guide', icon: '📖' },
  ];

  const SYNC_CARDS = [
    { id: 'ledgers', label: 'Sync Ledgers', icon: '📒', desc: 'Import customers, vendors, job workers from Tally ledgers', color: 'blue' },
    { id: 'purchases', label: 'Sync Purchases', icon: '🛒', desc: 'Grey fabric purchase bills → purchase_fabric (with freight, broker, credit days)', color: 'indigo' },
    { id: 'delivery_notes', label: 'Sync Delivery Notes', icon: '📤', desc: 'Issue challans → process_issues (metres issued per vendor batch)', color: 'yellow' },
    { id: 'job_bills', label: 'Sync Job Bills', icon: '🏭', desc: 'Processor job bills → process_charges (finished metres, TDS, premium charge