import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Trash2, Edit, Phone, Mail, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AgentForm from '@/components/admin/AgentForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AgentManagementPage() {
    const { toast } = useToast();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('agents').select('*').order('agent_name');
        if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
        else setAgents(data || []);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This will fail if the agent has linked customers.")) return;
        const { error } = await supabase.from('agents').delete().eq('id', id);
        if (error) {
             toast({ title: "Failed to delete", description: "Agent might be linked to customers or orders.", variant: "destructive" });
        } else {
             toast({ title: "Deleted", description: "Agent removed successfully." });
             fetchAgents();
        }
    };

    const handleEdit = (agent) => {
        setEditingAgent(agent);
        setIsDialogOpen(true);
    };

    const handleSuccess = () => {
        setIsDialogOpen(false);
        setEditingAgent(null);
        fetchAgents();
    };

    const filtered = agents.filter(a => 
        a.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.agency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <Helmet><title>Agent Management</title></Helmet>
            <AdminPageHeader title="Agents" breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Agents' }]} />

            <div className="flex justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search agents..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Button onClick={() => { setEditingAgent(null); setIsDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Agent</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Agent Details</TableHead>
                                <TableHead>Agency</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>Commission</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6}><LoadingSpinner /></TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No agents found.</TableCell></TableRow>
                            ) : (
                                filtered.map(agent => (
                                    <TableRow key={agent.id}>
                                        <TableCell>
                                            <div className="font-medium">{agent.agent_name}</div>
                                            {agent.gst_number && <div className="text-xs text-muted-foreground">GST: {agent.gst_number}</div>}
                                        </TableCell>
                                        <TableCell>{agent.agency_name || '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-sm">
                                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {agent.phone}</span>
                                                {agent.email && <span className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" /> {agent.email}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {agent.city}</span>
                                        </TableCell>
                                        <TableCell>{agent.commission_percentage ? `${agent.commission_percentage}%` : '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(agent)}><Edit className="h-4 w-4 text-slate-500" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(agent.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
                        <DialogTitle>{editingAgent ? 'Edit Agent' : 'Add New Agent'}</DialogTitle>
                    </DialogHeader>
                    <AgentForm onSuccess={handleSuccess} onCancel={() => setIsDialogOpen(false)} initialData={editingAgent} />
                </DialogContent>
            </Dialog>
        </div>
    );
}