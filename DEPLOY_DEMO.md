## Demo Deployment Guide
> **Goal:** Get a live URL for the dashboard + API that your team can access from any browser.
> **Fastest path:** Railway.app for API + DB, Vercel for Web. ~45 minutes total.
> **Cost:** Free tier covers a demo (~$0)

---

## Option A — Railway (API + DB) + Vercel (Web)  ⭐ Recommended for Demo

This is the quickest path. No Docker knowledge required on the hosting side.

### Why not the existing Terraform/GCP setup?
Your `infra/terraform/` is production-grade (VPC, Cloud SQL, Secret Manager, private networking).
It takes ~30 min to provision and costs ~$0.10/hr even idle.
For a demo, Railway + Vercel gets you a public URL in ~15 minutes for free.

---

## Prerequisites (do these first)

1. **Firebase project** with Authentication enabled
   - Go to https://console.firebase.google.com
   - Enable **Email/Password** sign-in provider
   - Go to Project Settings → Service Accounts → Generate new private key
   - Save the JSON file as `firebase-service-account.json` (you'll need values from it)

2. **GitHub repo** — push your code if not already:
   ```bash
   cd /Users/ulrichbosquet/Documents/Project_learning/FT360/fuel-track-360
   git add -A && git commit -m "chore: ready for demo deploy"
   git push origin main
   ```

---

## Step 1 — Deploy API + Database on Railway (~20 minutes)

### 1a. Create Railway account
Go to https://railway.app → Sign up with GitHub

### 1b. Create a new project
- Click **New Project** → **Deploy from GitHub repo**
- Select your `fuel-track-360` repo
- When asked for the root directory, set it to: `/api`

### 1c. Add PostgreSQL database
- In your Railway project, click **New** → **Database** → **PostgreSQL**
- Railway auto-creates `DATABASE_URL` — copy it, you'll need the parts

### 1d. Set environment variables for the API service
In Railway → your API service → **Variables**, add ALL of these:

```
NODE_ENV=production
APP_ENV=production
APP_PORT=3000
DATABASE_HOST=<from your Railway Postgres → PGHOST>
DATABASE_PORT=5432
DATABASE_NAME=<from Railway → PGDATABASE>
DATABASE_USER=<from Railway → PGUSER>
DATABASE_PASSWORD=<from Railway → PGPASSWORD>
DATABASE_SSL=true
DATABASE_SYNC=true          ← Set to true for demo (auto-creates tables)
FIREBASE_PROJECT_ID=<your Firebase project ID>
FIREBASE_CLIENT_EMAIL=<from firebase-service-account.json → client_email>
FIREBASE_PRIVATE_KEY=<from firebase-service-account.json → private_key>
GCS_BUCKET_NAME=ft360-demo-uploads   ← We'll skip GCS for demo (photos won't upload but rest works)
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3001
```

> **Tip for FIREBASE_PRIVATE_KEY:** The value has newlines. In Railway, paste the full string
> including `-----BEGIN PRIVATE KEY-----` ... `-----END PRIVATE KEY-----\n`
> Wrap it in double quotes if Railway's UI requires it.

### 1e. Set the start command
In Railway → your service → **Settings** → **Start Command**:
```
node dist/main.js
```
And **Build Command**:
```
npm ci && npm run build
```

### 1f. Generate a domain
Railway → your API service → **Settings** → **Networking** → **Generate Domain**
You'll get something like: `https://ft360-api-production.up.railway.app`

**Test it:** Visit `https://your-railway-url.up.railway.app/api/v1/health` — should return `{"status":"ok"}`

---

## Step 2 — Deploy Web Dashboard on Vercel (~10 minutes)

### 2a. Create Vercel account
Go to https://vercel.com → Sign up with GitHub

### 2b. Import project
- Click **New Project** → Import from GitHub
- Select your `fuel-track-360` repo
- Set **Root Directory** to: `web`
- Framework preset: **Next.js** (auto-detected)

### 2c. Set environment variables
In Vercel → your project → **Settings** → **Environment Variables**, add:

```
NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app/api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=<from Firebase console → Project Settings → Your web app>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-project-id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-project-id>.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<from Firebase console>
NEXT_PUBLIC_FIREBASE_APP_ID=<from Firebase console>
```

### 2d. Deploy
Click **Deploy** — Vercel builds and gives you a URL like:
`https://ft360-web.vercel.app`

### 2e. Add Vercel URL to Firebase authorized domains
- Firebase Console → Authentication → **Settings** → **Authorized domains**
- Add your Vercel URL: `ft360-web.vercel.app`

### 2f. Update CORS on Railway
Go back to Railway → API service → Variables → update:
```
CORS_ORIGINS=https://ft360-web.vercel.app,http://localhost:3001
```
Then redeploy.

---

## Step 3 — Create Demo Users in Firebase

### 3a. Create Owner/Admin account
- Firebase Console → Authentication → **Add user**
- Email: `owner@demo.ft360.app`, Password: `Demo1234!`
- Copy the UID shown after creation

### 3b. Seed demo data via API (Swagger UI)
- Visit: `https://your-railway-url.up.railway.app/api/docs`
- This is your live Swagger UI
- Use the `/auth` endpoints to create your organization + users
- Or: create a seed script (see below)

### 3c. Quick seed script (run once)
```bash
# Create an org + owner user via the API
# Replace the URL and UID with your values

curl -X POST https://your-railway-url.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firebase_uid": "PASTE_FIREBASE_UID_HERE",
    "full_name": "Demo Owner",
    "email": "owner@demo.ft360.app",
    "organization_name": "Demo Fuel Co",
    "country": "HT",
    "currency": "HTG",
    "timezone": "America/Port-au-Prince"
  }'
```

---

## Step 4 — Verify Everything Works

Visit your Vercel URL and:
1. ✅ Login with `owner@demo.ft360.app` / `Demo1234!`
2. ✅ Dashboard loads with empty state (no S2Ls yet — that's fine for demo)
3. ✅ Visit `/api/docs` on your Railway URL — Swagger is live
4. ✅ Create a station via Swagger POST `/organizations/stations`

---

## Option B — Demo on Your Laptop (Simplest, No Deploy)

If your team is in the same room or on a video call where you share screen:

```bash
cd /Users/ulrichbosquet/Documents/Project_learning/FT360/fuel-track-360

# Create .env file in project root
cat > .env << 'EOF'
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef
GCS_BUCKET_NAME=ft360-demo-uploads
EOF

# Start everything with Docker Compose
docker compose up -d

# Watch logs
docker compose logs -f api
```

Then open:
- Dashboard: http://localhost:3001
- API docs: http://localhost:3000/api/docs
- API health: http://localhost:3000/api/v1/health

**Limitation:** Only accessible on your local network. Team members on different networks can't see it unless you use ngrok (see below).

### Make localhost public with ngrok (5 minutes)
```bash
brew install ngrok
ngrok config add-authtoken YOUR_NGROK_TOKEN   # sign up free at ngrok.com

# Expose the web dashboard
ngrok http 3001
# → Gives you: https://abc123.ngrok.io  ← share this with your team

# In a second terminal, expose the API
ngrok http 3000
# → Update NEXT_PUBLIC_API_URL in web to this ngrok URL
```

---

## Option C — Full GCP with Terraform (Production-Grade, ~2 hrs)

Use this when you're ready for a real environment, not just a demo.
Your `infra/terraform/` is already written. You just need:

```bash
# Prerequisites:
# - GCP project created + billing enabled
# - gcloud CLI authenticated: gcloud auth login
# - Docker + gcloud auth configure-docker

cd infra/terraform

# Create terraform.tfvars
cat > terraform.tfvars << 'EOF'
project_id   = "your-gcp-project-id"
region       = "us-central1"
environment  = "demo"
db_tier      = "db-g1-small"
api_image    = "gcr.io/your-gcp-project-id/ft360-api:latest"
EOF

# Build and push the API image
cd ../../api
docker build --target runner -t gcr.io/YOUR_PROJECT/ft360-api:latest .
docker push gcr.io/YOUR_PROJECT/ft360-api:latest

# Apply infrastructure
cd ../infra/terraform
terraform init
terraform plan
terraform apply
```

**Web on Firebase App Hosting** (companion to Terraform):
```bash
cd ../../web
npx firebase-tools deploy --only hosting
```

---

## Recommended Sequence for a Team Demo

The 45-minute Railway + Vercel path is the right call for this stage.
Here's the exact order to do it:

| Step | Time | What you get |
|---|---|---|
| Push code to GitHub | 5 min | Source ready |
| Firebase — create web app, copy config | 5 min | Auth credentials |
| Railway — deploy API + Postgres | 15 min | Live API + DB |
| Vercel — deploy web | 10 min | Live dashboard URL |
| Create users in Firebase, seed data | 10 min | Demo-ready |
| **Total** | **~45 min** | **Shareable demo link** |

---

## What the Demo Covers (Script for your team)

1. **Login** as Owner → see dashboard with fleet/S2L overview
2. **Create a Station** (via Settings or Swagger) → shows org management
3. **Create a Truck** → shows fleet management
4. **Show the Audit Trail** (`/audit` page) → immutable compliance journal
5. **Show Swagger docs** → shows the API is fully documented
6. **Show the Flutter mobile APK** (see below) → demo the driver experience

### Build a demo APK for Android
```bash
cd mobile
flutter build apk --dart-define=API_URL=https://your-railway-url.up.railway.app/api/v1
# Output: build/app/outputs/flutter-apk/app-release.apk
# Upload to Google Drive and share the link — team installs on Android phones
```

---

## After the Demo — Add to ROADMAP.md

Remember to update `ROADMAP.md` with your demo URLs so you don't lose them:
```markdown
## Demo Environment
- API: https://your-railway-url.up.railway.app
- Dashboard: https://ft360-web.vercel.app
- Swagger: https://your-railway-url.up.railway.app/api/docs
- Demo login: owner@demo.ft360.app / Demo1234!
```
