import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  FinishFabricService, buildFinishFabricName, buildFinishFabricSKU,
  PROCESS_STEPS, FINISH_WIDTHS, FABRIC_TAGS, TALLY_GROUPS,
} from '@/services/FinishFabricService';
import { VA_CODES, CONCEPT_CODES, PLACEMENT_CODES, THREAD_OPTIONS } from '@/lib/fabricMasterReferences';

// ─── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  teal: '#2BA898', tealDark: '#0B2E2B', tealLight: '#EEF8F6',
  gold: '#D4920A', surface: '#fff', surface2: '#F8FBFA',
  border: '#D6EEE9', text: '#0D2E2B', muted: '#4A7A74',
  error: '#D93A3A', green: '#1E9E5A', orange: '#C86020',
  blue: '#2563EB', purple: '#7C3AED', schiffli: '#8b5cf6',
};

// ─── Fabric Categories (Fancy merged in) ───────────────────────────────────
const FABRIC_CATEGORIES = [
  { value: 'mill_print',  label: 'Mill Print',        color: '#f59e0b', icon: '🖨️' },
  { value: 'digital',     label: 'Digital Print',     color: '#06b6d4', icon: '💻' },
  { value: 'embroidery',  label: 'Embroidery',        color: '#ec4899', icon: '🪡' },
  { value: 'schiffli',    label: 'Schiffli / Hakoba', color: '#8b5cf6', icon: '🕸️' },
  { value: 'solid_dyed',  label: 'Solid Dyed',        color: '#10b981', icon: '🎨' },
  { value: 'fancy',       label: 'Fancy Finish',      color: '#f97316', icon: '✨' },
];

const BUNNY_KEY  = import.meta.env.VITE_BUNNY_API_KEY || '';
const CDN_URL    = 'https://shreerang.b-cdn.net';
const BUNNY_ZONE = 'shreerang-s';

// ─── Upload to Bunny CDN ────────────────────────────────────────────────────
async function uploadToBunny(file) {
  const ext  = file.name.split('.').pop();
  const path = `designs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const r = await fetch(`https://storage.bunnycdn.com/${BUNNY_ZONE}/${path}`, {
    method: 'PUT',
    headers: { AccessKey: BUNNY_KEY, 'Content-Type': file.type },
    body: file,
  });
  if (!r.ok) throw new Error('Bunny upload failed');
  return `${CDN_URL}/${path}`;
}

function useDebounce(v, d = 350) {
  const [dv, setDv] = useState(v);
  useEffect(() => { const t = setTimeout(() => setDv(v), d); return () => clearTimeout(t); }, [v, d]);
  return dv;
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5, display: 'block' };
const inputStyle = { width: '100%', padding: '8px 11px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', background: '#fff' };

