param([string]$InstallDir='C:\Y7SportBridge',[string]$ServerIP='10.2.4.44',[string]$AllowedClients='LocalSubnet')
$ErrorActionPreference='Stop'
$source=Split-Path -Parent $MyInvocation.MyCommand.Path
$taskName='Y7 Sport Bridge'
# Run this package on the actual Windows media server. No Lampac/Gateway files
# are opened, copied or restarted by this installer.
if(-not (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -eq $ServerIP})) {throw "This computer does not own $ServerIP. Run on the media server."}
$admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(-not $admin){throw 'Open PowerShell as Administrator under the same Windows account used for AceStream.'}
$InstallDir=[IO.Path]::GetFullPath($InstallDir)
if($InstallDir -eq [IO.Path]::GetPathRoot($InstallDir) -or $InstallDir -match '(?i)K2LampacSecure|\\Windows(?:\\|$)'){throw 'Use a separate folder, for example C:\Y7SportBridge.'}
$python=(Get-Command python.exe -ErrorAction Stop).Source
& $python -c 'import sys; assert sys.version_info >= (3,11), "Python 3.11+ required"'
if($LASTEXITCODE -ne 0){throw 'Install Python 3.11+ from python.org, then retry.'}
$pythonw=Join-Path (Split-Path -Parent $python) 'pythonw.exe'
if(-not (Test-Path -LiteralPath $pythonw)){throw 'pythonw.exe missing. Use the standard python.org Windows installation.'}
$existingTask=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if($existingTask){
    $expected=Join-Path $InstallDir 'y7_sport_bridge.py'
    if(@($existingTask.Actions | Where-Object {$_.Arguments -like ('*'+$expected+'*')}).Count -ne 1){throw 'Existing task points elsewhere. Inspect before changing it.'}
    $oldConfigPath=Join-Path $InstallDir 'bridge-config.json'
    if(Test-Path -LiteralPath $oldConfigPath){
        $oldConfig=Get-Content -Raw -LiteralPath $oldConfigPath | ConvertFrom-Json
        try{Invoke-RestMethod -Uri ('http://'+$oldConfig.listen_host+':'+$oldConfig.listen_port+'/api/stop-all') -Method Post -Body '{}' -ContentType 'application/json' -Headers @{Authorization=('Bearer '+$oldConfig.access_key)} -TimeoutSec 8 | Out-Null}catch{Write-Host 'Existing bridge did not acknowledge stop-all; engine may need manual stop.'}
    }
    Stop-ScheduledTask -TaskName $taskName
    Start-Sleep -Seconds 2
}
if(Get-NetTCPConnection -LocalPort 9122 -State Listen -ErrorAction SilentlyContinue){throw 'Port 9122 is already in use. No process was killed.'}
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
$backup=Join-Path $InstallDir ('backups\'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
foreach($file in @('y7_sport_bridge.py','bridge-config.json')){if(Test-Path -LiteralPath (Join-Path $InstallDir $file)){Copy-Item -LiteralPath (Join-Path $InstallDir $file) -Destination $backup}}
Copy-Item -LiteralPath (Join-Path $source 'y7_sport_bridge.py') -Destination $InstallDir -Force
$configPath=Join-Path $InstallDir 'bridge-config.json'
if(-not (Test-Path -LiteralPath $configPath)){
    & $python (Join-Path $InstallDir 'y7_sport_bridge.py') --config $configPath --init-config
    if($LASTEXITCODE -ne 0){throw 'Could not generate private configuration.'}
    $config=Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
    $config.listen_host=$ServerIP
    [IO.File]::WriteAllText($configPath,($config | ConvertTo-Json)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
}
$config=Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
if($config.listen_host -ne $ServerIP -or $config.listen_port -ne 9122){throw 'Existing configuration has a different address/port; kept unchanged. Review manually.'}
# Protect both the live configuration and private backup from other local users.
$identity=[Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $InstallDir /inheritance:r /grant:r ($identity+':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
if($LASTEXITCODE -ne 0){throw 'Could not restrict private folder permissions.'}
$arguments='"'+(Join-Path $InstallDir 'y7_sport_bridge.py')+'" --config "'+$configPath+'"'
$action=New-ScheduledTaskAction -Execute $pythonw -Argument $arguments -WorkingDirectory $InstallDir
$trigger=New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal=New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
$ruleName='Y7 Sport Bridge LAN 9122'
if(Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue){Remove-NetFirewallRule -DisplayName $ruleName}
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalAddress $ServerIP -LocalPort 9122 -RemoteAddress $AllowedClients -Profile Private,Domain | Out-Null
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 2
$health=Invoke-RestMethod -Uri ('http://'+$ServerIP+':9122/health') -TimeoutSec 8
if(-not $health.ok){throw 'Bridge did not start. Run CHECK_SERVER.ps1 for diagnostics.'}
Write-Host ('Installed Y7 Sport Bridge '+$health.version+' at http://'+$ServerIP+':9122')
Write-Host ('Private key: open '+$configPath+' on this server; copy access_key into Lampa. Key is not printed or uploaded.')
Write-Host 'Auto-start is at this Windows account logon, not before logon. Install/run AceStream under the same account.'
Write-Host ('Private backup retained: '+$backup)
