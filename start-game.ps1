# Age of Max - Game Launcher
# Starts the development server and opens the game in your default browser

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    AGE OF MAX - GAME LAUNCHER" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting development server..." -ForegroundColor Green
Write-Host ""
Write-Host "Controls:" -ForegroundColor Yellow
Write-Host "  - U1-U5: Spawn units" -ForegroundColor White
Write-Host "  - T1-T5: Place turrets" -ForegroundColor White
Write-Host "  - F2: Toggle debug overlay" -ForegroundColor White
Write-Host "  - Special Abilities: Top right buttons" -ForegroundColor White
Write-Host ""
Write-Host "The game will open at: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Wait a moment for user to read
Start-Sleep -Seconds 2

# Start the dev server and open browser
Start-Process "http://localhost:5173"
npm run dev
