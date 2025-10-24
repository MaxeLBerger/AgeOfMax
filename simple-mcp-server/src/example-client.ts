/**
 * Example MCP Client
 * Demonstrates how to interact with the Simple MCP Server
 */

interface McpRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

class SimpleMcpClient {
  private baseUrl: string;
  private requestId: number = 1;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    const request: McpRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const mcpResponse: McpResponse = await response.json();

      if (mcpResponse.error) {
        throw new Error(`MCP error: ${mcpResponse.error.message}`);
      }

      return mcpResponse.result;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async initialize() {
    return this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'simple-mcp-client',
        version: '1.0.0'
      }
    });
  }

  async listTools() {
    return this.sendRequest('tools/list');
  }

  async callTool(name: string, arguments_: any) {
    return this.sendRequest('tools/call', {
      name,
      arguments: arguments_
    });
  }

  async listResources() {
    return this.sendRequest('resources/list');
  }

  async readResource(uri: string) {
    return this.sendRequest('resources/read', { uri });
  }

  async listPrompts() {
    return this.sendRequest('prompts/list');
  }

  async getPrompt(name: string, arguments_?: any) {
    return this.sendRequest('prompts/get', {
      name,
      arguments: arguments_
    });
  }
}

// Example usage
async function runExamples() {
  console.log('🚀 Starting MCP Client Examples...\n');

  const client = new SimpleMcpClient();

  try {
    // Initialize the connection
    console.log('1. Initializing connection...');
    const initResult = await client.initialize();
    console.log('✅ Initialized:', JSON.stringify(initResult, null, 2));
    console.log();

    // List available tools
    console.log('2. Listing available tools...');
    const tools = await client.listTools();
    console.log('🔧 Available tools:', tools.tools.map((t: any) => t.name).join(', '));
    console.log();

    // Call the add tool
    console.log('3. Calling add tool (5 + 3)...');
    const addResult = await client.callTool('add', { a: 5, b: 3 });
    console.log('➕ Add result:', addResult.content[0].text);
    console.log('📊 Structured data:', addResult.structuredContent);
    console.log();

    // Call the get-time tool
    console.log('4. Getting current time...');
    const timeResult = await client.callTool('get-time', {});
    console.log('⏰ Time result:', timeResult.content[0].text);
    console.log();

    // List available resources
    console.log('5. Listing available resources...');
    const resources = await client.listResources();
    console.log('📄 Available resources:', resources.resources.map((r: any) => r.uri).join(', '));
    console.log();

    // Read server info resource
    console.log('6. Reading server info resource...');
    const serverInfo = await client.readResource('info://server');
    console.log('ℹ️  Server info:', serverInfo.contents[0].text);
    console.log();

    // Read a greeting resource
    console.log('7. Reading greeting resource...');
    const greeting = await client.readResource('greeting://Alice');
    console.log('👋 Greeting:', greeting.contents[0].text);
    console.log();

    // List available prompts
    console.log('8. Listing available prompts...');
    const prompts = await client.listPrompts();
    console.log('💭 Available prompts:', prompts.prompts.map((p: any) => p.name).join(', '));
    console.log();

    // Get a code review prompt
    console.log('9. Getting code review prompt...');
    const codeReviewPrompt = await client.getPrompt('code-review', {
      code: 'function add(a, b) { return a + b; }',
      language: 'javascript'
    });
    console.log('📝 Code review prompt:');
    console.log(codeReviewPrompt.messages[0].content.text);
    console.log();

    console.log('✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Check if this file is being run directly
if (typeof window === 'undefined' && require.main === module) {
  runExamples();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SimpleMcpClient, runExamples };
}