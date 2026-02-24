import { supabase } from '@/lib/customSupabaseClient';
import { BillExtractionService } from './BillExtractionService';

export const BulkBillService = {
  uploadAndExtract: async (file, billType) => {
    try {
      // 1. Upload File
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sales-order-attachments') // Reusing existing bucket for demo
        .upload(`bills/${fileName}`, file);

      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('sales-order-attachments')
        .getPublicUrl(`bills/${fileName}`);

      // 2. Extract Data via AI Service
      const extractedData = await BillExtractionService.extractDetails(file);

      // 3. Create Record
      const { data: record, error: dbError } = await supabase
        .from('bulk_bills')
        .insert({
          bill_image_url: publicUrl,
          bill_type: billType,
          extracted_data: extractedData,
          bill_amount: extractedData.bill_amount,
          bill_date: extractedData.bill_date,
          status: 'Pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return record;
    } catch (error) {
      console.error("Bulk Bill Service Error:", error);
      throw error;
    }
  },

  getAllBills: async () => {
    const { data, error } = await supabase
      .from('bulk_bills')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  confirmMapping: async (id, mappingData) => {
    const { error } = await supabase
      .from('bulk_bills')
      .update({
        mapped_fabric_id: mappingData.fabric_id,
        fabric_type: mappingData.fabric_type,
        supplier_id: mappingData.supplier_id,
        job_worker_id: mappingData.job_worker_id,
        status: 'Confirmed'
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};