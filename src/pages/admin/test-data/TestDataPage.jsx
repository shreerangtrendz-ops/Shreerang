import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Database, Trash2, CheckCircle, RefreshCw } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { SeedService } from '@/lib/seedTestData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TestDataPage = () => {
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [summary, setSummary] = useState(null);
  const { toast } = useToast();

  const handleSeed = async () => {
    setLoading(true);
    try {
      const result = await SeedService.seedAll();
      setSummary(result);
      toast({ title: "Success", description: "Test data seeded successfully." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Seeding Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Are you sure? This will delete all data matching 'Test%' patterns.")) return;
    
    setClearing(true);
    try {
      await SeedService.clearAllTestData();
      setSummary(null);
      toast({ title: "Cleared", description: "Test data removed." });
    } catch (error) {
      toast({ variant: "destructive", title: "Clear Failed", description: error.message });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 pb-24">
      <Helmet><title>Test Data Management | Admin</title></Helmet>
      <AdminPageHeader 
        title="Test Data Seeding" 
        description="Generate sample data for development and testing purposes."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Manage your test environment data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
               <Database className="h-4 w-4" />
               <AlertTitle>Seeding</AlertTitle>
               <AlertDescription>
                 This will create: 20 Fabrics, 10 Units, ~30 Prices, 10 Designs, 5 Costings.
               </AlertDescription>
            </Alert>

            <div className="flex gap-4">
              <Button onClick={handleSeed} disabled={loading || clearing} className="flex-1">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Seed All Data
              </Button>
              <Button onClick={handleClear} disabled={loading || clearing} variant="destructive" className="flex-1">
                {clearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Clear Test Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last Operation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Entity</TableHead><TableHead>Count Created</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell>Fabrics</TableCell><TableCell>{summary.fabrics}</TableCell></TableRow>
                  <TableRow><TableCell>Units</TableCell><TableCell>{summary.units?.jobUnits + summary.units?.vaUnits}</TableCell></TableRow>
                  <TableRow><TableCell>Prices</TableCell><TableCell>{summary.prices?.fabricPrices + summary.prices?.jobPrices + summary.prices?.vaPrices}</TableCell></TableRow>
                  <TableRow><TableCell>Designs</TableCell><TableCell>{summary.designs}</TableCell></TableRow>
                  <TableRow><TableCell>Costings</TableCell><TableCell>{summary.costings}</TableCell></TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity to show.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestDataPage;