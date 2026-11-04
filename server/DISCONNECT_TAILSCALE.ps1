param([string]$InstallDir='C:\Y7SportBridge')
$ErrorActionPreference='Stop'
$admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(-not $admin){throw 'Run DISCONNECT_TAILSCALE.cmd as Administrator.'}
$InstallDir=[IO.Path]::GetFullPath($InstallDir)
$recordPath=Join-Path $InstallDir 'tailscale-sport.json'
if(-not (Test-Path -LiteralPath $recordPath)){throw 'No activation record found. Existing Tailscale routes retained.'}
$record=Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
$backup=[IO.Path]::GetFullPath($record.backup)
$allowed=[IO.Path]::GetFullPath((Join-Path $InstallDir 'backups'))+[IO.Path]::DirectorySeparatorChar
if(-not $backup.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase)){throw 'Unexpected backup path. No change made.'}
$python=(Get-Command python.exe -ErrorAction Stop).Source
$tailscale=(Get-Command tailscale.exe -ErrorAction Stop).Source
$validator=Join-Path $InstallDir 'tailscale_config.py'
$current=Join-Path $backup 'serve-before-disconnect.json'
$raw=& $tailscale serve status --json
if($LASTEXITCODE -ne 0){throw 'Could not read Tailscale config.'}
[IO.File]::WriteAllText($current,($raw -join "`n"),[Text.UTF8Encoding]::new($false))
# Refuse to undo across subsequent changes to Gateway or private services.
& $python $validator --before (Join-Path $backup 'serve-before.json') --after $current
if($LASTEXITCODE -ne 0){throw 'Tailscale changed since activation. Inspect private backup before rollback.'}
# Validate local restoration before changing any route.
$configPath=Join-Path $InstallDir 'bridge-config.json'
$config=Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
if($config.listen_host -ne '127.0.0.1'){throw 'Bridge bind changed after activation. Retained for manual review.'}
if($record.bridge_host_before -notin @('127.0.0.1','10.2.4.44')){throw 'Unexpected previous bind.'}
$task=Get-ScheduledTask -TaskName 'Y7 Sport Bridge' -ErrorAction Stop
$expected=Join-Path $InstallDir 'y7_sport_bridge.py'
if(@($task.Actions | Where-Object {$_.Arguments -like ('*'+$expected+'*')}).Count -ne 1){throw 'Task points elsewhere.'}
if($record.mount_added){
    & $tailscale funnel --https=443 --set-path=/sport-bridge/ off
    if($LASTEXITCODE -ne 0){throw 'Could not remove Sport mount. No global reset was issued.'}
    $raw=& $tailscale serve status --json
    if($LASTEXITCODE -ne 0){throw 'Could not check Tailscale config after removing Sport.'}
    $after=Join-Path $backup 'serve-after-disconnect.json'
    [IO.File]::WriteAllText($after,($raw -join "`n"),[Text.UTF8Encoding]::new($false))
    & $python $validator --before (Join-Path $backup 'serve-before.json') --after $after --removed
    if($LASTEXITCODE -ne 0){throw 'Review the private Tailscale backup.'}
}
# Keep the current key and all user settings; restore only the previous bind.
if($record.bridge_host_before -ne $config.listen_host){
    try{Invoke-RestMethod -Uri 'http://127.0.0.1:9122/api/stop-all' -Method Post -Body '{}' -ContentType 'application/json' -Headers @{Authorization=('Bearer '+$config.access_key)} -TimeoutSec 8 | Out-Null}catch{}
    Stop-ScheduledTask -TaskName 'Y7 Sport Bridge'
    for($i=0;$i -lt 24 -and (Get-ScheduledTask -TaskName 'Y7 Sport Bridge').State -in @('Running','Queued');$i++){Start-Sleep -Milliseconds 250}
    if((Get-ScheduledTask -TaskName 'Y7 Sport Bridge').State -in @('Running','Queued')){throw 'Task did not stop.'}
    $config.listen_host=$record.bridge_host_before
    [IO.File]::WriteAllText($configPath,($config | ConvertTo-Json -Depth 32)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
    Start-ScheduledTask -TaskName 'Y7 Sport Bridge'
}
Move-Item -LiteralPath $recordPath -Destination (Join-Path $backup ('activation-removed-'+[guid]::NewGuid().ToString('N')+'.json'))
Write-Host 'Sport path removed if it was added by this installer. Gateway, private 8443, access_key and backups preserved.'
