import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FabricService } from '@/services/FabricService';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import FabricSpecificationTable from '@/components/admin/fabric/FabricSpecificationTable';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, FileDown, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const FabricSpecificationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fabric, setFabric] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFabric = async () => {
      try {
        const data = await FabricService.getFabricById(id);
        setFabric(data);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load fabric details.' });
        navigate('/admin/fabric-master');
      } finally {
        setLoading(false);
      }
    };
    fetchFabric();
  }, [id, navigate, toast]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('spec-sheet');
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Fabric-Spec-${fabric.sku}.pdf`);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!fabric) return null;

  return (
    <div className="p-6 max-w-[1600px] mx-auto pb-20 print:p-0">
      <Helmet><title>Fabric Specification - {fabric.base_fabric_name}</title></Helmet>
      
      <div className="print:hidden">
        <AdminPageHeader 
          title="Fabric Specification Sheet"
          breadcrumbs={[
            { label: 'Fabric Master', href: '/admin/fabric-master' },
            { label: fabric.sku || 'Specification' }
          ]}
          onBack={() => navigate('/admin/fabric-master')}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileDown className="w-4 h-4 mr-2" /> Export PDF
              </Button>
              <Button onClick={() => navigate(`/admin/fabric-master/${id}/edit`)}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
            </div>
          }
        />
      </div>

      <div id="spec-sheet" className="mt-6 bg-white p-8 rounded-lg shadow-sm border border-slate-200 print:shadow-none print:border-none">
        <div className="mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-900">{fabric.base_fabric_name}</h1>
          <p className="text-slate-500 mt-1">SKU: <span className="font-mono font-medium text-slate-700">{fabric.sku}</span></p>
        </div>

        <FabricSpecificationTable fabric={fabric} />

        <div className="mt-8 grid grid-cols-2 gap-8 text-sm text-slate-600 print:mt-12">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Notes</h3>
            <p className="border p-4 rounded-md min-h-[100px] bg-slate-50">
              {fabric.description || 'No additional notes available for this specification.'}
            </p>
          </div>
          <div className="flex flex-col justify-end">
            <div className="border-t pt-4 mt-auto">
              <p className="flex justify-between">
                <span>Created Date:</span>
                <span className="font-medium">{new Date(fabric.created_at).toLocaleDateString()}</span>
              </p>
              <p className="flex justify-between mt-2">
                <span>Last Updated:</span>
                <span className="font-medium">{new Date(fabric.updated_at || fabric.created_at).toLocaleDateString()}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FabricSpecificationView;