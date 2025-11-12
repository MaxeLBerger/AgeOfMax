<#
 Age of Max - Game Launcher
 - Ensures we run inside the AgeOfMax folder
 - Installs dependencies on first run
 - Starts the Vite dev server and opens the browser
#>

Write-Host ""; Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    AGE OF MAX - GAME LAUNCHER" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan; Write-Host ""

try {
	# Always execute from this script's directory (AgeOfMax)
	if (-not $PSScriptRoot) { throw "PSScriptRoot not available." }
	Set-Location -Path $PSScriptRoot

	Write-Host "Working directory:" (Get-Location) -ForegroundColor DarkGray

	# Basic preflight checks
	if (-not (Test-Path -LiteralPath "package.json")) {
		throw "package.json not found in $((Get-Location).Path). Please run this script from the AgeOfMax folder."
	}

	if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
		throw "npm is not installed or not on PATH. Install Node.js (includes npm) from https://nodejs.org/ and try again."
	}

	Write-Host "Starting development server..." -ForegroundColor Green
	Write-Host ""; Write-Host "Controls:" -ForegroundColor Yellow
	Write-Host "  - U1-U5: Spawn units" -ForegroundColor White
	Write-Host "  - T1-T5: Place turrets" -ForegroundColor White
	Write-Host "  - F2: Toggle debug overlay" -ForegroundColor White
	Write-Host "  - Special Abilities: Top right buttons" -ForegroundColor White
	Write-Host ""; Write-Host "The game will open at: http://localhost:5173" -ForegroundColor Cyan
	Write-Host ""; Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
	Write-Host "========================================" -ForegroundColor Cyan; Write-Host ""

	# Give user a moment to read
	Start-Sleep -Seconds 1

	# Install dependencies if needed
	if (-not (Test-Path -LiteralPath "node_modules")) {
		Write-Host "Installing dependencies (npm ci)..." -ForegroundColor Yellow
		$ci = Start-Process npm -ArgumentList @("ci") -NoNewWindow -PassThru -Wait
		if ($ci.ExitCode -ne 0) { throw "Dependency installation failed (exit code $($ci.ExitCode))." }
	}

	# Use the start script (vite --open) to auto-open the browser
	Write-Host "Launching Vite dev server (npm run start)..." -ForegroundColor Green
	Write-Host "(If the browser doesn't open automatically, visit http://localhost:5173)" -ForegroundColor DarkGray
	npm run start
}
catch {
	Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
	exit 1
}
