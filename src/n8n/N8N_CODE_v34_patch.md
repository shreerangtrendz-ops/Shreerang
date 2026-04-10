# N8N_CODE_v34_patch.md

n8n workflow: `CU6dMm7DCtSP6rMQ`
Base version: v33 (08-Apr-2026)
Patch date: 09-Apr-2026
Status: **NOT YET APPLIED TO n8n**

---

## Why this patch is needed

One grey purchase bill in Tally can cover multiple lots (batchallocations) going to different mills.
Example: Bill `"1068"` has two batchallocations — `lot_no "1030/24-25"` to Veekay Prints, and `lot_no "1031/24-25"` to Shreeji Prints.

v33 only reads `batches[0]` → drops all lots after the first.
The DB constraint was also `UNIQUE(tally_voucher_no)` → blocked duplicate bill inserts.

Both the DB constraint and the n8n code must match. DB was fixed on 09-Apr-2026.
Now n8n code needs updating.

---

## Change 1 — buildGreyPurchaseRow (in the main Code node)

**Find this function** (search for `buildGreyPurchaseRow` in the Code node):

### BEFORE (v33 — broken, single batch only)

```js
function buildGreyPurchaseRow(v) {
  const inv = (v.allinventoryentries || [])[0] || {};
  const batches = inv.batchallocations || [];
  const batch = batches[0] || {};
  const udf = (field) => {
    const arr = batch[`udf:${field}`] || [];
    return (arr[1] || {}).value || null;
  };
  const ledger = (v.ledgerentries || []).find(
    (l) => l.billallocations && l.billallocations.length > 0
  ) || {};
  const bill = (ledger.billallocations || [])[0] || {};
  const billUdf = (field) => {
    const arr = bill[`udf:${field}`] || [];
    return (arr[1] || {}).value || null;
  };
  const rateRaw = inv.rate || '';
  const rateNum = parseFloat(rateRaw.replace(/[^0-9.]/g, '')) || null;
  const cgst = (v.ledgerentries || []).find(
    (l) => (l.ledgername || '').includes('Purchase CGST')
  );
  const sgst = (v.ledgerentries || []).find(
    (l) => (l.ledgername || '').includes('Purchase SGST')
  );

  return {
    tally_voucher_no: v.vouchernumber,
    voucher_date: formatDate(v.date),
    supplier_name: v.partymailingname || v.partyledgername || null,
    supplier_gstin: v.partygstin || null,
    supplier_invoice_no: v.reference || bill.name || null,
    item_name: inv.stockitemname || null,
    rate: rateNum,
    actual_qty_mtrs: parseFloat(inv.actualqty) || null,
    billed_qty_mtrs: parseFloat(inv.billedqty) || null,
    item_amount: Math.abs(parseFloat(inv.amount) || 0),
    lot_no: batch.batchname || null,
    godown_name: batch.godownname || null,
    track_ref_no: udf('trackrefno'),
    track_date: udf('trackrefdate'),
    track_party: udf('trackrefparty'),
    taka_pcs: udf('batchitmtaka'),
    taka_no: udf('batchitmtakano'),
    broker_name: billUdf('erpbrokername'),
    comm_rate: billUdf('erpcommrate'),
    comm_amount: parseFloat(billUdf('erpcommamount')) || null,
    assessable_value: parseFloat(billUdf('erpcommassvalue')) || null,
    net_rate: parseFloat(billUdf('erpcommnetrate')) || null,
    cgst_amount: Math.abs(parseFloat((cgst || {}).amount) || 0),
    sgst_amount: Math.abs(parseFloat((sgst || {}).amount) || 0),
  };
}
```

### AFTER (v34 — correct, flatMap over all batches)

