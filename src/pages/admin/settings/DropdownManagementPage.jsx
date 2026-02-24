import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { DropdownManagementService } from '@/services/DropdownManagementService';
import { DropdownAISuggestionService } from '@/services/DropdownAISuggestionService';
import { initializeDropdowns, reseedDropdownData } from '@/lib/seedDropdownOptions';
import { verifyDropdownData } from '@/lib/verifyDropdownData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Edit, Trash2, Search, ArrowUpDown, Sparkles, RefreshCw, CheckCircle, AlertTriangle, Database, Terminal } from 'lucide-react';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const DropdownManagementPage = () => {
  // --- STATE ---
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [options, setOptions] = useState([]);
  
  // Loading & Error States
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationStats, setVerificationStats] = useState(null);

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'asc' });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ value: '', code: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // AI State
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const { toast } = useToast();

  // --- INITIALIZATION ---
  useEffect(() => {
    initPage();
  }, []);

  const initPage = async () => {
    await verifyAndSeed();
    await fetchCategories();
  };

  const verifyAndSeed = async () => {
    setVerifying(true);
    try {
      // First try to init if empty
      await initializeDropdowns(); 
      // Then verify stats
      const stats = await verifyDropdownData();
      setVerificationStats(stats);
      if (!stats.isValid) {
        toast({ variant: 'warning', title: 'Data Issues Detected', description: 'Some categories might be empty.' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleManualReseed = async () => {
    if (!confirm("This will add any missing default options to the database. It will NOT delete existing data. Continue?")) return;
    
    setVerifying(true);
    try {
      const result = await reseedDropdownData();
      if (result.success) {
        toast({ title: "Reseed Complete", description: `Added ${result.insertedCount} new options.` });
        await verifyAndSeed(); // Refresh stats
        await fetchCategories(); // Refresh categories
        if (selectedCategory) await fetchOptions(selectedCategory); // Refresh current list
      } else {
        toast({ variant: "destructive", title: "Reseed Failed", description: "Check console for details." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const fetchCategories = async () => {
    setLoadingCats(true);
    try {
      const data = await DropdownManagementService.getAllCategories();
      setCategories(data);
      if (data.length > 0 && !selectedCategory) {
        // Auto select first
        setSelectedCategory(data[0].category_name);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Load Error', description: 'Failed to load categories.' });
    } finally {
      setLoadingCats(false);
    }
  };

  // Fetch options when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchOptions(selectedCategory);
    }
  }, [selectedCategory]);

  const fetchOptions = async (catName) => {
    setLoadingOptions(true);
    try {
      const data = await DropdownManagementService.getDropdownsByCategory(catName);
      setOptions(data);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Options Error', description: `Failed to load options for ${catName}` });
    } finally {
      setLoadingOptions(false);
    }
  };

  // --- HANDLERS ---
  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredOptions = options
    .filter(opt => 
      opt.option_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      opt.option_code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortConfig.key === 'value' ? 'option_name' : 'option_code']?.toLowerCase() || '';
      const bVal = b[sortConfig.key === 'value' ? 'option_name' : 'option_code']?.toLowerCase() || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const openAddModal = () => {
    setCurrentItem(null);
    setFormData({ value: '', code: '' });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentItem(item);
    setFormData({ value: item.option_name, code: item.option_code });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openAIModal = () => {
    setIsAIModalOpen(true);
    fetchAISuggestions();
  };

  const fetchAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const suggestions = await DropdownAISuggestionService.getSuggestionsForCategory(
        selectedCategory, 
        options.map(o => o.option_name)
      );
      setAiSuggestions(suggestions);
    } catch (error) {
      toast({ variant: 'destructive', title: 'AI Error', description: 'Failed to get suggestions' });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleUseSuggestion = (suggestion) => {
    setFormData({ value: suggestion.value, code: suggestion.code });
    setIsAIModalOpen(false);
    setIsEditModalOpen(true);
    setFormErrors({});
  };

  // --- CRUD OPERATIONS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    
    // Validations
    const errors = {};
    if (!formData.value.trim()) errors.value = "Required";
    // if (!formData.code.trim()) errors.code = "Required"; // Code optional
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      if (currentItem) {
        await DropdownManagementService.updateDropdownOption(currentItem.id, formData.value, formData.code);
        toast({ title: "Success", description: "Option updated successfully" });
      } else {
        await DropdownManagementService.addDropdownOption(selectedCategory, formData.value, formData.code);
        toast({ title: "Success", description: "Option added successfully" });
      }
      setIsEditModalOpen(false);
      fetchOptions(selectedCategory);
      verifyAndSeed(); // Update counts
    } catch (error) {
      toast({ variant: "destructive", title: "Operation Failed", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentItem) return;
    setSubmitting(true);
    try {
      await DropdownManagementService.deleteDropdownOption(currentItem.id);
      toast({ title: "Deleted", description: "Option removed" });
      setIsDeleteModalOpen(false);
      fetchOptions(selectedCategory);
      verifyAndSeed();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto pb-20 p-6">
        <Helmet><title>Dropdown Management | Admin</title></Helmet>
        
        <AdminPageHeader 
          title="Dropdown Management" 
          description="Manage standard values for dropdowns across the system."
          actions={
            <div className="flex gap-2">
              <Button onClick={openAddModal} className="bg-slate-900 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Option
              </Button>
            </div>
          }
        />

        {/* Debug / Verification Panel */}
        <Accordion type="single" collapsible className="w-full bg-slate-50 border rounded-lg px-4">
          <AccordionItem value="debug">
            <AccordionTrigger className="text-sm font-semibold text-slate-700 hover:no-underline">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" /> 
                System Health & Debugging
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2 pb-4">
                <div className="flex flex-wrap gap-2 mb-4">
                   <Button variant="outline" size="sm" onClick={verifyAndSeed} disabled={verifying}>
                    <RefreshCw className={`h-3 w-3 mr-2 ${verifying ? 'animate-spin' : ''}`} />
                    Verify Data
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleManualReseed} disabled={verifying}>
                    <Database className="h-3 w-3 mr-2" />
                    Reseed Missing Defaults
                  </Button>
                </div>
                
                {verificationStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="shadow-sm">
                      <CardContent className="p-3">
                        <p className="text-xs text-slate-500 uppercase font-bold">Total Categories</p>
                        <p className="text-xl font-mono">{verificationStats.categoriesFound}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                       <CardContent className="p-3">
                        <p className="text-xs text-slate-500 uppercase font-bold">Total Options</p>
                        <p className="text-xl font-mono">{verificationStats.totalOptions}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                       <CardContent className="p-3">
                        <p className="text-xs text-slate-500 uppercase font-bold">Status</p>
                        <div className="flex items-center gap-2">
                          {verificationStats.isValid ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Healthy</Badge>
                          ) : (
                            <Badge variant="destructive">Issues Found</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {verificationStats?.errors?.length > 0 && (
                  <div className="bg-red-50 p-3 rounded text-xs text-red-700 font-mono mt-2">
                    {verificationStats.errors.map((e, i) => <div key={i}>• {e}</div>)}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>


        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <Card className="md:col-span-1 h-[600px] flex flex-col">
            <CardHeader className="py-4 border-b"><CardTitle className="text-sm font-medium">Categories</CardTitle></CardHeader>
            <div className="flex-1 overflow-y-auto">
              {loadingCats ? (
                <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400"/></div>
              ) : (
                <div className="flex flex-col p-1">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.category_name)}
                      className={`text-left px-3 py-2 text-sm rounded-md transition-colors flex justify-between items-center ${selectedCategory === cat.category_name ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span className="truncate capitalize">{cat.category_name.replace(/_/g, ' ')}</span>
                      {verificationStats?.categoryCounts && (
                        <Badge variant="secondary" className="text-[10px] h-5 min-w-[1.5rem] justify-center">
                          {verificationStats.categoryCounts[cat.category_name] || 0}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Options Table */}
          <Card className="md:col-span-3 h-[600px] flex flex-col">
             <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
               <div>
                 <CardTitle className="text-lg capitalize flex items-center gap-2">
                   {selectedCategory?.replace(/_/g, ' ')}
                   {loadingOptions && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                 </CardTitle>
               </div>
               <div className="flex items-center gap-2">
                 <Button variant="secondary" size="sm" onClick={openAIModal} className="hidden md:flex">
                   <Sparkles className="h-4 w-4 mr-2 text-purple-600" /> AI Suggestions
                 </Button>
                 <div className="relative w-48">
                   <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                   <Input 
                     placeholder="Search..." 
                     className="pl-9 h-9" 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </div>
               </div>
             </CardHeader>
             <div className="flex-1 overflow-hidden p-0">
               <div className="h-full overflow-y-auto">
                 <Table>
                   <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                     <TableRow>
                       <TableHead className="cursor-pointer" onClick={() => handleSort('value')}>
                         Value {sortConfig.key === 'value' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                       </TableHead>
                       <TableHead className="cursor-pointer" onClick={() => handleSort('code')}>
                         Code {sortConfig.key === 'code' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                       </TableHead>
                       <TableHead className="w-[100px] text-right">Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {loadingOptions ? (
                       Array(5).fill(0).map((_, i) => (
                         <TableRow key={i}><TableCell colSpan={3} className="h-12"><div className="h-4 bg-slate-100 rounded w-full animate-pulse"></div></TableCell></TableRow>
                       ))
                     ) : filteredOptions.length === 0 ? (
                       <TableRow><TableCell colSpan={3} className="h-32 text-center text-slate-500">No options found. Try adding one.</TableCell></TableRow>
                     ) : (
                       filteredOptions.map((opt) => (
                         <TableRow key={opt.id} className="hover:bg-slate-50/50">
                           <TableCell className="font-medium">{opt.option_name}</TableCell>
                           <TableCell className="font-mono text-xs text-slate-500">{opt.option_code}</TableCell>
                           <TableCell className="text-right space-x-1">
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(opt)}>
                               <Edit className="h-4 w-4 text-slate-500" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentItem(opt); setIsDeleteModalOpen(true); }}>
                               <Trash2 className="h-4 w-4 text-red-500" />
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))
                     )}
                   </TableBody>
                 </Table>
               </div>
             </div>
          </Card>
        </div>

        {/* Add/Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentItem ? 'Edit Option' : 'Add New Option'}</DialogTitle>
              <DialogDescription>
                {selectedCategory?.replace(/_/g, ' ')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Value</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.value} 
                    onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="e.g. Cotton"
                    className={formErrors.value ? "border-red-500" : ""}
                  />
                  {!currentItem && (
                    <Button type="button" size="icon" variant="outline" onClick={openAIModal} title="Get AI Suggestions">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                    </Button>
                  )}
                </div>
                {formErrors.value && <p className="text-xs text-red-500">{formErrors.value}</p>}
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input 
                  value={formData.code} 
                  onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g. CTN"
                  className={formErrors.code ? "border-red-500" : ""}
                />
                {formErrors.code && <p className="text-xs text-red-500">{formErrors.code}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* AI Suggestions Modal */}
        <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" /> AI Suggestions
              </DialogTitle>
              <DialogDescription>
                Generating smart suggestions for <strong>{selectedCategory?.replace(/_/g, ' ')}</strong>...
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6">
              {loadingAI ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  <p className="text-sm text-slate-500 animate-pulse">Consulting AI Knowledge Base...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {aiSuggestions.length === 0 ? (
                    <p className="text-center text-slate-500">No new suggestions found.</p>
                  ) : (
                    aiSuggestions.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors group">
                        <div>
                          <p className="font-medium text-sm">{s.value}</p>
                          <p className="text-xs text-slate-400 font-mono">{s.code}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={() => handleUseSuggestion(s)}>
                          Use This
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAIModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle></DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to delete <strong>{currentItem?.option_name}</strong>?</p>
              <p className="text-xs text-slate-500 mt-2">This will remove it from future selections, but historical data will remain intact.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageErrorBoundary>
  );
};

export default DropdownManagementPage;