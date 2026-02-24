import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

import PurchaseFabricForm from '@/components/admin/costing/PurchaseFabricForm';
import ProcessChargesForm from '@/components/admin/charges/ProcessChargesForm';
import ValueAdditionForm from '@/components/admin/charges/ValueAdditionForm';

import { CostService } from '@/services/CostService';
import { ProcessChargeService } from '@/services/ProcessChargeService';
import { ValueAdditionService } from '@/services/ValueAdditionService';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const CostDatabasePage = () => {
  const { toast } = useToast();
  
  const [purchaseData, setPurchaseData] = useState([]);
  const [processData, setProcessData] = useState([]);
  const [valueAdditionData, setValueAdditionData] = useState([]);
  
  const [search, setSearch] = useState('');
  
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchPurchaseData();
    fetchProcessData();
    fetchValueAdditionData();
  }, []);

  const fetchPurchaseData = async () => {
    try {
        const data = await CostService.listPurchaseFabric({ search });
        setPurchaseData(ensureArray(data, 'CostDatabase purchaseData'));
    } catch(e) { logError(e, 'fetchPurchaseData'); }
  };

  const fetchProcessData = async () => {
    try {
        const data = await ProcessChargeService.listCharges({ search });
        setProcessData(ensureArray(data, 'CostDatabase processData'));
    } catch(e) { logError(e, 'fetchProcessData'); }
  };

  const fetchValueAdditionData = async () => {
    try {
        const data = await ValueAdditionService.listCharges({ search });
        setValueAdditionData(ensureArray(data, 'CostDatabase valueAdditionData'));
    } catch(e) { logError(e, 'fetchValueAdditionData'); }
  };

  const handleDeletePurchase = async (id) => {
    if(!window.confirm("Delete entry?")) return;
    await CostService.deletePurchaseFabric(id);
    fetchPurchaseData();
    toast({ title: "Deleted", description: "Entry removed." });
  };

  const handleDeleteProcess = async (id) => {
    if(!window.confirm("Delete entry?")) return;
    await ProcessChargeService.deleteCharge(id);
    fetchProcessData();
    toast({ title: "Deleted", description: "Process charge removed." });
  };

  const handleDeleteValueAddition = async (id) => {
    if(!window.confirm("Delete entry?")) return;
    await ValueAdditionService.deleteCharge(id);
    fetchValueAdditionData();
    toast({ title: "Deleted", description: "Value addition charge removed." });
  };
  
  const handleEditProcess = (item) => {
      setEditingItem(item);
      setIsProcessModalOpen(true);
  };

  const handleEditValue = (item) => {
      setEditingItem(item);
      setIsValueModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Cost Database</title></Helmet>
      <AdminPageHeader 
        title="Cost Database" 
        description="Track all input costs including fabric purchases, processing, and value additions."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Cost Database'}]}
      />

      <div className="flex justify-end mb-4">
        <div className="relative w-64">
           <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white" />
        </div>
      </div>

      <Tabs defaultValue="purchase" className="w-full">
         <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
             <TabsTrigger value="purchase" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6">Purchase Fabric</TabsTrigger>
             <TabsTrigger value="process" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6">Process Charges</TabsTrigger>
             <TabsTrigger value="value" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6">Value Addition</TabsTrigger>
         </TabsList>

         <TabsContent value="purchase" className="pt-6">
            <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Purchase Fabric Registry</h3>
                <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
                    <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/> New Entry</Button></DialogTrigger>
                    <DialogContent>
                        <PurchaseFabricForm onSuccess={() => { setIsPurchaseModalOpen(false); fetchPurchaseData(); }} onCancel={() => setIsPurchaseModalOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Fabric Type</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ensureArray(purchaseData).map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{item.supplier_name}</TableCell>
                                    <TableCell>{item.fabric_type}</TableCell>
                                    <TableCell>₹{item.price}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleDeletePurchase(item.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {ensureArray(purchaseData).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No entries found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
         </TabsContent>

         <TabsContent value="process" className="pt-6">
            <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Process Charges Registry</h3>
                <Button onClick={() => { setEditingItem(null); setIsProcessModalOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4"/> New Process Charge
                </Button>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Jobwork Unit</TableHead>
                                <TableHead>Process</TableHead>
                                <TableHead>Rate (₹)</TableHead>
                                <TableHead>Shortage %</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ensureArray(processData).map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{item.jobwork_unit_name}</TableCell>
                                    <TableCell>{item.process_type}</TableCell>
                                    <TableCell>₹{item.job_charge}</TableCell>
                                    <TableCell>{item.shortage_pct}%</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEditProcess(item)}>
                                                <Edit className="h-4 w-4 text-slate-500" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteProcess(item.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {ensureArray(processData).length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No process charges found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Dialog open={isProcessModalOpen} onOpenChange={setIsProcessModalOpen}>
                <DialogContent>
                    <ProcessChargesForm 
                        initialData={editingItem}
                        onSuccess={() => { setIsProcessModalOpen(false); fetchProcessData(); }} 
                        onCancel={() => setIsProcessModalOpen(false)} 
                    />
                </DialogContent>
            </Dialog>
         </TabsContent>

         <TabsContent value="value" className="pt-6">
            <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Value Addition Charges</h3>
                <Button onClick={() => { setEditingItem(null); setIsValueModalOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4"/> New Value Addition
                </Button>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Jobwork Unit</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Rate (₹)</TableHead>
                                <TableHead>Shortage %</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ensureArray(valueAdditionData).map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{item.jobwork_unit_name}</TableCell>
                                    <TableCell>{item.process_type}</TableCell>
                                    <TableCell>₹{item.job_charge}</TableCell>
                                    <TableCell>{item.shortage_pct}%</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEditValue(item)}>
                                                <Edit className="h-4 w-4 text-slate-500" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteValueAddition(item.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {ensureArray(valueAdditionData).length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No value addition charges found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Dialog open={isValueModalOpen} onOpenChange={setIsValueModalOpen}>
                <DialogContent>
                    <ValueAdditionForm 
                        initialData={editingItem}
                        onSuccess={() => { setIsValueModalOpen(false); fetchValueAdditionData(); }} 
                        onCancel={() => setIsValueModalOpen(false)} 
                    />
                </DialogContent>
            </Dialog>
         </TabsContent>
      </Tabs>
    </div>
  );
};

export default CostDatabasePage;