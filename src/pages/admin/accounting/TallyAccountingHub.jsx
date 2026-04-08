import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ────────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Financial Year Helper ───────────────────────────────────────────────────
function getCurrentFY() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-based
  return m >= 4 ? { from: `${y}-04-01`, to: `${y + 1}-03-31` } : { from: `${y - 1}-04-01`, to: `${y}-03-31` };
}

// ─── Currency Formatter ──────────────────────────────────────────────────────
const fmt = (v) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmtQty = (v) => (v == null ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " m");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—");
const fmtPct = (v) => (v == null ? "—" : Number(v).toFixed(1) + "%");

// ─── TAB CONFIG ──────────────────────────────────────────────────────────────
// Each tab: { key, label, table, dateCol, columns[], sumCols[], searchCols[] }
const TAB_CONFIG = [
  {
    key: "sales_bills",
    label: "Sales Bills",
    table: "sales_bills",
    dateCol: "bill_date",
    searchCols: ["bill_number", "tally_voucher_no", "customer_name", "design_no", "broker_name"],
    sumCols: ["total_amount", "taxable_value", "quantity_mtrs"],
    columns: [
      { key: "bill_date",        header: "Date",           render: (r) => fmtDate(r.bill_date) },
      { key: "bill_number",      header: "Bill No",        render: (r) => r.bill_number || "—" },
      { key: "tally_voucher_no", header: "Tally Vch No",   render: (r) => r.tally_voucher_no || "—" },
      { key: "customer_name",    header: "Party",          render: (r) => r.customer_name || "—", wide: true },
      { key: "design_no",        header: "Design No",      render: (r) => r.design_no || <span className="null-badge">Multi/NULL</span> },
      { key: "fabric_name",      header: "Fabric",         render: (r) => r.fabric_name || r.item_name || "—", wide: true },
      { key: "quantity_mtrs",    header: "Qty (m)",        render: (r) => fmtQty(r.quantity_mtrs), align: "right" },
      { key: "rate_per_mtr",     header: "Rate/m",         render: (r) => r.rate_per_mtr ? fmt(r.rate_per_mtr) : "—", align: "right" },
      { key: "taxable_value",    header: "Taxable",        render: (r) => fmt(r.taxable_value), align: "right" },
      { key: "cgst_amount",      header: "CGST",           render: (r) => fmt(r.cgst_amount), align: "right" },
      { key: "sgst_amount",      header: "SGST",           render: (r) => fmt(r.sgst_amount), align: "right" },
      { key: "igst_amount",      header: "IGST",           render: (r) => fmt(r.igst_amount), align: "right" },
      { key: "total_amount",     header: "Total Amt",      render: (r) => fmt(r.total_amount), align: "right", bold: true },
      { key: "broker_name",      header: "Broker",         render: (r) => r.broker_name || "—" },
      { key: "comm_rate",        header: "Comm%",          render: (r) => r.comm_rate ? fmtPct(r.comm_rate) : "—", align: "right" },
      { key: "comm_amount",      header: "Comm Amt",       render: (r) => fmt(r.comm_amount), align: "right" },
      { key: "agent_name",       header: "Agent",          render: (r) => r.agent_name || "—" },
      { key: "place_of_supply",  header: "POS",            render: (r) => r.place_of_supply || "—" },
      { key: "godown",           header: "Godown",         render: (r) => r.godown || "—" },
      { key: "narration",        header: "Narration",      render: (r) => r.narration || "—", wide: true },
    ],
  },
  {
    key: "credit_note",
    label: "Credit Notes",
    table: "credit_note",
    dateCol: "voucher_date",
    searchCols: ["tally_voucher_no", "party_name", "original_voucher_no"],
    sumCols: ["party_amount"],
    columns: [
      { key: "voucher_date",       header: "Date",           render: (r) => fmtDate(r.voucher_date) },
      { key: "tally_voucher_no",   header: "CN No",          render: (r) => r.tally_voucher_no || "—" },
      { key: "party_name",         header: "Party",          render: (r) => r.party_name || "—", wide: true },
      { key: "original_voucher_no",header: "Orig Bill",      render: (r) => r.original_voucher_no || "—" },
      { key: "original_bill_date", header: "Orig Date",      render: (r) => fmtDate(r.original_bill_date) },
      { key: "party_amount",       header: "CN Amount",      render: (r) => fmt(r.party_amount), align: "right", bold: true },
      { key: "cgst_amount",        header: "CGST",           render: (r) => fmt(r.cgst_amount), align: "right" },
      { key: "sgst_amount",        header: "SGST",           render: (r) => fmt(r.sgst_amount), align: "right" },
      { key: "igst_amount",        header: "IGST",           render: (r) => fmt(r.igst_amount), align: "right" },
      { key: "discount_amount",    header: "Discount",       render: (r) => fmt(r.discount_amount), align: "right" },
      { key: "broker_name",        header: "Broker",         render: (r) => r.broker_name || "—" },
      { key: "comm_rate",          header: "Comm%",          render: (r) => r.comm_rate ? fmtPct(r.comm_rate) : "—", align: "right" },
      { key: "comm_amount",        header: "Comm Amt",       render: (r) => fmt(r.comm_amount), align: "right" },
      { key: "place_of_supply",    header: "POS",            render: (r) => r.place_of_supply || "—" },
      { key: "bill_ref",           header: "Bill Ref",       render: (r) => r.bill_ref || "—" },
      { key: "narration",          header: "Narration",      render: (r) => r.narration || "—", wide: true },
    ],
  },
  {
    key: "grey_purchase",
    label: "Grey Purchase",
    table: "grey_purchase",
    dateCol: "voucher_date",
    searchCols: ["tally_voucher_no", "supplier_invoice_no", "supplier_name", "lot_no", "item_name"],
    sumCols: ["total_amount", "actual_qty_mtrs"],
    columns: [
      { key: "voucher_date",          header: "Date",           render: (r) => fmtDate(r.voucher_date) },
      { key: "tally_voucher_no",      header: "Tally Vch No",   render: (r) => r.tally_voucher_no || "—" },
      { key: "supplier_invoice_no",   header: "Supplier Inv No",render: (r) => r.supplier_invoice_no || "—" },
      { key: "supplier_invoice_date", header: "Inv Date",       render: (r) => fmtDate(r.supplier_invoice_date) },
      { key: "supplier_name",         header: "Supplier",       render: (r) => r.supplier_name || "—", wide: true },
      { key: "lot_no",                header: "Lot No",         render: (r) => r.lot_no || "—" },
      { key: "item_name",             header: "Item",           render: (r) => r.item_name || "—", wide: true },
      { key: "hsn_code",              header: "HSN",            render: (r) => r.hsn_code || "—" },
      { key: "taka_pcs",              header: "Taka/Pcs",       render: (r) => r.taka_pcs ?? "—", align: "right" },
      { key: "actual_qty_mtrs",       header: "Actual Qty (m)", render: (r) => fmtQty(r.actual_qty_mtrs), align: "right" },
      { key: "billed_qty_mtrs",       header: "Billed Qty (m)", render: (r) => fmtQty(r.billed_qty_mtrs), align: "right" },
      { key: "rate",                  header: "Rate/m",         render: (r) => r.rate ? fmt(r.rate) : "—", align: "right" },
      { key: "item_amount",           header: "Item Amount",    render: (r) => fmt(r.item_amount), align: "right" },
      { key: "assessable_value",      header: "Assessable Val", render: (r) => fmt(r.assessable_value), align: "right" },
      { key: "cgst_amount",           header: "CGST",           render: (r) => fmt(r.cgst_amount), align: "right" },
      { key: "sgst_amount",           header: "SGST",           render: (r) => fmt(r.sgst_amount), align: "right" },
      { key: "igst_amount",           header: "IGST",           render: (r) => fmt(r.igst_amount), align: "right" },
      { key: "total_amount",          header: "Total Amt",      render: (r) => fmt(r.total_amount), align: "right", bold: true },
      { key: "broker_name",           header: "Broker",         render: (r) => r.broker_name || "—" },
      { key: "comm_rate",             header: "Comm%",          render: (r) => r.comm_rate ? fmtPct(r.comm_rate) : "—", align: "right" },
      { key: "comm_amount",           header: "Comm Amt",       render: (r) => fmt(r.comm_amount), align: "right" },
      { key: "godown_name",           header: "Godown",         render: (r) => r.godown_name || "—" },
      { key: "process_lot_no",        header: "Process Lot No", render: (r) => r.process_lot_no || "—" },
      { key: "process_mill_name",     header: "Process Mill",   render: (r) => r.process_mill_name || "—" },
      { key: "narration",             header: "Narration",      render: (r) => r.narration || "—", wide: true },
    ],
  },
  {
    key: "issue_to_mill",
    label: "Issue to Mill",
    table: "issue_to_mill",
    dateCol: "voucher_date",
    searchCols: ["tally_voucher_no", "lot_no", "mill_name", "item_name", "destination_godown"],
    sumCols: ["qty_mtrs", "amount"],
    columns: [
      { key: "voucher_date",       header: "Date",              render: (r) => fmtDate(r.voucher_date) },
      { key: "tally_voucher_no",   header: "Tally Vch No",      render: (r) => r.tally_voucher_no || "—" },
      { key: "lot_no",             header: "Lot No",            render: (r) => r.lot_no || "—" },
      { key: "mill_name",          header: "Mill (Party)",      render: (r) => r.mill_name || "—", wide: true },
      { key: "destination_godown", header: "Mill Godown",       render: (r) => r.destination_godown || "—" },
      { key: "source_godown",      header: "Source Godown",     render: (r) => r.source_godown || "—" },
      { key: "item_name",          header: "Item",              render: (r) => r.item_name || "—", wide: true },
      { key: "hsn_code",           header: "HSN",               render: (r) => r.hsn_code || "—" },
      { key: "taka_pcs",           header: "Taka/Pcs",          render: (r) => r.taka_pcs ?? "—", align: "right" },
      { key: "qty_mtrs",           header: "Qty (m)",           render: (r) => fmtQty(r.qty_mtrs), align: "right" },
      { key: "rate",               header: "Rate/m",            render: (r) => r.rate ? fmt(r.rate) : "—", align: "right" },
      { key: "amount",             header: "Amount",            render: (r) => fmt(r.amount), align: "right", bold: true },
      { key: "process_type",       header: "Process Type",      render: (r) => r.process_type || "—" },
      { key: "stage_no",           header: "Stage No",          render: (r) => r.stage_no ?? "—", align: "right" },
      { key: "parent_lot_no",      header: "Parent Lot",        render: (r) => r.parent_lot_no || "—" },
      { key: "is_sampling",        header: "Sampling?",         render: (r) => r.is_sampling ? "Yes" : "No" },
      { key: "purpose_note",       header: "Purpose",           render: (r) => r.purpose_note || "—" },
      { key: "narration",          header: "Narration",         render: (r) => r.narration || "—", wide: true },
    ],
  },
  {
    key: "rec_from_mill",
    label: "REC from Mill",
    table: "rec_from_mill",
    dateCol: "voucher_date",
    searchCols: ["tally_voucher_no", "party_challan_no", "lot_no", "design_no", "job_godown"],
    sumCols: ["finish_qty_mtrs", "job_amount"],
    columns: [
      { key: "voucher_date",       header: "Date",              render: (r) => fmtDate(r.voucher_date) },
      { key: "tally_voucher_no",   header: "Tally Vch No",      render: (r) => r.tally_voucher_no || "—" },
      { key: "party_challan_no",   header: "Mill Challan No",   render: (r) => r.party_challan_no || "—" },
      { key: "lot_no",             header: "Lot No",            render: (r) => r.lot_no || "—" },
      { key: "design_no",          header: "Design No",         render: (r) => r.design_no || "—" },
      { key: "mill_name",          header: "Mill",              render: (r) => r.mill_name || r.job_godown || "—", wide: true },
      { key: "job_godown",         header: "Job Godown",        render: (r) => r.job_godown || "—" },
      { key: "our_godown",         header: "Our Godown",        render: (r) => r.our_godown || "—" },
      { key: "grey_issued_qty_mtrs",header: "Grey Issued (m)",  render: (r) => fmtQty(r.grey_issued_qty_mtrs), align: "right" },
      { key: "finish_qty_mtrs",    header: "Finish Qty (m)",    render: (r) => fmtQty(r.finish_qty_mtrs), align: "right" },
      { key: "grey_recd_qty_mtrs", header: "Grey Recd (m)",     render: (r) => fmtQty(r.grey_recd_qty_mtrs), align: "right" },
      { key: "shortage_mtrs",      header: "Shortage (m)",      render: (r) => fmtQty(r.shortage_mtrs), align: "right" },
      { key: "shortage_pct",       header: "Shortage%",         render: (r) => {
          const v = r.shortage_pct;
          if (v == null) return "—";
          const cls = v > 15 ? "badge-red" : v > 5 ? "badge-amber" : "badge-green";
          return <span className={cls}>{fmtPct(v)}</span>;
        }
      },
      { key: "job_rate",           header: "Job Rate",          render: (r) => r.job_rate ? fmt(r.job_rate) : "—", align: "right" },
      { key: "job_amount",         header: "Job Amount",        render: (r) => fmt(r.job_amount), align: "right", bold: true },
      { key: "grey_purchase_rate", header: "Grey Rate",         render: (r) => r.grey_purchase_rate ? fmt(r.grey_purchase_rate) : "—", align: "right" },
      { key: "grey_cost_actual",   header: "Grey Cost",         render: (r) => fmt(r.grey_cost_actual), align: "right" },
      { key: "jw_allocated_cost",  header: "JW Alloc Cost",     render: (r) => fmt(r.jw_allocated_cost), align: "right" },
      { key: "cumulative_cost_per_mtr", header: "Cumul Cost/m", render: (r) => r.cumulative_cost_per_mtr ? fmt(r.cumulative_cost_per_mtr) : "—", align: "right" },
      { key: "stage_no",           header: "Stage No",          render: (r) => r.stage_no ?? "—", align: "right" },
      { key: "process_type",       header: "Process Type",      render: (r) => r.process_type || "—" },
      { key: "parent_lot_no",      header: "Parent Lot",        render: (r) => r.parent_lot_no || "—" },
      { key: "quality_name",       header: "Quality",           render: (r) => r.quality_name || "—" },
      { key: "narration",          header: "Narration",         render: (r) => r.narration || "—", wide: true },
    ],
  },
  {
    key: "purchase_bills",
    label: "Purchase Bills",
    table: "purchase_bills",
    dateCol: "bill_date",
    searchCols: ["bill_number", "tally_voucher_no", "supplier_name", "supplier_invoice_no", "design_no"],
    sumCols: ["total_amount", "quantity_mtrs"],
    columns: [
      { key: "bill_date",           header: "Date",            render: (r) => fmtDate(r.bill_date) },
      { key: "bill_number",         header: "Bill No",         render: (r) => r.bill_number || "—" },
      { key: "tally_voucher_no",    header: "Tally Vch No",    render: (r) => r.tally_voucher_no || "—" },
      { key: "supplier_invoice_no", header: "Supp Inv No",     render: (r) => r.supplier_invoice_no || "—" },
      { key: "supplier_name",       header: "Supplier",        render: (r) => r.supplier_name || r.party_name || "—", wide: true },
      { key: "fabric_name",         header: "Fabric",          render: (r) => r.fabric_name || "—", wide: true },
      { key: "design_no",           header: "Design No",       render: (r) => r.design_no || "—" },
      { key: "batch_name",          header: "Batch",           render: (r) => r.batch_name || "—" },
      { key: "hsn_code",            header: "HSN",             render: (r) => r.hsn_code || "—" },
      { key: "quantity_mtrs",       header: "Qty (m)",         render: (r) => fmtQty(r.quantity_mtrs), align: "right" },
      { key: "rate_per_mtr",        header: "Rate/m",          render: (r) => r.rate_per_mtr ? fmt(r.rate_per_mtr) : "—", align: "right" },
      { key: "taxable_value",       header: "Taxable",         render: (r) => fmt(r.taxable_value), align: "right" },
      { key: "cgst_amount",         header: "CGST",            render: (r) => fmt(r.cgst_amount), align: "right" },
      { key: "sgst_amount",         header: "SGST",            render: (r) => fmt(r.sgst_amount), align: "right" },
      { key: "igst_amount",         header: "IGST",            render: (r) => fmt(r.igst_amount), align: "right" },
      { key: "total_amount",        header: "Total Amt",       render: (r) => fmt(r.total_amount), align: "right", bold: true },
      { key: "broker_name",         header: "Broker",          render: (r) => r.broker_name || "—" },
      { key: "godown",              header: "Godown",          render: (r) => r.godown || "—" },
      { key: "narration",           header: "Narration",       render: (r) => r.narration || "—", wide: true },
    ],
  },
  {
    key: "jobwork_expenses",
    label: "Jobwork / Exp",
    table: "jobwork_expenses",
    dateCol: "voucher_date",
    searchCols: ["voucher_number", "supplier_invoice_no", "party_name"],
    sumCols: ["party_amount", "total_amount"],
    columns: [
      { key: "voucher_date",         header: "Date",           render: (r) => fmtDate(r.voucher_date) },
      { key: "voucher_number",       header: "Voucher No",     render: (r) => r.voucher_number || "—" },
      { key: "voucher_type",         header: "Type",           render: (r) => r.voucher_type || "—" },
      { key: "supplier_invoice_no",  header: "Supp Inv No",    render: (r) => r.supplier_invoice_no || "—" },
      { key: "supplier_invoice_date",header: "Inv Date",       render: (r) => fmtDate(r.supplier_invoice_date) },
      { key: "party_name",           header: "Party",          render: (r) => r.party_name || "—", wide: true },
      { key: "party_gstin",          header: "GSTIN",          render: (r) => r.party_gstin || "—" },
      { key: "expense_ledger",       header: "Expense Ledger", render: (r) => r.expense_ledger || "—", wide: true },
      { key: "expense_amount",       header: "Exp Amount",     render: (r) => fmt(r.expense_amount), align: "right" },
      { key: "tds_amount",           header: "TDS",            render: (r) => fmt(r.tds_amount), align: "right" },
      { key: "cgst_amount",          header: "CGST",           render: (r) => fmt(r.cgst_amount), align: "right" },
      { key: "sgst_amount",          header: "SGST",           render: (r) => fmt(r.sgst_amount), align: "right" },
      { key: "igst_amount",          header: "IGST",           render: (r) => fmt(r.igst_amount), align: "right" },
      { key: "round_off",            header: "Round Off",      render: (r) => fmt(r.round_off), align: "right" },
      { key: "total_amount",         header: "Total Amt",      render: (r) => fmt(r.total_amount), align: "right", bold: true },
      { key: "party_amount",         header: "Party Amt",      render: (r) => fmt(r.party_amount), align: "right", bold: true },
      { key: "bill_type",            header: "Bill Type",      render: (r) => r.bill_type || "—" },
      { key: "place_of_supply",      header: "POS",            render: (r) => r.place_of_supply || "—" },
      { key: "narration",            header: "Narration",      render: (r) => r.narration || "—", wide: true },
    ],
  },
  {
    key: "debit_note",
    label: "Debit Notes",
    table: "debit_note",
    dateCol: "voucher_date",
    searchCols: ["tally_voucher_no", "party_name", "original_bill_ref"],
    sumCols: ["party_amount"],
    columns: [
      { key: "voucher_date",      header: "Date",            render: (r) => fmtDate(r.voucher_date) },
      { key: "tally_voucher_no",  header: "Debit Note No",   render: (r) => r.tally_voucher_no || "—" },
      { key: "party_name",        header: "Party",           render: (r) => r.party_name || "—", wide: true },
      { key: "party_gstin",       header: "GSTIN",           render: (r) => r.party_gstin || "—" },
      { key: "original_bill_ref", header: "Orig Bill",       render: (r) => r.original_bill_ref || "—" },
      { key: "original_bill_date",header: "Orig Date",       render: (r) => fmtDate(r.original_bill_date) },
      { key: "nature_of_return",  header: "Nature",          render: (r) => r.nature_of_return || "—" },
      { key: "expense_ledger",    header: "Expense Ledger",  render: (r) => r.expense_ledger || "—", wide: true },
      { key: "expense_amount",    header: "Exp Amount",      render: (r) => fmt(r.expense_amount), align: "right" },
      { key: "cgst_amount",       header: "CGST",            render: (r) => fmt(r.cgst_amount), align: "right" },
      { key: "sgst_amount",       header: "SGST",            render: (r) => fmt(r.sgst_amount), align: "right" },
      { key: "igst_amount",       header: "IGST",            render: (r) => fmt(r.igst_amount), align: "right" },
      { key: "round_off",         header: "Round Off",       render: (r) => fmt(r.round_off), align: "right" },
      { key: "party_amount",      header: "Party Amt",       render: (r) => fmt(r.party_amount), align: "right", bold: true },
      { key: "bill_ref",          header: "Bill Ref",        render: (r) => r.bill_ref || "—" },
      { key: "place_of_supply",   header: "POS",             render: (r) => r.place_of_supply || "—" },
      { key: "narration",         header: "Narration",       render: (r) => r.narration || "—", wide: true },
    ],
  },
  {
    key: "accounting_vouchers",
    label: "Acctg Vouchers",
    table: "accounting_vouchers",
    dateCol: "voucher_date",
    searchCols: ["voucher_number", "voucher_type", "party_name", "bank_ledger", "dr_ledger"],
    sumCols: ["total_amount"],
    columns: [
      { key: "voucher_date",    header: "Date",           render: (r) => fmtDate(r.voucher_date) },
      { key: "voucher_number",  header: "Voucher No",     render: (r) => r.voucher_number || "—" },
      { key: "voucher_type",    header: "Type",           render: (r) => r.voucher_type || "—" },
      { key: "party_name",      header: "Party",          render: (r) => r.party_name || "—", wide: true },
      { key: "dr_ledger",       header: "DR Ledger",      render: (r) => r.dr_ledger || "—", wide: true },
      { key: "cr_ledger",       header: "CR Ledger",      render: (r) => r.cr_ledger || "—", wide: true },
      { key: "dr_amount",       header: "DR Amount",      render: (r) => fmt(r.dr_amount), align: "right" },
      { key: "cr_amount",       header: "CR Amount",      render: (r) => fmt(r.cr_amount), align: "right" },
      { key: "total_amount",    header: "Total Amt",      render: (r) => fmt(r.total_amount), align: "right", bold: true },
      { key: "bank_ledger",     header: "Bank Ledger",    render: (r) => r.bank_ledger || "—" },
      { key: "payment_mode",    header: "Mode",           render: (r) => r.payment_mode || "—" },
      { key: "instrument_no",   header: "Instrument No",  render: (r) => r.instrument_no || "—" },
      { key: "instrument_date", header: "Instr Date",     render: (r) => fmtDate(r.instrument_date) },
      { key: "payment_favouring",header: "Favouring",     render: (r) => r.payment_favouring || "—" },
      { key: "bank_name",       header: "Bank",           render: (r) => r.bank_name || "—" },
      { key: "account_number",  header: "Account No",     render: (r) => r.account_number || "—" },
      { key: "entered_by",      header: "Entered By",     render: (r) => r.entered_by || "—" },
      { key: "multi_bill",      header: "Multi-Bill",     render: (r) => r.multi_bill ? <span className="badge-amber">Yes</span> : "No" },
      { key: "total_lines",     header: "Lines",          render: (r) => r.total_lines ?? "—", align: "right" },
      { key: "narration",       header: "Narration",      render: (r) => r.narration || "—", wide: true },
    ],
  },
  {
    key: "receipt_payment_lines",
    label: "Receipt/Payment",
    table: "receipt_payment_lines",
    dateCol: "voucher_date",
    searchCols: ["voucher_number", "voucher_type", "party_name", "bill_ref", "bank_ledger"],
    sumCols: ["bill_amount"],
    columns: [
      { key: "voucher_date",   header: "Date",          render: (r) => fmtDate(r.voucher_date) },
      { key: "voucher_number", header: "Voucher No",    render: (r) => r.voucher_number || "—" },
      { key: "voucher_type",   header: "Type",          render: (r) => r.voucher_type || "—" },
      { key: "party_name",     header: "Party",         render: (r) => r.party_name || "—", wide: true },
      { key: "bill_ref",       header: "Bill Ref",      render: (r) => r.bill_ref || "—" },
      { key: "bill_amount",    header: "Amount",        render: (r) => fmt(r.bill_amount), align: "right", bold: true },
      { key: "bank_ledger",    header: "Bank Ledger",   render: (r) => r.bank_ledger || "—", wide: true },
      { key: "payment_mode",   header: "Mode",          render: (r) => r.payment_mode || "—" },
      { key: "instrument_no",  header: "Instr No",      render: (r) => r.instrument_no || "—" },
      { key: "narration",      header: "Narration",     render: (r) => r.narration || "—", wide: true },
    ],
  },
  {
    key: "stock_journal",
    label: "Stock Journal",
    table: "stock_journal",
    dateCol: "voucher_date",
    searchCols: ["tally_voucher_no", "lot_no", "design_no", "grey_item_name", "finished_item_name"],
    sumCols: ["finished_qty_mtrs"],
    columns: [
      { key: "voucher_date",       header: "Date",              render: (r) => fmtDate(r.voucher_date) },
      { key: "tally_voucher_no",   header: "Tally Vch No",      render: (r) => r.tally_voucher_no || "—" },
      { key: "lot_no",             header: "Lot No",            render: (r) => r.lot_no || "—" },
      { key: "design_no",          header: "Design No",         render: (r) => r.design_no || "—" },
      { key: "grey_item_name",     header: "Grey Item",         render: (r) => r.grey_item_name || "—", wide: true },
      { key: "finished_item_name", header: "Finished Item",     render: (r) => r.finished_item_name || "—", wide: true },
      { key: "grey_qty_mtrs",      header: "Grey Qty (m)",      render: (r) => fmtQty(r.grey_qty_mtrs), align: "right" },
      { key: "finished_qty_mtrs",  header: "Finished Qty (m)",  render: (r) => fmtQty(r.finished_qty_mtrs), align: "right" },
      { key: "short_qty_mtrs",     header: "Short (m)",         render: (r) => fmtQty(r.short_qty_mtrs), align: "right" },
      { key: "shortage_pct",       header: "Shortage%",         render: (r) => fmtPct(r.shortage_pct), align: "right" },
      { key: "quality_name",       header: "Quality",           render: (r) => r.quality_name || "—" },
      { key: "narration",          header: "Narration",         render: (r) => r.narration || "—", wide: true },
    ],
  },
];

