import { supabase } from '@/lib/customSupabaseClient';

// ── Individual process steps (ordered pipeline builder) ────────────────────
export const PROCESS_STEPS = [
  { id: 'grey',         label: 'Grey Fabric',      code: 'GY', color: '#94a3b8' },
  { id: 'scour',        label: 'Scouring / RFD',   code: 'RF', color: '#60a5fa' },
  { id: 'bleach',       label: 'Bleaching',         code: 'BL', color: '#e2e8f0' },
  { id: 'dye',          label: 'Solid Dyeing',      code: 'SD', color: '#a78bfa' },
  { id: 'print_mill',   label: 'Mill / Screen Print', code: 'MP', color: '#f59e0b' },
  { id: 'print_digital','label': 'Digital Print',  code: 'DP', color: '#06b6d4' },
  { id: 'embroidery',   label: 'Embroidery',        code: 'EM', color: '#ec4899' },
  { id: 'schiffli',     label: 'Schiffli',          code: 'SC', color: '#8b5cf6' },
  { id: 'discharge',    label: 'Discharge',         code: 'DC', color: '#ef4444' },
  { id: 'deca',         label: 'Deca / Bio-wash',   code: 'DB', color: '#14b8a6' },
  { id: 'fancy',        label: 'Fancy Finish',      code: 'FF', color: '#f97316' },
  { id: 'finishing',    label: 'Finishing',         code: 'FN', color: '#10b981' },
  { id: 'cut_pack',     label: 'Cut & Pack',        code: 'CP', color: '#64748b' },
];

// ── Legacy single-select PROCESS_PATHS (kept for backward compat) ──────────
export const PROCESS_PATHS = [
  { value: 'grey_only',            label: 'Grey Only',                   code: 'GY' },
  { value: 'rfd',                  label: 'RFD / Scour + Bleach',        code: 'RF' },
  { value: 'digital',              label: 'Digital Print',               code: 'DP' },
  { value: 'mill_print',           label: 'Mill / Screen Print',         code: 'MP' },
  { value: 'solid_dyed',           label: 'Solid Dyed',                  code: 'SD' },
  { value: 'dyed_schiffli',        label: 'Dyed + Schiffli Embroidery',  code: 'DS' },
  { value: 'schiffli_dyed',        label: 'Schiffli to Dyed/Print',      code: 'SE' },
  { value: 'schiffli_deca',        label: 'Schiffli to Deca/Bio-wash',   code: 'SB' },
  { value: 'schiffli_rfd_digital', label: 'Schiffli to RFD to Digital',  code: 'SR' },
  { value: 'fancy',                label: 'Fancy Finish',                code: 'FF' },
];

export const FINISH_WIDTHS = [
  { value: '44', label: '44"' }, { value: '54', label: '54"' },
  { value: '56', label: '56"' }, { value: '58', label: '58"' },
  { value: '60', label: '60"' },
];

export const FABRIC_TAGS = [
  { value: 'Regular',           label: 'Regular',           omit: true  },
  { value: 'Discharge',         label: 'Discharge',         omit: false },
  { value: 'Premium',           label: 'Premium',           omit: false },
  { value: 'Premium Discharge', label: 'Premium Discharge', omit: false },
];

// Merged Finish + Fancy Tally groups
export const TALLY_GROUPS = [
  'Finish Fabrics', 'Mill Print Fabrics', 'Digital Print Fabrics',
  'Embroidery Fabrics', 'Schiffli Fabrics', 'Solid Dyed Fabrics',
  'Fancy Finish Fabrics',
];

// ── Build process path summary string from step array ─────────────────────
export function processPathLabel(steps = []) {
  if (!steps || steps.length === 0) return '';
  return steps.map(s => {
    const found = PROCESS_STEPS.find(ps => ps.id === (s.id || s));
    return found ? found.code : s.id || s;
  }).join('-');
}

// ── Name auto-generator ────────────────────────────────────────────────────
export function buildFinishFabricName({ baseFabricName, width, processPath, processSteps, tag, colourConcept }) {
  // Use multi-step path code if available, else legacy single processPath
  let procLabel = '';
  if (processSteps && processSteps.length > 0) {
    procLabel = processPathLabel(processSteps);
  } else if (processPath) {
    const proc = PROCESS_PATHS.find(p => p.value === processPath);
    procLabel = proc && proc.value !== 'grey_only' ? proc.label : '';
  }
  const tagObj = FABRIC_TAGS.find(t => t.value === tag);
  const parts  = [
    width ? `${width}"` : '',
    baseFabricName || '',
    procLabel || '',
    tagObj && !tagObj.omit ? tagObj.value : '',
    colourConcept || '',
  ].filter(Boolean);
  return parts.join(' ').trim();
}

export function buildFinishFabricSKU({ shortCode, width, processPath, processSteps, tag }) {
  let procCode = '';
  if (processSteps && processSteps.length > 0) {
    procCode = processPathLabel(processSteps);
  } else {
    const proc = PROCESS_PATHS.find(p => p.value === processPath);
    procCode = proc ? proc.code : '';
  }
  const tagObj = FABRIC_TAGS.find(t => t.value === tag);
  const parts  = [
    width || '',
    shortCode || '',
    procCode || '',
    tagObj && !tagObj.omit ? tagObj.value.replace(/\s+/g, '').toUpperCase().slice(0, 3) : '',
  ].filter(Boolean);
  return parts.join('-').toUpperCase().trim();
}

