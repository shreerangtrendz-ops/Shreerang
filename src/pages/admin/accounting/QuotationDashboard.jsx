import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Edit2, FileText, ArrowRight } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const QuotationDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [quotations, setQuotations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        fetchQuotations();
    }, []);

    const fetchQuotations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('quotations')
            .select('*')
            .order('quotation_date', { ascending: false });
        
        if (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load quotations.' });
        } else {
            setQuotations(data || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        const { error } = await supabase.from('quotations').delete().eq('id', id);
        if (!error) {
            toast({ title: 'Deleted', description: 'Quotation removed.' });
            fetchQuotations();
        }
    };

    const filtered = quotations.filter(q => {
        const matchesSearch = 
            q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || q.item_type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <Helmet><title>Quotations</title></Helmet>
            <AdminPageHeader 
                title="Quotations" 
                breadcrumbs={[{label: 'Accounting', href: '/admin/accounting'}, {label: 'Quotations'}]}
                onBack={() => navigate('/admin/accounting')}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-2 w-full md:w-auto">
                    <Input 
                        placeholder="Search quotations..." 
                        className="max-w-xs"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Purchase">Purchase</SelectItem>
                            <SelectItem value="JobWork">Job Work</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => navigate('new')} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Quotation
                </Button>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Date</TableHead>
                                <TableHead>Quote #</TableHead>
                                <TableHead>Party Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Item / Design</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">No quotations found.</TableCell>
                                </TableRow>
                            ) : (
                                filtered.map(q => (
                                    <TableRow key={q.id}>
                                        <TableCell>{format(new Date(q.quotation_date), 'dd MMM yyyy')}</TableCell>
                                        <TableCell className="font-medium">{q.quotation_number}</TableCell>
                                        <TableCell>{q.party_name}</TableCell>
                                        <TableCell>
                                            <Badge variant={q.item_type === 'Purchase' ? 'secondary' : 'outline'}>{q.item_type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{q.item_name}</span>
                                                {q.design_number && <span className="text-xs text-muted-foreground">Des: {q.design_number}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{q.quantity}</TableCell>
                                        <TableCell className="text-right font-bold">₹{q.rate}</TableCell>
                                        <TableCell>
                                            <Badge variant={q.status === 'Converted' ? 'success' : 'outline'}>{q.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {q.status !== 'Converted' && (
                                                    <Button variant="ghost" size="icon" title="Convert to Bill" onClick={() => navigate(`${q.id}?convert=true`)}>
                                                        <ArrowRight className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" onClick={() => navigate(`${q.id}`)}>
                                                    <Edit2 className="h-4 w-4 text-slate-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}>
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

export default QuotationDashboard;