import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { JobWorkUnitService } from '@/services/JobWorkUnitService';

const JobUnitsPage = () => {
  const [units, setUnits] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    JobWorkUnitService.getAll().then(setUnits).catch(() => toast({variant: 'destructive', title: 'Error'}));
  }, [toast]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Job Work Units Manager</h1>
        <Button>Add New Job Unit</Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Contact</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {units.map(u => (
                <TableRow key={u.id}>
                  <TableCell>{u.unit_name}</TableCell>
                  <TableCell>{u.unit_type || 'General'}</TableCell>
                  <TableCell>{u.phone}</TableCell>
                  <TableCell><Button variant="ghost" size="sm">Edit</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default JobUnitsPage;