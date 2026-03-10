import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as math from 'mathjs';

export interface Formula {
    id: string;
    seccion: string;
    variable_nombre: string;
    descripcion: string;
    formula_expresion: string;
    valor_constante: number;
    tipo: 'formula' | 'constante' | 'input';
    dependencias?: string[];
    orden: number;
}

interface FormulaContextType {
    formulas: Formula[];
    getFormula: (variable: string) => Formula | undefined;
    evaluate: (variableName: string, scope: Record<string, any>) => number;
    updateFormula: (id: string, updates: Partial<Formula>) => Promise<void>;
    saveVersion: (nombre: string) => Promise<void>;
    restoreVersion: (id: string) => Promise<void>;
    loading: boolean;
    refresh: () => Promise<void>;
}

const FormulaContext = createContext<FormulaContextType | undefined>(undefined);

export const FormulaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [formulas, setFormulas] = useState<Formula[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFormulas = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('config_formulas')
                .select('*')
                .order('orden', { ascending: true });

            if (error) throw error;
            setFormulas(data || []);
        } catch (err) {
            console.error('Error fetching formulas:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFormulas();
    }, [fetchFormulas]);

    const getFormula = (variable: string) => {
        return formulas.find(f => f.variable_nombre.trim().toUpperCase() === variable.trim().toUpperCase());
    };

    const evaluate = (variableName: string, scope: Record<string, any>): number => {
        const formula = getFormula(variableName);
        if (!formula) return 0;

        if (formula.tipo === 'constante' || formula.tipo === 'input') {
            return formula.valor_constante || 0;
        }

        try {
            // Sanitize expression and scope keys for mathjs (apostrophes not allowed)
            let sanitizedExpr = formula.formula_expresion;
            const sanitizedScope: Record<string, any> = {};

            // Map problematic characters (apostrophe -> _p)
            const sanitize = (name: string) => name.replace(/'/g, '_p');

            // Build a list of all variables that need replacement, sorted by length descending
            // to avoid replacing A' as A + ' if we have A and A'
            const allPossibleVars = new Set([...Object.keys(scope), ...formulas.map(f => f.variable_nombre)]);
            const sortedVars = Array.from(allPossibleVars).sort((a, b) => b.length - a.length);

            sortedVars.forEach(v => {
                const escapedV = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const sanitizedV = sanitize(v);

                // Use regex with word-like boundaries but handling the apostrophe as part of the word
                // Since ' is not a word char, we use a custom boundary check
                const regex = new RegExp(`(?<=[^a-zA-Z0-9_]|^)${escapedV}(?=[^a-zA-Z0-9_']|$)`, 'g');
                sanitizedExpr = sanitizedExpr.replace(regex, sanitizedV);
            });

            // Sanitize the scope keys
            Object.keys(scope).forEach(key => {
                sanitizedScope[sanitize(key)] = scope[key];
            });

            // Handle SUM(X..Y) ranges
            const sumRegex = /SUM\(([A-Z'"]+)\.\.([A-Z'"]+)\)/g;
            sanitizedExpr = sanitizedExpr.replace(sumRegex, (_match, startVar, endVar) => {
                const startFormula = getFormula(startVar);
                const endFormula = getFormula(endVar);

                if (startFormula && endFormula) {
                    const rangeVars = formulas.filter(f =>
                        f.orden >= startFormula.orden &&
                        f.orden <= endFormula.orden &&
                        f.seccion === formula.seccion
                    );

                    let rangeSum = 0;
                    rangeVars.forEach(v => {
                        rangeSum += (scope[v.variable_nombre] || 0);
                    });
                    return rangeSum.toString();
                }
                return "0";
            });

            const result = math.evaluate(sanitizedExpr, sanitizedScope);
            return typeof result === 'number' ? result : 0;
        } catch (err) {
            console.error(`Error evaluating formula ${variableName}:`, err);
            return 0;
        }
    };

    const updateFormula = async (id: string, updates: Partial<Formula>) => {
        try {
            const { error } = await supabase
                .from('config_formulas')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            setFormulas(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
        } catch (err) {
            console.error('Error updating formula:', err);
            alert('Error al actualizar la fórmula.');
        }
    };

    const saveVersion = async (nombre: string) => {
        try {
            const { error } = await supabase
                .from('config_formula_versions')
                .insert({
                    nombre_version: nombre,
                    snapshot: formulas
                });

            if (error) throw error;
            alert('Versión guardada correctamente.');
        } catch (err) {
            console.error('Error saving version:', err);
            alert('Error al guardar la versión.');
        }
    };

    const restoreVersion = async (versionId: string) => {
        try {
            const { data, error } = await supabase
                .from('config_formula_versions')
                .select('snapshot')
                .eq('id', versionId)
                .single();

            if (error) throw error;

            const snapshot = data.snapshot as Formula[];

            // Upsert all formulas from snapshot
            for (const f of snapshot) {
                const { id, ...clean } = f;
                await supabase.from('config_formulas').upsert(clean, { onConflict: 'variable_nombre' });
            }

            await fetchFormulas();
            alert('Versión restaurada correctamente.');
        } catch (err) {
            console.error('Error restoring version:', err);
            alert('Error al restaurar la versión.');
        }
    };

    return (
        <FormulaContext.Provider value={{
            formulas,
            getFormula,
            evaluate,
            updateFormula,
            saveVersion,
            restoreVersion,
            loading,
            refresh: fetchFormulas
        }}>
            {children}
        </FormulaContext.Provider>
    );
};

export const useFormulas = () => {
    const context = useContext(FormulaContext);
    if (!context) {
        throw new Error('useFormulas must be used within a FormulaProvider');
    }
    return context;
};
