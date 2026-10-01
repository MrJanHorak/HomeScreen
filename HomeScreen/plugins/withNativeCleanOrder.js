const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// Clean the app native build before AsyncStorage removes generated JNI sources.';
const CLEAN_ORDER = `
${MARKER}
gradle.projectsEvaluated {
    def asyncStorage = rootProject.findProject(':react-native-async-storage_async-storage')
    if (asyncStorage != null) {
        def appNativeClean = tasks.matching { it.name.startsWith('externalNativeBuildClean') }
        asyncStorage.tasks.matching { it.name == 'clean' }.configureEach {
            mustRunAfter(appNativeClean)
        }
    }
}
`;

module.exports = (config) => withAppBuildGradle(config, (mod) => {
  if (mod.modResults.language === 'groovy' && !mod.modResults.contents.includes(MARKER)) {
    mod.modResults.contents += CLEAN_ORDER;
  }
  return mod;
});
