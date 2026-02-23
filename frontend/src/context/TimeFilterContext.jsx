import React, { createContext, useContext, useState, useEffect } from 'react';

const TimeFilterContext = createContext();

export const TimeFilterProvider = ({ children }) => {
    const now = new Date();
    
    // Initialize from localStorage or default
    const [period, setPeriodState] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('dashboard_period') || 'monthly';
        }
        return 'monthly';
    });

    const [month, setMonthState] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dashboard_month');
            return saved !== null ? parseInt(saved, 10) : now.getMonth();
        }
        return now.getMonth();
    });

    const [year, setYearState] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dashboard_year');
            return saved !== null ? parseInt(saved, 10) : now.getFullYear();
        }
        return now.getFullYear();
    });

    // Update localStorage when values change
    useEffect(() => {
        localStorage.setItem('dashboard_period', period);
    }, [period]);

    useEffect(() => {
        localStorage.setItem('dashboard_month', month);
    }, [month]);

    useEffect(() => {
        localStorage.setItem('dashboard_year', year);
    }, [year]);

    const setPeriod = (newPeriod) => setPeriodState(newPeriod);
    const setMonth = (newMonth) => setMonthState(newMonth);
    const setYear = (newYear) => setYearState(newYear);

    return (
        <TimeFilterContext.Provider value={{ period, setPeriod, month, setMonth, year, setYear }}>
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
