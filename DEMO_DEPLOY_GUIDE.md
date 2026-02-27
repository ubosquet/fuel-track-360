# 🚀 FT360 — 45-Minute Demo Deploy Guide

![FT360 Deploy Guide](/Users/ulrichbosquet/.gemini/antigravity/brain/b8f507f8-ab14-44ae-94e1-bb54d30c9ccc/deploy_banner_1772228751765.png)

> **Who is this for?** Anyone! Even if you've never deployed an app before.
> Just follow each step exactly as written and you'll have a **live, shareable URL** in 45 minutes.
>
> **What will you have at the end?**
> - ✅ A live API your team can call from anywhere in the world
> - ✅ A live web dashboard your team can open in any browser
> - ✅ A login that actually works
> - ✅ A URL you can share in a WhatsApp message

---

## 🗺️ The Big Picture — 5 Steps

![Steps overview](/Users/ulrichbosquet/.gemini/antigravity/brain/b8f507f8-ab14-44ae-94e1-bb54d30c9ccc/deploy_steps_flow_1772228762394.png)

| Step | Service | What it does | Time |
|------|---------|--------------|------|
| **1** | Your Terminal | Push your code to GitHub | 5 min |
| **2** | Firebase | Set up user login | 10 min |
| **3** | Railway | Host the API + Database | 15 min |
| **4** | Vercel | Host the web dashboard | 10 min |
| **5** | Test & Share | Create users, verify, celebrate | 5 min |

> 💡 **Think of it like this:**
> - **GitHub** = a USB drive in the cloud where your code lives
> - **Firebase** = the bouncer at the door — checks if users can log in
> - **Railway** = the engine room — runs your backend and stores your data
> - **Vercel** = the front door — the website your users will see
> - **You** = the one who connects all of these together 💪

---

## ✅ Before You Start — Accounts You Need

You need to create **4 free accounts** before starting. Do this now if you haven't.
Each one takes 2 minutes. All are free.

| Account | Where to sign up | Why you need it |
|---|---|---|
| **GitHub** | [github.com](https://github.com) | Stores your code |
| **Firebase** | [firebase.google.com](https://firebase.google.com) (use your Google account) | User authentication |
| **Railway** | [railway.app](https://railway.app) (sign up with GitHub) | API + Database hosting |
| **Vercel** | [vercel.com](https://vercel.com) (sign up with GitHub) | Web dashboard hosting |

> 🛑 **Stop here if you don't have these 4 accounts.** Create them first, then continue.

---

---

## 🟢 STEP 1 — Push Your Code to GitHub (5 minutes)

> **What is this?** Think of GitHub as Google Drive, but for code. You need to upload your code there so Railway and Vercel can download it and run it.

### Open your Terminal

On Mac, press `Command + Space`, type `Terminal`, press Enter.

You'll see a black/white box with a blinking cursor. That's the terminal. Don't be scared — you just type commands there.

### Run these commands one by one

Copy and paste each line into the terminal, then press **Enter**:

```bash
cd /Users/ulrichbosquet/Documents/Project_learning/FT360/fuel-track-360
```

```bash
git add -A
```

```bash
git commit -m "ready for demo deployment"
```

```bash
git push origin main
```

### ✅ How to know it worked

You should see something like:
```
To github.com/yourname/fuel-track-360.git
   abc1234..def5678  main -> main
```

> 🎉 **Your code is now on GitHub!**

> ⚠️ **If you see an error** saying `remote: Repository not found` — your repo might not be on GitHub yet.
> Go to [github.com/new](https://github.com/new), create a new repo called `fuel-track-360`,
> then run `git remote set-url origin https://github.com/YOURUSERNAME/fuel-track-360.git`
> and try again.

---

---

## 🔥 STEP 2 — Set Up Firebase (10 minutes)

> **What is Firebase?** Firebase is Google's tool for handling user logins. When someone types their email and password into your app, Firebase checks if it's correct. Without this step, no one can log in.

![Firebase setup](/Users/ulrichbosquet/.gemini/antigravity/brain/b8f507f8-ab14-44ae-94e1-bb54d30c9ccc/firebase_setup_1772228773769.png)

### 2a. Go to Firebase Console

Open your browser and go to: **https://console.firebase.google.com**

Sign in with your Google account.

### 2b. Create or Select Your Project

- If you already created an FT360 Firebase project → click on it
- If not → click **"Add project"**, name it `ft360-demo`, click through the steps

### 2c. Enable Email/Password Login

1. In the left sidebar, click **"Authentication"**
2. Click the **"Sign-in method"** tab
3. Find **"Email/Password"** in the list
4. Click the pencil/edit icon next to it
5. Toggle the **first switch to ON** (it should turn blue)
6. Click **"Save"**

> ✅ You should now see "Email/Password" with a green dot that says "Enabled"

### 2d. Get Your Firebase Config (for the web app)

This is the information Vercel will need later.

1. Click the **gear icon** ⚙️ next to "Project Overview" in the top left
2. Click **"Project settings"**
3. Scroll down to the **"Your apps"** section
4. If there's no web app yet: click the **`</>`** icon (it means "web app"), name it `ft360-web`, click "Register app"
5. You'll see a block of code that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",          ← COPY THIS
  authDomain: "ft360-demo.firebaseapp.com",   ← COPY THIS
  projectId: "ft360-demo",      ← COPY THIS
  storageBucket: "ft360-demo.appspot.com",   ← COPY THIS
  messagingSenderId: "123456789",  ← COPY THIS
  appId: "1:123456789:web:abc"  ← COPY THIS
};
```

> 📋 **Open Notepad (or Notes on Mac) and paste all of these values.**
> You'll need them in Step 4. Label each one so you don't forget which is which.

### 2e. Download the Service Account Key (for the API)

This is what your backend server uses to verify Firebase logins.

1. Still in **Project Settings** → click the **"Service accounts"** tab
2. Click **"Generate new private key"**
3. Click **"Generate key"** in the popup
4. A `.json` file will download to your computer
5. Open that file in a text editor — you'll need 3 values from it later:
   - `"project_id"` → copy the value
   - `"client_email"` → copy the value
   - `"private_key"` → copy the **entire** value (it's long, starts with `-----BEGIN PRIVATE KEY-----`)

> 📋 **Paste these 3 values into your Notepad file too.** Label them clearly.

> 🔒 **Important:** Never share this JSON file with anyone or post it on GitHub. Keep it private.

### 2f. Add Your Future App URL to Firebase's Allowed List

You don't have your Vercel URL yet, but you'll come back here after Step 4.
For now, just remember: **Firebase Console → Authentication → Settings → Authorized domains**.
You'll add your Vercel URL there.

---

---

## 🚂 STEP 3 — Deploy the API on Railway (15 minutes)

> **What is Railway?** Railway is like renting a computer in the cloud that runs your backend 24/7. It also gives you a free database (PostgreSQL) to store all your app data.

![Railway deploy](/Users/ulrichbosquet/.gemini/antigravity/brain/b8f507f8-ab14-44ae-94e1-bb54d30c9ccc/railway_deploy_1772228796659.png)

### 3a. Go to Railway

Open: **https://railway.app**

Click **"Login"** → **"Login with GitHub"** → authorize Railway to access your GitHub.

### 3b. Create a New Project

1. Click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Find and click your **`fuel-track-360`** repository
4. When it asks for **"Root Directory"** → type: `/api`
5. Click **"Deploy Now"**

> The first deploy will fail — that's OK! We haven't set the environment variables yet. Continue to the next step.

### 3c. Add the PostgreSQL Database

1. Inside your Railway project, click the **"New"** button (top right)
2. Click **"Database"**
3. Click **"Add PostgreSQL"**
4. Wait ~30 seconds — a purple database block will appear in your project

### 3d. Get the Database Connection Details

1. Click on the purple **PostgreSQL** block in your Railway project
2. Click the **"Variables"** tab
3. You'll see variables like `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
4. Click the **copy icon** next to each one and paste them into your Notepad

> You'll need:
> - `PGHOST` → this is your `DATABASE_HOST`
> - `PGPORT` → this is your `DATABASE_PORT` (should be `5432`)
> - `PGUSER` → this is your `DATABASE_USER`
> - `PGPASSWORD` → this is your `DATABASE_PASSWORD`
> - `PGDATABASE` → this is your `DATABASE_NAME`

### 3e. Set the API Environment Variables

1. Click on the **API service block** (not the database block) in your Railway project
2. Click the **"Variables"** tab
3. Click **"Add Variable"** for each of the following
4. Type the **Name** on the left, the **Value** on the right:

---

**Copy this full list — add one by one:**

| Variable Name | Value to Enter |
|---|---|
| `NODE_ENV` | `production` |
| `APP_ENV` | `production` |
| `APP_PORT` | `3000` |
| `DATABASE_HOST` | ← paste PGHOST from step 3d |
| `DATABASE_PORT` | `5432` |
| `DATABASE_NAME` | ← paste PGDATABASE from step 3d |
| `DATABASE_USER` | ← paste PGUSER from step 3d |
| `DATABASE_PASSWORD` | ← paste PGPASSWORD from step 3d |
| `DATABASE_SSL` | `true` |
| `DATABASE_SYNC` | `true` ⚠️ |
| `FIREBASE_PROJECT_ID` | ← paste `project_id` from your service account JSON |
| `FIREBASE_CLIENT_EMAIL` | ← paste `client_email` from your service account JSON |
| `FIREBASE_PRIVATE_KEY` | ← paste the **entire** `private_key` value from the JSON |
| `GCS_BUCKET_NAME` | `ft360-demo-photos` |
| `CORS_ORIGINS` | `http://localhost:3000` ← we'll update this after Vercel |

> ⚠️ **`DATABASE_SYNC=true` is the magic that creates all your tables automatically!**
> Never use this on a real production database, but it's perfect for a demo.

> ⚠️ **For `FIREBASE_PRIVATE_KEY`**: the value is very long and has line breaks. Copy the entire value
> including `-----BEGIN PRIVATE KEY-----` all the way to `-----END PRIVATE KEY-----\n`.
> Railway will handle the line breaks automatically.

### 3f. Redeploy the API

1. Click the **"Deployments"** tab in your API service
2. Click **"Deploy"** (or it may auto-redeploy when you save variables)
3. Watch the build logs — it should take 1–2 minutes

### 3g. Get Your API URL

1. Click **"Settings"** tab in your API service
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. You'll get a URL like: `https://fuel-track-360-production.up.railway.app`
5. **Copy this URL and save it in your Notepad** — you'll need it soon

### ✅ Test Your API

Open your browser and go to:
```
https://YOUR-RAILWAY-URL.up.railway.app/api/v1/health
```

You should see:
```json
{ "status": "ok" }
```

> 🎉 **Your API is live!** The backend brain of your app is running in the cloud.

> If you see an error, click **"Deployments"** → click the latest deploy → read the logs.
> The most common issue is a wrong variable value — double-check your Firebase private key.

---

---

## 🔺 STEP 4 — Deploy the Dashboard on Vercel (10 minutes)

> **What is Vercel?** Vercel is the easiest way to put a Next.js website on the internet. It's free, it's fast, and it takes about 10 minutes.

![Vercel deploy](/Users/ulrichbosquet/.gemini/antigravity/brain/b8f507f8-ab14-44ae-94e1-bb54d30c9ccc/vercel_deploy_1772228808813.png)

### 4a. Go to Vercel

Open: **https://vercel.com**

Click **"Sign Up"** → **"Continue with GitHub"** → authorize Vercel.

### 4b. Import Your Project

1. Click **"Add New..."** → **"Project"**
2. Find your **`fuel-track-360`** repository in the list
3. Click **"Import"** next to it

### 4c. Configure the Project

On the configuration screen:

1. **Framework Preset** → it should auto-detect **Next.js** ✅
2. **Root Directory** → click "Edit" and type: `web`
3. **Build Command** → leave as default (`npm run build`)

### 4d. Set the Environment Variables

Still on the same screen, scroll down to **"Environment Variables"**.
Click **"Add"** for each one:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RAILWAY-URL.up.railway.app/api/v1` ← paste your Railway URL from step 3g |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ← paste `apiKey` from step 2d Notepad |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ← paste `authDomain` from step 2d Notepad |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ← paste `projectId` from step 2d Notepad |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ← paste `storageBucket` from step 2d Notepad |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ← paste `messagingSenderId` from step 2d Notepad |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ← paste `appId` from step 2d Notepad |

### 4e. Deploy!

Click the big **"Deploy"** button.

Watch the progress bar — it builds for about 2–3 minutes. You'll see logs scrolling.
When it says **"Congratulations! Your deployment is live"** — you're done!

You'll get a URL like: `https://ft360-web.vercel.app`

> 📋 **Copy this URL and save it in your Notepad.**

### 4f. Go Back to Firebase and Add Your Vercel URL

Remember step 2f? Now you have your URL. Go do that now:

1. Go back to your **Firebase Console** → **Authentication** → **Settings** tab
2. Scroll down to **"Authorized domains"**
3. Click **"Add domain"**
4. Type your Vercel URL (just the domain, no `https://`) e.g.: `ft360-web.vercel.app`
5. Click **"Add"**

### 4g. Go Back to Railway and Update CORS

Now that you have your Vercel URL, update the API so it allows requests from the dashboard:

1. Go to **Railway** → your API service → **Variables** tab
2. Find `CORS_ORIGINS` and update the value to:
   ```
   https://ft360-web.vercel.app,http://localhost:3001
   ```
3. Railway will auto-redeploy

---

---

## 🎉 STEP 5 — Create Your Demo User & Test Everything (5 minutes)

> **Almost there!** Now you need to create a login that actually works. You'll create a demo user in Firebase and register them in your database.

### 5a. Create a Firebase User

1. Go to **Firebase Console** → **Authentication** → **Users** tab
2. Click **"Add user"**
3. Enter:
   - Email: `owner@demo.ft360.app`
   - Password: `Demo1234!`
4. Click **"Add user"**
5. **Copy the UID** — it's a long string like `abc123XYZ...` that appears next to the user

> 📋 Save that UID in your Notepad.

### 5b. Register the User in Your Database

Open your browser and go to your **Swagger documentation** (the API's built-in testing tool):

```
https://YOUR-RAILWAY-URL.up.railway.app/api/docs
```

You should see a beautiful page with all your API endpoints listed.

1. Find the **`POST /auth/register`** endpoint
2. Click on it → click **"Try it out"**
3. Replace the example body with this (use the UID you copied):

```json
{
  "firebase_uid": "PASTE_YOUR_UID_HERE",
  "full_name": "Demo Owner",
  "email": "owner@demo.ft360.app",
  "organization_name": "Demo Fuel Co",
  "country": "HT",
  "currency": "HTG",
  "timezone": "America/Port-au-Prince"
}
```

4. Click **"Execute"**
5. You should get a `201 Created` response with your user and organization details

> ✅ Your demo user is now in the database!

### 5c. Test the Full Login Flow

1. Open a new browser tab
2. Go to your **Vercel URL**: `https://ft360-web.vercel.app`
3. You should see the FT360 login screen
4. Enter:
   - Email: `owner@demo.ft360.app`
   - Password: `Demo1234!`
5. Click **Login**

> 🎉 **YOU'RE IN!** The dashboard should load.

---

---

## 🥳 You Did It! Your App Is LIVE

![Success](/Users/ulrichbosquet/.gemini/antigravity/brain/b8f507f8-ab14-44ae-94e1-bb54d30c9ccc/success_launch_1772228821789.png)

### 📋 Save These URLs (Fill in your actual URLs)

```
🌐 Web Dashboard:  https://_________________________.vercel.app
⚙️  API:           https://_________________________.up.railway.app
📖 API Docs:       https://_________________________.up.railway.app/api/docs
🔑 Demo Login:     owner@demo.ft360.app  /  Demo1234!
```

> **Tip:** Add these to your `ROADMAP.md` file under a "Demo Environment" section.

---

## 🎬 What to Show Your Team (Demo Script)

Here's a suggested order for your demo — it tells a story:

1. **Show the login screen** → log in as the Demo Owner
2. **Show the Dashboard** → "This is the home screen — shows the fleet status at a glance"
3. **Go to Fleet tab** → "This is where you manage your trucks in real time"
4. **Go to Audit Trail** → "Every action is logged here — immutable compliance journal"
5. **Open the API docs** (`/api/docs`) → "The full API is documented — any system can connect to this"
6. **Open the Flutter APK on a physical phone** (optional) → "This is the driver's phone app"

---

## 🆘 Troubleshooting — If Something Went Wrong

| Problem | What to do |
|---|---|
| Railway build failed | Click "Deployments" → click the failed deploy → read the red error text |
| `{ "message": "Unauthorized" }` when testing API | Firebase private key is wrong — check for missing newlines |
| "Network Error" on the dashboard | Your `NEXT_PUBLIC_API_URL` in Vercel is wrong — check for typos |
| Login page shows but login fails | Check Firebase "Authorized domains" — did you add your Vercel URL? |
| `502 Bad Gateway` from Railway | Your API crashed — check Railway logs for the error |
| Blank white page on Vercel | Your build failed — check Vercel's build logs for a Next.js error |

---

## 🔒 After the Demo — Important Security Steps

> These aren't urgent for a demo, but do them before any real user touches the app:

- [ ] Change `DATABASE_SYNC` from `true` to `false` in Railway (prevents accidental schema changes)
- [ ] Change the demo user password from `Demo1234!` to something strong
- [ ] Remove `http://localhost:3001` from `CORS_ORIGINS` in Railway
- [ ] Keep your Firebase service account JSON file **off GitHub** — check `.gitignore`

---

*Created: 2026-02-27 | FT360 Demo Deploy Guide v1.0*
