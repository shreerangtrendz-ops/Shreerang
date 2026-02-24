import { supabase } from '@/lib/customSupabaseClient';

export const FilterPresetService = {
    async getPresets(category) {
        const { data, error } = await supabase
            .from('filter_presets')
            .select('*')
            .eq('category', category)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },

    async savePreset(category, name, filters) {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('filter_presets')
            .insert({
                category,
                preset_name: name,
                filter_config: filters,
                user_id: user.user.id
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async deletePreset(id) {
        const { error } = await supabase
            .from('filter_presets')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    }
};