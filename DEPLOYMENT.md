# 🚀 Cloud Deployment Guide — CloudGPT AI Platform

This guide explains how to deploy **CloudGPT** to the cloud so anyone on the internet can access your ChatGPT-style assistant without running Python, needing a GPU, or keeping a local machine turned on.

---

## 🏗️ Architecture Overview
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS $\to$ Deployed to **Vercel** (Free Tier).
- **Backend**: FastAPI + Uvicorn + Python 3.11/3.14 $\to$ Deployed to **Render** or **Railway** (Free/Starter Tier).
- **Database**: Managed PostgreSQL $\to$ Hosted on **Neon.tech** or **Supabase** (Free Tier).
- **LLM Inference**: Hosted API Endpoint $\to$ **Groq** (Free, 500+ tokens/sec) or **OpenRouter**.

---

## Step 1: Deploy Database (PostgreSQL)

You can get a free, high-performance serverless PostgreSQL database in 1 minute:
1. Go to [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Create a new project (e.g. `cloudgpt-db`).
3. Copy your connection string:
   ```text
   postgresql://username:password@ep-cool-server.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2: Deploy Backend to Render (or Railway)

### Using [Render.com](https://render.com) (Recommended Free Host):
1. Push your code to GitHub.
2. Log into Render and click **New +** $\to$ **Web Service**.
3. Select your repository.
4. Set the following settings:
   - **Root Directory**: `CloudGPT/backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
5. Add **Environment Variables**:
   - `DATABASE_URL`: *(Your PostgreSQL URL from Step 1 with `postgresql+asyncpg://`)*
   - `SECRET_KEY`: *(Any random 32-character string)*
   - `GROQ_API_KEY`: *(Your Groq API key from console.groq.com)*
6. Click **Deploy Web Service**.
7. Render will provide your public backend URL, e.g.:
   `https://cloudgpt-backend.onrender.com`

---

## Step 3: Deploy Frontend to Vercel

### Using [Vercel.com](https://vercel.com) (Recommended Next.js Host):
1. Log into Vercel and click **Add New** $\to$ **Project**.
2. Import your GitHub repository.
3. In project settings:
   - **Root Directory**: Select `CloudGPT/frontend`
   - **Framework Preset**: Next.js
4. Add **Environment Variable**:
   - `NEXT_PUBLIC_API_URL`: `https://cloudgpt-backend.onrender.com/api`
5. Click **Deploy**!
6. Vercel will build and launch your site with a global public URL, e.g.:
   `https://cloudgpt.vercel.app`

---

## Step 4: 1-Command Local Testing with Docker

If you want to run the full stack (PostgreSQL + FastAPI + Next.js) locally inside containers:

```bash
cd CloudGPT
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`
