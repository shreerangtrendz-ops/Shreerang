import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DesignService } from '@/services/DesignService';
import { format } from 'date-fns';
import { Loader2, Search, FileImage } from 'lucide-react';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const DesignHistoryPage = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchDesigns();
  }, [page, search]);

  const fetchDesigns = async () => {
    setLoading(true);
    try {
        const { data } = await DesignService.listDesigns({ page, limit: 10, search });
        setDesigns(ensureArray(data, 'DesignHistoryPage'));
    } catch (e) {
        logError(e, 'DesignHistoryPage fetch');
        setDesigns([]);
    } finally {
        setLoading(false);
    }
  };

  const handleSearch = (e) => {
      e.preventDefault();
      setPage(1);
      fetchDesigns();
  };

  const safeDesigns = ensureArray(designs);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Design History</title></Helmet>
      <AdminPageHeader 
        title="Design History" 
        description="View all uploaded designs and their AI descriptions."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Design History'}]}
      />

      <Card>
          <div className="p-4 border-b flex justify-between items-center">
              <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full">
                  <Input 
                    placeholder="Search by Design No or Keyword..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Button type="submit" variant="ghost" size="icon"><Search className="h-4 w-4"/></Button>
              </form>
          </div>
          <CardContent className="p-0">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-[80px]">Image</TableHead>
                          <TableHead>Design Number</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Description (AI)</TableHead>
                          <TableHead>Uploaded</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {loading ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin h-6 w-6 mx-auto text-blue-500"/></TableCell></TableRow>
                      ) : safeDesigns.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No designs found.</TableCell></TableRow>
                      ) : (
                          safeDesigns.map((design) => (
                              <TableRow key={design.id}>
                                  <TableCell>
                                      <div className="h-12 w-12 rounded bg-slate-100 overflow-hidden border">
                                          {design.image_url ? (
                                              <img src={design.image_url} alt={design.design_number} className="h-full w-full object-cover"/>
                                          ) : <FileImage className="h-6 w-6 m-3 text-slate-300"/>}
                                      </div>
                                  </TableCell>
                                  <TableCell className="font-medium">{design.design_number}</TableCell>
                                  <TableCell>{design.fabric_master?.sku || '-'}</TableCell>
                                  <TableCell className="max-w-md truncate text-slate-500" title={design.ai_description}>
                                      {design.ai_description || 'No description'}
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-500">
                                      {design.created_at ? format(new Date(design.created_at), 'MMM d, yyyy') : '-'}
                                  </TableCell>
                              </TableRow>
                          ))
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
      
      <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Button variant="outline" disabled={safeDesigns.length < 10} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
};

export default DesignHistoryPage;