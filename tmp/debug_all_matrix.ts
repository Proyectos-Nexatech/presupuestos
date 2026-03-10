import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllMatrix() {
    console.log('Checking matriz_costos_calculados (Any)...');
    const { data, error } = await supabase.from('matriz_costos_calculados').select('*').limit(5);
    console.log('Matriz Samples:', data);

    // Search for a specific concept like AB
    const abId = '6b1a98e2-d920-4b4a-b801-6bfb5b5b6260';
    console.log('Checking for AB concept in matriz_costos_calculados...');
    const { data: abData } = await supabase.from('matriz_costos_calculados').select('*').eq('concepto_id', abId).limit(5);
    console.log('AB Data Samples:', abData);
}

checkAllMatrix();
