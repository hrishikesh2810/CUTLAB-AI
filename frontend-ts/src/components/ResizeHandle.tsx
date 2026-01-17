
import React, { useEffect, useState } from 'react';


interface ResizeHandleProps {
    onResize: (width: number) => void;
    minWidth?: number;
    maxWidth?: number;
    initialWidth: number;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
    onResize,
    minWidth = 260,
    maxWidth = 600,
    initialWidth
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(initialWidth);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
            onResize(newWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = 'default';
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, startX, startWidth, onResize, minWidth, maxWidth]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setStartX(e.clientX);
        setStartWidth(initialWidth); // Keep track of width at start of drag
    };

    return (
        <div
            className="resize-handle"
            onMouseDown={handleMouseDown}
            style={{
                width: '12px',
                cursor: 'col-resize',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s',
                zIndex: 10
            }}
        >
            <div style={{
                width: '4px',
                height: '32px',
                borderRadius: '2px',
                background: isDragging ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)',
                transition: 'background 0.2s'
            }} />
        </div>
    );
};
