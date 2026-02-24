import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Trash2, Edit, Truck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import TransportForm from '@/components/admin/TransportForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function TransportManagementPage() {
    const { toast } = useToast();
    const [transports, setTransports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTransport, setEditingTransport] = useState(null);

    useEffect(() => {
        fetchTransports();
    }, []);

    const fetchTransports = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('transports').select('*').order('transport_name');
        if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
        else setTransports(data || []);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        const { error } = await supabase.from('transports').delete().eq('id', id);
        if (error) {
             toast({ title: "Failed to delete", description: "Transport might be linked to orders.", variant: "destructive" });
        } else {
             toast({ title: "Deleted", description: "Transport removed successfully." });
             fetchTransports();
        }
    };

    const handleEdit = (item) => {
        setEditingTransport(item);
        setIsDialogOpen(true);
    };

    const handleSuccess = () => {
        setIsDialogOpen(false);
        setEditingTransport(null);
        fetchTransports();
    };

    const filtered = transports.filter(t => 
        t.transport_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <Helmet><title>Transport Management</title></Helmet>
            <AdminPageHeader title="Transport" breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Transport' }]} />

            <div className="flex justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search transports..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Button onClick={() => { setEditingTransport(null); setIsDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Transport</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transport Name</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>GST</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6}><LoadingSpinner /></TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No transports found.</TableCell></TableRow>
                            ) : (
                                filtered.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-muted-foreground" /> {t.transport_name}
                                        </TableCell>
                                        <TableCell>{t.city || '-'}</TableCell>
                                        <TableCell>{t.contact_person || '-'}</TableCell>
                                        <TableCell>{t.phone || '-'}</TableCell>
                                        <TableCell>{t.gst_number || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Edit className="h-4 w-4 text-slate-500" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTransport ? 'Edit Transport' : 'Add New Transport'}</DialogTitle>
                    </DialogHeader>
                    <TransportForm onSuccess={handleSuccess} onCancel={() => setIsDialogOpen(false)} initialData={editingTransport} />
                </DialogContent>
            </Dialog>
        </div>
    );
}