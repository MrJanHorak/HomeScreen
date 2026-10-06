const { withDangerousMod, withGradleProperties } = require('expo/config-plugins');
const fs = require('fs/promises');
const path = require('path');

// Expo SDK 57's bundled Android template and React Native TV 0.86 use 9.3.1.
const GRADLE_VERSION = '9.3.1';

module.exports = (config) => {
  config = withGradleProperties(config, (mod) => {
    // Keep machine-specific JDK paths out of the generated project. Daemon JVM
    // criteria select an installed JDK 17 and take precedence over JAVA_HOME.
    const replaced = new Set(['org.gradle.java.home', 'org.gradle.jvmargs', 'android.builder.sdkDownload']);
    mod.modResults = mod.modResults.filter((entry) => !replaced.has(entry.key));
    mod.modResults.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx4096m -XX:MaxMetaspaceSize=512m',
    });
    return mod;
  });

  return withDangerousMod(config, ['android', async (mod) => {
    const gradleRoot = path.join(mod.modRequest.platformProjectRoot, 'gradle');
    const wrapper = path.join(gradleRoot, 'wrapper', 'gradle-wrapper.properties');
    const contents = await fs.readFile(wrapper, 'utf8');
    await fs.writeFile(wrapper, contents.replace(
      /^distributionUrl=.*$/m,
      `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`
    ));
    // Do not retain download URLs generated for a different Java version.
    await fs.writeFile(path.join(gradleRoot, 'gradle-daemon-jvm.properties'),
      '# HomeScreen Android builds require an installed JDK 17.\ntoolchainVersion=17\n');
    return mod;
  }]);
};
