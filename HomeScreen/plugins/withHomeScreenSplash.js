const { withAndroidColors, withAndroidStyles, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const BACKGROUND = '#0B1527';

module.exports = (config) => {
  config = withAndroidColors(config, (mod) => {
    const colors = mod.modResults.resources.color || (mod.modResults.resources.color = []);
    for (const name of ['splashscreen_background', 'colorPrimary']) {
      const color = colors.find((entry) => entry.$?.name === name);
      if (color) color._ = BACKGROUND;
      else colors.push({ $: { name }, _: BACKGROUND });
    }
    return mod;
  });

  config = withAndroidStyles(config, (mod) => {
    const styles = mod.modResults.resources.style || (mod.modResults.resources.style = []);
    let splash = styles.find((entry) => entry.$?.name === 'Theme.App.SplashScreen');
    if (!splash) {
      splash = { $: { name: 'Theme.App.SplashScreen', parent: 'AppTheme' }, item: [] };
      styles.push(splash);
    }
    const items = splash.item || (splash.item = []);
    const windowBackground = items.find((item) => item.$?.name === 'android:windowBackground');
    if (windowBackground) windowBackground._ = '@drawable/homescreen_splash';
    else items.push({ $: { name: 'android:windowBackground' }, _: '@drawable/homescreen_splash' });
    return mod;
  });

  return withDangerousMod(config, ['android', async (mod) => {
    const resources = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    const drawable = path.join(resources, 'drawable');
    const noDensity = path.join(resources, 'drawable-nodpi');
    await fs.promises.mkdir(drawable, { recursive: true });
    await fs.promises.mkdir(noDensity, { recursive: true });
    await fs.promises.copyFile(
      path.join(mod.modRequest.projectRoot, 'assets', 'homescreen-splash.png'),
      path.join(noDensity, 'homescreen_splash_mark.png')
    );
    await fs.promises.writeFile(path.join(drawable, 'homescreen_splash.xml'),
      '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n' +
      '  <item android:drawable="@color/splashscreen_background" />\n' +
      '  <item><bitmap android:gravity="center" android:src="@drawable/homescreen_splash_mark" /></item>\n' +
      '</layer-list>\n'
    );
    return mod;
  }]);
};
