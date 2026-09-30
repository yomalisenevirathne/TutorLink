# TutorLink - Team Setup & Project Documentation

Welcome to the **TutorLink** project documentation for **Scope 3: User Authentication & Profile Verification**.

This guide provides instructions for team members to set up their workstations, configure environment variables, run the Node.js Express backend, connect to Supabase, and launch the React Native mobile app.

---

## 🛠️ 1. Environment & Setup Instructions

### Step 1: Clone or Pull Branch
```bash
git checkout Rashmika
git pull origin Rashmika
npm install
```

### Step 2: Configure Environment Variables (`.env`)
Create a file named `.env` in the project root directory (`e:\TutorLink\.env`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://zycqidwaepstggspofvc.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_5bLuMzWMzc4K7puPYHZdeA_Mtm6Cyc4
```

> **Note**: `.env` and local database files are excluded from Git commits for security compliance.

---

## 🗄️ 2. Supabase Database Schema Setup

The database schema script is located in `supabase_schema.sql`.

### To apply the schema:
1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select project `zycqidwaepstggspofvc`.
2. Navigate to **SQL Editor**.
3. Open `supabase_schema.sql` from your project folder, paste its contents into the SQL Editor, and click **Run**.

### Included Tables:
- `public.profiles`: Main user accounts (Student & Tutor roles, email, full name, phone, address, verification status).
- `public.student_profiles`: Student-specific subjects list and interest keywords.
- `public.tutor_profiles`: Tutor-specific subjects, experience level, hourly rate, rating, and verified status.
- `public.tutor_certificates`: Qualification/degree certificate documents for profile verification.
- `public.otp_verifications`: OTP codes for university email verification.

---

## 🚀 3. Running the Project

### Running the Backend API Server
```bash
node backend/server.js
```
- Server runs on `http://localhost:5000`
- REST endpoints:
  - `POST /api/auth/send-otp`
  - `POST /api/auth/verify-otp`
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/profile/me`
  - `POST /api/profile/upload-certificate`

### Running the React Native / Expo Frontend App
```bash
npx expo start
```
- Press **`w`** for Web Browser preview.
- Scan QR code using **Expo Go** on Android / iOS.

---

## 📁 4. Project Structure

```
TutorLink/
├── .env                      # Local environment credentials (gitignored)
├── supabase_schema.sql       # PostgreSQL database schema script
├── README_TEAM_SETUP.md      # Team documentation guide
├── App.js                    # Main app entry point and navigation state
├── backend/
│   ├── server.js             # Express API server entry
│   ├── db.js                 # In-memory/local data manager
│   └── routes/
│       ├── auth.js           # Auth & OTP API routes
│       └── profile.js        # Profile & Certificate API routes
└── src/
    ├── screens/
    │   ├── LoadingScreen.js              # Screen 1: Branded Splash Screen
    │   ├── LoginScreen.js                # Screen 2: Login Screen
    │   ├── RegisterSelectionScreen.js    # Screen 3: Role Selection (Tutor vs Student)
    │   ├── TutorRegistrationScreen.js    # Screen 4: Become a Tutor Form & Cert Upload
    │   ├── StudentRegistrationScreen.js  # Screen 5: Become a Student Form
    │   ├── EmailVerificationScreen.js    # Screen 6: OTP Code Verification
    │   ├── StudentProfileScreen.js       # Screen 7: Student Profile & Settings
    │   └── TutorProfileScreen.js         # Screen 8: Tutor Profile & Verified Badges
    ├── services/
    │   └── api.js            # API client service & Supabase query client
    └── utils/
        └── supabase.js       # Supabase client setup with AsyncStorage
```
