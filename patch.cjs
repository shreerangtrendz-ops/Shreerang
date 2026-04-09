const fs = require('fs');
let code = fs.readFileSync('n8n-tally-vouchers-v26.js', 'utf8');

const processRowNew = `function buildProcessRow(v) {
  const isReceipt  = v.vtype === 'REC FROM MILL';
  const outEntries = getBlocks(v._vxml, 'INVENTORYENTRIESOUT\\\\.LIST');
  const inEntries  = getBlocks(v._vxml, 'INVENTORYENTRIESIN\\\\.LIST');
  const rawEntries = isReceipt ? inEntries : (outEntries.length ? outEntries : inEntries);
  const consumptionItems = isReceipt ? outEntries.map(parseInvEntry) : [];
  const allItems = rawEntries.map(parseInvEntry);
  
  return allItems.map((first, i) => {
    const cF = consumptionItems[i] || consumptionItems[0] || {};
    const consumptionQty = isReceipt ? (cF.qty || 0) : 0;
    const consumptionRate = isReceipt ? (cF.rate || 0) : 0;
    const consumptionAmount = isReceipt ? Math.abs(cF.amount || 0) : 0;
    const greyFabricName = isReceipt ? (cF.stock_item || null) : null;
    
    let designNo = null, finishedDesignNo = null, millGodown = null, godown = null;
    for (const b of (first.batches||[])) {
      if (b.godown && b.godown !== 'Main Location' && !millGodown) millGodown = b.godown;
      if (b.godown && !godown) godown = b.godown;
      const dn = cleanDesignNo(b.batch_name);
      if (dn && dn !== 'Primary Batch' && !designNo) designNo = dn;
    }
    
    let workerName = v.party || millGodown || v.destGodown || null;
    if (isReceipt) finishedDesignNo = designNo;
    
    let lotNo = null;
    if (isReceipt && cF.batches?.length > 0) lotNo = cF.batches[0].batch_name || null;
    else if (!isReceipt && first.batches?.length > 0) lotNo = first.batches[0].batch_name || null;
    
    const shortageMtrs = isReceipt ? Math.max(0, consumptionQty - (first.qty || 0)) : 0;
    const shortagePct  = isReceipt && consumptionQty > 0 ? parseFloat(((shortageMtrs / consumptionQty) * 100).toFixed(2)) : 0;
    const challanNo = isReceipt ? (v.reference || v.vnum) : (v.vnum || v.reference);
    
    return {
      challan_no: challanNo, issue_date: v.date,
      worker_name: workerName, party_name: v.party||null,
      process_type: isReceipt ? 'received' : 'issued',
      status: isReceipt ? 'received' : 'pending',
      grey_fabric_name: isReceipt ? greyFabricName : (first.stock_item||null),
      finished_fabric_name: isReceipt ? (first.stock_item||null) : null,
      metres_issued: isReceipt ? consumptionQty : (first.qty||0),
      metres_received: isReceipt ? (first.qty||0) : 0,
      job_rate: first.rate||0, job_amount: Math.abs(first.amount||0),
      mill_godown: millGodown||v.destGodown||null,
      source_godown: v.srcGodown||null, design_no: designNo,
      batch_name: (first.batches&&first.batches[0]?.batch_name)||null,
      godown: godown||null, narration: v.narration||null,
      lot_no: lotNo, shortage_mtrs: shortageMtrs, shortage_pct: shortagePct,
      party_ch_no: v.reference||null, finished_design_no: finishedDesignNo,
      consumption_rate: consumptionRate,
      consumption_amount: consumptionAmount,
      production_rate: isReceipt ? (first.rate||0) : null,
      production_amount: isReceipt ? Math.abs(first.amount||0) : null,
      our_godown: v.destGodown||'Main Location', job_godown: millGodown||null,
      total_taka_pcs: countTakaPcs(isReceipt ? [inEntries[i]] : [rawEntries[i]]),
      tally_synced_at: new Date().toISOString()
    };
  });
}`;

