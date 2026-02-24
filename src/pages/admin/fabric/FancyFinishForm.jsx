import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { SKUGenerator } from '@/services/SKUGenerator';
import FabricSelect from '@/components/admin/fabric/FabricSelect';

const FancyFinishForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [finishFabrics, setFinishFabrics] = useState([]);

    const [formData, setFormData] = useState({
        finish_fabric_id: '',
        value_addition_type: 'Hakoba',
        thread_type: '',
        concept: '',
        design_description: '',
        fancy_finish_name: '', // Auto-generated
        status: 'active'
    });

    useEffect(() => {
        fetchFinishFabrics();
        if (id) fetchFancyFabric();
    }, [id]);

    useEffect(() => {
        if (formData.finish_fabric_id && finishFabrics.length > 0) {
            const finishName = finishFabrics.find(f => f.id === formData.finish_fabric_id)?.label;
            if (finishName) {
                const sku = SKUGenerator.generateFancySKU(finishName, formData);
                setFormData(prev => ({ ...prev, fancy_finish_name: sku }));
            }
        }
    }, [formData.finish_fabric_id, formData.value_addition_type, formData.concept, finishFabrics]);

    const fetchFinishFabrics = async () => {
        const { data } = await supabase.from('finish_fabrics').select('id, finish_fabric_name').eq('status', 'active');
        setFinishFabrics(data?.map(d => ({ id: d.id, label: d.finish_fabric_name })) || []);
    };

    const fetchFancyFabric = async () => {
        setLoading(true);
        const { data } = await supabase.from('fancy_finish_fabrics').select('*').eq('id', id).single();
        if (data) setFormData(data);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };
            let error;
            if (id) {
                ({ error } = await supabase.from('fancy_finish_fabrics').update(payload).eq('id', id));
            } else {
                ({ error } = await supabase.from('fancy_finish_fabrics').insert(payload));
            }
            if (error) throw error;
            toast({ title: 'Success', description: 'Fancy Finish Fabric Saved' });
            navigate('/admin/fabric-master/fancy');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <Helmet><title>Fancy Finish Master</title></Helmet>
            <AdminPageHeader 
                title={id ? "Edit Fancy Fabric" : "Add New Fancy Fabric"} 
                breadcrumbs={[{label: 'Fabric Master', href: '/admin/fabric-master'}, {label: 'Fancy (Value Addition)'}]}
                onBack={() => navigate('/admin/fabric-master/fancy')}
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium uppercase text-slate-500">Auto-Generated Name</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input value={formData.fancy_finish_name} readOnly className="font-mono text-lg font-bold bg-white" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Value Addition Specs</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <FabricSelect 
                            label="Select Finish Fabric (Source)"
                            value={formData.finish_fabric_id}
                            onChange={v => setFormData(p => ({...p, finish_fabric_id: v}))}
                            options={finishFabrics}
                            required
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Value Addition</Label>
                                <Select value={formData.value_addition_type} onValueChange={v => setFormData(p => ({...p, value_addition_type: v}))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(SKUGenerator.CODES.VALUE_ADDITION).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Concept</Label>
                                <Select value={formData.concept} onValueChange={v => setFormData(p => ({...p, concept: v}))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(SKUGenerator.CODES.CONCEPT).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Thread Type</Label>
                                <Select value={formData.thread_type} onValueChange={v => setFormData(p => ({...p, thread_type: v}))}>
                                    <SelectTrigger><SelectValue placeholder="For Hakoba/Embroidery" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Semi Dull Poly">Semi Dull Poly</SelectItem>
                                        <SelectItem value="Full Dull Poly">Full Dull Poly</SelectItem>
                                        <SelectItem value="Cotton">Cotton</SelectItem>
                                        <SelectItem value="Viscose">Viscose</SelectItem>
                                        <SelectItem value="Nylon">Nylon</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Description / Remarks</Label>
                                <Input value={formData.design_description} onChange={e => setFormData(p => ({...p, design_description: e.target.value}))} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end gap-4 lg:pl-64 z-40 shadow-lg">
                    <Button type="button" variant="outline" onClick={() => navigate('/admin/fabric-master/fancy')}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Fancy Fabric
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default FancyFinishForm;