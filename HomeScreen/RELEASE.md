# Signed Android TV releases and network installation

Use a **signed release APK** to test directly on your TV. It contains JavaScript
and assets and runs without Metro or a development computer. Use a **signed
Android App Bundle (AAB)** for Google Play; `adb install` cannot install an AAB.
These instructions use Windows PowerShell and local Gradle builds. An Expo/EAS
account is not required. The existing `eas.json` only configures a development
client; it does not implement this local release workflow.

Validated on this workstation on October 6, 2026: both default build commands
completed, APK/AAB signatures verified, APK zip alignment passed the 16 KB check,
and all 30 packaged 64-bit native libraries had ELF LOAD alignment of at least
16 KB. Gradle also rejected debug-key and missing-keystore release credentials.
A 16 KB runtime test and Play Console review remain required before publication.
The signed APK was installed over network ADB on the Sony BRAVIA at
`192.168.1.103:5555`; Android reported a successful cold launch of version 1.0.0
(versionCode 1) with no `DEBUGGABLE` package flag. The previous debug app was
manually uninstalled, so this release needs account pairing again.

## 1. Check the build tools and application configuration

Run from the TV app directory:

```powershell
Set-Location D:\development\smart-tv-dashboard\HomeScreen
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'
$env:ANDROID_HOME = 'D:\androidSDKs'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
# Put JDK 17 ahead of Oracle's javapath shim for this terminal.
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

node --version
& "$env:JAVA_HOME\bin\java.exe" -version
& "$env:JAVA_HOME\bin\keytool.exe" -help
& "$env:ANDROID_HOME\platform-tools\adb.exe" version
```

Use Node.js **22.13+** and **JDK 17**. Install these packages with Android Studio's
SDK Manager: Android SDK Platform 36, Build Tools 36.0.0, Platform Tools,
NDK 27.1.12297006, and CMake 3.22.1. This machine has them installed. Change the
paths above on another machine. These environment assignments affect the current
terminal; repeat them in a new terminal or configure Windows user variables.

On a fresh checkout, run `npm ci` before building. Copy `.env.example` to
`.env.local` only if your configured file does not already exist, then supply the
Firebase web identifiers and the deployed Functions base URL. Optional
`EXPO_PUBLIC_PAIRING_URL` controls the companion pairing URL. `EXPO_PUBLIC_*`
values are embedded in the app and visible to users; never put private backend
credentials in them. The TV must reach the API over the network. `localhost`
means the TV itself. Backend and companion deployments are separate from this
APK; see their linked READMEs in the repository guide.

The tracked toolchain plugin keeps Gradle **9.3.1** and daemon **Java 17** through
prebuilds. `android/gradle/gradle-daemon-jvm.properties` overrides `JAVA_HOME` for
the daemon; stale `toolchainVersion=25` causes Java 25 errors such as
`Unsupported class file major version 69`. Use the wrapper and JDK 17 in Android
Studio's Gradle settings as well. Do not downgrade this wrapper to Gradle 8.11;
the installed Android Gradle Plugin requires at least 8.13.

## 2. Configure private signing once

For a new signing identity:

```powershell
npm run android:signing:init
```

The script creates a 3072-bit RSA key valid for 10,000 days, a random password,
and these **ignored local files**:

| File | Purpose |
| --- | --- |
| `.release/upload.jks` | Private keystore, alias `homescreen-upload` |
| `.release/signing.properties` | Keystore path and passwords, read only by Gradle |
| `.release/upload-certificate.pem` | Public certificate, suitable for Play Console when requested |

Passwords are passed to keytool through environment variables and are not printed
or placed in command arguments. The directory's Windows permissions restrict it
to your account and SYSTEM. The properties file contains plaintext credentials:
keep the directory private, and make an encrypted backup of the keystore and
properties outside this checkout. Keep that backup in a safe location/password
manager. Git ignores these files; cloning the repository does not restore them.
Never delete or regenerate a key used by installed apps or registered in Play
Console. The setup command refuses to overwrite existing files.

**Already published or already using a private key?** Import/restore that key
instead of generating another. Create `.release/signing.properties` locally:

```properties
STORE_FILE=C:/private-keys/homescreen-upload.jks
STORE_PASSWORD=your-existing-store-password
KEY_ALIAS=your-existing-alias
KEY_PASSWORD=your-existing-key-password
```

