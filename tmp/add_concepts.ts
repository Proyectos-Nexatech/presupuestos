
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ymmkvryfinvqewodmeuw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI');

async function run() {
    const concepts = [
        { codigo: 'X', nombre: 'DOT. IMPLE. SEGUR. + ARNES', porcentaje: 0, formula: 'VR. ACTUAL/90 DIAS', grupo: 'Otros', orden: 400 },
        { codigo: 'U', 'nombre': 'HIELO, AGUA', porcentaje: 0, formula: 'Input', grupo: 'Otros', orden: 410 },
        { codigo: 'S', 'nombre': 'SUBSIDIO ALIMENTACION', porcentaje: 0, formula: 'Input', grupo: 'Otros', orden: 420 },
        { codigo: 'T', 'nombre': 'EXAMENES DE INGRESO', porcentaje: 0, formula: 'Input', grupo: 'Otros', orden: 430 }
    ];

    const { error } = await supabase.from('maestro_conceptos').upsert(concepts, { onConflict: 'codigo' });
    if (error) console.error('Error:', error);
    else console.log('Concepts X, U, S, T added successfully');
} run().catch(console.error);
