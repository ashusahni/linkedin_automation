# Deployment Guide

This project is configured for deployment on **Render** (all-in-one via `render.yaml`) or a mix of **Vercel** (Frontend) and **Render** (Backend).

## Option 1: Full Deployment on Render (Recommended)

Render offers a free tier for both web services and static sites.

1.  **Create a New Blueprint**:
    -   Go to your Render Dashboard.
    -   Click "New" -> "Blueprint".
    -   Connect your GitHub repository.
    -   Render will detect `render.yaml` automatically.

2.  **Configuration**:
    -   The `render.yaml` defines two services:
        -   `linkedin-automation-backend`: Docker-based Node.js app.
        -   `linkedin-automation-frontend`: Static React site.
    -   **Environment Variables**: Render will prompt you for these keys (add values from your `.env`):
        -   `DATABASE_URL` (PostgreSQL connection string)
        -   `OPENAI_API_KEY`
        -   `PHANTOMBUSTER_API_KEY`
        -   ... and other Phantom IDs.
    -   **Note**: The frontend will automatically get the `VITE_API_URL` pointing to the backend service.

3.  **Deploy**:
    -   Click "Apply Blueprint".
    -   Render will build and deploy both services.

## Option 2: Frontend on Vercel, Backend on Render

Vercel is optimized for frontend performance.

### 1. Backend (Render)
Follow steps in Option 1, but you can delete the frontend service from `render.yaml` or just ignore it. Alternatively, deploy just the backend as a "Web Service" manually:
-   **Runtime**: Docker
-   **Root Directory**: `backend`
-   **Build Command**: (Docker default)
-   **Start Command**: (Docker default)

### 2. Frontend (Vercel)
1.  **Import Project**:
    -   Go to Vercel Dashboard -> "Add New..." -> "Project".
    -   Import your Git repository.

2.  **Configure Project**:
    -   **Framework Preset**: Select "Vite".
    -   **Root Directory**: Click "Edit" and select `frontend`.
    -   **Environment Variables**:
        -   Add `VITE_API_URL` -> Value: Your Render Backend URL (e.g., `https://linkedin-automation-backend.onrender.com`).

3.  **Deploy**:
    -   Click "Deploy".

## Cleanup Performed

The following unnecessary files were removed to prepare for deployment:
-   **Logs**: `backend/*.log`, `backend/*.txt` (debug logs).
-   **Scripts**: `reset_status.js`, `backend/debug_env.js`.
-   **Temp Files**: `backend/reset_workflow.bat`.

## Troubleshooting

-   **Backend Health**: Check the Logs tab in Render. If it crashes, verify `DATABASE_URL` is correct and accessible from the internet (Render supports managed Postgres).
-   **Frontend API Errors**: Ensure `VITE_API_URL` does NOT end with a slash `/` (e.g., `https://api.example.com`).
