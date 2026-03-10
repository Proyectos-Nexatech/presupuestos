const fs = require('fs');
const https = require('https');

const files = [
    "supabase/migrations/0026_maestro_cargos.sql"
];

const token = "sbp_cb0a24fd025dc0eda7e2df84c943fad9c119b7f9";

function runQuery(filePath) {
    return new Promise((resolve, reject) => {
        const sql = fs.readFileSync(filePath, 'utf8');
        const data = JSON.stringify({ query: sql });

        const options = {
            hostname: 'api.supabase.com',
            path: '/v1/projects/ymmkvryfinvqewodmeuw/database/query',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let resData = '';
            res.on('data', d => resData += d);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`Success ${filePath}`);
                    resolve(resData);
                } else {
                    console.log(`Error ${filePath}: ${resData}`);
                    resolve(resData);
                }
            });
        });

        req.on('error', e => reject(e));
        req.write(data);
        req.end();
    });
}

async function main() {
    for (const file of files) {
        await runQuery(file);
    }
}
main();
