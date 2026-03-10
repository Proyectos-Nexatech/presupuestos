import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCount() {
    const { count: opCount } = await supabase.from('matriz_costos_calculados').select('*', { count: 'exact', head: true });
    const { count: stCount } = await supabase.from('staff_matrix_results').select('*', { count: 'exact', head: true });

    console.log('Total OP Matrix Records:', opCount);
    console.log('Total STAFF Matrix Records:', stCount);
}

checkCount();
