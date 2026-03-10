import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ymmkvryfinvqewodmeuw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMaestroCargos() {
    const { data, error } = await supabase.from('maestro_cargos').select('tipo, nombre_cargo, nivel');
    if (error) {
        console.error(error);
        return;
    }
    const ops = data.filter(c => c.tipo === 'OPERATIVO' || c.tipo === 'OP');
    const staff = data.filter(c => c.tipo === 'ADMINISTRATIVO' || c.tipo === 'STAFF');
    console.log('Operativos found:', ops.length);
    console.log('Administrativos found:', staff.length);
    console.log('Sample data:', data.slice(0, 5));
}

checkMaestroCargos();
