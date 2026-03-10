import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
    header: string;
    accessor: keyof T | string | ((item: T) => React.ReactNode);
    render?: (item: T) => React.ReactNode;
    width?: string;
    noPrint?: boolean;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    onEdit?: (item: T) => void;
    onDelete?: (item: T) => void;
    footer?: React.ReactNode;
    pagination?: boolean;
    enableFilters?: boolean;
    filterValues?: Record<string, string>;
    onFilterChange?: (accessor: string, value: string) => void;
}

export function DataTable<T extends { id: string | number }>({
    columns,
    data,
    onEdit,
    onDelete,
    footer,
    pagination = false,
    enableFilters = false,
    filterValues = {},
    onFilterChange
}: DataTableProps<T>) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (column: Column<T>) => {
        if (typeof column.accessor === 'function') return; // Cannot sort by function accessor for now

        const accessorStr = String(column.accessor);
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === accessorStr && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key: accessorStr, direction });
    };

    const sortedData = useMemo(() => {
        if (!sortConfig) return data;

        const sorted = [...data].sort((a, b) => {
            const getVal = (item: any, key: string) => {
                return item[key];
            };

            const aVal = getVal(a, sortConfig.key);
            const bVal = getVal(b, sortConfig.key);

            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortConfig.direction === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            return sortConfig.direction === 'asc'
                ? (Number(aVal) > Number(bVal) ? 1 : -1)
                : (Number(aVal) < Number(bVal) ? 1 : -1);
        });
        return sorted;
    }, [data, sortConfig]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const displayData = useMemo(() => {
        if (!pagination) return sortedData;
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, pagination, currentPage, pageSize]);

    return (
        <div className="glass" style={{ overflowX: 'auto', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        {columns.map((col, i) => (
                            <th
                                key={i}
                                className={col.noPrint ? 'no-print' : ''}
                                style={{
                                    padding: '0.75rem 0.5rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'hsl(var(--muted-foreground))',
                                    width: col.width,
                                    whiteSpace: 'nowrap',
                                    borderBottom: '1px solid hsl(var(--border))'
                                }}
                            >
                                <div
                                    onClick={() => handleSort(col)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        cursor: typeof col.accessor === 'function' ? 'default' : 'pointer',
                                        userSelect: 'none',
                                        marginBottom: enableFilters ? '0.5rem' : '0'
                                    }}
                                >
                                    {col.header}
                                    {sortConfig?.key === String(col.accessor) && (
                                        <span style={{ fontSize: '0.7rem' }}>
                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                                {enableFilters && onFilterChange && typeof col.accessor !== 'function' && (
                                    <div className="no-print">
                                        <input
                                            type="text"
                                            value={filterValues[String(col.accessor)] || ''}
                                            onChange={(e) => onFilterChange(String(col.accessor), e.target.value)}
                                            placeholder={`Filtrar...`}
                                            style={{
                                                width: '100%',
                                                backgroundColor: 'rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '4px',
                                                padding: '0.2rem 0.4rem',
                                                fontSize: '0.7rem',
                                                color: 'white',
                                                outline: 'none'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                            </th>
                        ))}
                        {(onEdit || onDelete) && (
                            <th className="no-print" style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid hsl(var(--border))' }}>
                                Acciones
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {displayData.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                                No se encontraron registros.
                            </td>
                        </tr>
                    ) : (
                        displayData.map((item, rowIdx) => (
                            <tr
                                key={item.id}
                                style={{
                                    borderBottom: rowIdx === displayData.length - 1 && !footer ? 'none' : '1px solid hsl(var(--border))',
                                    transition: 'background-color 0.2s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                                {columns.map((col, colIdx) => (
                                    <td key={colIdx} className={col.noPrint ? 'no-print' : ''} style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>
                                        {col.render
                                            ? col.render(item)
                                            : typeof col.accessor === 'function'
                                                ? col.accessor(item)
                                                : (item as any)[col.accessor] as React.ReactNode}
                                    </td>
                                ))}
                                {(onEdit || onDelete) && (
                                    <td className="no-print" style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            {onEdit && (
                                                <button
                                                    onClick={() => onEdit(item)}
                                                    style={{ color: 'hsl(var(--primary))', fontSize: '0.75rem', fontWeight: 500 }}
                                                >
                                                    Editar
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={() => onDelete(item)}
                                                    style={{ color: 'hsl(var(--destructive))', fontSize: '0.75rem', fontWeight: 500 }}
                                                >
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
                {footer && (
                    <tfoot style={{ borderTop: '2px solid hsl(var(--border))', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                        {footer}
                    </tfoot>
                )}
            </table>

            {pagination && data.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid hsl(var(--border))', backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                            Mostrar:
                        </span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '4px',
                                padding: '0.25rem 0.5rem',
                                outline: 'none',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            <option value={10} style={{ color: 'black' }}>10</option>
                            <option value={50} style={{ color: 'black' }}>50</option>
                            <option value={100} style={{ color: 'black' }}>100</option>
                        </select>
                        <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                            registros
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                            Página {currentPage} de {totalPages || 1} ({data.length} total)
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.25rem',
                                    borderRadius: '4px',
                                    backgroundColor: currentPage === 1 ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                                    color: currentPage === 1 ? 'hsl(var(--muted-foreground))' : 'white',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    border: '1px solid hsl(var(--border))'
                                }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.25rem',
                                    borderRadius: '4px',
                                    backgroundColor: currentPage === totalPages || totalPages === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                                    color: currentPage === totalPages || totalPages === 0 ? 'hsl(var(--muted-foreground))' : 'white',
                                    cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                                    border: '1px solid hsl(var(--border))'
                                }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
