# Age of Max - Docker Development Environment Starter
# This script starts all development services in Docker

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Age of Max - Docker Development Environment" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Blue
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "Docker is not running! Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting Development Services..." -ForegroundColor Yellow
Write-Host ""

# Start services
docker-compose --profile dev up -d

Write-Host ""
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Services started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "SERVICE URLs:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Game Dev Server:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "  MCP Server:       http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Health Check:     http://localhost:3000/health" -ForegroundColor Yellow
Write-Host ""

# Test MCP Server
Write-Host "Testing MCP Server..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
    Write-Host "MCP Server is healthy!" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   Version: $($response.version)" -ForegroundColor Gray
}
catch {
    Write-Host "MCP Server not responding yet (may still be starting)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "AVAILABLE MCP TOOLS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  analyze-game              - Complete game analysis" -ForegroundColor White
Write-Host "  get-issues-by-priority    - Filter by HIGH/MEDIUM/LOW" -ForegroundColor White
Write-Host "  get-issues-by-category    - Filter by category" -ForegroundColor White
Write-Host "  generate-fix              - Generate fix code" -ForegroundColor White
Write-Host "  create-issue-files        - Create GitHub issues" -ForegroundColor White
Write-Host ""

Write-Host "QUICK COMMANDS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  View logs:          docker-compose logs -f" -ForegroundColor Yellow
Write-Host "  Stop services:      docker-compose --profile dev down" -ForegroundColor Yellow
Write-Host "  Restart MCP:        docker-compose restart mcp-server" -ForegroundColor Yellow
Write-Host "  Run auto-fixer:     docker exec -it age-of-max-fixer node scripts/auto-fix-runner.js" -ForegroundColor Yellow
Write-Host ""

# Ask if user wants to open browser
$openBrowser = Read-Host "Open game in browser? (y/n)"
if ($openBrowser -eq 'y' -or $openBrowser -eq 'Y') {
    Write-Host "Opening browser..." -ForegroundColor Green
    Start-Process "http://localhost:5173"
}

Write-Host ""
$runAnalysis = Read-Host "Run game analysis now? (y/n)"
if ($runAnalysis -eq 'y' -or $runAnalysis -eq 'Y') {
    Write-Host ""
    Write-Host "Analyzing game..." -ForegroundColor Cyan
    
    $body = @{
        jsonrpc = "2.0"
        id = 1
        method = "tools/call"
        params = @{
            name = "analyze-game"
            arguments = @{}
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        $result = Invoke-RestMethod -Uri "http://localhost:3000/mcp" -Method POST -Body $body -ContentType "application/json"
        $data = $result.result.structuredContent
        
        Write-Host ""
        Write-Host "GAME ANALYSIS RESULTS" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Total Issues:  $($data.totalIssues)" -ForegroundColor Yellow
        Write-Host "  Completion:    $($data.completionPercentage)%" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  HIGH:          $($data.byPriority.HIGH)" -ForegroundColor Red
        Write-Host "  MEDIUM:        $($data.byPriority.MEDIUM)" -ForegroundColor Yellow
        Write-Host "  LOW:           $($data.byPriority.LOW)" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "Failed to analyze game: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
$createIssues = Read-Host "Create GitHub issue files? (y/n)"
if ($createIssues -eq 'y' -or $createIssues -eq 'Y') {
    Write-Host ""
    Write-Host "Creating issue files..." -ForegroundColor Cyan
    
    $body = @{
        jsonrpc = "2.0"
        id = 2
        method = "tools/call"
        params = @{
            name = "create-issue-files"
            arguments = @{}
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        $result = Invoke-RestMethod -Uri "http://localhost:3000/mcp" -Method POST -Body $body -ContentType "application/json"
        $data = $result.result.structuredContent
        
        Write-Host "Created $($data.created) issue files in:" -ForegroundColor Green
        Write-Host "   $($data.directory)" -ForegroundColor Gray
        Write-Host ""
    }
    catch {
        Write-Host "Failed to create issues: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Development environment is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "For more info, see: DOCKER_DEV.md" -ForegroundColor Gray
Write-Host ""
Write-Host "Happy coding!" -ForegroundColor Cyan
Write-Host ""
