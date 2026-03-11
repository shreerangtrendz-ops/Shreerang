import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  FinishFabricService,
  buildFinishFabricName,
  buildFinishFabricSKU,
  PROCESS_PATHS,
  FINISH_WIDTHS,
  FABRIC_TAGS,
  TALLY_GROUPS,
} from '@/services/FinishFabricService';

const C = {
  teal: '#2BA898', tealDark: '#0B2E2B', gold: '#D4920A',
  surface: '#fff', surface2: '#EEF8F6', border: '#D6EEE9',
  text: '#0D2E2B', muted: '#4A7A74', error: '#D93A3A',
  green: '#1E9E5A', orange: '#C86020',
};

const BUNNY_ZONE = 'shreerang-s';
const BUNNY_HOST = 'https://storage.bunnycdn.com';
const CDN_URL    = 'https://shreerang.b-cdn.net';
const BUNNY_KEY  = import.meta.env.VITE_BUNNY_API_KEY || '';

async function uploadToBunny(file) {
  const ext  = file.name.split('.').pop();
  const path = `designs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const r = await fetch(`${BUNNY_HOST}/${BUNNY_ZONE}/${path}`, {
    method: 'PUT',
    headers: { AccessKey: BUNNY_KEY, 'Content-Type': file.type },
    body: file,
  });
  if (!r.ok) throw new Error('Bunny CDN upload failed: ' + r.status);
  return `${CDN_URL}/${path}`;
}

function useDebounce(value, delay = 350) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

export default function FinishFabricForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(id);

  const [nameSearch, setNameSearch]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [mode, setMode]                   = useState('search');
  const debouncedSearch = useDebounce(nameSearch, 400);

  const [bases, setBases]                 = useState([]);

  const [f, setF] = useState({
    baseFabricId: '', baseFabricName: '', shortCode: '',
    width: '', processPath: '', tag: 'Regular',
    colourConcept: '', fabricClass: 'Regular',
    hsnCode: '', gstRate: '', tallyGroup: 'Finish Fabrics',
    jobWorkerId: '', jobWorkerCost: '', shortage: '',
    notes: '', ecomVisible: false, status: 'active',
    imageUrl: '', confirmName: '',
  });

  const [tallySynced, setTallySynced]     = useState(false);
  const [saving, setSaving]               = useState(false);
  const [tallyResult, setTallyResult]     = useState(null);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [imgFile, setImgFile]             = useState(null);
  const [imgPreview, setImgPreview]       = useState('');
  const [uploading, setUploading]         = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (isEdit) {
      FinishFabricService.getById(id).then(rec => {
        setF({
          baseFabricId:  rec.base_fabric_id   || '',
          baseFabricName: rec.base_fabrics?.base_fabric_name || rec.fabric_name || '',
          shortCode:     rec.base_fabrics?.short_code || '',
          width:         rec.finish_width     || '',
          processPath:   rec.process_type     || rec.process_path || '',
          tag:           rec.tag              || 'Regular',
          colourConcept: rec.design_concept   || '',
          fabricClass:   rec.class            || 'Regular',
          hsnCode:       rec.hsn_code         || '',
          gstRate:       rec.gst_rate         || '',
          tallyGroup:    rec.tally_group      || 'Finish Fabrics',
          jobWorkerId:   rec.job_worker_id    || '',
          jobWorkerCost: rec.job_worker_cost  || '',
          shortage:      rec.shortage_percent || '',
          notes:         rec.notes            || '',
          ecomVisible:   rec.ecom_visible     || false,
          status:        rec.status           || 'active',
          imageUrl:      rec.design_image_url || '',
          confirmName:   rec.finish_fabric_name || '',
        });
        setImgPreview(rec.design_image_url || '');
        setTallySynced(rec.tally_synced || false);
        setMode('builder');
      }).catch(err => toast({ variant: 'destructive', title: 'Load error', description: err.message }));
    }
  }, [id, isEdit]);

  useEffect(() => {
    supabase
      .from('base_fabrics')
      .select('id, base_fabric_name, fabric_name, short_code, sku, hsn_code, gst_rate')
      .eq('status', 'active')
      .order('base_fabric_name')
      .then(({ data }) => setBases(data || []));
  }, []);

  const liveName = buildFinishFabricName(f);
  const liveSKU  = buildFinishFabricSKU(f);

  useEffect(() => {
    if (!isEdit) setF(p => ({ ...p, confirmName: liveName }));
  }, [liveName]);

  useEffect(() => {
    if (!debouncedSearch || mode !== 'search') return;
    setSearching(true);
    FinishFabricService.searchByName(debouncedSearch)
      .then(setSearchResults).catch(console.error)
      .finally(() => setSearching(false));
  }, [debouncedSearch, mode]);

  const up = (field, val) => setF(p => ({ ...p, [field]: val }));

  const handleBaseSelect = (bId) => {
    const b = bases.find(x => x.id === bId);
    if (!b) return;
    setF(p => ({
      ...p,
      baseFabricId:   b.id,
      baseFabricName: b.base_fabric_name || b.fabric_name || '',
      shortCode:      b.short_code || b.sku || '',
      hsnCode:        p.hsnCode || b.hsn_code || '',
      gstRate:        p.gstRate || b.gst_rate || '',
    }));
  };

  const handleImgPick = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
  };

  const handleImgUpload = async () => {
    if (!imgFile) return;
    setUploading(true);
    try {
      const url = await uploadToBunny(imgFile);
      up('imageUrl', url);
      toast({ title: 'Image uploaded' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Upload failed', description: e.message });
    } finally { setUploading(false); }
  };

  const handleSave = async (skipTally = false) => {
    if (!f.confirmName.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Confirm the finish fabric name before saving.' });
      return;
    }
    setSaving(true);
    try {
      let imageUrl = f.imageUrl;
      if (imgFile && !imageUrl) { imageUrl = await uploadToBunny(imgFile); up('imageUrl', imageUrl); }
      const fields = { ...f, imageUrl };
      let result;
      if (isEdit) {
        result = await FinishFabricService.updateWithTallyPush(id, fields, { skipTally });
      } else {
        result = await FinishFabricService.createWithTallyPush(fields, { skipTally });
      }
      const { tallyResult: tr } = result;
      setTallyResult(tr);
      if (tr.success) {
        setTallySynced(true);
        toast({ title: isEdit ? 'Updated + Tally synced' : 'Created + Tally synced', description: `"${f.confirmName}" is now in Tally.` });
      } else if (skipTally) {
        toast({ title: 'Saved', description: 'Tally sync skipped.' });
      } else {
        toast({ variant: 'destructive', title: 'Saved to website, Tally push failed', description: tr.error || 'Ensure Tally is open and FRP is running.' });
      }
      setTimeout(() => navigate('/admin/fabric/finish'), 1200);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    } finally { setSaving(false); setShowConfirm(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.surface2, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: C.tealDark, color: '#fff', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, opacity: .6, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Finish Fabric</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{isEdit ? `Edit: ${f.confirmName || '...'}` : 'New Finish Fabric'}</div>
        </div>
        <button onClick={() => navigate('/admin/fabric/finish')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.3)', borderRadius: 8, color: '#fff', padding: '7px 18px', cursor: 'pointer', fontSize: 13 }}>Back to List</button>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 20px' }}>

        {!isEdit && (
          <Section title="Step 0 - Search or Create" accent={C.teal}>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Search for an existing finish fabric. If not found, click Create New.</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input style={{ ...inputStyle, flex: 1 }} placeholder="Search finish fabric name..." value={nameSearch}
                onChange={e => { setNameSearch(e.target.value); setMode('search'); }} />
              <Btn onClick={() => setMode('builder')} color={C.teal}>+ Create New</Btn>
            </div>
            {mode === 'search' && nameSearch && (
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, overflow: 'hidden' }}>
                {searching && <div style={{ padding: 10, color: C.muted, fontSize: 13 }}>Searching...</div>}
                {!searching && searchResults.length === 0 && nameSearch.length > 1 && (
                  <div style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>
                    No match.{' '}
                    <span style={{ color: C.teal, cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => { setF(p => ({ ...p, confirmName: nameSearch })); setMode('builder'); }}>
                      Create "{nameSearch}"
                    </span>
                  </div>
                )}
                {searchResults.map(r => (
                  <div key={r.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/fabric/finish/${r.id}/edit`)}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.finish_fabric_name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{r.process_type} - {r.base_fabrics?.base_fabric_name || 'No base'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {r.tally_synced
                        ? <Badge color={C.green}>Tally OK</Badge>
                        : <Badge color={C.orange}>Not in Tally</Badge>}
                      <Badge color={C.teal}>Edit</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {(mode === 'builder' || isEdit) && (
          <>
            <Section title="Step 1 - Base Fabric (Optional)" accent={C.teal}>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Map to a base/grey fabric. Skip and map later if needed.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Base Fabric">
                  <select style={selectStyle} value={f.baseFabricId} onChange={e => handleBaseSelect(e.target.value)}>
                    <option value="">None / Skip for now</option>
                    {bases.map(b => (
                      <option key={b.id} value={b.id}>{b.base_fabric_name || b.fabric_name} {b.sku ? `(${b.sku})` : ''}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Short Code">
                  <input style={{ ...inputStyle, background: C.surface2 }} value={f.shortCode} readOnly />
                </Field>
              </div>
              {!f.baseFabricId && (
                <Field label="Or type base fabric name manually">
                  <input style={inputStyle} placeholder="e.g. Cotton Camric" value={f.baseFabricName}
                    onChange={e => up('baseFabricName', e.target.value)} />
                </Field>
              )}
            </Section>

            <Section title="Step 2 - Process Path" accent={C.teal}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {PROCESS_PATHS.map(p => (
                  <PathCard key={p.value} p={p} selected={f.processPath === p.value} onClick={() => up('processPath', p.value)} />
                ))}
              </div>
            </Section>

            <Section title="Step 3 - Fabric Details" accent={C.teal}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                <Field label="Finish Width">
                  <select style={selectStyle} value={f.width} onChange={e => up('width', e.target.value)}>
                    <option value="">Select</option>
                    {FINISH_WIDTHS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </Field>
                <Field label="Quality Tag">
                  <select style={selectStyle} value={f.tag} onChange={e => up('tag', e.target.value)}>
                    {FABRIC_TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Colour / Concept">
                  <input style={inputStyle} placeholder="e.g. Blue Floral" value={f.colourConcept}
                    onChange={e => up('colourConcept', e.target.value)} />
                </Field>
                <Field label="HSN Code">
                  <input style={inputStyle} placeholder="5208" value={f.hsnCode}
                    onChange={e => up('hsnCode', e.target.value)} />
                </Field>
                <Field label="GST Rate (%)">
                  <input style={inputStyle} type="number" placeholder="5" value={f.gstRate}
                    onChange={e => up('gstRate', e.target.value)} />
                </Field>
                <Field label="Tally Stock Group">
                  <select style={selectStyle} value={f.tallyGroup} onChange={e => up('tallyGroup', e.target.value)}>
                    {TALLY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Shortage (%)">
                  <input style={inputStyle} type="number" placeholder="5" value={f.shortage}
                    onChange={e => up('shortage', e.target.value)} />
                </Field>
                <Field label="Job Worker Cost">
                  <input style={inputStyle} type="number" placeholder="12" value={f.jobWorkerCost}
                    onChange={e => up('jobWorkerCost', e.target.value)} />
                </Field>
                <Field label="Status">
                  <select style={selectStyle} value={f.status} onChange={e => up('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </Field>
              </div>
              <Field label="Notes">
                <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={f.notes}
                  onChange={e => up('notes', e.target.value)} />
              </Field>
            </Section>

            <Section title="Step 4 - Design Image (optional)" accent={C.gold}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                {imgPreview && <img src={imgPreview} alt="preview" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: `2px solid ${C.border}` }} />}
                <div style={{ flex: 1 }}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImgPick} />
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Btn onClick={() => fileRef.current?.click()} color={C.muted}>Pick Image</Btn>
                    {imgFile && !f.imageUrl && (
                      <Btn onClick={handleImgUpload} color={C.teal} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Upload to CDN'}
                      </Btn>
                    )}
                  </div>
                  {f.imageUrl && <div style={{ fontSize: 12, color: C.green, marginTop: 8 }}>Uploaded: {f.imageUrl.split('/').pop()}</div>}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13 }}>
                    <input type="checkbox" checked={f.ecomVisible} onChange={e => up('ecomVisible', e.target.checked)} />
                    Show on ecommerce catalogue
                  </label>
                </div>
              </div>
            </Section>

            <Section title="Step 5 - Confirm Name and Push to Tally" accent={tallySynced ? C.green : C.orange}>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>This exact name will be the stock item name in Tally Prime. Edit if needed.</p>
              <div style={{ background: C.tealDark, borderRadius: 10, padding: '14px 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 4, textTransform: 'uppercase' }}>Live Name Preview</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{liveName || '—'}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>SKU: {liveSKU || '—'}</div>
              </div>
              <Field label="Confirm / Edit Item Name (sent to Tally exactly as written)">
                <input style={{ ...inputStyle, fontWeight: 700, fontSize: 15 }} value={f.confirmName}
                  onChange={e => up('confirmName', e.target.value)} placeholder="Edit if needed..." />
              </Field>
              {tallySynced && (
                <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 8, padding: '10px 16px', color: C.green, fontSize: 13, marginTop: 8 }}>
                  Already synced to Tally as "{f.confirmName}"
                </div>
              )}
              {tallyResult && !tallyResult.success && !tallyResult.skipped && (
                <div style={{ background: '#fdecea', border: '1px solid #f5c6cb', borderRadius: 8, padding: '10px 16px', color: C.error, fontSize: 13, marginTop: 8 }}>
                  Last Tally push failed: {tallyResult.error}
                </div>
              )}
            </Section>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', marginTop: 24, flexWrap: 'wrap' }}>
              <Btn onClick={() => navigate('/admin/fabric/finish')} color={C.muted}>Cancel</Btn>
              <Btn onClick={() => handleSave(true)} color={C.muted} disabled={saving}>Save Only (skip Tally)</Btn>
              <Btn onClick={() => setShowConfirm(true)} color={C.teal} disabled={saving}>
                {saving ? 'Saving...' : (isEdit ? 'Update + Push to Tally' : 'Create + Push to Tally')}
              </Btn>
            </div>

            {showConfirm && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: C.surface, borderRadius: 14, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Confirm Tally Push</div>
                  <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>This will create the following stock item in Tally Prime:</p>
                  <div style={{ background: C.surface2, borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{f.confirmName}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Group: {f.tallyGroup} | Unit: Mtr{f.hsnCode ? ` | HSN: ${f.hsnCode}` : ''}</div>
                  </div>
                  <p style={{ fontSize: 12, color: C.orange, marginBottom: 20 }}>Once in Tally, renaming requires manual correction inside Tally.</p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Btn onClick={() => setShowConfirm(false)} color={C.muted}>Cancel</Btn>
                    <Btn onClick={() => handleSave(false)} color={C.teal} disabled={saving}>
                      {saving ? 'Pushing...' : 'Confirm & Push'}
                    </Btn>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, accent = C.teal, children }) {
  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, borderTop: `4px solid ${accent}`, padding: '20px 24px', marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: accent, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: C.muted, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function Badge({ color, children }) {
  return <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 10, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>{children}</span>;
}

function Btn({ onClick, color, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: disabled ? '#ccc' : color, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .7 : 1 }}>
      {children}
    </button>
  );
}

function PathCard({ p, selected, onClick }) {
  return (
    <div onClick={onClick} style={{ border: `2px solid ${selected ? C.teal : C.border}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', background: selected ? C.surface2 : C.surface, transition: 'all .15s' }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: selected ? C.teal : C.text }}>{p.label}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Code: {p.code}</div>
    </div>
  );
}

const inputStyle = { width: '100%', border: `1px solid #D6EEE9`, borderRadius: 7, padding: '8px 12px', fontSize: 13, outline: 'none', background: '#fff', color: C.text, boxSizing: 'border-box' };
const selectStyle = { ...inputStyle, appearance: 'none', cursor: 'pointer' };
