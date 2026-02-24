import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

const ImportHistoryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [imports, setImports] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('imports')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setImports(data || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">Success</Badge>;
      case 'completed_with_errors': return <Badge className="bg-yellow-500">Partial Error</Badge>;
      case 'failed': return <Badge className="bg-red-500">Failed</Badge>;
      case 'processing': return <Badge className="bg-blue-500">Processing</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto pb-20">
      <Helmet><title>Import History</title></Helmet>
      
      <AdminPageHeader 
        title="Import History" 
        breadcrumbs={[
          { label: 'Fabric Master', href: '/admin/fabric-master' },
          { label: 'Bulk Import', href: '/admin/fabric/bulk-import' },
          { label: 'History' }
        ]}
        onBack={() => navigate('/admin/fabric/bulk-import')}
      />

      <Card className="mt-6">
         <CardContent className="p-0">
           {loading ? (
             <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Date</TableHead>
                   <TableHead>Type</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Total Items</TableHead>
                   <TableHead>Success</TableHead>
                   <TableHead>Failed</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {imports.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center py-8 text-slate-500">No import history found</TableCell>
                   </TableRow>
                 ) : (
                   imports.map(item => (
                     <TableRow key={item.id}>
                       <TableCell>{format(new Date(item.created_at), 'PPp')}</TableCell>
                       <TableCell className="capitalize">{item.import_type.replace(/_/g, ' ')}</TableCell>
                       <TableCell>{getStatusBadge(item.status)}</TableCell>
                       <TableCell>{item.total_items}</TableCell>
                       <TableCell className="text-green-600 font-medium">{item.successful_items}</TableCell>
                       <TableCell className={item.failed_items > 0 ? "text-red-600 font-medium" : ""}>{item.failed_items}</TableCell>
                     </TableRow>
                   ))
                 )}
               </TableBody>
             </Table>
           )}
         </CardContent>
      </Card>
    </div>
  );
};

export default ImportHistoryPage;