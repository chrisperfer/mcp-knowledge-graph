import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import open from 'open';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root directory (one level up from dist)
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(rootDir));

// Route for the main visualization
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Start the server
/**
 * Starts the visualization server
 * @returns {http.Server} The server instance
 */
export function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`Knowledge Graph visualization server running at http://localhost:${PORT}`);
    // Open the visualization in the default browser
    open(`http://localhost:${PORT}`);
  });
  
  return server;
}

// Stop the server
/**
 * Stops the visualization server
 * @param {http.Server} server - The server instance to stop
 */
export function stopServer(server) {
  if (server) {
    server.close(() => {
      console.log('Knowledge Graph visualization server stopped');
    });
  }
}

// Direct execution check
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
} 