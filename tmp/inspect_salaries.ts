
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ymmkvryfinvqewodmeuw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI');

async function run() {
    console.log('--- ETIQUETAS CATEGORIAS ---');
    const { data: labels } = await supabase.from('etiquetas_categorias').select('*');
    console.log(JSON.stringify(labels, null, 2));

    console.log('--- STAFF SALARIES ---');
    const { data: staff } = await supabase.from('staff_salaries_2026').select('*');
    console.log(JSON.stringify(staff, null, 2));

    console.log('--- CONFIG TURNO ---');
    const { data: shifts } = await supabase.from('configuracion_turnos').select('*');
    console.log(JSON.stringify(shifts, null, 2));
}
run().catch(console.error);