```js
function buildGreyPurchaseRow(v) {
  const inv = (v.allinventoryentries || [])[0] || {};
  const batches = inv.batchallocations || [];
  const ledger = (v.ledgerentries || []).find(
    (l) => l.billallocations && l.billallocations.length > 0
  ) || {};
  const bill = (ledger.billallocations || [])[0] || {};
  const billUdf = (field) => {
    const arr = bill[`udf:${field}`] || [];
    return (arr[1] || {}).value || null;
  };
  const rateRaw = inv.rate || '';
  const rateNum = parseFloat(rateRaw.replace(/[^0-9.]/g, '')) || null;
  const cgst = (v.ledgerentries || []).find(
    (l) => (l.ledgername || '').includes('Purchase CGST')
  );
  const sgst = (v.ledgerentries || []).find(
    (l) => (l.ledgername || '').includes('Purchase SGST')
  );

  // CHANGED: flatMap over all batches — one row per (tally_voucher_no + lot_no)
  return batches.map((batch) => {
    const udf = (field) => {
      const arr = batch[`udf:${field}`] || [];
      return (arr[1] || {}).value || null;
    };
    return {
      tally_voucher_no: v.vouchernumber,
      voucher_date: formatDate(v.date),
      supplier_name: v.partymailingname || v.partyledgername || null,
      supplier_gstin: v.partygstin || null,
      supplier_invoice_no: v.reference || bill.name || null,
      item_name: inv.stockitemname || null,
      rate: rateNum,
      actual_qty_mtrs: parseFloat(inv.actualqty) || null,
      billed_qty_mtrs: parseFloat(inv.billedqty) || null,
      item_amount: Math.abs(parseFloat(inv.amount) || 0),
      lot_no: batch.batchname || null,            // KEY 1 — now correct per-batch
      godown_name: batch.godownname || null,
      track_ref_no: udf('trackrefno'),
      track_date: udf('trackrefdate'),
      track_party: udf('trackrefparty'),
      taka_pcs: udf('batchitmtaka'),
      taka_no: udf('batchitmtakano'),
      broker_name: billUdf('erpbrokername'),
      comm_rate: billUdf('erpcommrate'),
      comm_amount: parseFloat(billUdf('erpcommamount')) || null,
      assessable_value: parseFloat(billUdf('erpcommassvalue')) || null,
      net_rate: parseFloat(billUdf('erpcommnetrate')) || null,
      cgst_amount: Math.abs(parseFloat((cgst || {}).amount) || 0),
      sgst_amount: Math.abs(parseFloat((sgst || {}).amount) || 0),
    };
  });
}
```

> **Key difference:** The function now returns an **array** (one element per batch), not a single object.
> The caller (S4b) must use `.flatMap()` instead of `.map()` to flatten the results.

---

## Change 2 — S4b grey_purchase upsert call

**Find the S4b section** (search for `grey_purchase` upsert in the Code node):

### BEFORE (v33)

```js
// Step S4b: grey_purchase
const greyRows = (greyVouchers || []).map(buildGreyPurchaseRow).filter(Boolean);
const { error: greyErr } = await supabase
  .from('grey_purchase')
  .upsert(greyRows, { onConflict: 'tally_voucher_no' });
if (greyErr) throw new Error(`S4b grey_purchase: ${greyErr.message}`);
results.grey_purchase = greyRows.length;
```

### AFTER (v34)

```js
// Step S4b: grey_purchase — flatMap because one bill can have multiple lots
const greyRows = (greyVouchers || []).flatMap(buildGreyPurchaseRow).filter(Boolean);
const { error: greyErr } = await supabase
  .from('grey_purchase')
  .upsert(greyRows, { onConflict: 'tally_voucher_no,lot_no' });
if (greyErr) throw new Error(`S4b grey_purchase: ${greyErr.message}`);
results.grey_purchase = greyRows.length;
```

> Two changes: `.map()` → `.flatMap()` and `onConflict: 'tally_voucher_no'` → `'tally_voucher_no,lot_no'`

---

## Change 3 — S5b issue_to_mill upsert call (verification only)

This was already corrected in v33. Verify it reads exactly:

