
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: trans, error } = await supabase.from('insumos').select('descripcion, tipo').eq('tipo', 'TRANSPORTE');
    const { data: mats, error: me } = await supabase.from('insumos').select('descripcion, tipo').ilike('descripcion', '%TRANSPORTE%').limit(20);
    const { data: seg, error: se } = await supabase.from('insumos').select('descripcion, tipo').eq('tipo', 'SEGUROS Y OTROS');

    console.log('Transporte rows in DB:', trans);
    console.log('Descriptions containing "TRANSPORTE" in MATERIALS:', mats);
    console.log('Seguros rows in DB:', seg);
}
run();
