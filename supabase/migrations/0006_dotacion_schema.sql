-- Create dotacion table
CREATE TABLE IF NOT EXISTS dotacion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    descripcion TEXT NOT NULL,
    cant_proy DECIMAL(10,2) DEFAULT 1,
    duracion_dias INTEGER DEFAULT 30,
    valor_unitario DECIMAL(12,2) DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE dotacion ENABLE ROW LEVEL SECURITY;

-- Public Access Policies
CREATE POLICY "Dotacion viewable by everyone" ON dotacion FOR SELECT USING (true);
CREATE POLICY "Dotacion insertable by everyone" ON dotacion FOR INSERT WITH CHECK (true);
CREATE POLICY "Dotacion editable by everyone" ON dotacion FOR UPDATE USING (true);
CREATE POLICY "Dotacion deletable by everyone" ON dotacion FOR DELETE USING (true);

-- Audit trigger (if function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_log_changes') THEN
        CREATE TRIGGER tr_audit_dotacion
        AFTER UPDATE ON dotacion
        FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
    END IF;
END $$;