const recRowNew = `function buildRecFromMillRow(v) {
  const outEntries = getBlocks(v._vxml, 'INVENTORYENTRIESOUT\\\\.LIST');
  const inEntries  = getBlocks(v._vxml, 'INVENTORYENTRIESIN\\\\.LIST');
  const maxLen = Math.max(outEntries.length, inEntries.length) || 1;
  const rows = [];
  
  for (let i = 0; i < maxLen; i++) {
    let greyItem = {};
    const outVxml = outEntries[i] || outEntries[0];
    if (outVxml) {
      const g = parseInvEntry(outVxml);
      const gb = g.batches?.[0] || {};
      greyItem = {
        grey_item_name: g.stock_item||null, source_godown: gb.godown||g.godown||null,
        grey_lot_no: gb.batch_name||null, grey_issued_qty_mtrs: g.qty||0,
        grey_rate: g.rate||0, grey_amount: Math.abs(g.amount)||0,
        job_rate:     parseNum(getUdfVal(outVxml,'JOBRATE')||getXmlVal(outVxml,'JOBRATE'))||0,
        job_amount:   parseNum(getUdfVal(outVxml,'JOBAMOUNT')||getXmlVal(outVxml,'JOBAMOUNT'))||0,
        gross_amount: parseNum(getUdfVal(outVxml,'GROSSAMT')||getXmlVal(outVxml,'GROSSAMT'))||0,
        grey_recd_qty_mtrs: 0,
        short_qty_mtrs: parseNum(getUdfVal(outVxml,'SHORTQTY')||'0'),
      };
      if (!greyItem.gross_amount && greyItem.grey_amount && greyItem.job_amount)
        greyItem.gross_amount = greyItem.grey_amount + greyItem.job_amount;
    }
    
    let finishItem = {};
    const inVxml = inEntries[i] || inEntries[0];
    if (inVxml) {
      const f = parseInvEntry(inVxml);
      const fb = f.batches?.[0] || {};
      const rawDN = getUdfVal(inVxml,'DESIGNNO')||getXmlVal(inVxml,'DESIGNNO')||fb.batch_name||'';
      finishItem = {
        finish_item_name: f.stock_item||null,
        dest_godown: fb.godown||fb.dest_godown||f.godown||'Main Location',
        design_no: cleanDesignNo(rawDN)||null,
        finish_qty_mtrs: f.qty||0, finish_rate: f.rate||0,
        finish_amount: Math.abs(f.amount)||0,
        issue_qty_mtrs: parseNum(getUdfVal(inVxml,'ISSUEDQTY')||'0')||greyItem.grey_issued_qty_mtrs||0,
      };
    }
    
    const shortageMtrs = parseNum(getUdfVal(v._vxml,'SHORTMTR')||getXmlVal(v._vxml,'SHORTMTR')||'0')
      ||(greyItem.grey_issued_qty_mtrs&&finishItem.finish_qty_mtrs?Math.max(0,greyItem.grey_issued_qty_mtrs-finishItem.finish_qty_mtrs):0);
    const shortagePct  = parseNum(getUdfVal(v._vxml,'SHORTPERC')||getXmlVal(v._vxml,'SHORTPERC')||'0')
      ||(shortageMtrs&&greyItem.grey_issued_qty_mtrs?parseFloat(((shortageMtrs/greyItem.grey_issued_qty_mtrs)*100).toFixed(2)):0);
    
    rows.push({
      party_challan_no: v.reference || v.vnum,
      tally_voucher_no: v.vnum||null, voucher_date: v.date,
      mill_name: v.party || greyItem.grey_item_name?.match(/^(.+?)\\s+\\d/)?.[1] || null,
      lot_no: cleanDesignNo(getUdfVal(v._vxml,'LOTNO')||getXmlVal(v._vxml,'BATCHNAME')||greyItem.grey_lot_no||'')||greyItem.grey_lot_no||null,
      issue_challan_no: getUdfVal(v._vxml,'ISSUECHALLANNO')||getXmlVal(v._vxml,'ISSUECHALLANNO')||null,
      job_godown: getUdfVal(v._vxml,'JOBGODOWN')||getXmlVal(v._vxml,'JOBGODOWN')||greyItem.source_godown||null,
      our_godown: v.destGodown||'Main Location',
      weaver_name: getUdfVal(v._vxml,'WEAVERNAME')||getXmlVal(v._vxml,'WEAVERNAME')||null,
      quality_name: getUdfVal(v._vxml,'QUALITYNAME')||getXmlVal(v._vxml,'QUALITYNAME')||null,
      shortage_mtrs: shortageMtrs, shortage_pct: shortagePct,
      narration: v.narration||null,
      ...greyItem, ...finishItem,
      grey_recd_qty_mtrs: finishItem.finish_qty_mtrs || greyItem.grey_issued_qty_mtrs || 0,
      tally_synced_at: new Date().toISOString()
    });
  }
  return rows;
}`;

