// Vercel API Route — WhatsApp Bot for Shreerang Trendz (v2 - fixed schema)
const WA_TOKEN = process.env.WHATSAPP_TOKEN || 'EAAKigiKCL4gBQwTbZCZCZAGKoyMkvLWZBGW91JowEdRqhZAAgJmr0oAFsmklZB0cEZC9BIx8bQ4MkWoZCmNE6Gpcubom3zEsyicNByu2wiE35LujumllbekSySFSms9yl77uvAX83ntx7oUqj9paZBZAbtrnQeqgUl3SudiGS90hspkPaGXjYeXZAwfUb2Uhd4xjL2cxwZDZD';
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '868455029689394';
const ADMIN_PHONE = '917567860000';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';
const GEMINI_KEY = process.env.GEMINI_API_KEY || 'AIzaSyA86vpx6KothltoItlZa-oL3CVvgjnFvmw';
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'shreerang_secure_verify_2026';
const WA_API = `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`;
const WA_HEADERS = { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' };
const SB_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

// ── Smart Catalogue Image Sender ─────────────────
// Modes: 'new_only' (default) | 'all' | 'more'
async function sendCatalogueImages(phone, category, subcategory, mode = 'new_only', batchSize = 3) {
  try {
    // Step 1: Get all in-stock images for this category
    let url = `${SUPABASE_URL}/rest/v1/fabric_catalogue?select=id,name,image_url,description,price_range&category=eq.${category}&in_stock=eq.true&order=sort_order.asc,created_at.desc`;
    if (subcategory) url += `&subcategory=eq.${subcategory}`;

    const catResp = await fetch(url, { headers: SB_HEADERS });
    const allItems = await catResp.json();
    if (!allItems || allItems.length === 0) return { sent: 0, total: 0, allSeen: false };

    let itemsToSend = allItems;

    if (mode === 'new_only' || mode === 'more') {
      // Step 2: Get IDs already sent to this customer
      const sentResp = await fetch(
        `${SUPABASE_URL}/rest/v1/whatsapp_designs_sent?select=catalogue_id&phone_number=eq.${phone}`,
        { headers: SB_HEADERS }
      );
      const sentData = await sentResp.json();
      const sentIds = new Set((sentData || []).map(s => s.catalogue_id));

      // Step 3: Filter to only unseen items
      itemsToSend = allItems.filter(item => !sentIds.has(item.id));
    }

    // All designs already seen?
    if (itemsToSend.length === 0) {
      return { sent: 0, total: allItems.length, allSeen: true };
    }

    // Step 4: Apply batch size limit
    const batch = mode === 'all' ? itemsToSend : itemsToSend.slice(0, batchSize);
    const hasMore = itemsToSend.length > batch.length;

    // Step 5: Send images via WhatsApp
    const sentIds = [];
    for (const item of batch) {
      const waResp = await fetch(WA_API, {
        method: 'POST', headers: WA_HEADERS,
        body: JSON.stringify({
          messaging_product: 'whatsapp', to: phone, type: 'image',
          image: {
            link: item.image_url,
            caption: `*${item.name}*\n${item.description ? item.description + '\n' : ''}💰 ${item.price_range || 'Price on request'}\n\nInterested? Reply with quantity 📦`
          }
        })
      });
      const waData = await waResp.json();
      if (waData?.messages?.[0]?.id) sentIds.push(item.id);
      await new Promise(r => setTimeout(r, 400));
    }

    // Step 6: Record what was sent (upsert - ignore if already exists)
    if (sentIds.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_designs_sent?on_conflict=phone_number,catalogue_id`, {
        method: 'POST',
        headers: { ...SB_HEADERS, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify(sentIds.map(id => ({ phone_number: phone, catalogue_id: id })))
      });
      // Increment send_count for each design
      for (const id of sentIds) {
        await fetch(`${SUPABASE_URL}/rest/v1/fabric_catalogue?id=eq.${id}`, {
          method: 'PATCH', headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
          body: JSON.stringify({ send_count: `send_count + 1` })
        });
      }
    }

    return { sent: sentIds.length, total: allItems.length, hasMore, remaining: itemsToSend.length - batch.length, allSeen: false };
  } catch(e) {
    console.error('sendCatalogueImages error:', e);
    return { sent: 0, total: 0, allSeen: false };
  }
}

async function getCustomerInfo(phone) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/customers?phone=eq.${phone}&select=id,name,firm_name,price_tier&limit=1`, {
      headers: SB_HEADERS
    });
    const data = await r.json();
    return data?.[0] || null;
  } catch { return null; }
}

async function createLeadIfNew(phone, name, interestTag) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/customers?phone=eq.${phone}&select=id&limit=1`, {
      headers: SB_HEADERS
    });
    const existing = await r.json();
    if (existing?.length > 0) return;
    await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ name, phone, source: 'whatsapp_bot', status: 'lead', fabric_interest: interestTag, created_at: new Date().toISOString() })
    });
  } catch(e) { console.error('createLead error:', e); }
}

async function geminiReply(text, name, lang) {
  try {
    const prompt = `You are a professional WhatsApp sales assistant for Shreerang Trendz, a premium fabric business in Surat, India. Fabrics: Mill Print, Solid Dyed, Digital Print (Polyester & Pure), Embroidery, Schiffli, Hakoba.\nCustomer Name: ${name}\nLanguage to reply in: ${lang === 'hi' ? 'Hindi' : lang === 'gu' ? 'Gujarati' : 'English'}\nCustomer message: "${text}"\n\nReply warmly, professionally, in the SAME language as the customer (${lang}). Max 80 words. Just the reply text, no preamble.`;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 200, temperature: 0.4 } })
    });
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch(e) { return ''; }
}

async function getOrderStatus(phone) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/sales_orders?customer_phone=eq.${phone}&select=order_number,status,total_amount,created_at&order=created_at.desc&limit=3`, {
      headers: SB_HEADERS
    });
    return await r.json();
  } catch { return []; }
}

