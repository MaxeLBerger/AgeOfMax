import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import GameAnalyzer from './game-analyzer.js';
import * as path from 'path';

/**
 * HTTP-based MCP Server with Game Analysis Tools
 * This server provides game analysis and auto-fix capabilities
 */

// Initialize game analyzer
const projectRoot = path.resolve(process.cwd(), '..');
const gameAnalyzer = new GameAnalyzer(projectRoot);

// Initialize the MCP server
const server = new McpServer({
  name: 'age-of-max-mcp-server',
  version: '1.0.0'
});

// Express app setup
const app = express();
app.use(express.json());

// Register the same tools, resources, and prompts as the stdio version
// For brevity, I'll include just a few examples here

// Addition tool
server.registerTool(
  'add',
  {
    title: 'Addition Tool',
    description: 'Add two numbers together',
    inputSchema: {
      a: z.number().describe('First number'),
      b: z.number().describe('Second number')
    },
    outputSchema: {
      result: z.number(),
      operation: z.string()
    }
  },
  async ({ a, b }: { a: number; b: number }) => {
    const result = a + b;
    const output = { result, operation: 'addition' };
    
    return {
      content: [{
        type: 'text',
        text: `${a} + ${b} = ${result}`
      }],
      structuredContent: output
    };
  }
);

// Current time tool
server.registerTool(
  'get-time',
  {
    title: 'Get Current Time',
    description: 'Get the current date and time with timezone information',
    inputSchema: {},
    outputSchema: {
      timestamp: z.string(),
      timezone: z.string(),
      utc: z.string(),
      unix: z.number()
    }
  },
  async () => {
    const now = new Date();
    const output = {
      timestamp: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      utc: now.toUTCString(),
      unix: Math.floor(now.getTime() / 1000)
    };
    
    return {
      content: [{
        type: 'text',
        text: `Current time: ${output.timestamp} (${output.timezone})`
      }],
      structuredContent: output
    };
  }
);

// ===== GAME ANALYSIS TOOLS =====

// Analyze all issues
server.registerTool(
  'analyze-game',
  {
    title: 'Analyze Game Issues',
    description: 'Get complete analysis of missing features and issues in Age of Max',
    inputSchema: {},
    outputSchema: {
      totalIssues: z.number(),
      byPriority: z.object({
        HIGH: z.number(),
        MEDIUM: z.number(),
        LOW: z.number()
      }),
      completionPercentage: z.number()
    }
  },
  async () => {
    const analysis = gameAnalyzer.loadIssues();
    
    return {
      content: [{
        type: 'text',
        text: `Game Analysis:\n- Total Issues: ${analysis.totalCount}\n- HIGH: ${analysis.byPriority.HIGH}\n- MEDIUM: ${analysis.byPriority.MEDIUM}\n- LOW: ${analysis.byPriority.LOW}\n- Completion: ${analysis.completionPercentage}%`
      }],
      structuredContent: {
        totalIssues: analysis.totalCount,
        byPriority: analysis.byPriority,
        completionPercentage: analysis.completionPercentage
      }
    };
  }
);

// Get issues by priority
server.registerTool(
  'get-issues-by-priority',
  {
    title: 'Get Issues by Priority',
    description: 'Filter issues by priority level (HIGH, MEDIUM, LOW)',
    inputSchema: {
      priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Priority level to filter')
    },
    outputSchema: {
      issues: z.array(z.any()),
      count: z.number()
    }
  },
  async ({ priority }) => {
    const issues = gameAnalyzer.getIssuesByPriority(priority);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${issues.length} ${priority} priority issues:\n${issues.map(i => `- ${i.title}`).join('\n')}`
      }],
      structuredContent: {
        issues,
        count: issues.length
      }
    };
  }
);

// Get issues by category
server.registerTool(
  'get-issues-by-category',
  {
    title: 'Get Issues by Category',
    description: 'Filter issues by category (Audio, Gameplay, UI/UX, Content)',
    inputSchema: {
      category: z.string().describe('Category to filter (e.g., Audio, Gameplay)')
    },
    outputSchema: {
      issues: z.array(z.any()),
      count: z.number()
    }
  },
  async ({ category }) => {
    const issues = gameAnalyzer.getIssuesByCategory(category);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${issues.length} issues in ${category}:\n${issues.map(i => `- ${i.title}`).join('\n')}`
      }],
      structuredContent: {
        issues,
        count: issues.length
      }
    };
  }
);

