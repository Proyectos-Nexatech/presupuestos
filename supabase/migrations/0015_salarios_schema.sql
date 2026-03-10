-- Tables for Salaries Configuration
CREATE TABLE IF NOT EXISTS salary_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g. 'OP (8H)', 'ADMON (8H)', etc.
    type TEXT NOT NULL, -- 'OP' or 'ADMON'
    shift TEXT NOT NULL, -- '8H', '12H', '24H'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID REFERENCES salary_tables(id) ON DELETE CASCADE,
    item_code TEXT, -- A, B, C...
    description TEXT NOT NULL,
    percentage NUMERIC,
    formula TEXT,
    cat1 NUMERIC DEFAULT 0,
    cat2 NUMERIC DEFAULT 0,
    cat3 NUMERIC DEFAULT 0,
    cat4 NUMERIC DEFAULT 0,
    cat5 NUMERIC DEFAULT 0,
    cat6 NUMERIC DEFAULT 0,
    cat7 NUMERIC DEFAULT 0,
    cat8 NUMERIC DEFAULT 0,
    row_order INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_category_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID REFERENCES salary_tables(id) ON DELETE CASCADE,
    category_number INT NOT NULL, -- 1 to 8
    labels TEXT[] DEFAULT '{}', -- List of positions for this category
    CONSTRAINT valid_cat CHECK (category_number BETWEEN 1 AND 8)
);

-- Enable RLS
ALTER TABLE salary_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_category_labels ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all public for salary_tables" ON salary_tables FOR ALL USING (true);
CREATE POLICY "Allow all public for salary_rows" ON salary_rows FOR ALL USING (true);
CREATE POLICY "Allow all public for salary_category_labels" ON salary_category_labels FOR ALL USING (true);

-- Insert initial tables
INSERT INTO salary_tables (name, type, shift) VALUES 
('TABLA OP (8H)', 'OP', '8H'),
('TABLA ADMON (8H)', 'ADMON', '8H'),
('TABLA OP DIA (12H)', 'OP', '12H'),
('TABLA ADMON DIA (8H)', 'ADMON', '8H'),
('TABLA OP NOCHE (12H)', 'OP', '12H'),
('TABLA ADMON NOCHE (8H)', 'ADMON', '8H'),
('TABLA OP (24H)', 'OP', '24H'),
('TABLA ADMON (24H)', 'ADMON', '24H')
ON CONFLICT (name) DO NOTHING;
