
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ymmkvryfinvqewodmeuw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI');
async function run() {
    const { data: matrix } = await supabase.from('matriz_costos_calculados').select('*');
    const { data: shifts } = await supabase.from('configuracion_turnos').select('*');
    const { data: concepts } = await supabase.from('maestro_conceptos').select('*');

    console.log('--- SHIFTS ---');
    shifts?.forEach(s => console.log(`${s.nombre} (${s.id})`));

    console.log('--- CONCEPTS ---');
    concepts?.forEach(c => console.log(`${c.codigo} (${c.id})`));

    console.log('--- MATRIX SAMPLE (Cat 1, AA) ---');
    const aaId = concepts?.find(c => c.codigo === 'AA')?.id;
    matrix?.filter(m => m.categoria === 1 && m.concepto_id === aaId).forEach(m => {
        const sName = shifts?.find(s => s.id === m.turno_id)?.nombre;
        console.log(`Shift: ${sName}, Value: ${m.valor_final}`);
    });
} run().catch(console.error);
