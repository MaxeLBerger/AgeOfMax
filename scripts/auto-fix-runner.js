#!/usr/bin/env node

/**
 * Auto-Fix Runner for Age of Max
 * Connects to MCP Server and automatically applies fixes for issues
 */

const fs = require('fs');
const path = require('path');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
const AUTO_FIX = process.env.AUTO_FIX === 'true';
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Make MCP request
 */
async function mcpRequest(method, params = {}) {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: method,
          arguments: params
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    log(`❌ Error calling ${method}: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Analyze game and display summary
 */
async function analyzeGame() {
  log('\n🔍 Analyzing Age of Max...', 'cyan');
  
  const result = await mcpRequest('analyze-game');
  if (!result) return null;

  const data = result.structuredContent;
  
  log('\n📊 GAME ANALYSIS REPORT', 'bright');
  log('━'.repeat(50), 'blue');
  log(`Total Issues: ${data.totalIssues}`, 'yellow');
  log(`Completion: ${data.completionPercentage}%`, 'yellow');
  log('\nBy Priority:', 'cyan');
  log(`  🔴 HIGH: ${data.byPriority.HIGH}`, 'red');
  log(`  🟡 MEDIUM: ${data.byPriority.MEDIUM}`, 'yellow');
  log(`  🟢 LOW: ${data.byPriority.LOW}`, 'green');
  log('━'.repeat(50), 'blue');
  
  return data;
}

/**
 * Get issues by priority
 */
async function getIssuesByPriority(priority) {
  log(`\n📋 Fetching ${priority} priority issues...`, 'cyan');
  
  const result = await mcpRequest('get-issues-by-priority', { priority });
  if (!result) return [];

  const issues = result.structuredContent.issues;
  
  log(`\nFound ${issues.length} ${priority} priority issues:`, 'yellow');
  issues.forEach((issue, i) => {
    log(`  ${i + 1}. ${issue.title} (${issue.category})`, 'white');
    log(`     Impact: ${issue.impact} | Effort: ${issue.effort}`, 'blue');
  });
  
  return issues;
}

/**
 * Generate fix code for an issue
 */
async function generateFix(issueTitle) {
  log(`\n🔧 Generating fix for: ${issueTitle}`, 'cyan');
  
  const result = await mcpRequest('generate-fix', { issueTitle });
  if (!result) return null;

  const data = result.structuredContent;
  
  if (!data.fixCode) {
    log(`❌ No fix available for: ${issueTitle}`, 'red');
    return null;
  }
  
  log(`✅ Fix generated! Files to modify:`, 'green');
  data.files.forEach(file => log(`  - ${file}`, 'blue'));
  
  return data;
}

/**
 * Create GitHub issue files
 */
async function createIssueFiles() {
  log('\n📝 Creating GitHub issue files...', 'cyan');
  
  const outputDir = path.join(PROJECT_ROOT, 'generated-issues');
  const result = await mcpRequest('create-issue-files', { outputDir });
  
  if (!result) return;

  const data = result.structuredContent;
  log(`✅ Created ${data.created} issue files in:`, 'green');
  log(`   ${data.directory}`, 'blue');
}

/**
 * Apply fix to files (if AUTO_FIX is enabled)
 */
function applyFix(fixData, issueTitle) {
  if (!AUTO_FIX) {
    log('ℹ️  AUTO_FIX is disabled. Set AUTO_FIX=true to apply fixes automatically.', 'yellow');
    return;
  }

  log(`\n🚀 Applying fix for: ${issueTitle}`, 'cyan');
  
  // Create utility file with the fix code
  const utilityDir = path.join(PROJECT_ROOT, 'src', 'utils');
  if (!fs.existsSync(utilityDir)) {
    fs.mkdirSync(utilityDir, { recursive: true });
  }
  
  const fileName = issueTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.ts';
  const filePath = path.join(utilityDir, fileName);
  
  fs.writeFileSync(filePath, fixData.fixCode);
  log(`✅ Created: ${filePath}`, 'green');
  log('⚠️  Remember to integrate this code into your BattleScene!', 'yellow');
}

/**
 * Interactive menu
 */
async function showMenu() {
  log('\n' + '='.repeat(50), 'blue');
  log('🎮 AGE OF MAX - AUTO-FIX SYSTEM', 'bright');
  log('='.repeat(50), 'blue');
  log('\nWhat would you like to do?', 'cyan');
  log('1. Analyze game and show all issues', 'white');
  log('2. Get HIGH priority issues', 'white');
  log('3. Get MEDIUM priority issues', 'white');
  log('4. Get LOW priority issues', 'white');
  log('5. Generate fix for specific issue', 'white');
  log('6. Create GitHub issue files', 'white');
  log('7. Auto-fix all HIGH priority issues', 'white');
  log('8. Exit', 'white');
  log('');
}

/**
 * Auto-fix HIGH priority issues
 */
async function autoFixHighPriority() {
  log('\n🤖 AUTO-FIX MODE: Processing HIGH priority issues...', 'cyan');
  
  const issues = await getIssuesByPriority('HIGH');
  
  for (const issue of issues) {
    const fixData = await generateFix(issue.title);
    if (fixData) {
      applyFix(fixData, issue.title);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between fixes
    }
  }
  
  log('\n✅ All HIGH priority fixes processed!', 'green');
}

/**
 * Main execution
 */
async function main() {
  log('\n🚀 Starting Auto-Fix Runner...', 'bright');
  log(`📡 Connecting to MCP Server: ${MCP_SERVER_URL}`, 'blue');
  
  // Wait for MCP server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run automatic analysis
  await analyzeGame();
  
  // If running in container, automatically create issue files and analyze
  if (process.env.DOCKER_CONTAINER) {
    await createIssueFiles();
    await getIssuesByPriority('HIGH');
    await getIssuesByPriority('MEDIUM');
    
    if (AUTO_FIX) {
      await autoFixHighPriority();
    }
    
    log('\n✅ Analysis complete! Check generated-issues/ for details.', 'green');
    return;
  }
  
  // Interactive mode
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  async function askQuestion() {
    await showMenu();
    readline.question('Select option (1-8): ', async (answer) => {
      switch(answer.trim()) {
        case '1':
          await analyzeGame();
          break;
        case '2':
          await getIssuesByPriority('HIGH');
          break;
        case '3':
          await getIssuesByPriority('MEDIUM');
          break;
        case '4':
          await getIssuesByPriority('LOW');
          break;
        case '5':
          readline.question('Enter issue title: ', async (title) => {
            const fixData = await generateFix(title);
            if (fixData) {
              readline.question('Apply this fix? (y/n): ', (apply) => {
                if (apply.toLowerCase() === 'y') {
                  applyFix(fixData, title);
                }
                askQuestion();
              });
              return;
            }
            askQuestion();
          });
          return;
        case '6':
          await createIssueFiles();
          break;
        case '7':
          await autoFixHighPriority();
          break;
        case '8':
          log('\n👋 Goodbye!', 'cyan');
          readline.close();
          process.exit(0);
          return;
        default:
          log('❌ Invalid option!', 'red');
      }
      
      if (answer.trim() !== '5') {
        setTimeout(askQuestion, 1000);
      }
    });
  }
  
  askQuestion();
}

// Error handling
process.on('unhandledRejection', (error) => {
  log(`\n❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

process.on('SIGINT', () => {
  log('\n\n👋 Shutting down...', 'cyan');
  process.exit(0);
});

// Start
main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
