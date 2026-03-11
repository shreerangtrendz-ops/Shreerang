import { supabase } from '@/lib/customSupabaseClient';

// Process path labels (matches ShreerangEngine 9-path costing)
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

export const TALLY_GROUPS = [
  'Finish Fabrics', 'Mill Print Fabrics', 'Digital Print Fabrics',
  'Embroidery Fabrics', 'Schiffli Fabrics', 'Solid Dyed Fabrics',
];

// Name auto-generator
export function buildFinishFabricName({ baseFabricName, width, processPath, tag, colourConcept }) {
  const proc   = PROCESS_PATHS.find(p => p.value === processPath);
  const tagObj = FABRIC_TAGS.find(t => t.value === tag);
  const parts  = [
    width ? `${width}"` : '',
    baseFabricName || '',
    proc && proc.value !== 'grey_only' ? proc.label : '',
    tagObj && !tagObj.omit ? tagObj.value : '',
    colourConcept || '',
  ].filter(Boolean);
  return parts.join(' ').trim();
}

export function buildFinishFabricSKU({ shortCode, width, processPath, tag }) {
  const proc   = PROCESS_PATHS.find(p => p.value === processPath);
  const tagObj = FABRIC_TAGS.find(t => t.value === tag);
  const parts  = [
    width || '',
    shortCode || '',
    proc ? proc.code : '',
    tagObj && !tagObj.omit ? tagObj.value.replace(/\s+/g, '').toUpperCase().slice(0, 3) : '',
  ].filter(Boolean);
  return parts.join('-').toUpperCase().trim();
}

export const FinishFabricService = {

  async getAll() {
    const { data, error } = await supabase
      .from('finish_fabrics')
      .select('*, base_fabrics(id, base_fabric_name, fabric_name, hsn_code, gst_rate, short_code, sku)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async searchByName(query) {
    const { data, error } = await supabase
      .from('finish_fabrics')
      .select('id, finish_fabric_name, finish_fabric_sku, process_type, class, status, tally_synced, base_fabric_id, base_fabrics(base_fabric_name)')
      .ilike('finish_fabric_name', `%${query}%`)
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
  return {
    finish_fabric_name: f.confirmName    || '',
    base_fabric_id:     f.baseFabricId   || null,
    process_type:       f.processPath    || null,
    process_path:       f.processPath    || null,
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
    generated_sku:      buildFinishFabricSKU({ shortCode: f.shortCode, width: f.width, processPath: f.processPath, tag: f.tag }),
    updated_at:         new Date().toISOString(),
  };
}
