// Low-volume authorization check. It sends no valid credential or account data.
const base = process.argv[2];
if (base !== 'https://us-central1-tv-homescreen-backend.cloudfunctions.net') {
  throw new Error('Supply the explicitly reviewed project URL.');
}
const endpoints = [
  ['getDashboardSummary', 'GET'], ['getLocationWeather?city=New%20York', 'GET'],
  ['executeAction', 'POST'], ['syncUserData', 'POST'], ['beginGoogleLink', 'POST'],
  ['beginGooglePhotos', 'POST'], ['beginGoogleMeals', 'POST'],
  ['googlePhotosPicker?action=status', 'GET'], ['userAppearance', 'GET'],
  ['mealSheetConfig', 'GET'], ['accountSecurity', 'GET'], ['linkedDevices', 'GET'],
  ['appearanceStudio', 'GET'], ['userPreferences', 'GET'], ['deviceApps?current=1', 'GET'],
];
(async () => {
  let failures = 0;
  for (const [path, method] of endpoints) {
    try {
      const response = await fetch(`${base}/${path}`, {method, redirect: 'manual',
        signal: AbortSignal.timeout(25_000),
        ...(method === 'POST' ? {headers: {'Content-Type': 'application/json'}, body: '{}'} : {}),
      });
      await response.body?.cancel();
      console.log(JSON.stringify({endpoint: path, method, status: response.status, expected: 401}));
      if (response.status !== 401) failures++;
    } catch (error) {
      console.log(JSON.stringify({endpoint: path, method, error: error.name}));
      failures++;
    }
  }
  process.exitCode = failures ? 1 : 0;
})();
