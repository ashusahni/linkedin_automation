import React, { useRef, useState } from 'react';

/**
 * Aceternity-style Card Spotlight - mouse-follow radial gradient
 */
export function CardSpotlight({ children, color = 'rgba(99,102,241,0.15)', radius = 350, className = '', ...props }) {
    const divRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
        setOpacity(1);
    };

    const handleMouseLeave = () => setOpacity(0);

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 dark:bg-card/90 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5 ${className}`}
            {...props}
        >
            {/* Spotlight gradient */}
            <div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500"
                style={{
                    opacity,
                    background: `radial-gradient(${radius}px circle at ${position.x}px ${position.y}px, ${color}, transparent 80%)`,
                }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    );
}
