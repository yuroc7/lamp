param([string]$InstallDir='C:\Y7SportBridge')
$ErrorActionPreference='Stop'
$task=Get-ScheduledTask -TaskName 'Y7 Sport Bridge' -ErrorAction SilentlyContinue
if($task){
    $expected=Join-Path ([IO.Path]::GetFullPath($InstallDir)) 'y7_sport_bridge.py'
    if(@($task.Actions | Where-Object {$_.Arguments -like ('*'+$expected+'*')}).Count -ne 1){throw 'Task points elsewhere. No change made.'}
    $configPath=Join-Path $InstallDir 'bridge-config.json'
    if(Test-Path -LiteralPath $configPath){
        $config=Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
        try{Invoke-RestMethod -Uri ('http://'+$config.listen_host+':'+$config.listen_port+'/api/stop-all') -Method Post -Body '{}' -ContentType 'application/json' -Headers @{Authorization=('Bearer '+$config.access_key)} -TimeoutSec 8 | Out-Null}catch{Write-Host 'Bridge did not acknowledge stop-all; stop any remaining AceStream playback manually.'}
    }
    Stop-ScheduledTask -TaskName 'Y7 Sport Bridge'
    Unregister-ScheduledTask -TaskName 'Y7 Sport Bridge' -Confirm:$false
}
Get-NetFirewallRule -DisplayName 'Y7 Sport Bridge LAN 9122' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
Write-Host 'Sport Bridge task/firewall rule removed. Files, private key, backups, AceStream, Lampac and Gateway retained.'
Write-Host 'To restore the previous bridge: copy y7_sport_bridge.py from its timestamped backups folder, then rerun INSTALL_SERVER.ps1 from the matching prior package.'
