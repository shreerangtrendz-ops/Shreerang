// Vercel API Route — WhatsApp Bot for Shreerang Trendz
// Replaces n8n — runs directly on Vercel serverless

const WA_TOKEN = 'EAAKigiKCL4gBQwTbZCZCZAGKoyMkvLWZBGW91JowEdRqhZAAgJmr0oAFsmklZB0cEZC9BIx8bQ4MkWoZCmNE6Gpcubom3zEsyicNByu2wiE35LujumllbekSySFSms9yl77uvAX83ntx7oUqj9paZBZAbtrnQeqgUl3SudiGS90hspkPaGXjYeXZAwfUb2Uhd4xjL2cxwZDZD';
const PHONE_ID = '868455029689394';
const ADMIN_PHONE = '917567870000';
const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';
const GEMINI_KEY = 'AIzaSyA86vpx6KothltoItlZa-oL3CVvgjnFvmw';
const VERIFY_TOKEN = 'shreerang2026';
const WA_API = `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`;
const WA_HEADERS = { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' };

const TEAM = {
  '917567870000': 'admin', '917874220000': 'dispatch',
  '917874200054': 'sales1', '917874200099': 'sales2', '917874200053': 'sales3'
};

async function sendText(to, body) {
  const r = await fetch(WA_API, {
    method: 'POST', headers: WA_HEADERS,
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } })
  });
  return r.json();
}

async function sendButtons(to, bodyText, buttons) {
  const r = await fetch(WA_API, {
    method: 'POST', headers: WA_HEADERS,
    body: JSON.stringify({
      messaging_product: 'whatsapp', to, type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: { buttons: buttons.map(b => ({ type: 'reply', reply: { id: b[0], title: b[1] } })) }
      }
    })
  });
  return r.json();
}

async function saveToDb(phone, text, direction, msgType, lang) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ phone_number: phone, message_text: text, direction, message_type: msgType, language: lang, created_at: new Date().toISOString() })
    });
  } catch(e) { console.error('DB save error:', e); }
}

