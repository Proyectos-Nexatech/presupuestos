
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: m, error: me } = await supabase.from('insumos').select('descripcion, tipo').eq('tipo', 'MATERIALES').limit(10);
    const { data: o, error: oe } = await supabase.from('insumos').select('descripcion, tipo').neq('tipo', 'MATERIALES').neq('tipo', 'EQUIPOS').limit(10);

    console.log('Sample Materials:', m);
    console.log('Other weird rows:', o);
}
run();
