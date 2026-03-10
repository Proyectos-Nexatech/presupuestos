import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
        >
            <div
                className="glass"
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    backgroundColor: 'hsl(var(--background))',
                    padding: '1.5rem',
                    position: 'relative',
                    animation: 'modalEnter 0.2s ease-out'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{title}</h2>
                    <button onClick={onClose} style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <X size={20} />
                    </button>
                </div>
                <div>
                    {children}
                </div>
            </div>
            <style>{`
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </div>
    );
};
