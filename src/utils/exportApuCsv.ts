import { supabase } from '../lib/supabase';

const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function escapeCell(v: string | number) {
    const s = String(v ?? '');
    // Wrap in quotes if it contains semicolons, quotes, or newlines
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function buildCsvRow(cells: (string | number)[]) {
    return cells.map(escapeCell).join(';');
}

export async function exportAllApusToCsv() {
    // 1. Fetch all data in parallel
    const [activitiesRes, apusRes, itemsRes] = await Promise.all([
        supabase.from('cuadro_economico').select('id, item, descripcion, unidad').order('created_at', { ascending: true }),
        supabase.from('apus').select('id, cuadro_economico_id, rendimiento, turno_factor, horas_diarias, unidad'),
        supabase.from('apu_items').select('apu_id, tipo, descripcion, unidad, cantidad, precio_unitario, rendimiento_item')
    ]);

    if (activitiesRes.error) throw activitiesRes.error;
    if (apusRes.error) throw apusRes.error;
    if (itemsRes.error) throw itemsRes.error;

    const activities = activitiesRes.data || [];
    const apus = apusRes.data || [];
    const allItems = itemsRes.data || [];

    // Quick lookup maps
    const apuByActivity = new Map(apus.map(a => [a.cuadro_economico_id, a]));
    const itemsByApu = new Map<string, typeof allItems>();
    for (const item of allItems) {
        const list = itemsByApu.get(item.apu_id) || [];
        list.push(item);
        itemsByApu.set(item.apu_id, list);
    }

    // 2. Build CSV rows
    const CATEGORY_LABELS: Record<string, string> = {
        PERSONAL: 'Mano de Obra',
        MATERIALES: 'Materiales',
        EQUIPOS: 'Equipos',
        HERRAMIENTAS: 'Herramientas',
        TRANSPORTE: 'Transportes',
        'SEGUROS Y OTROS': 'Seguros y Otros',
    };

    const TYPE_ORDER = ['PERSONAL', 'MATERIALES', 'EQUIPOS', 'HERRAMIENTAS', 'TRANSPORTE', 'SEGUROS Y OTROS'];

    const header = buildCsvRow([
        'ITEM', 'ACTIVIDAD', 'UNID. ACT.',
        'CATEGORÍA', 'DESCRIPCIÓN INSUMO', 'UNIDAD',
        'CANT / REND', 'PRECIO UNITARIO (COP)', 'SUBTOTAL (COP)'
    ]);

    const rows: string[] = [header];

    for (const act of activities) {
        const apu = apuByActivity.get(act.id);
        if (!apu) continue; // Skip activities without APU

        const apuItems = itemsByApu.get(apu.id) || [];
        if (apuItems.length === 0) continue;

        // Sort items by category order
        const sorted = [...apuItems].sort((a, b) => {
            return TYPE_ORDER.indexOf(a.tipo) - TYPE_ORDER.indexOf(b.tipo);
        });

        let totalSuministro = 0;
        let totalMontaje = 0;

        for (const item of sorted) {
            const qty = Number(item.cantidad) || 0;
            const price = Number(item.precio_unitario) || 0;
            const rend = Number(item.rendimiento_item) || 1;

            const isLabor = item.tipo === 'PERSONAL';
            const isSimple = item.tipo === 'MATERIALES';

            const subtotal = isSimple
                ? qty * price
                : (qty * price) / rend;

            if (isLabor) {
                totalMontaje += subtotal;
            } else {
                totalSuministro += subtotal;
            }

            const cantRend = isSimple
                ? `e=${qty}`
                : `a=${qty} / c=${rend}`;

            rows.push(buildCsvRow([
                act.item,
                act.descripcion,
                act.unidad || apu.unidad || '',
                CATEGORY_LABELS[item.tipo] || item.tipo,
                item.descripcion,
                item.unidad || '',
                cantRend,
                fmt(price),
                fmt(subtotal)
            ]));
        }

        // Insert TOTAL UNITARIO row per activity
        const montajeWithFactor = totalMontaje * (Number(apu.turno_factor) || 1);
        const totalUnitario = totalSuministro + montajeWithFactor;

        rows.push(buildCsvRow([
            act.item,
            act.descripcion,
            act.unidad || apu.unidad || '',
            '',
            'TOTAL UNITARIO',
            '',
            '',
            '',
            fmt(totalUnitario)
        ]));

        rows.push(''); // blank separator between activities
    }

    // 3. Build file and trigger download
    const today = new Date().toISOString().slice(0, 10);
    const filename = `APU_Global_${today}.csv`;

    // UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csvContent = BOM + rows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
