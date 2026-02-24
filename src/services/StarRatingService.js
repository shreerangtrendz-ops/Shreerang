import { supabase } from '@/lib/customSupabaseClient';

export const StarRatingService = {
    async toggleStar(table, id, currentState) {
        const newState = !currentState;
        const { error } = await supabase
            .from(table)
            .update({ 
                is_starred: newState,
                starred_at: newState ? new Date() : null
            })
            .eq('id', id);
        
        if (error) throw error;
        return newState;
    },

    async toggleBaseFabricStar(id, currentState) {
        return this.toggleStar('base_fabrics', id, currentState);
    },

    async toggleFinishFabricStar(id, currentState) {
        return this.toggleStar('finish_fabrics', id, currentState);
    },

    async toggleFancyFinishFabricStar(id, currentState) {
        return this.toggleStar('fancy_finish_fabrics', id, currentState);
    }
};