// Replace function definitions
const reProcess = /function buildProcessRow\s*\([\s\S]*?return \{[\s\S]*?\};\n\}/;
code = code.replace(reProcess, processRowNew);

const reRec = /function buildRecFromMillRow\s*\([\s\S]*?return rows;?\n?\}/;
const altReRec = /function buildRecFromMillRow\s*\([\s\S]*?return \{[\s\S]*?\};\n\}/;
if (reRec.test(code)) {
  code = code.replace(reRec, recRowNew);
} else {
  code = code.replace(altReRec, recRowNew);
}

code = code.replace(
  /const processAllRows = processV\.map\(buildProcessRow\)\.map\(sanitizeRow\);/g,
  'const processAllRows = processV.flatMap(buildProcessRow).map(sanitizeRow);'
);

code = code.replace(
  /const recFromAllRows = recFromMillV\.map\(buildRecFromMillRow\)\.map\(sanitizeRow\);/g,
  'const recFromAllRows = recFromMillV.flatMap(buildRecFromMillRow).map(sanitizeRow);'
);

// Fix process dedupe
code = code.replace(
  /if \(r\.challan_no && !processSeen\.has\(r\.challan_no\)\) processSeen\.set\(r\.challan_no, r\);/g,
  "let k = r.challan_no+(r.lot_no||''); if(r.challan_no && !processSeen.has(k)) processSeen.set(k,r);"
);

// Fix rec_from_mill dedupe
code = code.replace(
  /if \(!recSeen\.has\(r\.tally_voucher_no\)\) recSeen\.set\(r\.tally_voucher_no, r\);/g,
  "let k = r.tally_voucher_no+(r.lot_no||''); if(!recSeen.has(k)) recSeen.set(k,r);"
);

// Fix S5 upsert
code = code.replace(
  /'process_issues',\s*processRows,\s*'challan_no',\s*'S5'/g,
  "'process_issues', processRows, 'challan_no,lot_no', 'S5'"
);

// Fix S5c upsert
code = code.replace(
  /'rec_from_mill',\s*recFromAllRows?,\s*'tally_voucher_no',\s*'S5c'/g,
  "'rec_from_mill', recFromAllRows, 'tally_voucher_no,lot_no', 'S5c'"
);
code = code.replace(
  /'rec_from_mill',\s*recFromMillV\.map\(buildRecFromMillRow\),\s*'tally_voucher_no',\s*'S5c'/g,
  "'rec_from_mill', recFromMillV.flatMap(buildRecFromMillRow).map(sanitizeRow), 'tally_voucher_no,lot_no', 'S5c'"
);

fs.writeFileSync('n8n-tally-vouchers-v26.js', code);
console.log('Patched n8n-tally-vouchers-v26.js successfully!');