Paths may be absolute or relative to `HomeScreen`; use forward slashes. This is
a Java properties file: escape backslashes/special characters in manually entered
values as required. Do not copy these example passwords. For CI or another
credential store, these environment variables override the corresponding local
properties: `HOMESCREEN_RELEASE_STORE_FILE`, `HOMESCREEN_RELEASE_STORE_PASSWORD`,
`HOMESCREEN_RELEASE_KEY_ALIAS`, and `HOMESCREEN_RELEASE_KEY_PASSWORD`. Set them
through your secret manager; do not commit secrets or put them in command history.

The tracked `withReleaseSigning` Expo plugin configures release signing on every
prebuild. Missing credentials, missing keys, invalid certificates, and Android
debug certificates stop normal release builds, including direct Gradle builds.
Debug builds still work without private release credentials. Avoid manually
editing signing inside the generated `android/` directory: it is ignored and
can be regenerated.

## 3. Assemble and verify a standalone release APK

```powershell
npm run android:release
```

The script sets `NODE_ENV=production`, reapplies the Expo plugins with
`prebuild --platform android --no-clean --no-install`, validates signing,
runs `:app:assembleRelease`, and verifies the APK with `apksigner`.
The output is:

```text
HomeScreen/android/app/build/outputs/apk/release/app-release.apk
```

All four default ABIs are included: `armeabi-v7a`, `arm64-v8a`, `x86`, and
`x86_64`. For a faster device-specific test, first query the TV's ABI list (after
connecting it as described below):

```powershell
adb -s 192.168.1.103:5555 shell getprop ro.product.cpu.abilist
# This Sony BRAVIA reports armeabi-v7a,armeabi (32-bit Android 11).
npm run android:release -- -Architectures armeabi-v7a
# For a different TV supporting both ARM ABIs:
npm run android:release -- -Architectures armeabi-v7a,arm64-v8a
```

Do not assume a TV's CPU hardware means its installed Android system accepts
64-bit apps. Use the reported ABI. Store bundles always retain all default ABIs.

You can independently verify the signature and package:

```powershell
$apk = '.\android\app\build\outputs\apk\release\app-release.apk'
& "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat" verify --verbose --print-certs $apk
& "$env:ANDROID_HOME\build-tools\36.0.0\aapt.exe" dump badging $apk
```

The certificate should identify `CN=HomeScreen Upload` for the generated key,
not `CN=Android Debug`. Check `versionCode`, SDK versions, ABIs, and that badging
does not report `application-debuggable`.

To use Gradle directly after prebuild, with the environment set as above:

```powershell
$env:NODE_ENV = 'production'
npx expo prebuild --platform android --no-clean --no-install --skip-dependency-update react-native,react
Push-Location android
try {
    .\gradlew.bat :app:validateHomeScreenReleaseSigning :app:assembleRelease --console=plain
} finally {
    Pop-Location
}
```

For an internal APK only, `npm run android:release -- -AllowDebugSigning` permits
the existing debug key **if private credentials are absent**. Once configured,
private signing still takes priority. Debug-signed builds are not store releases;
the bundle command rejects that option. This fallback can preserve updates to a
debug-installed app when using its exact original debug keystore.

## 4. Connect the TV over the network

Put the TV and computer on the same trusted LAN (Ethernet or Wi-Fi). On the TV,
open Settings → About and select Build repeatedly to enable Developer options.
Enable debugging; exact names vary by TV firmware. Find its IP in Network settings.
Keep the TV awake and approve this computer's authorization prompt on the TV.

### Sony/older TV with network ADB on port 5555

This checkout's connected Sony BRAVIA was found at `192.168.1.103:5555` on
October 6, 2026. Its address can change; substitute the current address.

```powershell
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
$tv = '192.168.1.103:5555'
& $adb connect $tv
& $adb devices -l
& $adb -s $tv get-state
```

The TV must appear with state `device`, not `unauthorized` or `offline`. Some
TVs enable TCP ADB with the debugging switch; others require an initial USB
connection. If your TV supports USB ADB but does not expose a network-debugging
switch, authorize it over USB, then run:

```powershell
# Replace USB_SERIAL with the USB-connected TV from adb devices -l.
& $adb -s USB_SERIAL tcpip 5555
& $adb connect $tv
```

You can then disconnect USB. Some TVs' USB ports do not support this mode; use
the manufacturer's supported developer connection procedure. Enabling port 5555
may need repeating after a reboot.

### TV with Wireless debugging and a pairing code

