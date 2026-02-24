import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit2, Trash2, Search, UserCog } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { JobWorkerService } from '@/services/JobWorkerService';

const JobWorkerDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadWorkers();
    }, []);

    const loadWorkers = async () => {
        setLoading(true);
        try {
            const data = await JobWorkerService.fetchAll();
            setWorkers(data);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to load job workers" });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This cannot be undone.")) return;
        try {
            await JobWorkerService.delete(id);
            toast({ title: "Success", description: "Job worker deleted" });
            loadWorkers();
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete job worker" });
        }
    };

    const filteredWorkers = workers.filter(w => 
        w.worker_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.phone?.includes(searchTerm)
    );

    return (
        <div className="space-y-6 pb-20">
            <Helmet><title>Job Worker Management</title></Helmet>
            <AdminPageHeader 
                title="Job Worker Management" 
                description="Manage contractors for finishing and stitching." 
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Job Workers'}]}
            />

            <div className="flex justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search workers..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => navigate('/admin/job-workers/new')} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Job Worker
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Worker Name</TableHead>
                                <TableHead>Specialization</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredWorkers.map(w => (
                                <TableRow key={w.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-purple-50 rounded-full text-purple-600">
                                                <UserCog className="h-4 w-4" />
                                            </div>
                                            <div>{w.worker_name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{w.specialization}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div>{w.phone}</div>
                                            <div className="text-xs text-muted-foreground">{w.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {w.rate ? `₹${w.rate} / ${w.rate_unit || 'pc'}` : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${w.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {w.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/job-workers/${w.id}`)}>
                                            <Edit2 className="h-4 w-4 text-slate-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && filteredWorkers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No job workers found.
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

export default JobWorkerDashboard;