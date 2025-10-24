@echo off
cls
echo ========================================
echo     AGE OF MAX - GAME LAUNCHER
echo ========================================
echo.
echo Starting development server...
echo.
echo Controls:
echo   - U1-U5: Spawn units
echo   - T1-T5: Place turrets
echo   - F2: Toggle debug overlay
echo   - Special Abilities: Top right buttons
echo.
echo The game will open at: http://localhost:5173
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.
timeout /t 2 /nobreak >nul
start http://localhost:5173
npm run dev
