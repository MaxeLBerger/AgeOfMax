import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';

/**
 * HTTP-based MCP Server
 * This server provides the same functionality as the stdio version but over HTTP
 */

// Initialize the MCP server
const server = new McpServer({
  name: 'simple-mcp-server-http',
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
      console.log('🔧 Available tools: add, get-time');
      console.log('📄 Available resources: server-info, greeting://{name}');
      console.log('💭 Available prompts: code-review');
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