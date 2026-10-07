const { withAppBuildGradle } = require('expo/config-plugins');

const START = '// @generated begin homescreen-release-signing';
const END = '// @generated end homescreen-release-signing';
const SIGNING = `
${START}
// Credentials stay outside the generated Android folder and are never embedded in JS.
def homeScreenSigning = new java.util.Properties()
def homeScreenSigningFile = new File(rootDir.parentFile, '.release/signing.properties')
if (homeScreenSigningFile.exists()) {
    homeScreenSigningFile.withInputStream { homeScreenSigning.load(it) }
}
def homeScreenCredential = { name ->
    System.getenv('HOMESCREEN_RELEASE_' + name) ?: homeScreenSigning.getProperty(name)
}
def homeScreenStore = homeScreenCredential('STORE_FILE')
def homeScreenStoreFile = homeScreenStore ? new File(homeScreenStore) : null
if (homeScreenStoreFile != null && !homeScreenStoreFile.isAbsolute()) {
    homeScreenStoreFile = new File(rootDir.parentFile, homeScreenStore)
}
def homeScreenAllowDebug = System.getenv('HOMESCREEN_ALLOW_DEBUG_SIGNING') == '1'
def homeScreenHasSigning = ['STORE_FILE', 'STORE_PASSWORD', 'KEY_ALIAS', 'KEY_PASSWORD'].every {
    homeScreenCredential(it)
}
if (homeScreenHasSigning) {
    android.signingConfigs.create('homeScreenRelease') {
        storeFile homeScreenStoreFile
        storePassword homeScreenCredential('STORE_PASSWORD')
        keyAlias homeScreenCredential('KEY_ALIAS')
        keyPassword homeScreenCredential('KEY_PASSWORD')
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.homeScreenRelease
} else if (homeScreenAllowDebug) {
    android.buildTypes.release.signingConfig = android.signingConfigs.debug
}
def homeScreenValidateSigning = tasks.register('validateHomeScreenReleaseSigning') {
    doLast {
        if (!homeScreenHasSigning) {
            if (homeScreenAllowDebug) {
                if (gradle.taskGraph.allTasks.any { it.name in ['bundleRelease', 'signReleaseBundle'] }) {
                    throw new GradleException('App bundles require private signing; debug signing is only allowed for internal APK tests.')
                }
                logger.warn('Internal test only: release APK uses Android debug signing.')
                return
            }
            throw new GradleException('Private release signing is missing. Run npm run android:signing:init; see RELEASE.md.')
        }
        if (!homeScreenStoreFile.isFile()) {
            throw new GradleException('Release keystore does not exist. Check STORE_FILE in .release/signing.properties.')
        }
        def keyStore = java.security.KeyStore.getInstance(homeScreenStoreFile, homeScreenCredential('STORE_PASSWORD').toCharArray())
        def certificate = keyStore.getCertificate(homeScreenCredential('KEY_ALIAS'))
        if (certificate == null || !keyStore.isKeyEntry(homeScreenCredential('KEY_ALIAS'))) {
            throw new GradleException('Release key alias does not identify a private key in the keystore.')
        }
        if (homeScreenCredential('KEY_ALIAS') == 'androiddebugkey' || certificate.subjectX500Principal.name.contains('CN=Android Debug')) {
            throw new GradleException('Android debug certificates cannot be used as private release signing keys.')
        }
        certificate.checkValidity()
    }
}
tasks.configureEach {
    if (name in ['validateSigningRelease', 'packageRelease', 'assembleRelease', 'bundleRelease', 'signReleaseBundle']) {
        dependsOn(homeScreenValidateSigning)
    }
    if (name == 'bundleRelease') {
        doFirst {
            if (!homeScreenHasSigning) {
                throw new GradleException('App bundles require private signing; debug signing is only allowed for internal APK tests.')
            }
        }
    }
}
${END}
`;

function applyReleaseSigning(source) {
  const withoutBlock = source.replace(/\n\/\/ @generated begin homescreen-release-signing[\s\S]*?\/\/ @generated end homescreen-release-signing\n?/g, '');
  const releaseSigning = /(\brelease\s*\{[^{}]*?\bsigningConfig\s+)(?:signingConfigs\.debug|null)\b/;
  if (!releaseSigning.test(withoutBlock)) {
    throw new Error('Cannot configure release signing: unexpected Android release build type. Check the Expo template.');
  }
  return withoutBlock.replace(releaseSigning, '$1null') + SIGNING;
}

module.exports = (config) => withAppBuildGradle(config, (mod) => {
  if (mod.modResults.language !== 'groovy') {
    throw new Error('HomeScreen release signing requires a Groovy app/build.gradle.');
  }
  mod.modResults.contents = applyReleaseSigning(mod.modResults.contents);
  return mod;
});
module.exports.applyReleaseSigning = applyReleaseSigning;
