import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import CostingWidget from '@/components/CostingWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CostingService } from '@/services/CostingService';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, FileDown, History } from 'lucide-react';

const CostingWidgetPage = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('calculator');
  
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await CostingService.listCalculationTemplates();
      setTemplates(data || []);
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to load templates", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (name, data) => {
    try {
      await CostingService.saveCalculationTemplate(name, data);
      toast({ title: "Success", description: "Template saved successfully" });
      loadTemplates();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await CostingService.deleteCalculationTemplate(id);
      toast({ title: "Deleted", description: "Template removed." });
      loadTemplates();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleExport = () => {
    if (templates.length === 0) return;
    
    const headers = ['Template Name', 'Grey Rate', 'Dyeing Rate', 'Created At'];
    const rows = templates.map(t => [
      t.parameter_name, 
      t.parameter_value?.greyRate || 0, 
      t.parameter_value?.dyeingRate || 0, 
      new Date(t.created_at).toLocaleDateString()
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "costing_templates.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppShare = (result, inputs) => {
    try {
      const message = CostingService.generateWhatsAppMessage(result, inputs);
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: "WhatsApp Ready",
        description: "Opening WhatsApp with your generated report.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Share Failed",
        description: "Could not generate share link.",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Shreerang Costing Widget | Admin</title></Helmet>
      
      <AdminPageHeader 
        title="Costing Widget" 
        description="Interactive calculator for quick fabric costing estimates and template management."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Costing Widget'}]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="templates">Saved Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-4">
          <CostingWidget 
            onSaveTemplate={handleSaveTemplate}
            onShareWhatsApp={handleWhatsAppShare}
            className="border-t-4 border-t-indigo-600"
          />
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Saved Templates</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={templates.length === 0}>
                <FileDown className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Grey Rate</TableHead>
                      <TableHead>Dyeing Rate</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.length > 0 ? templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.parameter_name}</TableCell>
                        <TableCell>{template.parameter_value?.greyRate || '-'}</TableCell>
                        <TableCell>{template.parameter_value?.dyeingRate || '-'}</TableCell>
                        <TableCell>{new Date(template.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(template.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">No templates saved yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Calculation History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed rounded-lg">
                <History className="h-12 w-12 mb-4 opacity-20" />
                <p>History tracking is enabled locally in current session.</p>
                <p className="text-sm">Server-side history persistence coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CostingWidgetPage;