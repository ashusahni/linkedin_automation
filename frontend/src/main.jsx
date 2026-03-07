import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import axios from 'axios'

// Set base URL for API requests
// In development, this falls back to localhost (match backend PORT; backend default is 3000)
// Set VITE_API_URL to override (e.g. http://localhost:5000 if backend runs on 5000)
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

import { ToastProvider, useToast } from './components/ui/toast.jsx'

// Global error handler component
function ErrorHandler({ children }) {
    const { addToast } = useToast();

    React.useEffect(() => {
        // Response interceptor to catch all API errors
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                // Do not show toast or log for canceled/aborted requests (e.g. AbortController, nav away)
                const isCanceled =
                    axios.isCancel(error) ||
                    error?.name === 'AbortError' ||
                    error?.code === 'ERR_CANCELED' ||
                    (error?.message && String(error.message).toLowerCase() === 'canceled');
                if (isCanceled) {
                    return Promise.reject(error);
                }

                // Extract error message
                const errorMessage = error.response?.data?.error ||
                    error.response?.data?.message ||
                    error.message ||
                    'An unexpected error occurred';

                const isNetworkUnreachable =
                    error.code === 'ERR_NETWORK' ||
                    (error.request && error.request.status === 0) ||
                    error.message === 'Network Error';

                // Log to console only when not skipped (e.g. notification poll uses skipGlobalErrorHandler to avoid noise)
                if (!error.config?.skipGlobalErrorHandler) {
                    if (isNetworkUnreachable) {
                        const base = error.config?.baseURL || 'backend';
                        console.error('🔴 API Error: Cannot reach server. Is it running?', base);
                    } else {
                        console.error('🔴 API Error:', {
                            url: error.config?.url,
                            method: error.config?.method,
                            status: error.response?.status,
                            message: errorMessage,
                            fullError: error
                        });
                    }
                }

                // Show error in UI (only if not already handled by component)
                if (!error.config?.skipGlobalErrorHandler) {
                    // Don't show errors for 401/403 (auth) - let components handle those
                    if (error.response?.status !== 401 && error.response?.status !== 403) {
                        // For network errors, show a single friendly message (pages like Dashboard may show their own)
                        const displayMessage = isNetworkUnreachable
                            ? `Cannot reach server. Make sure the backend is running (${error.config?.baseURL || 'check port'}).`
                            : (error.response?.status && !error.response?.data?.helpUrl
                                ? `[${error.response.status}] ${errorMessage}`
                                : errorMessage);
                        const helpUrl = error.response?.data?.helpUrl;
                        addToast(displayMessage, 'error', helpUrl ? { helpUrl } : {});
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
