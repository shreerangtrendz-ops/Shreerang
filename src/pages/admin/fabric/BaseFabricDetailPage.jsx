import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const DetailRow = ({ label, value }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 py-3 border-b last:border-0">
    <div className="font-medium text-slate-500">{label}</div>
    <div className="md:col-span-2 font-medium text-slate-900">{value || '-'}</div>
  </div>
);

const BaseFabricDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fabric, setFabric] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('base_fabrics').select('*').eq('id', id).single();
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load details' });
      navigate('/fabric-sku/base');
    } else {
      setFabric(data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this fabric permanently?')) return;
    const { error } = await supabase.from('base_fabrics').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted', description: 'Fabric removed' });
      navigate('/fabric-sku/base');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!fabric) return null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Button variant="ghost" className="mb-6" onClick={() => navigate('/fabric-sku/base')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
      </Button>

      <Card className="shadow-lg overflow-hidden">
        <CardHeader className="bg-slate-50 border-b flex flex-row justify-between items-center">
          <CardTitle>Base Fabric Details</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/fabric-sku/base/${id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
            <div className="text-sm text-blue-600 font-semibold uppercase tracking-wider mb-1">Generated Name</div>
            <div className="text-xl font-bold text-blue-900 mb-4">{fabric.generated_name}</div>
            
            <div className="text-sm text-blue-600 font-semibold uppercase tracking-wider mb-1">Generated SKU</div>
            <div className="font-mono text-lg bg-white inline-block px-3 py-1 rounded border border-blue-200 text-blue-800">
              {fabric.generated_sku}
            </div>
          </div>

          <div className="space-y-1">
            <DetailRow label="Fabric Name" value={fabric.fabric_name} />
            <DetailRow label="Width" value={fabric.width} />
            <DetailRow label="Process" value={fabric.process} />
            <DetailRow label="Created At" value={new Date(fabric.created_at).toLocaleString()} />
            <DetailRow label="Last Updated" value={new Date(fabric.updated_at || fabric.created_at).toLocaleString()} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BaseFabricDetailPage;