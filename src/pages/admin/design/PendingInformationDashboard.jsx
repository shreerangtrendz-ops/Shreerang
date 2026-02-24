import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, Filter, AlertTriangle, CheckCircle, Edit2, Trash2, Save, X } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { DesignUploadIntegration } from '@/services/DesignUploadIntegration';

const PendingInformationDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [designs, setDesigns] = useState([]);
    const [filteredDesigns, setFilteredDesigns] = useState([]);
    
    // Filters
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterFabric, setFilterFabric] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    // Selection & Bulk Action
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [bulkValue, setBulkValue] = useState('');

    // Quick Edit
    const [editingDesign, setEditingDesign] = useState(null);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        processFilters();
    }, [designs, filterStatus, filterFabric, searchQuery, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch designs with finish fabric details
            const { data, error } = await supabase
                .from('finish_fabric_designs')
                .select(`
                    *,
                    finish_fabrics (
                        id,
                        finish_fabric_name
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Process data to identify missing fields
            const processed = data.map(d => {
                const missing = DesignUploadIntegration.identifyMissingFields(d);
                let status = d.status || 'active'; // Default
                
                // Override status based on completeness logic if needed
                // For this dashboard, we might want a computed 'completeness_status'
                const completeness = missing.length > 0 ? (missing.includes('Design Number') ? 'Incomplete' : 'Pending') : 'Complete';

                return {
                    ...d,
                    fabric_name: d.finish_fabrics?.finish_fabric_name || 'Unknown Fabric',
                    missing_fields: missing,
                    completeness_status: completeness
                };
            });

            setDesigns(processed);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load designs.' });
        } finally {
            setLoading(false);
        }
    };

    const processFilters = () => {
        let result = [...designs];

        // Tab Filter
        if (activeTab === 'pending') {
            result = result.filter(d => d.missing_fields.length > 0);
        } else if (activeTab === 'complete') {
            result = result.filter(d => d.missing_fields.length === 0);
        }

        // Dropdown Filters
        if (filterStatus !== 'all') {
            result = result.filter(d => d.completeness_status === filterStatus);
        }
        if (filterFabric !== 'all') {
            result = result.filter(d => d.finish_fabric_id === filterFabric);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(d => 
                d.design_number.toLowerCase().includes(q) || 
                (d.design_name && d.design_name.toLowerCase().includes(q))
            );
        }

        setFilteredDesigns(result);
    };

    // Handlers
    const handleSelectAll = (checked) => {
        if (checked) setSelectedIds(filteredDesigns.map(d => d.id));
        else setSelectedIds([]);
    };

    const handleSelectOne = (id, checked) => {
        if (checked) setSelectedIds(prev => [...prev, id]);
        else setSelectedIds(prev => prev.filter(i => i !== id));
    };

    const handleBulkUpdate = async () => {
        if (!bulkAction) return;
        if (selectedIds.length === 0) return toast({ title: 'Select designs first', variant: 'destructive' });

        try {
            const updates = {};
            if (bulkAction === 'status') updates.status = bulkValue;
            if (bulkAction === 'delete') {
                if(!window.confirm(`Delete ${selectedIds.length} designs?`)) return;
                await supabase.from('finish_fabric_designs').delete().in('id', selectedIds);
                toast({ title: 'Deleted', description: `${selectedIds.length} designs deleted.` });
                fetchData();
                setSelectedIds([]);
                return;
            }
            // Add other bulk actions logic here

            if (Object.keys(updates).length > 0) {
                const { error } = await supabase.from('finish_fabric_designs').update(updates).in('id', selectedIds);
                if (error) throw error;
                toast({ title: 'Updated', description: `${selectedIds.length} designs updated.` });
                fetchData();
                setSelectedIds([]);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const openEditModal = (design) => {
        setEditingDesign(design);
        setEditForm({
            design_name: design.design_name || '',
            status: design.status || 'active'
        });
    };

    const saveEdit = async () => {
        try {
            const { error } = await supabase
                .from('finish_fabric_designs')
                .update(editForm)
                .eq('id', editingDesign.id);
            
            if (error) throw error;
            toast({ title: 'Saved', description: 'Design updated successfully.' });
            setEditingDesign(null);
            fetchData(); // Refresh to update missing fields status
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    // Stats
    const uniqueFabrics = [...new Set(designs.map(d => d.finish_fabric_id))].filter(Boolean);
    const pendingCount = designs.filter(d => d.missing_fields.length > 0).length;

    return (
        <div className="space-y-6 pb-20">
            <Helmet><title>Pending Information</title></Helmet>
            <AdminPageHeader 
                title="Pending Information" 
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Pending Info'}]}
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <AlertTriangle className="h-8 w-8 text-orange-500 mb-2" />
                        <div className="text-2xl font-bold text-orange-700">{pendingCount}</div>
                        <div className="text-xs text-orange-600">Incomplete Designs</div>
                    </CardContent>
                </Card>
                {/* More stats can be added here */}
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search designs..." 
                            className="pl-9" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={filterFabric} onValueChange={setFilterFabric}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Fabric" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Fabrics</SelectItem>
                            {uniqueFabrics.map(fid => {
                                const fab = designs.find(d => d.finish_fabric_id === fid);
                                return <SelectItem key={fid} value={fid}>{fab?.fabric_name}</SelectItem>;
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex gap-2 items-center bg-slate-100 p-2 rounded-md border animate-in fade-in">
                        <span className="text-xs font-medium px-2">{selectedIds.length} Selected</span>
                        <Select value={bulkAction} onValueChange={setBulkAction}>
                            <SelectTrigger className="h-8 w-[150px]">
                                <SelectValue placeholder="Bulk Action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="status">Update Status</SelectItem>
                                <SelectItem value="delete">Delete Selected</SelectItem>
                            </SelectContent>
                        </Select>
                        {bulkAction === 'status' && (
                            <Select value={bulkValue} onValueChange={setBulkValue}>
                                <SelectTrigger className="h-8 w-[120px]"><SelectValue placeholder="New Status"/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        <Button size="sm" onClick={handleBulkUpdate}>Apply</Button>
                    </div>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="all">All Designs</TabsTrigger>
                    <TabsTrigger value="pending" className="relative">
                        Pending 
                        {pendingCount > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500"></span>}
                    </TabsTrigger>
                    <TabsTrigger value="complete">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"><Checkbox checked={selectedIds.length === filteredDesigns.length && filteredDesigns.length > 0} onCheckedChange={handleSelectAll}/></TableHead>
                                        <TableHead>Design Number</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Fabric</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Missing Info</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                                    ) : filteredDesigns.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No designs found matching filters.</TableCell></TableRow>
                                    ) : (
                                        filteredDesigns.map(design => (
                                            <TableRow key={design.id}>
                                                <TableCell><Checkbox checked={selectedIds.includes(design.id)} onCheckedChange={(c) => handleSelectOne(design.id, c)}/></TableCell>
                                                <TableCell className="font-medium">{design.design_number}</TableCell>
                                                <TableCell>
                                                    {design.design_name || <span className="text-slate-400 italic">Not filled</span>}
                                                </TableCell>
                                                <TableCell>{design.fabric_name}</TableCell>
                                                <TableCell>
                                                    <Badge variant={design.status === 'active' ? 'success' : 'secondary'}>{design.status}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {design.missing_fields.length > 0 ? (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {design.missing_fields.map(f => (
                                                                <Badge key={f} variant="destructive" className="text-[10px] px-1 py-0">{f}</Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-green-600 flex items-center text-xs"><CheckCircle className="h-3 w-3 mr-1"/> Complete</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => openEditModal(design)}>
                                                        <Edit2 className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Quick Edit Modal */}
            <Dialog open={!!editingDesign} onOpenChange={(open) => !open && setEditingDesign(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Design: {editingDesign?.design_number}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Design Name</Label>
                            <Input 
                                value={editForm.design_name} 
                                onChange={e => setEditForm({...editForm, design_name: e.target.value})} 
                                placeholder="Enter design name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingDesign(null)}>Cancel</Button>
                        <Button onClick={saveEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PendingInformationDashboard;