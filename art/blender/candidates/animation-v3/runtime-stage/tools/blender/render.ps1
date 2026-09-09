param(
    [ValidateSet('all','backgrounds','units','bases','towers')][string]$Kind='all',
    [ValidateSet('all','stone','castle','renaissance','modern','future')][string]$Epoch='all',
    [ValidateSet('player','enemy','both')][string]$Faction='both',
    [string]$Unit='',
    [ValidateRange(8,4096)][int]$Samples=48,
    [ValidateSet(8,16)][int]$Frames=16,
    [string]$BlenderPath=''
)
$ErrorActionPreference='Stop'
$artRoot=Resolve-Path (Join-Path $PSScriptRoot '../..')
if (-not $BlenderPath) {
    $artRuntime=Join-Path $artRoot 'downloads/blender-runtime'
    $BlenderPath=(Get-ChildItem -LiteralPath $artRuntime -Filter blender.exe -Recurse | Select-Object -First 1).FullName
}
if (-not $BlenderPath -or -not (Test-Path -LiteralPath $BlenderPath)) {
    throw 'Pass -BlenderPath with an installed Blender 4.5 executable.'
}
Push-Location $artRoot
try {
    $artArguments=@('-b','--python-exit-code','1','--python','tools/blender/export_scenes.py','--','--kind',$Kind,'--epoch',$Epoch,'--faction',$Faction,'--samples',"$Samples",'--frames',"$Frames")
    if ($Unit) { $artArguments += @('--unit',$Unit) }
    & $BlenderPath @artArguments
    if ($LASTEXITCODE -ne 0) { throw "Blender production failed: $LASTEXITCODE" }
    if ($Kind -in @('all','units')) {
        $artFactions=if ($Faction -eq 'both') { @('player','enemy') } else { @($Faction) }
        foreach ($artFaction in $artFactions) {
            & ./.conda/python.exe tools/blender/pack_sheets.py --faction $artFaction --frames $Frames
            if ($LASTEXITCODE -ne 0) { throw "Sprite assembly failed: $LASTEXITCODE" }
        }
    }
    if ($Kind -eq 'all' -and $Epoch -eq 'all' -and $Faction -eq 'both') {
        & ./.conda/python.exe tools/blender/verify_art.py --frames $Frames
        if ($LASTEXITCODE -ne 0) { throw 'Rendered art contract validation failed.' }
    }
} finally { Pop-Location }