```js
.upsert(issueRows, { onConflict: 'lot_no,voucher_date' })
```

If it still says `onConflict: 'lot_no'` — change it to `'lot_no,voucher_date'`.
The DB constraint was updated to `UNIQUE(lot_no, voucher_date)` on 09-Apr-2026.

Also verify `buildIssueToMillRow` maps `v.vouchersourcegodown` → `source_godown` (column added 09-Apr-2026):

```js
source_godown: v.vouchersourcegodown || null,
```

If that line is missing, add it inside `buildIssueToMillRow`.

---

## Change 4 — S3 sales_bills upsert (verification only)

Verify `buildSalesBillRow` includes:

```js
all_design_nos: extractAllDesignNos(v) || null,
```

Where `extractAllDesignNos` reads all `INVENTORYENTRIESOUT` design numbers into a JSONB array.
Column `all_design_nos jsonb` was added to `sales_bills` on 09-Apr-2026.
If `extractAllDesignNos` is not yet implemented — leave as `null` for now; column accepts nulls.

---

## Change 5 — buildRecFromMillRow: split party_challan_no and issue_challan_ref (10-Apr-2026)

**Why:** Tally "Party Ch. No" = mill's own JW bill number. Tally "Reference No" = our Issue Challan number (V-02 lot_no).
v33 used `v.partyChNo || v.reference || v.vnum` for `party_challan_no` — this polluted it with the Issue Challan No when partyChNo was missing.

**Find this line in `buildRecFromMillRow`:**

### BEFORE (v33)
```js
party_challan_no: v.partyChNo || v.reference || v.vnum,
```

### AFTER (v34)
```js
party_challan_no:  v.partyChNo || v.vnum,    // "Party Ch. No" = mill's own JW bill number
issue_challan_ref: v.reference || null,        // "Reference No" = our Issue Challan (V-02 lot_no)
```

> Column `issue_challan_ref text` was added to `rec_from_mill` on 10-Apr-2026. ✅

---

## Database changes already applied (09-Apr-2026)

All of the following were run in Supabase SQL editor on project `zdekydcscwhuusliwqaz`:

| Table | Change |
|---|---|
| `grey_purchase` | `UNIQUE(tally_voucher_no)` → `UNIQUE(tally_voucher_no, lot_no)` |
| `issue_to_mill` | `UNIQUE(lot_no)` → `UNIQUE(lot_no, voucher_date)` |
| `issue_to_mill` | `source_godown text` column added |
| `sales_bills` | `all_design_nos jsonb` column added |
| `receipt_payment_lines` | constraint recreated cleanly (was blocking S_AV_LINES) |
| `credit_note_items` | old UNIQUE constraint dropped (n8n uses DELETE+INSERT) |
| `rec_from_mill` | `issue_challan_ref text` column added (10-Apr-2026) |

These are live. Do NOT re-run these migrations.

---

## How to apply this patch to n8n

1. Open n8n at `https://n8n.shreerangtrendz.com`
2. Open workflow `CU6dMm7DCtSP6rMQ`
3. Find the main **Code** node (the large JS function node)
4. Apply Change 1: replace `buildGreyPurchaseRow` function body
5. Apply Change 2: update S4b upsert — `.flatMap()` + `onConflict: 'tally_voucher_no,lot_no'`
6. Apply Change 3: verify S5b `onConflict: 'lot_no,voucher_date'` and `source_godown` field
7. Apply Change 4: verify S3 `all_design_nos` field present (null ok)
8. Apply Change 5: in `buildRecFromMillRow`, split `party_challan_no` and add `issue_challan_ref`
9. Save the node and **Save** the workflow
9. Name the saved version `N8N_CODE_v34.js` in this folder

> After applying: trigger a full resync via the manual Fetch button (or Schedule Trigger once set up).
> Check `grey_purchase` row count — it should increase as multi-lot bills now produce multiple rows.
