# CodeGraph Frontend

React + TypeScript + Vite client for CodeGraph AI.

## Environment Variables

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

Required:

- `VITE_API_BASE_URL` - backend base URL, for example:
  - Local: `http://localhost:8000`
  - Vercel: `https://your-backend-domain.vercel.app`

## Local Development

```bash
npm install
npm run dev
```

## Vercel Deployment

Deploy this `frontend` directory as the Vercel project root.

Set the Vercel environment variable:

- `VITE_API_BASE_URL` -> your deployed backend URL

This project includes `vercel.json` with an SPA rewrite so client-side routes resolve correctly.
