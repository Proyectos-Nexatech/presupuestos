
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ymmkvryfinvqewodmeuw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI');
async function run() {
    const { data: concepts } = await supabase.from('maestro_conceptos').select('codigo, nombre, orden').order('orden', { ascending: true });
    console.log('Concepts:', JSON.stringify(concepts, null, 2));
} run().catch(console.error);
