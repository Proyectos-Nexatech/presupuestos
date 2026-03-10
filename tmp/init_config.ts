
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Creating configuracion_general table and inserting factor_lluvia...');

    // Check if table exists by trying to select from it
    const { error: checkError } = await supabase.from('configuracion_general').select('id').limit(1);

    if (checkError && checkError.code === 'PGRST116' || checkError && checkError.message.includes('relation "public.configuracion_general" does not exist')) {
        console.log('Table does not exist. Please run migration via Supabase Dashboard if possible, or I will try to use RPC if available.');
        // Since I cannot run DDL easily without a proper tool, I will just use a fallback in the code 
        // OR try to create it if I have a custom function. 
        // Actually, I should probably check if I can just add it to 'maestro_conceptos' or another table.
        // But the user wants it specifically for 'Mano de Obra'.

        // Let's try to see if there is any 'configuracion' table in the migrations again.
    } else {
        const { error } = await supabase.from('configuracion_general').upsert([
            { clave: 'factor_lluvia', valor: 0, descripcion: 'Factor de lluvia para mano de obra (%)' }
        ], { onConflict: 'clave' });

        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Factor lluvia initialized.');
        }
    }
}
run();
