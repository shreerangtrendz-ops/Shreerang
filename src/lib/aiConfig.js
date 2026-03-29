// src/lib/aiConfig.js
// Central AI configuration — keys managed via environment variables

// Anthropic Claude API
export const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || '';

// WhatsApp Business API
export const WABA_PHONE_ID = import.meta.env.VITE_WA_PHONE_ID || '868455029689394';

// AI helper function — calls Claude API directly from browser
export async function askClaude(prompt, maxTokens = 600) {
  if (!ANTHROPIC_KEY) {
    return 'AI features require VITE_ANTHROPIC_KEY environment variable. Please add it in Vercel dashboard.';
  }
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    if (data.error) return `AI Error: ${data.error.message}`;
    return data.content?.[0]?.text || 'No response from AI';
  } catch (e) {
    return `AI connection error: ${e.message}`;
  }
}

// Send WhatsApp message via Meta Graph API
export async function sendWhatsAppMsg(token, phone, message) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const resp = await fetch(
    `https://graph.facebook.com/v17.0/${WABA_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message },
      }),
    }
  );
  const d = await resp.json();
  return d.messages?.[0]?.id ? 'sent' : 'failed';
}
