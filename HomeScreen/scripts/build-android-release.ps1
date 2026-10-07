param(
    [string]$JdkPath = $env:JAVA_HOME,
    [ValidatePattern('^(armeabi-v7a|arm64-v8a|x86|x86_64)(,(armeabi-v7a|arm64-v8a|x86|x86_64))*$')]
    [string]$Architectures,
    [ValidateSet('apk', 'aab')]
    [string]$Artifact = 'apk',
    [switch]$AllowDebugSigning
)

$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
if ($Artifact -eq 'aab' -and ($AllowDebugSigning -or $Architectures)) {
    throw 'Store bundles must use private signing and all default architectures. Omit -AllowDebugSigning and -Architectures.'
}
if (-not $JdkPath -or -not (Test-Path -LiteralPath (Join-Path $JdkPath 'bin\javac.exe'))) {
    throw 'Set JAVA_HOME to an installed JDK 17, or supply -JdkPath with its directory.'
}
$jdkRelease = Get-Content -LiteralPath (Join-Path $JdkPath 'release') -Raw
if ($jdkRelease -notmatch '(?m)^JAVA_VERSION="17[."]') {
    throw "Android builds require JDK 17. The selected installation is $JdkPath."
}

$previousJava = $env:JAVA_HOME
$previousPath = $env:Path
$previousNodeEnv = $env:NODE_ENV
$previousDebugSigning = $env:HOMESCREEN_ALLOW_DEBUG_SIGNING
Push-Location $appRoot
try {
    $env:JAVA_HOME = $JdkPath
    $env:Path = (Join-Path $JdkPath 'bin') + ';' + $env:Path
    $env:NODE_ENV = 'production'
    $env:HOMESCREEN_ALLOW_DEBUG_SIGNING = if ($AllowDebugSigning) { '1' } else { $null }

    # Reapply tracked config plugins without deleting the native project.
    & npx.cmd expo prebuild --platform android --no-clean --no-install --skip-dependency-update react-native,react
    if ($LASTEXITCODE -ne 0) { throw 'Expo Android prebuild failed.' }

    $releaseGradlePath = Join-Path $appRoot 'android\app\build.gradle'
    $releaseGradleSource = Get-Content -LiteralPath $releaseGradlePath -Raw
    if (-not $releaseGradleSource.Contains('// @generated begin homescreen-release-signing')) {
        throw 'The release signing plugin was not applied. Check app.json.'
    }
    if ($AllowDebugSigning) { Write-Warning 'Internal APK test: debug signing fallback is allowed when private signing is missing.' }

    Push-Location (Join-Path $appRoot 'android')
    try {
        & .\gradlew.bat --version
        if ($LASTEXITCODE -ne 0) { throw 'Gradle could not start.' }
        & .\gradlew.bat :app:validateHomeScreenReleaseSigning --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'Release signing validation failed; see RELEASE.md.' }
        $task = if ($Artifact -eq 'aab') { ':app:bundleRelease' } else { ':app:assembleRelease' }
        $gradleArgs = @($task, '--console=plain', '--stacktrace')
        if ($Architectures) { $gradleArgs += "-PreactNativeArchitectures=$Architectures" }
        & .\gradlew.bat @gradleArgs
        if ($LASTEXITCODE -ne 0) { throw 'Android release build failed; see the Gradle error above.' }
    } finally {
        Pop-Location
    }
    $outputRelative = if ($Artifact -eq 'aab') { 'bundle\release\app-release.aab' } else { 'apk\release\app-release.apk' }
    $outputFile = Join-Path $appRoot "android\app\build\outputs\$outputRelative"
    if (-not (Test-Path -LiteralPath $outputFile)) { throw "Build finished without the expected artifact: $outputFile" }
    if ($Artifact -eq 'apk') {
        $sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
        $apksigner = Join-Path $sdkRoot 'build-tools\36.0.0\apksigner.bat'
        & $apksigner verify --verbose --print-certs $outputFile
        if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    } else {
        $verification = & (Join-Path $JdkPath 'bin\jarsigner.exe') '-J-Duser.language=en' -verify $outputFile
        $verification | Write-Host
        if ($LASTEXITCODE -ne 0 -or ($verification -join "`n") -notmatch 'jar verified\.') {
            throw 'App bundle signature verification failed or the bundle is unsigned.'
        }
    }
    Write-Host "Release artifact: $outputFile"
} finally {
    $env:JAVA_HOME = $previousJava
    $env:Path = $previousPath
    $env:NODE_ENV = $previousNodeEnv
    $env:HOMESCREEN_ALLOW_DEBUG_SIGNING = $previousDebugSigning
    Pop-Location
}
