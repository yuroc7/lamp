param([string]$ScratchDir='')
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
if(-not $ScratchDir){$ScratchDir=Join-Path $repo ('work\help-probe-'+[guid]::NewGuid().ToString('N'))}
New-Item -ItemType Directory -Path $ScratchDir -Force | Out-Null
$source=Join-Path $repo 'server/CONNECT_TAILSCALE.ps1'
$tokens=$null;$parseErrors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile($source,[ref]$tokens,[ref]$parseErrors)
if($parseErrors){throw 'CONNECT_TAILSCALE parse error.'}
$fn=$ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Assert-FunnelPathSupport'},$true)
if(-not $fn){throw 'Missing capability check.'}
Invoke-Expression $fn.Extent.Text
$program=@'
using System;
using System.IO;
public static class HelpFixture {
  public static int Main(string[] args) {
    if(args.Length!=2 || args[0]!="funnel" || args[1]!="--help") return 90;
    string mode=File.ReadAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"mode.txt")).Trim();
    if(mode=="stderr") { Console.Error.WriteLine("FLAGS\n  --set-path value\n        Appends a path"); return 2; }
    if(mode=="stdout") { Console.WriteLine("FLAGS\n  --set-path=value"); return 0; }
    if(mode=="missing") { Console.Error.WriteLine("FLAGS\n  --https value"); return 0; }
    Console.WriteLine("ERROR: unknown --set-path option"); return 1;
  }
}
'@
$exe=Join-Path $ScratchDir 'fake-tailscale.exe'
Add-Type -TypeDefinition $program -OutputAssembly $exe -OutputType ConsoleApplication
foreach($mode in @('stderr','stdout','missing','error')){
    [IO.File]::WriteAllText((Join-Path $ScratchDir 'mode.txt'),$mode)
    $accepted=$true
    try{Assert-FunnelPathSupport $exe}catch{$accepted=$false}
    $expected=$mode -in @('stderr','stdout')
    if($accepted -ne $expected){throw ('Incorrect native help handling: '+$mode)}
    Write-Host ('PASS native help: '+$mode)
}
Write-Host ('Windows PowerShell '+$PSVersionTable.PSVersion+': stderr/nonzero help, stdout help and unsupported CLI cases PASS. No Tailscale service was invoked.')
