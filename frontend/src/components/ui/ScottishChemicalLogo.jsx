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
            viewBox="0 0 40 40"
            className={className}
            fill="none"
            {...props}
        >
             <circle cx="20" cy="20" r="20" fill="url(#sc-gradient-icon)" />
             <defs>
                <linearGradient id="sc-gradient-icon" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
            </defs>
            <path 
                d="M12 26C12 26 10 26 10 22C10 18 18 18 18 14C18 10 14 10 12 12M28 12C24 8 18 16 24 28" 
                stroke="white" 
                strokeWidth="3" 
                strokeLinecap="round" 
            />
            <circle cx="28" cy="12" r="2" fill="#34d399" />
        </svg>
    )
}
