-- Create certificacion_alturas table
CREATE TABLE IF NOT EXISTS certificacion_alturas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    tipo_certificacion TEXT NOT NULL,
    frecuencia TEXT,
    num_personas_periodo DECIMAL(10,2) DEFAULT 0,
    valor_unitario DECIMAL(12,2) DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE certificacion_alturas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Certificaciones viewable by everyone"
    ON certificacion_alturas FOR SELECT
    USING (true);

CREATE POLICY "Certificaciones insertable by everyone"
    ON certificacion_alturas FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Certificaciones editable by everyone"
    ON certificacion_alturas FOR UPDATE
    USING (true);

CREATE POLICY "Certificaciones deletable by everyone"
    ON certificacion_alturas FOR DELETE
    USING (true);

-- Audit trigger (if function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_audit_log') THEN
        CREATE TRIGGER audit_certificacion_alturas
        AFTER INSERT OR UPDATE OR DELETE ON certificacion_alturas
        FOR EACH ROW EXECUTE FUNCTION handle_audit_log();
    END IF;
END $$;
