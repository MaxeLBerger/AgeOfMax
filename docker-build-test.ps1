# Docker Build Test Script
# Tests if Dockerfile can build successfully

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DOCKER BUILD TEST - Age of Max" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Checking Docker..." -ForegroundColor Green
docker --version

Write-Host ""
Write-Host "Step 2: Building Docker image..." -ForegroundColor Green
Write-Host "This may take 2-5 minutes on first build..." -ForegroundColor Yellow
Write-Host ""

docker build -t age-of-max:latest .

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Image details:" -ForegroundColor Cyan
    docker images age-of-max:latest
    Write-Host ""
    Write-Host "To run the container:" -ForegroundColor Yellow
    Write-Host "  docker run -d -p 8080:80 age-of-max:latest" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use Docker Compose:" -ForegroundColor Yellow
    Write-Host "  docker-compose up -d" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the error messages above." -ForegroundColor Yellow
    Write-Host ""
}
