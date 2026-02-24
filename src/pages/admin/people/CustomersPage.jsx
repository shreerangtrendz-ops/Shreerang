import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, Loader2, Edit2, Trash2, ShieldCheck, ShieldAlert, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import DynamicDropdown from '@/components/common/DynamicDropdown';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('role', 'admin') // Exclude admins
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load customer data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
            tier: currentUser.tier,
            is_approved: currentUser.is_approved,
            full_name: currentUser.full_name,
            phone_number: currentUser.phone_number
        })
        .eq('id', currentUser.id);
        
      if (error) throw error;
      
      toast({ title: "Updated", description: "Customer profile updated successfully." });
      setIsEditModalOpen(false);
      fetchCustomers();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('user_profiles').delete().eq('id', currentUser.id);
      
      if (error) throw error;
      
      toast({ title: "Deleted", description: "Customer profile removed." });
      setIsDeleteAlertOpen(false);
      fetchCustomers();
    } catch (error) {
       toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
       setIsSubmitting(false);
    }
  };

  const openEdit = (user) => {
    setCurrentUser({ ...user }); 
    setIsEditModalOpen(true);
  };

  const openDelete = (user) => {
    setCurrentUser(user);
    setIsDeleteAlertOpen(true);
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      (c.full_name?.toLowerCase() || '').includes(search.toLowerCase()) || 
      (c.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (c.phone_number?.toLowerCase() || '').includes(search.toLowerCase());
    
    const matchesTier = tierFilter === 'all' || (c.tier || 'Public') === tierFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'approved' && c.is_approved) || 
      (statusFilter === 'pending' && !c.is_approved);

    return matchesSearch && matchesTier && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Customers CRM | Admin</title></Helmet>
      <AdminPageHeader title="Customer Management" description="Manage user profiles, approvals, and pricing tiers." breadcrumbs={[{label: 'Admin', href: '/admin'}, {label: 'Customers'}]} />

      <Card className="p-4 border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search by name, email, or phone..." 
                    className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all" 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="w-[140px]">
                    <DynamicDropdown 
                        category="customer_tiers" 
                        value={tierFilter === 'all' ? '' : tierFilter} 
                        onChange={(val) => setTierFilter(val || 'all')} 
                        placeholder="All Tiers"
                    />
                </div>
            </div>
        </div>
      </Card>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                    <TableHead className="font-semibold text-slate-700">Customer</TableHead>
                    <TableHead className="font-semibold text-slate-700">Contact</TableHead>
                    <TableHead className="font-semibold text-slate-700">Tier</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><div className="flex justify-center items-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading profiles...</div></TableCell></TableRow>
                ) : filteredCustomers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-500">No matching customers found.</TableCell></TableRow>
                ) : (
                    filteredCustomers.map(customer => (
                        <TableRow key={customer.id} className="group hover:bg-slate-50/50 transition-colors">
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium text-slate-900">{customer.full_name || 'Unknown Name'}</span>
                                    <span className="text-xs text-slate-500">Joined: {new Date(customer.created_at).toLocaleDateString()}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col space-y-0.5">
                                    <span className="text-sm text-slate-600">{customer.email}</span>
                                    {customer.phone_number && <span className="text-xs text-slate-400">{customer.phone_number}</span>}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={cn(
                                    "font-normal",
                                    customer.tier === 'VIP' ? "bg-purple-50 text-purple-700 border-purple-200" : 
                                    customer.tier === 'Registered' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"
                                )}>
                                    {customer.tier || 'Public'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {customer.is_approved ? (
                                    <div className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
                                        <div className="h-2 w-2 rounded-full bg-green-500" /> Approved
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-amber-700 text-sm font-medium">
                                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Pending
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(customer)} className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => openDelete(customer)} className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Edit Customer Profile</DialogTitle>
            </DialogHeader>
            {currentUser && (
                <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label>Full Name</Label>
                        <Input value={currentUser.full_name || ''} onChange={(e) => setCurrentUser({...currentUser, full_name: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Phone Number</Label>
                        <Input value={currentUser.phone_number || ''} onChange={(e) => setCurrentUser({...currentUser, phone_number: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Customer Tier</Label>
                        <DynamicDropdown 
                            category="customer_tiers" 
                            value={currentUser.tier} 
                            onChange={(val) => setCurrentUser({...currentUser, tier: val})}
                            label="Customer Tier"
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                        <div className="space-y-0.5">
                            <Label>Account Approval</Label>
                            <p className="text-xs text-slate-500">Grant access to protected features</p>
                        </div>
                        <Switch 
                            checked={currentUser.is_approved || false} 
                            onCheckedChange={(checked) => setCurrentUser({...currentUser, is_approved: checked})} 
                        />
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateUser} disabled={isSubmitting} className="bg-slate-900 text-white">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" /> Delete Customer?
                </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-slate-600">
                Are you sure you want to delete <span className="font-semibold text-slate-900">{currentUser?.full_name}</span>? 
                This action will remove their profile and cannot be undone.
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsDeleteAlertOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Profile"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPage;