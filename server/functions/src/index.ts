/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";

import { getDashboardSummaryHandler } from "./getDashboardSummary";
import { getLocationWeatherHandler } from "./getLocationWeather";
import { authDeviceHandler } from "./authDevice";
import { executeActionHandler } from "./executeAction";
import { syncUserDataHandler } from "./syncUserData";
import {beginGoogleLinkHandler, beginGooglePhotosHandler,
  beginGoogleMealsHandler, googleOAuthCallbackHandler, beginGoogleActivityHandler} from "./googlePairing";
import {googlePhotosPickerHandler} from "./googlePhotosPicker";
import {userAppearanceHandler} from "./userAppearance";
import {mealSheetConfigHandler} from "./mealSheetConfig";
import {accountSecurityHandler} from "./accountSecurity";
import {linkedDevicesHandler} from "./linkedDevices";
import {appearanceStudioHandler} from "./appearanceStudio";
import {userPreferencesHandler} from "./userPreferences";
import {deviceAppsHandler} from "./deviceApps";
import {pollsHandler, pollFeedHandler, pollParticipantHandler, pollRetention} from "./polls";
import {peopleHandler, peopleActivityHandler} from "./people";


// import {onRequest} from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

export const getDashboardSummary = getDashboardSummaryHandler;
export const getLocationWeather = getLocationWeatherHandler;
export const authDevice = authDeviceHandler;
export const executeAction = executeActionHandler;
export const syncUserData = syncUserDataHandler;
export const beginGoogleLink = beginGoogleLinkHandler;
export const beginGooglePhotos = beginGooglePhotosHandler;
export const beginGoogleMeals = beginGoogleMealsHandler;
export const googlePhotosPicker = googlePhotosPickerHandler;
export const userAppearance = userAppearanceHandler;
export const mealSheetConfig = mealSheetConfigHandler;
export const googleOAuthCallback = googleOAuthCallbackHandler;
export const accountSecurity = accountSecurityHandler;
export const linkedDevices = linkedDevicesHandler;
export const appearanceStudio = appearanceStudioHandler;
export const userPreferences = userPreferencesHandler;
export const deviceApps = deviceAppsHandler;
export const polls = pollsHandler;
export const pollFeed = pollFeedHandler;
export const pollParticipant = pollParticipantHandler;
export {pollRetention};
export const people = peopleHandler;
export const peopleActivity = peopleActivityHandler;
export const beginGoogleActivity = beginGoogleActivityHandler;
