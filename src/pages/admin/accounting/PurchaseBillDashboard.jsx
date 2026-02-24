import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Trash2, Edit2, FileText, Upload } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const PurchaseBillDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [bills, setBills] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('purchase_bills')
            .select('*')
            .order('bill_date', { ascending: false });
        
        if (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load bills.' });
        } else {
            setBills(data || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this bill?')) return;
        
        const { error } = await supabase.from('purchase_bills').delete().eq('id', id);
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete.' });
        } else {
            toast({ title: 'Success', description: 'Bill deleted.' });
            fetchBills();
        }
    };

    const filteredBills = bills.filter(bill => 
        bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <Helmet><title>Purchase Bills</title></Helmet>
            <AdminPageHeader 
                title="Purchase Bills" 
                breadcrumbs={[{label: 'Accounting', href: '/admin/accounting'}, {label: 'Purchase Bills'}]}
                onBack={() => navigate('/admin/accounting')}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search bills..." 
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/admin/bulk-bill-import/new')} className="gap-2">
                        <Upload className="h-4 w-4" /> Bulk Import (AI)
                    </Button>
                    <Button onClick={() => navigate('new')} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Bill
                    </Button>
                </div>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Date</TableHead>
                                <TableHead>Bill #</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBills.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">No purchase bills found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredBills.map(bill => (
                                    <TableRow key={bill.id}>
                                        <TableCell>{format(new Date(bill.bill_date), 'dd MMM yyyy')}</TableCell>
                                        <TableCell className="font-medium">{bill.bill_number}</TableCell>
                                        <TableCell>{bill.supplier_name}</TableCell>
                                        <TableCell><Badge variant="outline">{bill.fabric_type}</Badge></TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={bill.item_name}>{bill.item_name}</TableCell>
                                        <TableCell className="text-right">{bill.quantity}</TableCell>
                                        <TableCell className="text-right font-bold">₹{bill.amount?.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant={bill.status === 'Paid' ? 'success' : 'secondary'}>{bill.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => navigate(`${bill.id}`)}>
                                                    <Edit2 className="h-4 w-4 text-slate-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(bill.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
};

export default PurchaseBillDashboard;