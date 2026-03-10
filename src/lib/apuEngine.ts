export interface APUItem {
    id: string;
    tipo: string; // PERSONAL, MATERIALES, EQUIPOS, HERRAMIENTAS, TRANSPORTE, SEGUROS Y OTROS
    descripcion: string;
    unidad: string;
    cantidad: number;
    precio_unitario: number;
}

export interface APUConfig {
    rendimiento: number;
    turnoFactor: number; // e.g., 1.0 for 8H, 3.0 for 24H
}

export const calculateSuministro = (items: APUItem[]) => {
    // Suministro incluye todo excepto Mano de Obra (PERSONAL)
    return items
        .filter(item => item.tipo !== 'PERSONAL')
        .reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
};

export const calculateMontaje = (items: APUItem[], config: APUConfig) => {
    const manoObraTotal = items
        .filter(item => item.tipo === 'PERSONAL')
        .reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

    // Montaje = (Mano de Obra x Turno) / Rendimiento
    // Si rendimiento es 0, evitamos división por cero
    if (config.rendimiento <= 0) return 0;
    return (manoObraTotal * config.turnoFactor) / config.rendimiento;
};

export const calculatePrecioUnitario = (suministro: number, montaje: number) => {
    return suministro + montaje;
};
