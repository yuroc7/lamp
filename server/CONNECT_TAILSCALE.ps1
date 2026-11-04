param([string]$InstallDir='C:\Y7SportBridge')
$ErrorActionPreference='Stop'
$package=Split-Path -Parent $MyInvocation.MyCommand.Path
$admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(-not $admin){throw 'Run CONNECT_TAILSCALE.cmd as Administrator under the same Windows account used to install Sport Bridge.'}
$InstallDir=[IO.Path]::GetFullPath($InstallDir)
$configPath=Join-Path $InstallDir 'bridge-config.json'
if(-not (Test-Path -LiteralPath $configPath)){throw 'Bridge configuration not found. Run INSTALL_SERVER.cmd first. START_ACESTREAM does not create a Bridge key.'}
$python=(Get-Command python.exe -ErrorAction Stop).Source
$tailscale=(Get-Command tailscale.exe -ErrorAction Stop).Source
$validator=Join-Path $package 'tailscale_config.py'
if(-not (Test-Path -LiteralPath $validator)){throw 'Extract the entire ZIP; tailscale_config.py is required.'}
$config=Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
if($config.listen_host -notin @('10.2.4.44','127.0.0.1') -or $config.listen_port -ne 9122 -or ([string]$config.access_key).Length -lt 32){throw 'Existing Bridge address, port or key differs from the reviewed setup. No change made.'}
$task=Get-ScheduledTask -TaskName 'Y7 Sport Bridge' -ErrorAction Stop
$expected=Join-Path $InstallDir 'y7_sport_bridge.py'
if(@($task.Actions | Where-Object {$_.Arguments -like ('*'+$expected+'*')}).Count -ne 1){throw 'Scheduled task points elsewhere. No change made.'}
function Read-Serve([string]$Path){
    $raw=& $tailscale serve status --json
    if($LASTEXITCODE -ne 0){throw 'Could not read Tailscale serve status.'}
    [IO.File]::WriteAllText($Path,($raw -join "`n"),[Text.UTF8Encoding]::new($false))
}
function Check-Topology([string]$Before,[string]$After=''){
    $params=@($validator,'--before',$Before)
    if($After){$params+=@('--after',$After)}
    $result=& $python @params
    if($LASTEXITCODE -ne 0){throw ($result -join "`n")}
    return ($result -join "`n" | ConvertFrom-Json)
}
function Wait-Bridge([string]$Base){
    for($i=0;$i -lt 12;$i++){
        try{$health=Invoke-RestMethod -Uri ($Base+'/health') -TimeoutSec 2;if($health.ok){return}}catch{}
        Start-Sleep -Milliseconds 500
    }
    throw 'Bridge did not respond after restart.'
}
function Wait-Stopped(){
    for($i=0;$i -lt 24;$i++){
        if((Get-ScheduledTask -TaskName 'Y7 Sport Bridge').State -notin @('Running','Queued')){return}
        Start-Sleep -Milliseconds 250
    }
    throw 'Sport Bridge task did not stop. No unrelated process was killed.'
}
function Assert-FunnelPathSupport([string]$Executable){
    # Native CLIs may print valid help on stderr and return a non-zero help
    # exit code. Read both streams without PowerShell 5.1 NativeCommandError
    # conversion; actual configuration commands still require exit code zero.
    $start=[Diagnostics.ProcessStartInfo]::new()
    $start.FileName=$Executable
    $start.Arguments='funnel --help'
    $start.UseShellExecute=$false
    $start.CreateNoWindow=$true
    $start.WindowStyle=[Diagnostics.ProcessWindowStyle]::Hidden
    $start.RedirectStandardOutput=$true
    $start.RedirectStandardError=$true
    $process=[Diagnostics.Process]::new()
    $process.StartInfo=$start
    try{
        if(-not $process.Start()){throw 'Could not start Tailscale help probe.'}
        $stdout=$process.StandardOutput.ReadToEndAsync()
        $stderr=$process.StandardError.ReadToEndAsync()
        if(-not $process.WaitForExit(10000)){$process.Kill();throw 'Tailscale help probe timed out.'}
        $helpText=$stdout.GetAwaiter().GetResult()+"`n"+$stderr.GetAwaiter().GetResult()
        if($helpText -notmatch '(?m)^\s*--set-path(?:\s|=|,|$)'){throw 'Tailscale help did not advertise --set-path. No network settings changed.'}
    }finally{$process.Dispose()}
}
$backup=Join-Path $InstallDir ('backups\tailscale-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$before=Join-Path $backup 'serve-before.json'
Read-Serve $before
$topology=Check-Topology $before
Assert-FunnelPathSupport $tailscale
Copy-Item -LiteralPath $configPath -Destination (Join-Path $backup 'bridge-config.before.json')
$base='http://'+$config.listen_host+':9122'
$health=Invoke-RestMethod -Uri ($base+'/health') -TimeoutSec 5
if(-not $health.ok){throw 'Bridge is not healthy before configuration. Run CHECK_SERVER.cmd.'}
$oldHost=$config.listen_host
$changedBridge=$false
$attemptedMount=$false
try{
    if($oldHost -ne '127.0.0.1'){
        Invoke-RestMethod -Uri ($base+'/api/stop-all') -Method Post -Body '{}' -ContentType 'application/json' -Headers @{Authorization=('Bearer '+$config.access_key)} -TimeoutSec 8 | Out-Null
        Stop-ScheduledTask -TaskName 'Y7 Sport Bridge'
        $changedBridge=$true
        Wait-Stopped
        $config.listen_host='127.0.0.1'
        [IO.File]::WriteAllText($configPath,($config | ConvertTo-Json -Depth 32)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
        Start-ScheduledTask -TaskName 'Y7 Sport Bridge'
        Wait-Bridge 'http://127.0.0.1:9122'
    }
    # Use FUNNEL, not SERVE: the existing HTTPS:443 listener is public.
    # Only this new path is touched; root and HTTPS:8443 stay as they were.
    if(-not $topology.mount_present){
        $attemptedMount=$true
        & $tailscale funnel --bg --https=443 --set-path=/sport-bridge/ http://127.0.0.1:9122
        if($LASTEXITCODE -ne 0){throw 'Could not add the Sport Funnel path.'}
    }
    $after=Join-Path $backup 'serve-after.json'
    Read-Serve $after
    $verified=Check-Topology $before $after
    $public=$verified.public_url
    Write-Host ('Checking HTTPS route: '+$public)
    $publicOK=$false
    for($i=0;$i -lt 5;$i++){
        try{
            $external=Invoke-RestMethod -Uri ($public+'/health') -TimeoutSec 5
            if($external.ok){$publicOK=$true;break}
        }catch{}
        Start-Sleep -Seconds 1
    }
    if(-not $publicOK){throw 'Public HTTPS health check failed. The new path will be removed and the previous Bridge address restored.'}
    $authCheck=Invoke-RestMethod -Uri ($public+'/api/check') -Method Post -Body '{}' -ContentType 'application/json' -Headers @{Authorization=('Bearer '+$config.access_key)} -TimeoutSec 12
    if(-not $authCheck.ok){throw 'Authenticated public API check failed.'}
    $denied=$false
    try{Invoke-WebRequest -UseBasicParsing -Uri ($public+'/api/check') -Method Post -Body '{}' -ContentType 'application/json' -TimeoutSec 8 | Out-Null}catch{
        if($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401){$denied=$true}
    }
    if(-not $denied){throw 'The public API did not reject an unauthenticated request.'}
    $record=[ordered]@{backup=$backup;public_url=$public;mount_added=$attemptedMount;bridge_host_before=$oldHost;checked_at=[DateTime]::UtcNow.ToString('o')}
    $recordPath=Join-Path $InstallDir 'tailscale-sport.json'
    # Keep the first activation record for an idempotent re-check, so rollback
    # still knows that this installer originally added the mount.
    $keepRecord=$false
    if($topology.mount_present -and (Test-Path -LiteralPath $recordPath)){
        $prior=Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
        $keepRecord=($prior.public_url -eq $public -and (Test-Path -LiteralPath (Join-Path $prior.backup 'serve-before.json')))
    }
    if(-not $keepRecord){[IO.File]::WriteAllText($recordPath,($record | ConvertTo-Json)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))}
    Copy-Item -LiteralPath $validator -Destination (Join-Path $InstallDir 'tailscale_config.py') -Force
    Write-Host ''
    Write-Host 'SUCCESS: existing root Gateway route and private HTTPS:8443 preserved.'
    Write-Host ('Lampa Sport server address: '+$public)
    Write-Host ('Private access_key remains in: '+$configPath)
    Write-Host ('AceStream available: '+[bool]$authCheck.engine.available)
    Write-Host ('Private backup: '+$backup)
}catch{
    $failure=$_.Exception.Message
    $rollbackOK=$true
    if($attemptedMount){
        & $tailscale funnel --https=443 --set-path=/sport-bridge/ off
        if($LASTEXITCODE -ne 0){$rollbackOK=$false}
    }
    if($changedBridge){
        try{
            Stop-ScheduledTask -TaskName 'Y7 Sport Bridge'
            Wait-Stopped
            Copy-Item -LiteralPath (Join-Path $backup 'bridge-config.before.json') -Destination $configPath -Force
            Start-ScheduledTask -TaskName 'Y7 Sport Bridge'
            Wait-Bridge ('http://'+$oldHost+':9122')
        }catch{$rollbackOK=$false}
    }
    try{
        $restored=Join-Path $backup 'serve-after-automatic-rollback.json'
        Read-Serve $restored
        $verifyArgs=@($validator,'--before',$before,'--after',$restored)
        if(-not $topology.mount_present){$verifyArgs+='--removed'}
        & $python @verifyArgs | Out-Null
        if($LASTEXITCODE -ne 0){$rollbackOK=$false}
    }catch{$rollbackOK=$false}
    Write-Host ('Private backup: '+$backup)
    if(-not $rollbackOK){Write-Host 'Automatic rollback needs attention; inspect the private backup and tailscale serve status.'}
    throw $failure
}
