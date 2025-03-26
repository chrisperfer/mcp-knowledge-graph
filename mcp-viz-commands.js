// MCP integration for knowledge graph visualization
import { registerMCPCommand } from '@modelcontextprotocol/sdk';
import { startServer, stopServer } from './server.js';

// Visualization control commands
registerMCPCommand({
  name: 'mcp_visualize_graph',
  description: 'Start a visualization server for the knowledge graph',
  handler: async () => {
    // We don't need to start the server if it's already running from the auto-start
    // But provide a way to access the visualization URL
    return {
      content: [
        { 
          type: 'text', 
          text: 'Knowledge graph visualization is available at http://localhost:3000\n' +
                'If the visualization window is not open, click the link above to view it.'
        }
      ]
    };
  }
});

// Command to manually start if auto-start wasn't enabled
registerMCPCommand({
  name: 'mcp_start_visualize_graph', 
  description: 'Start the knowledge graph visualization server if it was disabled at startup',
  handler: async () => {
    try {
      // Get access to the global vizServer variable from the main module
      const mainModule = await import('./src/index.js');
      
      // Check if server is already running
      if (mainModule.vizServer) {
        return { 
          content: [{ 
            type: 'text', 
            text: 'Visualization server is already running at http://localhost:3000' 
          }] 
        };
      }
      
      // Start the server
      mainModule.vizServer = startServer();
      
      return {
        content: [
          { 
            type: 'text', 
            text: 'Knowledge graph visualization server started at http://localhost:3000\n' +
                  'The visualization should open automatically in your default browser.' 
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          { 
            type: 'text', 
            text: `Failed to start visualization server: ${errorMessage}\n` +
                  'Please make sure you have installed the required dependencies by running:\n' +
                  'npm install express open'
          }
        ]
      };
    }
  }
});

// Command to stop the visualization server
registerMCPCommand({
  name: 'mcp_stop_visualize_graph', 
  description: 'Stop the running knowledge graph visualization server',
  handler: async () => {
    try {
      // Get access to the global vizServer variable from the main module
      const mainModule = await import('./src/index.js');
      
      if (!mainModule.vizServer) {
        return { 
          content: [{ 
            type: 'text', 
            text: 'No visualization server is currently running.' 
          }] 
        };
      }
      
      // Stop the server
      stopServer(mainModule.vizServer);
      mainModule.vizServer = null;
      
      return {
        content: [{ 
          type: 'text', 
          text: 'Knowledge graph visualization server has been stopped.' 
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ 
          type: 'text', 
          text: `Error stopping visualization server: ${errorMessage}` 
        }]
      };
    }
  }
}); 