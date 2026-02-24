import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, Save, RefreshCw, Trash2, Edit2, Loader2, ArrowRight, ArrowLeft, Factory, Printer, Sparkles, Palette, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CostingCalculatorPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    path: '',
    grey_qty: '',
    rate: '',
    brokerage_percentage: '',
    transport: '',
    process_shortages: ''
  });
  
  const [result, setResult] = useState(null);
  const [savedSheets, setSavedSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchCostSheets();
  }, []);

  const fetchCostSheets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('cost_sheets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSavedSheets(data || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load cost history.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const handlePathSelect = (path) => {
    setFormData(prev => ({ ...prev, path }));
    setFormErrors(prev => ({ ...prev, path: null }));
  };

  const validateStep = (currentStep) => {
    const errors = {};
    if (currentStep === 1) {
        if (!formData.path) errors.path = "Please select a costing path";
    } else if (currentStep === 2) {
        ['grey_qty', 'rate', 'brokerage_percentage', 'transport', 'process_shortages'].forEach(field => {
            if (!formData[field] || isNaN(formData[field]) || Number(formData[field]) < 0) {
                errors[field] = "Required positive number";
            }
        });
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const calculateResults = () => {
    const greyCost = Number(formData.grey_qty) * Number(formData.rate);
    const brokerageCost = greyCost * (Number(formData.brokerage_percentage) / 100);
    const transportCost = Number(formData.transport);
    const shortageCost = greyCost * (Number(formData.process_shortages) / 100); 
    
    const totalCost = greyCost + brokerageCost + transportCost + shortageCost;
    
    return {
        greyCost: greyCost.toFixed(2),
        brokerageCost: brokerageCost.toFixed(2),
        transportCost: transportCost.toFixed(2),
        shortageCost: shortageCost.toFixed(2),
        totalCost: totalCost.toFixed(2)
    };
  };

  useEffect(() => {
    if (step === 3) {
        setResult(calculateResults());
    }
  }, [step]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const calcData = calculateResults();
      const payload = {
        calculation_data: { ...formData, ...calcData },
        total_cost: Number(calcData.totalCost),
        created_by: user?.id,
        base_fabric_cost: Number(calcData.greyCost), 
        transport_cost: Number(calcData.transportCost),
        notes: `Path: ${formData.path} | Qty: ${formData.grey_qty}`
      };

      const { error } = await supabase.from('cost_sheets').insert([payload]);
      if (error) throw error;
      
      toast({ title: "Saved", description: "Calculation saved successfully." });
      fetchCostSheets();
      setStep(1);
      setFormData({ path: '', grey_qty: '', rate: '', brokerage_percentage: '', transport: '', process_shortages: '' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("Are you sure?")) return;
    try {
        await supabase.from('cost_sheets').delete().eq('id', id);
        toast({ title: "Deleted", description: "Record removed." });
        fetchCostSheets();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const pathOptions = [
    { id: 'Mill', label: 'Mill Process', icon: Factory, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'Digital', label: 'Digital Print', icon: Printer, color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: 'Schiffli', label: 'Schiffli', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-100' },
    { id: 'Dyed', label: 'Plain Dyed', icon: Palette, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <Helmet><title>Costing Calculator | Admin</title></Helmet>
      <AdminPageHeader title="Costing Calculator" description="Multi-step fabric cost estimation." breadcrumbs={[{label: 'Admin', href: '/admin'}, {label: 'Costing'}]} />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
            <CardTitle>Step {step} of 3: {step === 1 ? 'Select Path' : step === 2 ? 'Enter Costs' : 'Review & Save'}</CardTitle>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-slate-900 h-full transition-all duration-300 ease-out" style={{ width: `${(step/3)*100}%` }}></div>
            </div>
        </CardHeader>
        <CardContent className="pt-6 min-h-[400px]">
            {step === 1 && (
                <div className="space-y-6">
                    <Label className="text-lg">Select Processing Path</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {pathOptions.map((option) => {
                            const Icon = option.icon;
                            const isSelected = formData.path === option.id;
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handlePathSelect(option.id)}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group",
                                        isSelected 
                                            ? "border-slate-900 bg-slate-50 shadow-md" 
                                            : "border-slate-100 bg-white hover:border-slate-300"
                                    )}
                                >
                                    <div className={cn("p-4 rounded-full mb-4 transition-colors", isSelected ? "bg-white shadow-sm" : option.bg)}>
                                        <Icon className={cn("h-8 w-8", option.color)} />
                                    </div>
                                    <span className={cn("font-semibold text-lg", isSelected ? "text-slate-900" : "text-slate-600")}>
                                        {option.label}
                                    </span>
                                    {isSelected && (
                                        <div className="absolute top-3 right-3 text-slate-900">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {formErrors.path && <p className="text-center text-red-500 font-medium animate-pulse">{formErrors.path}</p>}
                </div>
            )}

            {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-3xl mx-auto">
                    <div className="space-y-2">
                        <Label>Grey Quantity (Mtrs) *</Label>
                        <Input type="number" name="grey_qty" value={formData.grey_qty} onChange={handleInputChange} className={formErrors.grey_qty ? "border-red-500 focus:ring-red-200" : ""} placeholder="e.g. 1000" />
                        {formErrors.grey_qty && <span className="text-xs text-red-500">{formErrors.grey_qty}</span>}
                    </div>
                    <div className="space-y-2">
                        <Label>Rate (₹/Mtr) *</Label>
                        <Input type="number" name="rate" value={formData.rate} onChange={handleInputChange} className={formErrors.rate ? "border-red-500 focus:ring-red-200" : ""} placeholder="0.00" />
                         {formErrors.rate && <span className="text-xs text-red-500">{formErrors.rate}</span>}
                    </div>
                    <div className="space-y-2">
                        <Label>Brokerage (%) *</Label>
                        <Input type="number" name="brokerage_percentage" value={formData.brokerage_percentage} onChange={handleInputChange} className={formErrors.brokerage_percentage ? "border-red-500 focus:ring-red-200" : ""} placeholder="2" />
                    </div>
                    <div className="space-y-2">
                        <Label>Transport Cost (Total ₹) *</Label>
                        <Input type="number" name="transport" value={formData.transport} onChange={handleInputChange} className={formErrors.transport ? "border-red-500 focus:ring-red-200" : ""} placeholder="500" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Process Shortage (%) *</Label>
                        <Input type="number" name="process_shortages" value={formData.process_shortages} onChange={handleInputChange} className={formErrors.process_shortages ? "border-red-500 focus:ring-red-200" : ""} placeholder="5" />
                    </div>
                </div>
            )}

            {step === 3 && result && (
                <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 space-y-6 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                        <h3 className="font-bold text-xl text-slate-900">Cost Breakdown</h3>
                        <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {pathOptions.find(p => p.id === formData.path)?.label}
                        </div>
                    </div>
                    <div className="space-y-3 text-sm md:text-base">
                        <div className="flex justify-between items-center text-slate-600">
                            <span>Grey Cost ({formData.grey_qty} mtrs @ ₹{formData.rate})</span>
                            <span className="font-mono font-medium">₹{result.greyCost}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                            <span>Brokerage ({formData.brokerage_percentage}%)</span>
                            <span className="font-mono font-medium">₹{result.brokerageCost}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                            <span>Transport</span>
                            <span className="font-mono font-medium">₹{result.transportCost}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                            <span>Shortage ({formData.process_shortages}%)</span>
                            <span className="font-mono font-medium">₹{result.shortageCost}</span>
                        </div>
                        <div className="border-t-2 border-slate-300 pt-4 flex justify-between items-center">
                            <span className="font-bold text-lg text-slate-900">Total Cost</span>
                            <span className="font-bold text-2xl text-slate-900">₹{result.totalCost}</span>
                        </div>
                         <div className="flex justify-end text-slate-500 text-sm">
                            <span>≈ ₹{(Number(result.totalCost)/Number(formData.grey_qty)).toFixed(2)} per meter</span>
                        </div>
                    </div>
                </div>
            )}
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-slate-50/50 p-6">
            <Button variant="outline" onClick={step === 1 ? () => {} : handleBack} disabled={step === 1} className="w-32">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
                <Button onClick={handleNext} className="w-32 bg-slate-900 hover:bg-slate-800">
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            ) : (
                <Button onClick={handleSave} disabled={isSubmitting} className="w-40 bg-green-600 hover:bg-green-700 text-white">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Record
                </Button>
            )}
        </CardFooter>
      </Card>

      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">Calculation History</h3>
            <Button variant="outline" size="sm" onClick={fetchCostSheets} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refresh
            </Button>
        </div>
        
        <Card className="overflow-hidden border-slate-200">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead>Date</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {savedSheets.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                No history found. Start a new calculation above.
                            </TableCell>
                        </TableRow>
                    ) : (
                        savedSheets.map(sheet => (
                            <TableRow key={sheet.id} className="hover:bg-slate-50">
                                <TableCell className="font-medium text-slate-600">
                                    {new Date(sheet.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                        {sheet.calculation_data?.path || 'N/A'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-sm text-slate-500 max-w-xs truncate" title={sheet.notes}>
                                    {sheet.notes || '-'}
                                </TableCell>
                                <TableCell className="font-bold text-slate-900">₹{sheet.total_cost}</TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDelete(sheet.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>
      </div>
    </div>
  );
};

export default CostingCalculatorPage;