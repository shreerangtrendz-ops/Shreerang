import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Edit2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const SalesBillDashboard = () => {
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
        const { data, error } = await supabase.from('sales_bills').select('*').order('bill_date', { ascending: false });
        if (error) console.error(error);
        else setBills(data || []);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        const { error } = await supabase.from('sales_bills').delete().eq('id', id);
        if (!error) {
            toast({ title: 'Deleted' });
            fetchBills();
        }
    };

    const filtered = bills.filter(b => 
        b.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.bill_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <Helmet><title>Sales Bills</title></Helmet>
            <AdminPageHeader 
                title="Sales Bills" 
                breadcrumbs={[{label: 'Accounting', href: '/admin/accounting'}, {label: 'Sales Bills'}]}
                onBack={() => navigate('/admin/accounting')}
            />

            <div className="flex justify-between items-center">
                <Input placeholder="Search bills..." className="max-w-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <Button onClick={() => navigate('new')} className="gap-2"><Plus className="h-4 w-4" /> Add Bill</Button>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Date</TableHead>
                                <TableHead>Bill #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center h-32">No bills found.</TableCell></TableRow> : 
                            filtered.map(b => (
                                <TableRow key={b.id}>
                                    <TableCell>{format(new Date(b.bill_date), 'dd MMM')}</TableCell>
                                    <TableCell className="font-medium">{b.bill_number}</TableCell>
                                    <TableCell>{b.customer_name}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{b.item_name}</TableCell>
                                    <TableCell className="text-right">{b.quantity}</TableCell>
                                    <TableCell className="text-right font-bold">₹{b.amount?.toFixed(2)}</TableCell>
                                    <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`${b.id}`)}><Edit2 className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
};

export default SalesBillDashboard;