// ─── Process Path Builder ───────────────────────────────────────────────────
function ProcessPathBuilder({ value = [], onChange }) {
  const [dragging, setDragging] = useState(null);
  const add    = (step) => onChange([...value, { ...step, _uid: `${step.id}_${Date.now()}` }]);
  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));
  const move   = (from, to) => {
    const a = [...value]; const [item] = a.splice(from, 1); a.splice(to, 0, item); onChange(a);
  };
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Click to add process steps — same step can appear multiple times for multi-pass
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {PROCESS_STEPS.map(step => (
          <button key={step.id} type="button" onClick={() => add(step)}
            style={{ padding: '5px 14px', borderRadius: 20, border: `2px solid ${step.color}`,
              background: `${step.color}22`, color: step.color, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            + {step.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Process Sequence — Drag to reorder · Serial order drives cost calculation
      </div>
      {value.length === 0 ? (
        <div style={{ padding: 14, textAlign: 'center', color: C.muted, background: C.surface2, borderRadius: 8, border: `2px dashed ${C.border}`, fontSize: 13 }}>
          Click steps above to define the fabric's process journey
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          {value.map((step, idx) => (
            <div key={step._uid || step.id + idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div draggable
                onDragStart={() => setDragging(idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => { if (dragging !== null && dragging !== idx) move(dragging, idx); setDragging(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20,
                  background: step.color || C.teal, color: '#fff', fontWeight: 600, fontSize: 12,
                  cursor: 'grab', userSelect: 'none', opacity: dragging === idx ? 0.6 : 1 }}>
                <span style={{ fontSize: 10, opacity: 0.8, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '0 5px' }}>{idx + 1}</span>
                {step.label}
                <span onClick={() => remove(idx)}
                  style={{ marginLeft: 2, cursor: 'pointer', fontWeight: 800, fontSize: 14, opacity: 0.8 }}>×</span>
              </div>
              {idx < value.length - 1 && <span style={{ color: C.muted, fontSize: 16 }}>→</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Per-Process Cost Table ─────────────────────────────────────────────────
// Supports: rate, qty_basis (input/output), shortage, notes per step
// For Schiffli steps, shortage is calculated differently (shown in hint)
function ProcessCostTable({ steps = [], costs = {}, onChange, isSchiffli }) {
  const update = (key, field, val) => onChange({ ...costs, [key]: { ...(costs[key] || {}), [field]: val } });
  if (steps.length === 0) return (
    <div style={{ fontSize: 13, color: C.muted, padding: '10px 0', fontStyle: 'italic' }}>
      Add process steps above to configure cost per step.
    </div>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.surface2 }}>
            {['Step', 'Rate (₹/m)', 'Qty Basis', 'Shortage %', 'Notes'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Qty Basis' ? 'center' : 'left', fontWeight: 700, color: C.muted }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {steps.map((step, idx) => {
            const key = step._uid || step.id + idx;
            const c   = costs[key] || {};
            const isSchiffliStep = step.id === 'schiffli';
            return (
              <tr key={key} style={{ borderBottom: `1px solid ${C.border}`, background: isSchiffliStep ? '#f5f3ff' : 'transparent' }}>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 12, background: `${step.color}22`, color: step.color, fontWeight: 600 }}>
                    {idx + 1}. {step.label}
                  </span>
                  {isSchiffliStep && <span style={{ fontSize: 10, color: C.schiffli, marginLeft: 6 }}>🕸️ Special calc</span>}
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <input type="number" step="0.01" min="0" value={c.rate || ''}
                    onChange={e => update(key, 'rate', e.target.value)} placeholder="0.00"
                    style={{ width: 90, padding: '5px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12 }} />
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {['input', 'output'].map(basis => (
                      <label key={basis} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                        <input type="radio" name={`qty_basis_${key}`} value={basis}
                          checked={(c.qty_basis || 'input') === basis}
                          onChange={() => update(key, 'qty_basis', basis)} />
                        {basis.charAt(0).toUpperCase() + basis.slice(1)}
                      </label>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <input type="number" step="0.01" min="0" max="100" value={c.shortage || ''}
                    onChange={e => update(key, 'shortage', e.target.value)} placeholder="0"
                    style={{ width: 70, padding: '5px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12 }} />
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <input value={c.notes || ''} onChange={e => update(key, 'notes', e.target.value)}
                    placeholder={isSchiffliStep ? 'e.g. 100 × 100 thread count…' : 'Optional…'}
                    style={{ width: '100%', padding: '5px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12 }} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 8, fontSize: 11, color: C.muted, background: '#f0fdf4', padding: '6px 12px', borderRadius: 6 }}>
        💡 <strong>Input Qty</strong> = cost on fabric going into this step. <strong>Output Qty</strong> = cost on fabric coming out.
        Shortage cascades step-by-step.{isSchiffli && ' For Schiffli, cost is calculated on thread count × width — enter notes above.'}
        Design Number is entered at voucher time to calculate all process costs at once.
      </div>
    </div>
  );
}

// ─── Schiffli Special Section ───────────────────────────────────────────────
function SchiffliSection({ f, up }) {
  return (
    <div style={{ padding: 20, background: '#f5f3ff', borderRadius: 10, border: '1.5px solid #c4b5fd' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#5b21b6', marginBottom: 14 }}>🕸️ Schiffli / Hakoba Details</div>
      <div style={{ fontSize: 12, color: '#7c3aed', marginBottom: 14, background: '#ede9fe', padding: '8px 12px', borderRadius: 8 }}>
        Schiffli cost is calculated based on thread count × width at Design Number entry time. Configure rate per step in the cost table above.
        Shortage for Schiffli depends on the process path serial (sequence) chosen — the path order above determines the sequence.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Thread Count (horizontal)</label>
          <input style={inputStyle} type="number" min="0" value={f.schiffliThreadH || ''} onChange={e => up('schiffliThreadH', e.target.value)} placeholder="e.g. 100" />
        </div>
        <div>
          <label style={labelStyle}>Thread Count (vertical)</label>
          <input style={inputStyle} type="number" min="0" value={f.schiffliThreadV || ''} onChange={e => up('schiffliThreadV', e.target.value)} placeholder="e.g. 100" />
        </div>
        <div>
          <label style={labelStyle}>Schiffli Machine Width</label>
          <input style={inputStyle} value={f.schiffliWidth || ''} onChange={e => up('schiffliWidth', e.target.value)} placeholder='e.g. 44"' />
        </div>
        <div>
          <label style={labelStyle}>Job Worker</label>
          <input style={inputStyle} value={f.schiffliJobWorker || ''} onChange={e => up('schiffliJobWorker', e.target.value)} placeholder="Job worker name" />
        </div>
        <div>
          <label style={labelStyle}>Rate per Thread × Width</label>
          <input style={inputStyle} type="number" step="0.01" value={f.schiffliRate || ''} onChange={e => up('schiffliRate', e.target.value)} placeholder="₹ rate" />
        </div>
        <div>
          <label style={labelStyle}>Shortage %</label>
          <input style={inputStyle} type="number" step="0.01" max="100" value={f.schiffliShortage || ''} onChange={e => up('schiffliShortage', e.target.value)} placeholder="e.g. 5" />
        </div>
      </div>
    </div>
  );
}

// ─── Fancy Finish Extra Fields ──────────────────────────────────────────────
function FancyFinishSection({ f, up }) {
  const availableThreads = f.vaType ? (THREAD_OPTIONS[f.vaType] || []) : [];
  return (
    <div style={{ padding: 20, background: '#fff7ed', borderRadius: 10, border: '1.5px solid #fed7aa' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#c2410c', marginBottom: 14 }}>✨ Fancy Finish — Value Addition Details</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Value Addition Type</label>
          <select style={inputStyle} value={f.vaType || ''} onChange={e => up('vaType', e.target.value)}>
            <option value="">— Select VA Type —</option>
            {Object.keys(VA_CODES).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Thread Type {availableThreads.length > 0 && <span style={{ color: C.orange, fontSize: 10 }}>(Cotton = +₹5)</span>}</label>
          <select style={inputStyle} value={f.threadType || ''} onChange={e => up('threadType', e.target.value)}>
            <option value="">— Select Thread —</option>
            {availableThreads.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Concept</label>
          <select style={inputStyle} value={f.concept || ''} onChange={e => up('concept', e.target.value)}>
            <option value="">— Select Concept —</option>
            {Object.keys(CONCEPT_CODES).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Placement</label>
          <select style={inputStyle} value={f.placement || ''} onChange={e => up('placement', e.target.value)}>
            <option value="">— Select Placement —</option>
            {Object.keys(PLACEMENT_CODES).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Job Work Unit</label>
          <input style={inputStyle} value={f.jobWorkUnit || ''} onChange={e => up('jobWorkUnit', e.target.value)} placeholder="e.g. per metre, per piece" />
        </div>
        <div>
          <label style={labelStyle}>Design No.</label>
          <input style={inputStyle} value={f.designNo || ''} onChange={e => up('designNo', e.target.value)} placeholder="D-1234" />
        </div>
      </div>
    </div>
  );
}

// ─── Section Wrapper ────────────────────────────────────────────────────────
function Section({ title, icon, children, accent }) {
  return (
    <div style={{ marginBottom: 20, padding: 20, background: C.surface2, borderRadius: 12, border: `1px solid ${C.border}`, borderLeft: accent ? `4px solid ${accent}` : undefined }}>
      {title && <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>{icon && <span>{icon}</span>} {title}</div>}
      {children}
    </div>
  );
}

// ─── Tally Badge ────────────────────────────────────────────────────────────
function TallyBadge({ status, onCheck }) {
  const map = {
    online:   { bg: '#f0fdf4', border: '#86efac', color: '#166534', dot: '#10b981', label: 'Tally Online'  },
    offline:  { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', dot: '#ef4444', label: 'Tally Offline' },
    checking: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', dot: '#f59e0b', label: 'Checking…'     },
    unknown:  { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', dot: '#94a3b8', label: 'Tally: Unknown'},
  };
  const s = map[status] || map.unknown;
  return (
    <div onClick={onCheck} title="Click to recheck"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20,
        background: s.bg, border: `1.5px solid ${s.border}`, color: s.color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </div>
  );
}

// ─── Build Tally XML for Stock Item ────────────────────────────────────────
function buildTallyXML({ itemName, tallyGroup, hsnCode, gstRate }) {
  const hsnBlock = hsnCode ? `
    <HSNDETAILS.LIST>
      <HSNCODE>${hsnCode}</HSNCODE>
      <TAXABILITY>Taxable</TAXABILITY>
      <STATEWISEDETAILS.LIST>
        <STATENAME>&#0;</STATENAME>
        <RATEDETAILS.LIST><GSTRATEDUTYHEAD>Central Tax</GSTRATEDUTYHEAD><GSTRATE>${(gstRate || 5) / 2}</GSTRATE></RATEDETAILS.LIST>
        <RATEDETAILS.LIST><GSTRATEDUTYHEAD>State Tax</GSTRATEDUTYHEAD><GSTRATE>${(gstRate || 5) / 2}</GSTRATE></RATEDETAILS.LIST>
      </STATEWISEDETAILS.LIST>
    </HSNDETAILS.LIST>` : '';
  return `<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY><IMPORTDATA>
    <REQUESTDESC>
      <REPORTNAME>All Masters</REPORTNAME>
      <STATICVARIABLES><SVCURRENTCOMPANY>Shreerang Trendz</SVCURRENTCOMPANY></STATICVARIABLES>
    </REQUESTDESC>
    <REQUESTDATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <STOCKITEM NAME="${itemName}" Action="Create" RESERVEDNAME="">
          <n>${itemName}</n>
          <PARENT>${tallyGroup || 'Finish Fabrics'}</PARENT>
          <BASEUNITS>Mtr</BASEUNITS>
          <GSTAPPLICABLE>&#1;</GSTAPPLICABLE>
          <GSTTYPEOFSUPPLY>Goods</GSTTYPEOFSUPPLY>${hsnBlock}
        </STOCKITEM>
      </TALLYMESSAGE>
    </REQUESTDATA>
  </IMPORTDATA></BODY>
</ENVELOPE>`;
}

// ─── MAIN FORM ──────────────────────────────────────────────────────────────
export default function FinishFabricForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(id);
  const fileRef = useRef(null);

  // UI state
  const [mode, setMode]               = useState('search');
  const [nameSearch, setNameSearch]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]     = useState(false);
  const debouncedSearch = useDebounce(nameSearch, 400);

  // Tally state
  const [tallyStatus, setTallyStatus] = useState('unknown');
  const [tallyItems, setTallyItems]   = useState([]);
  const [tallySynced, setTallySynced] = useState(false);
  const [tallyResult, setTallyResult] = useState(null);

  // Master data
  const [bases, setBases] = useState([]);

  // Empty form template
  const emptyForm = {
    baseFabricId: '', baseFabricName: '', shortCode: '',
    fabricCategory: 'mill_print', width: '44"', tag: 'Regular', fabricClass: 'Regular',
    confirmName: '', hsnCode: '5208', gstRate: '', tallyGroup: 'Finish Fabrics',
    processSteps: [], processCosts: {},
    lumpPrice: '', cutPackPrice: '',
    // Fancy fields
    vaType: '', threadType: '', concept: '', placement: '', jobWorkUnit: '',
    // Schiffli fields
    schiffliThreadH: '', schiffliThreadV: '', schiffliWidth: '', schiffliJobWorker: '', schiffliRate: '', schiffliShortage: '',
    // Common
    designNo: '', colourConcept: '', notes: '',
    ecomVisible: false, status: 'active', imageUrl: '',
    fabricCategory_old: '',
  };
  const [f, setF]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [imgFile, setImgFile]   = useState(null);
  const [imgPreview, setImgPreview] = useState('');
  const [uploading, setUploading]   = useState(false);

  const isFancy     = f.fabricCategory === 'fancy';
  const isSchiffli  = f.fabricCategory === 'schiffli';
  const isSolidDyed = f.fabricCategory === 'solid_dyed';

  // ── Load for edit ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    setMode('builder');
    FinishFabricService.getById(id).then(rec => {
      let parsedSteps = [], parsedCosts = {};
      try { parsedSteps = rec.process_steps ? JSON.parse(rec.process_steps) : []; } catch {}
      try { parsedCosts = rec.process_costs  ? JSON.parse(rec.process_costs)  : {}; } catch {}
      setF({
        baseFabricId:    rec.base_fabric_id || '',
        baseFabricName:  rec.base_fabrics?.base_fabric_name || rec.finish_fabric_name || '',
        shortCode:       rec.base_fabrics?.short_code || '',
        fabricCategory:  rec.fabric_category || 'mill_print',
        width:           rec.finish_width    || '44"',
        tag:             rec.tag             || 'Regular',
        fabricClass:     rec.class           || 'Regular',
        confirmName:     rec.finish_fabric_name || '',
        hsnCode:         rec.hsn_code        || '5208',
        gstRate:         rec.gst_rate        || '',
        tallyGroup:      rec.tally_group     || 'Finish Fabrics',
        processSteps:    parsedSteps,
        processCosts:    parsedCosts,
        lumpPrice:       rec.lump_price      || '',
        cutPackPrice:    rec.cut_pack_price  || '',
        vaType:          rec.va_type         || '',
        threadType:      rec.thread_type     || '',
        concept:         rec.concept         || '',
        placement:       rec.placement       || '',
        jobWorkUnit:     rec.job_work_unit   || '',
        schiffliThreadH: rec.schiffli_thread_h || '',
        schiffliThreadV: rec.schiffli_thread_v || '',
        schiffliWidth:   rec.schiffli_width  || '',
        schiffliJobWorker: rec.schiffli_job_worker || '',
        schiffliRate:    rec.schiffli_rate   || '',
        schiffliShortage: rec.schiffli_shortage || '',
        designNo:        rec.design_no       || '',
        colourConcept:   rec.design_concept  || '',
        notes:           rec.notes           || '',
        ecomVisible:     rec.ecom_visible    || false,
        status:          rec.status          || 'active',
        imageUrl:        rec.design_image_url || '',
      });
      setImgPreview(rec.design_image_url || '');
      setTallySynced(rec.tally_synced || false);
    }).catch(err => toast({ variant: 'destructive', title: 'Load error', description: err.message }));
  }, [id, isEdit]);

  // ── Load base fabrics ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('base_fabrics')
      .select('id,base_fabric_name,fabric_name,short_code,sku,hsn_code,gst_rate')
      .eq('status', 'active').order('base_fabric_name')
      .then(({ data }) => setBases(data || []));
  }, []);

  // ── Tally connectivity check ─────────────────────────────────────────────
  const checkTally = useCallback(async () => {
    setTallyStatus('checking');
    try {
      const r = await fetch('https://tally.shreerangtrendz.com', { method: 'GET', signal: AbortSignal.timeout(5000) });
      setTallyStatus(r.ok || r.status === 400 ? 'online' : 'offline');
    } catch { setTallyStatus('offline'); }
  }, []);
  useEffect(() => { checkTally(); }, [checkTally]);

  // ── Fetch Tally stock items for name matching ────────────────────────────
  const fetchTallyItems = useCallback(async () => {
    if (tallyStatus !== 'online') return;
    try {
      const res = await fetch('https://tally.shreerangtrendz.com', {
        method: 'POST', headers: { 'Content-Type': 'text/xml' },
        body: `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
          <BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Stock Items</REPORTNAME>
            <STATICVARIABLES><SVCURRENTCOMPANY>Shreerang Trendz</SVCURRENTCOMPANY></STATICVARIABLES>
          </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`,
      });
      const xml = await res.text();
      const matches = [...xml.matchAll(/<n>(.*?)<\/n>/gi)];
      setTallyItems(matches.map(m => m[1]).filter(Boolean));
    } catch { /* Tally offline */ }
  }, [tallyStatus]);
  useEffect(() => { fetchTallyItems(); }, [fetchTallyItems]);

  // ── Live Name + SKU auto-build ───────────────────────────────────────────
  const liveName = buildFinishFabricName({ ...f, processPath: '', processSteps: f.processSteps });
  const liveSKU  = buildFinishFabricSKU({ ...f, processPath: '', processSteps: f.processSteps });
  useEffect(() => { if (!isEdit) setF(p => ({ ...p, confirmName: liveName })); }, [liveName, isEdit]);

  // ── DB search for existing fabrics ───────────────────────────────────────
  useEffect(() => {
    if (!debouncedSearch || mode !== 'search') return;
    setSearching(true);
    FinishFabricService.searchByName(debouncedSearch)
      .then(setSearchResults).catch(console.error).finally(() => setSearching(false));
  }, [debouncedSearch, mode]);

  const up = (field, val) => setF(p => ({ ...p, [field]: val }));

  const handleBaseSelect = (bId) => {
    const b = bases.find(x => x.id === bId);
    if (!b) { setF(p => ({ ...p, baseFabricId: '', baseFabricName: '', shortCode: '' })); return; }
    setF(p => ({
      ...p, baseFabricId: b.id, baseFabricName: b.base_fabric_name || b.fabric_name || '',
      shortCode: b.short_code || b.sku || '',
      hsnCode: p.hsnCode || b.hsn_code || '5208',
      gstRate: p.gstRate || b.gst_rate || '',
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImgFile(file); setImgPreview(URL.createObjectURL(file));
  };

  // ── Save Handler ─────────────────────────────────────────────────────────
  const handleSave = async (skipTally = false) => {
    if (!f.confirmName.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Confirm the finish fabric name before saving.' });
      return;
    }
    setSaving(true);
    try {
      let imageUrl = f.imageUrl;
      if (imgFile) { setUploading(true); imageUrl = await uploadToBunny(imgFile); setUploading(false); }

      const dbRecord = {
        finish_fabric_name:  f.confirmName.trim(),
        fabric_category:     f.fabricCategory || 'mill_print',
        base_fabric_id:      f.baseFabricId   || null,
        process_steps:       f.processSteps?.length > 0 ? JSON.stringify(f.processSteps) : null,
        process_costs:       Object.keys(f.processCosts || {}).length > 0 ? JSON.stringify(f.processCosts) : null,
        process_path:        f.processSteps?.map(s => s.code || s.id).join('-') || null,
        class:               f.fabricClass    || 'Regular',
        tag:                 f.tag            || 'Regular',
        finish_width:        f.width          || null,
        design_concept:      f.colourConcept  || null,
        hsn_code:            f.hsnCode        || '5208',
        gst_rate:            f.gstRate        ? parseFloat(f.gstRate)       : null,
        tally_group:         f.tallyGroup     || 'Finish Fabrics',
        lump_price:          f.lumpPrice      ? parseFloat(f.lumpPrice)     : null,
        cut_pack_price:      f.cutPackPrice   ? parseFloat(f.cutPackPrice)  : null,
        // Fancy fields
        va_type:             f.vaType         || null,
        thread_type:         f.threadType     || null,
        concept:             f.concept        || null,
        placement:           f.placement      || null,
        job_work_unit:       f.jobWorkUnit    || null,
        // Schiffli fields
        schiffli_thread_h:   f.schiffliThreadH ? parseInt(f.schiffliThreadH) : null,
        schiffli_thread_v:   f.schiffliThreadV ? parseInt(f.schiffliThreadV) : null,
        schiffli_width:      f.schiffliWidth   || null,
        schiffli_job_worker: f.schiffliJobWorker || null,
        schiffli_rate:       f.schiffliRate    ? parseFloat(f.schiffliRate)  : null,
        schiffli_shortage:   f.schiffliShortage ? parseFloat(f.schiffliShortage) : null,
        // Common
        design_no:           f.designNo       || null,
        design_image_url:    imageUrl         || null,
        ecom_visible:        f.ecomVisible    || false,
        notes:               f.notes          || null,
        status:              f.status         || 'active',
        generated_sku:       liveSKU          || null,
        updated_at:          new Date().toISOString(),
      };

      let savedId = id;
      if (isEdit) {
        const { error } = await supabase.from('finish_fabrics').update(dbRecord).eq('id', id);
        if (error) throw error;
      } else {
        dbRecord.created_at   = new Date().toISOString();
        dbRecord.tally_synced = false;
        const { data, error } = await supabase.from('finish_fabrics').insert([dbRecord]).select('id').single();
        if (error) throw error;
        savedId = data.id;
      }

      // ── Push to Tally via API route ──────────────────────────────────────
      let tr = { success: false, skipped: skipTally };
      if (!skipTally) {
        try {
          const tallyRes = await fetch('/api/tally-push', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemName:   f.confirmName.trim(),
              tallyGroup: f.tallyGroup || 'Finish Fabrics',
              hsnCode:    f.hsnCode,
              gstRate:    f.gstRate ? parseFloat(f.gstRate) : 5,
              unit:       'Mtr',
            }),
          });
          const tallyData = await tallyRes.json();
          if (tallyData.success) {
            tr = { success: true };
            await supabase.from('finish_fabrics').update({
              tally_synced: true, tally_item_name: f.confirmName.trim(), tally_synced_at: new Date().toISOString(),
            }).eq('id', savedId);
            setTallySynced(true);
          } else {
            tr = { success: false, error: tallyData.tally_error || tallyData.error || 'Tally push failed' };
          }
        } catch (tallyErr) { tr = { success: false, error: tallyErr.message }; }
      }

      setTallyResult(tr);
      if (tr.success) {
        toast({ title: isEdit ? '✅ Updated + Tally synced' : '✅ Created + Tally synced', description: `"${f.confirmName}" is live in Tally.` });
      } else if (skipTally) {
        toast({ title: '✅ Saved', description: 'Record saved. Tally sync skipped.' });
      } else {
        toast({ variant: 'destructive', title: '✅ Website saved ⚠️ Tally failed', description: tr.error || 'Ensure Tally is open and FRP tunnel is running.' });
      }
      setTimeout(() => navigate('/admin/fabric/finish'), 1400);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    } finally { setSaving(false); }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: '#f4f9f8', minHeight: '100vh', color: C.text }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg,${C.tealDark} 0%,#1a4a44 100%)`, padding: '16px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 26 }}>🧵</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{isEdit ? 'Edit Finish Fabric' : 'New Finish Fabric'}</div>
            <div style={{ color: '#81c5bc', fontSize: 12, marginTop: 2 }}>Unified · Fancy + Schiffli + Regular · Multi-Process Path · Auto Tally Sync</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TallyBadge status={tallyStatus} onCheck={checkTally} />
          {tallySynced && <span style={{ fontSize: 12, color: '#86efac', fontWeight: 600 }}>✅ Tally Synced</span>}
          <button onClick={() => navigate('/admin/fabric/finish')}
            style={{ padding: '6px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            ← Back
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Search Mode ──────────────────────────────────────────────── */}
        {!isEdit && mode === 'search' && (
          <Section title="Search or Create Finish Fabric" icon="🔍" accent={C.teal}>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
              Search existing fabrics. Tally items auto-suggest when Tally is online.
              All categories — Mill Print, Digital, Embroidery, Schiffli, Solid Dyed, Fancy Finish — are in one place.
            </p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input style={{ ...inputStyle, flex: 1 }} autoFocus
                placeholder="Type fabric name (Rayon, Cotton, Silk, Hakoba…)"
                value={nameSearch} onChange={e => setNameSearch(e.target.value)} />
              <button onClick={() => setMode('builder')}
                style={{ padding: '8px 20px', borderRadius: 8, background: C.teal, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                + New Fabric
              </button>
            </div>

            {/* Tally name suggestions */}
            {tallyItems.length > 0 && nameSearch && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  🔗 Tally Stock Matches (click to pre-fill name)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tallyItems.filter(n => n.toLowerCase().includes(nameSearch.toLowerCase())).slice(0, 12).map(name => (
                    <button key={name} onClick={() => { setF(p => ({ ...p, confirmName: name })); setMode('builder'); }}
                      style={{ padding: '4px 12px', borderRadius: 16, background: '#eff6ff', color: '#1d4ed8', fontSize: 12, fontWeight: 600, border: '1px solid #bfdbfe', cursor: 'pointer' }}>
                      🔗 {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searching && <div style={{ color: C.muted, fontSize: 13 }}>Searching…</div>}
            {!searching && searchResults.length > 0 && searchResults.map(r => (
              <div key={r.id} onClick={() => navigate(`/admin/fabric/finish-fabric-form/${r.id}`)}
                style={{ padding: '10px 14px', borderRadius: 8, background: '#fff', border: `1px solid ${C.border}`, marginBottom: 6, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = C.tealLight}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.finish_fabric_name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{r.fabric_category} · {r.status}</div>
                </div>
                {r.tally_synced && <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>✅ Tally</span>}
              </div>
            ))}
            {!searching && nameSearch && searchResults.length === 0 && (
              <div style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>Not found. Click "+ New Fabric" to create.</div>
            )}
          </Section>
        )}

        {/* ── Builder Form ─────────────────────────────────────────────── */}
        {(isEdit || mode === 'builder') && (
          <>
            {/* 1. Category */}
            <Section title="Fabric Category" icon="🏷️" accent={C.teal}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                {FABRIC_CATEGORIES.map(cat => (
                  <button key={cat.value} type="button" onClick={() => up('fabricCategory', cat.value)}
                    style={{ padding: '8px 18px', borderRadius: 20, border: `2px solid ${cat.color}`,
                      background: f.fabricCategory === cat.value ? cat.color : `${cat.color}18`,
                      color: f.fabricCategory === cat.value ? '#fff' : cat.color,
                      fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
                {isFancy && '✨ Fancy Finish selected — Value Addition fields will appear below.'}
                {isSchiffli && '🕸️ Schiffli selected — thread count / special calculation fields appear below.'}
                {isSolidDyed && '🎨 Solid Dyed — use "Colour Number" instead of "Design Number".'}
              </div>
            </Section>

            {/* 2. Core Details */}
            <Section title="Core Details" icon="📋" accent={C.teal}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Base Fabric (optional — map anytime)</label>
                  <select style={inputStyle} value={f.baseFabricId} onChange={e => handleBaseSelect(e.target.value)}>
                    <option value="">— Select Base Fabric —</option>
                    {bases.map(b => <option key={b.id} value={b.id}>{b.base_fabric_name || b.fabric_name}</option>)}
                  </select>
                  {f.baseFabricName && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>🧵 {f.baseFabricName} · SKU prefix: {f.shortCode}</div>}
                </div>
                <div>
                  <label style={labelStyle}>Width</label>
                  <select style={inputStyle} value={f.width} onChange={e => up('width', e.target.value)}>
                    {['44"', '54"', '56"', '58"', '60"'].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Tag / Quality</label>
                  <select style={inputStyle} value={f.tag} onChange={e => up('tag', e.target.value)}>
                    <option value="Regular">Regular</option>
                    <option value="Discharge">Discharge</option>
                    <option value="Premium">Premium</option>
                    <option value="Premium Discharge">Premium Discharge</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Class</label>
                  <select style={inputStyle} value={f.fabricClass} onChange={e => up('fabricClass', e.target.value)}>
                    <option value="Regular">Regular</option>
                    <option value="Premium">Premium</option>
                    <option value="Khadi">Khadi</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Colour / Concept</label>
                  <input style={inputStyle} value={f.colourConcept} onChange={e => up('colourConcept', e.target.value)} placeholder="e.g. Floral, Stripe, Solid" />
                </div>
                <div>
                  <label style={labelStyle}>{isSolidDyed ? 'Colour Number' : 'Design Number'}</label>
                  <input style={inputStyle} value={f.designNo} onChange={e => up('designNo', e.target.value)} placeholder={isSolidDyed ? 'C-001' : 'D-1234'} />
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
                    Entered at Design Number / Voucher time for cost calculation across all process steps
                  </div>
                </div>
              </div>
            </Section>

            {/* 3. Process Path & Sequence */}
            <Section title="Process Path & Sequence" icon="⚙️" accent={C.blue}>
              <ProcessPathBuilder value={f.processSteps} onChange={steps => up('processSteps', steps)} />
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 11, color: '#1e40af' }}>
                💡 One fabric can pass through <strong>any number of paths</strong> in any sequence.
                The serial order above drives cost calculation. For Schiffli, cost depends on the sequence position.
              </div>
            </Section>

            {/* 4. Schiffli Special Section */}
            {isSchiffli && (
              <Section accent={C.schiffli}>
                <SchiffliSection f={f} up={up} />
              </Section>
            )}

            {/* 5. Fancy Finish Section */}
            {isFancy && (
              <Section accent={C.orange}>
                <FancyFinishSection f={f} up={up} />
              </Section>
            )}

            {/* 6. Cost Per Process Step */}
            <Section title="Cost Per Process Step" icon="💰" accent={C.gold}>
              <ProcessCostTable steps={f.processSteps} costs={f.processCosts} onChange={costs => up('processCosts', costs)} isSchiffli={isSchiffli} />
            </Section>

            {/* 7. Pricing */}
            <Section title="Pricing" icon="🪙" accent={C.gold}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Lump Price (₹/m) — 50m+ / colour / design</label>
                  <input type="number" step="0.01" min="0" style={inputStyle} value={f.lumpPrice} onChange={e => up('lumpPrice', e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label style={labelStyle}>Cut Pack Price (₹/m) — ~20m orders</label>
                  <input type="number" step="0.01" min="0" style={inputStyle} value={f.cutPackPrice} onChange={e => up('cutPackPrice', e.target.value)} placeholder="0.00" />
                </div>
              </div>
            </Section>

            {/* 8. Tally & Accounting */}
            <Section title="Tally & Accounting" icon="🔗" accent={C.teal}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Tally Group</label>
                  <select style={inputStyle} value={f.tallyGroup} onChange={e => up('tallyGroup', e.target.value)}>
                    {TALLY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>HSN Code</label>
                  <input style={inputStyle} value={f.hsnCode} onChange={e => up('hsnCode', e.target.value)} placeholder="5208" />
                </div>
                <div>
                  <label style={labelStyle}>GST Rate (%)</label>
                  <input type="number" step="0.01" min="0" style={inputStyle} value={f.gstRate} onChange={e => up('gstRate', e.target.value)} placeholder="5" />
                </div>
              </div>
            </Section>

            {/* 9. E-com & Notes */}
            <Section title="E-commerce & Notes" icon="🛒">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={f.status} onChange={e => up('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                  <input type="checkbox" id="ecomVisible" checked={f.ecomVisible} onChange={e => up('ecomVisible', e.target.checked)} />
                  <label htmlFor="ecomVisible" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Show on e-commerce store</label>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={f.notes} onChange={e => up('notes', e.target.value)} placeholder="Internal notes…" />
              </div>
              <div>
                <label style={labelStyle}>Design Image</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {imgPreview && <img src={imgPreview} alt="preview" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: `1.5px solid ${C.border}` }} />}
                  <button type="button" onClick={() => fileRef.current?.click()}
                    style={{ padding: '8px 16px', borderRadius: 8, background: C.surface2, border: `1.5px solid ${C.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {imgPreview ? '🔄 Change Image' : '📷 Upload Image'}
                  </button>
                  {imgPreview && (
                    <button type="button" onClick={() => { setImgFile(null); setImgPreview(''); up('imageUrl', ''); }}
                      style={{ padding: '6px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>
                      Remove
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                </div>
              </div>
            </Section>

            {/* 10. Live Name Preview + Confirm */}
            <Section title="Live Name Preview & Confirm" icon="👁️" accent={C.green}>
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16, marginBottom: 14, border: '1px solid #86efac' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Auto-Generated Name</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.tealDark, marginBottom: 6 }}>
                  {liveName || <span style={{ color: C.muted, fontWeight: 400 }}>Fill in details above…</span>}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  SKU: <span style={{ fontFamily: 'monospace', background: '#dcfce7', padding: '2px 8px', borderRadius: 4, color: C.green, fontWeight: 700 }}>{liveSKU || '—'}</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Confirm / Override Name * — exact name pushed to Tally</label>
                <input style={{ ...inputStyle, fontWeight: 700, fontSize: 14, borderColor: f.confirmName ? C.green : C.error }}
                  value={f.confirmName} onChange={e => up('confirmName', e.target.value)}
                  placeholder="Final fabric name as it should appear in Tally…" />
                {f.confirmName && tallyItems.some(n => n === f.confirmName) && (
                  <div style={{ marginTop: 6, fontSize: 12, color: C.blue, fontWeight: 600 }}>
                    ✅ Name already exists in Tally — saving will update / match the existing record.
                  </div>
                )}
              </div>
            </Section>

            {/* Tally status notice */}
            <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20,
              background: tallyStatus === 'online' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${tallyStatus === 'online' ? '#86efac' : '#fca5a5'}`,
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{tallyStatus === 'online' ? '✅' : '⚠️'}</span>
              <span style={{ color: tallyStatus === 'online' ? '#166534' : '#991b1b' }}>
                {tallyStatus === 'online'
                  ? 'Tally is ONLINE — item will be created / updated in Tally when you save.'
                  : 'Tally appears OFFLINE. Record saved to website. Sync to Tally later from the fabric list.'}
              </span>
            </div>

            {tallyResult && !tallyResult.skipped && (
              <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16,
                background: tallyResult.success ? '#f0fdf4' : '#fff7ed',
                border: `1px solid ${tallyResult.success ? '#86efac' : '#fed7aa'}`,
                color: tallyResult.success ? '#166534' : '#9a3412',
                fontSize: 13, fontWeight: 600 }}>
                {tallyResult.success ? `✅ Tally synced: "${f.confirmName}"` : `⚠️ Tally: ${tallyResult.error}`}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => handleSave(false)} disabled={saving || uploading}
                style={{ padding: '12px 32px', borderRadius: 10, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
                  background: saving || uploading ? '#94a3b8' : C.teal, color: '#fff', transition: 'all 0.15s' }}>
                {saving ? '⏳ Saving…' : uploading ? '📤 Uploading…' : isEdit ? '💾 Save & Sync Tally' : '✅ Create & Push to Tally'}
              </button>
              <button onClick={() => handleSave(true)} disabled={saving}
                style={{ padding: '12px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, border: `1.5px solid ${C.border}`, cursor: 'pointer', background: '#fff', color: C.muted }}>
                Save Only (Skip Tally)
              </button>
              <button onClick={() => mode === 'builder' && !isEdit ? setMode('search') : navigate('/admin/fabric/finish')}
                style={{ padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14, border: `1.5px solid ${C.border}`, cursor: 'pointer', background: '#fff', color: C.muted }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
