import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Plus, Trash2, Edit } from 'lucide-react';

const CATEGORIES = [
  'Fiber Categories', 'Process Types', 'Widths', 'Construction', 
  'Stretchability', 'Transparency', 'Handfeel', 'GSM Tolerance', 
  'Yarn Type', 'Payment Terms', 'VA Types', 'Thread Types', 
  'Dyeing Types', 'Print Types', 'Print Concepts', 'Class', 
  'Tags', 'Ink Types', 'Finish Treatments'
];

const DropdownManager = () => {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newValue, setNewValue] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadOptions();
  }, [selectedCategory]);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('*')
        .eq('category', selectedCategory)
        .order('value');
      
      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    
    try {
      const { error } = await supabase
        .from('dropdown_options')
        .insert([{ category: selectedCategory, value: newValue.trim(), is_active: true }]);
        
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Option added successfully' });
      setNewValue('');
      loadOptions();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('dropdown_options').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Option deleted successfully' });
      loadOptions();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dropdown Manager</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Select Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <form onSubmit={handleAdd} className="flex gap-2 items-end">
            <div className="space-y-2 flex-1">
              <Label>New Option Value</Label>
              <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Enter new value..." />
            </div>
            <Button type="submit" disabled={!newValue.trim()}>
              <Plus className="w-4 h-4 mr-2" /> Add Option
            </Button>
          </form>

          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No options found for this category.</TableCell></TableRow>
                  ) : (
                    options.map(opt => (
                      <TableRow key={opt.id}>
                        <TableCell className="font-medium">{opt.value}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(opt.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DropdownManager;