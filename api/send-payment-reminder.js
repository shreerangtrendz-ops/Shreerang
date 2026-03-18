// api/send-payment-reminder.js
// Send WhatsApp payment reminder to a party
// POST { party_name, amount, days }

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://zdekydcscwhuusliwqaz.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WA_TOKEN = process.env.WHATSAPP_TOKEN || 'EAAKigiKCL4gBQwTbZCZCZAGKoyMkvLWZBGW91JowEdRqhZAAgJmr0oAFsmklZB0cEZC9BIx8bQ4MkWoZCmNE6Gpcubom3zEsyicNByu2wiE35LujumllbekSySFSms9yl77uvAX83ntx7oUqj9paZBZAbtrnQeqgUl3SudiGS90hspkPaGXjYeXZAwfUb2Uhd4xjL2cxwZDZD';
const WA_PHONE_ID = '868455029689394';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { party_name, amount, days } = req.body || {};
  if (!party_name) return res.status(400).json({ error: 'party_name required' });

  try {
    // 1. Look up party phone from Tally ledgers
    const { data: ledger } = await supabase
      .from('tally_ledgers')
      .select('phone')
      .ilike('ledger_name', `%${party_name}%`)
      .not('phone', 'is', null)
      .limit(1)
      .single();

    const phone = ledger?.phone?.replace(/[^0-9]/g, '');

    if (!phone || phone.length < 10) {
      // Log as pending — no phone number
      await supabase.from('payment_reminders').insert({
        party_name, amount_due: amount, days_overdue: days,
        reminder_type: 'manual', whatsapp_status: 'no_phone',
        sent_at: new Date().toISOString(),
      });
      return res.status(200).json({ success: false, error: 'No phone number for this party in Tally' });
    }

    // 2. Build message
    const message = `Dear ${party_name},\n\nThis is a gentle reminder that ₹${Number(amount).toLocaleString('en-IN')} is outstanding on your account with *Shreerang Trendz* (${days} days pending).\n\nKindly arrange payment at your earliest convenience.\n\nThank you 🙏\n*Shreerang Trendz*\n📞 +91-7874200033`;

    // 3. Send via WhatsApp Business API
    const waPhone = phone.length === 10 ? '91' + phone : phone;
    const waRes = await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: waPhone,
        type: 'text',
        text: { body: message }
      })
    });

    const waJson = await waRes.json();
    const waMessageId = waJson?.messages?.[0]?.id;
    const success = !!waMessageId;

    // 4. Log to DB
    await supabase.from('payment_reminders').insert({
      party_name, party_phone: waPhone, amount_due: amount, days_overdue: days,
      reminder_type: 'manual', message_sent: message,
      whatsapp_status: success ? 'sent' : 'failed',
      wa_message_id: waMessageId || null,
      sent_at: new Date().toISOString(),
    });

    // 5. Log to whatsapp_messages
    await supabase.from('whatsapp_messages').insert({
      to_number: waPhone, to_name: party_name,
      message_type: 'payment_reminder',
      message_body: message,
      status: success ? 'sent' : 'failed',
      wa_message_id: waMessageId || null,
      sent_at: new Date().toISOString(),
    });

    return res.status(200).json({ success, message_id: waMessageId, phone: waPhone });

  } catch (err) {
    console.error('send-payment-reminder error:', err);
    return res.status(500).json({ error: err.message });
  }
}
