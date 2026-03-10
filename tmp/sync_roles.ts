
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ymmkvryfinvqewodmeuw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbWt2cnlmaW52cWV3b2RtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjMyODEsImV4cCI6MjA4ODEzOTI4MX0.xmA-0mdvKwg_zbPxoospUIi_Se8JGPYlE0aqURshWMI');

async function run() {
    console.log('--- FETCHING DATA ---');
    const { data: shifts } = await supabase.from('configuracion_turnos').select('*');
    const { data: labels } = await supabase.from('etiquetas_categorias').select('*');
    const { data: staff } = await supabase.from('staff_salaries_2026').select('*');

    console.log('Shifts:', shifts?.map(s => s.nombre));
    console.log('Labels count:', labels?.length);
    console.log('Staff count:', staff?.length);

    const rolesToAdd: any[] = [];

    // Operative Roles
    labels?.forEach(l => {
        const shift = shifts?.find(s => s.id === l.turno_id);
        if (!shift) return;

        l.labels?.forEach((labelName: string) => {
            if (!labelName) return;
            rolesToAdd.push({
                descripcion: `${labelName.toUpperCase()} ${shift.nombre}`,
                unid: 'DIA',
                turno: shift.nombre,
                tipo: 'PERSONAL',
                grupo: 'MOB',
                cat: l.categoria.toString(),
                factor_eq_ma: 1,
                iva: 0,
                total_horas: 8 // Default
            });
        });
    });

    // Staff Roles
    staff?.forEach(s => {
        const cargos = s.cargo_nombre?.split(',').map((c: string) => c.trim()).filter(Boolean) || [];
        // For staff, we'll use the shifts that are defined? 
        // Typically staff are 8H, but let's see if there are other shifts in staff_matrix_results

        cargos.forEach((cargo: string) => {
            shifts?.forEach((shift: any) => {
                rolesToAdd.push({
                    descripcion: `${cargo.toUpperCase()} ${shift.nombre}`,
                    unid: 'DIA',
                    turno: shift.nombre,
                    tipo: 'STAFF',
                    grupo: 'MOB',
                    cat: s.nivel.toString(),
                    factor_eq_ma: 1,
                    iva: 0,
                    total_horas: 8
                });
            });
        });
    });

    console.log('Proposed roles to add:', rolesToAdd.length);
    if (rolesToAdd.length > 0) {
        console.log('Sample roles:', JSON.stringify(rolesToAdd.slice(0, 5), null, 2));
    }

    // Check existing
    const { data: existing } = await supabase.from('mano_obra').select('descripcion');
    const existingNames = new Set(existing?.map(e => e.descripcion.toUpperCase()) || []);

    const missingRoles = rolesToAdd.filter(r => !existingNames.has(r.descripcion.toUpperCase()));
    console.log('Missing roles:', missingRoles.length);

    if (missingRoles.length > 0) {
        console.log('Inserting missing roles...');
        const { error } = await supabase.from('mano_obra').insert(missingRoles);
        if (error) console.error('Error inserting:', error);
        else console.log('Insert successful!');
    } else {
        console.log('All roles already exist.');
    }

}
run().catch(console.error);
