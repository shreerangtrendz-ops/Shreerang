import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Plus } from 'lucide-react';
import { MODULES, ROLES, getRoleLabel } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RoleManagement = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('permission_settings').select('*');
    if (!error && data) {
      setPermissions(data);
    }
    setLoading(false);
  };

  const handlePermissionChange = (role, module, field, checked) => {
    setPermissions(prev => {
      const existingIndex = prev.findIndex(p => p.role === role && p.module === module);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], [field]: checked };
        return updated;
      } else {
        return [...prev, { role, module, [field]: checked }];
      }
    });
  };

  const savePermissions = async () => {
    setSaving(true);
    const { error } = await supabase.from('permission_settings').upsert(permissions, { onConflict: 'role, module' });
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Permissions updated successfully.' });
    }
    setSaving(false);
  };

  const getPermission = (role, module, field) => {
    const perm = permissions.find(p => p.role === role && p.module === module);
    return perm ? perm[field] : false;
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></div>;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Role & Permission Manager</CardTitle>
          <CardDescription>Configure granular access control for each role.</CardDescription>
        </div>
        <Button onClick={savePermissions} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
          Save Changes
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={Object.values(ROLES)[0]}>
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-start mb-4">
             {Object.values(ROLES).map(role => (
               <TabsTrigger key={role} value={role} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
                 {getRoleLabel(role)}
               </TabsTrigger>
             ))}
          </TabsList>
          
          {Object.values(ROLES).map(role => (
            <TabsContent key={role} value={role}>
               <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Module</TableHead>
                      <TableHead className="text-center">View</TableHead>
                      <TableHead className="text-center">Add</TableHead>
                      <TableHead className="text-center">Edit</TableHead>
                      <TableHead className="text-center">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(MODULES).map(module => (
                      <TableRow key={module}>
                        <TableCell className="font-medium capitalize">{module.replace('_', ' ')}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={getPermission(role, module, 'can_view')}
                            onCheckedChange={(c) => handlePermissionChange(role, module, 'can_view', c)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={getPermission(role, module, 'can_add')}
                            onCheckedChange={(c) => handlePermissionChange(role, module, 'can_add', c)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={getPermission(role, module, 'can_edit')}
                            onCheckedChange={(c) => handlePermissionChange(role, module, 'can_edit', c)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={getPermission(role, module, 'can_delete')}
                            onCheckedChange={(c) => handlePermissionChange(role, module, 'can_delete', c)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RoleManagement;