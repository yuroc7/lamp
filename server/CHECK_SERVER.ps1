param([string]$InstallDir='C:\Y7SportBridge')
$ErrorActionPreference='Stop'
$path=Join-Path $InstallDir 'bridge-config.json'
$config=Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
$base='http://'+$config.listen_host+':'+$config.listen_port
$report=[ordered]@{checked_at=[DateTime]::UtcNow.ToString('o');bridge_url=$base}
try{$report.bridge=Invoke-RestMethod -Uri ($base+'/health') -TimeoutSec 8}catch{$report.bridge='UNREACHABLE'}
try{$report.check=Invoke-RestMethod -Uri ($base+'/api/check') -Method Post -Body '{}' -ContentType 'application/json' -Headers @{Authorization=('Bearer '+$config.access_key)} -TimeoutSec 12}catch{$report.check='CHECK_FAILED'}
$report.task=(Get-ScheduledTask -TaskName 'Y7 Sport Bridge' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty State)
$report | ConvertTo-Json -Depth 6
Write-Host 'No private access key or media address is included above.'
