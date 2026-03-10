
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: t, error } = await supabase.from('insumos').select('id, tipo, descripcion').ilike('tipo', 'T%').limit(10);
    const { data: s, error: se } = await supabase.from('insumos').select('id, tipo, descripcion').ilike('tipo', 'S%').limit(10);
    const { data: m, error: me } = await supabase.from('insumos').select('id, tipo').eq('tipo', 'MATERIALES').limit(1);

    console.log('Types starting with T:', t);
    console.log('Types starting with S:', s);
}
run();
