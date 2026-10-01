const { withAndroidManifest } = require('expo/config-plugins');

const ACTION_MAIN = 'android.intent.action.MAIN';
const CATEGORIES = [
  'android.intent.category.LEANBACK_LAUNCHER',
  'android.intent.category.LAUNCHER',
];

module.exports = (config) => withAndroidManifest(config, (mod) => {
  const manifest = mod.modResults.manifest;
  const queries = manifest.queries || (manifest.queries = [{}]);
  const intents = queries[0].intent || (queries[0].intent = []);

  for (const category of CATEGORIES) {
    const exists = intents.some((intent) =>
      intent.action?.some((action) => action.$?.['android:name'] === ACTION_MAIN) &&
      intent.category?.some((entry) => entry.$?.['android:name'] === category)
    );
    if (!exists) {
      intents.push({
        action: [{ $: { 'android:name': ACTION_MAIN } }],
        category: [{ $: { 'android:name': category } }],
      });
    }
  }
  return mod;
});
