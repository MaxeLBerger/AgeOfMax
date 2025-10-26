# Age of Max - MCP REST API Helpers
# Easy-to-use PowerShell functions for interacting with the MCP Server

$Global:MCP_BASE_URL = "http://localhost:3000"

# Generic API call function
function Call-API {
    param(
        [string]$endpoint,
        [hashtable]$body = @{}
    )
    
    $uri = "$Global:MCP_BASE_URL$endpoint"
    
    try {
        if ($body.Count -gt 0) {
            $result = Invoke-RestMethod -Uri $uri -Method POST -Body ($body | ConvertTo-Json) -ContentType "application/json"
        } else {
            $result = Invoke-RestMethod -Uri $uri -Method POST
        }
        return $result
    }
    catch {
        Write-Host "Error calling $endpoint`: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Analyze the entire game
function Get-GameAnalysis {
    Write-Host "Analyzing game..." -ForegroundColor Cyan
    $result = Call-API -endpoint "/api/analyze"
    
    if ($result -and $result.success) {
        $data = $result.data
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Blue
        Write-Host "GAME ANALYSIS REPORT" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Blue
        Write-Host ""
        Write-Host "Total Issues:      $($data.totalIssues)" -ForegroundColor Yellow
        Write-Host "Completion:        $($data.completionPercentage)%" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "By Priority:" -ForegroundColor Cyan
        Write-Host "  HIGH:            $($data.byPriority.HIGH)" -ForegroundColor Red
        Write-Host "  MEDIUM:          $($data.byPriority.MEDIUM)" -ForegroundColor Yellow
        Write-Host "  LOW:             $($data.byPriority.LOW)" -ForegroundColor Green
        Write-Host ""
        Write-Host "By Category:" -ForegroundColor Cyan
        foreach ($category in $data.byCategory.PSObject.Properties) {
            Write-Host "  $($category.Name): $($category.Value)" -ForegroundColor White
        }
        Write-Host "========================================" -ForegroundColor Blue
        Write-Host ""
        
        return $data
    }
    return $null
}

# Get issues by priority
function Get-IssuesByPriority {
    param(
        [ValidateSet('HIGH', 'MEDIUM', 'LOW')]
        [string]$Priority = 'HIGH'
    )
    
    Write-Host "Fetching $Priority priority issues..." -ForegroundColor Cyan
    $result = Call-API -endpoint "/api/issues/priority/$Priority"
    
    if ($result -and $result.success) {
        $issues = $result.data.issues
        
        Write-Host ""
        Write-Host "Found $($issues.Count) $Priority priority issues:" -ForegroundColor Yellow
        Write-Host ""
        
        for ($i = 0; $i -lt $issues.Count; $i++) {
            $issue = $issues[$i]
            Write-Host "  $($i + 1). $($issue.title)" -ForegroundColor White
            Write-Host "     Category: $($issue.category) | Effort: $($issue.effort)" -ForegroundColor Gray
            Write-Host "     Impact: $($issue.impact)" -ForegroundColor Gray
            Write-Host ""
        }
        
        return $issues
    }
    return $null
}

# Get issues by category
function Get-IssuesByCategory {
    param(
        [string]$Category
    )
    
    Write-Host "Fetching $Category issues..." -ForegroundColor Cyan
    $result = Call-API -endpoint "/api/issues/category/$Category"
    
    if ($result -and $result.success) {
        $issues = $result.data.issues
        
        Write-Host ""
        Write-Host "Found $($issues.Count) issues in $Category category:" -ForegroundColor Yellow
        Write-Host ""
        
        foreach ($issue in $issues) {
            Write-Host "  - $($issue.title) [$($issue.priority)]" -ForegroundColor White
        }
        Write-Host ""
        
        return $issues
    }
    return $null
}

# Generate fix code for a specific issue
function Get-FixCode {
    param(
        [string]$IssueTitle
    )
    
    Write-Host "Generating fix for: $IssueTitle..." -ForegroundColor Cyan
    $result = Call-API -endpoint "/api/fix/generate" -body @{issueTitle=$IssueTitle}
    
    if ($result -and $result.success) {
        $fix = $result.data
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "FIX GENERATED" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Issue:  $($fix.issueTitle)" -ForegroundColor Yellow
        Write-Host "Length: $($fix.fixCode.Length) characters" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Files to modify:" -ForegroundColor Cyan
        foreach ($file in $fix.files) {
            Write-Host "  - $file" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "Fix code:" -ForegroundColor Cyan
        Write-Host $fix.fixCode -ForegroundColor Gray
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        
        return $fix
    }
    return $null
}

# Create GitHub issue markdown files
function New-IssueFiles {
    param(
        [string]$OutputDir = ""
    )
    
    Write-Host "Creating GitHub issue files..." -ForegroundColor Cyan
    
    $body = @{}
    if ($OutputDir) {
        $body.outputDir = $OutputDir
    }
    
    $result = Call-API -endpoint "/api/issues/create-files" -body $body
    
    if ($result -and $result.success) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Created $($result.data.created) issue files" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Directory: $($result.data.directory)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "You can now create GitHub issues from these markdown files!" -ForegroundColor Yellow
        Write-Host ""
        
        return $result.data
    }
    return $null
}

# Show available commands
function Show-MCPHelp {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "MCP REST API HELPER COMMANDS" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Get-GameAnalysis" -ForegroundColor White
    Write-Host "  Analyze the entire game and show all metrics" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Get-IssuesByPriority -Priority HIGH|MEDIUM|LOW" -ForegroundColor White
    Write-Host "  Get all issues filtered by priority level" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Get-IssuesByCategory -Category Audio|Gameplay|UI/UX|Content" -ForegroundColor White
    Write-Host "  Get all issues filtered by category" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Get-FixCode -IssueTitle 'XP Gain Visual Feedback'" -ForegroundColor White
    Write-Host "  Generate TypeScript fix code for a specific issue" -ForegroundColor Gray
    Write-Host ""
    Write-Host "New-IssueFiles [-OutputDir './custom-dir']" -ForegroundColor White
    Write-Host "  Create markdown files for all issues (for GitHub)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  Get-GameAnalysis" -ForegroundColor White
    Write-Host "  Get-IssuesByPriority -Priority HIGH" -ForegroundColor White
    Write-Host "  Get-FixCode -IssueTitle 'XP Gain Visual Feedback'" -ForegroundColor White
    Write-Host "  New-IssueFiles" -ForegroundColor White
    Write-Host ""
}

# Show welcome message
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "MCP REST API HELPERS LOADED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Type 'Show-MCPHelp' to see available commands" -ForegroundColor Cyan
Write-Host ""
