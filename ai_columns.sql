-- Add AI Sales columns to customers table
ALTER TABLE customers 
  ADD COLUMN IF NOT EXISTS ai_wishlist JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_purchase_memory JSONB DEFAULT '[]'::jsonb;
