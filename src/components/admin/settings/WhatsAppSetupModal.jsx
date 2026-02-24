import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, ExternalLink, CheckCircle, Copy, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STEPS = {
    CREDENTIALS: 1,
    WEBHOOK: 2,
    TEST: 3,
    CONFIRM: 4
};

const WhatsAppSetupModal = ({ isOpen, onClose }) => {
    const { toast } = useToast();
    const [step, setStep] = useState(STEPS.CREDENTIALS);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        businessId: '',
        phoneId: '',
        token: '',
        testPhone: ''
    });
    const [verified, setVerified] = useState(false);

    const handleVerifyCredentials = () => {
        setLoading(true);
        // Mock verification
        setTimeout(() => {
            setLoading(false);
            if(formData.businessId && formData.phoneId && formData.token) {
                setVerified(true);
                toast({ title: 'Verified', description: 'Credentials are valid.' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields.' });
            }
        }, 1500);
    };

    const handleSendTest = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            toast({ title: 'Message Sent', description: 'Check your WhatsApp for the test message.' });
            setStep(STEPS.CONFIRM);
        }, 2000);
    };

    const copyWebhook = () => {
        navigator.clipboard.writeText("https://api.shreerangtrendz.com/webhooks/whatsapp");
        toast({ title: 'Copied', description: 'Webhook URL copied to clipboard' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl h-[650px] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Setup WhatsApp Business API</DialogTitle>
                    <DialogDescription>Connect your Meta Business Account to send automated messages.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 py-4 px-2 overflow-y-auto">
                    {step === STEPS.CREDENTIALS && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between mb-4">
                                <div className="text-sm text-slate-600">Don't have credentials?</div>
                                <Button variant="link" size="sm" className="gap-1" onClick={() => window.open('https://developers.facebook.com', '_blank')}>
                                    Go to Meta Developer Portal <ExternalLink className="h-3 w-3" />
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label>Business Account ID</Label>
                                <Input 
                                    placeholder="e.g. 100543..." 
                                    value={formData.businessId}
                                    onChange={e => setFormData({...formData, businessId: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone Number ID</Label>
                                <Input 
                                    placeholder="e.g. 104562..." 
                                    value={formData.phoneId}
                                    onChange={e => setFormData({...formData, phoneId: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Permanent Access Token</Label>
                                <Input 
                                    type="password" 
                                    placeholder="EAAG..." 
                                    value={formData.token}
                                    onChange={e => setFormData({...formData, token: e.target.value})}
                                />
                            </div>

                            <Button className="w-full mt-4" onClick={handleVerifyCredentials} disabled={loading || verified}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                {verified ? <><CheckCircle className="mr-2 h-4 w-4"/> Verified</> : 'Verify Credentials'}
                            </Button>
                        </div>
                    )}

                    {step === STEPS.WEBHOOK && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label>Webhook URL</Label>
                                <div className="flex gap-2">
                                    <Input value="https://api.shreerangtrendz.com/webhooks/whatsapp" readOnly className="bg-slate-50" />
                                    <Button variant="outline" size="icon" onClick={copyWebhook}><Copy className="h-4 w-4" /></Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Paste this URL in your Meta App Dashboard under WhatsApp &gt; Configuration.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Verify Token</Label>
                                <Input value="shreerang_secret_token_2024" readOnly className="bg-slate-50 font-mono" />
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-lg flex gap-3 text-yellow-800 text-sm">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <p>Ensure you subscribe to <strong>messages</strong> field in the Webhook fields configuration on Meta dashboard.</p>
                            </div>
                        </div>
                    )}

                    {step === STEPS.TEST && (
                        <div className="space-y-6">
                            <div className="text-center py-6">
                                <MessageSquare className="h-12 w-12 mx-auto text-green-500 mb-4" />
                                <h3 className="font-medium">Send a Test Message</h3>
                                <p className="text-sm text-slate-500">Verify that the integration can send outbound messages.</p>
                            </div>

                            <div className="space-y-4 max-w-sm mx-auto">
                                <div className="space-y-2">
                                    <Label>Test Phone Number</Label>
                                    <Input 
                                        placeholder="e.g. 919876543210" 
                                        value={formData.testPhone}
                                        onChange={e => setFormData({...formData, testPhone: e.target.value})}
                                    />
                                    <p className="text-xs text-muted-foreground">Must include country code without +</p>
                                </div>
                                <Button className="w-full" onClick={handleSendTest} disabled={loading || !formData.testPhone}>
                                    {loading ? 'Sending...' : 'Send Hello World'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === STEPS.CONFIRM && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">Integration Active!</h3>
                            <p className="text-slate-500 max-w-md">
                                Your WhatsApp Business API is successfully configured. You can now send automated updates and marketing broadcasts.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    {step > 1 && step < 4 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
                    
                    {step === STEPS.CREDENTIALS && <Button disabled={!verified} onClick={() => setStep(STEPS.WEBHOOK)}>Next</Button>}
                    {step === STEPS.WEBHOOK && <Button onClick={() => setStep(STEPS.TEST)}>Verify & Next</Button>}
                    {step === STEPS.TEST && <Button variant="ghost" onClick={() => setStep(STEPS.CONFIRM)}>Skip Test</Button>}
                    {step === STEPS.CONFIRM && <Button onClick={onClose}>Go to Dashboard</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WhatsAppSetupModal;