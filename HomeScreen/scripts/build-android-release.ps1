param(
    [string]$JdkPath = $env:JAVA_HOME,
    [ValidatePattern('^(armeabi-v7a|arm64-v8a|x86|x86_64)(,(armeabi-v7a|arm64-v8a|x86|x86_64))*$')]
    [string]$Architectures,
    [switch]$AllowDebugSigning
)

$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
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
Push-Location $appRoot
try {
    $env:JAVA_HOME = $JdkPath
    $env:Path = (Join-Path $JdkPath 'bin') + ';' + $env:Path
    $env:NODE_ENV = 'production'

    # Reapply tracked config plugins without deleting the native project.
    & npx.cmd expo prebuild --platform android --no-clean --no-install --skip-dependency-update react-native,react
    if ($LASTEXITCODE -ne 0) { throw 'Expo Android prebuild failed.' }

    $releaseGradlePath = Join-Path $appRoot 'android\app\build.gradle'
    $releaseGradleSource = Get-Content -LiteralPath $releaseGradlePath -Raw
    if ($releaseGradleSource -match '(?s)\brelease\s*\{[^{}]*?\bsigningConfig\s+signingConfigs\.debug\b' -and -not $AllowDebugSigning) {
        throw 'Release builds currently use the public Android debug key. Configure private production signing before building for distribution. Use -AllowDebugSigning only for an internal test APK.'
    }
    if ($AllowDebugSigning) { Write-Warning 'Internal test build: debug signing is allowed. Do not distribute this APK publicly.' }

    Push-Location (Join-Path $appRoot 'android')
    try {
        & .\gradlew.bat --version
        if ($LASTEXITCODE -ne 0) { throw 'Gradle could not start.' }
        $gradleArgs = @(':app:assembleRelease', '--console=plain', '--stacktrace')
        if ($Architectures) { $gradleArgs += "-PreactNativeArchitectures=$Architectures" }
        & .\gradlew.bat @gradleArgs
        if ($LASTEXITCODE -ne 0) { throw 'Android release build failed; see the Gradle error above.' }
    } finally {
        Pop-Location
    }
    $apk = Join-Path $appRoot 'android\app\build\outputs\apk\release\app-release.apk'
    if (-not (Test-Path -LiteralPath $apk)) { throw "Build finished without the expected APK: $apk" }
    Write-Host "Release APK: $apk"
} finally {
    $env:JAVA_HOME = $previousJava
    $env:Path = $previousPath
    $env:NODE_ENV = $previousNodeEnv
    Pop-Location
}