export const FinishFabricService = {

  async getAll() {
    const { data, error } = await supabase
      .from('finish_fabrics')
      .select('*, base_fabrics(id, base_fabric_name, fabric_name, hsn_code, gst_rate, short_code, sku)')
      .not('status', 'eq', 'deleted')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async searchByName(query) {
    const { data, error } = await supabase
      .from('finish_fabrics')
      .select('id, finish_fabric_name, finish_fabric_sku, process_type, process_steps, class, status, tally_synced, base_fabric_id, base_fabrics(base_fabric_name)')
      .ilike('finish_fabric_name', `%${query}%`)
      .not('status', 'eq', 'deleted')
      .limit(20);
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('finish_fabrics')
      .select('*, base_fabrics(id, base_fabric_name, fabric_name, hsn_code, gst_rate, short_code, sku)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(record) {
    const { data, error } = await supabase
      .from('finish_fabrics')
      .insert([record])
      .select('*, base_fabrics(id, base_fabric_name, fabric_name, hsn_code, gst_rate)')
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('finish_fabrics')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markTallySynced(id, itemName) {
    return this.update(id, {
      tally_synced:    true,
      tally_item_name: itemName,
      tally_synced_at: new Date().toISOString(),
    });
  },

  async pushToTally({ itemName, tallyGroup, hsnCode, gstRate, company }) {
    const res = await fetch('/api/tally-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName, tallyGroup, hsnCode, gstRate, company }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Tally push failed');
    return data;
  },

  async createWithTallyPush(formFields, { skipTally = false } = {}) {
    const record = buildDbRecord(formFields);
    const saved  = await this.create(record);
    let tallyResult = { success: false, skipped: skipTally };
    if (!skipTally) {
      try {
        tallyResult = await this.pushToTally({
          itemName:   formFields.confirmName || record.finish_fabric_name,
          tallyGroup: formFields.tallyGroup  || 'Finish Fabrics',
          hsnCode:    formFields.hsnCode,
          gstRate:    formFields.gstRate,
          company:    formFields.tallyCompany,
        });
        if (tallyResult.success) {
          await this.markTallySynced(saved.id, formFields.confirmName || record.finish_fabric_name);
          saved.tally_synced = true;
        }
      } catch (tallyErr) {
        console.warn('[FinishFabricService] Tally push failed (DB record saved):', tallyErr.message);
        tallyResult = { success: false, error: tallyErr.message };
      }
    }
    return { saved, tallyResult };
  },

  async updateWithTallyPush(id, formFields, { skipTally = false } = {}) {
    const record = buildDbRecord(formFields);
    const saved  = await this.update(id, record);
    let tallyResult = { success: false, skipped: skipTally };
    if (!skipTally && formFields.confirmName) {
      try {
        tallyResult = await this.pushToTally({
          itemName:   formFields.confirmName,
          tallyGroup: formFields.tallyGroup || 'Finish Fabrics',
          hsnCode:    formFields.hsnCode,
          gstRate:    formFields.gstRate,
          company:    formFields.tallyCompany,
        });
        if (tallyResult.success) {
          await this.markTallySynced(id, formFields.confirmName);
          saved.tally_synced = true;
        }
      } catch (e) {
        console.warn('[FinishFabricService] Tally update push failed:', e.message);
        tallyResult = { success: false, error: e.message };
      }
    }
    return { saved, tallyResult };
  },
};

function buildDbRecord(f) {
  // Serialize multi-step process path
  const stepsJson = f.processSteps && f.processSteps.length > 0
    ? JSON.stringify(f.processSteps)
    : null;

  return {
    finish_fabric_name: f.confirmName    || '',
    base_fabric_id:     f.baseFabricId   || null,
    process_type:       f.processPath    || null,        // legacy single-select kept
    process_path:       f.processPath    || null,        // legacy alias
    process_steps:      stepsJson,                        // NEW: ordered multi-step JSON
    class:              f.fabricClass    || null,
    tag:                f.tag            || null,
    finish_width:       f.width          || null,
    design_concept:     f.colourConcept  || null,
    hsn_code:           f.hsnCode        || null,
    gst_rate:           f.gstRate        ? parseFloat(f.gstRate)       : null,
    job_worker_id:      f.jobWorkerId    || null,
    job_worker_cost:    f.jobWorkerCost  ? parseFloat(f.jobWorkerCost) : null,
    shortage_percent:   f.shortage       ? parseFloat(f.shortage)      : null,
    design_image_url:   f.imageUrl       || null,
    ecom_visible:       f.ecomVisible    || false,
    notes:              f.notes          || null,
    status:             f.status         || 'active',
    tally_synced:       false,
    tally_group:        f.tallyGroup     || 'Finish Fabrics',
    generated_name:     buildFinishFabricName(f),
    generated_sku:      buildFinishFabricSKU(f),
    updated_at:         new Date().toISOString(),
  };
}
