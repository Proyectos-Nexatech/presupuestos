
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Updating Dotacion (X) master value...');
    const { error } = await supabase
        .from('maestro_conceptos')
        .update({ porcentaje: 25585, formula: 'Input', nombre: 'DOTACION' })
        .eq('codigo', 'X');

    if (error) {
        console.error('Error updating concept X:', error);
    } else {
        console.log('Concept X updated successfully to $25.585');
    }
}

run().catch(console.error);
