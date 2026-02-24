import { supabase } from '@/lib/customSupabaseClient';

export const CustomerProductService = {
  async getProducts({ category, fabricType, width, minPrice, maxPrice, search, sort = 'newest', page = 1, limit = 12 } = {}) {
    let query = supabase
      .from('products')
      .select('*, categories(name)', { count: 'exact' })
      .eq('is_active', true);

    if (category) query = query.eq('category_id', category);
    if (fabricType) query = query.ilike('specifications->>fabric_type', `%${fabricType}%`);
    if (width) query = query.ilike('specifications->>width', `%${width}%`);
    if (minPrice) query = query.gte('retail_price', minPrice);
    if (maxPrice) query = query.lte('retail_price', maxPrice);
    if (search) query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%`);

    // Sorting
    switch (sort) {
      case 'price_asc':
        query = query.order('retail_price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('retail_price', { ascending: false });
        break;
      case 'popular':
        // Assuming we have a popularity metric, falling back to views or created_at
        query = query.order('created_at', { ascending: false }); 
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    
    return { data, count };
  },

  async getProductBySlug(slug) {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getFeaturedProducts(limit = 8) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async getRelatedProducts(productId, categoryId, limit = 4) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('category_id', categoryId)
      .neq('id', productId)
      .limit(limit);
      
    if (error) throw error;
    return data;
  }
};