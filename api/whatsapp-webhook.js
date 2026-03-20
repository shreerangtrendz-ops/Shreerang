// Vercel API Route — WhatsApp Bot for Shreerang Trendz (v3 - FULL SYSTEM)
// Features: Fuzzy fabric match, Admin approval, Follow-up reminders,
//           Claude AI + Gemini, Customer preference learning, Dispatch manager check,
//           Lump/Cut-pack pricing, Supplier design request loop, Multilingual (EN/HI/GU)

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '868455029689394';
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'shreerang_secure_verify_2026';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY; // updated 2026-03-20
const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

// ── Team Contacts ─────────────────────────────────
const ADMIN_PHONE    = '917567870000';   // Admin — primary decision maker
const DISPATCH_PHONE = '917874220000';   // Dispatch manager — stock confirmation
const TEAM = {
  '917567870000': 'Admin',
  '917874220000': 'Dispatch',
  '917874200054': 'Sales1',
  '917874200099': 'Sales2',
  '917874200053': 'Sales3',
  '917874200033': 'MainLine',
};

const WA_API = `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`;
const WA_HEADERS = () => ({ 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' });
const SB_HEADERS = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' });

// ── Fabric Name Database (for fuzzy matching) ─────
const FABRIC_ALIASES = {
  // full name → [aliases / partial matches]
  'capsule rayon':       ['capsule','capsel','capsl','capsul'],
  'capsule rayon doriya':['doriya','doria','dorya','capsule dori'],
  'rayon':               ['rayon','rayan'],
  'cotton':              ['cotton','coton','cottn'],
  'linen':               ['linen','linin','leinen'],
  'georgette':           ['georgette','georgete','jorjette','jorgette'],
  'chiffon':             ['chiffon','chifon','siffon','shifon'],
  'crepe':               ['crepe','crep','krepe'],
  'modal':               ['modal','modle'],
  'viscose':             ['viscose','viscos','viskose'],
  'silk':                ['silk','silck','selk'],
  'polyester':           ['polyester','poly','polister','ployster'],
  'pure crepe':          ['pure crepe','purecrepe'],
  'satin':               ['satin','sattin','saten'],
  'dobby':               ['dobby','dobi','dobbie'],
  'lawn':                ['lawn','lon','laun'],
  'poplin':              ['poplin','popelyn','poplene'],
  'cambric':             ['cambric','kambric','chambric'],
  'voile':               ['voile','voil','vhile'],
  'organza':             ['organza','organsa','organsa'],
  'tussar':              ['tussar','tusar','tussar silk'],
  'schiffli':            ['schiffli','schifli','shifli','siffli','schiffli hakoba'],
  'hakoba':              ['hakoba','hakbha','hakuba'],
  'embroidery':          ['embroidery','embroid','embordery','embroi','embroider'],
  'digital print':       ['digital','digitl','digital print','d print'],
  'mill print':          ['mill','mill print','milprint'],
  'solid dyed':          ['solid','solid dyed','soliday','plain'],
};

// ── Fuzzy Matcher ──────────────────────────────────
function fuzzyFabricMatch(input) {
  const t = input.toLowerCase().trim();
  const matches = [];
  for (const [fullName, aliases] of Object.entries(FABRIC_ALIASES)) {
    for (const alias of aliases) {
      if (t.includes(alias) || alias.includes(t)) {
        matches.push(fullName);
        break;
      }
    }
  }
  // Check for spelling errors — Levenshtein distance ≤ 2
  if (matches.length === 0) {
    for (const [fullName, aliases] of Object.entries(FABRIC_ALIASES)) {
      for (const alias of aliases) {
        if (levenshtein(t, alias) <= 2) {
          matches.push(fullName);
          break;
        }
      }
    }
  }
  return [...new Set(matches)];
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// ── WhatsApp Senders ───────────────────────────────
async function sendText(to, text) {
  const r = await fetch(WA_API, { method:'POST', headers: WA_HEADERS(),
    body: JSON.stringify({ messaging_product:'whatsapp', to, type:'text', text:{ body: text, preview_url: false } })
  });
  const d = await r.json();
  const msgId = d?.messages?.[0]?.id;
  if (msgId) await saveToDb(to, text, 'outbound', 'text', msgId, 'Bot');
  return msgId;
}

async function sendButtons(to, text, buttons) {
  // buttons = [[id, title], ...]
  const r = await fetch(WA_API, { method:'POST', headers: WA_HEADERS(),
    body: JSON.stringify({
      messaging_product:'whatsapp', to, type:'interactive',
      interactive: {
        type:'button',
        body:{ text },
        action:{ buttons: buttons.slice(0,3).map(([id,title]) => ({ type:'reply', reply:{id, title: title.substring(0,20)} })) }
      }
    })
  });
  const d = await r.json();
  const msgId = d?.messages?.[0]?.id;
  if (msgId) await saveToDb(to, text, 'outbound', 'interactive', msgId, 'Bot');
  return msgId;
}

async function sendList(to, headerText, body, buttonText, sections) {
  // sections = [{ title, rows: [{id,title,description}] }]
  const r = await fetch(WA_API, { method:'POST', headers: WA_HEADERS(),
    body: JSON.stringify({
      messaging_product:'whatsapp', to, type:'interactive',
      interactive: {
        type:'list',
        header:{ type:'text', text: headerText },
        body:{ text: body },
        action:{ button: buttonText, sections }
      }
    })
  });
  const d = await r.json();
  const msgId = d?.messages?.[0]?.id;
  if (msgId) await saveToDb(to, body, 'outbound', 'interactive', msgId, 'Bot');
  return msgId;
}

async function sendImage(to, imageUrl, caption) {
  const r = await fetch(WA_API, { method:'POST', headers: WA_HEADERS(),
    body: JSON.stringify({ messaging_product:'whatsapp', to, type:'image', image:{ link: imageUrl, caption } })
  });
  const d = await r.json();
  return d?.messages?.[0]?.id;
}

// ── Database Helpers ───────────────────────────────
async function saveToDb(phone, content, direction, msgType, waId, senderName) {
  try {
    // Upsert conversation
    const convResp = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_conversations?phone_number=eq.${phone}`, { headers: SB_HEADERS() });
    const convData = await convResp.json();
    let convId;
    if (convData?.length > 0) {
      convId = convData[0].id;
      await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_conversations?id=eq.${convId}`, {
        method:'PATCH', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
        body: JSON.stringify({ last_message: content?.substring(0,100), last_message_at: new Date().toISOString(), unread_count: direction === 'inbound' ? (convData[0].unread_count||0)+1 : 0 })
      });
    } else {
      const nr = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_conversations`, {
        method:'POST', headers: { ...SB_HEADERS(), Prefer:'return=representation' },
        body: JSON.stringify({ phone_number: phone, customer_name: senderName, last_message: content?.substring(0,100), last_message_at: new Date().toISOString(), unread_count: direction === 'inbound' ? 1 : 0 })
      });
      const nd = await nr.json();
      convId = nd?.[0]?.id;
    }
    if (!convId) return;
    // Insert message
    await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
      method:'POST', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
      body: JSON.stringify({ conversation_id: convId, content, direction, message_type: msgType, whatsapp_message_id: waId, status: direction === 'outbound' ? 'sent' : 'received', created_at: new Date().toISOString() })
    });
  } catch(e) { console.error('saveToDb error:', e); }
}

async function getCustomerInfo(phone) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/customers?phone=eq.${phone}&select=id,name,firm_name,price_tier,fabric_interest,language_preference,total_orders&limit=1`, { headers: SB_HEADERS() });
    const data = await r.json();
    return data?.[0] || null;
  } catch { return null; }
}

async function updateCustomerPreferences(phone, updates) {
  try {
    const existing = await getCustomerInfo(phone);
    if (!existing) return;
    await fetch(`${SUPABASE_URL}/rest/v1/customers?phone=eq.${phone}`, {
      method:'PATCH', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
      body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() })
    });
  } catch(e) { console.error('updatePrefs error:', e); }
}

async function createLeadIfNew(phone, name, interestTag, lang) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/customers?phone=eq.${phone}&select=id&limit=1`, { headers: SB_HEADERS() });
    const existing = await r.json();
    if (existing?.length > 0) {
      // Update language preference
      if (lang) await fetch(`${SUPABASE_URL}/rest/v1/customers?phone=eq.${phone}`, {
        method:'PATCH', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
        body: JSON.stringify({ language_preference: lang })
      });
      return;
    }
    await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
      method:'POST', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
      body: JSON.stringify({ name, phone, source:'whatsapp_bot', status:'lead', fabric_interest: interestTag, language_preference: lang || 'en', created_at: new Date().toISOString() })
    });
  } catch(e) { console.error('createLead error:', e); }
}

// ── Follow-up Scheduler ────────────────────────────
async function scheduleFollowUp(phone, delayMinutes, message, customerName) {
  try {
    const fireAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_followups`, {
      method:'POST', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
      body: JSON.stringify({ phone_number: phone, customer_name: customerName, message, fire_at: fireAt, status: 'pending', created_at: new Date().toISOString() })
    });
    console.log(`Follow-up scheduled for ${phone} in ${delayMinutes}min`);
  } catch(e) { console.error('scheduleFollowUp error:', e); }
}

// ── Admin Approval System ──────────────────────────
async function requestAdminApproval(phone, customerName, requestType, details, pendingMessage) {
  try {
    const approvalId = `APR_${phone}_${Date.now()}`;
    // Store pending approval
    await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_admin_approvals`, {
      method:'POST', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
      body: JSON.stringify({
        approval_id: approvalId, customer_phone: phone, customer_name: customerName,
        request_type: requestType, details: JSON.stringify(details),
        pending_message: pendingMessage, status: 'pending',
        created_at: new Date().toISOString()
      })
    });
    // Notify admin with quick reply buttons
    await sendButtons(ADMIN_PHONE,
      `🔔 *${requestType}*\n👤 ${customerName} (+${phone})\n📋 ${details.summary || ''}\n\nApprove to send?`,
      [['APR_YES_' + approvalId.substring(0,8), '✅ Approve & Send'],
       ['APR_EDIT_' + approvalId.substring(0,8), '✏️ Edit Price'],
       ['APR_NO_' + approvalId.substring(0,8), '❌ Decline']]
    );
    return approvalId;
  } catch(e) { console.error('requestAdminApproval error:', e); }
}

async function getApproval(approvalId) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_admin_approvals?approval_id=eq.${approvalId}&limit=1`, { headers: SB_HEADERS() });
    const data = await r.json();
    return data?.[0] || null;
  } catch { return null; }
}

// ── Catalogue Image Sender ─────────────────────────
async function sendCatalogueImages(phone, category, subcategory, mode = 'new_only', batchSize = 3) {
  try {
    let url = `${SUPABASE_URL}/rest/v1/fabric_catalogue?select=id,name,image_url,description,price_range,tag&category=eq.${encodeURIComponent(category)}&in_stock=eq.true&order=sort_order.asc,created_at.desc`;
    if (subcategory) url += `&subcategory=eq.${encodeURIComponent(subcategory)}`;
    const catResp = await fetch(url, { headers: SB_HEADERS() });
    const allItems = await catResp.json();
    if (!allItems || allItems.length === 0) return { sent:0, total:0, allSeen:false };

    let itemsToSend = allItems;
    if (mode === 'new_only' || mode === 'more') {
      const sentResp = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_designs_sent?select=catalogue_id&phone_number=eq.${phone}`, { headers: SB_HEADERS() });
      const sentData = await sentResp.json();
      const sentIds = new Set((sentData || []).map(s => s.catalogue_id));
      itemsToSend = allItems.filter(item => !sentIds.has(item.id));
    }
    if (itemsToSend.length === 0) return { sent:0, total:allItems.length, allSeen:true };

    const batch = mode === 'all' ? itemsToSend : itemsToSend.slice(0, batchSize);
    const hasMore = itemsToSend.length > batch.length;
    const sentIds = [];

    for (const item of batch) {
      const tag = item.tag ? ` [${item.tag}]` : '';
      const caption = `*${item.name}*${tag}\n${item.description ? item.description + '\n' : ''}💰 ${item.price_range || 'Price on request'}\n\nInterested? Reply with quantity 📦`;
      const waResp = await fetch(WA_API, { method:'POST', headers: WA_HEADERS(),
        body: JSON.stringify({ messaging_product:'whatsapp', to:phone, type:'image', image:{ link:item.image_url, caption } })
      });
      const waData = await waResp.json();
      if (waData?.messages?.[0]?.id) sentIds.push(item.id);
      await new Promise(r => setTimeout(r, 400));
    }

    if (sentIds.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_designs_sent?on_conflict=phone_number,catalogue_id`, {
        method:'POST', headers: { ...SB_HEADERS(), Prefer:'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify(sentIds.map(id => ({ phone_number:phone, catalogue_id:id })))
      });
    }
    return { sent:sentIds.length, total:allItems.length, hasMore, remaining:itemsToSend.length - batch.length, allSeen:false };
  } catch(e) { console.error('sendCatalogueImages error:', e); return { sent:0, total:0, allSeen:false }; }
}

// ── AI Reply Engines ───────────────────────────────
async function geminiReply(text, name, lang, context = '') {
  try {
    const langName = lang === 'hi' ? 'Hindi' : lang === 'gu' ? 'Gujarati' : 'English';
    const prompt = `You are a warm, professional WhatsApp sales assistant for Shreerang Trendz, premium fabric business in Surat, India. Fabrics: Mill Print, Solid Dyed, Digital Print (Polyester & Pure bases), Embroidery, Schiffli, Hakoba. Pricing: Regular, Discharge, Premium, Premium Discharge tags. Lump (50+ mtrs), Cut Pack (20 mtr sets).
Customer: ${name} | Language: ${langName}
${context ? 'Context: ' + context : ''}
Message: "${text}"
Reply warmly in SAME language (${langName}), max 80 words, professional yet friendly. Just reply text.`;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{ parts:[{ text:prompt }] }], generationConfig:{ maxOutputTokens:200, temperature:0.4 } })
    });
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch { return ''; }
}

async function claudeReply(text, name, lang, customerHistory, intent) {
  // Used for complex analysis, preference extraction, personalised recommendations
  if (!CLAUDE_KEY) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers: { 'x-api-key': CLAUDE_KEY, 'anthropic-version':'2023-06-01', 'content-type':'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: `You are a fabric sales AI for Shreerang Trendz, Surat. You analyse customer intent and generate personalised responses. Fabrics: Mill Print (Regular/Discharge/Premium tags), Solid Dyed, Digital Print (Poly/Pure base, Allover/Kurti/Coord/Kaftan styles), Embroidery/Schiffli (Allover/Patta/Panel/Straight/Anarkali/Coordset/GPO). Always respond in customer's language. Keep replies under 100 words.`,
        messages: [{
          role:'user',
          content: `Customer: ${name}\nLanguage: ${lang}\nIntent: ${intent}\nHistory: ${customerHistory || 'New customer'}\nMessage: "${text}"\n\nGenerate a personalised, helpful response that references their history if available.`
        }]
      })
    });
    const d = await r.json();
    return d.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

async function extractPreferencesWithAI(conversationText, phone) {
  // Run in background — extract and save customer preferences
  if (!CLAUDE_KEY) return;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers: { 'x-api-key': CLAUDE_KEY, 'anthropic-version':'2023-06-01', 'content-type':'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        system: 'Extract customer fabric preferences from conversation. Return JSON only: { fabric_interest, price_tier (lump/cutpack/unknown), preferred_styles, width_preference, notes }',
        messages: [{ role:'user', content: conversationText }]
      })
    });
    const d = await r.json();
    const text = d.content?.[0]?.text?.trim() || '';
    const prefs = JSON.parse(text.replace(/```json|```/g,'').trim());
    if (prefs && phone) await updateCustomerPreferences(phone, prefs);
  } catch {}
}

async function getOrderStatus(phone) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/sales_orders?customer_phone=eq.${phone}&select=order_number,status,total_amount,created_at&order=created_at.desc&limit=3`, { headers: SB_HEADERS() });
    return await r.json();
  } catch { return []; }
}

