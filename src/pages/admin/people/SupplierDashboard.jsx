import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit2, Trash2, Search, Truck } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { SupplierService } from '@/services/SupplierService';

const SupplierDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        setLoading(true);
        try {
            const data = await SupplierService.fetchAll();
            setSuppliers(data);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to load suppliers" });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This cannot be undone.")) return;
        try {
            await SupplierService.delete(id);
            toast({ title: "Success", description: "Supplier deleted" });
            loadSuppliers();
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete supplier" });
        }
    };

    const filteredSuppliers = suppliers.filter(s => 
        s.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.phone?.includes(searchTerm)
    );

    return (
        <div className="space-y-6 pb-20">
            <Helmet><title>Supplier Management</title></Helmet>
            <AdminPageHeader 
                title="Supplier Management" 
                description="Manage vendors for fabrics and accessories." 
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Suppliers'}]}
            />

            <div className="flex justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search suppliers..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => navigate('/admin/suppliers/new')} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Supplier
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier Name</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSuppliers.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                                                <Truck className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div>{s.supplier_name}</div>
                                                <div className="text-xs text-muted-foreground">{s.supplier_code}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div className="font-medium">{s.contact_person}</div>
                                            <div className="text-slate-500">{s.phone}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {s.city}, {s.state}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {s.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/suppliers/${s.id}`)}>
                                            <Edit2 className="h-4 w-4 text-slate-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && filteredSuppliers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No suppliers found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default SupplierDashboard;