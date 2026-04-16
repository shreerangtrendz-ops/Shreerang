import { useState, useRef, useCallback } from "react";
import { customSupabaseClient as supabase } from "@/lib/customSupabaseClient";

// ─── Teal/gold palette matching Horizon design system ───────────────────────
const T = {
  teal: "#0d9488",
  tealDark: "#0f766e",
  tealLight: "#ccfbf1",
  tealBg: "#f0fdfa",
  gold: "#b45309",
  goldLight: "#fef3c7",
  red: "#dc2626",
  redLight: "#fee2e2",
  green: "#16a34a",
  greenLight: "#dcfce7",
  amber: "#d97706",
  amberLight: "#fef3c7",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray600: "#4b5563",
  gray700: "#374151",
  gray900: "#111827",
};

const TABS = [
  { id: "ocr", label: "Bill Scanner", icon: "📄", desc: "OCR + Auto-fill" },
  { id: "gst", label: "GST Recon", icon: "🧾", desc: "GSTR-2B Match" },
  { id: "bank", label: "Bank Recon", icon: "🏦", desc: "Statement Match" },
  { id: "tds", label: "TDS Tracker", icon: "💰", desc: "Auto-Calculate" },
];

// ─── Helper ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    matched: { bg: T.greenLight, color: T.green, label: "✅ Matched" },
    amount_mismatch: { bg: T.amberLight, color: T.amber, label: "⚠️ Mismatch" },
    missing_in_books: { bg: T.redLight, color: T.red, label: "❌ Missing in Books" },
    not_in_gstr2b: { bg: T.tealLight, color: T.tealDark, label: "🔍 Not in GSTR-2B" },
    unmatched: { bg: T.redLight, color: T.red, label: "❌ Unmatched" },
    partial: { bg: T.amberLight, color: T.amber, label: "⚡ Partial" },
    pending: { bg: T.gray100, color: T.gray600, label: "⏳ Pending" },
    deducted: { bg: T.tealLight, color: T.tealDark, label: "✅ Deducted" },
    exempt: { bg: T.greenLight, color: T.green, label: "🟢 Exempt" },
    extracted: { bg: T.tealLight, color: T.tealDark, label: "✅ Extracted" },
    applied: { bg: T.greenLight, color: T.green, label: "✅ Applied" },
    failed: { bg: T.redLight, color: T.red, label: "❌ Failed" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 600, whiteSpace: "nowrap"
    }}>{s.label}</span>
  );
}

