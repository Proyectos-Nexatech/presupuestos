const fs = require('fs');
const https = require('https');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xevfihybtfclonqisjye.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing VITE_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const sql = `
-- Convert staff_salaries_2026.cargo_nombre to TEXT[]
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff_salaries_2026' AND column_name = 'cargo_nombre' AND data_type = 'text'
    ) THEN
        -- First rename old column
        ALTER TABLE staff_salaries_2026 RENAME COLUMN cargo_nombre TO cargo_nombre_old;
        -- Add new array column
        ALTER TABLE staff_salaries_2026 ADD COLUMN cargo_nombre TEXT[] DEFAULT '{}';
        -- Migrate data (convert string to array)
        UPDATE staff_salaries_2026 SET cargo_nombre = ARRAY[cargo_nombre_old] WHERE cargo_nombre_old IS NOT NULL AND cargo_nombre_old != '';
        -- Drop old column
        ALTER TABLE staff_salaries_2026 DROP COLUMN cargo_nombre_old;
    END IF;
END $$;
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
            console.log('Migration to TEXT[] successful');
        } else {
            console.error(`Error: ${res.statusCode}`, body);
        }
    });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
