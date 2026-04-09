ALTER TABLE rec_from_mill DROP CONSTRAINT IF EXISTS "rec_from_mill_tally_voucher_no_key";
ALTER TABLE rec_from_mill ADD CONSTRAINT rec_from_mill_tally_voucher_no_lot_no_key UNIQUE (tally_voucher_no, lot_no);

ALTER TABLE process_issues DROP CONSTRAINT IF EXISTS "process_issues_challan_no_key";
ALTER TABLE process_issues ADD CONSTRAINT process_issues_challan_no_lot_no_key UNIQUE (challan_no, lot_no);

-- Also let's check sales_bills column definition
ALTER TABLE sales_bills ADD COLUMN IF NOT EXISTS line_items JSONB;
ALTER TABLE sales_bills ADD COLUMN IF NOT EXISTS all_design_nos JSONB;