function SummaryCard({ label, value, color = T.teal, icon }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${T.gray200}`,
      borderRadius: 12, padding: "16px 20px",
      display: "flex", flexDirection: "column", gap: 4,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: T.gray600 }}>{label}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 1 — BILL OCR SCANNER
// ════════════════════════════════════════════════════════════════════════════
function BillScanner() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [targetTable, setTargetTable] = useState("purchase_bills");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(false);
  const [history, setHistory] = useState([]);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setExtracted(null);
    setApplied(false);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const extractWithClaude = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      // Convert file to base64
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const mediaType = file.type || "image/jpeg";
      const isImage = mediaType.startsWith("image/");

      const prompt = `You are extracting data from an Indian GST invoice/bill for a textile business.
Extract ALL of the following fields. Return ONLY valid JSON, no markdown, no explanation.

{
  "supplier_name": "",
  "supplier_gstin": "",
  "supplier_invoice_no": "",
  "voucher_date": "YYYY-MM-DD",
  "hsn_code": "",
  "item_name": "",
  "quantity": null,
  "unit": "",
  "rate": null,
  "taxable_value": null,
  "cgst_rate": null,
  "cgst_amount": null,
  "sgst_rate": null,
  "sgst_amount": null,
  "igst_rate": null,
  "igst_amount": null,
  "total_amount": null,
  "place_of_supply": "",
  "narration": "",
  "confidence": 0
}

- confidence: 0-100 based on image clarity
- All numeric fields should be numbers, not strings
- Date in YYYY-MM-DD format
- If a field is not visible, use null or empty string`;

      const body = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: isImage
            ? [
                { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
                { type: "text", text: prompt }
              ]
            : [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                { type: "text", text: prompt }
              ]
        }]
      };

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      const text = data.content?.find(c => c.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const fields = JSON.parse(clean);

      setExtracted(fields);

      // Save to Supabase
      const { data: saved } = await supabase.from("ocr_uploads").insert({
        file_name: file.name,
        file_type: isImage ? "image" : "pdf",
        target_table: targetTable,
        raw_ocr_json: data,
        extracted_fields: fields,
        confidence_score: fields.confidence || 0,
        status: "extracted"
      }).select().single();

      if (saved) {
        setHistory(prev => [{ ...saved, file_name: file.name }, ...prev.slice(0, 4)]);
      }
    } catch (err) {
      setError("Extraction failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyToForm = async () => {
    if (!extracted) return;
    // In real app this would navigate to the target page with pre-filled state
    // For now we show confirmation
    setApplied(true);
    // Update status in Supabase
    await supabase.from("ocr_uploads")
      .update({ status: "applied" })
      .eq("status", "extracted")
      .eq("file_name", file.name);
  };

  const Field = ({ label, field, type = "text" }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: T.gray600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <input
        type={type}
        value={extracted?.[field] ?? ""}
        onChange={e => setExtracted(prev => ({ ...prev, [field]: e.target.value }))}
        style={{
          border: `1px solid ${T.gray200}`, borderRadius: 8,
          padding: "8px 12px", fontSize: 13, color: T.gray900,
          background: extracted?.[field] ? T.tealBg : "#fff",
          outline: "none", width: "100%", boxSizing: "border-box"
        }}
      />
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      {/* LEFT: Upload */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.gray200}`, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: 0, color: T.gray900, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📤 Upload Bill</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.gray600, display: "block", marginBottom: 6 }}>Bill Type</label>
            <select
              value={targetTable}
              onChange={e => setTargetTable(e.target.value)}
              style={{ width: "100%", border: `1px solid ${T.gray200}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: T.gray900 }}
            >
              <option value="purchase_bills">Purchase Bill (Grey Fabric)</option>
              <option value="job_work_bills">Job Work Bill (Mill Processing)</option>
              <option value="grey_purchase">Grey Purchase Entry</option>
            </select>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${file ? T.teal : T.gray200}`,
              borderRadius: 12, padding: "32px 20px",
              textAlign: "center", cursor: "pointer",
              background: file ? T.tealBg : T.gray50,
              transition: "all 0.2s"
            }}
          >
            {preview ? (
              <img src={preview} alt="Bill preview" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, objectFit: "contain" }} />
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 13, color: T.gray600 }}>Drop bill image or PDF here</div>
                <div style={{ fontSize: 11, color: T.gray400, marginTop: 4 }}>JPG, PNG, PDF supported</div>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          </div>

          {file && (
            <div style={{ marginTop: 8, fontSize: 12, color: T.gray600, display: "flex", alignItems: "center", gap: 6 }}>
              📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}

          <button
            onClick={extractWithClaude}
            disabled={!file || loading}
            style={{
              marginTop: 14, width: "100%", padding: "11px 0",
              background: !file || loading ? T.gray200 : T.teal,
              color: !file || loading ? T.gray400 : "#fff",
              border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: !file || loading ? "not-allowed" : "pointer", transition: "all 0.2s"
            }}
          >
            {loading ? "🔍 Extracting with AI..." : "⚡ Extract with Claude AI"}
          </button>

          {error && <div style={{ marginTop: 10, padding: "10px 14px", background: T.redLight, color: T.red, borderRadius: 8, fontSize: 13 }}>{error}</div>}
        </div>

        {/* OCR History */}
        {history.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.gray200}`, padding: 20 }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: T.gray700 }}>Recent Scans</h4>
            {history.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < history.length - 1 ? `1px solid ${T.gray100}` : "none" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.gray900 }}>{h.file_name}</div>
                  <div style={{ fontSize: 11, color: T.gray400 }}>{h.target_table} · {Math.round(h.confidence_score)}% confidence</div>
                </div>
                <StatusBadge status={h.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Extracted Fields */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.gray200}`, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: T.gray900, fontSize: 15, fontWeight: 700 }}>
            {extracted ? "✅ Extracted Fields" : "📋 Extracted Fields"}
          </h3>
          {extracted && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 12, color: T.teal, fontWeight: 600 }}>
                {extracted.confidence}% confidence
              </div>
              <div style={{ width: 60, height: 6, background: T.gray200, borderRadius: 3 }}>
                <div style={{ width: `${extracted.confidence}%`, height: "100%", background: T.teal, borderRadius: 3 }} />
              </div>
            </div>
          )}
        </div>

        {!extracted ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: T.gray400 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 14 }}>Upload a bill and click Extract</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Claude AI will read all fields automatically</div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Supplier Name" field="supplier_name" />
              <Field label="Supplier GSTIN" field="supplier_gstin" />
              <Field label="Invoice No." field="supplier_invoice_no" />
              <Field label="Invoice Date" field="voucher_date" type="date" />
              <Field label="HSN Code" field="hsn_code" />
              <Field label="Item Name" field="item_name" />
              <Field label="Quantity" field="quantity" type="number" />
              <Field label="Rate (₹)" field="rate" type="number" />
              <Field label="Taxable Value" field="taxable_value" type="number" />
              <Field label="CGST %" field="cgst_rate" type="number" />
              <Field label="CGST Amount" field="cgst_amount" type="number" />
              <Field label="SGST %" field="sgst_rate" type="number" />
              <Field label="SGST Amount" field="sgst_amount" type="number" />
              <Field label="IGST %" field="igst_rate" type="number" />
              <Field label="IGST Amount" field="igst_amount" type="number" />
              <Field label="Total Amount" field="total_amount" type="number" />
              <Field label="Place of Supply" field="place_of_supply" />
            </div>

            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={applyToForm}
                disabled={applied}
                style={{
                  padding: "11px 0", background: applied ? T.greenLight : T.teal,
                  color: applied ? T.green : "#fff", border: "none",
                  borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: applied ? "default" : "pointer"
                }}
              >
                {applied ? "✅ Applied to Form" : `Apply to ${targetTable === "purchase_bills" ? "Purchase Bill" : targetTable === "job_work_bills" ? "JW Bill" : "Grey Purchase"}`}
              </button>
              <button
                onClick={() => { setFile(null); setPreview(null); setExtracted(null); setApplied(false); }}
                style={{ padding: "11px 0", background: T.gray100, color: T.gray700, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                🔄 Scan Another
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 2 — GST RECONCILIATION
// ════════════════════════════════════════════════════════════════════════════
function GSTRecon() {
  const [gstr2bJson, setGstr2bJson] = useState(null);
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [lines, setLines] = useState([]);
  const [filter, setFilter] = useState("all");
  const fileRef = useRef();

  const handleGSTR2B = (f) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        setGstr2bJson(json);
      } catch {
        alert("Invalid JSON file. Please upload the GSTR-2B JSON from GST portal.");
      }
    };
    reader.readAsText(f);
  };

  const runReconciliation = async () => {
    if (!gstr2bJson || !period) return;
    setLoading(true);
    try {
      // Extract B2B invoices from GSTR-2B JSON structure
      const b2bData = gstr2bJson?.data?.docdata?.b2b || [];
      const gstrLines = [];
      b2bData.forEach(supplier => {
        (supplier.inv || []).forEach(inv => {
          (inv.items || [inv]).forEach(item => {
            gstrLines.push({
              gstin: supplier.ctin,
              supplier_name: supplier.trdnm || "",
              invoice_no: inv.inum,
              invoice_date: inv.idt,
              taxable_value: parseFloat(item.txval || inv.val || 0),
              igst: parseFloat(item.igst || 0),
              cgst: parseFloat(item.camt || 0),
              sgst: parseFloat(item.samt || 0),
            });
          });
        });
      });

      // Fetch purchase_bills from Supabase for this period
      const [year, month] = period.split("-");
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];

      const { data: books } = await supabase
        .from("purchase_bills")
        .select("id, supplier_gstin, supplier_invoice_no, supplier_invoice_date, taxable_value, cgst_amount, sgst_amount, igst_amount, total_amount")
        .gte("supplier_invoice_date", startDate)
        .lte("supplier_invoice_date", endDate);

      // Create session
      const { data: sess } = await supabase.from("gst_recon_sessions").insert({
        session_name: `GSTR-2B Recon ${period}`,
        gstr2b_period: period,
        total_gstr2b_records: gstrLines.length,
        created_by: "owner"
      }).select().single();

      if (!sess) throw new Error("Failed to create session");

      // Reconcile
      const reconLines = [];
      let matched = 0, mismatched = 0, missingInBooks = 0, notInGSTR = 0;

      // GSTR-2B side
      for (const g of gstrLines) {
        const bookMatch = books?.find(b =>
          b.supplier_gstin === g.gstin &&
          b.supplier_invoice_no?.toLowerCase() === g.invoice_no?.toLowerCase()
        );
        let status;
        if (!bookMatch) {
          status = "missing_in_books";
          missingInBooks++;
        } else {
          const diff = Math.abs((bookMatch.total_amount || 0) - (g.taxable_value + g.igst + g.cgst + g.sgst));
          status = diff < 1 ? "matched" : "amount_mismatch";
          if (status === "matched") matched++; else mismatched++;
        }
        reconLines.push({
          session_id: sess.id,
          gstr2b_supplier_name: g.supplier_name,
          gstr2b_gstin: g.gstin,
          gstr2b_invoice_no: g.invoice_no,
          gstr2b_taxable_value: g.taxable_value,
          gstr2b_igst: g.igst,
          gstr2b_cgst: g.cgst,
          gstr2b_sgst: g.sgst,
          gstr2b_total_tax: g.igst + g.cgst + g.sgst,
          books_bill_id: bookMatch?.id || null,
          books_invoice_no: bookMatch?.supplier_invoice_no || null,
          books_taxable_value: bookMatch?.taxable_value || null,
          recon_status: status,
          difference_amount: bookMatch ? Math.abs((bookMatch.total_amount || 0) - (g.taxable_value + g.igst + g.cgst + g.sgst)) : null
        });
      }

      // Books entries not in GSTR-2B
      for (const b of (books || [])) {
        const inGSTR = gstrLines.find(g =>
          g.gstin === b.supplier_gstin &&
          g.invoice_no?.toLowerCase() === b.supplier_invoice_no?.toLowerCase()
        );
        if (!inGSTR) {
          notInGSTR++;
          reconLines.push({
            session_id: sess.id,
            books_bill_id: b.id,
            books_invoice_no: b.supplier_invoice_no,
            books_taxable_value: b.taxable_value,
            books_igst: b.igst_amount,
            books_cgst: b.cgst_amount,
            books_sgst: b.sgst_amount,
            recon_status: "not_in_gstr2b",
          });
        }
      }

      // Insert lines
      if (reconLines.length > 0) {
        await supabase.from("gst_recon_lines").insert(reconLines);
      }

      // Update session counts
      const totalITC = reconLines
        .filter(l => l.recon_status === "matched")
        .reduce((s, l) => s + (l.gstr2b_total_tax || 0), 0);

      await supabase.from("gst_recon_sessions").update({
        matched_count: matched,
        mismatched_count: mismatched,
        missing_in_books_count: missingInBooks,
        not_in_gstr2b_count: notInGSTR,
        total_eligible_itc: totalITC
      }).eq("id", sess.id);

      setSession({ ...sess, matched_count: matched, mismatched_count: mismatched, missing_in_books_count: missingInBooks, not_in_gstr2b_count: notInGSTR, total_eligible_itc: totalITC });
      setLines(reconLines);
    } catch (err) {
      alert("Reconciliation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "all" ? lines : lines.filter(l => l.recon_status === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Setup */}
      {!session && (
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.gray200}`, padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.gray900 }}>🧾 GSTR-2B Reconciliation</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.gray600, display: "block", marginBottom: 6 }}>Period (Month-Year)</label>
              <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
                style={{ width: "100%", border: `1px solid ${T.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.gray600, display: "block", marginBottom: 6 }}>GSTR-2B JSON File</label>
              <div
                onClick={() => fileRef.current.click()}
                style={{ border: `2px dashed ${gstr2bJson ? T.teal : T.gray200}`, borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontSize: 13, color: gstr2bJson ? T.teal : T.gray400, background: gstr2bJson ? T.tealBg : T.gray50 }}
              >
                {gstr2bJson ? "✅ JSON Loaded" : "📂 Upload GSTR-2B JSON"}
              </div>
              <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={e => handleGSTR2B(e.target.files[0])} />
            </div>
          </div>
          <button
            onClick={runReconciliation}
            disabled={!gstr2bJson || !period || loading}
            style={{
              marginTop: 16, padding: "12px 32px",
              background: !gstr2bJson || !period ? T.gray200 : T.teal,
              color: !gstr2bJson || !period ? T.gray400 : "#fff",
              border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer"
            }}
          >
            {loading ? "🔄 Running Reconciliation..." : "▶️ Run Reconciliation"}
          </button>
        </div>
      )}

      {/* Results */}
      {session && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <SummaryCard icon="📊" label="Total GSTR-2B" value={session.total_gstr2b_records} color={T.gray700} />
            <SummaryCard icon="✅" label="Matched" value={session.matched_count} color={T.green} />
            <SummaryCard icon="⚠️" label="Mismatch" value={session.mismatched_count} color={T.amber} />
            <SummaryCard icon="❌" label="Missing in Books" value={session.missing_in_books_count} color={T.red} />
            <SummaryCard icon="💰" label="Eligible ITC" value={`₹${Number(session.total_eligible_itc).toLocaleString("en-IN")}`} color={T.teal} />
          </div>

          <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.gray200}`, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.gray100}`, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.gray900, marginRight: 8 }}>Reconciliation Lines</span>
              {["all", "matched", "amount_mismatch", "missing_in_books", "not_in_gstr2b"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: filter === f ? T.teal : T.gray100,
                  color: filter === f ? "#fff" : T.gray600,
                  border: "none"
                }}>
                  {f === "all" ? `All (${lines.length})` : f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
              <button onClick={() => { setSession(null); setLines([]); setGstr2bJson(null); }}
                style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", background: T.gray100, color: T.gray600, border: "none" }}>
                🔄 New Recon
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.gray50 }}>
                    {["Supplier", "GSTIN", "Invoice No.", "Taxable Value", "Total Tax", "Status", "Diff"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: T.gray600, borderBottom: `1px solid ${T.gray200}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((l, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.gray100}` }}>
                      <td style={{ padding: "9px 14px", color: T.gray900, fontWeight: 500 }}>{l.gstr2b_supplier_name || l.books_invoice_no || "—"}</td>
                      <td style={{ padding: "9px 14px", color: T.gray600, fontFamily: "monospace" }}>{l.gstr2b_gstin || "—"}</td>
                      <td style={{ padding: "9px 14px", color: T.gray600 }}>{l.gstr2b_invoice_no || l.books_invoice_no || "—"}</td>
                      <td style={{ padding: "9px 14px", color: T.gray900 }}>₹{Number(l.gstr2b_taxable_value || l.books_taxable_value || 0).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "9px 14px", color: T.gray900 }}>₹{Number(l.gstr2b_total_tax || 0).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "9px 14px" }}><StatusBadge status={l.recon_status} /></td>
                      <td style={{ padding: "9px 14px", color: l.difference_amount > 0 ? T.red : T.gray400 }}>
                        {l.difference_amount ? `₹${Number(l.difference_amount).toLocaleString("en-IN")}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div style={{ padding: "40px", textAlign: "center", color: T.gray400, fontSize: 14 }}>No records for this filter</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — BANK RECONCILIATION
// ════════════════════════════════════════════════════════════════════════════
function BankRecon() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [lines, setLines] = useState([]);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ bank_account: "", period_from: "", period_to: "" });
  const [pastedData, setPastedData] = useState("");
  const fileRef = useRef();

  const parseStatementText = (text) => {
    // Parse tab/CSV formatted bank statement lines
    const rows = text.trim().split("\n").filter(r => r.trim());
    return rows.map(row => {
      const cols = row.split(/\t|,/).map(c => c.trim().replace(/"/g, ""));
      // Try to parse: date, description, debit, credit, balance
      const dateMatch = cols.find(c => /\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}/.test(c));
      const nums = cols.filter(c => /^[\d,]+(\.\d+)?$/.test(c.replace(/,/g, "")));
      return {
        txn_date: dateMatch ? new Date(dateMatch).toISOString().split("T")[0] : null,
        txn_description: cols[1] || cols[0] || "",
        txn_ref_no: cols.find(c => /[A-Z]{4}\d+|UTR|NEFT|IMPS/i.test(c)) || "",
        debit_amount: nums[0] ? parseFloat(nums[0].replace(/,/g, "")) : null,
        credit_amount: nums[1] ? parseFloat(nums[1].replace(/,/g, "")) : null,
        bank_balance: nums[2] ? parseFloat(nums[2].replace(/,/g, "")) : null,
      };
    }).filter(r => r.txn_date);
  };

  const runReconciliation = async () => {
    if (!pastedData || !form.bank_account) return;
    setLoading(true);
    try {
      const txns = parseStatementText(pastedData);
      if (txns.length === 0) throw new Error("No valid transactions found. Check format.");

      // Create session
      const { data: sess } = await supabase.from("bank_recon_sessions").insert({
        session_name: `Bank Recon - ${form.bank_account}`,
        bank_account_name: form.bank_account,
        statement_period_from: form.period_from || null,
        statement_period_to: form.period_to || null,
        total_transactions: txns.length,
        created_by: "owner"
      }).select().single();

      if (!sess) throw new Error("Could not create session");

      // Fetch relevant bills
      const { data: salesBills } = await supabase.from("sales_bills")
        .select("id, bill_number, customer_name, total_amount, bill_date")
        .gte("bill_date", form.period_from || "2020-01-01")
        .lte("bill_date", form.period_to || new Date().toISOString().split("T")[0]);

      const { data: purchBills } = await supabase.from("purchase_bills")
        .select("id, supplier_invoice_no, supplier_name, total_amount, voucher_date")
        .gte("voucher_date", form.period_from || "2020-01-01")
        .lte("voucher_date", form.period_to || new Date().toISOString().split("T")[0]);

      // Match
      const reconLines = txns.map(txn => {
        const amt = txn.credit_amount || txn.debit_amount;
        // Try sales bills (credits = payment received)
        const salesMatch = txn.credit_amount
          ? salesBills?.find(b => Math.abs((b.total_amount || 0) - txn.credit_amount) < 10)
          : null;
        // Try purchase bills (debits = payment made)
        const purchMatch = txn.debit_amount
          ? purchBills?.find(b => Math.abs((b.total_amount || 0) - txn.debit_amount) < 10)
          : null;

        const match = salesMatch || purchMatch;
        const confidence = match ? (
          Math.abs((match.total_amount || 0) - amt) < 1 ? 95 :
          Math.abs((match.total_amount || 0) - amt) < 10 ? 75 : 50
        ) : 0;

        return {
          session_id: sess.id,
          ...txn,
          matched_table: salesMatch ? "sales_bills" : purchMatch ? "purchase_bills" : null,
          matched_id: match?.id || null,
          matched_bill_no: match?.bill_number || match?.supplier_invoice_no || null,
          matched_party_name: match?.customer_name || match?.supplier_name || null,
          matched_amount: match?.total_amount || null,
          match_confidence: confidence,
          recon_status: match ? "matched" : "unmatched"
        };
      });

      await supabase.from("bank_recon_lines").insert(reconLines);

      const matched = reconLines.filter(l => l.recon_status === "matched").length;
      await supabase.from("bank_recon_sessions").update({
        matched_count: matched,
        unmatched_count: txns.length - matched
      }).eq("id", sess.id);

      setSession({ ...sess, matched_count: matched, unmatched_count: txns.length - matched });
      setLines(reconLines);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "all" ? lines : lines.filter(l => l.recon_status === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {!session && (
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.gray200}`, padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.gray900 }}>🏦 Bank Statement Reconciliation</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.gray600, display: "block", marginBottom: 6 }}>Bank Account</label>
              <select value={form.bank_account} onChange={e => setForm(p => ({ ...p, bank_account: e.target.value }))}
                style={{ width: "100%", border: `1px solid ${T.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }}>
                <option value="">Select Account</option>
                <option>HDFC Current A/C</option>
                <option>SBI Current A/C</option>
                <option>ICICI Current A/C</option>
                <option>Kotak Current A/C</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.gray600, display: "block", marginBottom: 6 }}>From Date</label>
              <input type="date" value={form.period_from} onChange={e => setForm(p => ({ ...p, period_from: e.target.value }))}
                style={{ width: "100%", border: `1px solid ${T.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.gray600, display: "block", marginBottom: 6 }}>To Date</label>
              <input type="date" value={form.period_to} onChange={e => setForm(p => ({ ...p, period_to: e.target.value }))}
                style={{ width: "100%", border: `1px solid ${T.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.gray600, display: "block", marginBottom: 6 }}>
              Paste Bank Statement (Date, Description, Debit, Credit, Balance — tab or comma separated)
            </label>
            <textarea
              value={pastedData}
              onChange={e => setPastedData(e.target.value)}
              placeholder={"01/04/2024\tNEFT-HDFC-CUSTOMER NAME\t\t50000\t125000\n02/04/2024\tIMPS-SUPPLIER PAYMENT\t30000\t\t95000"}
              rows={8}
              style={{ width: "100%", border: `1px solid ${T.gray200}`, borderRadius: 10, padding: "12px", fontSize: 12, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", color: T.gray900 }}
            />
            <div style={{ fontSize: 11, color: T.gray400, marginTop: 4 }}>
              💡 Copy rows directly from your bank's internet banking portal and paste here
            </div>
          </div>

          <button onClick={runReconciliation} disabled={!pastedData || !form.bank_account || loading}
            style={{ marginTop: 14, padding: "12px 32px", background: !pastedData || !form.bank_account ? T.gray200 : T.teal, color: !pastedData || !form.bank_account ? T.gray400 : "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {loading ? "🔄 Matching..." : "▶️ Run Reconciliation"}
          </button>
        </div>
      )}

      {session && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <SummaryCard icon="📊" label="Total Transactions" value={session.total_transactions} color={T.gray700} />
            <SummaryCard icon="✅" label="Matched" value={session.matched_count} color={T.green} />
            <SummaryCard icon="❌" label="Unmatched" value={session.unmatched_count} color={T.red} />
            <SummaryCard icon="📈" label="Match Rate" value={`${Math.round((session.matched_count / session.total_transactions) * 100)}%`} color={T.teal} />
          </div>

          <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.gray200}`, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.gray100}`, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.gray900, marginRight: 8 }}>Transactions</span>
              {["all", "matched", "unmatched"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", background: filter === f ? T.teal : T.gray100, color: filter === f ? "#fff" : T.gray600, border: "none" }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <button onClick={() => { setSession(null); setLines([]); setPastedData(""); }}
                style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", background: T.gray100, color: T.gray600, border: "none" }}>
                🔄 New Recon
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.gray50 }}>
                    {["Date", "Description", "Debit", "Credit", "Matched Bill", "Party", "Confidence", "Status"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: T.gray600, borderBottom: `1px solid ${T.gray200}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.gray100}`, background: l.recon_status === "unmatched" ? "#fff9f9" : "#fff" }}>
                      <td style={{ padding: "9px 14px", color: T.gray700, whiteSpace: "nowrap" }}>{l.txn_date}</td>
                      <td style={{ padding: "9px 14px", color: T.gray900, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.txn_description}</td>
                      <td style={{ padding: "9px 14px", color: T.red, fontWeight: 600 }}>{l.debit_amount ? `₹${Number(l.debit_amount).toLocaleString("en-IN")}` : "—"}</td>
                      <td style={{ padding: "9px 14px", color: T.green, fontWeight: 600 }}>{l.credit_amount ? `₹${Number(l.credit_amount).toLocaleString("en-IN")}` : "—"}</td>
                      <td style={{ padding: "9px 14px", color: T.teal, fontWeight: 500 }}>{l.matched_bill_no || "—"}</td>
                      <td style={{ padding: "9px 14px", color: T.gray700 }}>{l.matched_party_name || "—"}</td>
                      <td style={{ padding: "9px 14px" }}>
                        {l.match_confidence > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 40, height: 4, background: T.gray200, borderRadius: 2 }}>
                              <div style={{ width: `${l.match_confidence}%`, height: "100%", background: l.match_confidence > 80 ? T.green : T.amber, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 11, color: T.gray600 }}>{l.match_confidence}%</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "9px 14px" }}><StatusBadge status={l.recon_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — TDS TRACKER
// ════════════════════════════════════════════════════════════════════════════
function TDSTracker() {
  const [fy, setFy] = useState("2024-25");
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [computed, setComputed] = useState(false);

  const computeTDS = async () => {
    setLoading(true);
    try {
      // Get all job_work_bills for the FY
      const [startYear] = fy.split("-");
      const fyStart = `${startYear}-04-01`;
      const fyEnd = `${parseInt(startYear) + 1}-03-31`;

      const { data: bills } = await supabase
        .from("job_work_bills")
        .select("id, bill_number, bill_date, job_worker_name, process_type, quantity, rate, amount, status")
        .gte("bill_date", fyStart)
        .lte("bill_date", fyEnd)
        .order("bill_date");

      if (!bills || bills.length === 0) {
        alert("No job work bills found for " + fy);
        setLoading(false);
        return;
      }

      // Group by vendor to check cumulative threshold
      const vendorTotals = {};
      bills.forEach(b => {
        const amt = Math.abs(b.amount || 0);
        if (!vendorTotals[b.job_worker_name]) vendorTotals[b.job_worker_name] = 0;
        vendorTotals[b.job_worker_name] += amt;
      });

      // Generate TDS entries
      const tdsData = bills.map(b => {
        const amt = Math.abs(b.amount || 0);
        const cumulative = vendorTotals[b.job_worker_name] || 0;
        const singleExceeds = amt > 30000;
        const cumulativeExceeds = cumulative > 100000;
        const liable = singleExceeds || cumulativeExceeds;
        const tdsRate = 1; // 1% for individual/HUF, 2% for others — using 1% default
        const tdsAmt = liable ? parseFloat((amt * tdsRate / 100).toFixed(2)) : 0;

        return {
          financial_year: fy,
          vendor_name: b.job_worker_name,
          tds_section: "194C",
          payment_date: b.bill_date,
          payment_ref: b.bill_number,
          source_table: "job_work_bills",
          source_id: b.id,
          gross_amount: amt,
          tds_rate: liable ? tdsRate : 0,
          tds_amount: tdsAmt,
          net_payable: amt - tdsAmt,
          deduction_status: liable ? "pending" : "exempt",
          remarks: !liable ? "Below threshold" : cumulativeExceeds ? "Cumulative >₹1L" : "Single txn >₹30K"
        };
      });

      // Upsert to Supabase
      await supabase.from("tds_entries").delete().eq("financial_year", fy);
      await supabase.from("tds_entries").insert(tdsData);

      // Summary by vendor
      const summaryMap = {};
      tdsData.forEach(e => {
        if (!summaryMap[e.vendor_name]) summaryMap[e.vendor_name] = { vendor_name: e.vendor_name, total_payments: 0, total_tds: 0, entries: 0 };
        summaryMap[e.vendor_name].total_payments += e.gross_amount;
        summaryMap[e.vendor_name].total_tds += e.tds_amount;
        summaryMap[e.vendor_name].entries++;
      });

      setEntries(tdsData);
      setSummary(Object.values(summaryMap).sort((a, b) => b.total_tds - a.total_tds));
      setComputed(true);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalTDS = entries.reduce((s, e) => s + e.tds_amount, 0);
  const totalPayments = entries.reduce((s, e) => s + e.gross_amount, 0);
  const liableCount = entries.filter(e => e.deduction_status === "pending").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.gray200}`, padding: 20, display: "flex", alignItems: "flex-end", gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.gray600, display: "block", marginBottom: 6 }}>Financial Year</label>
          <select value={fy} onChange={e => { setFy(e.target.value); setComputed(false); }}
            style={{ border: `1px solid ${T.gray200}`, borderRadius: 8, padding: "9px 14px", fontSize: 13 }}>
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
            <option value="2025-26">2025-26</option>
          </select>
        </div>
        <button onClick={computeTDS} disabled={loading}
          style={{ padding: "10px 28px", background: T.teal, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {loading ? "⚙️ Computing..." : "⚙️ Compute TDS"}
        </button>
        {computed && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                const csv = ["Vendor,Bill No,Date,Gross Amount,TDS Rate%,TDS Amount,Net Payable,Status,Remarks",
                  ...entries.map(e => `"${e.vendor_name}","${e.payment_ref}","${e.payment_date}",${e.gross_amount},${e.tds_rate},${e.tds_amount},${e.net_payable},"${e.deduction_status}","${e.remarks}"`)
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `TDS_Register_${fy}.csv`; a.click();
              }}
              style={{ padding: "8px 16px", background: T.goldLight, color: T.gold, border: `1px solid ${T.gold}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ⬇️ Export TDS Register
            </button>
          </div>
        )}
      </div>

      {computed && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <SummaryCard icon="💼" label="Total Job Work Payments" value={`₹${Number(totalPayments).toLocaleString("en-IN")}`} color={T.gray700} />
            <SummaryCard icon="🧾" label="Total TDS Liability" value={`₹${Number(totalTDS).toLocaleString("en-IN")}`} color={T.red} />
            <SummaryCard icon="⚠️" label="Bills Liable for TDS" value={liableCount} color={T.amber} />
            <SummaryCard icon="🏢" label="Unique Vendors" value={summary.length} color={T.teal} />
          </div>

          {/* Vendor Summary */}
          <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.gray200}`, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.gray100}` }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.gray900 }}>Vendor-wise TDS Summary (Sec 194C)</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.gray50 }}>
                  {["Vendor / Mill Name", "Total Payments", "TDS @1%", "Bills", "Threshold Status"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: T.gray600, borderBottom: `1px solid ${T.gray200}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.map((s, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.gray100}` }}>
                    <td style={{ padding: "10px 14px", color: T.gray900, fontWeight: 600 }}>{s.vendor_name}</td>
                    <td style={{ padding: "10px 14px", color: T.gray900 }}>₹{Number(s.total_payments).toLocaleString("en-IN")}</td>
                    <td style={{ padding: "10px 14px", color: s.total_tds > 0 ? T.red : T.gray400, fontWeight: 600 }}>
                      {s.total_tds > 0 ? `₹${Number(s.total_tds).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: T.gray600 }}>{s.entries}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {s.total_payments > 100000
                        ? <span style={{ color: T.red, fontWeight: 600, fontSize: 11 }}>🔴 Crossed ₹1L limit</span>
                        : s.total_payments > 30000
                        ? <span style={{ color: T.amber, fontWeight: 600, fontSize: 11 }}>🟡 Single txn liable</span>
                        : <span style={{ color: T.green, fontWeight: 600, fontSize: 11 }}>🟢 Below threshold</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detailed entries */}
          <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.gray200}`, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.gray100}` }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.gray900 }}>Bill-wise TDS Detail</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.gray50 }}>
                    {["Bill No.", "Date", "Vendor", "Gross Amount", "TDS Rate", "TDS Amount", "Net Payable", "Status", "Remarks"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: T.gray600, borderBottom: `1px solid ${T.gray200}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.gray100}`, background: e.deduction_status === "pending" ? "#fffbf0" : "#fff" }}>
                      <td style={{ padding: "8px 14px", color: T.teal, fontWeight: 600 }}>{e.payment_ref}</td>
                      <td style={{ padding: "8px 14px", color: T.gray700, whiteSpace: "nowrap" }}>{e.payment_date}</td>
                      <td style={{ padding: "8px 14px", color: T.gray900 }}>{e.vendor_name}</td>
                      <td style={{ padding: "8px 14px", color: T.gray900 }}>₹{Number(e.gross_amount).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "8px 14px", color: e.tds_rate > 0 ? T.red : T.gray400 }}>{e.tds_rate > 0 ? `${e.tds_rate}%` : "—"}</td>
                      <td style={{ padding: "8px 14px", color: e.tds_amount > 0 ? T.red : T.gray400, fontWeight: 600 }}>{e.tds_amount > 0 ? `₹${Number(e.tds_amount).toLocaleString("en-IN")}` : "—"}</td>
                      <td style={{ padding: "8px 14px", color: T.gray900 }}>₹{Number(e.net_payable).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "8px 14px" }}><StatusBadge status={e.deduction_status} /></td>
                      <td style={{ padding: "8px 14px", color: T.gray500, fontSize: 11 }}>{e.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function SmartFinancePage() {
  const [activeTab, setActiveTab] = useState("ocr");

  return (
    <div style={{ padding: "24px 28px", background: T.gray50, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${T.teal}, ${T.tealDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.gray900, letterSpacing: "-0.02em" }}>Smart Finance</h1>
            <p style={{ margin: 0, fontSize: 13, color: T.gray600 }}>AI-powered accounting automation for SRTPL</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "#fff", padding: 6, borderRadius: 14, border: `1px solid ${T.gray200}`, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
              background: activeTab === tab.id ? T.teal : "transparent",
              color: activeTab === tab.id ? "#fff" : T.gray600,
              fontWeight: 600, fontSize: 13, transition: "all 0.2s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 100
            }}
          >
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span>{tab.label}</span>
            <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 400 }}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "ocr" && <BillScanner />}
      {activeTab === "gst" && <GSTRecon />}
      {activeTab === "bank" && <BankRecon />}
      {activeTab === "tds" && <TDSTracker />}
    </div>
  );
}
