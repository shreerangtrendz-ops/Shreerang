import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Plus, Search, Edit, Phone, Mail 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { CustomerService } from '@/services/CustomerService';
import { ensureArray } from '@/lib/arrayValidation';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const CustomerManagement = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await CustomerService.listCustomers({ search });
      // Validate array
      setCustomers(ensureArray(data, 'CustomerManagement'));
    } catch (e) {
      console.error('Error loading customers:', e);
      toast({ variant: "destructive", title: "Error", description: "Failed to load customers" });
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (formData.id) {
        await CustomerService.updateCustomer(formData.id, formData);
        toast({ title: "Updated", description: "Customer details updated" });
      } else {
        await CustomerService.createCustomer(formData);
        toast({ title: "Created", description: "New customer added" });
      }
      setIsCreateOpen(false);
      loadCustomers();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const safeCustomers = ensureArray(customers, 'CustomerManagement Render');

  return (
    <DataErrorBoundary onRetry={loadCustomers}>
      <div className="space-y-6">
        <Helmet><title>Customers | Admin</title></Helmet>
        
        <AdminPageHeader 
          title="Customer Management" 
          description="Manage customer profiles and CRM data"
          actions={
            <Button onClick={() => { setFormData({}); setIsCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Customer
            </Button>
          }
        />

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Search by name, phone..." 
                  className="pl-9" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadCustomers()}
                />
              </div>
              <Button variant="outline" onClick={loadCustomers}>Search</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Firm / Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6}><LoadingSpinner text="Loading customers..." /></TableCell></TableRow>
                ) : safeCustomers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24 text-slate-500">No customers found</TableCell></TableRow>
                ) : (
                  safeCustomers.map(c => (
                    <TableRow key={c?.id || Math.random()}>
                      <TableCell className="font-medium">{c?.name || '-'}</TableCell>
                      <TableCell>{c?.firm_name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          {c?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> {c.phone}</span>}
                          {c?.email && <span className="flex items-center gap-1 text-slate-500"><Mail className="h-3 w-3"/> {c.email}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{c?.city || '-'}</TableCell>
                      <TableCell>{c?.agent_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setFormData(c || {}); setIsCreateOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{formData.id ? 'Edit' : 'Add'} Customer</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Firm Name</Label>
                <Input value={formData.firm_name || ''} onChange={e => setFormData({...formData, firm_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number *</Label>
                <Input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Billing Address</Label>
                <Input value={formData.billing_address || ''} onChange={e => setFormData({...formData, billing_address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Agent Name</Label>
                <Input value={formData.agent_name || ''} onChange={e => setFormData({...formData, agent_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Language Preference</Label>
                <Select value={formData.language_preference} onValueChange={v => setFormData({...formData, language_preference: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="Gujarati">Gujarati</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave}>{formData.id ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DataErrorBoundary>
  );
};

export default CustomerManagement;