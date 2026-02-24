import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Plus, Search, Phone, Mail, MapPin, 
  Trash2, Edit, Settings 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { JobWorkerService } from '@/services/JobWorkerService';
import { Badge } from '@/components/ui/badge';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const JobworkUnitManagementPage = () => {
  const { toast } = useToast();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await JobWorkerService.getAllWorkers();
      setWorkers(ensureArray(data, 'JobworkUnitManagementPage'));
    } catch (e) {
      logError(e, 'JobworkUnitManagementPage fetch');
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        worker_name: formData.worker_name || formData.name 
      };

      if (formData.id) {
        await JobWorkerService.updateWorker(formData.id, payload);
        toast({ title: "Updated", description: "Unit updated" });
      } else {
        await JobWorkerService.createWorker(payload);
        toast({ title: "Created", description: "Unit added" });
      }
      setIsCreateOpen(false);
      loadData();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      await JobWorkerService.deleteWorker(id);
      loadData();
      toast({ title: "Deleted", description: "Unit removed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const safeWorkers = ensureArray(workers);

  return (
    <div className="space-y-6">
      <Helmet><title>Jobwork Units | Admin</title></Helmet>
      <AdminPageHeader 
        title="Jobwork Units" 
        description="Manage external processing units and contractors"
        actions={
          <Button onClick={() => { setFormData({}); setIsCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Unit
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {safeWorkers.map(worker => (
          <Card key={worker.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{worker.worker_name}</h3>
                  <Badge variant="secondary" className="mt-1">{worker.specialization || 'General'}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setFormData(worker); setIsCreateOpen(true); }}>
                    <Edit className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(worker.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4" /> {worker.phone || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" /> {worker.email || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" /> {worker.city || 'N/A'}
                </div>
              </div>

              <div className="pt-2 border-t flex justify-between items-center text-xs text-slate-500">
                <span>Rate: {worker.rate ? `₹${worker.rate}/${worker.rate_unit || 'm'}` : 'Varies'}</span>
                <span>Quality: {worker.quality_grade || 'Standard'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{formData.id ? 'Edit' : 'Add'} Jobwork Unit</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Unit Name</Label>
              <Input value={formData.worker_name || ''} onChange={e => setFormData({...formData, worker_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input value={formData.specialization || ''} onChange={e => setFormData({...formData, specialization: e.target.value})} placeholder="e.g. Dyeing, Embroidery" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Quality Grade</Label>
                <Input value={formData.quality_grade || ''} onChange={e => setFormData({...formData, quality_grade: e.target.value})} placeholder="A, B, Premium" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>{formData.id ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobworkUnitManagementPage;