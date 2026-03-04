import { supabase } from '@/lib/customSupabaseClient';

export const DesignUploadService = {
  uploadToBunnyNet: async (file, designNumber) => {
    // This assumes environment variables are set
    const STORAGE_ZONE = import.meta.env.VITE_BUNNY_STORAGE_ZONE;
    const ACCESS_KEY = import.meta.env.VITE_BUNNY_NET_API_KEY;
    const CDN_HOSTNAME = import.meta.env.VITE_BUNNY_NET_CDN_URL;

    if (!STORAGE_ZONE || !ACCESS_KEY) {
      console.warn("Bunny.net credentials missing");
      // Fallback for demo environment if keys aren't set
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(URL.createObjectURL(file));
        }, 1000);
      });
    }

    const fileName = `${designNumber}_${Date.now()}_${file.name}`;
    const url = `https://storage.bunnycdn.com/${STORAGE_ZONE}/designs/${fileName}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'AccessKey': ACCESS_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return `${CDN_HOSTNAME}/designs/${fileName}`;
    } catch (error) {
      console.error("Bunny Upload Error:", error);
      throw error;
    }
  },

  saveToDesignMaster: async (designData) => {
    // Clean design number (e.g. "D No. 5059" -> "5059")
    const cleanDesignNo = designData.design_no
      .replace(/^D\s*(No\.?)?\s*/i, '')
      .trim();

    const { data, error } = await supabase
      .from('design_batch_master')
      .upsert({
        design_no: cleanDesignNo,
        primary_image_url: designData.url,
        fabric_type: designData.fabric_type,
        hsn_code: designData.hsn_code,
        gst_rate: designData.gst_rate || 5,
        updated_at: new Date().toISOString()
      }, { onConflict: 'design_no' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  generateAIDescription: async (file) => {
    // Simulated AI description
    return new Promise(resolve => {
      setTimeout(() => {
        resolve("Elegant floral pattern with intricate embroidery on a soft cotton base.");
      }, 1500);
    });
  }
};