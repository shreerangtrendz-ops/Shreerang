import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send } from 'lucide-react';
import { WhatsAppService } from '@/services/WhatsAppService';

const WhatsAppMessageModal = ({ isOpen, onClose, data, type = 'fabric_details' }) => {
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!phone || phone.length < 10) {
      toast({ variant: "destructive", title: "Invalid Phone", description: "Please enter a valid 10-digit number" });
      return;
    }

    setSending(true);
    try {
      if (type === 'fabric_details') {
        await WhatsAppService.sendFabricDetails(data, phone);
      }
      toast({ title: "Sent", description: "Message sent successfully via WhatsApp" });
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send via WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Recipient Phone (Country Code optional)</Label>
            <Input 
              id="phone" 
              placeholder="919876543210" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Message Preview</Label>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-sm space-y-2">
               <p><strong>Fabric:</strong> {data?.name || data?.fabric_master?.name}</p>
               <p><strong>SKU:</strong> {data?.sku || data?.fabric_master?.sku}</p>
               <p className="text-xs text-slate-500 mt-2">This is an automated template message.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppMessageModal;