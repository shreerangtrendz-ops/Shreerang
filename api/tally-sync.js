// api/tally-sync.js v5 — Progressive One-Chunk-Per-Call Sync
// Each call processes ONE 7-day chunk and returns progress
// Dashboard calls repeatedly until hasMore=false
// Avoids ALL timeout issues (Vercel 10s + Tally slow response)

const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';
const TALLY_EDGE = 'https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-proxy';
const CHUNK_DAYS = 7;

function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0,10);
}
function toTallyDate(iso) { return iso.replace(/-/g,''); }
function extractTag(xml, tag) { const m=xml.match(new RegExp('<'+tag+'[^>]*>([\s\S]*?)</'+tag+'>','i')); return m?m[1].trim():''; }
function extractAll(xml, tag) { const r=[],re=new RegExp('<'+tag+'[^>]*>([\s\S]*?)</'+tag+'>','gi'); let m; while((m=re.exec(xml))!==null) r.push(m[1].trim()); return r; }
function parseAmt(s){ return s?(parseFloat(s.replace(/[^0-9.\-]/g,''))||0):0; }
function tallyDate(d){
  if(!d) return null; d=d.trim();
  if(/^\d{8}$/.test(d)) return d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8);
  const ms={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  const m=d.match(/(\d{1,2})-([a-z]{3})-(\d{4})/i);
  if(m) return m[3]+'-'+ms[m[2].toLowerCase()]+'-'+m[1].padStart(2,'0');
  return null;
}

async function sbGet(path) {
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}});
  return r.json();
}
async function sbPost(path, body) {
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});
  if(!r.ok){ const t=await r.text(); throw new Error('Supabase '+path+': '+t.slice(0,200)); }
  return r.text();
}

async function getSyncState(type) { const rows=await sbGet('tally_sync_state?sync_type=eq.'+type+'&select=*'); return rows?.[0]||null; }
async function updateSyncState(type, lastDate, count) { await sbPost('tally_sync_state?on_conflict=sync_type',{sync_type:type,last_synced_voucher_date:lastDate,total_records_synced:count,updated_at:new Date().toISOString()}); }
async function logSync(type, status, count, raw, err) { await fetch(SUPABASE_URL+'/rest/v1/tally_sync_log',{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({sync_type:type,status,records_synced:count,raw_response:raw,error_message:err||null,last_voucher_date:new Date().toISOString().slice(0,10)})}); }

function buildXml(from, to, type) {
  return '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES><SVFROMDATE>'+from+'</SVFROMDATE><SVTODATE>'+to+'</SVTODATE><VOUCHERTYPENAME>'+type+'</VOUCHERTYPENAME><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
}

