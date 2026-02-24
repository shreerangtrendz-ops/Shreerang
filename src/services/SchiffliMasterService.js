import { supabase } from '@/lib/customSupabaseClient';

export const SchiffliMasterService = {
  // Generate Fabric Name
  generateFabricName: (type, fields) => {
    // fields expected: { base, process, finish, va_category, etc. }
    if (!fields) return '';
    
    const parts = [];
    
    if (type === 'base' || type === 'fancy_base') {
      if (fields.base) parts.push(fields.base);
      if (fields.process) parts.push(fields.process); // e.g., RFD, Greige
    } else if (type === 'finish') {
      if (fields.base) parts.push(fields.base);
      if (fields.process) parts.push(fields.process); // Mill Print, Digital Print
      if (fields.finish) parts.push(fields.finish);
    } else if (type === 'fancy_finish') {
      if (fields.base) parts.push(fields.base);
      if (fields.va_category) parts.push(fields.va_category);
      if (fields.process) parts.push(fields.process);
      if (fields.finish) parts.push(fields.finish);
    }
    
    return parts.filter(Boolean).join(' ');
  },

  // Generate SKU
  generateSKU: (type, fields) => {
    // Simple logic: BaseCode-ProcessCode-VACode-RandomSuffix
    // In production, this would use DB sequence or complex rules
    const baseCode = (fields.base_code || fields.base || 'XXX').substring(0, 3).toUpperCase();
    const processCode = (fields.process_code || fields.process || 'XXX').substring(0, 3).toUpperCase();
    const vaCode = (fields.va_code || fields.va_category || 'XXX').substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    
    return `${baseCode}-${processCode}-${vaCode}-${random}`;
  },

  createFabricMaster: async (type, data) => {
    const { error, data: newFabric } = await supabase
      .from('fabric_masters')
      .insert([{
        type,
        name: data.name,
        sku: data.sku,
        base_fabric_details: data.base_fabric_details || {},
        process_spec: data.process_spec || {},
        va_spec: data.va_spec || {},
        status: 'active'
      }])
      .select()
      .single();
    
    if (error) throw error;
    return newFabric;
  },

  updateFabricMaster: async (id, data) => {
    const { error, data: updated } = await supabase
      .from('fabric_masters')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return updated;
  },

  getFabricMaster: async (id) => {
    const { data, error } = await supabase
      .from('fabric_masters')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  },

  listFabricMasters: async (type, filters = {}) => {
    let query = supabase
      .from('fabric_masters')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });
      
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  deleteFabricMaster: async (id) => {
    // Soft delete usually preferred, but using hard delete for now based on request implied
    const { error } = await supabase
      .from('fabric_masters')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  }
};