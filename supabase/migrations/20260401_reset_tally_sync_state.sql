-- ============================================================
-- Migration: 20260401_reset_tally_sync_state.sql
-- Purpose: Force N8n to re-fetch all historical data from 2022
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste & run
-- ============================================================

-- If you have a tally_sync_state table managing the cursor:
UPDATE tally_sync_state 
SET last_synced = '2022-04-01T00:00:00Z', 
    batch_status = 'pending' 
WHERE true;

-- Notice:
SELECT 'Sync cursor successfully reset to 2022-04-01! Your next N8n run will process FY 22-23 through FY 25-26' as result;
