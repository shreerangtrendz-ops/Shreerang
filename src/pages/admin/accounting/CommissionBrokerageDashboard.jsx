import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Edit2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const CommissionBrokerageDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('brokerage_entries').select('*').order('entry_date', { ascending: false });
        if (error) console.error(error);
        else setEntries(data || []);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        const { error } = await supabase.from('brokerage_entries').delete().eq('id', id);
        if (!error) {
            toast({ title: 'Deleted' });
            fetchEntries();
        }
    };

    const filtered = entries.filter(e => 
        e.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.bill_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <Helmet><title>Commission & Brokerage</title></Helmet>
            <AdminPageHeader 
                title="Commission & Brokerage" 
                breadcrumbs={[{label: 'Accounting', href: '/admin/accounting'}, {label: 'Comm/Brokerage'}]}
                onBack={() => navigate('/admin/accounting')}
            />

            <div className="flex justify-between items-center">
                <Input placeholder="Search agent or bill..." className="max-w-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <Button onClick={() => navigate('new')} className="gap-2"><Plus className="h-4 w-4" /> Add Entry</Button>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Agent / Broker</TableHead>
                                <TableHead>Bill #</TableHead>
                                <TableHead className="text-right">Bill Amount</TableHead>
                                <TableHead className="text-right">Percentage</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center h-32">No entries found.</TableCell></TableRow> : 
                            filtered.map(e => (
                                <TableRow key={e.id}>
                                    <TableCell>{format(new Date(e.entry_date), 'dd MMM')}</TableCell>
                                    <TableCell><Badge variant={e.type === 'Commission' ? 'secondary' : 'outline'}>{e.type}</Badge></TableCell>
                                    <TableCell>{e.agent_name}</TableCell>
                                    <TableCell>{e.bill_number}</TableCell>
                                    <TableCell className="text-right">₹{e.bill_amount}</TableCell>
                                    <TableCell className="text-right">{e.percentage}%</TableCell>
                                    <TableCell className="text-right font-bold">₹{e.amount?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`${e.id}`)}><Edit2 className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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

export default CommissionBrokerageDashboard;