export default async function handler(req, res) {
  // ── WEBHOOK VERIFICATION (GET) ──
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

  // Respond immediately to Meta (must be <5s)
  res.status(200).json({ status: 'EVENT_RECEIVED' });

  try {
    const body = req.body;
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contact = body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
    // ── STATUS UPDATES (delivered / read) ──
    const statuses = body?.entry?.[0]?.changes?.[0]?.value?.statuses;
    if (statuses?.length > 0) {
      for (const s of statuses) {
        const waId = s.id;
        const newStatus = s.status; // 'sent' | 'delivered' | 'read' | 'failed'
        if (waId && newStatus) {
          await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages?whatsapp_message_id=eq.${encodeURIComponent(waId)}`, {
            method: 'PATCH',
            headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
            body: JSON.stringify({ status: newStatus })
          });
        }
      }
      return;
    }

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
      else if (ir.type === 'list_reply') { interactiveId = ir.list_reply.id; text = ir.list_reply.id; }
    }

    const lang = /[\u0A80-\u0AFF]/.test(text) ? 'gu' : /[\u0900-\u097F]/.test(text) ? 'hi' : 'en';
    const isStaff = !!TEAM[phone];
    const t = text.toLowerCase().trim();

    // ✅ Save incoming message to DB
    await saveToDb(phone, text || mediaId || '', 'inbound', msgType, message.id, name);

    if (isStaff) return;

    const GREETINGS = ['hi','hello','hey','hii','namaskar','namaste','kem cho','start','salam','good morning','good evening','good afternoon','kem che','hanji','ji'];
    const isGreeting = !text || GREETINGS.some(g => t === g || t.startsWith(g + ' ') || t.startsWith(g + ','));

    if (t.includes('order') || t.includes('status') || interactiveId === 'ORDER_STATUS') {
      const orders = await getOrderStatus(phone);
      if (orders.length === 0) {
        await sendText(phone, lang === 'hi' ? `📦 आपका कोई order नहीं मिला।\n\nNew order के लिए बताएं — कौनसा fabric चाहिए?` : lang === 'gu' ? `📦 Tamaro koi order nathi malyo.\n\nNew order mate janavjo — kai fabric joie?` : `📦 No orders found for your number.\n\nTo place a new order, tell us which fabric you need!`);
      } else {
        const lines = orders.map((o, i) => `${i+1}. Order ${o.order_number} — ${o.status?.toUpperCase()} — ₹${Number(o.total_amount||0).toLocaleString('en-IN')}`).join('\n');
        await sendText(phone, `📦 *Your Recent Orders:*\n\n${lines}\n\nFor details, call: +91-7874200033`);
      }
      return;
    }

    if (t.includes('price') || t.includes('rate') || t.includes('bhav') || t.includes('daam') || t.includes('kitna') || t.includes('cost') || interactiveId === 'PRICE_CHECK') {
      await sendButtons(phone, lang === 'hi' ? `💰 Price जानने के लिए Quantity बताएं:` : lang === 'gu' ? `💰 Price mate quantity janavjo:` : `💰 To get pricing, please specify quantity:`, [['PRICE_LUMP','Lump (50+ mtrs)'],['PRICE_CUT','Cut Pack (20 mtr)'],['PRICE_SAMPLE','Sample (5 mtr)']]);
      return;
    }

    if (interactiveId.startsWith('PRICE_')) {
      const qty = interactiveId === 'PRICE_LUMP' ? 'Lump (50+ mtrs)' : interactiveId === 'PRICE_CUT' ? 'Cut Pack (20 mtrs)' : 'Sample';
      await sendText(phone, `✅ *${qty}* pricing:\n\n1️⃣ Mill Print\n2️⃣ Digital Print\n3️⃣ Solid Dyed\n4️⃣ Schiffli\n5️⃣ Hakoba\n\nReply with number for price.`);
      await sendText(ADMIN_PHONE, `💰 *Price Enquiry*\nFrom: ${name} (+${phone})\nQty type: ${qty}\n\nKindly send price list.`);
      return;
    }

    if (isGreeting) {
      const customer = await getCustomerInfo(phone);
      const greetName = customer ? ` *${customer.name}*` : ` *${name}*`;
      const greetMsg = lang === 'hi' ? `नमस्ते${greetName} जी! 🙏\n\nShreerang Trendz में आपका स्वागत है। 🧵✨\n_Premium Fabrics from Surat_\n\nकौनसा fabric चाहिए?` : lang === 'gu' ? `નમસ્તે${greetName}! 🙏\n\nShreerang Trendz માં આપનું સ્વાગત! 🧵✨\n_Premium Fabrics from Surat_\n\nKai fabric joie?` : `Welcome${greetName}! 🙏\n\n*Shreerang Trendz* — Premium Fabrics from Surat 🧵✨\n\nWhat fabric are you looking for?`;
      await sendButtons(phone, greetMsg, [['CAT_MILL','Mill Print / Solid'],['CAT_DIGITAL','Digital Print'],['CAT_EMB','Embroidery/Schiffli']]);
      await createLeadIfNew(phone, name, 'enquiry');
      return;
    }

    if (interactiveId === 'CAT_MILL' || t === '1' || (!interactiveId && (t.includes('mill') || t.includes('solid') || t.includes('plain')))) {
      // Auto-send catalogue images first
      const millResult = await sendCatalogueImages(phone, 'mill_print', null, 'new_only', 3);
      let millMsg = '';
      if (millResult.allSeen) {
        millMsg = lang === 'hi' ? `आपने हमारे सभी Mill Print designs देख लिए हैं! 🙏\nनए designs जल्द आएंगे। अभी order करें?\n\nWidth चाहिए?` : `You've seen all our Mill Print designs! 🙏\nNew arrivals coming soon. Ready to order?\n\nWhich width?`;
      } else if (millResult.sent === 0) {
        millMsg = lang === 'hi' ? `🧵 Mill Print designs भेज रहे हैं...\n\nWidth चाहिए?` : `🧵 Sending Mill Print designs...\n\nWhich width?`;
      } else {
        const moreText = millResult.hasMore ? ` (${millResult.remaining} more — type "aur dikhao")` : '';
        millMsg = lang === 'hi' ? `ऊपर देखें ${millResult.sent} designs! 👆${moreText}\n\nWidth चाहिए?` : `Check ${millResult.sent} designs above! 👆${moreText}\n\nWhich width?`;
      }
      await sendButtons(phone, millMsg, [['MP_44','44 inch'],['MP_58','58 inch'],['MP_60','60 inch']]);
      await createLeadIfNew(phone, name, 'Mill Print');
      return;
    }

    if (interactiveId.startsWith('MP_')) {
      const width = interactiveId.replace('MP_','');
      await sendButtons(phone, `Width: ${width}" ✅\n\nFabric type?`, [['MPT_REG','Regular'],['MPT_DIS','Discharge'],['MPT_PREM','Premium']]);
      return;
    }

    if (interactiveId.startsWith('MPT_')) {
      const type = interactiveId.replace('MPT_','');
      await sendText(phone, `✅ Mill Print | ${type}\n\nOur team will share designs shortly! 🙏\n\nHow many meters do you need?`);
      await sendText(ADMIN_PHONE, `🔔 *Mill Print Enquiry*\nCustomer: ${name}\nPhone: +${phone}\nType: ${type}\n\n👉 Send designs & price list`);
      return;
    }

    if (interactiveId === 'CAT_DIGITAL' || t === '2' || (!interactiveId && t.includes('digital'))) {
      // Auto-send digital catalogue images
      const digResult = await sendCatalogueImages(phone, 'digital', null, 'new_only', 3);
      let digMsg = digResult.allSeen
        ? `You've seen all our Digital Print designs! 🙏 New arrivals soon.\n\nWhich base fabric?`
        : `Check ${digResult.sent || 'our'} Digital Prints above! 👆${digResult.hasMore ? ` (${digResult.remaining} more — type "show more")` : ''}\n\nWhich base fabric?`;
      await sendButtons(phone, digMsg, [['DP_POLY','Polyester Base'],['DP_PURE','Pure Base'],['DP_BOTH','Both']]);
      await createLeadIfNew(phone, name, 'Digital Print');
      return;
    }

    if (interactiveId.startsWith('DP_')) {
      const base = interactiveId === 'DP_POLY' ? 'Polyester' : interactiveId === 'DP_PURE' ? 'Pure Silk' : 'Both';
      await sendButtons(phone, `Digital | ${base} ✅\n\nDesign style?`, [['DPS_ALLOVER','Allover Pattern'],['DPS_KURTI','Kurti Panel'],['DPS_COORD','Co-ord Sets']]);
      return;
    }

    if (interactiveId.startsWith('DPS_')) {
      const style = interactiveId.replace('DPS_','');
      await sendText(phone, `✅ Digital | ${style}\n\nHow many meters? 📐\nOr send a photo 📸`);
      await sendText(ADMIN_PHONE, `🔔 *Digital Print Enquiry*\nCustomer: ${name}\nPhone: +${phone}\nStyle: ${style}\n\n👉 Send catalogue & price`);
      return;
    }

    if (interactiveId === 'CAT_EMB' || t === '3' || (!interactiveId && (t.includes('embroid') || t.includes('schiffli') || t.includes('hakoba')))) {
      // Auto-send embroidery images
      const sent = await sendCatalogueImages(phone, 'embroidery', null, 2);
      await sendCatalogueImages(phone, 'schiffli', null, 1);
      await sendButtons(phone, `Check our Embroidery collection above! 👆\n\nWhich type?`, [['EMB_ALLOVER','Allover Embroidery'],['EMB_SCHIFFLI','Schiffli'],['EMB_HAKOBA','Hakoba']]);
      await createLeadIfNew(phone, name, 'Embroidery');
      return;
    }

    if (interactiveId.startsWith('EMB_')) {
      const type = interactiveId.replace('EMB_','');
      await sendText(phone, `✅ ${type}\n\nShare fabric + quantity or send a photo 📸\nOur team will suggest best designs 🙏`);
      await sendText(ADMIN_PHONE, `🔔 *${type} Enquiry*\nCustomer: ${name}\nPhone: +${phone}\n\n👉 Share relevant designs`);
      return;
    }

    if (msgType === 'image') {
      await sendText(phone, `✅ Design photo received! 📸\n\nOur team will find similar designs for you.\nHow many meters do you need?`);
      await sendText(ADMIN_PHONE, `📸 *Design Photo Received*\nFrom: ${name} (+${phone})\nMedia ID: ${mediaId}\n\n👉 Find similar designs & respond`);
      return;
    }

    // ── KEYWORD: show designs / catalogue / images ──
    const wantsImages = t.includes('design') || t.includes('pattern') || t.includes('photo') || 
                        t.includes('image') || t.includes('pic') || t.includes('sample') ||
                        t.includes('dikhao') || t.includes('dikha') || t.includes('design bhejo') ||
                        t.includes('show') || t.includes('dekhna');

    // "show more" / "aur dikhao" — send next batch
    const wantsMore = t.includes('aur dikhao') || t.includes('more designs') || t.includes('show more') || t.includes('aur batao') || t.includes('next');
    // "all designs" — send everything
    const wantsAll = t.includes('sab dikhao') || t.includes('all designs') || t.includes('sabhi') || t.includes('poora') || t.includes('full catalogue');

    if (wantsImages || wantsMore || wantsAll) {
      const mode = wantsAll ? 'all' : wantsMore ? 'new_only' : 'new_only';
      const batchSize = wantsAll ? 10 : 3;

      // Detect which category they want
      let cat = null;
      if (t.includes('mill') || t.includes('cotton') || t.includes('plain')) cat = 'mill_print';
      else if (t.includes('digital')) cat = 'digital';
      else if (t.includes('embroid') || t.includes('emb')) cat = 'embroidery';
      else if (t.includes('schiffli')) cat = 'schiffli';
      else if (t.includes('hakoba')) cat = 'hakoba';
      else if (t.includes('solid') || t.includes('dyed')) cat = 'solid';

      if (cat) {
        await sendText(phone, lang === 'hi' ? `📸 भेज रहे हैं...` : `📸 Sending designs...`);
        const result = await sendCatalogueImages(phone, cat, null, mode, batchSize);
        if (result.allSeen) {
          await sendText(phone, lang === 'hi'
            ? `आपने ${cat.replace('_',' ')} के सभी designs देख लिए हैं! 🙏\nनए designs जल्द आएंगे 🔔\nAbhi order karna hai?`
            : `You've seen all ${cat.replace('_',' ')} designs! 🙏\nNew arrivals coming soon 🔔\nReady to place an order?`);
        } else if (result.sent > 0) {
          if (result.hasMore) {
            await sendText(phone, lang === 'hi'
              ? `ऊपर देखें! अभी ${result.remaining} और designs बाकी हैं।\n"aur dikhao" लिखें अगले देखने के लिए 👆`
              : `Check above! ${result.remaining} more designs available.\nType "show more" for next batch 👆`);
          } else {
            await sendText(phone, lang === 'hi'
              ? `ये सभी available designs हैं! 🙏 Quantity बताएं 📦`
              : `That's all available designs! 🙏 Reply with your quantity 📦`);
          }
        }
      } else {
        // No category specified — send 1 from each as teaser
        await sendText(phone, `📸 *Our Fabric Collection*\nSending 1 sample from each category...`);
        for (const c of ['mill_print', 'digital', 'solid', 'embroidery']) {
          await sendCatalogueImages(phone, c, null, 'new_only', 1);
          await new Promise(r => setTimeout(r, 300));
        }
        await sendButtons(phone, `Like any? Choose a category for more 👆`, [['CAT_MILL','Mill Print / Solid'],['CAT_DIGITAL','Digital Print'],['CAT_EMB','Embroidery']]);
      }
      return;
    }

    if (t.includes('catalogue') || t.includes('catalog') || t.includes('portal') || t.includes('website') || t.includes('link')) {
      await sendText(phone, `🌐 *Online Catalogue & Portal*\n\nhttps://www.shreerangtrendz.com\n\nRegister to access full wholesale catalogue & place orders online! 🙏`);
      return;
    }

    // Fallback → Gemini AI
    let reply = await geminiReply(text, name, lang);
    if (!reply) {
      reply = lang === 'hi' ? `नमस्ते! हमारी team जल्द आपसे संपर्क करेगी। 🙏` : lang === 'gu' ? `Namaste! Amare team tamaro contact karshe. 🙏` : `Thank you for reaching out! Our team will contact you shortly. 🙏`;
    }
    await sendText(phone, reply);
    await saveToDb(phone, reply, 'outbound', 'text', null, 'Bot');
    await sendText(ADMIN_PHONE, `📩 *Other Enquiry*\nFrom: ${name} (+${phone})\n"${text}"\n\n🤖 Bot replied: "${reply.substring(0,80)}..."`);

  } catch (err) {
    console.error('Webhook error:', err);
  }
}
