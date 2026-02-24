import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Edit2, Upload } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const JobWorkBillDashboard = () => {
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
            .from('job_work_bills')
            .select('*')
            .order('bill_date', { ascending: false });
        
        if (error) console.error(error);
        else setBills(data || []);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        const { error } = await supabase.from('job_work_bills').delete().eq('id', id);
        if (!error) {
            toast({ title: 'Deleted', description: 'Bill removed.' });
            fetchBills();
        }
    };

    const filteredBills = bills.filter(bill => 
        bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.job_worker_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <Helmet><title>Job Work Bills</title></Helmet>
            <AdminPageHeader 
                title="Job Work Bills" 
                breadcrumbs={[{label: 'Accounting', href: '/admin/accounting'}, {label: 'Job Work Bills'}]}
                onBack={() => navigate('/admin/accounting')}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Input 
                    placeholder="Search bills..." 
                    className="max-w-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/admin/bulk-bill-import/new')} className="gap-2">
                        <Upload className="h-4 w-4" /> Bulk Import
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
                                <TableHead>Job Worker</TableHead>
                                <TableHead>Design #</TableHead>
                                <TableHead>Process</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBills.map(bill => (
                                <TableRow key={bill.id}>
                                    <TableCell>{format(new Date(bill.bill_date), 'dd MMM')}</TableCell>
                                    <TableCell className="font-medium">{bill.bill_number}</TableCell>
                                    <TableCell>{bill.job_worker_name}</TableCell>
                                    <TableCell>{bill.design_number}</TableCell>
                                    <TableCell>{bill.process_type}</TableCell>
                                    <TableCell className="text-right">{bill.quantity}</TableCell>
                                    <TableCell className="text-right font-bold">₹{bill.amount?.toFixed(2)}</TableCell>
                                    <TableCell><Badge variant="secondary">{bill.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`${bill.id}`)}><Edit2 className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(bill.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
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

export default JobWorkBillDashboard;