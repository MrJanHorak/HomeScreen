param([string]$JdkPath = $env:JAVA_HOME)

$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
if (-not $JdkPath) { throw 'Set JAVA_HOME to your JDK directory, or supply -JdkPath.' }
$keytool = Join-Path $JdkPath 'bin\keytool.exe'
if (-not (Test-Path -LiteralPath $keytool)) { throw 'Set JAVA_HOME to your JDK directory, or supply -JdkPath.' }
$signingDir = Join-Path $appRoot '.release'
$keystore = Join-Path $signingDir 'upload.jks'
$properties = Join-Path $signingDir 'signing.properties'
if ((Test-Path -LiteralPath $keystore) -or (Test-Path -LiteralPath $properties)) {
    throw 'Signing files already exist. Keep your existing key; this script will not overwrite it. See RELEASE.md for importing or restoring credentials.'
}

New-Item -ItemType Directory -Path $signingDir -Force | Out-Null
# Restrict this private directory to the current Windows account and SYSTEM.
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = [System.IO.Directory]::GetAccessControl($signingDir)
$acl.SetAccessRuleProtection($true, $false)
foreach ($existingRule in @($acl.Access)) { $acl.RemoveAccessRuleSpecific($existingRule) }
foreach ($sid in @($identity, [System.Security.Principal.SecurityIdentifier]'S-1-5-18')) {
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'ContainerInherit, ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
}
[System.IO.Directory]::SetAccessControl($signingDir, $acl)

$randomBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($randomBytes) } finally { $rng.Dispose() }
$password = ([System.BitConverter]::ToString($randomBytes)).Replace('-', '').ToLowerInvariant()
$previousPassword = $env:HOMESCREEN_KEYTOOL_PASSWORD
try {
    # Environment indirection keeps the password out of command arguments and logs.
    $env:HOMESCREEN_KEYTOOL_PASSWORD = $password
    & $keytool -genkeypair -noprompt -storetype JKS -keystore $keystore -alias homescreen-upload -keyalg RSA -keysize 3072 -sigalg SHA256withRSA -validity 10000 -dname 'CN=HomeScreen Upload' -storepass:env HOMESCREEN_KEYTOOL_PASSWORD -keypass:env HOMESCREEN_KEYTOOL_PASSWORD
    if ($LASTEXITCODE -ne 0) { throw 'Release key generation failed. No signing.properties was written.' }
    @(
        '# Private local credentials. Back up together with upload.jks; never commit.'
        'STORE_FILE=.release/upload.jks'
        "STORE_PASSWORD=$password"
        'KEY_ALIAS=homescreen-upload'
        "KEY_PASSWORD=$password"
    ) | Set-Content -LiteralPath $properties -Encoding ASCII
    & $keytool -exportcert -rfc -keystore $keystore -alias homescreen-upload -file (Join-Path $signingDir 'upload-certificate.pem') -storepass:env HOMESCREEN_KEYTOOL_PASSWORD
    if ($LASTEXITCODE -ne 0) { throw 'Key exists, but public certificate export failed.' }
    Write-Host "Private signing configured in $signingDir. Back up this directory securely before publishing."
} finally {
    $env:HOMESCREEN_KEYTOOL_PASSWORD = $previousPassword
    $password = $null
}
