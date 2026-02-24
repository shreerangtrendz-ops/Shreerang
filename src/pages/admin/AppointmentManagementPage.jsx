import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Info } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useNavigate } from 'react-router-dom';

const AppointmentManagementPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setAppointments([]);
    } else {
      setAppointments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleStatusChange = (id, newStatus) => {
    toast({ title: 'Simulated', description: `Would change status to ${newStatus}` });
  };
  
  const getStatusVariant = (status) => {
    switch (status) {
        case 'confirmed': return 'default';
        case 'pending': return 'secondary';
        case 'cancelled': return 'destructive';
        default: return 'outline';
    }
  }

  return (
    <>
      <Helmet><title>Appointments - Admin</title></Helmet>
      <div className="space-y-6">
        <AdminPageHeader 
          title="Appointment Management" 
          breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Appointments' }]}
          onBack={() => navigate('/admin')}
        />
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          {loading ? (
            <p>Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No appointments scheduled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-medium">
                        {format(new Date(appt.appointment_date), 'PPP')} <br/>
                        <span className="text-xs text-muted-foreground">{appt.appointment_time}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{appt.name}</div>
                        <div className="text-xs text-gray-500">{appt.email}</div>
                      </td>
                      <td className="p-3">{appt.purpose}</td>
                      <td className="p-3">
                        <Badge variant={getStatusVariant(appt.status)}>{appt.status}</Badge>
                      </td>
                      <td className="p-3 space-x-2">
                        {appt.status === 'pending' && (
                          <>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStatusChange(appt.id, 'confirmed')}>
                                <Check className="h-4 w-4" />
                            </Button>
                             <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusChange(appt.id, 'cancelled')}>
                                <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AppointmentManagementPage;