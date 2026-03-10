import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMatrices() {
    console.log('Checking matriz_costos_calculados (STAFF)...');
    const { data: opMtx, error: opErr } = await supabase.from('matriz_costos_calculados').select('*').eq('tipo_persona', 'STAFF').limit(5);
    console.log('Matriz Costos STAFF Samples:', opMtx);

    console.log('Checking staff_matrix_results (all)...');
    const { data: stMtx, error: stErr } = await supabase.from('staff_matrix_results').select('*').limit(5);
    console.log('Staff Matrix Results Samples:', stMtx);
}

checkMatrices();
