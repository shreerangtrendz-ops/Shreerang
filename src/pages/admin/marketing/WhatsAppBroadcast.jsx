import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Send, Users, FileImage } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useNavigate } from 'react-router-dom';

const WhatsAppBroadcast = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [audience, setAudience] = useState('all');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = () => {
        if(!message) return toast({variant: 'destructive', title: 'Error', description: 'Message cannot be empty'});
        
        setSending(true);
        // Simulate sending via API
        setTimeout(() => {
            setSending(false);
            toast({ title: 'Broadcast Sent', description: `Message queued for ${audience === 'all' ? '1,240' : '45'} recipients.` });
            setMessage('');
        }, 2000);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Helmet><title>WhatsApp Broadcast</title></Helmet>
            <AdminPageHeader 
                title="Send Broadcast" 
                breadcrumbs={[{label: 'Marketing', href: '/admin/marketing'}, {label: 'Broadcast'}]}
                onBack={() => navigate('/admin')}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Compose Message</CardTitle>
                            <CardDescription>Send updates, offers, or catalogs to your customers.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Audience</Label>
                                <Select value={audience} onValueChange={setAudience}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Customers</SelectItem>
                                        <SelectItem value="active">Active (Last 30 Days)</SelectItem>
                                        <SelectItem value="pending">Pending Orders</SelectItem>
                                        <SelectItem value="leads">Leads (No Orders)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Message Text</Label>
                                <Textarea 
                                    placeholder="Type your message here... Use *bold* for bold text." 
                                    className="min-h-[150px]"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Variables: {'{name}'}, {'{order_id}'}</span>
                                    <span>{message.length} chars</span>
                                </div>
                            </div>

                            <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-muted-foreground bg-slate-50 cursor-pointer hover:bg-slate-100">
                                <FileImage className="h-8 w-8 mb-2" />
                                <span className="text-sm">Add Image or Document (Optional)</span>
                            </div>

                            <Button onClick={handleSend} disabled={sending} className="w-full">
                                {sending ? 'Sending...' : <><Send className="mr-2 h-4 w-4"/> Send Broadcast</>}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-1">
                    <Card className="bg-slate-50 border-none shadow-none">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-[#e5ddd5] p-4 rounded-lg min-h-[300px] relative">
                                <div className="bg-white p-2 rounded-lg shadow-sm max-w-[80%] ml-auto relative">
                                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{message || 'Your message will appear here...'}</p>
                                    <span className="text-[10px] text-slate-400 block text-right mt-1">12:00 PM</span>
                                </div>
                            </div>
                            <div className="mt-4 text-xs text-muted-foreground">
                                <p className="flex items-center gap-2"><Users className="h-3 w-3"/> Est. Reach: <strong>{audience === 'all' ? '1,240' : '45'}</strong></p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppBroadcast;