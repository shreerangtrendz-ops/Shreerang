import { supabase } from '@/lib/customSupabaseClient';
import * as XLSX from 'xlsx';
import { BASE_CODES, CONSTRUCTION_CODES, generateBaseFabricName } from '@/lib/fabricMasterConstants';

export const FabricService = {
  // ... existing methods ...
  async getAllFabrics() {
    const { data, error } = await supabase
      .from('base_fabrics')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getFabricById(id) {
    const { data, error } = await supabase
      .from('base_fabrics')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getFabricsByBase(base) {
    const { data, error } = await supabase
      .from('base_fabrics')
      .select('*')
      .eq('base', base)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async searchFabrics(queryText) {
    const { data, error } = await supabase
      .from('base_fabrics')
      .select('*')
      .or(`base_fabric_name.ilike.%${queryText}%,sku.ilike.%${queryText}%`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createFabric(fabricData) {
    const { data, error } = await supabase
      .from('base_fabrics')
      .insert([fabricData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateFabric(id, updates) {
    const { data, error } = await supabase
      .from('base_fabrics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteFabric(id) {
    const { error } = await supabase
      .from('base_fabrics')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // ... batch methods ...
  async batchCreateBaseFabrics(data) {
    const { data: result, error } = await supabase.from('base_fabrics').insert(data).select();
    if (error) throw error;
    return result;
  },

  async batchCreateFinishFabrics(data) {
    const { data: result, error } = await supabase.from('finish_fabrics').insert(data).select();
    if (error) throw error;
    return result;
  },

  async batchCreateFancyFinishFabrics(data) {
     const { data: result, error } = await supabase.from('fancy_finish_fabrics').insert(data).select();
     if (error) throw error;
     return result;
  },
  
  // ... other methods ...
  async getBaseFabricBySKU(sku) {
    const { data, error } = await supabase.from('base_fabrics').select('*').eq('sku', sku).single();
    if (error) return null;
    return data;
  },

  async getFinishFabricBySKU(sku) {
    const { data, error } = await supabase.from('finish_fabrics').select('*').eq('finish_fabric_sku', sku).single();
    if (error) return null;
    return data;
  },

  // ... Finish Fabric Methods ...
  async createFinishFabric(data) {
    const { data: result, error } = await supabase
      .from('finish_fabrics')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateFinishFabric(id, data) {
    const { data: result, error } = await supabase
      .from('finish_fabrics')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async deleteFinishFabric(id) {
    const { error } = await supabase
      .from('finish_fabrics')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async getFinishFabricById(id) {
    const { data, error } = await supabase
      .from('finish_fabrics')
      .select('*, base_fabrics(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getFinishFabricsByBaseFabricId(baseFabricId) {
    const { data, error } = await supabase
      .from('finish_fabrics')
      .select('*')
      .eq('base_fabric_id', baseFabricId);
    if (error) throw error;
    return data;
  },

  async getAllFinishFabrics() {
     const { data, error } = await supabase
      .from('finish_fabrics')
      .select('*, base_fabrics(base_fabric_name, sku)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // --- Fancy Finish Fabric Methods ---
  async createFancyFinishFabric(data) {
    const { data: result, error } = await supabase
      .from('fancy_finish_fabrics')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateFancyFinishFabric(id, data) {
    const { data: result, error } = await supabase
      .from('fancy_finish_fabrics')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async deleteFancyFinishFabric(id) {
    const { error } = await supabase
      .from('fancy_finish_fabrics')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async getFancyFinishFabricById(id) {
    const { data, error } = await supabase
      .from('fancy_finish_fabrics')
      .select('*, finish_fabrics(*, base_fabrics(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getFancyFinishFabricsByFinishFabricId(finishFabricId) {
    const { data, error } = await supabase
      .from('fancy_finish_fabrics')
      .select('*')
      .eq('finish_fabric_id', finishFabricId);
    if (error) throw error;
    return data;
  },

  async getAllFancyFinishFabrics() {
    const { data, error } = await supabase
      .from('fancy_finish_fabrics')
      .select('*, finish_fabrics(finish_fabric_name, finish_fabric_sku)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async exportFabricsToExcel(fabrics, filename = 'Fabrics_Export.xlsx') {
    const exportData = fabrics.map(f => ({
      SKU: f.sku,
      'Fabric Name': f.base_fabric_name,
      Base: f.base,
      Finish: f.finish_type,
      Width: f.width,
      GSM: f.gsm,
      Weight: f.weight,
      Construction: f.construction,
      'Yarn Type': f.yarn_type,
      'HSN Code': f.hsn_code,
      Status: f.status || 'Active'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fabrics');
    XLSX.writeFile(workbook, filename);
  },

  // Helper Methods for Specification
  generateCodeFromBase(base) {
    return BASE_CODES[base] || '';
  },

  generateCodeFromConstruction(construction) {
    return CONSTRUCTION_CODES[construction] || '';
  },

  calculateBaseFabricName(width, fabricName, finish) {
    return generateBaseFabricName(width, fabricName, finish);
  },

  validateFabricSpecification(data) {
    const errors = {};
    if (!data.width) errors.width = "Width is required";
    if (!data.base) errors.base = "Base is required";
    if (!data.finish_type) errors.finish_type = "Finish is required";
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};