async function geminiReply(text, name, lang) {
  try {
    const prompt = `You are WhatsApp sales assistant for Shreerang Trendz, fabric business in Surat India. Fabrics: Mill Print, Solid Dyed, Digital Print, Embroidery, Schiffli Hakoba. Customer: ${name}, Language: ${lang}, Message: "${text}". Reply warmly in the SAME language (max 60 words). Just the reply text.`;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 200, temperature: 0.4 } })
    });
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch(e) { return ''; }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'POST') return res.status(405).end();

  res.status(200).json({ status: 'EVENT_RECEIVED' });

  try {
    const body = req.body;
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contact = body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
    if (!message) return;

    const phone = message.from;
    const name = contact?.profile?.name || 'Customer';
    const msgType = message.type;

    let text = '', mediaId = null, interactiveId = '';
    if (msgType === 'text') text = message.text?.body || '';
    else if (msgType === 'image') { mediaId = message.image?.id; text = '[IMAGE]'; }
    else if (msgType === 'interactive') {
      const ir = message.interactive;
      if (ir.type === 'button_reply') { interactiveId = ir.button_reply.id; text = ir.button_reply.id; }
    }

    const lang = /[\u0A80-\u0AFF]/.test(text) ? 'gu' : /[\u0900-\u097F]/.test(text) ? 'hi' : 'en';
    const role = TEAM[phone] || 'customer';
    const t = text.toLowerCase().trim();

    await saveToDb(phone, text || mediaId || '', 'inbound', msgType, lang);

    if (role !== 'customer') return;

    const GREETINGS = ['hi','hello','hey','hii','namaskar','namaste','kem cho','start','salam','good morning','good evening'];
    const isGreeting = !text || GREETINGS.some(g => t === g || t.startsWith(g + ' ') || t.startsWith(g + ','));

    if (isGreeting) {
      const greetHi = `\u0928\u092e\u0938\u094d\u0924\u0947 *${name}* \u091c\u0940! \ud83d\ude4f\n\nShreerang Trendz \u092e\u0947\u0902 \u0906\u092a\u0915\u093e \u0938\u094d\u0935\u093e\u0917\u0924 \u0939\u0948\u0964\n\u0915\u094c\u0928\u0938\u0940 fabric category \u091a\u093e\u0939\u093f\u090f?\n\n1\ufe0f\u20e3 Mill Print / Solid Dyed\n2\ufe0f\u20e3 Digital Print\n3\ufe0f\u20e3 Embroidery\n4\ufe0f\u20e3 Schiffli / Hakoba`;
      const greetGu = `\u0aa8\u0aae\u0ab8\u0acd\u0aa4\u0ac7 *${name}* ! \ud83d\ude4f\n\nShreerang Trendz \u0aae\u0abe\u0a82 \u0a86\u0aaa\u0aa8\u0ac1\u0a82 \u0ab8\u0acd\u0ab5\u0abe\u0a97\u0aa4!\nKai category joie che?\n\n1\ufe0f\u20e3 Mill Print / Solid\n2\ufe0f\u20e3 Digital Print\n3\ufe0f\u20e3 Embroidery\n4\ufe0f\u20e3 Schiffli / Hakoba`;
      const greetEn = `Welcome *${name}*! \ud83d\ude4f\n\nThank you for contacting *Shreerang Trendz*.\nWhich fabric are you looking for?\n\n1\ufe0f\u20e3 Mill Print / Solid Dyed\n2\ufe0f\u20e3 Digital Print\n3\ufe0f\u20e3 Embroidery\n4\ufe0f\u20e3 Schiffli / Hakoba`;
      const greetMsg = lang === 'hi' ? greetHi : lang === 'gu' ? greetGu : greetEn;
      await sendButtons(phone, greetMsg, [['MP_START','Mill Print / Solid'],['DP_START','Digital Print'],['EMB_START','Embroidery']]);
      return;
    }

    if (interactiveId.startsWith('MP_') || t.includes('mill print') || t.includes('solid dyed') || t === '1') {
      if (interactiveId === 'MP_START' || t === '1' || (!interactiveId && (t.includes('mill') || t.includes('solid')))) {
        const body = lang==='hi' ? 'Mill Print / Solid Dyed \u2705\n\n\u0915\u094c\u0928\u0938\u0940 Width \u091a\u093e\u0939\u093f\u090f?' : lang==='gu' ? 'Mill Print / Solid \u2705\nKai Width joie?' : 'Mill Print / Solid Dyed \u2705\n\nWhat width do you need?';
        await sendButtons(phone, body, [['MP_W44','44 inch'],['MP_W58','58 inch'],['MP_W60','60 inch']]);
      } else if (interactiveId.startsWith('MP_W')) {
        const width = interactiveId.replace('MP_W','');
        const body = lang==='hi' ? `Width: ${width}" \u2705\n\nFabric \u0915\u093e type \u092c\u0924\u093e\u090f\u0902:` : `Width: ${width}" \u2705\n\nFabric type?`;
        await sendButtons(phone, body, [['MP_REG','Regular'],['MP_DIS','Discharge'],['MP_PREM','Premium']]);
      } else {
        const tag = interactiveId.replace('MP_','') || t;
        await sendText(phone, lang==='hi' ? `\u2705 Mill Print | ${tag}\n\n\u0939\u092e\u093e\u0930\u0940 team \u091c\u0932\u094d\u0926 designs share \u0915\u0930\u0947\u0917\u0940! \ud83d\ude4f` : lang==='gu' ? `\u2705 Mill Print | ${tag}\n\nAmare team designs share karshe. \ud83d\ude4f` : `\u2705 Mill Print | ${tag}\n\nOur team will share designs shortly! \ud83d\ude4f`);
        await sendText(ADMIN_PHONE, `\ud83d\udd14 *Mill Print Enquiry*\nFrom: ${name} (+${phone})\nType: ${tag}\n\nReply: ASSIGN_1 / ASSIGN_2 / ASSIGN_3`);
      }
      return;
    }

    if (interactiveId.startsWith('DP_') || t.includes('digital') || t === '2') {
      if (interactiveId === 'DP_START' || t === '2' || (!interactiveId && t.includes('digital'))) {
        const body = lang==='hi' ? 'Digital Print \u2705\n\nBase fabric \u0915\u094c\u0928\u0938\u0940?' : 'Digital Print \u2705\n\nWhich base fabric?';
        await sendButtons(phone, body, [['DP_POLY','Polyester Base'],['DP_PURE','Pure Base']]);
      } else if (interactiveId === 'DP_POLY' || interactiveId === 'DP_PURE') {
        const base = interactiveId === 'DP_POLY' ? 'Polyester' : 'Pure';
        const body = `Digital | ${base} \u2705\n\nDesign style?`;
        await sendButtons(phone, body, [['DP_ALLOVER','Allover'],['DP_KURTI','Kurti Pattern'],['DP_COORD','Co-ord Sets']]);
      } else {
        const style = interactiveId.replace('DP_','') || 'Allover';
        await sendText(phone, lang==='hi' ? `\u2705 Digital | ${style}\n\n\u0915\u093f\u0924\u0928\u0947 meter? Photo \u092d\u0947\u091c\u0947\u0902 \ud83d\udcf8` : `\u2705 Digital | ${style}\n\nHow many meters? Send photo \ud83d\udcf8`);
        await sendText(ADMIN_PHONE, `\ud83d\udd14 *Digital Print Enquiry*\nFrom: ${name} (+${phone})\nStyle: ${style}`);
      }
      return;
    }

    if (interactiveId.startsWith('EMB_') || t.includes('embroid') || t === '3') {
      if (interactiveId === 'EMB_START' || t === '3' || (!interactiveId && t.includes('embroid'))) {
        const body = lang==='hi' ? 'Embroidery \u2705\n\n\u0915\u094c\u0928\u0938\u093e style?' : 'Embroidery \u2705\n\nWhich style?';
        await sendButtons(phone, body, [['EMB_ALLOVER','Allover'],['EMB_PATTA','Patta Allover'],['EMB_ANARKALI','Anarkali']]);
      } else {
        const style = interactiveId.replace('EMB_','') || t;
        await sendText(phone, lang==='hi' ? `\u2705 Embroidery | ${style}\n\nFabric + quantity \u092c\u0924\u093e\u090f\u0902 \u092f\u093e photo \ud83d\udcf8` : `\u2705 Embroidery | ${style}\n\nShare fabric + quantity or photo \ud83d\udcf8`);
        await sendText(ADMIN_PHONE, `\ud83d\udd14 *Embroidery Enquiry*\nFrom: ${name} (+${phone})\nStyle: ${style}`);
      }
      return;
    }

    if (t.includes('schiffli') || t.includes('hakoba') || t === '4') {
      await sendText(phone, lang==='hi' ? `\u2705 Schiffli/Hakoba\n\nStyle + quantity \u092c\u0924\u093e\u090f\u0902 \u092f\u093e photo \ud83d\udcf8` : `\u2705 Schiffli/Hakoba\n\nShare style + quantity or send photo \ud83d\udcf8`);
      await sendText(ADMIN_PHONE, `\ud83d\udd14 *Schiffli Enquiry*\nFrom: ${name} (+${phone})`);
      return;
    }

    if (t.includes('price') || t.includes('rate') || t.includes('bhav') || t.includes('daam') || t.includes('kitna')) {
      const body = lang==='hi' ? `\ud83d\udcb0 Price Enquiry\n\nQty type \u092c\u0924\u093e\u090f\u0902:` : `\ud83d\udcb0 Price Enquiry\n\nQty type?`;
      await sendButtons(phone, body, [['PRICE_LUMP','Lump (50+ mtr)'],['PRICE_CUT','Cut Pack (20 mtr)']]);
      return;
    }

    if (msgType === 'image') {
      await sendText(phone, lang==='hi' ? `\u2705 Design photo \u092e\u093f\u0932 \u0917\u0908! \ud83d\udcf8\n\nTeam similar designs share \u0915\u0930\u0947\u0917\u0940\u0964 Kitne meter chahiye?` : `\u2705 Design photo received! \ud83d\udcf8\n\nOur team will find similar designs. How many meters?`);
      await sendText(ADMIN_PHONE, `\ud83d\udcf8 *Design Photo*\nFrom: ${name} (+${phone})\nMedia ID: ${mediaId || 'N/A'}`);
      return;
    }

    let reply = await geminiReply(text, name, lang);
    if (!reply) {
      reply = lang === 'hi' ? '\u0928\u092e\u0938\u094d\u0924\u0947! \u0939\u092e\u093e\u0930\u0940 team \u091c\u0932\u094d\u0926 \u0906\u092a\u0938\u0947 \u0938\u0902\u092a\u0930\u094d\u0915 \u0915\u0930\u0947\u0917\u0940\u0964 \ud83d\ude4f' : lang === 'gu' ? 'Namaste! Amare team tamaro contact karshE. \ud83d\ude4f' : 'Thank you for reaching out! Our team will contact you shortly. \ud83d\ude4f';
    }
    await sendText(phone, reply);
    await sendText(ADMIN_PHONE, `\ud83d\udce9 *Other Enquiry*\nFrom: ${name} (+${phone})\n"${text}"\nBot: "${reply.substring(0,80)}"`);

  } catch (err) {
    console.error('Webhook error:', err);
  }
}
