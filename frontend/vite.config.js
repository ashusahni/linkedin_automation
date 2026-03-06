import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [react()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        server: {
            proxy: {
                // Must match backend PORT (commonly 5000 in this repo; override with VITE_API_TARGET)
                '/api': {
                    target: env.VITE_API_TARGET || 'http://localhost:5000',
                    changeOrigin: true,
                    secure: false,
                }
            }
        }
    };
});
