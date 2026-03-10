
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('insumos').select('tipo');
    if (error) {
        console.error(error);
    } else {
        const stats = data.reduce((acc, i) => {
            acc[i.tipo] = (acc[i.tipo] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        console.log('Final counts:', JSON.stringify(stats));
    }
}
run();
