import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import axios from 'axios'

// Set base URL for API requests
// In development, this falls back to localhost (or Vite proxy handles it)
// In production, VITE_API_URL must be set (e.g., https://backend-service.onrender.com)
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

import { ToastProvider, useToast } from './components/ui/toast.jsx'

// Global error handler component
function ErrorHandler({ children }) {
    const { addToast } = useToast();

    React.useEffect(() => {
        // Response interceptor to catch all API errors
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                // Extract error message
                const errorMessage = error.response?.data?.error ||
                    error.response?.data?.message ||
                    error.message ||
                    'An unexpected error occurred';

                // Log to console for debugging
                console.error('🔴 API Error:', {
                    url: error.config?.url,
                    method: error.config?.method,
                    status: error.response?.status,
                    message: errorMessage,
                    fullError: error
                });

                // Show error in UI (only if not already handled by component)
                // Components can prevent this by setting skipGlobalErrorHandler: true in config
                if (!error.config?.skipGlobalErrorHandler) {
                    // Don't show errors for 401/403 (auth) - let components handle those
                    if (error.response?.status !== 401 && error.response?.status !== 403) {
                        // Format error message
                        let displayMessage = errorMessage;
                        if (error.response?.status) {
                            displayMessage = `[${error.response.status}] ${errorMessage}`;
                        }
                        addToast(displayMessage, 'error');
                    }
                }

                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, [addToast]);

    return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ToastProvider>
                <ErrorHandler>
                    <App />
                </ErrorHandler>
            </ToastProvider>
        </BrowserRouter>
    </React.StrictMode>,
)
