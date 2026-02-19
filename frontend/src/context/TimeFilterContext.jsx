import React, { createContext, useContext, useState, useEffect } from 'react';

const TimeFilterContext = createContext();

export const TimeFilterProvider = ({ children }) => {
    // Initialize from localStorage or default to 'monthly'
    const [period, setPeriodState] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('dashboard_period') || 'monthly';
        }
        return 'monthly';
    });

    // Update localStorage when period changes
    useEffect(() => {
        localStorage.setItem('dashboard_period', period);
    }, [period]);

    // Wrapper for setPeriod to potentially add more logic if needed
    const setPeriod = (newPeriod) => {
        setPeriodState(newPeriod);
    };

    return (
        <TimeFilterContext.Provider value={{ period, setPeriod }}>
            {children}
        </TimeFilterContext.Provider>
    );
};

export const useTimeFilter = () => {
    const context = useContext(TimeFilterContext);
    if (!context) {
        throw new Error('useTimeFilter must be used within a TimeFilterProvider');
    }
    return context;
};
