import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { PriceApprovalService } from '@/services/PriceApprovalService';
import { WhatsAppService } from '@/services/WhatsAppService';
import { ensureArray } from '@/lib/arrayValidation';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const PriceApprovalDashboard = () => {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [notes, setNotes] = useState('');
  const [priceOverride, setPriceOverride] = useState('');

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await PriceApprovalService.listPendingApprovals();
      setApprovals(ensureArray(data, 'PriceApprovalDashboard'));
    } catch (e) {
      console.error('Error loading approvals:', e);
      toast({ variant: "destructive", title: "Error", description: "Failed to load approval requests" });
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (approval, type) => {
    if (!approval) return;
    setSelectedApproval(approval);
    setActionType(type);
    setPriceOverride(approval.fetched_price || ''); // Default to fetched price
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!selectedApproval) return;
    try {
      if (actionType === 'approve') {
        await PriceApprovalService.approvePrice(selectedApproval.id, priceOverride, notes);
        
        // Auto send WhatsApp if approved and customer exists
        if (selectedApproval.customer_id) {
          try {
            await WhatsAppService.sendPriceQuote(selectedApproval.customer_id, {
              product_name: selectedApproval.products?.name || 'Product',
              price: priceOverride
            });
          } catch (waError) {
            console.error('Failed to send WhatsApp notification:', waError);
            // Non-critical error
          }
        }
        toast({ title: "Approved", description: "Price sent to customer" });
      } else {
        await PriceApprovalService.rejectPrice(selectedApproval.id, notes);
        toast({ title: "Rejected", description: "Request rejected" });
      }
      setSelectedApproval(null);
      loadApprovals();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const safeApprovals = ensureArray(approvals, 'PriceApprovalDashboard Render');

  return (
    <DataErrorBoundary onRetry={loadApprovals}>
      <div className="space-y-6">
        <Helmet><title>Price Approvals | Admin</title></Helmet>
        
        <AdminPageHeader title="Pending Price Approvals" description="Review and approve customer price requests" />

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>System Price</TableHead>
                <TableHead>Wait Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6}><LoadingSpinner text="Loading approvals..." /></TableCell></TableRow>
              ) : safeApprovals.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24 text-slate-500">No pending approvals</TableCell></TableRow>
              ) : (
                safeApprovals.map(app => {
                  if (!app) return null;
                  const waitMinutes = app.created_at ? Math.floor((new Date() - new Date(app.created_at)) / 60000) : 0;
                  const isUrgent = waitMinutes > 30;
                  
                  return (
                    <TableRow key={app.id || Math.random()} className={isUrgent ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">{app.customers?.name || 'Unknown'}</TableCell>
                      <TableCell>{app.products?.name || app.product_id || '-'}</TableCell>
                      <TableCell>{app.quantity || 0}</TableCell>
                      <TableCell>₹{app.fetched_price || 0}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 ${isUrgent ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                          <Clock className="h-3 w-3" /> {waitMinutes} min
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleActionClick(app, 'approve')}>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleActionClick(app, 'reject')}>
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={!!selectedApproval} onOpenChange={(val) => !val && setSelectedApproval(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionType === 'approve' ? 'Approve Price' : 'Reject Request'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {actionType === 'approve' && (
                <div className="space-y-2">
                  <Label>Approved Price (₹)</Label>
                  <Input 
                    type="number" 
                    value={priceOverride} 
                    onChange={e => setPriceOverride(e.target.value)} 
                  />
                  <p className="text-xs text-slate-500">System calculated: ₹{selectedApproval?.fetched_price}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>{actionType === 'approve' ? 'Notes (Optional)' : 'Rejection Reason'}</Label>
                <Textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder={actionType === 'reject' ? "Explain why..." : "Internal notes..."}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedApproval(null)}>Cancel</Button>
              <Button 
                variant={actionType === 'approve' ? 'default' : 'destructive'} 
                onClick={handleSubmit}
              >
                {actionType === 'approve' ? 'Approve & Send' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DataErrorBoundary>
  );
};

export default PriceApprovalDashboard;