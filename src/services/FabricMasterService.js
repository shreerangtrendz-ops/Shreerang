import { supabase } from '@/lib/customSupabaseClient';
import * as NamingRules from '@/lib/fabricNamingRules';
import { sanitizeNumericFields } from '@/lib/numericFieldSanitizer';

const handleSupabaseError = (error, context) => {
  console.error(`[FabricMasterService] Error in ${context}:`, error);
  if (error.code === '22P02') {
    throw new Error('Database type mismatch: Please ensure all numeric fields contain valid numbers.');
  }
  if (error.code === '23505') {
    throw new Error('Duplicate entry: This SKU or unique record already exists.');
  }
  throw new Error(error.message || 'An unexpected database error occurred.');
};

export const FabricMasterService = {
  ...NamingRules,

  sanitizeFormData(payload, numericFields = [], requiredFields = []) {
    return sanitizeNumericFields(payload, numericFields, requiredFields);
  },

  async getBaseFabrics() {
    const { data, error } = await supabase.from('base_fabrics').select('*').order('created_at', { ascending: false });
    if (error) handleSupabaseError(error, 'getBaseFabrics');
    return data || [];
  },

  async getFinishFabrics() {
    const { data, error } = await supabase.from('finish_fabrics').select('*, base_fabrics(*)').order('created_at', { ascending: false });
    if (error) handleSupabaseError(error, 'getFinishFabrics');
    return data || [];
  },

  async createBaseFabric(payload) {
    try {
      // Fields that are numeric in DB
      const sanitizedPayload = this.sanitizeFormData(
        payload, 
        ['weight', 'gsm', 'gsmTolerance', 'yarnCount'], 
        ['weight', 'gsm'] // e.g. weight and gsm are required
      );

      const sku = this.generateBaseFabricSKU(sanitizedPayload.width, sanitizedPayload.shortCode, sanitizedPayload.process);
      const name = this.generateBaseFabricName(sanitizedPayload.width, sanitizedPayload.fabricName, sanitizedPayload.process);
      
      const dbPayload = {
        base_fabric_name: name,
        fabric_name: sanitizedPayload.fabricName,
        short_code: sanitizedPayload.shortCode,
        base: sanitizedPayload.base,
        process: sanitizedPayload.process,
        width: sanitizedPayload.width,
        construction: sanitizedPayload.construction,
        stretchability: sanitizedPayload.stretchability,
        weight: sanitizedPayload.weight,
        gsm: sanitizedPayload.gsm,
        gsm_tolerance: sanitizedPayload.gsmTolerance,
        transparency: sanitizedPayload.transparency,
        handfeel: sanitizedPayload.handfeel,
        yarn_type: sanitizedPayload.yarnType,
        yarn_count: String(sanitizedPayload.yarnCount || ''), // In some DBs yarn count is string, check schema if needed
        hsn_code: sanitizedPayload.hsnCode,
        sku: sku,
        status: 'active'
      };

      const { data, error } = await supabase.from('base_fabrics').insert([dbPayload]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'createBaseFabric');
    }
  },

  async createFinishFabric(payload) {
    try {
      const sanitizedPayload = this.sanitizeFormData(payload, ['shortage'], ['shortage']);

      const sku = this.generateFinishFabricSKU(sanitizedPayload.finishWidth, sanitizedPayload.shortCode, sanitizedPayload.class, sanitizedPayload.tags, sanitizedPayload.process);
      const name = this.generateFinishFabricName(sanitizedPayload.finishWidth, sanitizedPayload.baseFabricName, sanitizedPayload.class, sanitizedPayload.tags, sanitizedPayload.process);

      const dbPayload = {
        base_fabric_id: sanitizedPayload.baseFabricId,
        finish_fabric_name: name,
        finish_fabric_sku: sku,
        width: sanitizedPayload.finishWidth,
        process: sanitizedPayload.process,
        class: sanitizedPayload.class,
        tags: sanitizedPayload.tags,
        ink_type: sanitizedPayload.inkType,
        finish: sanitizedPayload.finishTreatment,
        process_type: sanitizedPayload.printType,
        design_concept: sanitizedPayload.printConcept,
        job_worker_id: sanitizedPayload.jobWorkUnit,
        shortage_percent: sanitizedPayload.shortage,
        status: 'active'
      };

      const { data, error } = await supabase.from('finish_fabrics').insert([dbPayload]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'createFinishFabric');
    }
  },

  async createFancyFinishFabric(payload) {
    try {
      const sanitizedPayload = this.sanitizeFormData(payload, ['shortage'], ['shortage']);

      const sku = this.generateFancyFinishSKU(
        sanitizedPayload.finishWidth, sanitizedPayload.shortCode, sanitizedPayload.class, sanitizedPayload.tags, 
        sanitizedPayload.process, sanitizedPayload.valueAddition, sanitizedPayload.concept
      );
      const name = this.generateFancyFinishName(
        sanitizedPayload.finishWidth, sanitizedPayload.baseFabricName, sanitizedPayload.class, sanitizedPayload.tags, 
        sanitizedPayload.process, sanitizedPayload.valueAddition, sanitizedPayload.concept
      );

      const dbPayload = {
        finish_fabric_id: sanitizedPayload.finishFabricId,
        fancy_finish_name: name,
        fancy_finish_fabric_sku: sku,
        value_addition_type: sanitizedPayload.valueAddition,
        thread_type: sanitizedPayload.threadType,
        concept: sanitizedPayload.concept,
        components: sanitizedPayload.placement,
        job_worker_id: sanitizedPayload.jobWorkUnit,
        shortage_percent: sanitizedPayload.shortage,
        design_number: sanitizedPayload.designNo,
        status: 'active'
      };

      const { data, error } = await supabase.from('fancy_finish_fabrics').insert([dbPayload]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'createFancyFinishFabric');
    }
  },

  async createFancyBaseFabric(payload) {
    try {
      const sanitizedPayload = this.sanitizeFormData(payload, ['shortage'], ['shortage']);

      const sku = this.generateFancyBaseSKU(sanitizedPayload.width, sanitizedPayload.shortCode, sanitizedPayload.valueAddition, sanitizedPayload.concept);
      const name = this.generateFancyBaseName(sanitizedPayload.width, sanitizedPayload.baseFabricName, sanitizedPayload.valueAddition, sanitizedPayload.concept);

      const dbPayload = {
        base_fabric_id: sanitizedPayload.baseFabricId,
        fabric_name: name,
        sku: sku,
        value_addition: sanitizedPayload.valueAddition,
        thread: sanitizedPayload.threadType,
        concept: sanitizedPayload.concept,
        width: sanitizedPayload.width,
        short_code: sanitizedPayload.shortCode,
        status: 'active'
      };

      const { data, error } = await supabase.from('fancy_base_fabrics').insert([dbPayload]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'createFancyBaseFabric');
    }
  }
};