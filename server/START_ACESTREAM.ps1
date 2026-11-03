param([string]$EngineExe='')
$ErrorActionPreference='Stop'
if(-not $EngineExe){
    $candidates=@((Join-Path $env:APPDATA 'ACEStream\engine\ace_engine.exe'))
    $reg=Get-ItemProperty -LiteralPath 'HKCU:\Software\ACEStream' -ErrorAction SilentlyContinue
    if($reg -and $reg.InstallDir){$candidates+=Join-Path $reg.InstallDir 'engine\ace_engine.exe'}
    $EngineExe=$candidates | Where-Object {Test-Path -LiteralPath $_} | Select-Object -First 1
}
if(-not $EngineExe -or -not (Test-Path -LiteralPath $EngineExe)){throw 'Install Ace Stream from the official Products page first. See README_UA.md; or pass -EngineExe with the installed ace_engine.exe path.'}
$running=Get-Process -Name ace_engine,ace_console -ErrorAction SilentlyContinue
if(-not $running){Start-Process -FilePath $EngineExe -WindowStyle Hidden | Out-Null}
for($attempt=0;$attempt -lt 10;$attempt++){
    try{$info=Invoke-RestMethod 'http://127.0.0.1:6878/webui/api/service?method=get_version' -TimeoutSec 2;Write-Host ('AceStream API ready. '+($info.result.version));exit 0}catch{Start-Sleep -Seconds 2}
}
throw 'Engine started but its localhost HTTP API on 6878 did not respond. Check AceStream tray/settings and firewall; do not expose 6878 to the Internet.'
