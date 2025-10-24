# Simple MCP Server

A demonstration implementation of a **Model Context Protocol (MCP)** server built with Node.js and TypeScript. This project showcases how to create MCP servers that can provide tools, resources, and prompts to AI applications.

## 🌟 What is MCP?

The Model Context Protocol (MCP) is an open protocol that standardizes how applications provide context to Large Language Models (LLMs). Think of it as a "USB-C port for AI" - it enables AI models to seamlessly connect to various data sources and tools.

### Key MCP Concepts

- **Tools**: Functions that AI can call to perform actions (e.g., calculations, API calls)
- **Resources**: Static or dynamic content that AI can read (e.g., files, database records)
- **Prompts**: Reusable templates for LLM interactions
- **Transports**: Communication methods (stdio for local, HTTP for remote)

## 🚀 Features

This MCP server provides:

### 🔧 Tools
- **Mathematical Operations**: Add, multiply, factorial calculations
- **Time Utilities**: Get current time with timezone information
- **Text Manipulation**: Transform text (uppercase, lowercase, reverse, word count)

### 📄 Resources
- **Server Information**: Dynamic server stats and capabilities
- **Personal Greetings**: Personalized welcome messages via `greeting://{name}`
- **Random Facts**: Category-based facts via `fact://{category}`

### 💭 Prompts
- **Code Review**: Generate structured code review prompts
- **Explanation**: Create educational explanation prompts
- **Problem Solving**: Generate step-by-step problem-solving prompts

### 🌐 Transport Options
- **Stdio Transport**: For local integrations (spawned processes)
- **HTTP Transport**: For web-based integrations

## 📦 Installation

1. **Clone or create the project directory**:
   ```bash
   mkdir simple-mcp-server
   cd simple-mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

## 🎯 Usage

### Running the Stdio Server

The stdio server is ideal for local integrations where the MCP server is spawned as a child process:

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

### Running the HTTP Server

The HTTP server is perfect for web-based integrations:

```bash
# Development mode
npx tsx src/http-server.ts

# Or build and run
npm run build
node dist/http-server.js
```

The HTTP server will be available at:
- **MCP Endpoint**: `http://localhost:3000/mcp`
- **Health Check**: `http://localhost:3000/health`

## 🔌 Integration Examples

### Claude Desktop Configuration

To use this MCP server with Claude Desktop, add to your configuration file:

**For Stdio Server:**
```json
{
  "mcpServers": {
    "simple-mcp-server": {
      "command": "node",
      "args": ["path/to/simple-mcp-server/dist/index.js"]
    }
  }
}
```

**For HTTP Server:**
```json
{
  "mcpServers": {
    "simple-mcp-server-http": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Testing with cURL

Test the HTTP server directly:

```bash
# Health check
curl http://localhost:3000/health

# MCP initialization request
curl -X POST http://localhost:3000/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'

# List available tools
curl -X POST http://localhost:3000/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# Call the add tool
curl -X POST http://localhost:3000/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "add",
      "arguments": {
        "a": 5,
        "b": 3
      }
    }
  }'
```

## 🛠️ Development

### Project Structure

```
simple-mcp-server/
├── src/
│   ├── index.ts          # Stdio server implementation
│   └── http-server.ts    # HTTP server implementation
├── dist/                 # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

### Available Scripts

- `npm run dev` - Run in development mode with auto-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled stdio server
- `npm run clean` - Remove compiled files
- `npm run type-check` - Run TypeScript type checking

### Adding New Tools

To add a new tool, use the `server.registerTool()` method:

```typescript
server.registerTool(
  'my-tool',
  {
    title: 'My Custom Tool',
    description: 'Description of what this tool does',
    inputSchema: {
      param1: z.string().describe('First parameter'),
      param2: z.number().describe('Second parameter')
    },
    outputSchema: {
      result: z.string()
    }
  },
  async ({ param1, param2 }: { param1: string; param2: number }) => {
    // Tool implementation
    const result = `Processed ${param1} with ${param2}`;
    
    return {
      content: [{
        type: 'text',
        text: result
      }],
      structuredContent: { result }
    };
  }
);
```

### Adding New Resources

To add a new resource:

```typescript
// Static resource
server.registerResource(
  'my-resource',
  'resource://static',
  {
    title: 'My Resource',
    description: 'A static resource',
    mimeType: 'text/plain'
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: 'Resource content here'
    }]
  })
);

// Dynamic resource with parameters
server.registerResource(
  'dynamic-resource',
  new ResourceTemplate('dynamic://{id}', { list: undefined }),
  {
    title: 'Dynamic Resource',
    description: 'A parameterized resource'
  },
  async (uri, { id }) => ({
    contents: [{
      uri: uri.href,
      text: `Dynamic content for ID: ${id}`
    }]
  })
);
```

## 📚 Learn More

- **Official MCP Documentation**: [modelcontextprotocol.io](https://modelcontextprotocol.io/)
- **MCP TypeScript SDK**: [GitHub Repository](https://github.com/modelcontextprotocol/typescript-sdk)
- **MCP Specification**: [Protocol Details](https://spec.modelcontextprotocol.io/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔧 Troubleshooting

### Common Issues

1. **Module not found errors**: Run `npm install` to ensure all dependencies are installed
2. **Port already in use**: Change the port in `http-server.ts` or set the `PORT` environment variable
3. **TypeScript compilation errors**: Run `npm run type-check` to see detailed error information

### Debug Mode

Set the `DEBUG` environment variable to see detailed logging:

```bash
DEBUG=mcp* npm run dev
```

## 🌈 Examples in Action

### Using the Math Tools

```javascript
// Adding numbers
await callTool('add', { a: 15, b: 27 });
// Result: "15 + 27 = 42"

// Calculating factorial
await callTool('factorial', { n: 5 });
// Result: "5! = 120"
```

### Accessing Resources

```javascript
// Get server information
await getResource('info://server');

// Get a personalized greeting
await getResource('greeting://Alice');
// Result: "Hello, Alice! Welcome to the Simple MCP Server."

// Get a random science fact
await getResource('fact://science');
// Result: "SCIENCE FACT: Octopuses have three hearts and blue blood."
```

### Using Prompts

```javascript
// Generate a code review prompt
await getPrompt('code-review', {
  code: 'function add(a, b) { return a + b; }',
  language: 'javascript'
});
```

This MCP server demonstrates the power and flexibility of the Model Context Protocol. Feel free to extend it with your own tools, resources, and prompts!