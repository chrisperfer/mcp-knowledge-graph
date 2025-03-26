declare module '@modelcontextprotocol/sdk' {
  export interface MCPCommandResult {
    content: Array<{
      type: string;
      text: string;
    }>;
  }

  export interface MCPCommandOptions {
    name: string;
    description: string;
    handler: () => Promise<MCPCommandResult>;
  }

  export function registerMCPCommand(options: MCPCommandOptions): void;

  export interface ModelContextProtocolServerOptions {
    memoryFile: string;
  }

  export class ModelContextProtocolServer {
    constructor(options: ModelContextProtocolServerOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
  }
} 