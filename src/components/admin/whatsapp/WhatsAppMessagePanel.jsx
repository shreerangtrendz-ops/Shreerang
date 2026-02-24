import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Send, Clock, CheckCheck, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const WhatsAppMessagePanel = () => {
    const { toast } = useToast();
    const [messageType, setMessageType] = useState('template');
    const [sending, setSending] = useState(false);

    const handleSend = () => {
        setSending(true);
        setTimeout(() => {
            setSending(false);
            toast({ title: 'Sent', description: 'Message sent successfully.' });
        }, 1500);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left: Compose */}
            <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                    <CardTitle>Send Message</CardTitle>
                    <CardDescription>Send notifications to customers manually.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Customer Phone</Label>
                        <Input placeholder="+91..." />
                    </div>

                    <div className="space-y-2">
                        <Label>Message Type</Label>
                        <Select value={messageType} onValueChange={setMessageType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Free Text (24h window)</SelectItem>
                                <SelectItem value="template">Template Message</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {messageType === 'text' ? (
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea className="h-32" placeholder="Type your message..." />
                            <p className="text-xs text-muted-foreground">Only allowed if customer messaged in last 24h.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Template</Label>
                                <Select>
                                    <SelectTrigger><SelectValue placeholder="Choose template" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="order_conf">order_confirmation</SelectItem>
                                        <SelectItem value="shipping">shipping_update</SelectItem>
                                        <SelectItem value="promo">promo_offer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 p-3 bg-slate-50 rounded border text-sm">
                                <p className="font-medium text-slate-700">Preview:</p>
                                <p className="text-slate-600 mt-1">Hello {"{{1}}"}, your order #{"{{2}}"} has been shipped!</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Variable 1 (Name)</Label>
                                <Input placeholder="e.g. John Doe" />
                            </div>
                            <div className="space-y-2">
                                <Label>Variable 2 (Order ID)</Label>
                                <Input placeholder="e.g. #ORD-123" />
                            </div>
                        </div>
                    )}

                    <Button className="w-full" onClick={handleSend} disabled={sending}>
                        {sending ? 'Sending...' : <><Send className="w-4 h-4 mr-2" /> Send Message</>}
                    </Button>
                </CardContent>
            </Card>

            {/* Right: History */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Recent Messages</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>+91 98765 43210</TableCell>
                                <TableCell>Template</TableCell>
                                <TableCell><Badge variant="outline" className="text-green-600 bg-green-50 border-green-200"><CheckCheck className="w-3 h-3 mr-1" /> Read</Badge></TableCell>
                                <TableCell className="text-muted-foreground text-sm">2 mins ago</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>+91 99887 76655</TableCell>
                                <TableCell>Text</TableCell>
                                <TableCell><Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200"><CheckCheck className="w-3 h-3 mr-1" /> Delivered</Badge></TableCell>
                                <TableCell className="text-muted-foreground text-sm">15 mins ago</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>+91 88776 65544</TableCell>
                                <TableCell>Template</TableCell>
                                <TableCell><Badge variant="outline" className="text-red-600 bg-red-50 border-red-200"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge></TableCell>
                                <TableCell className="text-muted-foreground text-sm">1 hour ago</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default WhatsAppMessagePanel;