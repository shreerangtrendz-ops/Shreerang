import { supabase } from '@/lib/customSupabaseClient';

export const lookupPincode = async (pincode) => {
  if (!pincode || pincode.length < 6) return null;

  try {
    const { data, error } = await supabase
      .from('pincode_data')
      .select('*')
      .eq('pincode', pincode)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Supabase pincode lookup error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Pincode service error:", error);
    return null;
  }
};

export const getCountryCode = async (countryName) => {
  try {
    const { data, error } = await supabase
      .from('country_codes')
      .select('*')
      .ilike('country', countryName)
      .single();
    
    if (error) return null;
    return data;
  } catch (error) {
    return null;
  }
};

export const getCountries = async () => {
    const { data } = await supabase.from('country_codes').select('country, country_code');
    return data || [];
}