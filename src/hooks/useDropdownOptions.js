import { useState, useEffect } from 'react';
import { FabricMasterService } from '@/services/FabricMasterService';

export const useDropdownOptions = (category) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchOptions = async () => {
      if (!category) return;
      setLoading(true);
      try {
        const data = await FabricMasterService.fetchDropdownOptions(category);
        if (mounted) {
          setOptions(data);
        }
      } catch (error) {
        console.error(`Error loading options for ${category}`, error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchOptions();

    return () => {
      mounted = false;
    };
  }, [category]);

  return { options, loading };
};