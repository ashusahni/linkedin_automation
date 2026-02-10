# Deployment Guide

You have chosen a hybrid deployment: **Frontend on Vercel** and **Backend on Render**.

## 1. Backend Deployment (Render)

The `render.yaml` file has been updated to use a **Root Context** build strategy (`dockerContext: .`) with a dedicated `backend/render.Dockerfile`. This ensures Render can always locate your project files.

1.  **Push Code**: Commit and push the new `render.Dockerfile` and updated `render.yaml`.
2.  **Create Blueprint**:
    -   Go to [Render Dashboard](https://dashboard.render.com).
    -   Click **New +** -> **Blueprint**.
    -   Connect your repository.
    -   Render will detect the `linkedin-automation-backend` service.
3.  **Configure Environment Variables**:
    Render will ask for these values during setup (since they are marked `sync: false`):
    -   `PHANTOMBUSTER_API_KEY`
    -   `OPENAI_API_KEY`
    -   ... and your Phantom IDs.

    **Note:** You do **NOT** need to provide `DATABASE_URL` manually anymore. The blueprint now includes a managed PostgreSQL database (`linkedin-db`) and automatically links it to your backend.

    *Warning: Render's Free Tier PostgreSQL expires after 90 days. For long-term production use, you may need to upgrade to a paid instance ($7/month).*

4.  **Deploy**: Click **Apply**. Wait for the build to finish.
5.  **Get Backend URL**: Once deployed, copy the service URL (e.g., `https://linkedin-automation-backend.onrender.com`).

## 2. Frontend Configuration (Vercel)

Since you already deployed the frontend, you just need to connect it to your new backend.

1.  Go to your Project Settings on Vercel.
2.  Navigate to **Environment Variables**.
3.  Add a new variable:
    -   **Key**: `VITE_API_URL`
    -   **Value**: Your Render Backend URL (from Step 1). **Do not include a trailing slash** (e.g., `https://linkedin-automation-backend.onrender.com`).
4.  **Redeploy**: Go to the "Deployments" tab and redeploy the latest commit (or push a new commit) for the environment variable to take effect.

## Troubleshooting

-   **CORS Errors**: The backend is configured to allow all origins (`cors()`). If you see CORS errors in the browser console, check if the Backend URL in Vercel is correct.
-   **Database**: Ensure your Render backend can connect to the database. If using Render Postgres, use the *Internal* URL for faster/cheaper connections within Render.

