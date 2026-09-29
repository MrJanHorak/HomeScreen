# Smart TV Dashboard - Firebase Cloud Functions Backend

This backend provides real-time and cached dashboard data for the Smart TV React Native client, integrating **Google Calendar**, **Google Tasks**, **Google Fit**, and **OpenWeatherMap**.

---

## 🏗 Architecture & Features

```
server/functions/src/
├── index.ts                     # Main entrypoint exporting Cloud Functions (v2)
├── authDevice.ts                # TV Device Code Pairing & Google OAuth Token storage
├── getDashboardSummary.ts       # Unified dashboard endpoint (Calendar, Tasks, Fit, Weather)
├── executeAction.ts             # TV remote quick actions (e.g. complete task, update preferences)
├── syncUserData.ts              # Background user data sync and Firestore caching
├── services/
│   ├── googleAuth.ts            # OAuth2Client setup & token refresh handling
│   ├── googleCalendar.ts        # Google Calendar API (events for today)
│   ├── googleFit.ts             # Google Fitness API (daily steps, distance, calories)
│   ├── googleTasks.ts           # Google Tasks API (active tasks & task completion)
│   └── weatherService.ts        # OpenWeatherMap API (current weather + 5-day forecast)
├── utils/
│   ├── crypto.ts                # AES-256-GCM encryption/decryption for OAuth refresh tokens
│   └── db.ts                    # Firestore database helpers (users, cache, device codes)
└── types/
    └── index.ts                 # Strongly-typed TypeScript interfaces
```

---

## 🚀 Cloud Function Endpoints

### 1. `getDashboardSummary` (`GET`)
Aggregates Calendar events, Tasks, Fitness activity, and Local Weather in parallel using `Promise.allSettled`.
- **Header**: `Authorization: Bearer <Firebase_ID_Token>`. The verified token determines the UID.
- **Response**:
  ```json
  {
    "schedule": [
      { "id": "...", "title": "Team Standup", "time": "9:00 AM", "endTime": "9:30 AM", "category": "work", "color": "blue" }
    ],
    "tasks": [
      { "id": "...", "title": "Review PR", "due": "Sep 28", "completed": false }
    ],
    "health": {
      "steps": 7800,
      "stepGoal": 10000,
      "distance": 6.2,
      "distanceGoal": 8,
      "calories": 428,
      "activeMinutes": 74,
      "progress": 0.78
    },
    "weather": {
      "temp": "72°",
      "condition": "Clear",
      "feelsLike": 70,
      "humidity": 54,
      "windSpeed": 4,
      "windDirection": "NW",
      "high": 78,
      "low": 61,
      "forecast": [ ... ]
    },
    "updatedAt": "2026-09-28T20:00:00.000Z"
  }
  ```

### 2. `authDevice` (`POST`)
Implements TV device code authentication (RFC 8628 style pairing flow):
- `POST /authDevice?action=request-code`: Generates a displayed 6-character code and a private `pollSecret`. Keep the secret on the TV only.
- `POST /authDevice?action=poll` (body: `{ code, pollSecret }`): TV polls until authorization and receives a one-time custom token.

### 3. `beginGoogleLink` (`POST`) and `googleOAuthCallback` (`GET`)
The pairing site sends the displayed code to `beginGoogleLink` with a Firebase ID token. The server creates a one-time OAuth state and PKCE challenge, then returns a Google consent URL. Google returns to `googleOAuthCallback`; the server exchanges the code, checks that the Google account matches the Firebase user, stores encrypted tokens, and authorizes the TV. The browser receives only a result redirect.

### 4. `executeAction` (`POST`)
Handles actions triggered by the TV remote:
- Requires `Authorization: Bearer <Firebase_ID_Token>`; the verified token determines the UID.
- Complete a task:
  ```json
  {
    "action": "completeTask",
    "payload": { "taskId": "..." }
  }
  ```
- Update user preferences:
  ```json
  {
    "action": "updatePreferences",
    "payload": { "stepGoal": 12000, "weatherCity": "San Francisco" }
  }
  ```

### 5. `syncUserData` (`POST`)
Requires `Authorization: Bearer <Firebase_ID_Token>` and updates the verified user's dashboard cache.

---

## ⚙️ Google Cloud & API Configuration

1. In **[Google Cloud Console](https://console.cloud.google.com/)**:
   - Enable the following APIs:
     - **Google Calendar API**
     - **Google Tasks API**
     - **Fitness API**
   - Create an **OAuth 2.0 Client ID** (Web application). Add the exact `GOOGLE_REDIRECT_URI` function URL as an authorized redirect URI.
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/tasks`
     - `https://www.googleapis.com/auth/fitness.activity.read`
     - `https://www.googleapis.com/auth/fitness.location.read`
2. In **[OpenWeatherMap](https://openweathermap.org/api)**:
   - Create an API key.
3. Put `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`, and `PAIRING_URL` in `server/functions/.env`. Provision the private values as Firebase function secrets:
   ```bash
   firebase functions:secrets:set GOOGLE_CLIENT_SECRET
   firebase functions:secrets:set OPENWEATHER_API_KEY
   firebase functions:secrets:set TOKEN_ENCRYPTION_KEY
   ```
4. For the 2nd gen `googleOAuthCallback` function, grant its runtime service account **Service Account Token Creator** on the service account that signs Firebase custom tokens. This project uses the default Compute Engine service account for both (`488478409476-compute@developer.gserviceaccount.com`). Grant the role on that service account resource, rather than across the whole project. Without `iam.serviceAccounts.signBlob`, Google consent succeeds but TV pairing redirects back with `result=error` when `auth.createCustomToken()` runs.

---

## 🛠 Local Development & Deployment

```bash
# In server/functions:
npm install
npm run build
npm run lint

# Run Firebase Emulators locally:
npm run serve

# Deploy to Google Cloud / Firebase:
npm run deploy
```
