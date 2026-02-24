-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Base Fabrics Table
CREATE TABLE IF NOT EXISTS base_fabrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_fabric_name TEXT NOT NULL,
    fabric_name TEXT,
    sku TEXT UNIQUE,
    short_code TEXT,
    base TEXT,
    width TEXT,
    finish_type TEXT,
    gsm NUMERIC,
    weight NUMERIC,
    gsm_tolerance TEXT,
    construction TEXT,
    construction_code TEXT,
    yarn_type TEXT,
    yarn_count TEXT,
    handfeel TEXT,
    stretchability TEXT,
    transparency TEXT,
    hsn_code TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    supplier_id UUID REFERENCES suppliers(id),
    notes TEXT,
    ready_stock BOOLEAN DEFAULT false,
    out_of_stock BOOLEAN DEFAULT false,
    finish TEXT
);

CREATE INDEX IF NOT EXISTS idx_base_fabrics_sku ON base_fabrics(sku);
CREATE INDEX IF NOT EXISTS idx_base_fabrics_fabric_name ON base_fabrics(fabric_name);

-- Finish Fabrics Table
CREATE TABLE IF NOT EXISTS finish_fabrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_fabric_id UUID REFERENCES base_fabrics(id),
    finish_fabric_name TEXT NOT NULL,
    finish_fabric_sku TEXT,
    process TEXT,
    process_type TEXT,
    ink_type TEXT,
    width TEXT,
    class TEXT,
    tags TEXT,
    finish TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    process_history JSONB,
    last_process_code TEXT,
    last_process_name TEXT,
    design_image_url TEXT,
    design_number TEXT,
    design_information TEXT,
    ready_stock BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_finish_fabrics_base_id ON finish_fabrics(base_fabric_id);

-- Fancy Base Fabrics Table
CREATE TABLE IF NOT EXISTS fancy_base_fabrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_fabric_id UUID REFERENCES base_fabrics(id),
    fabric_name TEXT,
    sku TEXT,
    value_addition TEXT,
    thread TEXT,
    concept TEXT,
    width TEXT,
    short_code TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Fancy Finish Fabrics Table
CREATE TABLE IF NOT EXISTS fancy_finish_fabrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finish_fabric_id UUID REFERENCES finish_fabrics(id),
    fancy_finish_name TEXT NOT NULL,
    fancy_finish_sku TEXT,
    value_addition_type TEXT,
    thread_type TEXT,
    concept TEXT,
    design_description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fancy_finish_fabrics_finish_id ON fancy_finish_fabrics(finish_fabric_id);

-- Designs Table
CREATE TABLE IF NOT EXISTS designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_number TEXT NOT NULL,
    sku_id UUID,
    image_url TEXT,
    ai_description TEXT,
    manual_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table (Ready Made)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    description TEXT,
    retail_price NUMERIC,
    wholesale_price NUMERIC,
    stock_quantity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SEED DATA BLOCKS

-- Task 1: Fix base_fabrics table schema mismatch
DO $$
BEGIN
    -- Replaced 'process' with 'finish' as 'process' column does not exist in base_fabrics
    INSERT INTO base_fabrics (
        base_fabric_name, fabric_name, sku, base, width, finish, 
        gsm, weight, construction, yarn_count, status
    ) VALUES 
    ('Cotton 60x60', 'Cotton 60x60', 'BF-COT-001', 'Cotton', '44"', 'Soft', 90, 0.1, '60x60', '60s', 'active')
    ON CONFLICT (sku) DO NOTHING;
END $$;

-- Task 2: Fix finish_fabrics table column references
DO $$
DECLARE
    v_base_id UUID;
BEGIN
    SELECT id INTO v_base_id FROM base_fabrics WHERE sku = 'BF-COT-001' LIMIT 1;
    
    IF v_base_id IS NOT NULL THEN
        -- Verified that process_type, class, and tags exist in finish_fabrics table
        INSERT INTO finish_fabrics (
            base_fabric_id, finish_fabric_name, finish_fabric_sku, 
            process_type, class, tags, 
            status
        ) VALUES 
        (v_base_id, 'Cotton 60x60 Dyed', 'FF-COT-001', 'Dyeing', 'Premium', 'Summer,Casual', 'active');
    END IF;
END $$;

-- Task 3: Fix fancy_base_fabrics table column references
DO $$
DECLARE
    v_base_id UUID;
BEGIN
    SELECT id INTO v_base_id FROM base_fabrics WHERE sku = 'BF-COT-001' LIMIT 1;
    
    IF v_base_id IS NOT NULL THEN
        -- Verified that value_addition, thread, and concept exist in fancy_base_fabrics table
        INSERT INTO fancy_base_fabrics (
            base_fabric_id, fabric_name, sku, 
            value_addition, thread, concept, 
            width, status
        ) VALUES 
        (v_base_id, 'Cotton Embroidery', 'FBF-COT-001', 'Embroidery', 'Cotton', 'Floral', '44"', 'active');
    END IF;
END $$;

-- Task 4: Fix fancy_finish_fabrics table column references
DO $$
DECLARE
    v_finish_id UUID;
BEGIN
    SELECT id INTO v_finish_id FROM finish_fabrics WHERE finish_fabric_sku = 'FF-COT-001' LIMIT 1;

    IF v_finish_id IS NOT NULL THEN
        -- Removed columns that DO NOT exist in fancy_finish_fabrics: 
        -- last_process, process_type, class, tags, finish_type, ink_type
        INSERT INTO fancy_finish_fabrics (
            finish_fabric_id, fancy_finish_name, fancy_finish_sku,
            value_addition_type, thread_type, concept,
            status
        ) VALUES 
        (v_finish_id, 'Cotton Dyed Embroidered', 'FFF-COT-001', 'Embroidery', 'Silk', 'Festive', 'active');
    END IF;
END $$;