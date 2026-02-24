import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Loader2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import FormErrorBoundary from '@/components/common/FormErrorBoundary';
import FabricSpecificationForm from '@/components/admin/fabric/FabricSpecificationForm';
import { FabricService } from '@/services/FabricService';

const EditFabricForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [initialData, setInitialData] = useState({});

    useEffect(() => {
        const fetchFabric = async () => {
            try {
                const data = await FabricService.getFabricById(id);
                if (data) {
                    // Extract yarn unit if possible
                    let yarnCount = data.yarn_count || '';
                    let yarnUnit = 's';
                    // Simple heuristic to split number and unit
                    const match = yarnCount.match(/^(\d+)(.*)$/);
                    if (match) {
                        yarnCount = match[1];
                        yarnUnit = match[2] || 's';
                    }

                    // Extract fabric name from base fabric name if needed (rough approximation)
                    // base_fabric_name: "58 Cotton Poplin Greige"
                    // width: 58, base: Cotton, finish: Greige
                    // fabric_name guess: "Poplin"
                    let fabricName = '';
                    if (data.base_fabric_name) {
                        const parts = data.base_fabric_name.split(' ');
                        // Remove width (first) and finish (last)
                        if (parts.length >= 3) {
                            fabricName = parts.slice(1, -1).join(' ');
                        }
                    }

                    setInitialData({
                        ...data,
                        yarn_count: yarnCount,
                        yarn_count_unit: yarnUnit,
                        fabric_name: fabricName
                    });
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load fabric' });
                navigate('/admin/fabric-master');
            } finally {
                setFetchLoading(false);
            }
        };
        fetchFabric();
    }, [id, navigate, toast]);

    const handleUpdate = async (formData) => {
        setLoading(true);
        try {
            const fullYarnCount = formData.yarn_count ? `${formData.yarn_count}${formData.yarn_count_unit || ''}` : '';
            
            const payload = {
                ...formData,
                yarn_count: fullYarnCount,
            };
            
            delete payload.yarn_count_unit;
            delete payload.fabric_name;
            delete payload.id; // Don't update ID
            delete payload.created_at;

            await FabricService.updateFabric(id, payload);
            
            toast({ title: 'Success', description: 'Fabric updated successfully' });
            navigate('/admin/fabric-master');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure? This action cannot be undone.')) return;
        try {
            await FabricService.deleteFabric(id);
            toast({ title: 'Deleted', description: 'Fabric deleted successfully' });
            navigate('/admin/fabric-master');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    if (fetchLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <FormErrorBoundary>
            <div className="space-y-6 max-w-[1600px] mx-auto pb-20 p-6">
                <Helmet><title>Edit Fabric Specification</title></Helmet>
                <AdminPageHeader 
                    title="Edit Fabric Specification" 
                    breadcrumbs={[{label: 'Fabric Master', href: '/admin/fabric-master'}, {label: 'Edit'}]}
                    onBack={() => navigate('/admin/fabric-master')}
                    actions={
                        <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="mr-2 h-4 w-4"/> Delete Fabric</Button>
                    }
                />

                <FabricSpecificationForm 
                    initialData={initialData}
                    onSubmit={handleUpdate}
                    onCancel={() => navigate('/admin/fabric-master')}
                    isLoading={loading}
                />
            </div>
        </FormErrorBoundary>
    );
};

export default EditFabricForm;