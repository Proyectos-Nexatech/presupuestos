import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStaffMatrix() {
    console.log('Checking staff_matrix_results...');
    const { data: staffMtx, error: mtxErr } = await supabase.from('staff_matrix_results').select('*').limit(10);
    if (mtxErr) {
        console.error('Error fetching staff_matrix_results:', mtxErr);
    } else {
        console.log('Staff Matrix Samples:', JSON.stringify(staffMtx, null, 2));
    }

    const { data: concepts, error: conceptsErr } = await supabase.from('maestro_conceptos').select('*');
    if (conceptsErr) {
        console.error('Error fetching maestro_conceptos:', conceptsErr);
    } else {
        const ab = concepts.find(c => c.codigo.trim().toUpperCase() === 'AB');
        const ac = concepts.find(c => c.codigo.trim().toUpperCase() === 'AC');
        console.log('Concept AB:', ab);
        console.log('Concept AC:', ac);
    }

    const { data: shifts, error: shiftsErr } = await supabase.from('configuracion_turnos').select('*');
    if (shiftsErr) {
        console.error('Error fetching configuracion_turnos:', shiftsErr);
    } else {
        console.log('Shifts:', shifts.map(s => ({ id: s.id, nombre: s.nombre })));
    }
}

checkStaffMatrix();
