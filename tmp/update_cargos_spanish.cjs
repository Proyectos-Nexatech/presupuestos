const fs = require('fs');
const https = require('https');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xevfihybtfclonqisjye.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing VITE_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const sql = `
-- Actualizar valores STAFF -> ADMINISTRATIVO
UPDATE maestro_cargos SET tipo = 'ADMINISTRATIVO' WHERE tipo = 'STAFF';
-- Actualizar valores OP -> OPERATIVO
UPDATE maestro_cargos SET tipo = 'OPERATIVO' WHERE tipo = 'OP';

-- Modificar restricción CHECK
ALTER TABLE maestro_cargos DROP CONSTRAINT IF EXISTS maestro_cargos_tipo_check;
ALTER TABLE maestro_cargos ADD CONSTRAINT maestro_cargos_tipo_check CHECK (tipo IN ('OPERATIVO', 'ADMINISTRATIVO'));
`;

const data = JSON.stringify({ query: sql });

const options = {
    hostname: 'xevfihybtfclonqisjye.supabase.co',
    port: 443,
    path: '/rest/v1/',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'X-Client-Info': 'supabase-js/2.39.7'
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Migración de tipos aplicada exitosamente');
        } else {
            console.error(`Error: ${res.statusCode}`, body);
        }
    });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
