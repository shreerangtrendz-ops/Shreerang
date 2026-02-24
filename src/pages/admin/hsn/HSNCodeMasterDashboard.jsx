import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Layers, Shirt, CreditCard } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import HSNCodeTable from '@/components/admin/hsn/HSNCodeTable';
import HSNCodeModal from '@/components/admin/hsn/HSNCodeModal';
import { ProcessHSNService, ValueAdditionHSNService, ExpenseHSNService, GarmentHSNService } from '@/services/HSNCodeService';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const HSNCodeMasterDashboard = () => {
  const [activeTab, setActiveTab] = useState('process');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const getService = () => {
    switch(activeTab) {
      case 'process': return ProcessHSNService;
      case 'value_addition': return ValueAdditionHSNService;
      case 'expense': return ExpenseHSNService;
      case 'garment': return GarmentHSNService;
      default: return ProcessHSNService;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getService().getAll();
      setData(result || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this HSN Code?')) {
      try {
        await getService().delete(id);
        fetchData();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const filteredData = data.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const name = item.process_name || item.value_addition_name || item.expense_name || item.garment_name || '';
    const hsn = item.hsn_code || '';
    return name.toLowerCase().includes(searchLower) || hsn.toLowerCase().includes(searchLower);
  });

  const getTabLabel = (tab) => {
      switch(tab) {
          case 'process': return 'Process';
          case 'value_addition': return 'Value Addition';
          case 'expense': return 'Expenses';
          case 'garment': return 'Garments';
          default: return '';
      }
  }

  const getNameField = () => {
    switch(activeTab) {
        case 'process': return 'Process Name';
        case 'value_addition': return 'Value Addition';
        case 'expense': return 'Expense Name';
        case 'garment': return 'Garment Name';
        default: return 'Name';
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <Helmet><title>HSN Code Master</title></Helmet>
      <AdminPageHeader 
        title="HSN Code Master" 
        description="Manage HSN codes and GST rates for all system categories."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'HSN Master'}]}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder={`Search ${getTabLabel(activeTab)} HSN...`} 
            className="pl-9 bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => { setEditItem(null); setModalOpen(true); }} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Add {getTabLabel(activeTab)} HSN
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full h-auto">
          <TabsTrigger value="process" className="py-3 gap-2">
            <Layers className="h-4 w-4" /> Process HSN
          </TabsTrigger>
          <TabsTrigger value="value_addition" className="py-3 gap-2">
            <SparklesIcon className="h-4 w-4" /> Value Addition
          </TabsTrigger>
          <TabsTrigger value="garment" className="py-3 gap-2">
            <Shirt className="h-4 w-4" /> Garments
          </TabsTrigger>
          <TabsTrigger value="expense" className="py-3 gap-2">
            <CreditCard className="h-4 w-4" /> Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <LoadingSpinner fullHeight />
          ) : (
            <HSNCodeTable 
              data={filteredData} 
              nameField={getNameField()}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </TabsContent>
      </Tabs>

      <HSNCodeModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        initialData={editItem}
        type={activeTab}
        service={getService()}
        refreshData={fetchData}
      />
    </div>
  );
};

// Helper Icon Component since Sparkles is used elsewhere
const SparklesIcon = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 5H5"/><path d="M19 21v-4"/><path d="M15 19h4"/></svg>
);

export default HSNCodeMasterDashboard;