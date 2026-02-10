import React from 'react';

export const ScottishChemicalLogo = ({ className, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="sc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      
      {/* Background shape - Hexagon-like or soft square */}
      <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#sc-gradient)" />
      
      {/* "S" shape */}
      <path
        d="M35 65 C 35 65, 30 65, 30 55 C 30 45, 50 45, 50 35 C 50 25, 40 25, 35 30"
        fill="none"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
      />
      
      {/* "C" shape */}
      <path
        d="M70 30 C 60 20, 45 40, 60 70"
        fill="none"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
      />
      
      {/* Dot for chemistry feel */}
      <circle cx="70" cy="30" r="4" fill="#34d399" />
    </svg>
  );
};

export const ScottishChemicalIcon = ({ className, ...props }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            className={className}
            fill="none"
            {...props}
        >
            {/* Blue Swoosh */}
            <path
                d="M15 45 C 15 15, 85 15, 85 45 C 85 75, 15 75, 15 45"
                stroke="#1e4da1"
                strokeWidth="12"
                strokeLinecap="round"
                transform="rotate(-20 50 50)"
            />
            {/* Gray Swoosh */}
            <path
                d="M25 55 C 25 25, 95 25, 95 55 C 95 85, 25 85, 25 55"
                stroke="#94a3b8"
                strokeWidth="8"
                strokeLinecap="round"
                transform="rotate(-20 50 50)"
                opacity="0.8"
            />
        </svg>
    )
}
