# KeyVoid Deployment

## Backend on Render

Use the root `render.yaml` blueprint, or create a Render Web Service manually:

- Root directory: `KEYVOID/BACKEND`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/`

Required Render env vars:

- `NODE_ENV=production`
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN=https://your-vercel-domain.vercel.app`
- `FRONTEND_URL=https://your-vercel-domain.vercel.app`
- `GOOGLE_CLIENT_ID`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER=keyvoid`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` for forgot-password emails

## Frontend on Vercel

The root `vercel.json` points Vercel at `KEYVOID/FRONTEND/KEYVOID-FRONTEND` and keeps SPA routing working.

Required Vercel env vars:

- `VITE_API_URL=https://your-render-backend.onrender.com/api`
- `VITE_GOOGLE_CLIENT_ID`

## Production Notes

- Add the final Vercel URL to the Google OAuth client allowed origins.
- Add the final Vercel URL to `CLIENT_ORIGIN` and `FRONTEND_URL` on Render.
- Use a strong `JWT_SECRET`; never reuse the local development value.
- Configure SMTP before relying on forgot-password in production.
