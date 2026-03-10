-- Create certificados_confinados table
CREATE TABLE IF NOT EXISTS certificados_confinados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    tipo_certificado TEXT NOT NULL,
    frecuencia TEXT,
    num_personas_periodo DECIMAL(10,2) DEFAULT 0,
    valor_unitario DECIMAL(12,2) DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE certificados_confinados ENABLE ROW LEVEL SECURITY;

-- Public Access Policies (Matching latest session)
CREATE POLICY "Certificados confinados viewable by everyone" ON certificados_confinados FOR SELECT USING (true);
CREATE POLICY "Certificados confinados insertable by everyone" ON certificados_confinados FOR INSERT WITH CHECK (true);
CREATE POLICY "Certificados confinados editable by everyone" ON certificados_confinados FOR UPDATE USING (true);
CREATE POLICY "Certificados confinados deletable by everyone" ON certificados_confinados FOR DELETE USING (true);

-- Audit trigger (if function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_log_changes') THEN
        CREATE TRIGGER tr_audit_certificados_confinados
        AFTER UPDATE ON certificados_confinados
        FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
    END IF;
END $$;
