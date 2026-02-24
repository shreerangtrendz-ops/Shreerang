import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { JobWorkerService } from '@/services/JobWorkerService';

const JobWorkerForm = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        worker_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        specialization: '',
        rate: '',
        rate_unit: 'Piece',
        bank_account_number: '',
        bank_name: '',
        ifsc_code: '',
        account_holder_name: '',
        status: 'active',
        notes: ''
    });

    useEffect(() => {
        if (isEdit) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await JobWorkerService.fetchById(id);
            if (data) setFormData(data);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to load worker details" });
            navigate('/admin/job-workers');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.worker_name) return toast({ variant: 'destructive', title: "Error", description: "Worker name is required" });
        if (!formData.phone) return toast({ variant: 'destructive', title: "Error", description: "Phone number is required" });
        if (!formData.specialization) return toast({ variant: 'destructive', title: "Error", description: "Specialization is required" });

        setLoading(true);
        try {
            if (isEdit) {
                await JobWorkerService.update(id, formData);
                toast({ title: "Success", description: "Job worker updated successfully" });
            } else {
                await JobWorkerService.create(formData);
                toast({ title: "Success", description: "Job worker created successfully" });
            }
            navigate('/admin/job-workers');
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <Helmet><title>{isEdit ? 'Edit Job Worker' : 'New Job Worker'}</title></Helmet>
            <AdminPageHeader 
                title={isEdit ? 'Edit Job Worker' : 'Add New Job Worker'} 
                breadcrumbs={[{label: 'Job Workers', href: '/admin/job-workers'}, {label: isEdit ? 'Edit' : 'New'}]}
                onBack={() => navigate('/admin/job-workers')}
            />

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                    <Card>
                        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Worker Name <span className="text-red-500">*</span></Label>
                                    <Input value={formData.worker_name} onChange={e => handleChange('worker_name', e.target.value)} placeholder="Name or Business Name" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={formData.status} onValueChange={v => handleChange('status', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Contact Person</Label>
                                    <Input value={formData.contact_person} onChange={e => handleChange('contact_person', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone <span className="text-red-500">*</span></Label>
                                    <Input value={formData.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+91..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Work Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Specialization <span className="text-red-500">*</span></Label>
                                    <Select value={formData.specialization} onValueChange={v => handleChange('specialization', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Printing">Printing</SelectItem>
                                            <SelectItem value="Dyeing">Dyeing</SelectItem>
                                            <SelectItem value="Embroidery">Embroidery</SelectItem>
                                            <SelectItem value="Handwork">Handwork</SelectItem>
                                            <SelectItem value="Beading">Beading</SelectItem>
                                            <SelectItem value="Sequins">Sequins</SelectItem>
                                            <SelectItem value="Stitching">Stitching</SelectItem>
                                            <SelectItem value="Finishing">Finishing</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Rate <span className="text-red-500">*</span></Label>
                                    <Input type="number" value={formData.rate} onChange={e => handleChange('rate', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit</Label>
                                    <Select value={formData.rate_unit} onValueChange={v => handleChange('rate_unit', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Piece">Piece</SelectItem>
                                            <SelectItem value="Meter">Meter</SelectItem>
                                            <SelectItem value="Dozen">Dozen</SelectItem>
                                            <SelectItem value="Kg">Kg</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                             </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Address & Banking</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Textarea value={formData.address} onChange={e => handleChange('address', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="space-y-2"><Label>City</Label><Input value={formData.city} onChange={e => handleChange('city', e.target.value)} /></div>
                                <div className="space-y-2"><Label>State</Label><Input value={formData.state} onChange={e => handleChange('state', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Pincode</Label><Input value={formData.pincode} onChange={e => handleChange('pincode', e.target.value)} /></div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Bank Name</Label><Input value={formData.bank_name} onChange={e => handleChange('bank_name', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Account Number</Label><Input value={formData.bank_account_number} onChange={e => handleChange('bank_account_number', e.target.value)} /></div>
                                <div className="space-y-2"><Label>IFSC Code</Label><Input value={formData.ifsc_code} onChange={e => handleChange('ifsc_code', e.target.value)} /></div>
                            </div>

                             <div className="space-y-2 mt-4">
                                <Label>Notes</Label>
                                <Textarea value={formData.notes} onChange={e => handleChange('notes', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end gap-4 lg:pl-64 z-40 shadow-lg">
                    <Button type="button" variant="outline" onClick={() => navigate('/admin/job-workers')}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Job Worker
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default JobWorkerForm;