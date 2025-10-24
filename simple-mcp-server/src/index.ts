import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

/**
 * Simple MCP Server demonstrating basic tools, resources, and prompts
 * This server provides:
 * - Mathematical tools (add, multiply, factorial)
 * - Time utilities
 * - Text manipulation
 * - Dynamic resources
 * - Prompt templates
 */

// Initialize the MCP server
const server = new McpServer({
  name: 'simple-mcp-server',
  version: '1.0.0'
});

// ===== TOOLS =====

// Basic addition tool
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
  async ({ a, b }) => {
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

// Multiplication tool
server.registerTool(
  'multiply',
  {
    title: 'Multiplication Tool',
    description: 'Multiply two numbers',
    inputSchema: {
      a: z.number().describe('First number'),
      b: z.number().describe('Second number')
    },
    outputSchema: {
      result: z.number(),
      operation: z.string()
    }
  },
  async ({ a, b }) => {
    const result = a * b;
    const output = { result, operation: 'multiplication' };
    
    return {
      content: [{
        type: 'text',
        text: `${a} × ${b} = ${result}`
      }],
      structuredContent: output
    };
  }
);

// Factorial tool
server.registerTool(
  'factorial',
  {
    title: 'Factorial Tool',
    description: 'Calculate the factorial of a number',
    inputSchema: {
      n: z.number().int().min(0).max(20).describe('Number to calculate factorial for (0-20)')
    },
    outputSchema: {
      result: z.number(),
      operation: z.string(),
      input: z.number()
    }
  },
  async ({ n }) => {
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    
    const output = { result, operation: 'factorial', input: n };
    
    return {
      content: [{
        type: 'text',
        text: `${n}! = ${result}`
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

// Text manipulation tool
server.registerTool(
  'text-transform',
  {
    title: 'Text Transform',
    description: 'Transform text using various operations',
    inputSchema: {
      text: z.string().describe('Text to transform'),
      operation: z.enum(['uppercase', 'lowercase', 'reverse', 'length', 'words']).describe('Operation to perform')
    },
    outputSchema: {
      original: z.string(),
      transformed: z.union([z.string(), z.number()]),
      operation: z.string()
    }
  },
  async ({ text, operation }) => {
    let transformed: string | number;
    
    switch (operation) {
      case 'uppercase':
        transformed = text.toUpperCase();
        break;
      case 'lowercase':
        transformed = text.toLowerCase();
        break;
      case 'reverse':
        transformed = text.split('').reverse().join('');
        break;
      case 'length':
        transformed = text.length;
        break;
      case 'words':
        transformed = text.split(/\s+/).filter(word => word.length > 0).length;
        break;
      default:
        transformed = text;
    }
    
    const output = { original: text, transformed, operation };
    
    return {
      content: [{
        type: 'text',
        text: `${operation}: "${text}" → ${transformed}`
      }],
      structuredContent: output
    };
  }
);

// ===== RESOURCES =====

// Static server info resource
server.registerResource(
  'server-info',
  'info://server',
  {
    title: 'Server Information',
    description: 'Information about this MCP server',
    mimeType: 'application/json'
  },
  async (uri) => {
    const info = {
      name: 'Simple MCP Server',
      version: '1.0.0',
      description: 'A demonstration MCP server with tools and resources',
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

// Dynamic greeting resource
server.registerResource(
  'greeting',
  new ResourceTemplate('greeting://{name}', { list: undefined }),
  {
    title: 'Personal Greeting',
    description: 'Generate a personalized greeting'
  },
  async (uri, { name }) => {
    const greetings = [
      `Hello, ${name}! Welcome to the Simple MCP Server.`,
      `Greetings, ${name}! Hope you're having a great day.`,
      `Hi there, ${name}! Ready to explore some MCP capabilities?`,
      `Welcome aboard, ${name}! Let's get started.`
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

// Dynamic fact resource
server.registerResource(
  'fact',
  new ResourceTemplate('fact://{category}', { list: undefined }),
  {
    title: 'Random Facts',
    description: 'Get random facts by category'
  },
  async (uri: any, variables: any) => {
    const category = variables.category || 'general';
    const facts: Record<string, string[]> = {
      science: [
        'Octopuses have three hearts and blue blood.',
        'A group of flamingos is called a "flamboyance".',
        'Honey never spoils - archaeologists have found edible honey in ancient Egyptian tombs.',
        'The human brain contains approximately 86 billion neurons.'
      ],
      technology: [
        'The first computer bug was an actual bug - a moth stuck in a relay.',
        'The @ symbol is called an "arobase" in French.',
        'GPS satellites need to account for time dilation due to relativity.',
        'The term "robot" comes from the Czech word "robota" meaning forced labor.'
      ],
      history: [
        'Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.',
        'Oxford University is older than the Aztec Empire.',
        'The Great Wall of China is not visible from space with the naked eye.',
        'Vikings actually reached North America about 500 years before Columbus.'
      ]
    };
    
    const categoryFacts = facts[String(category).toLowerCase()] || ['No facts available for this category.'];
    const randomFact = categoryFacts[Math.floor(Math.random() * categoryFacts.length)];
    
    return {
      contents: [{
        uri: uri.href,
        text: `${String(category).toUpperCase()} FACT: ${randomFact}`
      }]
    };
  }
);

// ===== PROMPTS =====

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
  ({ code, language }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Please review the following ${language || ''} code for best practices, potential issues, and improvements:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``
      }
    }]
  })
);

// Explanation prompt
server.registerPrompt(
  'explain',
  {
    title: 'Explanation Prompt',
    description: 'Generate a prompt to explain a concept',
    argsSchema: {
      topic: z.string().describe('Topic to explain'),
      audience: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('Target audience level')
    }
  },
  ({ topic, audience }: { topic: string; audience?: string }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Please explain "${topic}" for a ${audience || 'intermediate'} audience. Include examples and practical applications where relevant.`
      }
    }]
  })
);

// Problem solving prompt
server.registerPrompt(
  'problem-solve',
  {
    title: 'Problem Solving Prompt',
    description: 'Generate a structured problem-solving prompt',
    argsSchema: {
      problem: z.string().describe('Problem description'),
      context: z.string().optional().describe('Additional context (optional)')
    }
  },
  ({ problem, context }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Help me solve this problem step by step:\n\nProblem: ${problem}\n${context ? `\nContext: ${context}` : ''}\n\nPlease provide:\n1. Problem analysis\n2. Possible approaches\n3. Recommended solution\n4. Implementation steps`
      }
    }]
  })
);

// ===== SERVER STARTUP =====

async function main() {
  try {
    console.log('🚀 Starting Simple MCP Server...');
    console.log('📝 Server Name: simple-mcp-server');
    console.log('📋 Version: 1.0.0');
    
    // Connect via stdio transport for local integrations
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.log('✅ MCP Server connected and running via stdio transport');
    console.log('🔧 Available tools: add, multiply, factorial, get-time, text-transform');
    console.log('📄 Available resources: server-info, greeting://{name}, fact://{category}');
    console.log('💭 Available prompts: code-review, explain, problem-solve');
    
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MCP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down MCP server...');
  process.exit(0);
});

// Start the server
main().catch(console.error);