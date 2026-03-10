const https = require('https');
const data = JSON.stringify({ query: "NOTIFY pgrst, 'reload schema';" });
const options = {
    hostname: 'api.supabase.com',
    path: '/v1/projects/ymmkvryfinvqewodmeuw/database/query',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer sbp_cb0a24fd025dc0eda7e2df84c943fad9c119b7f9',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};
const req = https.request(options, (res) => {
    let resData = '';
    res.on('data', d => resData += d);
    res.on('end', () => console.log('Schema reload:', resData));
});
req.write(data);
req.end();
