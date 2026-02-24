import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, RefreshCw, Image as ImageIcon } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';

const StockManager = () => {
    const { toast } = useToast();
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, active, inactive

    useEffect(() => {
        fetchDesigns();
    }, []);

    const fetchDesigns = async () => {
        setLoading(true);
        // Fetch all designs along with their finish fabric info
        const { data, error } = await supabase
            .from('finish_fabric_designs')
            .select(`
                *,
                finish_fabrics (
                    finish_fabric_name,
                    process
                )
            `)
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setDesigns(data || []);
        
        setLoading(false);
    };

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        // Optimistic update
        setDesigns(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));

        const { error } = await supabase
            .from('finish_fabric_designs')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            // Revert
            setDesigns(prev => prev.map(d => d.id === id ? { ...d, status: currentStatus } : d));
            toast({ variant: 'destructive', title: "Update Failed", description: error.message });
        } else {
            toast({ title: "Updated", description: `Design marked as ${newStatus}` });
        }
    };

    const filteredDesigns = designs.filter(d => {
        const matchesSearch = d.design_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              d.finish_fabrics?.finish_fabric_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || d.status === filter;
        return matchesSearch && matchesFilter;
    });

    if (loading) return <LoadingSpinner fullHeight />;

    return (
        <div className="space-y-6">
            <Helmet><title>Stock Manager</title></Helmet>
            <AdminPageHeader title="Stock Manager" breadcrumbs={[{label: 'Inventory', href: '/admin/inventory'}, {label: 'Stock Manager'}]} />

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search design number or fabric..." 
                        className="pl-9" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Filter:</span>
                    <select 
                        className="text-sm border rounded-md h-9 px-2 bg-transparent"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Items</option>
                        <option value="active">In Stock</option>
                        <option value="inactive">Out of Stock</option>
                    </select>
                    <Button variant="ghost" size="icon" onClick={fetchDesigns} title="Refresh">
                        <RefreshCw className="h-4 w-4 text-slate-500" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredDesigns.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">No designs found matching criteria.</div>
                ) : (
                    filteredDesigns.map(design => (
                        <Card key={design.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="relative aspect-square bg-slate-100">
                                {design.design_photo_url ? (
                                    <img src={design.design_photo_url} alt={design.design_number} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-300"><ImageIcon className="h-8 w-8"/></div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Switch 
                                        checked={design.status === 'active'}
                                        onCheckedChange={() => toggleStatus(design.id, design.status)}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-6 text-white">
                                    <div className="font-bold text-lg">{design.design_number}</div>
                                </div>
                            </div>
                            <CardContent className="p-3 text-xs space-y-1">
                                <div className="font-medium truncate" title={design.finish_fabrics?.finish_fabric_name}>
                                    {design.finish_fabrics?.finish_fabric_name || 'Unknown Fabric'}
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>{design.finish_fabrics?.process || '-'}</span>
                                    <Badge variant="outline" className={design.status === 'active' ? "text-green-600 bg-green-50 border-green-200" : "text-slate-500"}>
                                        {design.status === 'active' ? 'In Stock' : 'Out'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default StockManager;