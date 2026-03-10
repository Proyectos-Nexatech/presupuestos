
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Inserting concept PM (PRIMA MENSUAL)...');
    const { error } = await supabase.from('maestro_conceptos').upsert([
        { codigo: 'PM', nombre: 'PRIMA MENSUAL', porcentaje: 0, formula: 'Input', grupo: 'Salarial', orden: 12 }
    ], { onConflict: 'codigo' });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Concept PM added successfully.');
    }
}
run();
