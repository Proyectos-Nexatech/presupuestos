
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: q1, error } = await supabase.from('insumos').select('id, tipo, descripcion').ilike('descripcion', '%FLETE%').limit(5);
    const { data: q2, error: e2 } = await supabase.from('insumos').select('id, tipo, descripcion').ilike('descripcion', '%CARGUE%').limit(5);
    const { data: q3, error: e3 } = await supabase.from('insumos').select('id, tipo, descripcion').ilike('descripcion', '%VIATICOS%').limit(5);

    console.log('Fletes found:', q1);
    console.log('Cargues found:', q2);
    console.log('Viaticos found:', q3);
}
run();
