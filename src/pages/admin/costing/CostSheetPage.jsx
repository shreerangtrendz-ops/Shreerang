import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Eye, FileText, Trash2, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { CostSheetService } from '@/services/CostSheetService';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ensureArray } from '@/lib/arrayValidation';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';
import { logError } from '@/lib/debugHelpers';

const CostSheetPageContent = () => {
  const { toast } = useToast();
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSheets();
  }, []);

  const loadSheets = async () => {
    setLoading(true);
    try {
      const data = await CostSheetService.listCostSheets();
      setSheets(ensureArray(data, 'CostSheetPage - Sheets'));
    } catch (e) {
      logError(e, 'CostSheetPage loadSheets');
      toast({ variant: "destructive", title: "Error", description: "Failed to load cost sheets." });
    } finally {
      setLoading(false);
    }
  };

  const filteredSheets = ensureArray(sheets).filter(s => 
    (s.design_number || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Helmet><title>Cost Sheets | Admin</title></Helmet>
      
      <AdminPageHeader title="Cost Sheets" description="Manage generated costings" />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Search design number..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Design No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Yield (m)</TableHead>
                <TableHead>Cost/Meter</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400"/></TableCell></TableRow>
              ) : filteredSheets.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24 text-slate-500">No cost sheets found</TableCell></TableRow>
              ) : (
                filteredSheets.map(sheet => (
                  <TableRow key={sheet.id}>
                    <TableCell className="font-medium">{sheet.design_number}</TableCell>
                    <TableCell>{sheet.created_at ? format(new Date(sheet.created_at), 'dd MMM yyyy') : '-'}</TableCell>
                    <TableCell>₹{Number(sheet.total_cost || 0).toLocaleString()}</TableCell>
                    <TableCell>{sheet.final_yield || 0}</TableCell>
                    <TableCell className="font-bold text-blue-600">₹{sheet.cost_per_meter || 0}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const CostSheetPage = () => (
  <DataErrorBoundary>
    <CostSheetPageContent />
  </DataErrorBoundary>
);

export default CostSheetPage;