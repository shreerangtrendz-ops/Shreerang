import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useFabricDropdowns = (refetchTrigger = 0) => {
  const [dropdowns, setDropdowns] = useState({
    process: [],
    width: [],
    base: [],
    construction: [],
    stretchability: [],
    transparency: [],
    handfeel: [],
    yarn_type: [],
    yarn_count: [],
    process_type: [],
    dye_used: [],
    class: [],
    foil_tag: [],
    finish_type: [],
    va_category: [],
    va_sub_category: [],
    gsm_tolerance: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const isMounted = useRef(false);

  const fetchDropdowns = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      console.log('🔄 useFabricDropdowns: Fetching from table...');
      
      // Fetch directly from table to ensure we get the latest 'category', 'value', 'code' structure
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      console.log(`✅ useFabricDropdowns: Received ${data?.length || 0} rows.`);

      // Group data manually
      const grouped = {};
      
      // Initialize keys
      Object.keys(dropdowns).forEach(key => { grouped[key] = []; });

      if (data) {
        data.forEach(item => {
          // Determine category key (support 'category' column or fallback to 'field_name')
          const catKey = item.category || item.field_name;
          // Determine value and code
          const val = item.value || item.option_name;
          const code = item.code || item.option_code || item.option_sku_code;

          if (catKey) {
             // Normalize category key to match state keys (e.g. handle case sensitivity or missing keys)
             // We just add it to the grouped object, initializing array if needed
             if (!grouped[catKey]) grouped[catKey] = [];
             
             grouped[catKey].push({
               id: item.id,
               option_name: val, // Keep option_name for compatibility with components
               value: val,
               label: val,
               option_code: code,
               code: code,
               ...item
             });
          }
        });
      }

      setDropdowns(prev => ({
        ...prev,
        ...grouped
      }));
    } catch (err) {
      console.error('❌ useFabricDropdowns Error:', err);
      setError(err);
      if (!silent) {
        toast({
          variant: "destructive",
          title: "Dropdown Error",
          description: "Could not load dropdown options."
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    isMounted.current = true;
    fetchDropdowns();
    return () => { isMounted.current = false; };
  }, [fetchDropdowns, refetchTrigger]); // Added refetchTrigger dependency

  const refreshDropdowns = () => {
    console.log('🔄 Manual refresh triggered');
    fetchDropdowns(false); 
  };

  return { dropdowns, loading, error, refreshDropdowns };
};