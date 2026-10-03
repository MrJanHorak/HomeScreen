# Smart TV Dashboard - Firebase Cloud Functions Backend

This backend provides dashboard data for the Smart TV React Native client, integrating **Google Calendar**, **Google Tasks**, **Google Fit**, **OpenWeatherMap**, and an optional **Google Sheets** dinner plan. The summary reads a ten-minute Firestore cache first and awaits cache writes on a miss. Shared weather results also have a ten-minute cache. See [security and retention setup](../SECURITY.md) for rules, TTL, and account controls.

---

## 🏗 Architecture & Features

```
server/functions/src/
├── index.ts                     # Main entrypoint exporting Cloud Functions (v2)
├── authDevice.ts                # TV device-code request and polling
├── getDashboardSummary.ts       # Unified dashboard endpoint (Calendar, Tasks, Fit, Weather, Meals)
├── executeAction.ts             # TV remote quick actions (e.g. complete task, update preferences)
├── syncUserData.ts              # Authenticated on-demand sync and Firestore caching
├── getLocationWeather.ts       # Weather for a selected city
├── googlePairing.ts             # Google OAuth flows for TV, Photos, and Meals
├── googlePhotosPicker.ts        # Select and save up to eight Google Photos
├── accountSecurity.ts           # Disconnect data, revoke sessions, delete account
├── mealSheetConfig.ts           # Connect or disconnect a meal Sheet
├── userAppearance.ts            # Read and save dashboard appearance
├── services/
│   ├── googleAuth.ts            # OAuth2Client setup & token refresh handling
│   ├── googleCalendar.ts        # Google Calendar API (events for today)
│   ├── googleFit.ts             # Google Fitness API (daily steps, distance, calories)
│   ├── googleTasks.ts           # Google Tasks API (active tasks & task completion)
│   ├── mealSheet.ts             # Google Sheets dinner-plan reader
│   └── weatherService.ts        # OpenWeatherMap API (current weather + forecast)
├── utils/
│   ├── crypto.ts                # AES-256-GCM encryption/decryption for OAuth refresh tokens
│   └── db.ts                    # Firestore database helpers (users, cache, device codes)
└── types/
    └── index.ts                 # Strongly-typed TypeScript interfaces
```

---

## 🚀 Cloud Function Endpoints

### 1. `getDashboardSummary` (`GET`)
Aggregates Calendar events, Tasks, Fitness activity, local Weather, and optional Meals in parallel using `Promise.allSettled`. An upstream failure can leave the other cards available.
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
      "forecast": []
    },
    "upcomingEvents": [],
    "meals": { "status": "not_connected", "items": [] },
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
Requires `Authorization: Bearer <Firebase_ID_Token>` and updates the verified user's dashboard cache on demand. The current code does not schedule this function.

### 6. Weather, appearance, meals, and photos

- `GET /getLocationWeather?city=...` returns live weather for a saved city.
- `GET` and `PUT /userAppearance` read and save the signed-in user's palette, background, layout, card, and ambient settings.
- `POST /beginGoogleMeals` starts incremental Google Sheets consent. `GET`, `PUT`, and `DELETE /mealSheetConfig` manage the selected Sheet. `PUT` accepts `{ "url": "https://docs.google.com/spreadsheets/d/..." }`, checks access and the Date/meal header, then stores the spreadsheet ID and title with an encrypted meal OAuth token. The dashboard response includes `meals.status` and dated `meals.items`.
- `POST /beginGooglePhotos` starts Google Photos Picker consent. `GET` and `POST /googlePhotosPicker?action=...` provide connection status, create or poll a picker session, and return saved background or gallery photos. The picker accepts up to eight photos.
- `POST /accountSecurity` accepts `disconnectPhotos`, `disconnectGoogle`, `signOutEverywhere`, or `deleteAccount` for the signed-in UID. Disconnect actions revoke all Firebase sessions so connected TVs clear old data. Account deletion removes nested Firestore user data and the Firebase Auth user.

These endpoints require a Firebase ID token, except for the public device-code request/poll and the OAuth callback. See the [TV app guide](../../HomeScreen/README.md) for the corresponding settings controls and screenshots and the [pairing site guide](../pairing-web/README.md) for meal setup.

---

## ⚙️ Google Cloud & API Configuration

1. In **[Google Cloud Console](https://console.cloud.google.com/)**:
   - Enable the following APIs:
     - **Google Calendar API**
     - **Google Tasks API**
     - **Fitness API**
     - **Google Sheets API** for optional meals
     - **Google Photos Picker API** for optional personal backgrounds
   - Create an **OAuth 2.0 Client ID** (Web application). Add the exact `GOOGLE_REDIRECT_URI` function URL as an authorized redirect URI.
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/tasks`
     - `https://www.googleapis.com/auth/fitness.activity.read`
     - `https://www.googleapis.com/auth/fitness.location.read`
     - `https://www.googleapis.com/auth/spreadsheets.readonly` for optional meals
     - `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` for optional personal backgrounds
2. In **[OpenWeatherMap](https://openweathermap.org/api)**:
   - Create an API key.
3. Copy `.env.example` to `.env` in `server/functions`, then set `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`, and `PAIRING_URL`. Provision the private values as Firebase function secrets:
   ```bash
   firebase functions:secrets:set GOOGLE_CLIENT_SECRET
   firebase functions:secrets:set OPENWEATHER_API_KEY
   firebase functions:secrets:set TOKEN_ENCRYPTION_KEY
   ```
4. For the 2nd gen `googleOAuthCallback` function, grant its runtime service account **Service Account Token Creator** on the service account that signs Firebase custom tokens. Check the runtime account in your project; the existing deployment used `488478409476-compute@developer.gserviceaccount.com`. Grant the role on that service account resource rather than across the whole project. Without `iam.serviceAccounts.signBlob`, Google consent succeeds but TV pairing redirects back with `result=error` when `auth.createCustomToken()` runs.

---

## 🛠 Local Development & Deployment

```bash
# In server/functions:
npm install
npm run build
npm run lint
npm test

# Run Firebase Emulators locally:
npm run serve

# Deploy to Google Cloud / Firebase:
npm run deploy
```