function parseVouchers(xml, type) {
  const rows=[];
  const blocks=xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi)||[];
  for(const b of blocks){
    const vn=extractTag(b,'VOUCHERNUMBER'), dt=tallyDate(extractTag(b,'DATE')), pa=extractTag(b,'PARTYLEDGERNAME');
    if(!vn||!dt||!pa) continue;
    const amounts=extractAll(b,'AMOUNT').map(parseAmt);
    const total=Math.abs(amounts.reduce((s,a)=>s+a,0))/2;
    const narr=extractTag(b,'NARRATION')||null;
    if(type==='Purchase') rows.push({bill_number:vn,bill_date:dt,supplier_name:pa,total_amount:total,notes:narr,status:'synced',fabric_type:'Tally Import'});
    else rows.push({bill_number:vn,bill_date:dt,customer_name:pa,total_amount:total,notes:narr,status:'synced'});
  }
  return rows;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization,X-Tally-Company');
  if(req.method==='OPTIONS') return res.status(200).end();

  const today=new Date().toISOString().slice(0,10);
  const syncType=req.query?.type||'purchase'; // 'purchase' | 'sales'
  const company=req.headers['x-tally-company']||req.query?.company||'';
  const voucherType=syncType==='sales'?'Sales':'Purchase';
  const syncKey=syncType==='sales'?'sales_vouchers':'purchase_vouchers';
  const table=syncType==='sales'?'sales_bills':'purchase_bills';

  try {
    const state=await getSyncState(syncKey);
    const lastDate=state?.last_synced_voucher_date||null;
    // fromDate = day after last sync, or FY start if never synced
    const fromDate=lastDate ? addDays(lastDate,1) : '2024-04-01';

    if(fromDate>today) {
      return res.status(200).json({
        success:true, syncType, hasMore:false,
        chunkFrom:null, chunkTo:null, recordsThisChunk:0,
        totalSynced:state?.total_records_synced||0,
        message:'Already up to date - all data synced',
        nextCallNeeded:false
      });
    }

    // This chunk: fromDate → min(fromDate+6, today)
    const rawTo=addDays(fromDate,CHUNK_DAYS-1);
    const toDate=rawTo>today?today:rawTo;

    console.log('[tally-sync v5] '+syncKey+': chunk '+fromDate+' → '+toDate);

    // Call Tally edge function directly (no Vercel middle hop)
    const proxyRes=await fetch(TALLY_EDGE,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+SUPABASE_KEY,'apikey':SUPABASE_KEY},
      body:JSON.stringify({xmlBody:buildXml(toTallyDate(fromDate),toTallyDate(toDate),voucherType),company}),
      signal:AbortSignal.timeout(25000)
    });

    if(!proxyRes.ok){ const et=await proxyRes.text(); throw new Error('Proxy '+proxyRes.status+': '+et.slice(0,200)); }
    const proxyData=await proxyRes.json();
    if(proxyData?.error) throw new Error('Tally: '+proxyData.error);
    const tallyXml=proxyData?.xml||'';

    // Detect Tally dialog open state
    if(tallyXml.includes('IMPORTFILE')||tallyXml.includes('File to Import')) {
      throw new Error('Tally Import dialog open - press ESC in Tally and return to Gateway of Tally');
    }
    if(tallyXml.length<50&&!tallyXml.includes('VOUCHER')) {
      // Empty response for this chunk - no vouchers in this period, still advance
      await updateSyncState(syncKey,toDate,(state?.total_records_synced||0));
      const hasMore2=toDate<today;
      return res.status(200).json({
        success:true, syncType, hasMore:hasMore2,
        chunkFrom:fromDate, chunkTo:toDate, recordsThisChunk:0,
        totalSynced:state?.total_records_synced||0,
        message:'No vouchers in '+fromDate+' to '+toDate+'. Advancing.',
        nextCallNeeded:hasMore2
      });
    }

    const rows=parseVouchers(tallyXml,voucherType);
    if(rows.length) await sbPost(table+'?on_conflict=bill_number',rows);

    const prevTotal=state?.total_records_synced||0;
    const newTotal=prevTotal+rows.length;
    await updateSyncState(syncKey,toDate,newTotal);
    await logSync(syncKey,'success',rows.length,tallyXml.slice(0,3000));

    const hasMore=toDate<today;
    return res.status(200).json({
      success:true, syncType, hasMore,
      chunkFrom:fromDate, chunkTo:toDate, recordsThisChunk:rows.length,
      totalSynced:newTotal,
      nextFrom:hasMore?addDays(toDate,1):null,
      message:hasMore
        ? 'Chunk '+fromDate+' to '+toDate+': '+rows.length+' records. More data available.'
        : 'COMPLETE! All data synced up to '+toDate+'. Total: '+newTotal+' records.',
      nextCallNeeded:hasMore
    });

  } catch(err) {
    console.error('[tally-sync v5] Error:',err.message);
    await logSync(syncKey,'error',0,null,err.message).catch(()=>{});
    return res.status(200).json({
      success:false, syncType, hasMore:false,
      error:err.message, nextCallNeeded:false
    });
  }
}
