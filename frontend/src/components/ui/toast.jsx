import { useState, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-xs pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            className="pointer-events-auto"
                        >
                            <div className={`
                                flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md
                                ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : ''}
                                ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : ''}
                                ${toast.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : ''}
                                ${toast.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-primary' : ''}
                            `}>
                                <div className="flex-shrink-0">
                                    {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                                    {toast.type === 'error' && <XCircle className="w-5 h-5" />}
                                    {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                                    {toast.type === 'info' && <Info className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 text-sm font-medium whitespace-pre-wrap break-words max-w-md">
                                    {toast.message}
                                </div>
                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="p-1 hover:bg-black/10 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
