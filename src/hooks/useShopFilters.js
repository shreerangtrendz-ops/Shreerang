import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const getValuesFromParams = (searchParams, key) => {
  const value = searchParams.get(key);
  return value ? value.split(',') : [];
};

export const useShopFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeFilters = useMemo(() => ({
    categories: getValuesFromParams(searchParams, 'categories'),
    subCategories: getValuesFromParams(searchParams, 'subCategories'),
    widths: getValuesFromParams(searchParams, 'widths'),
    sort: searchParams.get('sort') || 'newest',
  }), [searchParams]);

  const updateFilters = (key, value) => {
    setSearchParams(prevParams => {
      const newParams = new URLSearchParams(prevParams);
      if (value && value.length > 0) {
        if (Array.isArray(value)) {
          newParams.set(key, value.join(','));
        } else {
          newParams.set(key, value);
        }
      } else {
        newParams.delete(key);
      }
      return newParams;
    }, { replace: true });
  };
  
  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const activeFilterCount = useMemo(() => {
    return activeFilters.categories.length + activeFilters.subCategories.length + activeFilters.widths.length;
  }, [activeFilters]);

  return {
    activeFilters,
    updateFilters,
    clearFilters,
    activeFilterCount,
  };
};