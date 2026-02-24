import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const generateTimeSlots = () => {
  const slots = [];
  for (let i = 9; i <= 17; i++) {
    slots.push(`${i}:00`);
    if (i < 17) {
      slots.push(`${i}:30`);
    }
  }
  return slots;
};

const AppointmentForm = ({ setDialogOpen }) => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    appointment_date: undefined,
    appointment_time: '',
    purpose: '',
    message: '',
  });

  useEffect(() => {
    if (user && profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.full_name || '',
        email: user.email || '',
        phone: profile.phone || '',
      }));
    }
  }, [user, profile]);

  const timeSlots = generateTimeSlots();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const submissionData = {
        ...formData,
        appointment_date: format(formData.appointment_date, 'yyyy-MM-dd'),
        user_id: user?.id || null
    };

    const { error } = await supabase.functions.invoke('book-appointment', {
        body: submissionData,
    });

    if (error) {
        toast({
            variant: "destructive",
            title: "Booking Failed",
            description: error.message || "An unexpected error occurred.",
        });
    } else {
        toast({
            title: "Appointment Request Sent!",
            description: "We have received your request and will confirm shortly. Check your email for details.",
        });
        setDialogOpen(false);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={formData.name} onChange={handleInputChange} required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required />
        </div>
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Preferred Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.appointment_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.appointment_date ? format(formData.appointment_date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.appointment_date}
                onSelect={(date) => handleSelectChange('appointment_date', date)}
                disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="appointment_time">Preferred Time</Label>
          <Select onValueChange={(value) => handleSelectChange('appointment_time', value)} required>
            <SelectTrigger id="appointment_time">
              <SelectValue placeholder="Select a time slot" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map(slot => (
                <SelectItem key={slot} value={slot}>{slot}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="purpose">Purpose of Visit</Label>
        <Select onValueChange={(value) => handleSelectChange('purpose', value)} required>
          <SelectTrigger id="purpose">
            <SelectValue placeholder="Select a purpose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Product Inquiry">Product Inquiry</SelectItem>
            <SelectItem value="Wholesale Discussion">Wholesale Discussion</SelectItem>
            <SelectItem value="General Inquiry">General Inquiry</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="message">Message (Optional)</Label>
        <Textarea id="message" value={formData.message} onChange={handleInputChange} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Submitting Request...' : 'Request Appointment'}
      </Button>
    </form>
  );
};

export default AppointmentForm;