// ─── Page Size ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 100;

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TallyAccountingHub() {
  const fy = getCurrentFY();
  const [activeTab, setActiveTab] = useState(TAB_CONFIG[0].key);
  const [dateFrom, setDateFrom] = useState(fy.from);
  const [dateTo, setDateTo] = useState(fy.to);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  const tab = TAB_CONFIG.find((t) => t.key === activeTab);

  const fetchData = useCallback(async () => {
    if (!tab) return;
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from(tab.table)
        .select("*", { count: "exact" })
        .gte(tab.dateCol, dateFrom)
        .lte(tab.dateCol, dateTo)
        .order(tab.dateCol, { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        const s = search.trim();
        const orParts = tab.searchCols.map((c) => `${c}.ilike.%${s}%`).join(",");
        q = q.or(orParts);
      }

      const { data, error: err, count } = await q;
      if (err) throw err;
      setRows(data || []);
      setTotalCount(count || 0);
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab, dateFrom, dateTo, search, page]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Summary sums
  const sums = {};
  tab?.sumCols.forEach((col) => {
    sums[col] = rows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="hub-root">
      {/* ── Header ── */}
      <div className="hub-header">
        <div className="hub-title">
          <span className="hub-logo">SRTPL</span>
          <h1>Tally Accounting Hub</h1>
          <span className="hub-sub">SheeRang Trendz Pvt. Ltd.</span>
        </div>
        <div className="hub-controls">
          <label>
            From
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <input
            className="hub-search"
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-refresh" onClick={fetchData} title="Refresh">
            ⟳
          </button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="hub-tabs">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.key}
            className={`hub-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Summary Bar ── */}
      <div className="hub-summary">
        <span className="summary-count">
          {loading ? "Loading…" : `${totalCount.toLocaleString("en-IN")} records`}
        </span>
        {tab?.sumCols.map((col) => (
          <span key={col} className="summary-item">
            <span className="summary-label">
              {tab.columns.find((c) => c.key === col)?.header || col}:
            </span>
            <span className="summary-val">
              {col.includes("qty") || col.includes("mtrs")
                ? fmtQty(sums[col])
                : fmt(sums[col])}
            </span>
          </span>
        ))}
        {totalPages > 1 && (
          <span className="summary-page">
            Page {page + 1} / {totalPages}
          </span>
        )}
      </div>

      {/* ── Error ── */}
      {error && <div className="hub-error">⚠ {error}</div>}

      {/* ── Table ── */}
      <div className="hub-table-wrap">
        <table className="hub-table">
          <thead>
            <tr>
              {tab?.columns.map((col) => (
                <th
                  key={col.key}
                  className={[col.align === "right" ? "r" : "", col.wide ? "wide" : ""].join(" ")}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={tab?.columns.length} className="hub-loading-cell">
                  <div className="hub-spinner" />
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={tab?.columns.length} className="hub-empty-cell">
                  No records found for the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id || i} className={i % 2 === 0 ? "even" : "odd"}>
                  {tab.columns.map((col) => (
                    <td
                      key={col.key}
                      className={[col.align === "right" ? "r" : "", col.bold ? "bold-cell" : "", col.wide ? "wide" : ""].join(" ")}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="hub-pagination">
          <button disabled={page === 0} onClick={() => setPage(0)}>«</button>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹</button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>›</button>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
        </div>
      )}

      <style>{`
        .hub-root {
          font-family: 'IBM Plex Mono', 'Courier New', monospace;
          background: #0f1117;
          color: #e2e8f0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .hub-header {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 14px 20px;
          background: #161b27;
          border-bottom: 1px solid #2d3748;
          flex-wrap: wrap;
        }
        .hub-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .hub-logo {
          background: #f6ad55;
          color: #1a202c;
          font-weight: 700;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 1px;
        }
        .hub-header h1 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: #f7fafc;
        }
        .hub-sub {
          font-size: 11px;
          color: #718096;
        }
        .hub-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-left: auto;
          flex-wrap: wrap;
        }
        .hub-controls label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #a0aec0;
        }
        .hub-controls input[type="date"] {
          background: #1a202c;
          border: 1px solid #4a5568;
          color: #e2e8f0;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-family: inherit;
        }
        .hub-search {
          background: #1a202c;
          border: 1px solid #4a5568;
          color: #e2e8f0;
          padding: 5px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-family: inherit;
          width: 200px;
        }
        .hub-search:focus, .hub-controls input[type="date"]:focus {
          outline: none;
          border-color: #f6ad55;
        }
        .btn-refresh {
          background: #2d3748;
          border: 1px solid #4a5568;
          color: #e2e8f0;
          padding: 5px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        .btn-refresh:hover { background: #4a5568; }

        /* ── Tab Bar ── */
        .hub-tabs {
          display: flex;
          gap: 2px;
          padding: 0 20px;
          background: #0d1117;
          border-bottom: 1px solid #2d3748;
          overflow-x: auto;
          flex-shrink: 0;
        }
        .hub-tab {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: #718096;
          padding: 10px 14px;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: color 0.15s, border-color 0.15s;
        }
        .hub-tab:hover { color: #e2e8f0; }
        .hub-tab.active {
          color: #f6ad55;
          border-bottom-color: #f6ad55;
          font-weight: 600;
        }

        /* ── Summary Bar ── */
        .hub-summary {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 8px 20px;
          background: #161b27;
          border-bottom: 1px solid #2d3748;
          font-size: 12px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .summary-count {
          color: #a0aec0;
          min-width: 120px;
        }
        .summary-item {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .summary-label { color: #718096; }
        .summary-val { color: #68d391; font-weight: 600; }
        .summary-page { color: #718096; margin-left: auto; }

        /* ── Error ── */
        .hub-error {
          background: #2d1515;
          border: 1px solid #c53030;
          color: #fc8181;
          padding: 8px 20px;
          font-size: 12px;
        }

        /* ── Table ── */
        .hub-table-wrap {
          flex: 1;
          overflow: auto;
        }
        .hub-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          table-layout: auto;
        }
        .hub-table thead {
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .hub-table thead tr {
          background: #1a202c;
        }
        .hub-table th {
          padding: 9px 12px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: #f6ad55;
          border-bottom: 2px solid #f6ad55;
          white-space: nowrap;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .hub-table th.r { text-align: right; }
        .hub-table th.wide { min-width: 160px; }

        .hub-table td {
          padding: 7px 12px;
          border-bottom: 1px solid #1e2535;
          color: #cbd5e0;
          white-space: nowrap;
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hub-table td.r { text-align: right; }
        .hub-table td.wide { white-space: nowrap; }
        .hub-table td.bold-cell { color: #f7fafc; font-weight: 600; }

        .hub-table tr.even td { background: #0f1117; }
        .hub-table tr.odd td { background: #111724; }
        .hub-table tr:hover td { background: #1a2338; }

        .hub-loading-cell, .hub-empty-cell {
          text-align: center;
          padding: 40px;
          color: #4a5568;
        }
        .hub-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid #4a5568;
          border-top-color: #f6ad55;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Badges ── */
        .null-badge {
          color: #718096;
          font-style: italic;
          font-size: 11px;
        }
        .badge-red {
          background: #2d1515;
          color: #fc8181;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
        }
        .badge-amber {
          background: #2d2515;
          color: #fbd38d;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
        }
        .badge-green {
          background: #152d1e;
          color: #68d391;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
        }

        /* ── Pagination ── */
        .hub-pagination {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          padding: 10px;
          background: #161b27;
          border-top: 1px solid #2d3748;
          font-size: 12px;
          flex-shrink: 0;
        }
        .hub-pagination button {
          background: #2d3748;
          border: 1px solid #4a5568;
          color: #e2e8f0;
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit;
        }
        .hub-pagination button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .hub-pagination button:not(:disabled):hover { background: #4a5568; }
        .hub-pagination span { color: #a0aec0; }

        /* ── Scrollbar ── */
        .hub-table-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
        .hub-table-wrap::-webkit-scrollbar-track { background: #0f1117; }
        .hub-table-wrap::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 3px; }

        /* ── Tab scroll ── */
        .hub-tabs::-webkit-scrollbar { height: 4px; }
        .hub-tabs::-webkit-scrollbar-track { background: #0d1117; }
        .hub-tabs::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 2px; }
      `}</style>
    </div>
  );
}
