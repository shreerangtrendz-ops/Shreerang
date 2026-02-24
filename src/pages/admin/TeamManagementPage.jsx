import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { createClient } from '@supabase/supabase-js';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  UserPlus, Shield, Mail, Phone, Trash2, Loader2, AlertCircle
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ModuleInstructions from '@/components/admin/ModuleInstructions';
import { useNavigate } from 'react-router-dom';
import { ROLES, hasPermission, MODULES, getRoleLabel } from '@/lib/rbac';
import { useActivityLog } from '@/hooks/useActivityLog';

const ROLE_OPTIONS = Object.values(ROLES).map(role => ({
    value: role,
    label: getRoleLabel(role)
}));

const TeamManagementPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logActivity } = useActivityLog();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: ROLES.SALES_MANAGER,
    phone: '',
    agencyName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        // Filter for any of our defined admin/staff roles
        .in('role', Object.values(ROLES))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not load team members." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.fullName) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill in all required fields." });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create user via secondary client to avoid logging out current user
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role
          }
        }
      });

      if (authError) throw authError;

      // Ensure profile exists (in case trigger failed or for custom fields)
      const profileData = {
        id: authData.user.id,
        email: formData.email,
        full_name: formData.fullName,
        role: formData.role,
        phone_number: formData.phone,
        is_approved: true,
        agency_name: formData.role === ROLES.AGENT ? formData.agencyName : null,
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase.from('user_profiles').upsert(profileData);
      if (profileError) throw profileError;

      logActivity('CREATE_USER', MODULES.TEAM, `Added team member ${formData.email} as ${getRoleLabel(formData.role)}`);

      toast({ title: "Team Member Added", description: `${formData.fullName} has been invited.` });
      setIsAddOpen(false);
      setFormData({ email: '', password: '', fullName: '', role: ROLES.SALES_MANAGER, phone: '', agencyName: '' });
      fetchTeam();

    } catch (error) {
      toast({ variant: "destructive", title: "Failed to Create Account", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
     if(!window.confirm("Are you sure? This will remove their access.")) return;
     try {
         // Note: Actually deleting from Auth requires service role which we don't have on client.
         // We will just soft delete or remove from user_profiles to revoke access effectively in our app logic.
         const { error } = await supabase.from('user_profiles').delete().eq('id', userId);
         if(error) throw error;
         
         logActivity('DELETE_USER', MODULES.TEAM, `Removed team member ${userEmail}`);
         toast({ title: "Access Revoked", description: "User profile removed." });
         fetchTeam();
     } catch (error) {
         toast({ variant: "destructive", title: "Error", description: "Could not remove user." });
     }
  };

  return (
    <>
      <Helmet><title>Team Management - Admin</title></Helmet>
      <div className="space-y-6">
        <AdminPageHeader 
            title="Team Management" 
            breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Team' }]}
            onBack={() => navigate('/admin')}
        />

        <div className="flex justify-end">
            <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4"/> Add Team Member
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Staff Directory</CardTitle>
                <CardDescription>Current active team members and their roles.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                        ) : teamMembers.length === 0 ? (
                             <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No team members found.</TableCell></TableRow>
                        ) : (
                            teamMembers.map(member => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">
                                        {member.full_name}
                                        {member.role === ROLES.AGENT && member.agency_name && (
                                            <div className="text-xs text-muted-foreground">Agency: {member.agency_name}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {getRoleLabel(member.role)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-sm">
                                            <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground"/> {member.email}</span>
                                            {member.phone_number && <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground"/> {member.phone_number}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Active</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDeleteUser(member.id, member.email)}
                                            disabled={member.id === user?.id}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <ModuleInstructions module="team" />

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Account</DialogTitle>
                    <DialogDescription>Add a new staff member or agent.</DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateUser} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label>Role Assignment</Label>
                            <Select 
                                value={formData.role} 
                                onValueChange={(val) => setFormData({...formData, role: val})}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ROLE_OPTIONS.map(role => (
                                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Full Name</Label>
                            <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
                        </div>
                        {formData.role === ROLES.AGENT && (
                            <div className="col-span-2 space-y-2">
                                <Label>Agency Name</Label>
                                <Input value={formData.agencyName} onChange={e => setFormData({...formData, agencyName: e.target.value})} required />
                            </div>
                        )}
                        <div className="col-span-2 space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required minLength={6} />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone (Optional)</Label>
                            <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default TeamManagementPage;