// Generate fix for specific issue
server.registerTool(
  'generate-fix',
  {
    title: 'Generate Fix Code',
    description: 'Generate implementation code for a specific issue',
    inputSchema: {
      issueTitle: z.string().describe('Title of the issue to fix')
    },
    outputSchema: {
      fixCode: z.string(),
      files: z.array(z.string())
    }
  },
  async ({ issueTitle }) => {
    const analysis = gameAnalyzer.loadIssues();
    const issue = analysis.issues.find(i => i.title === issueTitle);
    
    if (!issue) {
      return {
        content: [{
          type: 'text',
          text: `Issue not found: ${issueTitle}`
        }],
        structuredContent: {
          fixCode: '',
          files: []
        }
      };
    }
    
    const fixCode = gameAnalyzer.generateFix(issue);
    const files = ['src/scenes/BattleScene.ts', 'src/game/types.ts'];
    
    return {
      content: [{
        type: 'text',
        text: `Fix code for "${issueTitle}":\n\n${fixCode}`
      }],
      structuredContent: {
        fixCode,
        files
      }
    };
  }
);

// Create GitHub issues
server.registerTool(
  'create-issue-files',
  {
    title: 'Create Issue Files',
    description: 'Generate markdown files for all issues to create GitHub issues',
    inputSchema: {
      outputDir: z.string().optional().describe('Output directory (default: ./generated-issues)')
    },
    outputSchema: {
      created: z.number(),
      directory: z.string()
    }
  },
  async ({ outputDir }) => {
    const dir = outputDir || path.join(projectRoot, 'generated-issues');
    gameAnalyzer.createIssueFiles(dir);
    const analysis = gameAnalyzer.loadIssues();
    
    return {
      content: [{
        type: 'text',
        text: `Created ${analysis.totalCount} issue files in ${dir}`
      }],
      structuredContent: {
        created: analysis.totalCount,
        directory: dir
      }
    };
  }
);

// Server info resource
server.registerResource(
  'server-info',
  'info://server',
  {
    title: 'Server Information',
    description: 'Information about this MCP server',
    mimeType: 'application/json'
  },
  async (uri: any) => {
    const info = {
      name: 'Simple MCP Server (HTTP)',
      version: '1.0.0',
      description: 'A demonstration MCP server with HTTP transport',
      capabilities: ['tools', 'resources', 'prompts'],
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage()
    };
    
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(info, null, 2),
        mimeType: 'application/json'
      }]
    };
  }
);

// Greeting resource
server.registerResource(
  'greeting',
  new ResourceTemplate('greeting://{name}', { list: undefined }),
  {
    title: 'Personal Greeting',
    description: 'Generate a personalized greeting'
  },
  async (uri: any, variables: any) => {
    const name = variables.name || 'Guest';
    const greetings = [
      `Hello, ${name}! Welcome to the Simple MCP Server via HTTP.`,
      `Greetings, ${name}! Hope you're having a great day.`,
      `Hi there, ${name}! Ready to explore some MCP capabilities over HTTP?`,
      `Welcome aboard, ${name}! Let's get started with HTTP transport.`
    ];
    
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    return {
      contents: [{
        uri: uri.href,
        text: randomGreeting
      }]
    };
  }
);

