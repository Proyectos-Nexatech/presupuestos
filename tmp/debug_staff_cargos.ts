import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCargos() {
    console.log('Checking Mano de Obra for Staff cargos...');
    const { data, error } = await supabase.from('mano_obra').select('*').eq('tipo', 'STAFF').limit(5);
    console.log('Staff Cargos in Mano de Obra:', JSON.stringify(data, null, 2));

    console.log('Checking staff_salaries_2026...');
    const { data: salaries } = await supabase.from('staff_salaries_2026').select('*');
    console.log('Staff Salaries:', JSON.stringify(salaries, null, 2));
}

checkCargos();
