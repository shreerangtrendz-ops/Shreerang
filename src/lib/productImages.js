import { supabase } from './customSupabaseClient';

/**
 * product_images helpers
 * Thin layer over Supabase for the gallery images keyed by design_no.
 *
 * Usage:
 *   import { getImagesForDesign, getPrimaryImageUrl } from '@/lib/productImages';
 *   const imgs = await getImagesForDesign('769');
 *   const cover = await getPrimaryImageUrl('769');
 */

/**
 * @param {string|number} designNo - numeric design number like 769 or '769'
 * @returns {Promise<Array>} - images sorted primary first, then by sort_order
 */
export async function getImagesForDesign(designNo) {
  if (designNo == null) return [];
  const key = String(designNo).trim();
  if (!key) return [];

  const { data, error } = await supabase
    .from('product_images')
    .select('id, design_no, category, width, style, filename, sort_order, is_primary, cdn_url, file_size, mime_type')
    .eq('design_no', key)
    .eq('is_active', true)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[productImages] query failed for design', key, error);
    return [];
  }
  return data || [];
}

/**
 * Primary image URL for a design, or null if none uploaded yet.
 * Useful for thumbnails in tables.
 */
export async function getPrimaryImageUrl(designNo) {
  const imgs = await getImagesForDesign(designNo);
  return imgs[0]?.cdn_url ?? null;
}

/**
 * Batch version: for a list of design numbers, return a map {designNo: primaryUrl}.
 * Single query, good for filling thumbnails in a long table.
 */
export async function getPrimaryImagesForDesigns(designNos) {
  const keys = [...new Set(designNos.filter(Boolean).map(String))];
  if (!keys.length) return {};

  const { data, error } = await supabase
    .from('product_images')
    .select('design_no, cdn_url, sort_order, is_primary')
    .in('design_no', keys)
    .eq('is_active', true)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[productImages] batch query failed', error);
    return {};
  }

  const out = {};
  for (const row of data || []) {
    if (!(row.design_no in out)) out[row.design_no] = row.cdn_url; // first wins (primary before alts)
  }
  return out;
}

/**
 * Count images per design. Useful for admin view "design 1234 has 0 images".
 */
export async function getImageCountsForDesigns(designNos) {
  const keys = [...new Set(designNos.filter(Boolean).map(String))];
  if (!keys.length) return {};

  const { data, error } = await supabase
    .from('product_images')
    .select('design_no')
    .in('design_no', keys)
    .eq('is_active', true);

  if (error) {
    console.error('[productImages] count query failed', error);
    return {};
  }
  const counts = {};
  for (const row of data || []) {
    counts[row.design_no] = (counts[row.design_no] || 0) + 1;
  }
  return counts;
}
