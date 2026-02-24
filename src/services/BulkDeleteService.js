import { supabase } from '@/lib/customSupabaseClient';

export const BulkDeleteService = {
    // Check dependencies for Base Fabrics
    async checkBaseFabricDependencies(ids) {
        const dependencies = [];
        
        // Check for Finish Fabrics
        const { data: finishFabrics } = await supabase
            .from('finish_fabrics')
            .select('id, base_fabric_id, finish_fabric_name')
            .in('base_fabric_id', ids);
            
        if (finishFabrics && finishFabrics.length > 0) {
            // Group by parent
            const grouped = finishFabrics.reduce((acc, item) => {
                acc[item.base_fabric_id] = (acc[item.base_fabric_id] || 0) + 1;
                return acc;
            }, {});
            
            Object.entries(grouped).forEach(([baseId, count]) => {
                dependencies.push({
                    parentId: baseId,
                    type: 'finish_fabrics',
                    count,
                    message: `Has ${count} Finish Fabric(s)`
                });
            });
        }
        
        return dependencies;
    },

    // Check dependencies for Finish Fabrics
    async checkFinishFabricDependencies(ids) {
        const dependencies = [];
        
        // Check for Designs
        const { data: designs } = await supabase
            .from('finish_fabric_designs')
            .select('id, finish_fabric_id')
            .in('finish_fabric_id', ids);

        if (designs && designs.length > 0) {
             const grouped = designs.reduce((acc, item) => {
                acc[item.finish_fabric_id] = (acc[item.finish_fabric_id] || 0) + 1;
                return acc;
            }, {});

            Object.entries(grouped).forEach(([id, count]) => {
                dependencies.push({
                    parentId: id,
                    type: 'designs',
                    count,
                    message: `Has ${count} Design(s)`
                });
            });
        }

        // Check for Fancy Finish Fabrics
        const { data: fancy } = await supabase
            .from('fancy_finish_fabrics')
            .select('id, finish_fabric_id')
            .in('finish_fabric_id', ids);

        if (fancy && fancy.length > 0) {
             const grouped = fancy.reduce((acc, item) => {
                acc[item.finish_fabric_id] = (acc[item.finish_fabric_id] || 0) + 1;
                return acc;
            }, {});

            Object.entries(grouped).forEach(([id, count]) => {
                dependencies.push({
                    parentId: id,
                    type: 'fancy_finish',
                    count,
                    message: `Has ${count} Fancy Finish Fabric(s)`
                });
            });
        }

        return dependencies;
    },

    async deleteBaseFabrics(ids, cascade = false) {
        if (cascade) {
            // Get all finish fabrics first to cascade deeper if needed
            const { data: finishFabrics } = await supabase.from('finish_fabrics').select('id').in('base_fabric_id', ids);
            if (finishFabrics?.length > 0) {
                const finishIds = finishFabrics.map(f => f.id);
                // Recursively delete finish fabrics (which handles designs/fancy)
                await this.deleteFinishFabrics(finishIds, true);
            }
        }
        
        const { error } = await supabase.from('base_fabrics').delete().in('id', ids);
        if (error) throw error;
    },

    async deleteFinishFabrics(ids, cascade = false) {
        if (cascade) {
            // Delete designs
            await supabase.from('finish_fabric_designs').delete().in('finish_fabric_id', ids);
            // Delete fancy finishes
            await supabase.from('fancy_finish_fabrics').delete().in('finish_fabric_id', ids);
        }
        
        const { error } = await supabase.from('finish_fabrics').delete().in('id', ids);
        if (error) throw error;
    }
};