# TutorLink

TutorLink is a mobile application that connects students with tutors. Students can discover tutors, compare their profiles, choose session preferences, and manage bookings. Tutors can register and maintain their teaching profiles.

Developed as an HCI assignment, the project focuses on accessible tutor discovery and a clear booking experience.

## Features

- **Student and tutor accounts:** Separate registration flows, login, email verification, and profile editing.
- **Tutor discovery:** Search by tutor name, subject, university, or module code.
- **Filters and sorting:** Filter by price, rating, language, teaching style, and session mode; sort by recommendation, price, or rating.
- **Tutor profiles:** View subjects, hourly rates, verification status, and reviews.
- **Compare and save:** Compare up to three tutors and keep a list of favorite tutors during the current app session.
- **Session booking:** Select a date, time, online or physical mode, and group size; review the booking summary before confirming.
- **Booking management:** View upcoming and past bookings, reschedule, cancel, mark completed, or remove bookings.

## Technology

| Area | Technology |
| --- | --- |
| Mobile application | React Native 0.86, React 19.2, Expo SDK 57 |
| Language | Primarily JavaScript, with TypeScript configuration |
| Database and authentication integration | Supabase |
| Local prototype API | Node.js, Express 5, CORS |
| Device features | Expo SecureStore, ImagePicker, DocumentPicker |
| UI | React Native components and Expo vector icons |

Android and iOS are the primary targets. A web development command is also provided; see the platform limitations below.

## Getting started

### Prerequisites

- Node.js **22.13 or newer** and npm, matching the [Expo SDK 57 requirements](https://docs.expo.dev/versions/v57.0.0/).
- Git.
- A Supabase project with the tables used by the application.
- An Android emulator, iOS simulator on macOS, or a physical device with an Expo Go version compatible with SDK 57.

### 1. Clone and install

```bash
git clone https://github.com/yomalisenevirathne/TutorLink.git
cd TutorLink
npm ci
```

The repository includes `package-lock.json`; use npm to reproduce its dependency versions.

### 2. Configure Supabase

Create `.env.local` in the project root and replace these placeholders with your project's values:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLIC_ANON_KEY
```

The client reads these variables in [`src/utils/supabase.js`](src/utils/supabase.js). Expo loads them from the environment file; reload the app after changing them. These variables are included in the client bundle, so use a public client key and never a service-role key. See [Expo environment variables](https://docs.expo.dev/guides/environment-variables/).

### 3. Prepare the database

Run [`supabase_schema.sql`](supabase_schema.sql) in your Supabase project's SQL Editor for the account and profile tables:

- `profiles`
- `student_profiles`
- `tutor_profiles`
- `tutor_certificates`
- `otp_verifications`

This script also includes sample profile data. Its policy statements are intended for initial setup; rerunning it against an existing installation can produce duplicate-policy errors.

**Additional database setup is required for discovery and bookings.** The application also queries `tutors`, `subjects`, `reviews`, and `bookings`, whose creation scripts are not included on this branch. Use the team's configured Supabase project or obtain the matching schemas and data before testing these features. The `tutors` discovery table is separate from the registration table `tutor_profiles`.

### 4. Start the app

```bash
npm start
```

Scan the terminal QR code with a compatible Expo Go installation, or choose an emulator from the development server. See [Expo's development guide](https://docs.expo.dev/get-started/start-developing/).

You can also use:

```bash
npm run android
npm run ios
npm run web
```

The iOS simulator requires macOS. If your device cannot reach the development server over the local network, try `npm run tunnel`.

### 5. Run the local API (optional)

Open a second terminal in the project root:

```bash
node backend/server.js
```

The API defaults to port **5000** and provides:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Check whether the server is running |
| `/api/auth/*` | Prototype registration, login, and OTP operations |
| `/api/profile/*` | Prototype profile operations |

The frontend currently sets `API_BASE_URL` to `http://localhost:5000/api` in [`src/services/api.js`](src/services/api.js). For a physical device, update that value to your computer's LAN address. For the standard Android Studio emulator, use `http://10.0.2.2:5000/api`. Keep the device and computer on the same network when using a LAN address.

The local API stores its data in `backend/data.json`, which is generated at runtime. The frontend includes mock fallbacks when the API is unavailable; a successful fallback screen does not confirm that data was saved to the backend or Supabase.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo development server |
| `npm run android` | Start development for Android |
| `npm run ios` | Start development for iOS |
| `npm run web` | Start the web preview |
| `npm run tunnel` | Start Expo with a tunnel connection |
| `npm run lint` | Run Expo lint |
| `npx tsc --noEmit` | Check TypeScript without emitting files |
| `npx expo-doctor` | Diagnose Expo configuration and dependencies |
| `node backend/server.js` | Start the local prototype API |

On Windows PowerShell, if script execution policy blocks npm or npx, use `npm.cmd` and `npx.cmd` for these commands.

## Project structure

```text
TutorLink/
├── App.js                    # Screen selection and application state
├── index.js                  # Expo application entry point
├── app.json                  # Expo app configuration
├── assets/                   # App icons and images
├── src/
│   ├── components/           # Shared UI components
│   ├── constants/            # Shared styling constants
│   ├── context/              # Booking context
│   ├── features/search/      # Discovery, filtering, comparison, favorites
│   ├── screens/              # Account and booking screens
│   ├── services/             # Frontend API integration
│   ├── utils/                # Supabase client and media helpers
│   └── bookingService.js     # Supabase booking operations
└── supabase_schema.sql       # Account/profile database setup
```

## Development notes

- Run `npm run lint` and `npx tsc --noEmit` before submitting changes.
- Install additional Expo or React Native dependencies with `npx expo install <package>` to resolve compatible versions.
- Keep reusable components, hooks, and service logic separate from screen UI.
- Test small screens, keyboard interactions, scrolling, and safe areas on mobile devices.
- Keep database access aligned with the project's Supabase policies and authenticated identities.

## Prototype limitations

This branch includes demonstration authentication and local API fallbacks. The local backend returns OTP codes for testing and stores passwords without hashing; it is intended for assignment demonstrations. Production authentication requires replacing these behaviors and reviewing the database access policies.

Favorites, comparison selections, and recent searches live in React state and reset when the app restarts. Discovery and booking functionality depend on the additional Supabase tables listed above.

The Supabase client currently uses Expo SecureStore across platforms. Browser session storage needs a compatible adapter before the web preview can provide the same authentication behavior as the mobile app.

## License

The repository includes an [MIT license](LICENSE).
