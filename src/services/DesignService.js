import { supabase } from '@/lib/customSupabaseClient';

export const DesignService = {
  async uploadImagesToStorage(files, sku, designNumber) {
    const uploadedUrls = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const filePath = `${sku}/${designNumber}.${fileExt}`;
      
      // Using 'design-images' bucket as per schema
      const { data, error } = await supabase.storage
        .from('design-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('design-images')
        .getPublicUrl(filePath);
        
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls[0]; // Assuming one image per design for now
  },

  async generateAIDescription(imageUrl, designNumber) {
    try {
      // Fetch API key from admin settings or env
      // For this implementation, we return a mock description as we cannot safely expose API keys in frontend code
      // In production, this would call a Supabase Edge Function
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      
      return `AI Analysis for ${designNumber}: Premium textile design featuring intricate patterns suitable for digital printing. The composition suggests high-quality fabric usage with detailed texture rendering. Color palette is optimized for vibrant output.`;

    } catch (error) {
      console.error("AI Generation Error:", error);
      return "Failed to generate description.";
    }
  },

  async saveDesign(designData) {
    const { data, error } = await supabase
      .from('designs')
      .insert([designData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async listDesigns({ page = 1, limit = 10, skuId, startDate, endDate, search } = {}) {
    let query = supabase
      .from('designs')
      .select('*, fabric_master(sku)', { count: 'exact' });

    if (skuId) query = query.eq('sku_id', skuId);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (search) query = query.or(`design_number.ilike.%${search}%,design_name.ilike.%${search}%`);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    
    if (error) throw error;
    return { data, count };
  },

  async updateDesign(id, updates) {
    const { data, error } = await supabase
      .from('designs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteDesign(id) {
    // First get the image path to delete from storage
    const { data: design, error: fetchError } = await supabase
        .from('designs')
        .select('image_url')
        .eq('id', id)
        .single();
    
    if (!fetchError && design?.image_url) {
        try {
            const url = new URL(design.image_url);
            // Extract path after bucket name
            const path = url.pathname.split('/storage/v1/object/public/design-images/')[1];
            if(path) {
                await supabase.storage.from('design-images').remove([path]);
            }
        } catch(e) { console.error("Error parsing URL for deletion", e); }
    }

    const { error } = await supabase
      .from('designs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async getDesignsBySkuId(skuId) {
    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .eq('sku_id', skuId);
      
    if (error) throw error;
    return data;
  }
};