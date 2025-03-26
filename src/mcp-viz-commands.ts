// MCP integration for knowledge graph visualization
import { startServer, stopServer } from './server.js';
import http from 'http';
import { getVizServer, setVizServer } from './index.js';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2), {
  default: {
    port: 3000
  }
});

// We'll register these commands directly in index.ts where we have access to the Server instance
export const visualizationCommands = [
  {
    name: 'mcp_visualize_graph',
    description: 'Start a visualization server for the knowledge graph',
    handler: async () => {
      // We don't need to start the server if it's already running from the auto-start
      // But provide a way to access the visualization URL
      return {
        content: [
          { 
            type: 'text', 
            text: `Knowledge graph visualization is available at http://localhost:${argv.port}\n` +
                  'If the visualization window is not open, click the link above to view it.'
          }
        ]
      };
    }
  },
  {
    name: 'mcp_start_visualize_graph',
    description: 'Start the graph visualization server',
    handler: async () => {
      try {
        const currentServer = getVizServer();
        if (currentServer) {
          return {
            content: [{ 
              type: "text", 
              text: `Graph visualization server is already running at http://localhost:${argv.port}` 
            }]
          };
        }
        const newServer = await startServer(undefined, argv.port);
        setVizServer(newServer);
        return {
          content: [{ 
            type: "text", 
            text: `Graph visualization server started at http://localhost:${argv.port}` 
          }]
        };
      } catch (error) {
        throw new Error(`Failed to start visualization server: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  },
  {
    name: 'mcp_stop_visualize_graph',
    description: 'Stop the graph visualization server',
    handler: async () => {
      const currentServer = getVizServer();
      if (!currentServer) {
        return {
          content: [{ type: "text", text: "Visualization server is not running" }]
        };
      }
      stopServer(currentServer);
      setVizServer(null);
      return {
        content: [{ type: "text", text: "Graph visualization server stopped" }]
      };
    }
  },
  {
    name: 'mcp_refresh_visualize_graph',
    description: 'Refresh the graph visualization',
    handler: async () => {
      if (!getVizServer()) {
        throw new Error("Visualization server is not running");
      }
      return {
        content: [{ type: "text", text: "Graph visualization refreshed" }]
      };
    }
  }
]; 