import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MILL_FABRICS, DIGITAL_FABRICS, POLY_FABRICS } from '@/lib/fabricSeedData';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, UploadCloud } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

const FabricDataImporter = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState(null);

    const handleImport = async () => {
        setLoading(true);
        setProgress(0);
        let count = 0;
        const total = MILL_FABRICS.length + DIGITAL_FABRICS.length + POLY_FABRICS.length;

        try {
            const allFabrics = [
                ...MILL_FABRICS.map(f => ({ ...f, category: 'Mill' })),
                ...DIGITAL_FABRICS.map(f => ({ ...f, category: 'Digital' })),
                ...POLY_FABRICS.map(f => ({ ...f, category: 'Poly Digital' }))
            ];

            // 1. Get or Create Warehouse Location 'Main'
            let warehouseId;
            const { data: wh } = await supabase.from('warehouse_locations').select('id').eq('location_name', 'Main Warehouse').single();
            if (wh) warehouseId = wh.id;
            else {
                const { data: newWh } = await supabase.from('warehouse_locations').insert({ location_name: 'Main Warehouse', capacity: 10000 }).select().single();
                warehouseId = newWh.id;
            }

            // 2. Insert Fabrics & Create Initial Stock Record
            for (const fab of allFabrics) {
                // Check if exists
                const { data: existing } = await supabase.from('fabrics').select('id').eq('fabric_name', fab.name).eq('base_type', fab.base).single();
                
                let fabricId = existing?.id;

                if (!fabricId) {
                    const { data: newFab, error } = await supabase.from('fabrics').insert({
                        fabric_name: fab.name,
                        base_category: fab.category === 'Mill' || fab.category === 'Digital' ? 'Natural' : 'Synthetic', // Simplified logic
                        base_type: fab.base,
                        width: fab.width,
                        finish: 'Standard',
                        gsm: 100 // Default
                    }).select().single();
                    if (!error) fabricId = newFab.id;
                }

                if (fabricId) {
                    // Create/Check Stock Record
                    const { data: stock } = await supabase.from('fabric_stock').select('id').eq('fabric_id', fabricId).single();
                    if (!stock) {
                        await supabase.from('fabric_stock').insert({
                            fabric_id: fabricId,
                            warehouse_location_id: warehouseId,
                            ready_stock: 0,
                            wip_stock: 0
                        });
                    }
                }
                
                count++;
                setProgress(Math.round((count / total) * 100));
            }

            setStats({ total: count });
            toast({ title: 'Import Complete', description: `Successfully processed ${count} fabrics.` });

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Bulk Fabric Import</CardTitle>
                <CardDescription>Import Master Data for Mill, Digital, and Poly fabrics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-slate-50 rounded border">
                        <div className="text-2xl font-bold">{MILL_FABRICS.length}</div>
                        <div className="text-xs text-muted-foreground">Mill Fabrics</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded border">
                        <div className="text-2xl font-bold">{DIGITAL_FABRICS.length}</div>
                        <div className="text-xs text-muted-foreground">Pure Digital</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded border">
                        <div className="text-2xl font-bold">{POLY_FABRICS.length}</div>
                        <div className="text-xs text-muted-foreground">Poly Digital</div>
                    </div>
                </div>

                {loading && (
                    <div className="space-y-2">
                        <Progress value={progress} className="w-full" />
                        <p className="text-xs text-center text-muted-foreground">Processing... {progress}%</p>
                    </div>
                )}

                {stats && !loading && (
                    <div className="flex items-center gap-2 text-green-600 justify-center p-4 bg-green-50 rounded">
                        <CheckCircle className="h-5 w-5" />
                        <span>Successfully imported {stats.total} records.</span>
                    </div>
                )}

                <Button onClick={handleImport} disabled={loading} className="w-full" size="lg">
                    {loading ? <Loader2 className="animate-spin mr-2"/> : <UploadCloud className="mr-2"/>}
                    Start Import
                </Button>
            </CardContent>
        </Card>
    );
};

export default FabricDataImporter;