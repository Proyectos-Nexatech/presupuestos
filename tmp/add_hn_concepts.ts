
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const concepts = [
        { codigo: 'HN', nombre: 'HORAS NORMALES', porcentaje: 0, formula: 'Input', grupo: 'Salarial', orden: 16 },
        { codigo: "A''", nombre: 'BASICO DIARIO', porcentaje: 0, formula: "(HN * A') / 8", grupo: 'Salarial', orden: 17 }
    ];

    console.log('Adding concepts HN and A\'\'...');
    const { error } = await supabase.from('maestro_conceptos').upsert(concepts, { onConflict: 'codigo' });

    if (error) {
        console.error('Error adding concepts:', error);
    } else {
        console.log('Concepts HN and A\'\' added successfully');
    }
}

run().catch(console.error);