// Code review prompt
server.registerPrompt(
  'code-review',
  {
    title: 'Code Review Prompt',
    description: 'Generate a prompt for code review',
    argsSchema: {
      code: z.string().describe('Code to review'),
      language: z.string().optional().describe('Programming language (optional)')
    }
  },
  ({ code, language }: { code: string; language?: string }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Please review the following ${language || ''} code for best practices, potential issues, and improvements:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``
      }
    }]
  })
);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'simple-mcp-server-http',
    version: '1.0.0'
  });
});

// Simple REST API endpoints for easy access
app.post('/api/analyze', async (_req, res) => {
  try {
    const analysis = gameAnalyzer.loadIssues();
    res.json({
      success: true,
      data: {
        totalIssues: analysis.totalCount,
        byPriority: analysis.byPriority,
        byCategory: analysis.byCategory,
        completionPercentage: analysis.completionPercentage,
        issues: analysis.issues
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/issues/priority/:priority', async (req, res) => {
  try {
    const priority = req.params.priority.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW';
    const issues = gameAnalyzer.getIssuesByPriority(priority);
    res.json({ success: true, data: { issues, count: issues.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/issues/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const issues = gameAnalyzer.getIssuesByCategory(category);
    res.json({ success: true, data: { issues, count: issues.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/fix/generate', async (req, res) => {
  try {
    const { issueTitle } = req.body;
    const analysis = gameAnalyzer.loadIssues();
    const issue = analysis.issues.find(i => i.title === issueTitle);
    
    if (!issue) {
      res.status(404).json({ success: false, error: 'Issue not found' });
      return;
    }
    
    const fixCode = gameAnalyzer.generateFix(issue);
    res.json({
      success: true,
      data: {
        issueTitle,
        fixCode,
        files: ['src/scenes/BattleScene.ts', 'src/game/types.ts']
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/issues/create-files', async (req, res) => {
  try {
    const outputDir = req.body.outputDir || path.join(projectRoot, 'generated-issues');
    gameAnalyzer.createIssueFiles(outputDir);
    const analysis = gameAnalyzer.loadIssues();
    
    res.json({
      success: true,
      data: {
        created: analysis.totalCount,
        directory: outputDir
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// MCP endpoint (stateless mode)
app.post('/mcp', async (req, res) => {
  try {
    // Create a new transport for each request to prevent request ID collisions
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
});

// Handle other HTTP methods for MCP endpoint
app.get('/mcp', (_req, res) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed. Use POST for MCP requests.'
    },
    id: null
  });
});

const port = parseInt(process.env.PORT || '3000');

async function startHttpServer() {
  try {
    console.log('🚀 Starting Simple MCP HTTP Server...');
    console.log('📝 Server Name: simple-mcp-server-http');
    console.log('📋 Version: 1.0.0');
    
    app.listen(port, () => {
      console.log(`✅ MCP HTTP Server running on http://localhost:${port}`);
      console.log(`🔗 MCP Endpoint: http://localhost:${port}/mcp`);
      console.log(`❤️  Health Check: http://localhost:${port}/health`);
      console.log('');
      console.log('🎮 GAME ANALYSIS TOOLS:');
      console.log('  - analyze-game: Get complete game analysis');
      console.log('  - get-issues-by-priority: Filter by HIGH/MEDIUM/LOW');
      console.log('  - get-issues-by-category: Filter by Audio/Gameplay/UI/Content');
      console.log('  - generate-fix: Generate fix code for specific issue');
      console.log('  - create-issue-files: Generate GitHub issue markdown files');
      console.log('');
      console.log('� UTILITY TOOLS:');
      console.log('  - add: Add two numbers');
      console.log('  - get-time: Get current time');
      console.log('');
      console.log('📄 Resources: server-info, greeting://{name}');
      console.log('💭 Prompts: code-review');
    }).on('error', (error: Error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start HTTP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MCP HTTP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down MCP HTTP server...');
  process.exit(0);
});

// Start the HTTP server
startHttpServer().catch(console.error);