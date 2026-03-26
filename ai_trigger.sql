-- Supabase Trigger for AI Purchase Memory Tracking
CREATE OR REPLACE FUNCTION update_ai_purchase_memory()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  current_item_name TEXT;
  current_memory JSONB;
BEGIN
  -- Read current memory from the customer record
  SELECT ai_purchase_memory INTO current_memory 
  FROM customers 
  WHERE tally_ledger_name = NEW.customer_name;
  
  IF current_memory IS NULL THEN
    current_memory := '[]'::jsonb;
  END IF;

  -- Prevent error if line_items is null
  IF NEW.line_items IS NULL THEN
    RETURN NEW;
  END IF;

  -- Loop through each line item in the new sales bill
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.line_items)
  LOOP
    current_item_name := item->>'item_name';
    
    -- If item is not null and not already in the array, append it (string comparison)
    IF current_item_name IS NOT NULL AND NOT (current_memory ? current_item_name) THEN
      current_memory := current_memory || to_jsonb(current_item_name);
    END IF;
  END LOOP;
  
  -- Update the customer's purchase memory silently
  UPDATE customers 
  SET ai_purchase_memory = current_memory 
  WHERE tally_ledger_name = NEW.customer_name;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_sales_bill_inserted ON sales_bills;
CREATE TRIGGER on_sales_bill_inserted
AFTER INSERT OR UPDATE ON sales_bills
FOR EACH ROW
EXECUTE FUNCTION update_ai_purchase_memory();
