import { supabase } from '@/lib/customSupabaseClient';
import { AIDescriptionService } from './AIDescriptionService';

export const DesignUploadIntegration = {
  /**
   * Process a list of files, uploading them and running AI detection
   * @param {File[]} files - Array of image files
   * @param {Function} onProgress - Callback for progress updates
   */
  async processUploads(files, onProgress) {
    const results = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      try {
        // 1. Basic AI Detection (Client-side)
        const [colorData, designNumber] = await Promise.all([
          AIDescriptionService.extractDominantColor(file),
          Promise.resolve(AIDescriptionService.extractDesignNumber(file.name))
        ]);

        // 2. Generate Description
        // We create a mock context for the description generator
        const description = await AIDescriptionService.generateFinishFabricDescription({
          color: colorData.name,
          design_concept: 'Modern Print'
        });

        results.push({
          id: crypto.randomUUID(), // Temp ID for UI
          file,
          preview: URL.createObjectURL(file),
          status: 'ready',
          data: {
            design_number: designNumber || `DES-${Date.now()}-${i}`,
            color: colorData.name,
            hex: colorData.hex,
            description: description,
            selected: true
          }
        });

      } catch (error) {
        console.error("AI Processing failed for file:", file.name, error);
        results.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          status: 'error',
          error: 'AI detection failed',
          data: {
            design_number: '',
            color: '',
            description: '',
            selected: false
          }
        });
      }

      if (onProgress) onProgress(Math.round(((i + 1) / total) * 100));
    }

    return results;
  },

  /**
   * Uploads processed items to Supabase storage and database
   */
  async saveDesigns(items, commonData) {
    const { base_fabric_id, process_type, supplier_id } = commonData;
    const uploadedRecords = [];

    for (const item of items) {
      if (!item.data.selected) continue;

      // 1. Upload Image
      const fileExt = item.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `designs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('design-images')
        .upload(filePath, item.file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('design-images')
        .getPublicUrl(filePath);

      // 2. Create DB Record (Finish Fabric)
      // We are creating a new finish fabric entry for each design
      const { data: record, error: dbError } = await supabase
        .from('finish_fabrics')
        .insert({
          base_fabric_id,
          finish_fabric_name: `${commonData.base_fabric_name} - ${item.data.design_number}`,
          process_type,
          supplier_id,
          design_number: item.data.design_number,
          design_image_url: publicUrlData.publicUrl,
          design_information: item.data.description,
          description: `${item.data.color} ${item.data.description}`,
          status: 'active',
          process: process_type, // Storing process info
          // Inherit defaults or leave null
          ready_stock: true
        })
        .select()
        .single();

      if (dbError) throw dbError;
      uploadedRecords.push(record);
    }

    return uploadedRecords;
  }
};