// ── Main Handler ───────────────────────────────────
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'], token = req.query['hub.verify_token'], challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).json({ error:'Forbidden' });
  }
  if (req.method !== 'POST') return res.status(405).end();
  res.status(200).json({ status:'EVENT_RECEIVED' });

  try {
    const body = req.body;

    // ── Status updates ──
    const statuses = body?.entry?.[0]?.changes?.[0]?.value?.statuses;
    if (statuses?.length > 0) {
      for (const s of statuses) {
        if (s.id && s.status) {
          await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages?whatsapp_message_id=eq.${encodeURIComponent(s.id)}`, {
            method:'PATCH', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
            body: JSON.stringify({ status: s.status })
          });
        }
      }
      return;
    }

    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contact = body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
    if (!message) return;

    const phone = message.from;
    const name = contact?.profile?.name || 'Customer';
    const msgType = message.type;
    const isStaff = !!TEAM[phone];
    const isAdmin = phone === ADMIN_PHONE;

    let text = '', mediaId = null, interactiveId = '', interactiveTitle = '';
    if (msgType === 'text') text = message.text?.body || '';
    else if (msgType === 'image') { mediaId = message.image?.id; text = '[IMAGE]'; }
    else if (msgType === 'interactive') {
      const ir = message.interactive;
      if (ir.type === 'button_reply') { interactiveId = ir.button_reply.id; interactiveTitle = ir.button_reply.title; text = interactiveId; }
      else if (ir.type === 'list_reply') { interactiveId = ir.list_reply.id; interactiveTitle = ir.list_reply.title; text = interactiveId; }
    }

    const lang = /[\u0A80-\u0AFF]/.test(text) ? 'gu' : /[\u0900-\u097F]/.test(text) ? 'hi' : 'en';
    const t = text.toLowerCase().trim();

    // ✅ Save incoming
    await saveToDb(phone, text || mediaId || '', 'inbound', msgType, message.id, name);

    // ══════════════════════════════════════════
    // ADMIN COMMAND HANDLER
    // ══════════════════════════════════════════
    if (isAdmin || isStaff) {
      // Admin approving a price request
      if (interactiveId.startsWith('APR_YES_') || interactiveId.startsWith('APR_EDIT_') || interactiveId.startsWith('APR_NO_')) {
        const shortId = interactiveId.split('_').slice(2).join('_');
        // Find the full approval record
        const apprResp = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_admin_approvals?approval_id=like.APR_*${shortId}*&status=eq.pending&limit=1`, { headers: SB_HEADERS() });
        const apprData = await apprResp.json();
        const approval = apprData?.[0];
        if (!approval) { await sendText(ADMIN_PHONE, '⚠️ Approval record not found or already processed.'); return; }

        if (interactiveId.startsWith('APR_YES_')) {
          await sendText(approval.customer_phone, approval.pending_message);
          await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_admin_approvals?id=eq.${approval.id}`, {
            method:'PATCH', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
            body: JSON.stringify({ status:'approved', resolved_at: new Date().toISOString() })
          });
          await sendText(ADMIN_PHONE, `✅ Sent to ${approval.customer_name}`);
          // Schedule follow-up
          await scheduleFollowUp(approval.customer_phone, 15, `Hi ${approval.customer_name}, did you receive the pricing? Any questions? 🙏`, approval.customer_name);
        } else if (interactiveId.startsWith('APR_EDIT_')) {
          await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_admin_approvals?id=eq.${approval.id}`, {
            method:'PATCH', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
            body: JSON.stringify({ status:'edit_pending' })
          });
          await sendText(ADMIN_PHONE, `✏️ Please reply with the edited price for ${approval.customer_name}.\n\nType: PRICE ${approval.customer_phone} <your message>`);
        } else {
          await sendText(approval.customer_phone, lang === 'hi' ? 'हमारी team जल्द आपसे contact करेगी। 🙏' : lang === 'gu' ? 'Amare team tamaro contact karshe. 🙏' : 'Our team will contact you shortly. 🙏');
          await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_admin_approvals?id=eq.${approval.id}`, {
            method:'PATCH', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
            body: JSON.stringify({ status:'declined', resolved_at: new Date().toISOString() })
          });
        }
        return;
      }

      // Admin sending custom price: "PRICE 91XXXXXXXXXX message"
      if (t.startsWith('price ') && isAdmin) {
        const parts = text.split(' ');
        const targetPhone = parts[1];
        const priceMsg = parts.slice(2).join(' ');
        if (targetPhone && priceMsg) {
          await sendText(targetPhone, `💰 *Pricing for you:*\n\n${priceMsg}\n\nFor orders, reply with quantity. 🙏`);
          await sendText(ADMIN_PHONE, `✅ Price sent to ${targetPhone}`);
          await scheduleFollowUp(targetPhone, 20, `Hi! Did you receive our pricing? Any questions about the fabric? 🙏`, 'Customer');
        }
        return;
      }

      // Admin assigning to sales person: "ASSIGN 91XXXXXXXXXX Sales1"
      if (t.startsWith('assign ') && isAdmin) {
        const parts = text.split(' ');
        const targetPhone = parts[1], salesPerson = parts[2] || 'Sales Team';
        if (targetPhone) {
          await sendText(targetPhone, `Hi! I'm ${salesPerson} from Shreerang Trendz. I'll be assisting you personally. How can I help? 🙏`);
          await sendText(ADMIN_PHONE, `✅ ${targetPhone} assigned to ${salesPerson}`);
        }
        return;
      }

      // Staff messages to customers: "SEND 91XXXXXXXXXX message"
      if (t.startsWith('send ') && isStaff) {
        const parts = text.split(' ');
        const targetPhone = parts[1], msg = parts.slice(2).join(' ');
        if (targetPhone && msg) { await sendText(targetPhone, msg); }
        return;
      }

      // Dispatch confirming stock
      if (phone === DISPATCH_PHONE && (t.includes('confirmed') || t.includes('ready') || t.includes('stock ok'))) {
        // Find pending dispatch approvals
        const pendResp = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_admin_approvals?request_type=eq.dispatch_check&status=eq.pending&order=created_at.desc&limit=5`, { headers: SB_HEADERS() });
        const pending = await pendResp.json();
        if (pending?.length > 0) {
          for (const p of pending.slice(0,1)) {
            await sendText(p.customer_phone, p.pending_message);
            await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_admin_approvals?id=eq.${p.id}`, {
              method:'PATCH', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
              body: JSON.stringify({ status:'approved' })
            });
          }
          await sendText(DISPATCH_PHONE, `✅ Sent to customer. ${pending.length > 1 ? pending.length-1 + ' more pending.' : ''}`);
        }
        return;
      }

      // Staff don't trigger bot logic
      return;
    }

    // ══════════════════════════════════════════
    // CUSTOMER HANDLER
    // ══════════════════════════════════════════
    const customer = await getCustomerInfo(phone);

    // ── FUZZY FABRIC MATCH CHECK ──────────────
    // Check if message contains a partial/misspelled fabric name before any other logic
    const wantsFabricImages = t.includes('bhejo') || t.includes('bhej') || t.includes('send') || t.includes('show') || t.includes('photo') || t.includes('image') || t.includes('pic') || t.includes('design') || t.includes('dikhao') || t.includes('dikha');
    if (wantsFabricImages && !interactiveId) {
      const matches = fuzzyFabricMatch(t.replace(/bhejo|bhej|send|show|photo|image|pic|design|dikhao|dikha|ke|ka|ki|photos|images|designs/g,'').trim());
      if (matches.length > 1) {
        // Multiple possible matches — ask customer to confirm
        const buttons = matches.slice(0,3).map((m,i) => [`FABRIC_${m.replace(/\s/g,'_').toUpperCase()}`, m.charAt(0).toUpperCase() + m.slice(1)]);
        await sendButtons(phone,
          lang === 'hi' ? `🧵 क्या आप यह fabric देखना चाहते हैं?\n(Which fabric did you mean?)` :
          lang === 'gu' ? `🧵 Tamne kai fabric joie? (Which fabric?)` :
          `🧵 Did you mean one of these fabrics?`,
          buttons
        );
        return;
      } else if (matches.length === 1) {
        // Single match but different from exact — confirm spelling
        const matched = matches[0];
        const exactTyped = t.replace(/bhejo|bhej|send|show|photo|image|pic|design|dikhao|dikha/g,'').trim();
        if (!exactTyped.includes(matched)) {
          await sendButtons(phone,
            lang === 'hi' ? `🧵 क्या आप *${matched}* के designs देखना चाहते हैं?` :
            lang === 'gu' ? `🧵 Tamne *${matched}* na designs joie?` :
            `🧵 Do you mean *${matched}* designs?`,
            [[`FABRIC_${matched.replace(/\s/g,'_').toUpperCase()}`, `✅ Yes, ${matched}`],
             ['FABRIC_OTHER', '❌ No, different fabric']]
          );
          return;
        }
      }
    }

    // ── FUZZY BUTTON RESPONSE ─────────────────
    if (interactiveId.startsWith('FABRIC_') && !interactiveId.startsWith('FABRIC_OTHER')) {
      const rawName = interactiveId.replace('FABRIC_','').replace(/_/g,' ').toLowerCase();
      // Map to category
      let category = 'mill_print';
      if (rawName.includes('digital')) category = 'digital';
      else if (rawName.includes('embroid')) category = 'embroidery';
      else if (rawName.includes('schiffli')) category = 'schiffli';
      else if (rawName.includes('hakoba')) category = 'hakoba';
      else if (rawName.includes('solid') || rawName.includes('dyed')) category = 'solid';

      await sendText(phone, lang === 'hi' ? `📸 ${rawName} के designs भेज रहे हैं...` : lang === 'gu' ? `📸 ${rawName} na designs mokli rahya che...` : `📸 Sending ${rawName} designs...`);
      const result = await sendCatalogueImages(phone, category, rawName !== category ? rawName : null, 'new_only', 3);
      if (result.allSeen) {
        await sendText(phone, lang === 'hi' ? `आपने सभी ${rawName} designs देख लिए हैं! नए designs जल्द आएंगे 🔔` : `You've seen all ${rawName} designs! New arrivals coming soon 🔔`);
      } else if (result.hasMore) {
        await sendText(phone, lang === 'hi' ? `ऊपर देखें! ${result.remaining} और designs बाकी हैं।\n"aur dikhao" लिखें 👆` : `Check above! ${result.remaining} more available. Type "show more" 👆`);
      }
      await createLeadIfNew(phone, name, rawName, lang);
      await scheduleFollowUp(phone, 15, lang === 'hi' ? `${name} जी, designs पसंद आए? Quantity बताएं तो price दें! 🙏` : lang === 'gu' ? `${name}, designs gamya? Quantity janavjo price mate! 🙏` : `Hi ${name}! How do you like the ${rawName} designs? Share your quantity for pricing! 🙏`, name);
      return;
    }

    if (interactiveId === 'FABRIC_OTHER') {
      await sendButtons(phone,
        lang === 'hi' ? `कौनसा fabric चाहिए?` : lang === 'gu' ? `Kai fabric joie?` : `Which category are you looking for?`,
        [['CAT_MILL','Mill Print / Solid'],['CAT_DIGITAL','Digital Print'],['CAT_EMB','Embroidery/Schiffli']]
      );
      return;
    }

    // ── GREETINGS ─────────────────────────────
    const GREETINGS = ['hi','hello','hey','hii','namaskar','namaste','kem cho','start','salam','good morning','good evening','good afternoon','kem che','hanji','ji','hey there','howdy','helo','hlw'];
    const isGreeting = !text || GREETINGS.some(g => t === g || t.startsWith(g + ' ') || t.startsWith(g + ','));

    if (isGreeting) {
      const greetName = customer ? ` *${customer.name}*` : ` *${name}*`;
      const prevInterest = customer?.fabric_interest ? `\n_Last interest: ${customer.fabric_interest}_` : '';
      const greetMsg =
        lang === 'hi' ? `नमस्ते${greetName} जी! 🙏\n\nShreerang Trendz में आपका स्वागत है। 🧵✨\n_Premium Fabrics from Surat_${prevInterest}\n\nकौनसा fabric चाहिए?` :
        lang === 'gu' ? `નમસ્તે${greetName}! 🙏\n\nShreerang Trendz માં આપનું સ્વાગત! 🧵✨\n_Premium Fabrics from Surat_${prevInterest}\n\nKai fabric joie?` :
        `Welcome${greetName}! 🙏\n\n*Shreerang Trendz* — Premium Fabrics from Surat 🧵✨${prevInterest}\n\nWhat fabric are you looking for?`;
      await sendButtons(phone, greetMsg, [['CAT_MILL','Mill Print / Solid'],['CAT_DIGITAL','Digital Print'],['CAT_EMB','Embroidery/Schiffli']]);
      await createLeadIfNew(phone, name, 'enquiry', lang);
      // Notify admin of new enquiry
      await sendText(ADMIN_PHONE, `👋 *New WhatsApp Enquiry*\n👤 ${name} (+${phone})\n🌐 Language: ${lang.toUpperCase()}\n${customer ? '🔄 Returning customer' : '🆕 New lead'}`);
      return;
    }

    // ── ORDER STATUS ──────────────────────────
    if (t.includes('order') || t.includes('status') || interactiveId === 'ORDER_STATUS') {
      const orders = await getOrderStatus(phone);
      if (orders.length === 0) {
        await sendText(phone, lang === 'hi' ? `📦 आपका कोई order नहीं मिला।\n\nNew order के लिए बताएं — कौनसा fabric चाहिए?` : lang === 'gu' ? `📦 Tamaro koi order nathi malyo.\n\nNew order mate janavjo — kai fabric joie?` : `📦 No orders found for your number.\n\nTo place a new order, tell us which fabric you need!`);
      } else {
        const lines = orders.map((o,i) => `${i+1}. Order ${o.order_number} — ${o.status?.toUpperCase()} — ₹${Number(o.total_amount||0).toLocaleString('en-IN')}`).join('\n');
        await sendText(phone, `📦 *Your Recent Orders:*\n\n${lines}\n\nFor details call: +91-7874200033`);
      }
      return;
    }

    // ── PRICE ENQUIRY → ADMIN APPROVAL ───────
    if (t.includes('price') || t.includes('rate') || t.includes('bhav') || t.includes('daam') || t.includes('kitna') || t.includes('cost') || interactiveId === 'PRICE_CHECK') {
      // Ask quantity type first
      await sendButtons(phone,
        lang === 'hi' ? `💰 Price के लिए quantity type बताएं:` : lang === 'gu' ? `💰 Price mate quantity type janavjo:` : `💰 For pricing, please specify order type:`,
        [['PRICE_LUMP','Lump (50+ mtrs)'],['PRICE_CUT','Cut Pack (20 mtr)'],['PRICE_SAMPLE','Sample/Query']]
      );
      return;
    }

    if (interactiveId.startsWith('PRICE_')) {
      const qtyType = interactiveId === 'PRICE_LUMP' ? 'Lump (50+ mtrs)' : interactiveId === 'PRICE_CUT' ? 'Cut Pack (20 mtrs) +₹2-3/mtr' : 'Sample Query';
      const isCutPack = interactiveId === 'PRICE_CUT';

      // Tell customer to wait
      await sendText(phone, lang === 'hi' ? `✅ ${qtyType} pricing के लिए request भेज दी है।\nAdmin से confirm होने पर तुरंत price भेजेंगे! 🙏` : lang === 'gu' ? `✅ ${qtyType} pricing mate request bhedi chhe.\nAdmin confirm karse tyare price mokalishu! 🙏` : `✅ Your ${qtyType} pricing request has been sent!\nWe'll send you the price shortly. 🙏`);

      // Save customer preference
      if (isCutPack) await updateCustomerPreferences(phone, { price_tier: 'cutpack' });
      else if (interactiveId === 'PRICE_LUMP') await updateCustomerPreferences(phone, { price_tier: 'lump' });

      // Request admin approval with context
      await requestAdminApproval(phone, name, 'Price Request', {
        summary: `${qtyType} pricing for ${customer?.fabric_interest || 'fabric (unspecified)'}\nCustomer type: ${customer ? 'Returning' : 'New'}\n${isCutPack ? '⚠️ Cut-pack: add ₹2-3/mtr to lump price' : ''}`
      }, `Hi ${name}! Here's the pricing for ${qtyType}:\n\n[Admin will fill price here]\n\nFor orders, reply with quantity. 🙏`);

      // Schedule follow-up if no response in 20 min
      await scheduleFollowUp(phone, 20, lang === 'hi' ? `${name} जी, क्या आपको pricing मिली? कोई question हो तो बताएं! 🙏` : lang === 'gu' ? `${name}, price mali? Koi sawal hoy to janavjo! 🙏` : `Hi ${name}! Did you receive our pricing? Let us know if you have any questions! 🙏`, name);
      return;
    }

    // ── MILL PRINT FLOW ───────────────────────
    if (interactiveId === 'CAT_MILL' || (!interactiveId && (t.includes('mill') || t.includes('solid') || t.includes('plain')))) {
      // First check dispatch for stock
      await requestAdminApproval(DISPATCH_PHONE, 'BOT', 'dispatch_check', { summary: `Customer ${name} asking for Mill Print. Stock updated?` },
        ``); // pending_message filled after dispatch confirms

      const millResult = await sendCatalogueImages(phone, 'mill_print', null, 'new_only', 3);
      let millMsg = millResult.allSeen
        ? (lang === 'hi' ? `आपने सभी Mill Print designs देख लिए हैं! 🙏 नए जल्द आएंगे।\n\nWidth चाहिए?` : `You've seen all our Mill Print designs! New arrivals soon.\n\nWhich width?`)
        : (lang === 'hi' ? `ऊपर देखें ${millResult.sent || ''} designs! 👆${millResult.hasMore ? ` (${millResult.remaining} और — "aur dikhao" लिखें)` : ''}\n\nWidth चाहिए?` : `Check ${millResult.sent || 'our'} designs above! 👆${millResult.hasMore ? ` (${millResult.remaining} more — type "show more")` : ''}\n\nWhich width?`);
      await sendButtons(phone, millMsg, [['MP_44','44 inch'],['MP_58','58 inch'],['MP_60','60 inch']]);
      await createLeadIfNew(phone, name, 'Mill Print', lang);
      await scheduleFollowUp(phone, 15, lang === 'hi' ? `${name} जी, Mill Print designs पसंद आए? Quantity बताएं! 🙏` : `Hi ${name}! Like our Mill Print designs? Tell us your quantity for pricing! 🙏`, name);
      return;
    }

    if (interactiveId.startsWith('MP_')) {
      const width = interactiveId.replace('MP_','');
      await updateCustomerPreferences(phone, { preferred_width: width });
      await sendButtons(phone, `Width: ${width}" ✅\n\nFabric tag preference?`, [['MPT_REG','Regular'],['MPT_DIS','Discharge'],['MPT_PREM','Premium'],]);
      return;
    }

    if (interactiveId.startsWith('MPT_')) {
      const type = { MPT_REG:'Regular', MPT_DIS:'Discharge', MPT_PREM:'Premium', MPT_PREMIS:'Premium Discharge' }[interactiveId] || interactiveId;
      await updateCustomerPreferences(phone, { fabric_interest: `Mill Print ${type}` });
      await sendText(phone, lang === 'hi' ? `✅ Mill Print | ${type}\n\nQuantity बताएं (meters में) 📐` : `✅ Mill Print | ${type}\n\nHow many meters do you need? 📐`);
      await sendText(ADMIN_PHONE, `🔔 *Mill Print Enquiry*\n👤 ${name} (+${phone})\n🏷️ Type: ${type}\n📱 Lang: ${lang.toUpperCase()}\n\n👉 Share designs & price`);
      return;
    }

    // ── DIGITAL PRINT FLOW ────────────────────
    if (interactiveId === 'CAT_DIGITAL' || (!interactiveId && t.includes('digital'))) {
      const digResult = await sendCatalogueImages(phone, 'digital', null, 'new_only', 3);
      const digMsg = digResult.allSeen
        ? `You've seen all our Digital Print designs! New arrivals soon.\n\nWhich base fabric?`
        : `Check ${digResult.sent || 'our'} Digital Prints above! 👆${digResult.hasMore ? ` (${digResult.remaining} more — type "show more")` : ''}\n\nWhich base fabric?`;
      await sendButtons(phone, digMsg, [['DP_POLY','Polyester Base'],['DP_PURE','Pure Base'],['DP_BOTH','Both']]);
      await createLeadIfNew(phone, name, 'Digital Print', lang);
      await scheduleFollowUp(phone, 15, `Hi ${name}! Did you like our Digital Print collection? We'd love to help you choose the perfect design! 🙏`, name);
      return;
    }

    if (interactiveId.startsWith('DP_')) {
      const base = interactiveId === 'DP_POLY' ? 'Polyester' : interactiveId === 'DP_PURE' ? 'Pure' : 'Both';
      await updateCustomerPreferences(phone, { fabric_interest: `Digital Print ${base}` });
      await sendList(phone, '🎨 Design Style', `Digital | ${base} ✅\n\nChoose your style:`, 'Select Style', [{
        title: 'Ready Garment Styles',
        rows: [
          { id:'DPS_ALLOVER', title:'Allover Pattern', description:'Full fabric design' },
          { id:'DPS_KURTI', title:'Kurti Panel', description:'Ready-cut panels' },
          { id:'DPS_COORD', title:'Co-ord Sets', description:'Matching top-bottom' },
          { id:'DPS_KAFTAN', title:'Kaftan Style', description:'Flowing design' },
        ]
      }]);
      return;
    }

    if (interactiveId.startsWith('DPS_')) {
      const styleMap = { DPS_ALLOVER:'Allover', DPS_KURTI:'Kurti Panel', DPS_COORD:'Co-ord Sets', DPS_KAFTAN:'Kaftan' };
      const style = styleMap[interactiveId] || interactiveId;
      await updateCustomerPreferences(phone, { preferred_styles: style });
      await sendText(phone, lang === 'hi' ? `✅ Digital | ${style}\n\nQuantity (mtrs) और width (44"/58"/60") बताएं 📐\nया photo भेजें 📸` : `✅ Digital | ${style}\n\nPlease share: Quantity (mtrs) + Width (44"/58"/60") 📐\nOr send a reference photo 📸`);
      await sendText(ADMIN_PHONE, `🔔 *Digital Print Enquiry*\n👤 ${name} (+${phone})\n🎨 Style: ${style}\n\n👉 Share catalogue & price`);
      return;
    }

    // ── EMBROIDERY / SCHIFFLI FLOW ────────────
    if (interactiveId === 'CAT_EMB' || (!interactiveId && (t.includes('embroid') || t.includes('schiffli') || t.includes('hakoba')))) {
      await sendCatalogueImages(phone, 'embroidery', null, 'new_only', 2);
      await sendCatalogueImages(phone, 'schiffli', null, 'new_only', 1);
      await sendList(phone, '🪡 Embroidery Type', 'Check our collection above! 👆\n\nChoose type:', 'Select', [{
        title: 'Embroidery Styles',
        rows: [
          { id:'EMB_ALLOVER', title:'Allover', description:'Full fabric embroidery' },
          { id:'EMB_PATTA', title:'Patta Allover', description:'Border + allover' },
          { id:'EMB_PANEL', title:'Panel', description:'Suit/salwar panels' },
          { id:'EMB_ANARKALI', title:'Anarkali', description:'Flared cut panels' },
          { id:'EMB_GPO', title:'GPO Accessories', description:'Dupatta, potli, etc.' },
        ]
      }, {
        title: 'Schiffli / Hakoba',
        rows: [
          { id:'EMB_SCHIFFLI', title:'Schiffli', description:'Machine lace work' },
          { id:'EMB_HAKOBA', title:'Hakoba', description:'Weave + embroidery' },
        ]
      }]);
      await createLeadIfNew(phone, name, 'Embroidery', lang);
      await scheduleFollowUp(phone, 15, `Hi ${name}! How did you find our Embroidery collection? Ready to place an order? 🙏`, name);
      return;
    }

    if (interactiveId.startsWith('EMB_')) {
      const typeMap = { EMB_ALLOVER:'Allover', EMB_PATTA:'Patta Allover', EMB_PANEL:'Panel', EMB_ANARKALI:'Anarkali', EMB_GPO:'GPO Accessories', EMB_SCHIFFLI:'Schiffli', EMB_HAKOBA:'Hakoba', EMB_COORDSET:'Coord Set' };
      const type = typeMap[interactiveId] || interactiveId;
      await updateCustomerPreferences(phone, { fabric_interest: `Embroidery ${type}` });
      await sendText(phone, lang === 'hi' ? `✅ ${type}\n\nFabric name बताएं (Georgette, Rayon, Net...) और quantity + width 📐` : `✅ ${type}\n\nPlease share:\n• Fabric base (Georgette, Rayon, Net...)\n• Quantity (mtrs) + Width\n• Cut or Farma?\n\nOr send a reference photo 📸`);
      await sendText(ADMIN_PHONE, `🔔 *${type} Enquiry*\n👤 ${name} (+${phone})\n\n👉 Share designs & price`);
      return;
    }

    // ── CUSTOMER SHARING A DESIGN IMAGE ──────
    if (msgType === 'image') {
      await sendText(phone, lang === 'hi' ? `✅ Design photo मिल गई! 📸\nहमारी team similar designs ढूंढेगी।\nKitne meters चाहिए?` : lang === 'gu' ? `✅ Design photo mali! 📸\nAmare team similar designs shodhshe.\nKetla meter joie?` : `✅ Design photo received! 📸\nOur team will find similar designs for you.\nHow many meters do you need?`);
      await sendText(ADMIN_PHONE, `📸 *Design Photo Received*\n👤 ${name} (+${phone})\n🖼️ Media ID: ${mediaId}\n\n👉 Find similar designs & respond to customer`);
      // Save image reference for procurement DB
      await fetch(`${SUPABASE_URL}/rest/v1/customer_design_references`, {
        method:'POST', headers: { ...SB_HEADERS(), Prefer:'return=minimal' },
        body: JSON.stringify({ customer_phone:phone, customer_name:name, media_id:mediaId, status:'pending', created_at: new Date().toISOString() })
      }).catch(() => {});
      return;
    }

    // ── "SHOW MORE" / "ALL DESIGNS" ───────────
    const wantsMore = t.includes('aur dikhao') || t.includes('more designs') || t.includes('show more') || t.includes('next') || t.includes('aur batao');
    const wantsAll = t.includes('sab dikhao') || t.includes('all designs') || t.includes('sabhi') || t.includes('full catalogue');

    if (wantsMore || wantsAll) {
      const mode = wantsAll ? 'all' : 'new_only';
      const batchSize = wantsAll ? 10 : 3;
      let cat = null;
      if (t.includes('mill') || t.includes('cotton') || t.includes('plain')) cat = 'mill_print';
      else if (t.includes('digital')) cat = 'digital';
      else if (t.includes('embroid') || t.includes('emb')) cat = 'embroidery';
      else if (t.includes('schiffli')) cat = 'schiffli';
      else if (t.includes('hakoba')) cat = 'hakoba';
      else if (t.includes('solid') || t.includes('dyed')) cat = 'solid';
      else if (customer?.fabric_interest) {
        // Use last known interest
        const fi = customer.fabric_interest.toLowerCase();
        if (fi.includes('mill')) cat = 'mill_print';
        else if (fi.includes('digital')) cat = 'digital';
        else if (fi.includes('embroid') || fi.includes('schiffli')) cat = 'embroidery';
      }

      if (cat) {
        await sendText(phone, `📸 Sending...`);
        const result = await sendCatalogueImages(phone, cat, null, mode, batchSize);
        if (result.allSeen) await sendText(phone, `You've seen all ${cat.replace('_',' ')} designs! 🙏 New arrivals coming 🔔\nReady to order?`);
        else if (result.sent > 0 && result.hasMore) await sendText(phone, `${result.remaining} more available. Type "show more" 👆`);
        else if (result.sent > 0) await sendText(phone, `That's all available designs! 🙏 Reply with quantity to order 📦`);
      } else {
        await sendButtons(phone, `Which fabric category?`, [['CAT_MILL','Mill Print / Solid'],['CAT_DIGITAL','Digital Print'],['CAT_EMB','Embroidery']]);
      }
      return;
    }

    // ── CATALOGUE / WEBSITE ───────────────────
    if (t.includes('catalogue') || t.includes('catalog') || t.includes('website') || t.includes('portal') || t.includes('link')) {
      await sendText(phone, `🌐 *Online Catalogue*\n\nhttps://www.shreerangtrendz.com\n\nRegister to access full wholesale catalogue & place orders! 🙏`);
      return;
    }

    // ── QUANTITY MENTIONED → TRIGGER PRICING ─
    const hasQuantity = /\d+\s*(mtr|meter|metre|gaj|yard|mtrs)/i.test(text);
    if (hasQuantity && !t.includes('price') && !t.includes('rate')) {
      const qtyMatch = text.match(/(\d+)\s*(mtr|meter|metre|gaj)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 0;
      const isLump = qty >= 50;
      await sendText(phone, lang === 'hi' ? `📦 ${qty} meters — noted!\n\nPrice भेज रहे हैं...` : `📦 ${qty} meters — noted!\n\nSending pricing...`);
      await requestAdminApproval(phone, name, 'Price Request', {
        summary: `${qty} mtrs of ${customer?.fabric_interest || 'fabric'}\nType: ${isLump ? 'Lump pricing' : 'Cut-pack +₹2-3/mtr'}`
      }, `Hi ${name}! Pricing for ${qty} meters:\n\n[Admin will fill price]\n\nFor orders reply OK 🙏`);
      return;
    }

    // ── FALLBACK: Claude (complex) or Gemini (simple) ──
    const isComplexQuery = text.length > 30 || t.includes('compare') || t.includes('difference') || t.includes('suggest') || t.includes('recommend') || t.includes('best');
    let reply = '';
    if (isComplexQuery) {
      const history = customer ? `Previous interest: ${customer.fabric_interest || 'none'}, Tier: ${customer.price_tier || 'unknown'}` : '';
      reply = await claudeReply(text, name, lang, history, 'general_query') || '';
    }
    if (!reply) reply = await geminiReply(text, name, lang, customer?.fabric_interest ? `Customer previously interested in: ${customer.fabric_interest}` : '');
    if (!reply) reply = lang === 'hi' ? `नमस्ते! हमारी team जल्द आपसे संपर्क करेगी। 🙏` : lang === 'gu' ? `Namaste! Amare team tamaro contact karshe. 🙏` : `Thank you! Our team will contact you shortly. 🙏`;

    await sendText(phone, reply);
    await sendText(ADMIN_PHONE, `💬 *Other Enquiry*\n👤 ${name} (+${phone})\n"${text.substring(0,100)}"\n🤖 Bot: "${reply.substring(0,60)}..."`);

    // Background: extract preferences from this conversation
    if (customer) extractPreferencesWithAI(`Customer: ${text}\nBot: ${reply}`, phone).catch(() => {});

  } catch(err) { console.error('Webhook error:', err); }
}