Where supported, use Developer options → Wireless debugging → Pair using pairing
code. Android's documented pairing workflow requires Android 13+ for TV, and
firmware must expose the setting. Use the **pairing port** from the pairing dialog
and the separate **connection port** from the main Wireless debugging screen:

```powershell
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
& $adb pair 192.168.1.103:PAIRING_PORT
# Enter the TV's pairing code at the prompt.
$tv = '192.168.1.103:CONNECTION_PORT'
& $adb connect $tv
& $adb devices -l
```

Do not use the pairing port for installation. Port 5555 is not the default for
this pairing workflow. See the [official ADB connection guide](https://developer.android.com/tools/adb)
for supported modes. Keep ADB on a trusted LAN, and turn TV debugging off after testing.

## 5. Install, launch, and test

From `HomeScreen`, after connecting and setting `$adb` and `$tv`:

```powershell
$apk = '.\android\app\build\outputs\apk\release\app-release.apk'
& $adb -s $tv install -r $apk
# Continue only after installation reports Success.
& $adb -s $tv shell am force-stop com.anonymous.mytvapp
& $adb -s $tv shell am start -n com.anonymous.mytvapp/.MainActivity
& $adb -s $tv shell dumpsys package com.anonymous.mytvapp |
    Select-String 'versionCode=|versionName=|pkgFlags='
```

`-r` replaces the app while retaining data **only when the package and signing
certificate match**. The current package is `com.anonymous.mytvapp`. A debug
installation cannot be updated by a privately signed APK with a different key.

If installation reports `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, decide whether you
can lose the existing app's TV session, local preferences, and local Continue
Watching choices. Only after making that decision:

```powershell
# DESTRUCTIVE: removes HomeScreen and its local data; re-pair afterward.
& $adb -s $tv uninstall com.anonymous.mytvapp
& $adb -s $tv install $apk
& $adb -s $tv shell am start -n com.anonymous.mytvapp/.MainActivity
```

Cloud appearance stored on the account remains on the server, but the new app
needs pairing. Do not uninstall automatically as a troubleshooting step. There
is no reliable general-purpose ADB backup of modern apps' private/SecureStore data.

Test without Metro: cold launch, pair/sign in, restart the TV, confirm the session
persists, navigate all cards/settings with D-pad and Back, open favorite apps,
exercise companion synchronization/photos, inspect Continue Watching access,
and preview ambient mode. Also test network loss/recovery and leaving the app
open for an extended session.

To collect diagnostics:

```powershell
# Crash history (may include other apps' crashes):
& $adb -s $tv logcat -b crash -d
# Live logs for the running app; Ctrl+C stops watching:
$appPid = (& $adb -s $tv shell pidof -s com.anonymous.mytvapp).Trim()
if ($appPid) { & $adb -s $tv logcat "--pid=$appPid" }
& $adb disconnect $tv
```

Avoid sharing logs containing account information or tokens.

| Problem | Next action |
| --- | --- |
| `unauthorized` | Approve the TV prompt; if necessary revoke authorizations on TV and reconnect. |
| Connection refused/timeout | Recheck TV IP, debugging switch/port, same LAN, and firewall or guest-network isolation. |
| `offline` | Disconnect/reconnect; wake or reboot TV. Restart ADB if needed, noting it affects other devices. |
| `INSTALL_FAILED_NO_MATCHING_ABIS` | Query `ro.product.cpu.abilist`; rebuild with the matching ABI or the default universal APK. |
| `INSTALL_FAILED_VERSION_DOWNGRADE` | Increment `expo.android.versionCode`, rebuild, and install; do not use downgrade flags as the normal workflow. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Signing mismatch; preserve the existing app or consciously uninstall/re-pair. |
| App tries to reach Metro | A debug/development APK was installed. Use the release output and verify `DEBUGGABLE` is absent. |
| SDK/JDK/Gradle error | Check the explicit JDK path, installed SDK packages, and daemon JVM criteria. Warnings alone are not a failed build. |

## 6. Build an official Google Play TV bundle

Before the first public release, decide the permanent `expo.android.package` in
`app.json`. `com.anonymous.mytvapp` is currently a development-style identifier;
choose an identifier you own before creating the Play app. A package ID cannot
be changed on an existing Play listing, and changing it creates a separate app
on the TV. No package rename is required for today's private TV test.

Set `expo.version` for the human-readable version, and increase
`expo.android.versionCode` for every Play upload (currently `1`). Example:

```json
"version": "1.0.1",
"android": {
  "package": "your.permanent.package",
  "versionCode": 2
}
```

This is a partial example: retain the other Android fields and plugins.
Build with the configured private key:

```powershell
npm run android:bundle
# Output: android/app/build/outputs/bundle/release/app-release.aab
& "$env:JAVA_HOME\bin\jarsigner.exe" -verify -verbose -certs .\android\app\build\outputs\bundle\release\app-release.aab
```

The command runs `:app:bundleRelease` and verifies the JAR signature. Self-signed
certificate/trust-chain and timestamp warnings are expected for an Android upload
key. The signature must still verify. Build success is not Play approval.

1. Create/verify your Google Play developer account and create the app with its
   permanent package. Enroll in **Play App Signing**. The local key can serve as
   the **upload key**; Google can manage a separate **app signing key**.
2. Complete the store listing, support contact, privacy policy, Data safety,
   content rating, ads/audience declarations, app-access review instructions,
   and any applicable health/fitness or sensitive-data declarations. Describe
   actual Firebase, Google account, Calendar, Tasks, Fit, Sheets, and Photos usage.
   Provide working review access through the pairing flow. Complete applicable
   account-deletion requirements and Google OAuth verification for requested scopes.
   Confirm connected Google APIs/scopes remain available for production.
3. Review release-manifest permissions and remove unused storage/overlay permissions
   through tracked Expo configuration/plugins before submission. Ensure assets
   and prototype/movie artwork are licensed for public distribution.
4. Upload the signed AAB to **internal testing**, configure Android TV distribution
   and its TV listing/track in Play Console, and add TV screenshots, launcher icon,
   and readable localized banner artwork. Validate D-pad focus, Back navigation,
   landscape layout, leanback launch entry, and touchscreen-not-required flags
   against the [TV quality checklist](https://developer.android.com/training/tv/publishing/checklist)
   and [TV distribution guide](https://developer.android.com/training/tv/publishing/distribute).
5. Test a Play-installed build on a TV before production. When Google uses a
   different app signing key, Play APKs cannot update the locally upload-key-signed
   APK in place. Plan an uninstall/re-pair transition, or supply your own app signing
   key during initial Play enrollment if you intentionally need one identity across
   channels. Add Play's signing-certificate fingerprints to API providers that
   require them; local upload-key fingerprints alone are insufficient.
6. Complete any account-specific closed-testing requirement, apply for production
   access where needed, resolve Play/TV review findings, then create and roll out
   the production release. Public distribution requires these Console actions;
   this repository setup does not submit the app.

Current requirements checked **October 6, 2026**: Android TV submissions require
target API **34+**; this app targets **36**. Since August 1, 2026, TV apps must
support **64-bit architectures and 16 KB page sizes**. The bundle command includes
64-bit ABIs, but every native library still needs alignment and runtime validation.
Do not upload a 32-bit-only TV test APK as the official release. See
[target API policy](https://support.google.com/googleplay/android-developer/answer/11926878)
and the [TV distribution requirements](https://developer.android.com/training/tv/publishing/distribute).

For 16 KB checks, verify APK zip alignment, inspect each native library's ELF
alignment, inspect the bundle's alignment configuration with Google's bundletool,
and run on a 16 KB emulator/device. The existing NDK r27 toolchain alone does not
prove that every native dependency is compliant. Follow the
[16 KB validation guide](https://developer.android.com/guide/practices/page-sizes).
For example (obtain `bundletool.jar` from the official release linked in that guide):

```powershell
& "$env:ANDROID_HOME\build-tools\36.0.0\zipalign.exe" -c -P 16 -v 4 .\android\app\build\outputs\apk\release\app-release.apk
& "$env:JAVA_HOME\bin\java.exe" -jar C:\tools\bundletool.jar dump config --bundle=.\android\app\build\outputs\bundle\release\app-release.aab |
    Select-String 'alignment'
# Expect PAGE_ALIGNMENT_16K; this alone does not verify ELF/runtime compatibility.
```

Personal Play developer accounts created after November 13, 2023 currently need
at least **12 opted-in closed testers for 14 continuous days** before applying
for production access. Internal testing does not replace that requirement. Check
your Console for account-specific requirements and future policy changes. See
[Google's testing policy](https://support.google.com/googleplay/android-developer/answer/14151465).

The [Android signing guide](https://developer.android.com/studio/publish/app-signing)
explains upload keys, app signing keys, backup, and key-reset procedures. Preserve
your signing backups and permanent package identity before releasing to users.
