import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Edit2, Trash2, Filter, UploadCloud } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const DesignManagementPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDesigns();
    }, []);

    const fetchDesigns = async () => {
        setLoading(true);
        // Assuming finish_fabric_designs holds design data
        const { data, error } = await supabase
            .from('finish_fabric_designs')
            .select(`*, finish_fabrics(finish_fabric_name)`)
            .order('created_at', { ascending: false });
        
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load designs' });
        } else {
            setDesigns(data || []);
        }
        setLoading(false);
    };

    const filteredDesigns = designs.filter(d => 
        d.design_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.finish_fabrics?.finish_fabric_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20">
            <Helmet><title>Design Management</title></Helmet>
            <AdminPageHeader 
                title="Design Management" 
                description="Central library for all fabric designs and photos."
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Designs'}]}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search designs..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={() => navigate('/admin/bulk-image-upload')} className="gap-2">
                        <UploadCloud className="h-4 w-4" /> Bulk Upload
                    </Button>
                    <Button onClick={() => navigate('/admin/fabric-master')} className="gap-2">
                        <Plus className="h-4 w-4" /> Add via Fabric
                    </Button>
                </div>
            </div>

            {loading ? <LoadingSpinner fullHeight /> : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredDesigns.map(design => (
                        <Card key={design.id} className="overflow-hidden group hover:shadow-lg transition-all">
                            <div className="aspect-square bg-slate-100 relative">
                                {design.design_photo_url ? (
                                    <img src={design.design_photo_url} alt={design.design_number} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">No Image</div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full"><Edit2 className="h-4 w-4"/></Button>
                                    <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full"><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            </div>
                            <div className="p-3">
                                <h3 className="font-bold text-sm truncate">{design.design_number}</h3>
                                <p className="text-xs text-muted-foreground truncate">{design.finish_fabrics?.finish_fabric_name || 'Unassigned'}</p>
                                <div className="mt-2 flex justify-between items-center">
                                    <Badge variant="outline" className="text-[10px] h-5">{design.status}</Badge>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DesignManagementPage;